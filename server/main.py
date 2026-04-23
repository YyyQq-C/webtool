#!/usr/bin/env python3
"""
后端服务 - 去背景 + 网页抓取 + HTML转PDF
启动: uvicorn main:app --host 0.0.0.0 --port 8000
"""

import io
from urllib.parse import urljoin, urlparse
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image
from rembg import remove
import httpx
from bs4 import BeautifulSoup
from weasyprint import HTML

app = FastAPI(title="图片工具后端服务")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/remove-background")
async def remove_bg(file: UploadFile = File(...)):
    """上传图片，直接返回去背景后的PNG"""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="请上传图片文件")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="文件为空")

    try:
        img = Image.open(io.BytesIO(content))
        if img.mode not in ("RGBA", "RGB", "L"):
            img = img.convert("RGBA")

        result = remove(img)

        buf = io.BytesIO()
        result.save(buf, format="PNG")
        buf.seek(0)

        return Response(
            content=buf.read(),
            media_type="image/png",
            headers={
                "Content-Disposition": "attachment; filename=no-bg.png",
                "X-Original-Name": file.filename or "image.png",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")


@app.get("/api/fetch-page")
async def fetch_page(url: str = Query(...), mode: str = Query("full")):
    """获取网页内容，返回清理后的HTML和图片列表（用于前端预览）"""
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=30.0,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        ) as client:
            response = await client.get(url)
            response.raise_for_status()

            html = response.text
            base_url = str(response.url)

            soup = BeautifulSoup(html, 'html.parser')

            # 清理所有可能导致跨域问题的元素
            for tag in soup.find_all(['script', 'iframe', 'noscript', 'embed', 'object', 'video', 'audio', 'source']):
                tag.decompose()

            for tag in soup.find_all(True):
                for attr in [a for a in tag.attrs if a.startswith('on')]:
                    del tag[attr]
                if tag.name == 'meta' and tag.get('http-equiv', '').lower() in ['content-security-policy', 'x-frame-options']:
                    tag.decompose()

            # 修复图片路径
            for img in soup.find_all('img'):
                for attr in ['src', 'data-src', 'data-lazy-src', 'data-original']:
                    if img.get(attr):
                        img['src'] = urljoin(base_url, img[attr])
                        break
                for attr in ['loading', 'data-lazy-loaded']:
                    if attr in img.attrs:
                        del img[attr]

            # 修复 CSS 和链接
            for link in soup.find_all('link', href=True):
                link['href'] = urljoin(base_url, link['href'])
            for a in soup.find_all('a', href=True):
                a['href'] = urljoin(base_url, a['href'])
                a['target'] = '_blank'

            # 提取图片列表（用于预览）
            image_list = []
            for img in soup.find_all('img'):
                if img.get('src') and img.get('src').startswith(('http://', 'https://', '//')):
                    image_list.append({
                        'src': img['src'],
                        'alt': img.get('alt', '') or img.get('title', '') or '图片',
                    })

            # 提取标题（优先 og:title，适用于微信公众号等平台）
            title = ''
            if soup.title and soup.title.string:
                title = soup.title.string.strip()
            if not title:
                og_title = soup.find('meta', property='og:title')
                if og_title and og_title.get('content'):
                    title = og_title['content'].strip()
            if not title:
                title = urlparse(url).netloc

            # 检测页面是否依赖JS渲染（如微信公众号等）
            text_content = soup.get_text(strip=True)
            has_js_rendered = len(text_content) < 200

            return {
                "html": str(soup),
                "url": str(response.url),
                "title": title,
                "images": image_list[:50],
                "warning": "此页面内容需要通过JavaScript动态加载，可能无法完整获取。" if has_js_rendered else None,
            }

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="网页加载超时（30秒）")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"网页请求失败: {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取网页失败: {str(e)}")


@app.post("/api/generate-pdf")
async def generate_pdf(url: str = Query(...), mode: str = Query("full")):
    """服务端生成PDF - 完全避免浏览器跨域问题"""
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=30.0,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        ) as client:
            response = await client.get(url)
            response.raise_for_status()

            html = response.text
            base_url = str(response.url)
            soup = BeautifulSoup(html, 'html.parser')

            # 清理页面
            for tag in soup.find_all(['script', 'iframe', 'noscript', 'embed', 'object', 'video', 'audio', 'source']):
                tag.decompose()

            for tag in soup.find_all(True):
                for attr in [a for a in tag.attrs if a.startswith('on')]:
                    del tag[attr]
                if tag.name == 'meta' and tag.get('http-equiv', '').lower() in ['content-security-policy', 'x-frame-options']:
                    tag.decompose()

            # 修复资源路径
            for img in soup.find_all('img'):
                for attr in ['src', 'data-src', 'data-lazy-src', 'data-original']:
                    if img.get(attr):
                        img['src'] = urljoin(base_url, img[attr])
                        break
                for attr in ['loading', 'data-lazy-loaded']:
                    if attr in img.attrs:
                        del img[attr]

            for link in soup.find_all('link', href=True):
                link['href'] = urljoin(base_url, link['href'])

            # 如果只提取图片模式
            if mode == 'images':
                images = soup.find_all('img', src=True)
                img_html_parts = ['<html><head><style>']
                img_html_parts.append('body { margin: 0; padding: 0; text-align: center; background: white; }')
                img_html_parts.append('img { max-width: 100%; max-height: 95vh; page-break-after: always; margin: 0 auto; display: block; }')
                img_html_parts.append('</style></head><body>')
                for img in images:
                    img_html_parts.append(f'<img src="{img["src"]}" alt="{img.get("alt", "")}" />')
                img_html_parts.append('</body></html>')
                clean_html = '\n'.join(img_html_parts)
            else:
                style_tag = soup.new_tag('style')
                style_tag.string = '''
                    body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; background: white; }
                    img { max-width: 100%; height: auto; }
                    * { box-sizing: border-box; }
                    @page { margin: 1cm; }
                '''
                soup.head.append(style_tag) if soup.head else soup.append(style_tag)
                clean_html = str(soup)

            # 使用 weasyprint 生成 PDF
            pdf_bytes = HTML(string=clean_html, base_url=base_url).write_pdf()

            return Response(
                content=pdf_bytes,
                media_type='application/pdf',
                headers={
                    'Content-Disposition': 'attachment; filename="webpage.pdf"',
                }
            )

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="网页加载超时")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF生成失败: {str(e)}")


@app.post("/api/proxy-image")
async def proxy_image(url: str = Query(...)):
    """代理图片，解决跨域问题"""
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=30.0,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        ) as client:
            response = await client.get(url)
            response.raise_for_status()

            content_type = response.headers.get('content-type', 'image/png')
            return Response(
                content=response.content,
                media_type=content_type,
                headers={
                    'Cache-Control': 'public, max-age=3600',
                    'Access-Control-Allow-Origin': '*',
                }
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"图片加载失败: {str(e)}")
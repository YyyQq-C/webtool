#!/usr/bin/env python3
"""
后端服务 - 去背景 + 网页抓取 + HTML转PDF
启动: uvicorn main:app --host 0.0.0.0 --port 8000
"""

import io
import re
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


def detect_site_type(url: str) -> str:
    """检测网站类型，以便使用特定的抓取策略"""
    parsed = urlparse(url)
    netloc = parsed.netloc.lower()

    if 'mp.weixin.qq.com' in netloc:
        return 'wechat'
    elif 'zhihu.com' in netloc:
        return 'zhihu'
    elif 'juejin.cn' in netloc or 'juejin.im' in netloc:
        return 'juejin'
    elif 'csdn.net' in netloc:
        return 'csdn'
    else:
        return 'normal'


def get_site_headers(site_type: str) -> dict:
    """获取适合特定网站的请求头"""
    base_headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }

    if site_type == 'wechat':
        # 微信公众号需要特定的headers
        base_headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://mp.weixin.qq.com/',
        })

    return base_headers


def get_site_warning(site_type: str) -> str:
    """获取特定网站的警告信息"""
    warnings = {
        'wechat': '微信公众号文章的部分内容可能需要登录后才能查看。如果内容不完整，建议在微信客户端中打开后使用"复制链接"功能。',
        'zhihu': '知乎内容可能需要登录才能查看完整内容。',
        'juejin': '掘金的部分内容可能需要登录才能查看。',
        'csdn': 'CSDN 文章可能需要登录或VIP才能查看完整内容。',
    }
    return warnings.get(site_type, '')


def process_html(html: str, base_url: str, mode: str = "full", site_type: str = "normal"):
    """清理HTML并提取信息"""
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

    # 提取图片列表
    image_list = []
    for img in soup.find_all('img'):
        if img.get('src') and img.get('src').startswith(('http://', 'https://', '//')):
            image_list.append({
                'src': img['src'],
                'alt': img.get('alt', '') or img.get('title', '') or '图片',
            })

    # 提取标题（优先 og:title）
    title = ''
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    if not title:
        og_title = soup.find('meta', property='og:title')
        if og_title and og_title.get('content'):
            title = og_title['content'].strip()
    if not title:
        title = urlparse(base_url).netloc

    # 检测内容是否完整
    text_content = soup.get_text(strip=True)

    # 针对特定网站类型进行检测
    if site_type == 'wechat':
        # 微信公众号：检查是否有文章内容区域
        content_div = soup.find(id='js_content') or soup.find(class_='rich_media_content')
        if content_div:
            content_text = content_div.get_text(strip=True)
            has_incomplete_content = len(content_text) < 100
        else:
            has_incomplete_content = True
    elif site_type == 'zhihu':
        content_div = soup.find(class_='RichText') or soup.find(class_='Post-RichText')
        if content_div:
            content_text = content_div.get_text(strip=True)
            has_incomplete_content = len(content_text) < 100
        else:
            has_incomplete_content = True
    else:
        # 通用检测：检查 body 内容
        body = soup.find('body')
        body_text = body.get_text(strip=True) if body else ''
        # 简单页面即使内容少也是完整的
        has_incomplete_content = len(body_text) < 50 and len(text_content) < 200

    warning = ''
    if has_incomplete_content:
        site_warning = get_site_warning(site_type)
        if site_warning:
            warning = site_warning
        else:
            warning = '此页面内容需要通过JavaScript动态加载，可能无法完整获取。建议使用静态网页。'

    return {
        "html": str(soup),
        "url": base_url,
        "title": title,
        "images": image_list[:50],
        "has_incomplete_content": has_incomplete_content,
        "warning": warning if warning else None,
    }


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
    """获取网页内容，智能处理不同类型的网站"""
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    site_type = detect_site_type(url)

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=30.0,
            headers=get_site_headers(site_type),
        ) as client:
            response = await client.get(url)
            response.raise_for_status()

            html = response.text
            base_url = str(response.url)

            result = process_html(html, base_url, mode, site_type)
            return result

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

    site_type = detect_site_type(url)

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=30.0,
            headers=get_site_headers(site_type),
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
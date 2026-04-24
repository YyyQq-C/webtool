import os
import sys
import time
import json
import uuid
import shutil
import asyncio
import hashlib
import tempfile
import base64
import subprocess
from pathlib import Path
from typing import List, Optional

import httpx
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, Body, Request, HTTPException
from fastapi.responses import JSONResponse, FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
from playwright.async_api import async_playwright

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd = Path(__file__).parent.absolute()
TEMP_DIR = pwd / "temp"
TEMP_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = pwd / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# URL缓存映射：urlHash -> sessionId（仅图片模式）
url_cache = {}
# 存储会话数据
sessions = {}

CLEANUP_INTERVAL = 10 * 60 * 1000  # 10分钟，毫秒

async def cleanup_task():
    while True:
        await asyncio.sleep(60)
        now = int(time.time() * 1000)
        # 清理过期会话
        expired_sessions = []
        for session_id, data in sessions.items():
            if now - data['createdAt'] > CLEANUP_INTERVAL:
                session_dir = TEMP_DIR / session_id
                if session_dir.exists():
                    shutil.rmtree(session_dir, ignore_errors=True)
                expired_sessions.append(session_id)
                print(f"[CLEANUP] 清理过期会话: {session_id}")
        for s in expired_sessions:
            del sessions[s]

        # 清理过期缓存
        expired_urls = []
        for url_hash, cache_data in url_cache.items():
            if now - cache_data['createdAt'] > CLEANUP_INTERVAL:
                expired_urls.append(url_hash)
                print(f"[CACHE] 清理过期URL缓存: {url_hash}")
        for u in expired_urls:
            del url_cache[u]

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_task())

browser_instance = None
playwright_instance = None

async def get_browser():
    global browser_instance, playwright_instance
    if browser_instance is None:
        playwright_instance = await async_playwright().start()
        browser_instance = await playwright_instance.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
            ]
        )
    return browser_instance

@app.on_event("shutdown")
async def shutdown_event():
    global browser_instance, playwright_instance
    if browser_instance:
         await browser_instance.close()
    if playwright_instance:
         await playwright_instance.stop()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/fetch-page")
async def fetch_page(url: str):
    if not url:
        return JSONResponse({"error": "Missing url parameter"}, status_code=400)
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url

    try:
        browser = await get_browser()
        page = await browser.new_page(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        await page.goto(url, wait_until='networkidle', timeout=45000)
        await asyncio.sleep(2)
        
        html = await page.content()
        title = await page.title()
        
        images = await page.evaluate(r'''
            () => {
                const imgs = Array.from(document.querySelectorAll('img'));
                return imgs.filter(img => img.src && img.naturalWidth > 50).map(img => ({
                    src: img.src,
                    alt: img.alt || img.title || '图片'
                })).slice(0, 50);
            }
        ''')
        
        await page.close()
        from urllib.parse import urlparse
        domain = urlparse(url).hostname
        
        return {
            "html": html,
            "url": url,
            "title": title or domain,
            "images": list(images),
            "has_incomplete_content": False,
            "warning": None
        }
    except Exception as e:
        print(f"Fetch page error: {e}")
        return JSONResponse({"error": f"获取网页失败: {str(e)}"}, status_code=500)

class ImageItem(BaseModel):
    src: str
    alt: Optional[str] = "图片"

class DownloadImagesReq(BaseModel):
    url: str
    images: List[ImageItem]
    skipCache: Optional[bool] = False

async def download_image(url: str, target_path: Path):
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(url, timeout=30.0)
        response.raise_for_status()
        with open(target_path, "wb") as f:
            for chunk in response.iter_bytes(chunk_size=8192):
                f.write(chunk)
        size = target_path.stat().st_size
        return {"path": str(target_path), "size": size, "url": url}

def get_url_hash(url):
    return hashlib.md5(url.encode('utf-8')).hexdigest()

@app.post("/api/download-images")
async def api_download_images(req: DownloadImagesReq):
    url = req.url
    images = req.images
    skip_cache = req.skipCache
    
    try:
        url_hash = get_url_hash(url)
        
        if not skip_cache and url_hash in url_cache:
            cached_data = url_cache[url_hash]
            cached_session_id = cached_data['sessionId']
            
            if cached_session_id in sessions:
                cached_session = sessions[cached_session_id]
                if Path(cached_session['dir']).exists():
                    print(f"[CACHE] 使用缓存会话: {cached_session_id}")
                    return {
                        "sessionId": cached_session_id,
                        "images": cached_session['images'],
                        "expiresAt": cached_session['createdAt'] + CLEANUP_INTERVAL,
                        "cached": True
                    }
            if url_hash in url_cache:
                del url_cache[url_hash]
                
        session_id = f"{int(time.time()*1000)}-{uuid.uuid4().hex[:9]}"
        session_dir = TEMP_DIR / session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        
        cTime = int(time.time()*1000)
        sessions[session_id] = {
            "createdAt": cTime,
            "url": url,
            "dir": str(session_dir),
            "images": []
        }
        
        url_cache[url_hash] = {
            "sessionId": session_id,
            "createdAt": cTime,
            "url": url
        }
        
        downloaded_images = []
        for i, img in enumerate(images):
            try:
                from urllib.parse import urlparse
                ext = Path(urlparse(img.src).path).suffix or '.jpg'
                if not ext.startswith('.'):
                    ext = '.' + ext
                filename = f"{i + 1}{ext}"
                file_path = session_dir / filename
                
                await download_image(img.src, file_path)
                size = file_path.stat().st_size
                
                downloaded_images.append({
                    "id": f"{session_id}-{i}",
                    "filename": filename,
                    "alt": img.alt or "图片",
                    "url": img.src,
                    "size": size,
                    "path": f"/api/temp/{session_id}/{filename}",
                    "index": i
                })
            except Exception as str_err:
                print(f"下载图片失败: {img.src} -> {str_err}")
                downloaded_images.append({
                    "id": f"{session_id}-{i}",
                    "filename": f"{i + 1}.jpg",
                    "alt": img.alt or "图片",
                    "url": img.src,
                    "size": 0,
                    "path": None,
                    "index": i,
                    "error": str(str_err)
                })
                
        sessions[session_id]['images'] = downloaded_images
        return {
            "sessionId": session_id,
            "images": downloaded_images,
            "expiresAt": cTime + CLEANUP_INTERVAL,
            "cached": False
        }
    except Exception as e:
        print(f"Download images error: {e}")
        return JSONResponse({"error": f"下载图片失败: {str(e)}"}, status_code=500)

@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    if session_id not in sessions:
        return JSONResponse({"error": "会话不存在或已过期"}, status_code=404)
    session = sessions[session_id]
    return {
        "sessionId": session_id,
        "images": session["images"],
        "expiresAt": session["createdAt"] + CLEANUP_INTERVAL
    }

@app.get("/api/temp/{session_id}/{filename}")
async def get_temp_file(session_id: str, filename: str):
    file_path = TEMP_DIR / session_id / filename
    if not file_path.exists():
        return JSONResponse({"error": "文件不存在"}, status_code=404)
    return FileResponse(file_path)

class SelectedImage(BaseModel):
    filename: str
    alt: Optional[str] = ''

class GenerateImagesPdfReq(BaseModel):
    sessionId: str
    selectedImages: List[SelectedImage]

@app.post("/api/generate-images-pdf")
async def generate_images_pdf(req: GenerateImagesPdfReq):
    session_id = req.sessionId
    selected_images = req.selectedImages
    if session_id not in sessions:
        return JSONResponse({"error": "会话不存在或已过期"}, status_code=404)
        
    try:
        browser = await get_browser()
        page = await browser.new_page()
        
        html_content = '<!DOCTYPE html><html><head><style>@page { margin: 0; }body { margin: 0; padding: 0; background: white; }.img-page { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; page-break-after: always; }.img-page:last-child { page-break-after: auto; }.img-page img { max-width: 100%; max-height: 100%; object-fit: contain; }</style></head><body>'
        
        for img in selected_images:
            img_path = TEMP_DIR / session_id / img.filename
            if img_path.exists():
                try:
                    with Image.open(img_path) as pil_img:
                        is_landscape = pil_img.width > pil_img.height
                        if is_landscape:
                            pil_img = pil_img.rotate(-90, expand=True)
                        
                        import io
                        buf = io.BytesIO()
                        format_str = (pil_img.format or 'JPEG').upper()
                        if format_str not in ['JPEG', 'PNG', 'WEBP']:
                            format_str = 'JPEG'
                        if format_str == 'JPEG' and pil_img.mode in ('RGBA', 'P'):
                            pil_img = pil_img.convert('RGB')
                            
                        pil_img.save(buf, format=format_str)
                        img_data = base64.b64encode(buf.getvalue()).decode('utf-8')
                        ext = img_path.suffix.lower()
                        mime_type = 'image/png' if ext == '.png' else 'image/webp' if ext == '.webp' else 'image/jpeg'
                        html_content += f'<div class="img-page"><img src="data:{mime_type};base64,{img_data}" alt="{img.alt or ""}" /></div>'
                except Exception as e:
                    print(f"处理图片失败: {img.filename}", e)
                    with open(img_path, "rb") as f:
                        img_data = base64.b64encode(f.read()).decode('utf-8')
                    ext = img_path.suffix.lower()
                    mime_type = 'image/png' if ext == '.png' else 'image/webp' if ext == '.webp' else 'image/jpeg'
                    html_content += f'<div class="img-page"><img src="data:{mime_type};base64,{img_data}" alt="{img.alt or ""}" /></div>'
        
        html_content += '</body></html>'
        
        await page.set_content(html_content, wait_until='networkidle')
        await asyncio.sleep(2)
        
        pdf = await page.pdf(format='A4', print_background=False, margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'})
        await page.close()
        
        return Response(content=pdf, media_type="application/pdf", headers={'Content-Disposition': 'attachment; filename="selected-images.pdf"'})
    except Exception as e:
        print(f"Generate images PDF error: {e}")
        return JSONResponse({"error": f"PDF生成失败: {str(e)}"}, status_code=500)

@app.post("/api/generate-pdf")
async def generate_pdf(url: str, mode: str = "full"):
    if not url:
        return JSONResponse({"error": "Missing url parameter"}, status_code=400)
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url
        
    try:
        browser = await get_browser()
        page = await browser.new_page(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        await page.goto(url, wait_until='networkidle', timeout=45000)
        await asyncio.sleep(2)
        
        if mode == 'images':
            await page.evaluate(r'''
                () => {
                    const images = Array.from(document.querySelectorAll('img')).filter(img => img.src && img.naturalWidth > 50);
                    document.body.innerHTML = '';
                    document.body.style.margin = '0'; document.body.style.padding = '0'; document.body.style.background = 'white';
                    const style = document.createElement('style');
                    style.textContent = `@page { size: A4; margin: 1cm; }.img-page { width: 100%; min-height: 277mm; display: flex; align-items: center; justify-content: center; page-break-after: always; padding: 1cm; box-sizing: border-box; }.img-page:last-child { page-break-after: auto; }.img-page img { max-width: 100%; max-height: 277mm; object-fit: contain; }`;
                    document.head.appendChild(style);
                    images.forEach(img => { const div = document.createElement('div'); div.className = 'img-page'; const newImg = document.createElement('img'); newImg.src = img.src; newImg.alt = img.alt || ''; div.appendChild(newImg); document.body.appendChild(div); });
                }
            ''')
            await page.evaluate(r'''
                async () => {
                    const images = Array.from(document.querySelectorAll('img'));
                    await Promise.all(images.map(img => {
                        if (img.complete) return Promise.resolve();
                        return new Promise(resolve => {
                            img.onload = resolve;
                            img.onerror = resolve;
                            setTimeout(resolve, 15000);
                        });
                    }));
                }
            ''')
            await asyncio.sleep(5)
            pdf = await page.pdf(format='A4', print_background=False, margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'})
        else:
            pdf = await page.pdf(format='A4', print_background=True, margin={'top': '20px', 'right': '20px', 'bottom': '20px', 'left': '20px'})
            
        await page.close()
        return Response(content=pdf, media_type="application/pdf", headers={'Content-Disposition': 'attachment; filename="webpage.pdf"'})
    except Exception as e:
        print(f"Generate PDF error: {e}")
        return JSONResponse({"error": f"PDF生成失败: {str(e)}"}, status_code=500)

@app.post("/api/detect-watermark")
async def detect_watermark(image: UploadFile = File(...)):
    if not image:
        return JSONResponse({"error": "缺少图片文件"}, status_code=400)
    
    img_path = UPLOAD_DIR / f"{int(time.time()*1000)}_{image.filename}"
    with open(img_path, "wb") as f:
        f.write(await image.read())
        
    mask_file = UPLOAD_DIR / f"mask_{int(time.time()*1000)}.png"
    python_script = pwd / "script" / "inpaint.py"
    
    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable, str(python_script), 'detect', str(img_path), str(mask_file),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        
        asyncio.get_event_loop().run_in_executor(None, lambda: img_path.unlink(missing_ok=True))
        
        if proc.returncode != 0 or not mask_file.exists():
            print(f"Watermark detection failed: {stderr.decode()}")
            return JSONResponse({"error": f"检测失败: {stderr.decode() or '未知错误'}"}, status_code=500)
            
        with open(mask_file, "rb") as f:
            mask_base64 = base64.b64encode(f.read()).decode('utf-8')
            
        asyncio.get_event_loop().run_in_executor(None, lambda: mask_file.unlink(missing_ok=True))
        return {"mask": mask_base64}
    except Exception as e:
        print(f"[detect] err: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/remove-watermark")
async def remove_watermark(image: UploadFile = File(...), mask: UploadFile = File(...)):
    if not image or not mask:
        return JSONResponse({"error": "缺少图片或蒙版文件"}, status_code=400)
        
    img_path = UPLOAD_DIR / f"img_{int(time.time()*1000)}_{image.filename}"
    mask_path = UPLOAD_DIR / f"mask_{int(time.time()*1000)}_{mask.filename}"
    
    with open(img_path, "wb") as f: f.write(await image.read())
    with open(mask_path, "wb") as f: f.write(await mask.read())
        
    out_dir = pwd / "temp-watermark"
    out_dir.mkdir(exist_ok=True)
    out_file = out_dir / f"{int(time.time()*1000)}-result.png"
    
    python_script = pwd / "script" / "inpaint.py"
    
    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable, str(python_script), 'remove', str(img_path), str(mask_path), str(out_file),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        
        asyncio.get_event_loop().run_in_executor(None, lambda: img_path.unlink(missing_ok=True))
        asyncio.get_event_loop().run_in_executor(None, lambda: mask_path.unlink(missing_ok=True))
        
        if proc.returncode != 0 or not out_file.exists():
            print(f"Python inpaint failed: {stderr.decode()}")
            return JSONResponse({"error": f"去水印失败: {stderr.decode() or '未知错误'}"}, status_code=500)
            
        async def remove_out_file_later():
            await asyncio.sleep(60)
            out_file.unlink(missing_ok=True)
        asyncio.create_task(remove_out_file_later())
            
        return FileResponse(out_file, media_type="image/png")
    except Exception as e:
        print(f"[remove watermark] err: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/remove-background")
async def api_remove_background(file: UploadFile = File(...)):
    if not file:
        return JSONResponse({"error": "缺少图片文件"}, status_code=400)
        
    img_path = UPLOAD_DIR / f"bg_{int(time.time()*1000)}_{file.filename}"
    with open(img_path, "wb") as f: f.write(await file.read())
        
    out_dir = pwd / "temp-bg"
    out_dir.mkdir(exist_ok=True)
    out_file = out_dir / f"{int(time.time()*1000)}-no-bg.png"
    
    python_script = pwd / "script" / "remove-bg.py"
    
    print(f"[BG] 开始去背景处理: {file.filename}")
    
    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable, str(python_script), str(img_path), str(out_file),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        
        asyncio.get_event_loop().run_in_executor(None, lambda: img_path.unlink(missing_ok=True))
        
        if proc.returncode != 0 or not out_file.exists():
            print(f"[BG] 去背景失败: {stderr.decode()}")
            return JSONResponse({"error": f"去背景失败: {stderr.decode() or '未知错误'}"}, status_code=500)
            
        print(f"[BG] 去背景成功: {out_file}")
        
        async def remove_out_file_later():
            await asyncio.sleep(60)
            out_file.unlink(missing_ok=True)
        asyncio.create_task(remove_out_file_later())
            
        return FileResponse(out_file, media_type="image/png", headers={'Content-Disposition': 'attachment; filename="no-bg.png"'})
    except Exception as e:
        print(f"[remove bg] err: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)

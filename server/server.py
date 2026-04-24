import os
import sys
import time
import json
import uuid
import shutil
import asyncio
import base64
import subprocess
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, Body, Request, HTTPException
from fastapi.responses import JSONResponse, FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from playwright.async_api import async_playwright
from contextlib import asynccontextmanager

from services.downloader import DownloadImagesReq, get_url_hash, process_image_downloads
from services.scraper import fetch_page_data
from services.pdf_maker import create_images_pdf, create_webpage_pdf, GenerateImagesPdfReq
from script.inpaint import detect_watermark as inpaint_detect, remove_watermark as inpaint_remove

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

browser_instance = None
playwright_instance = None
browser_lock = asyncio.Lock()

async def get_browser():
    global browser_instance, playwright_instance
    async with browser_lock:
        if browser_instance is None or not browser_instance.is_connected():
            if playwright_instance is None:
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    asyncio.create_task(cleanup_task())
    yield
    # Shutdown
    global browser_instance, playwright_instance
    if browser_instance:
         await browser_instance.close()
    if playwright_instance:
         await playwright_instance.stop()

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        data = await fetch_page_data(browser, url)
        return data
    except Exception as e:
        print(f"Fetch page error: {e}")
        return JSONResponse({"error": f"获取网页失败: {str(e)}"}, status_code=500)

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
        
        downloaded_images = await process_image_downloads(session_dir, session_id, images)
                
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

@app.post("/api/generate-images-pdf")
async def generate_images_pdf(req: GenerateImagesPdfReq):
    session_id = req.sessionId
    selected_images = req.selectedImages
    if session_id not in sessions:
        return JSONResponse({"error": "会话不存在或已过期"}, status_code=404)
        
    try:
        browser = await get_browser()
        pdf = await create_images_pdf(browser, TEMP_DIR / session_id, selected_images)
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
        pdf = await create_webpage_pdf(browser, url, mode)
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
    try:
        mask_base64 = await asyncio.to_thread(inpaint_detect, str(img_path), str(mask_file))
        
        asyncio.get_event_loop().run_in_executor(None, lambda: img_path.unlink(missing_ok=True))
        asyncio.get_event_loop().run_in_executor(None, lambda: mask_file.unlink(missing_ok=True))
        return {"mask": mask_base64}
    except Exception as e:
        print(f"[detect] err: {e}")
        asyncio.get_event_loop().run_in_executor(None, lambda: img_path.unlink(missing_ok=True))
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
    
    try:
        await asyncio.to_thread(inpaint_remove, str(img_path), str(mask_path), str(out_file))
        
        asyncio.get_event_loop().run_in_executor(None, lambda: img_path.unlink(missing_ok=True))
        asyncio.get_event_loop().run_in_executor(None, lambda: mask_path.unlink(missing_ok=True))
        
        async def remove_out_file_later():
            await asyncio.sleep(60)
            out_file.unlink(missing_ok=True)
        asyncio.create_task(remove_out_file_later())
            
        return FileResponse(out_file, media_type="image/png")
    except Exception as e:
        print(f"[remove watermark] err: {e}")
        asyncio.get_event_loop().run_in_executor(None, lambda: img_path.unlink(missing_ok=True))
        asyncio.get_event_loop().run_in_executor(None, lambda: mask_path.unlink(missing_ok=True))
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
    
    print(f"[BG] 开始去背景处理: {file.filename}")
    
    try:
        from script.remove_bg import remove_background as rembg_process
        await asyncio.to_thread(rembg_process, str(img_path), str(out_file))
        
        asyncio.get_event_loop().run_in_executor(None, lambda: img_path.unlink(missing_ok=True))
        
        print(f"[BG] 去背景成功: {out_file}")
        
        async def remove_out_file_later():
            await asyncio.sleep(60)
            out_file.unlink(missing_ok=True)
        asyncio.create_task(remove_out_file_later())
            
        return FileResponse(out_file, media_type="image/png", headers={'Content-Disposition': 'attachment; filename="no-bg.png"'})
    except Exception as e:
        print(f"[remove bg] err: {e}")
        asyncio.get_event_loop().run_in_executor(None, lambda: img_path.unlink(missing_ok=True))
        return JSONResponse({"error": str(e)}, status_code=500)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)

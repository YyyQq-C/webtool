import os
import sys
import time
import json
import uuid
import shutil
import asyncio
import base64
import subprocess
import socket
import urllib.parse
import ipaddress
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, Body, Request, HTTPException
from fastapi.responses import JSONResponse, FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
from playwright.async_api import async_playwright
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager

from services.downloader import DownloadImagesReq, get_url_hash, process_image_downloads
from services.scraper import fetch_page_data
from services.pdf_maker import create_images_pdf, create_webpage_pdf, GenerateImagesPdfReq
from services.pdf_to_word import pdf_to_word, get_status as get_pdf2word_status
from script.inpaint import detect_watermark as inpaint_detect, remove_watermark as inpaint_remove
from script.compare import compare_images
from services.ocr_service import image_to_excel_async, image_to_word_async, get_ocr_status, OCR_AVAILABLE

pwd = Path(__file__).parent.absolute()
TEMP_DIR = pwd / "temp"
TEMP_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = pwd / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 网站访问数据统计
stats_file = pwd / "stats.json"

def init_stats_file():
    """初始化统计文件，确保存在且有正确格式"""
    try:
        if not stats_file.exists():
            with open(stats_file, "w") as f:
                json.dump({"visits": 0, "startTime": int(time.time() * 1000)}, f)
            print(f"[INIT] 创建统计文件: {stats_file}")
        else:
            # 验证文件内容
            with open(stats_file, "r") as f:
                data = json.load(f)
                if "visits" not in data or "startTime" not in data:
                    with open(stats_file, "w") as f:
                        json.dump({"visits": 0, "startTime": int(time.time() * 1000)}, f)
                    print(f"[INIT] 修复统计文件格式")
    except Exception as e:
        print(f"[ERROR] 统计文件初始化失败: {e}")
        # 尝试重新创建
        try:
            with open(stats_file, "w") as f:
                json.dump({"visits": 0, "startTime": int(time.time() * 1000)}, f)
        except:
            pass

init_stats_file()

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

# 速率限制器初始化
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 限制上传大小中间件 (25MB)
class LimitUploadSize(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get('content-length')
        if content_length and int(content_length) > 25 * 1024 * 1024:
            return JSONResponse(status_code=413, content={"error": "请求体过大（最大限额 25MB）"})
        return await call_next(request)
        
app.add_middleware(LimitUploadSize)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 简单的 SSRF 检查
async def is_safe_url(url: str) -> bool:
    try:
        parsed = urllib.parse.urlparse(url)
        hostname = parsed.hostname
        if not hostname:
            return False
        if hostname.lower() in ['localhost', 'test', 'invalid']:
            return False
        # 尝试直接解析 IP 防止特殊格式
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                return False
        except ValueError:
            pass
        # 异步解析域名
        loop = asyncio.get_running_loop()
        try:
            addr_info = await loop.getaddrinfo(hostname, None)
            for info in addr_info:
                ip = info[4][0]
                ip_obj = ipaddress.ip_address(ip)
                if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
                    return False
        except socket.gaierror:
            return False
        return True
    except Exception:
        return False

# Docker 模式：挂载前端静态文件
# 当 dist 目录存在时，FastAPI 直接服务前端
DIST_DIR = pwd / "dist"  # 前端构建产物（Docker 中在同目录）
if DIST_DIR.exists() and (DIST_DIR / "index.html").exists():
    # 挂载 assets 目录
    if (DIST_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")
    # 其他静态资源
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")
    print(f"[DOCKER] 前端静态文件已挂载: {DIST_DIR}")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/stats")
@limiter.limit("60/minute")
async def get_stats(request: Request, increment: bool = False):
    try:
        with open(stats_file, "r+") as f:
            data = json.load(f)
            if increment:
                data["visits"] += 1
                f.seek(0)
                json.dump(data, f)
                f.truncate()
        return data
    except Exception as e:
        print(f"Stats error: {e}")
        return {"visits": 0, "startTime": 0}

@app.get("/api/fetch-page")
@limiter.limit("30/minute")
async def fetch_page(request: Request, url: str):
    if not url:
        return JSONResponse({"error": "Missing url parameter"}, status_code=400)
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url
        
    if not await is_safe_url(url):
        return JSONResponse({"error": "非法的 URL 请求（SSRF防御已拦截）"}, status_code=403)

    try:
        browser = await get_browser()
        data = await fetch_page_data(browser, url)
        return data
    except Exception as e:
        print(f"Fetch page error: {e}")
        return JSONResponse({"error": f"获取网页失败: {str(e)}"}, status_code=500)

@app.post("/api/download-images")
@limiter.limit("20/minute")
async def api_download_images(request: Request, req: DownloadImagesReq):
    url = req.url
    images = req.images
    skip_cache = req.skipCache
    
    if url and not await is_safe_url(url):
        return JSONResponse({"error": "非法的 URL 请求（SSRF防御已拦截）"}, status_code=403)
    
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
@limiter.limit("60/minute")
async def get_session(request: Request, session_id: str):
    if session_id not in sessions:
        return JSONResponse({"error": "会话不存在或已过期"}, status_code=404)
    session = sessions[session_id]
    return {
        "sessionId": session_id,
        "images": session["images"],
        "expiresAt": session["createdAt"] + CLEANUP_INTERVAL
    }

@app.get("/api/temp/{session_id}/{filename}")
@limiter.limit("120/minute")
async def get_temp_file(request: Request, session_id: str, filename: str):
    # 路径遍历漏洞防御
    if ".." in filename or "/" in filename or "\\" in filename:
        return JSONResponse({"error": "非法文件名"}, status_code=400)
        
    file_path = TEMP_DIR / session_id / filename
    resolved_path = file_path.resolve()
    
    # 确保解析后的绝对路径以 TEMP_DIR 的绝对路径开头，防止逃逸
    if not str(resolved_path).startswith(str(TEMP_DIR.resolve())):
        return JSONResponse({"error": "非法访问路径"}, status_code=403)
        
    if not file_path.exists():
        return JSONResponse({"error": "文件不存在"}, status_code=404)
    return FileResponse(file_path)

@app.post("/api/generate-images-pdf")
@limiter.limit("10/minute")
async def generate_images_pdf(request: Request, req: GenerateImagesPdfReq):
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
@limiter.limit("5/minute")
async def generate_pdf(request: Request, url: str, mode: str = "full"):
    if not url:
        return JSONResponse({"error": "Missing url parameter"}, status_code=400)
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url
        
    if not await is_safe_url(url):
        return JSONResponse({"error": "非法的 URL 请求（SSRF防御已拦截）"}, status_code=403)
        
    try:
        browser = await get_browser()
        pdf = await create_webpage_pdf(browser, url, mode)
        return Response(content=pdf, media_type="application/pdf", headers={'Content-Disposition': 'attachment; filename="webpage.pdf"'})
    except Exception as e:
        print(f"Generate PDF error: {e}")
        return JSONResponse({"error": f"PDF生成失败: {str(e)}"}, status_code=500)

@app.post("/api/detect-watermark")
@limiter.limit("10/minute")
async def detect_watermark(request: Request, image: UploadFile = File(...)):
    if not image:
        return JSONResponse({"error": "缺少图片文件"}, status_code=400)
        
    valid_exts = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.heic', '.heif')
    is_image_mime = image.content_type.startswith("image/")
    is_valid_ext = image.filename and image.filename.lower().endswith(valid_exts)
    
    if not (is_image_mime or is_valid_ext):
        return JSONResponse({"error": "不合法的文件类型"}, status_code=400)
    
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
@limiter.limit("10/minute")
async def remove_watermark(request: Request, image: UploadFile = File(...), mask: UploadFile = File(...)):
    if not image or not mask:
        return JSONResponse({"error": "缺少图片或蒙版文件"}, status_code=400)
        
    valid_exts = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.heic', '.heif')
    def is_valid_img(f: UploadFile):
        return f.content_type.startswith("image/") or (f.filename and f.filename.lower().endswith(valid_exts))
        
    if not (is_valid_img(image) and is_valid_img(mask)):
        return JSONResponse({"error": "不合法的文件类型"}, status_code=400)
        
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
@limiter.limit("10/minute")
async def api_remove_background(request: Request, file: UploadFile = File(...), model: str = Form("u2net_human_seg")):
    """
    图片去背景
    
    Args:
        file: 图片文件
        model: 模型选择
               - u2net_human_seg: 人像专用，证件照优化 (默认)
               - silueta: 高精度人像分割
               - u2net: 通用场景
               - u2netp: 轻量通用
               - bria_rmbg: 商业级去背景
    """
    if not file:
        return JSONResponse({"error": "缺少图片文件"}, status_code=400)
        
    valid_exts = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.heic', '.heif')
    is_image_mime = file.content_type.startswith("image/")
    is_valid_ext = file.filename and file.filename.lower().endswith(valid_exts)
    
    if not (is_image_mime or is_valid_ext):
        return JSONResponse({"error": "不合法的文件类型"}, status_code=400)
    
    # 验证模型参数
    valid_models = ['u2net', 'u2net_human_seg', 'silueta', 'u2netp', 'bria_rmbg']
    if model not in valid_models:
        model = 'u2net_human_seg'  # 默认使用人像模型
        
    img_path = UPLOAD_DIR / f"bg_{int(time.time()*1000)}_{file.filename}"
    with open(img_path, "wb") as f: f.write(await file.read())
        
    out_dir = pwd / "temp-bg"
    out_dir.mkdir(exist_ok=True)
    out_file = out_dir / f"{int(time.time()*1000)}-no-bg.png"
    
    print(f"[BG] 开始去背景处理: {file.filename}, 模型: {model}")
    
    try:
        from script.remove_bg import remove_background as rembg_process
        await asyncio.to_thread(rembg_process, str(img_path), str(out_file), model)
        
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

# ==================== PDF转Word API ====================
PDF2WORD_DIR = pwd / "pdf2word"
PDF2WORD_DIR.mkdir(exist_ok=True)
PDF2WORD_OUTPUT_DIR = PDF2WORD_DIR / "outputs"
PDF2WORD_OUTPUT_DIR.mkdir(exist_ok=True)
PDF2WORD_UPLOAD_DIR = PDF2WORD_DIR / "uploads"
PDF2WORD_UPLOAD_DIR.mkdir(exist_ok=True)
pdf2word_tasks = {}

@app.get("/api/pdf2word/status")
@limiter.limit("60/minute")
async def pdf2word_status(request: Request):
    """获取PDF转Word服务状态"""
    return get_pdf2word_status()

@app.post("/api/pdf2word/batch")
@limiter.limit("5/minute")
async def pdf2word_batch(request: Request, files: List[UploadFile] = File(...)):
    """批量上传PDF转换"""
    if not files:
        return JSONResponse({"error": "没有上传文件"}, status_code=400)
    
    task_ids = []
    for file in files:
        if file.filename == '' or not file.filename.lower().endswith('.pdf'):
            continue
        
        task_id = f"{int(time.time()*1000)}-{uuid.uuid4().hex[:8]}"
        upload_path = PDF2WORD_UPLOAD_DIR / f"{task_id}_{file.filename}"
        with open(upload_path, "wb") as f:
            f.write(await file.read())
        
        pdf2word_tasks[task_id] = {
            "status": "queued",
            "progress": 0,
            "filename": file.filename,
            "upload_path": str(upload_path),
            "output_path": None,
            "message": "等待处理",
            "created_at": int(time.time() * 1000)
        }
        task_ids.append({"taskId": task_id, "filename": file.filename})
    
    # 启动异步处理
    async def process_tasks():
        for task_id in task_ids:
            tid = task_id['taskId']
            task = pdf2word_tasks[tid]
            pdf2word_tasks[tid]['status'] = 'processing'
            pdf2word_tasks[tid]['progress'] = 10
            
            try:
                success, output_path, msg = await asyncio.to_thread(
                    pdf_to_word,
                    task['upload_path'],
                    str(PDF2WORD_OUTPUT_DIR)
                )
                pdf2word_tasks[tid]['progress'] = 100
                if success:
                    pdf2word_tasks[tid]['status'] = 'completed'
                    pdf2word_tasks[tid]['output_path'] = output_path
                    pdf2word_tasks[tid]['message'] = '转换成功'
                else:
                    pdf2word_tasks[tid]['status'] = 'failed'
                    pdf2word_tasks[tid]['message'] = msg
            except Exception as e:
                pdf2word_tasks[tid]['status'] = 'failed'
                pdf2word_tasks[tid]['message'] = str(e)
    
    asyncio.create_task(process_tasks())
    
    return {"tasks": task_ids, "count": len(task_ids)}

@app.get("/api/pdf2word/task/{task_id}")
@limiter.limit("60/minute")
async def pdf2word_task_status(request: Request, task_id: str):
    """查询任务状态"""
    if task_id not in pdf2word_tasks:
        return JSONResponse({"error": "任务不存在"}, status_code=404)
    return pdf2word_tasks[task_id]

@app.get("/api/pdf2word/download/{task_id}")
@limiter.limit("30/minute")
async def pdf2word_download(request: Request, task_id: str):
    """下载转换结果"""
    if task_id not in pdf2word_tasks:
        return JSONResponse({"error": "任务不存在"}, status_code=404)
    
    task = pdf2word_tasks[task_id]
    if task['status'] != 'completed':
        return JSONResponse({"error": "任务未完成"}, status_code=400)
    
    output_path = task.get('output_path')
    if not output_path or not Path(output_path).exists():
        return JSONResponse({"error": "文件不存在"}, status_code=404)
    
    return FileResponse(
        output_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=task['filename'].replace('.pdf', '.docx')
    )

# ==================== OCR API ====================
OCR_DIR = pwd / "ocr"
OCR_DIR.mkdir(exist_ok=True)
OCR_OUTPUT_DIR = OCR_DIR / "outputs"
OCR_OUTPUT_DIR.mkdir(exist_ok=True)
OCR_UPLOAD_DIR = OCR_DIR / "uploads"
OCR_UPLOAD_DIR.mkdir(exist_ok=True)
ocr_tasks = {}

@app.get("/api/ocr/status")
@limiter.limit("60/minute")
async def ocr_status_endpoint(request: Request):
    """获取OCR服务状态"""
    return get_ocr_status()

@app.post("/api/image-to-excel")
@limiter.limit("5/minute")
async def api_image_to_excel(request: Request, files: List[UploadFile] = File(...), engine: str = Form(None)):
    """图片转Excel - 识别表格内容"""
    if not OCR_AVAILABLE:
        return JSONResponse({"error": "OCR服务未启用，请安装 pytesseract 或 paddleocr"}, status_code=503)
    
    if not files:
        return JSONResponse({"error": "没有上传文件"}, status_code=400)
    
    task_id = f"{int(time.time()*1000)}-{uuid.uuid4().hex[:8]}"
    upload_paths = []
    
    for file in files:
        if not file.filename:
            continue
        valid_exts = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.heic', '.heif')
        if not file.filename.lower().endswith(valid_exts):
            continue
        upload_path = OCR_UPLOAD_DIR / f"{task_id}_{file.filename}"
        with open(upload_path, "wb") as f:
            f.write(await file.read())
        upload_paths.append(str(upload_path))
    
    if not upload_paths:
        return JSONResponse({"error": "没有有效的图片文件"}, status_code=400)
    
    output_path = str(OCR_OUTPUT_DIR / f"{task_id}.xlsx")
    ocr_tasks[task_id] = {"status": "processing", "type": "excel", "files": [f.filename for f in files if f.filename], "created_at": int(time.time() * 1000), "output_path": output_path}
    
    try:
        success, result_path, msg = await image_to_excel_async(upload_paths, output_path, engine)
        if success:
            ocr_tasks[task_id]["status"] = "completed"
            for p in upload_paths:
                asyncio.get_event_loop().run_in_executor(None, lambda: Path(p).unlink(missing_ok=True))
            async def cleanup_output():
                await asyncio.sleep(60)
                Path(output_path).unlink(missing_ok=True)
                if task_id in ocr_tasks:
                    del ocr_tasks[task_id]
            asyncio.create_task(cleanup_output())
            return FileResponse(output_path, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=f"ocr_result_{task_id}.xlsx")
        else:
            ocr_tasks[task_id]["status"] = "failed"
            ocr_tasks[task_id]["error"] = msg
            return JSONResponse({"error": msg}, status_code=500)
    except Exception as e:
        print(f"[OCR-Excel] Error: {e}")
        ocr_tasks[task_id]["status"] = "failed"
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/image-to-word")
@limiter.limit("5/minute")
async def api_image_to_word(request: Request, files: List[UploadFile] = File(...), engine: str = Form(None)):
    """图片转Word - 识别文字内容"""
    if not OCR_AVAILABLE:
        return JSONResponse({"error": "OCR服务未启用，请安装 pytesseract 或 paddleocr"}, status_code=503)
    
    if not files:
        return JSONResponse({"error": "没有上传文件"}, status_code=400)
    
    task_id = f"{int(time.time()*1000)}-{uuid.uuid4().hex[:8]}"
    upload_paths = []
    
    for file in files:
        if not file.filename:
            continue
        valid_exts = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.heic', '.heif')
        if not file.filename.lower().endswith(valid_exts):
            continue
        upload_path = OCR_UPLOAD_DIR / f"{task_id}_{file.filename}"
        with open(upload_path, "wb") as f:
            f.write(await file.read())
        upload_paths.append(str(upload_path))
    
    if not upload_paths:
        return JSONResponse({"error": "没有有效的图片文件"}, status_code=400)
    
    output_path = str(OCR_OUTPUT_DIR / f"{task_id}.docx")
    ocr_tasks[task_id] = {"status": "processing", "type": "word", "files": [f.filename for f in files if f.filename], "created_at": int(time.time() * 1000), "output_path": output_path}
    
    try:
        success, result_path, msg = await image_to_word_async(upload_paths, output_path, engine)
        if success:
            ocr_tasks[task_id]["status"] = "completed"
            for p in upload_paths:
                asyncio.get_event_loop().run_in_executor(None, lambda: Path(p).unlink(missing_ok=True))
            async def cleanup_output():
                await asyncio.sleep(60)
                Path(output_path).unlink(missing_ok=True)
                if task_id in ocr_tasks:
                    del ocr_tasks[task_id]
            asyncio.create_task(cleanup_output())
            return FileResponse(output_path, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", filename=f"ocr_result_{task_id}.docx")
        else:
            ocr_tasks[task_id]["status"] = "failed"
            ocr_tasks[task_id]["error"] = msg
            return JSONResponse({"error": msg}, status_code=500)
    except Exception as e:
        print(f"[OCR-Word] Error: {e}")
        ocr_tasks[task_id]["status"] = "failed"
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/ocr/task/{task_id}")
@limiter.limit("60/minute")
async def ocr_task_status(request: Request, task_id: str):
    """查询OCR任务状态"""
    if task_id not in ocr_tasks:
        return JSONResponse({"error": "任务不存在"}, status_code=404)
    return ocr_tasks[task_id]

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)

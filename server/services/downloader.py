import hashlib
from pathlib import Path
from typing import List, Optional
import httpx
from pydantic import BaseModel

class ImageItem(BaseModel):
    src: str
    alt: Optional[str] = "图片"

class DownloadImagesReq(BaseModel):
    url: str
    images: List[ImageItem]
    skipCache: Optional[bool] = False

def get_url_hash(url: str) -> str:
    return hashlib.md5(url.encode('utf-8')).hexdigest()

async def download_image(url: str, target_path: Path):
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(url, timeout=30.0)
        response.raise_for_status()
        with open(target_path, "wb") as f:
            for chunk in response.iter_bytes(chunk_size=8192):
                f.write(chunk)
        size = target_path.stat().st_size
        return {"path": str(target_path), "size": size, "url": url}

async def process_image_downloads(session_dir: Path, session_id: str, images: List[ImageItem]) -> List[dict]:
    downloaded_images = []
    from urllib.parse import urlparse
    for i, img in enumerate(images):
        try:
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
    return downloaded_images

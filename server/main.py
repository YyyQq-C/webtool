#!/usr/bin/env python3
"""
图片去背景服务 - 基于 rembg 的服务器端 AI 去背景
启动: uvicorn main:app --host 0.0.0.0 --port 8000
"""

import io
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image
from rembg import remove

app = FastAPI(title="图片去背景服务")

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

        # 去背景 - u2net 模型效果最好
        result = remove(img, model_name="u2net")

        # 直接返回 PNG 字节流
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

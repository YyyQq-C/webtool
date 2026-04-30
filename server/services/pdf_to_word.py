#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF转Word服务模块
主方案: LibreOffice (soffice --headless)
兜底方案: pdf2docx
"""

import os
import sys
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Tuple, Optional

# pdf2docx作为兜底
try:
    from pdf2docx import Converter
    HAS_PDF2DOCX = True
except ImportError:
    HAS_PDF2DOCX = False


def check_libreoffice() -> bool:
    """检查LibreOffice是否可用"""
    try:
        result = subprocess.run(
            ['soffice', '--version'],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.returncode == 0
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


def convert_with_libreoffice(pdf_path: str, output_dir: str) -> Tuple[bool, Optional[str], str]:
    """
    使用LibreOffice转换PDF到Word

    Args:
        pdf_path: PDF文件路径
        output_dir: 输出目录

    Returns:
        (success, output_path, message)
    """
    if not check_libreoffice():
        return False, None, "LibreOffice不可用"

    pdf_path = Path(pdf_path).resolve()
    output_dir = Path(output_dir).resolve()

    if not pdf_path.exists():
        return False, None, f"文件不存在: {pdf_path}"

    try:
        cmd = [
            'soffice',
            '--headless',
            '--convert-to', 'docx',
            '--outdir', str(output_dir),
            str(pdf_path)
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5分钟超时
        )

        if result.returncode != 0:
            return False, None, f"LibreOffice转换失败: {result.stderr}"

        # 检查输出文件
        output_file = output_dir / f"{pdf_path.stem}.docx"
        if output_file.exists():
            return True, str(output_file), "转换成功"
        else:
            return False, None, "转换完成但未找到输出文件"

    except subprocess.TimeoutExpired:
        return False, None, "LibreOffice转换超时"
    except Exception as e:
        return False, None, f"LibreOffice转换异常: {str(e)}"


def convert_with_pdf2docx(pdf_path: str, output_dir: str) -> Tuple[bool, Optional[str], str]:
    """
    使用pdf2docx转换PDF到Word（兜底方案）

    Args:
        pdf_path: PDF文件路径
        output_dir: 输出目录

    Returns:
        (success, output_path, message)
    """
    if not HAS_PDF2DOCX:
        return False, None, "pdf2docx未安装"

    pdf_path = Path(pdf_path).resolve()
    output_dir = Path(output_dir).resolve()

    if not pdf_path.exists():
        return False, None, f"文件不存在: {pdf_path}"

    output_file = output_dir / f"{pdf_path.stem}.docx"

    try:
        cv = Converter(str(pdf_path))
        cv.convert(str(output_file), start=0, end=None)
        cv.close()

        if output_file.exists():
            return True, str(output_file), "转换成功"
        else:
            return False, None, "转换完成但未找到输出文件"

    except Exception as e:
        return False, None, f"pdf2docx转换异常: {str(e)}"


def pdf_to_word(pdf_path: str, output_dir: str) -> Tuple[bool, Optional[str], str]:
    """
    PDF转Word主入口

    Args:
        pdf_path: PDF文件路径
        output_dir: 输出目录

    Returns:
        (success, output_path, message)
    """
    pdf_path = Path(pdf_path).resolve()

    if not pdf_path.exists():
        return False, None, f"文件不存在: {pdf_path}"

    if pdf_path.suffix.lower() != '.pdf':
        return False, None, f"不是PDF文件: {pdf_path}"

    # 优先使用LibreOffice
    if check_libreoffice():
        success, output_path, msg = convert_with_libreoffice(str(pdf_path), output_dir)
        if success:
            return True, output_path, msg

        # LibreOffice失败，尝试兜底
        if HAS_PDF2DOCX:
            return convert_with_pdf2docx(str(pdf_path), output_dir)
        else:
            return False, None, f"LibreOffice失败且无兜底方案: {msg}"

    # LibreOffice不可用，使用pdf2docx
    elif HAS_PDF2DOCX:
        return convert_with_pdf2docx(str(pdf_path), output_dir)

    else:
        return False, None, "无可用的转换工具"


def get_status():
    """获取服务状态"""
    return {
        "libreoffice": check_libreoffice(),
        "pdf2docx": HAS_PDF2DOCX
    }
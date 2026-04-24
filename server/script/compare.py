#!/usr/bin/env python3
"""图片相似度对比工具"""

import sys
import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim

def compare_images(image1_path, image2_path):
    """对比两张图片的相似度"""
    # 读取图片
    img1 = cv2.imread(image1_path)
    img2 = cv2.imread(image2_path)
    
    if img1 is None or img2 is None:
        return {"error": "无法读取图片"}
    
    # 调整尺寸到相同大小
    if img1.shape != img2.shape:
        # 取最小尺寸
        h = min(img1.shape[0], img2.shape[0])
        w = min(img1.shape[1], img2.shape[1])
        img1 = cv2.resize(img1, (w, h))
        img2 = cv2.resize(img2, (w, h))
    
    # 转灰度
    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
    
    # 结构相似度 (SSIM)
    try:
        ssim_score = ssim(gray1, gray2)
    except:
        ssim_score = 0
    
    # 直方图相似度
    hist1 = cv2.calcHist([img1], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    hist2 = cv2.calcHist([img2], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    cv2.normalize(hist1, hist1)
    cv2.normalize(hist2, hist2)
    hist_score = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
    
    # 综合相似度
    similarity = (ssim_score * 0.6 + hist_score * 0.4) * 100
    
    # 判断相似程度
    if similarity >= 80:
        message = "图片高度相似，可能是同一图片或轻微修改"
    elif similarity >= 50:
        message = "图片部分相似，可能包含相似内容"
    else:
        message = "图片差异较大，内容不同"
    
    return {
        "similarity": similarity,
        "structural": ssim_score,
        "histogram": hist_score,
        "message": message
    }

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python compare.py image1_path image2_path")
        sys.exit(1)
    
    result = compare_images(sys.argv[1], sys.argv[2])
    print(result)
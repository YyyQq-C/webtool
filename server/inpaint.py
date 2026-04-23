#!/usr/bin/env python3
"""
图片去水印 - 使用 OpenCV 修复算法
用法: python3 inpaint.py <image_path> <mask_path> <output_path>
"""

import sys
import cv2
import numpy as np

def remove_watermark(image_path, mask_path, output_path):
    try:
        # 读取原图
        img = cv2.imread(image_path)
        if img is None:
            print("Failed to read image", file=sys.stderr)
            sys.exit(1)

        # 读取蒙版
        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if mask is None:
            print("Failed to read mask", file=sys.stderr)
            sys.exit(1)

        # 确保蒙版是二值图像
        _, mask = cv2.threshold(mask, 10, 255, cv2.THRESH_BINARY)

        # 使用 OpenCV 的修复算法
        # TELEA 算法（基于快速行进方法）
        result = cv2.inpaint(img, mask, inpaintRadius=3, flags=cv2.INPAINT_TELEA)

        # 保存结果
        cv2.imwrite(output_path, result)
        print("Success")

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python3 inpaint.py <image_path> <mask_path> <output_path>", file=sys.stderr)
        sys.exit(1)

    remove_watermark(sys.argv[1], sys.argv[2], sys.argv[3])
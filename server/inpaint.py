#!/usr/bin/env python3
"""
图片去水印 - 使用 OpenCV 智能修复算法
用法:
  去除水印: python3 inpaint.py remove <image_path> <mask_path> <output_path>
  检测水印: python3 inpaint.py detect <image_path> <output_mask_path>
"""

import sys
import cv2
import numpy as np
import base64

def detect_watermark(image_path, output_mask_path):
    """智能检测水印区域"""
    try:
        img = cv2.imread(image_path)
        if img is None:
            print("Failed to read image", file=sys.stderr)
            sys.exit(1)

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # 方法 1: 频域分析检测重复图案（FFT 检测周期性水印）
        f_transform = cv2.dft(np.float32(gray), flags=cv2.DFT_COMPLEX_OUTPUT)
        f_shift = np.fft.fftshift(f_transform)
        magnitude = cv2.magnitude(f_shift[:, :, 0], f_shift[:, :, 1])
        magnitude = np.log(magnitude + 1)
        magnitude = cv2.normalize(magnitude, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

        # 方法 2: 边缘检测 + 形态学
        edges = cv2.Canny(gray, 50, 150)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edges_dilated = cv2.dilate(edges, kernel, iterations=2)

        # 方法 3: 局部对比度分析（水印通常有较低的局部对比度）
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        local_contrast = cv2.absdiff(gray, blurred)
        _, contrast_mask = cv2.threshold(local_contrast, 20, 255, cv2.THRESH_BINARY_INV)

        # 综合检测结果
        combined_mask = cv2.bitwise_or(edges_dilated, contrast_mask)

        # 形态学优化
        kernel_large = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel_large)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)

        # 如果检测不到水印，尝试基于亮度的方法（检测半透明覆盖层）
        if cv2.countNonZero(combined_mask) < 100:
            block_size = min(h, w) // 8
            brightness_mask = np.zeros((h, w), dtype=np.uint8)

            for y in range(0, h - block_size, block_size):
                for x in range(0, w - block_size, block_size):
                    block = gray[y:y+block_size, x:x+block_size]
                    mean_val = np.mean(block)
                    std_val = np.std(block)
                    if 180 < mean_val < 220 and std_val < 30:
                        brightness_mask[y:y+block_size, x:x+block_size] = 255

            combined_mask = cv2.bitwise_or(combined_mask, brightness_mask)

        _, combined_mask = cv2.threshold(combined_mask, 127, 255, cv2.THRESH_BINARY)
        cv2.imwrite(output_mask_path, combined_mask)

        _, buffer = cv2.imencode('.png', combined_mask)
        mask_base64 = base64.b64encode(buffer).decode('utf-8')

        print(f"Detected {cv2.countNonZero(combined_mask)} watermark pixels")
        print(f"MASK_BASE64:{mask_base64}")

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

def remove_watermark(image_path, mask_path, output_path):
    """
    去除水印 - 使用 OpenCV 智能修复算法（非马赛克）
    只修复 mask 标记的区域，保持其他部分原样
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            print("Failed to read image", file=sys.stderr)
            sys.exit(1)

        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if mask is None:
            print("Failed to read mask", file=sys.stderr)
            sys.exit(1)

        _, mask = cv2.threshold(mask, 10, 255, cv2.THRESH_BINARY)

        # 扩展 mask 边缘，使修复更自然
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        mask_expanded = cv2.dilate(mask, kernel, iterations=1)

        mask_area = cv2.countNonZero(mask)
        total_area = img.shape[0] * img.shape[1]
        mask_ratio = mask_area / total_area

        # 根据 mask 占比动态调整修复半径
        if mask_ratio < 0.01:
            radius = 3
        elif mask_ratio < 0.05:
            radius = 5
        else:
            radius = 7

        # 使用 TELEA 算法进行智能修复（非马赛克，基于周围像素智能填充）
        result = cv2.inpaint(img, mask_expanded, inpaintRadius=radius, flags=cv2.INPAINT_TELEA)

        # 如果 mask 区域较大，融合两种算法
        if mask_ratio > 0.03:
            result_ns = cv2.inpaint(img, mask_expanded, inpaintRadius=radius, flags=cv2.INPAINT_NS)
            mask_blurred = cv2.GaussianBlur(mask_expanded, (5, 5), 0)
            mask_normalized = mask_blurred.astype(np.float32) / 255.0
            mask_3ch = cv2.merge([mask_normalized] * 3)
            result = (result_ns * mask_3ch + result * (1 - mask_3ch)).astype(np.uint8)

        # 只对 mask 区域进行替换，保持其他区域不变
        mask_3ch = cv2.merge([mask] * 3)
        mask_inv = cv2.bitwise_not(mask_3ch)
        final = cv2.bitwise_and(img, mask_inv) + cv2.bitwise_and(result, mask_3ch)

        cv2.imwrite(output_path, final)
        print("Success")

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage:", file=sys.stderr)
        print("  Remove: python3 inpaint.py remove <image_path> <mask_path> <output_path>", file=sys.stderr)
        print("  Detect: python3 inpaint.py detect <image_path> <output_mask_path>", file=sys.stderr)
        sys.exit(1)

    action = sys.argv[1]

    if action == "detect":
        if len(sys.argv) != 4:
            print("Usage: python3 inpaint.py detect <image_path> <output_mask_path>", file=sys.stderr)
            sys.exit(1)
        detect_watermark(sys.argv[2], sys.argv[3])
    elif action == "remove":
        if len(sys.argv) != 5:
            print("Usage: python3 inpaint.py remove <image_path> <mask_path> <output_path>", file=sys.stderr)
            sys.exit(1)
        remove_watermark(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print(f"Unknown action: {action}", file=sys.stderr)
        sys.exit(1)
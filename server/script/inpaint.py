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
from PIL import Image

def load_image(image_path):
    """加载图片，支持多种格式（包括 ICO）"""
    # 先尝试用 PIL 加载（支持更多格式）
    try:
        pil_img = Image.open(image_path)
        # ICO 可能包含多个图标，取最大的一个
        if hasattr(pil_img, 'size') and pil_img.format == 'ICO':
            # 获取最大尺寸的图标
            if hasattr(pil_img, 'info') and 'sizes' in pil_img.info:
                sizes = pil_img.info['sizes']
                max_size = max(sizes, key=lambda s: s[0] * s[1])
                pil_img.size = max_size
        # 转换为 RGB/RGBA
        if pil_img.mode == 'P':
            pil_img = pil_img.convert('RGBA')
        elif pil_img.mode not in ('RGB', 'RGBA', 'L'):
            pil_img = pil_img.convert('RGB')
        # 转换为 OpenCV 格式
        if pil_img.mode == 'RGBA':
            cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGBA2BGRA)
        elif pil_img.mode == 'RGB':
            cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        else:  # L (灰度)
            cv_img = np.array(pil_img)
        return cv_img
    except Exception as e:
        # 如果 PIL 失败，尝试 OpenCV
        cv_img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if cv_img is None:
            print(f"Failed to read image: {str(e)}", file=sys.stderr)
            return None
        return cv_img

def detect_watermark(image_path, output_mask_path):
    """智能检测水印区域"""
    try:
        img = load_image(image_path)
        if img is None:
            raise RuntimeError("Failed to read image")

        # 如果是 RGBA，转灰度时只用 RGB 通道
        if len(img.shape) == 3 and img.shape[2] == 4:
            gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
        elif len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img
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

        print(f"MASK_BASE64:{mask_base64}")
        return mask_base64

    except Exception as e:
        raise RuntimeError(str(e))

def remove_watermark(image_path, mask_path, output_path):
    """
    去除水印 - 使用 OpenCV 智能修复算法（非马赛克）
    只修复 mask 标记的区域，保持其他部分原样
    """
    try:
        img = load_image(image_path)
        if img is None:
            raise RuntimeError("Failed to read image")

        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if mask is None:
            raise RuntimeError("Failed to read mask")

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
            # 根据图片通道数创建 mask
            num_channels = img.shape[2] if len(img.shape) == 3 else 1
            mask_multi = cv2.merge([mask_normalized] * num_channels)
            result = (result_ns * mask_multi + result * (1 - mask_multi)).astype(np.uint8)

        # 只对 mask 区域进行替换，保持其他区域不变
        num_channels = img.shape[2] if len(img.shape) == 3 else 1
        mask_multi = cv2.merge([mask] * num_channels)
        mask_inv = cv2.bitwise_not(mask_multi)
        final = cv2.bitwise_and(img, mask_inv) + cv2.bitwise_and(result, mask_multi)

        cv2.imwrite(output_path, final)
        print("Success")
        return True

    except Exception as e:
        raise RuntimeError(str(e))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage:", file=sys.stderr)
        print("  Remove: python3 inpaint.py remove <image_path> <mask_path> <output_path>", file=sys.stderr)
        print("  Detect: python3 inpaint.py detect <image_path> <output_mask_path>", file=sys.stderr)
        sys.exit(1)

    action = sys.argv[1]

    try:
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
    except Exception as err:
        print(f"Error: {str(err)}", file=sys.stderr)
        sys.exit(1)
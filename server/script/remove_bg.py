
#!/usr/bin/env python3
"""
图片去背景脚本
支持多种模型:
- u2net: 通用场景 (默认)
- u2net_human_seg: 人像专用，证件照优化
- silueta: 高精度人像分割
"""
import sys
import io
from PIL import Image
from rembg import remove, new_session

# 模型映射
MODEL_MAP = {
    'u2net': '通用场景',
    'u2net_human_seg': '人像专用',
    'silueta': '高精度人像',
    'u2netp': '轻量通用',
    'bria_rmbg': '商业级去背景',
}

# Session 缓存，避免每次请求重新加载模型
_session_cache = {}

def get_session(model):
    """获取或创建缓存的 session"""
    if model not in _session_cache:
        print(f"[rembg] 加载模型: {model}")
        _session_cache[model] = new_session(model)
        print(f"[rembg] 模型 {model} 已缓存")
    return _session_cache[model]

def remove_background(input_path, output_path, model='u2net_human_seg'):
    """
    去除图片背景
    
    Args:
        input_path: 输入图片路径
        output_path: 输出图片路径
        model: 模型名称，默认 u2net_human_seg (人像专用)
               - u2net: 通用场景
               - u2net_human_seg: 人像专用，证件照优化
               - silueta: 高精度人像分割
               - u2netp: 轻量通用
               - bria_rmbg: 商业级去背景
    """
    try:
        # 使用缓存的 session，避免每次重新加载模型
        session = get_session(model)
        
        with open(input_path, 'rb') as f:
            input_data = f.read()
        
        # 使用指定模型的会话处理
        output_data = remove(input_data, session=session)
        
        with open(output_path, 'wb') as f:
            f.write(output_data)
        
        print(f"[rembg] 处理完成 (model: {model})")
        return True
    except Exception as e:
        raise RuntimeError(str(e))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 remove_bg.py <input_path> <output_path> [model]", file=sys.stderr)
        print("Models: u2net, u2net_human_seg (default), silueta, u2netp, bria_rmbg", file=sys.stderr)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    model = sys.argv[3] if len(sys.argv) > 3 else 'u2net_human_seg'
    
    try:
        remove_background(input_path, output_path, model)
    except Exception as err:
        print(f"Error: {str(err)}", file=sys.stderr)
        sys.exit(1)

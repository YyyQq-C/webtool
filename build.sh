#!/bin/bash
set -e

# 使用相对路径
SCRIPT_DIR="$(cd "$(dirname "$BASH_SOURCE")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "⚡ 快速构建前端..."
cd "$PROJECT_DIR"
npm run build
echo "✅ 构建完成，Nginx 自动生效！"
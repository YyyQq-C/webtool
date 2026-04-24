#!/bin/bash
set -e

echo "⚡ 快速构建前端..."
cd /data/tool
npm run build
echo "✅ 构建完成，Nginx 自动生效！"
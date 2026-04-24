#!/bin/bash
# Nginx 配置安装脚本
set -e

# 使用相对路径
SCRIPT_DIR="$(cd "$(dirname "$BASH_SOURCE")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

CONF_TEMPLATE="$PROJECT_DIR/nginx.conf.template"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available/tool.conf"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled/tool.conf"
DEFAULT_CONF="/etc/nginx/sites-enabled/default"

echo "🔧 安装 Nginx 配置..."

# 检查 Nginx
if ! command -v nginx &>/dev/null; then
    echo "❌ Nginx 未安装"
    exit 1
fi

# 检查模板文件
if [ ! -f "$CONF_TEMPLATE" ]; then
    echo "❌ 配置模板不存在: $CONF_TEMPLATE"
    exit 1
fi

# 复制配置
sudo cp "$CONF_TEMPLATE" "$NGINX_SITES_AVAILABLE"
echo "✅ 配置已复制到 $NGINX_SITES_AVAILABLE"

# 创建符号链接
sudo ln -sf "$NGINX_SITES_AVAILABLE" "$NGINX_SITES_ENABLED"
echo "✅ 符号链接已创建: $NGINX_SITES_ENABLED"

# 删除默认配置（避免冲突）
if [ -f "$DEFAULT_CONF" ]; then
    sudo rm -f "$DEFAULT_CONF"
    echo "✅ 已删除默认配置"
fi

# 测试配置
echo "🔍 测试 Nginx 配置..."
sudo nginx -t

# 重启 Nginx
echo "🔄 重启 Nginx..."
sudo systemctl reload nginx || sudo nginx -s reload

echo "✅ Nginx 配置安装完成！"
echo "📍 访问地址: http://localhost:10010"
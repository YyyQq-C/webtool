#!/bin/bash
# 服务器启动脚本 - 使用 Python 3 + Playwright
set -e

# 使用相对路径
SERVER_DIR="$(cd "$(dirname "$BASH_SOURCE")" && pwd)"
PID_FILE="/tmp/python-server.pid"
LOG_FILE="/tmp/python-server.log"
PORT=8000

echo "🚀 启动去背景后端服务 (Python 3 + Playwright)..."

# 检查 Python 3
if ! command -v python3 &>/dev/null; then
    echo "❌ Python 3 未安装"
    exit 1
fi

# 检查服务器目录
if [ ! -d "$SERVER_DIR" ]; then
    echo "❌ 服务器目录不存在: $SERVER_DIR"
    exit 1
fi

cd "$SERVER_DIR"

# 安装依赖
echo "📦 安装依赖..."
if [ -f "requirements.txt" ]; then
    pip3 install -r requirements.txt
fi

# 安装 Playwright 浏览器
echo "🌍 安装 Playwright 浏览器依赖..."
playwright install chromium

# 检查端口占用
if lsof -i:$PORT > /dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用，正在停止旧服务..."
    pkill -f "python3 server.py" 2>/dev/null || true
    sleep 2
fi

# 启动服务
echo "📡 启动服务 (端口: $PORT)..."
export PORT=$PORT
nohup python3 server.py > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

# 等待启动
sleep 5

# 验证服务
if curl -s http://localhost:$PORT/health | grep -q "ok"; then
    echo "✅ 服务启动成功！"
    echo "📍 地址: http://localhost:$PORT"
    echo "📋 日志: $LOG_FILE"
    echo "🔧 PID: $(cat $PID_FILE)"
else
    echo "❌ 服务启动失败，请检查日志:"
    tail -20 "$LOG_FILE"
    exit 1
fi

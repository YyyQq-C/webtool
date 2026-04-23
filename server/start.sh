#!/bin/bash
# 服务器启动脚本 - 使用 Node.js + Puppeteer
set -e

SERVER_DIR="/data/tool/server"
PID_FILE="/tmp/node-server.pid"
LOG_FILE="/tmp/node-server.log"
PORT=8000

echo "🚀 启动去背景后端服务 (Node.js + Puppeteer)..."

# 检查 Node.js
if ! command -v node &>/dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

# 检查服务器目录
if [ ! -d "$SERVER_DIR" ]; then
    echo "❌ 服务器目录不存在: $SERVER_DIR"
    exit 1
fi

cd "$SERVER_DIR"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    PUPPETEER_SKIP_DOWNLOAD=true npm install
fi

# 检查端口占用
if lsof -i:$PORT > /dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用，正在停止旧服务..."
    pkill -f "node node-server.js" 2>/dev/null || true
    sleep 2
fi

# 启动服务
echo "📡 启动服务 (端口: $PORT)..."
nohup node node-server.js > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

# 等待启动
sleep 3

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

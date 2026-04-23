#!/bin/bash
# 服务器停止脚本

PID_FILE="/tmp/server.pid"
PORT=8000

echo "🛑 停止去背景后端服务..."

# 尝试从 PID 文件停止
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "✅ 服务已停止 (PID: $PID)"
        rm -f "$PID_FILE"
        exit 0
    fi
fi

# 备用：通过端口查找并停止
if lsof -i:$PORT > /dev/null 2>&1; then
    echo "⚠️  通过端口 $PORT 查找进程..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    echo "✅ 服务已停止"
else
    echo "ℹ️  服务未运行"
fi
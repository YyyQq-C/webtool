#!/bin/bash
# 服务器启动脚本 - 使用 Python 3 + Playwright
set -e

# 使用相对路径
SERVER_DIR="$(cd "$(dirname "$BASH_SOURCE")" && pwd)"
PID_FILE="/tmp/python-server.pid"
LOG_FILE="/tmp/python-server.log"
PORT=8000

echo "🚀 启动去背景后端服务 (Python 3 + Playwright)..."

# 检查 Python
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
    # 检查是否是 Python 3
    if ! $PYTHON_CMD --version 2>&1 | grep -q "Python 3"; then
        echo "❌ 未找到 Python 3 (当前 python 命令为 $($PYTHON_CMD --version))"
        exit 1
    fi
else
    echo "❌ 未找到 python3 或 python 命令"
    exit 1
fi

# 检查 Pip
if $PYTHON_CMD -m pip --version &>/dev/null; then
    PIP_CMD="$PYTHON_CMD -m pip"
else
    echo "❌ 未找到 pip 模块"
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
    $PIP_CMD install -r requirements.txt
fi

# 安装 Playwright 浏览器
echo "🌍 安装 Playwright 浏览器依赖..."
$PYTHON_CMD -m playwright install chromium

# 检查端口占用
if lsof -i:$PORT > /dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用，正在停止旧服务..."
    pkill -f "$PYTHON_CMD server.py" 2>/dev/null || true
    sleep 2
fi

# 启动服务
echo "📡 启动服务 (端口: $PORT)..."
export PORT=$PORT
nohup $PYTHON_CMD server.py > "$LOG_FILE" 2>&1 &
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

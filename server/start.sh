#!/bin/bash
# 服务器启动脚本
# 用于启动 rembg 去背景后端服务

set -e

SERVER_DIR="/data/tool/server"
PID_FILE="/tmp/server.pid"
LOG_FILE="/tmp/server.log"
PORT=8000

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 启动去背景后端服务...${NC}"

# 检查依赖
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}❌ Python3 未安装${NC}"
    exit 1
fi

# 检查服务器目录
if [ ! -d "$SERVER_DIR" ]; then
    echo -e "${RED}❌ 服务器目录不存在: $SERVER_DIR${NC}"
    exit 1
fi

cd "$SERVER_DIR"

# 查找 uvicorn 路径
UVICORN=$(find /home -name "uvicorn" -type f 2>/dev/null | head -1)
if [ -z "$UVICORN" ]; then
    UVICORN="python3 -m uvicorn"
fi

# 检查端口占用
if lsof -i:$PORT > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  端口 $PORT 已被占用，正在停止旧服务...${NC}"
    pkill -f "uvicorn main:app.*$PORT" 2>/dev/null || true
    sleep 2
fi

# 启动服务
echo -e "${GREEN}📡 启动服务 (端口: $PORT)...${NC}"
nohup $UVICORN main:app --host 0.0.0.0 --port $PORT > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

# 等待启动
sleep 3

# 验证服务
if curl -s http://localhost:$PORT/health | grep -q "ok"; then
    echo -e "${GREEN}✅ 服务启动成功！${NC}"
    echo -e "${GREEN}📍 地址: http://localhost:$PORT${NC}"
    echo -e "${GREEN}📋 日志: $LOG_FILE${NC}"
    echo -e "${GREEN}🔧 PID: $(cat $PID_FILE)${NC}"
else
    echo -e "${RED}❌ 服务启动失败，请检查日志:${NC}"
    tail -20 "$LOG_FILE"
    exit 1
fi
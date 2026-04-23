#!/bin/bash
set -e

echo "========================================"
echo "🚀 工具箱一键构建部署脚本"
echo "========================================"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_DIR="/data/tool"
SERVER_DIR="$PROJECT_DIR/server"
DIST_DIR="$PROJECT_DIR/dist"
LOG_FILE="/tmp/deploy.log"

# 记录日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# 检查依赖
check_dependencies() {
    log "检查依赖环境..."
    
    command -v node &>/dev/null || error "Node.js 未安装"
    command -v npm &>/dev/null || error "npm 未安装"
    command -v nginx &>/dev/null || warn "Nginx 未安装，将只构建前端"
    command -v python3 &>/dev/null || warn "Python3 未安装，将跳过后端服务"
    
    # 检查 npm 依赖
    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        log "安装前端依赖..."
        cd "$PROJECT_DIR" && npm install || error "前端依赖安装失败"
    fi
    
    log "依赖检查完成"
}

# 构建前端
build_frontend() {
    log "开始构建前端..."
    cd "$PROJECT_DIR"
    
    npm run build 2>&1 | tee -a "$LOG_FILE" || error "前端构建失败"
    
    if [ ! -d "$DIST_DIR" ]; then
        error "构建输出目录不存在"
    fi
    
    log "前端构建完成 ✓"
    log "构建文件大小:"
    du -sh "$DIST_DIR" | tee -a "$LOG_FILE"
}

# 重启 Nginx
restart_nginx() {
    if ! command -v nginx &>/dev/null; then
        warn "Nginx 未安装，跳过"
        return
    fi
    
    log "检查 Nginx 配置..."
    sudo nginx -t 2>&1 | tee -a "$LOG_FILE" || error "Nginx 配置测试失败"
    
    log "重启 Nginx..."
    sudo systemctl reload nginx 2>&1 | tee -a "$LOG_FILE" || {
        warn "systemctl 不可用，尝试直接重启..."
        sudo nginx -s reload 2>&1 | tee -a "$LOG_FILE" || error "Nginx 重启失败"
    }
    
    log "Nginx 重启完成 ✓"
}

# 重启后端服务
restart_backend() {
    if ! command -v python3 &>/dev/null; then
        warn "Python3 未安装，跳过后端服务"
        return
    fi
    
    # 检查后端依赖
    if [ ! -d "$SERVER_DIR" ]; then
        warn "后端目录不存在，跳过后端服务"
        return
    fi
    
    log "检查后端服务..."
    
    # 停止旧进程
    if pgrep -f "uvicorn main:app.*8000" > /dev/null; then
        log "停止旧的后端服务..."
        pkill -f "uvicorn main:app.*8000" 2>/dev/null || true
        sleep 2
    fi
    
    # 启动新服务
    log "启动后端服务 (端口 8000)..."
    cd "$SERVER_DIR"
    
    local python_path
    python_path=$(find /home -name "uvicorn" -type f 2>/dev/null | head -1)
    
    if [ -n "$python_path" ]; then
        nohup "$python_path" main:app --host 0.0.0.0 --port 8000 > /tmp/server.log 2>&1 &
    else
        nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/server.log 2>&1 &
    fi
    
    # 等待服务启动
    sleep 3
    
    # 验证服务
    if curl -s http://localhost:8000/health | grep -q "ok"; then
        log "后端服务启动成功 ✓"
    else
        warn "后端服务可能启动失败，请检查 /tmp/server.log"
        cat /tmp/server.log | tail -10 | tee -a "$LOG_FILE"
    fi
}

# 停止旧的前端服务
stop_old_services() {
    log "清理旧服务..."
    pkill -f "serve -s dist" 2>/dev/null || true
}

# 验证部署
verify_deployment() {
    log "验证部署..."
    
    # 检查前端
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:10010/)
    if [ "$http_code" = "200" ]; then
        log "前端服务正常 ✓"
    else
        error "前端服务异常 (HTTP $http_code)"
    fi
    
    # 检查后端（如果存在）
    if command -v python3 &>/dev/null && [ -d "$SERVER_DIR" ]; then
        http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:10010/bg-api/health)
        if [ "$http_code" = "200" ]; then
            log "后端代理正常 ✓"
        else
            warn "后端代理异常 (HTTP $http_code)"
        fi
    fi
}

# 显示部署信息
show_info() {
    echo ""
    echo "========================================"
    echo "🎉 部署完成！"
    echo "========================================"
    echo "📍 访问地址: http://localhost:10010"
    echo "📁 项目路径: $PROJECT_DIR"
    echo "📦 构建输出: $DIST_DIR"
    echo "📋 日志文件: $LOG_FILE"
    echo "========================================"
    echo ""
}

# 主流程
main() {
    echo "========================================" | tee "$LOG_FILE"
    echo "🚀 工具箱一键构建部署脚本" | tee -a "$LOG_FILE"
    echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
    echo "========================================" | tee -a "$LOG_FILE"
    echo ""

    check_dependencies
    stop_old_services
    build_frontend
    restart_nginx
    restart_backend
    verify_deployment
    show_info

    echo "完成时间: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
    echo "========================================" | tee -a "$LOG_FILE"
}

main "$@"
#!/bin/bash
set -e

echo "========================================"
echo "🚀 蓝胖子的口袋 - 一键部署脚本"
echo "========================================"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目路径（使用相对路径，脚本在 script/ 目录下）
SCRIPT_DIR="$(cd "$(dirname "$BASH_SOURCE")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVER_DIR="$PROJECT_DIR/server"
SERVER_SCRIPT_DIR="$SERVER_DIR/script"
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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

# 检查依赖环境
check_dependencies() {
    log "检查依赖环境..."
    
    # npm
    command -v npm &>/dev/null || error "npm 未安装"
    
    # Node.js 版本检查
    local node_version
    node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        error "Node.js 版本过低，需要 >= 18 (当前: $(node -v))"
    fi
    
    # Nginx
    command -v nginx &>/dev/null || warn "Nginx 未安装，将只构建前端"
    
    # Python3
    if command -v python3 &>/dev/null; then
        log "Python3: $(python3 --version 2>&1)"
    elif command -v python &>/dev/null && python --version 2>&1 | grep -q "Python 3"; then
        log "Python: $(python --version 2>&1)"
    else
        warn "Python3 未安装，将跳过 Python 依赖"
    fi
    
    log "依赖检查完成 ✓"
}

# 安装前端依赖
install_frontend_deps() {
    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        log "安装前端依赖 (npm)..."
        cd "$PROJECT_DIR"
        npm install 2>&1 | tee -a "$LOG_FILE" || error "前端依赖安装失败"
        log "前端依赖安装完成 ✓"
    else
        info "前端依赖已存在，跳过安装"
    fi
}

# 安装 Python 依赖及浏览器
install_python_deps() {
    # 检查 Python3
    local PYTHON_CMD=""
    if command -v python3 &>/dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &>/dev/null && python --version 2>&1 | grep -q "Python 3"; then
        PYTHON_CMD="python"
    else
        warn "Python3 未安装，跳过 Python 依赖"
        return
    fi
    
    REQUIREMENTS_FILE="$SERVER_DIR/requirements.txt"
    
    if [ -f "$REQUIREMENTS_FILE" ]; then
        log "安装 Python 依赖..."
        
        # 始终运行安装以确保依赖最新
        $PYTHON_CMD -m pip install -r "$REQUIREMENTS_FILE" 2>&1 | tee -a "$LOG_FILE" || {
            warn "部分 Python 模块安装失败，尝试单独安装核心模块..."
            $PYTHON_CMD -m pip install rembg Pillow opencv-python-headless fastapi uvicorn playwright httpx 2>&1 | tee -a "$LOG_FILE" || warn "核心模块安装失败"
        }
        
        # 安装 Playwright 浏览器
        log "安装 Playwright 浏览器..."
        $PYTHON_CMD -m playwright install chromium 2>&1 | tee -a "$LOG_FILE" || warn "Playwright 浏览器安装失败"
        
        log "Python 依赖及浏览器安装完成 ✓"
    else
        warn "requirements.txt 不存在，跳过 Python 依赖"
    fi
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
    info "构建文件大小: $(du -sh "$DIST_DIR" | cut -f1)"
}

# 重启 Nginx
restart_nginx() {
    if ! command -v nginx &>/dev/null; then
        warn "Nginx 未安装，跳过"
        return
    fi
    
    log "检查 Nginx 配置..."
    
    # 测试配置
    if nginx -t 2>&1 | tee -a "$LOG_FILE"; then
        log "Nginx 配置正确 ✓"
    else
        error "Nginx 配置测试失败"
    fi
    
    # 重载配置
    log "重载 Nginx..."
    if systemctl reload nginx 2>&1 | tee -a "$LOG_FILE"; then
        log "Nginx 重载完成 ✓"
    else
        # 尝试直接重载
        nginx -s reload 2>&1 | tee -a "$LOG_FILE" || warn "Nginx 重载失败"
    fi
}

# 停止旧的后端服务
stop_backend() {
    log "停止旧的后端服务..."
    
    # 停止 Python 服务
    if pgrep -f "python3 server.py" > /dev/null; then
        pkill -f "python3 server.py" 2>/dev/null || true
        sleep 2
        log "Python 后端服务已停止"
    fi
}

# 启动后端服务
start_backend() {
    if [ ! -d "$SERVER_DIR" ]; then
        warn "后端目录不存在，跳过后端服务"
        return
    fi
    
    log "启动后端服务 (Python 3 + Playwright)..."
    
    cd "$SERVER_DIR"
    
    # 使用 start.sh 启动
    if [ -f "$SERVER_DIR/start.sh" ]; then
        bash "$SERVER_DIR/start.sh" 2>&1 | tee -a "$LOG_FILE"
    else
        # 直接启动
        PORT=8000
        nohup python3 server.py > /tmp/python-server.log 2>&1 &
        sleep 3
        
        # 验证
        if curl -s http://localhost:$PORT/health | grep -q "ok"; then
            log "后端服务启动成功 ✓"
        else
            warn "后端服务可能启动失败"
            tail -10 /tmp/python-server.log | tee -a "$LOG_FILE"
        fi
    fi
}

# 验证部署
verify_deployment() {
    log "验证部署..."
    
    # 检查前端
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:10010/ 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
        log "前端服务正常 ✓ (HTTP $http_code)"
    else
        warn "前端服务异常 (HTTP $http_code)"
    fi
    
    # 检查后端
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:10010/bg-api/health 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
        log "后端服务正常 ✓ (HTTP $http_code)"
    else
        warn "后端服务异常 (HTTP $http_code)"
    fi
    
    # 检查 Python 模块
    local PYTHON_CMD=""
    if command -v python3 &>/dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &>/dev/null && python --version 2>&1 | grep -q "Python 3"; then
        PYTHON_CMD="python"
    fi
    
    if [ -n "$PYTHON_CMD" ]; then
        $PYTHON_CMD -c "import rembg; import cv2; import PIL; from paddleocr import PaddleOCR" 2>/dev/null && log "Python 模块正常 ✓" || warn "部分 Python 模块缺失"
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
    echo ""
    echo "🔧 服务状态:"
    echo "   - 前端 (Nginx): 端口 10010"
    echo "   - 后端 (Python): 端口 8000"
    echo ""
    echo "📝 常用命令:"
    echo "   - 重启后端: $SERVER_DIR/stop.sh && $SERVER_DIR/start.sh"
    echo "   - 查看日志: tail -f /tmp/python-server.log"
    echo "========================================"
    echo ""
}

# 主流程
main() {
    echo "========================================" | tee "$LOG_FILE"
    echo "🚀 蓝胖子的口袋 - 一键部署脚本" | tee -a "$LOG_FILE"
    echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
    echo "========================================" | tee -a "$LOG_FILE"
    echo ""

    check_dependencies
    install_frontend_deps
    install_python_deps
    build_frontend
    restart_nginx
    stop_backend
    start_backend
    verify_deployment
    show_info

    echo "完成时间: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
    echo "========================================" | tee -a "$LOG_FILE"
}

main "$@"
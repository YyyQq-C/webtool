#!/bin/bash
set -e

echo "========================================"
echo "🖥️  服务器环境安装脚本"
echo "========================================"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"; exit 1; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}"; }
info() { echo -e "${BLUE}[$(date +'%H:%M:%S')] ℹ️  $1${NC}"; }

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    elif command -v yum &>/dev/null; then
        OS="centos"
    else
        error "无法检测操作系统类型"
    fi
    log "检测到操作系统: $OS $VERSION"
}

# 安装系统依赖（Ubuntu/Debian）
install_ubuntu_deps() {
    log "更新包管理器..."
    apt-get update -y

    log "安装系统依赖..."
    apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        nginx \
        tesseract-ocr \
        tesseract-ocr-chi-sim \
        tesseract-ocr-eng \
        libgl1-mesa-glx \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        libfontconfig1 \
        libgomp1 \
        ffmpeg \
        fonts-wqy-zenhei \
        fonts-wqy-microhei \
        2>&1 | tee -a /tmp/server-setup.log || warn "部分系统包安装失败"
    
    log "系统依赖安装完成 ✓"
}

# 安装系统依赖（CentOS/RHEL）
install_centos_deps() {
    log "更新包管理器..."
    yum update -y

    log "安装系统依赖..."
    yum install -y \
        curl \
        wget \
        git \
        gcc-c++ \
        nginx \
        tesseract \
        tesseract-langpack-chi-sim \
        tesseract-langpack-eng \
        mesa-libGL \
        glib2 \
        libSM \
        libXext \
        libXrender \
        fontconfig \
        libgomp \
        ffmpeg \
        wqy-zenhei-fonts \
        wqy-microhei-fonts \
        2>&1 | tee -a /tmp/server-setup.log || warn "部分系统包安装失败"
    
    log "系统依赖安装完成 ✓"
}

# 安装 Node.js
install_nodejs() {
    if command -v node &>/dev/null; then
        local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -ge 18 ]; then
            log "Node.js 已安装 ($(node -v))，跳过"
            return
        else
            warn "Node.js 版本过低 ($(node -v))，需要 >= 18，重新安装..."
        fi
    fi

    log "安装 Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs

    log "Node.js 安装完成: $(node -v)"
    log "npm 版本: $(npm -v)"
}

# 安装 Python 3.10+
install_python() {
    if command -v python3 &>/dev/null; then
        local py_version=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f2)
        if [ "$py_version" -ge 10 ]; then
            log "Python 已安装 ($(python3 --version))，跳过"
            return
        else
            warn "Python 版本过低 ($(python3 --version))，需要 >= 3.10，重新安装..."
        fi
    fi

    log "安装 Python 3.10+..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt-get install -y software-properties-common
        add-apt-repository -y ppa:deadsnakes/ppa
        apt-get update
        apt-get install -y python3.10 python3.10-venv python3.10-dev python3-pip
        update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1
    elif [ "$OS" = "centos" ]; then
        yum install -y python39 python39-pip python39-devel
    fi

    log "Python 安装完成: $(python3 --version)"
}

# 安装 Python 项目依赖
install_python_deps() {
    local PROJECT_DIR="$(cd "$(dirname "$BASH_SOURCE")" && pwd)"
    local REQUIREMENTS_FILE="$PROJECT_DIR/server/requirements.txt"

    if [ ! -f "$REQUIREMENTS_FILE" ]; then
        warn "requirements.txt 不存在: $REQUIREMENTS_FILE"
        return
    fi

    log "安装 Python 项目依赖..."
    python3 -m pip install --upgrade pip
    python3 -m pip install -r "$REQUIREMENTS_FILE" 2>&1 | tee -a /tmp/server-setup.log || warn "部分 Python 包安装失败"

    log "安装 Playwright 浏览器..."
    python3 -m playwright install chromium 2>&1 | tee -a /tmp/server-setup.log || warn "Playwright 安装失败"
    python3 -m playwright install-deps chromium 2>&1 | tee -a /tmp/server-setup.log || warn "Playwright 系统依赖安装失败"

    log "Python 项目依赖安装完成 ✓"
}

# 配置 Nginx
configure_nginx() {
    if ! command -v nginx &>/dev/null; then
        warn "Nginx 未安装，跳过配置"
        return
    fi

    local PROJECT_DIR="$(cd "$(dirname "$BASH_SOURCE")" && pwd)"
    local NGINX_CONF="/etc/nginx/sites-available/tool"
    local NGINX_LINK="/etc/nginx/sites-enabled/tool"

    log "配置 Nginx..."

    cat > "$NGINX_CONF" << EOF
server {
    listen 10010;
    server_name _;

    # 前端静态文件
    location / {
        root $PROJECT_DIR/dist;
        try_files \$uri \$uri/ /index.html;
        index index.html;
    }

    # 后端 API 代理
    location /bg-api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 25M;
    }
}
EOF

    # 启用配置
    ln -sf "$NGINX_CONF" "$NGINX_LINK"
    rm -f /etc/nginx/sites-enabled/default

    # 测试并重载
    nginx -t && systemctl reload nginx || warn "Nginx 重载失败"

    log "Nginx 配置完成 ✓"
}

# 验证安装
verify() {
    log "验证安装..."

    # Node.js
    command -v node &>/dev/null && log "✓ Node.js: $(node -v)" || warn "✗ Node.js 未安装"
    command -v npm &>/dev/null && log "✓ npm: $(npm -v)" || warn "✗ npm 未安装"

    # Python
    command -v python3 &>/dev/null && log "✓ Python: $(python3 --version)" || warn "✗ Python3 未安装"

    # Nginx
    command -v nginx &>/dev/null && log "✓ Nginx: $(nginx -v 2>&1)" || warn "✗ Nginx 未安装"

    # Tesseract
    command -v tesseract &>/dev/null && log "✓ Tesseract: $(tesseract --version | head -1)" || warn "✗ Tesseract 未安装"

    # Python 模块
    python3 -c "import rembg" 2>/dev/null && log "✓ rembg" || warn "✗ rembg 未安装"
    python3 -c "import cv2" 2>/dev/null && log "✓ opencv" || warn "✗ opencv 未安装"
    python3 -c "import PIL" 2>/dev/null && log "✓ Pillow" || warn "✗ Pillow 未安装"
    python3 -c "from paddleocr import PaddleOCR" 2>/dev/null && log "✓ PaddleOCR" || warn "✗ PaddleOCR 未安装"
    python3 -c "import pytesseract" 2>/dev/null && log "✓ pytesseract" || warn "✗ pytesseract 未安装"
}

# 主流程
main() {
    echo "========================================" | tee /tmp/server-setup.log
    echo "🖥️  服务器环境安装脚本" | tee -a /tmp/server-setup.log
    echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a /tmp/server-setup.log
    echo "========================================" | tee -a /tmp/server-setup.log
    echo ""

    detect_os

    # 安装系统依赖
    case "$OS" in
        ubuntu|debian)
            install_ubuntu_deps
            ;;
        centos|rhel|fedora)
            install_centos_deps
            ;;
        *)
            error "不支持的操作系统: $OS"
            ;;
    esac

    # 安装 Node.js
    install_nodejs

    # 安装 Python
    install_python

    # 安装 Python 项目依赖
    install_python_deps

    # 配置 Nginx
    configure_nginx

    # 验证
    echo ""
    verify

    echo ""
    echo "========================================"
    echo "🎉 服务器环境安装完成！"
    echo "========================================"
    echo "📋 日志文件: /tmp/server-setup.log"
    echo ""
    echo "下一步："
    echo "  1. 部署项目: bash script/deploy.sh"
    echo "  2. 启动后端: bash server/start.sh"
    echo "  3. 访问地址: http://localhost:10010"
    echo "========================================"
}

main "$@"

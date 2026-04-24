# 蓝胖子的口袋 - 图片工具箱 Docker 镜像
# 包含：前端静态文件 + Python FastAPI 后端 + Playwright

# ============================================
# Stage 1: 构建前端
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端依赖文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci --legacy-peer-deps || npm install

# 复制前端源码
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY eslint.config.js ./

# 构建生产版本
RUN npm run build

# ============================================
# Stage 2: 运行阶段 (Python + FastAPI)
# ============================================
FROM python:3.11-slim

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms/playwright \
    PORT=8000

WORKDIR /app

# 安装系统依赖 (Playwright 需要)
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    curl \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# 复制 Python 依赖文件
COPY server/requirements.txt ./requirements.txt

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 安装 Playwright 浏览器 (仅 chromium)
RUN playwright install chromium --with-deps

# 复制后端代码
COPY server/server.py ./server.py
COPY server/services/ ./services/
COPY server/script/ ./script/

# 从第一阶段复制前端构建产物
COPY --from=frontend-builder /app/frontend/dist ./dist

# 创建临时目录
RUN mkdir -p temp uploads temp-bg temp-watermark stats.json

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# 启动命令
CMD ["python", "server.py"]
# Docker 部署说明

## 快速开始

### 构建镜像

```bash
# 进入项目目录
cd /data/tool

# 构建镜像
docker build -f docker/Dockerfile -t webtool:latest .
```

### 运行容器

```bash
# 直接运行
docker run -d -p 10010:8000 --name webtool webtool:latest

# 或使用 docker-compose
cd docker
docker-compose up -d
```

### 访问

- 前端页面: http://localhost:10010
- API 接口: http://localhost:10010/api/*
- 健康检查: http://localhost:10010/health

## 镜像说明

### 构建阶段

1. **前端构建** (Node.js 20 Alpine)
   - 安装 npm 依赖
   - 执行 `npm run build`
   - 输出 dist 目录

2. **运行阶段** (Python 3.11 Slim)
   - 安装 Playwright + Chromium
   - 安装 Python 依赖 (FastAPI, rembg, OpenCV)
   - 复制前端 dist 目录
   - 启动 uvicorn 服务

### 镜像大小

预计镜像大小: ~1.5GB
- Chromium 浏览器: ~300MB
- rembg u2net 模型: ~167MB (首次运行时下载到 volume)
- Python 依赖: ~100MB
- 前端静态文件: ~20MB

### 数据卷

| 卷名 | 用途 |
|------|------|
| webtool-temp | 临时文件 (10分钟自动清理) |
| webtool-uploads | 上传文件 |
| webtool-playwright | Chromium 缓存 |
| webtool-u2net | rembg 模型缓存 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 8000 | 服务端口 |
| PYTHONUNBUFFERED | 1 | Python 输出不缓冲 |

## 常用命令

```bash
# 查看日志
docker logs -f webtool

# 进入容器
docker exec -it webtool bash

# 停止容器
docker stop webtool

# 重启容器
docker restart webtool

# 清理
docker-compose down -v  # 停止并删除容器和卷
```

## 注意事项

1. **首次启动较慢**: Playwright 需要初始化浏览器，rembg 需要下载模型
2. **内存需求**: 建议 2GB+ 内存
3. **端口冲突**: 确保 10010 端口未被占用
4. **生产部署**: 建议配置 nginx 反向代理和 HTTPS
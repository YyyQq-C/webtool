# 蓝胖子的口袋 - 图片工具箱

一个现代化的在线图片工具集合，基于 React + Vite + Tailwind CSS 构建，Node.js + Puppeteer 后端服务。

## 🎯 功能特性

### 图片格式转换
- ✅ 拖拽上传、批量转换
- ✅ 支持格式：JPG, JPEG, PNG, WebP, BMP, GIF, ICO, AVIF, TIFF, PDF
- ✅ 压缩率调节、PNG→JPG 白底填充
- ✅ 打包 ZIP 下载
- 🔒 **浏览器本地处理，保护隐私**

### 图片转 PDF
- ✅ 多张图片合并 PDF
- ✅ 拖拽排序
- ✅ 横版图片自动旋转
- 🔒 **浏览器本地处理，保护隐私**

### 图片去背景
- ✅ 双模式：浏览器端 + 服务器端
- ✅ 浏览器端：@imgly/background-removal，本地处理
- ✅ 服务器端：rembg (u2net 模型)，效果更好
- ✅ 支持 ICO、WebP 等多种格式

### 网页转 PDF
- ✅ Puppeteer 完整 JS 渲染
- ✅ 两种模式：完整页面 / 仅提取图片
- ✅ 图片筛选、排序、PDF 导出
- ✅ URL 缓存机制（10分钟）
- ✅ 横版图片自动旋转

### 图片去水印
- ✅ 画笔标记 + 智能检测
- ✅ OpenCV TELEA/NS 算法融合
- ✅ 支持 ICO、WebP、GIF、TIFF 等多种格式
- ✅ 边界平滑处理

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 19 + Vite 8 |
| 样式 | Tailwind CSS 4 |
| 路由 | React Router DOM |
| 打包 | JSZip + FileSaver.js |
| 去背景(浏览器) | @imgly/background-removal |
| 后端服务 | Node.js + Express + Puppeteer |
| 去背景(服务器) | Python + rembg (u2net) |
| 去水印 | Python + OpenCV |
| 反向代理 | Nginx |

## 📁 项目结构

```
/data/tool/
├── script/                    # 前端脚本
│   ├── build.sh              # 快速构建
│   ├── deploy.sh             # 一键部署
│   └── setup-nginx.sh        # Nginx 配置
├── server/                    # 后端服务
│   ├── script/               # Python 脚本
│   │   ├── inpaint.py        # 去水印
│   │   └── remove-bg.py      # 去背景
│   ├── node-server.js        # Node.js 主服务
│   ├── package.json
│   └── start.sh / stop.sh    # 服务管理
├── src/                       # 前端源码
│   ├── components/           # 组件
│   ├── pages/                # 页面
│   └── App.jsx / main.jsx
├── public/                    # 静态资源
├── dist/                      # 构建输出
└── index.html
```

## 🚀 快速开始

### 前端

```bash
cd /data/tool

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
./script/build.sh

# 一键部署（构建 + Nginx 重载）
./script/deploy.sh
```

### 后端服务

```bash
cd /data/tool/server

# 安装依赖
npm install

# 启动服务
./start.sh

# 停止服务
./stop.sh

# 健康检查
curl http://localhost:8000/health
```

### Nginx 配置

```bash
# 安装 Nginx 配置
./script/setup-nginx.sh

# 手动重载
sudo nginx -s reload
```

## 🔒 隐私保护

| 工具 | 处理方式 |
|------|----------|
| 图片格式转换 | 浏览器本地 ✅ |
| 图片转 PDF | 浏览器本地 ✅ |
| 图片去背景(浏览器端) | 浏览器本地 ✅ |
| 图片去背景(服务器端) | 服务器处理，10分钟自动清理 |
| 网页转 PDF | 服务器处理，10分钟自动清理 |
| 图片去水印 | 服务器处理，1分钟自动清理 |

## 📍 访问地址

- 前端：http://localhost:10010
- 后端 API：http://localhost:8000
- Nginx 代理：`/bg-api/` → `http://127.0.0.1:8000/`

## 📋 API 接口

| 接口 | 功能 |
|------|------|
| `/health` | 健康检查 |
| `/api/fetch-page` | 解析网页内容 |
| `/api/download-images` | 下载图片到服务器 |
| `/api/generate-images-pdf` | 生成图片 PDF |
| `/api/generate-pdf` | 生成完整网页 PDF |
| `/api/remove-background` | 去背景 |
| `/api/detect-watermark` | 智能检测水印 |
| `/api/remove-watermark` | 去除水印 |

## 📝 版本信息

- Node.js: v24.14.0
- Puppeteer Chrome: 127.0.6533.88
- rembg 模型: u2net (~167MB)

## 📄 License

MIT License
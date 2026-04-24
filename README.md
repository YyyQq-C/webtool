# 蓝胖子的口袋 - 图片工具箱

一个现代化的在线图片工具集合，基于 React + Vite + Tailwind CSS 构建，纯 Python (FastAPI + Playwright) 后端服务。

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
- ✅ 浏览器端：`@imgly/background-removal`，本地处理
- ✅ 服务器端：Python `rembg` (u2net 模型)，效果更好
- ✅ 支持 ICO、WebP 等多种格式

### 图片裁剪
- ✅ **支持自由选择范围方式（拖拽式）**，操作更直觉
- ✅ 预设 1:1, 4:3, 16:9, 3:2 等多种比例锁定
- ✅ 支持 360 度任意角度旋转调节
- ✅ **画布缩放和平移**：支持通过滚轮缩放画布，Alt + 拖拽平移，方便精准细节处理
- 🔒 **浏览器本地处理，保护隐私**

### 分辨率调整 (Resizer)
- ✅ 批量修改图片宽度与高度
- ✅ 支持锁定长宽比，防止图片拉伸变形
- ✅ 高质量 Canvas 缩放算法
- ✅ 批量处理后可打包 ZIP 下载
- 🔒 **浏览器本地处理，保护隐私**

### 网页转 PDF
- ✅ Python Playwright 无头浏览器完整渲染
- ✅ 两种模式：完整页面 / 仅提取图片
- ✅ 图片筛选、排序、PDF 导出
- ✅ URL 缓存机制（10分钟）
- ✅ 横版图片自动旋转

### 图片去水印
- ✅ 画笔标记 + 智能检测
- ✅ OpenCV TELEA/NS 算法融合
- ✅ 支持 ICO、WebP、GIF、TIFF 等带有透明通道的多种格式
- ✅ 边界平滑处理

## ⚙️ 环境要求

- **前端构建 (Vite Project)**: 
  - 最低支持: Node.js `>= 18.0.0`
  - 推荐版本: Node.js `>= 20.0.0`
  - 包管理工具: `npm` (推荐) 或 `pnpm`
- **后端服务 (FastAPI)**: 
  - 最低支持: Python `>= 3.10` (因依赖的部分模型库在旧版可能有兼容问题)
  - 推荐版本: Python `3.11` 或 `3.12` (测试于 `3.13` 亦稳定运行)
  - 依赖：`pip >= 22.0`

> **注意：** 
> 后端服务强依赖于 `Playwright` 浏览器及 `OpenCV` 计算库，在云服务器等无图形界面环境首次部署时将会自动通过 `playwright install chromium` 及依赖下载脚本安装底层组件。如果你通过服务器去背景（`rembg` 模型会占用部分显存/内存），请确保服务器内存在 2G 以上。

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 19 + Vite 8 |
| 样式 | Tailwind CSS 4 |
| 路由 | React Router DOM |
| 打包 | JSZip + FileSaver.js |
| 去背景(浏览器) | @imgly/background-removal |
| 后端服务 | Python 3 + FastAPI + Uvicorn + Playwright |
| 去背景(服务器) | Python + rembg (u2net) |
| 去水印 | Python + OpenCV |
| 反向代理 | Nginx |

## 📁 项目结构

```
/data/tool/
├── script/                    # 部署运维自动化脚本
│   ├── build.sh               # 快速构建
│   ├── deploy.sh              # 一键自动化部署更新
│   └── setup-nginx.sh         # Nginx 配置
├── server/                    # 后端服务(纯 Python 架构)
│   ├── server.py              # FastAPI 核心入口与路由集合
│   ├── services/              # 解耦的核心业务模块
│   │   ├── downloader.py      # 图片下载缓存服务
│   │   ├── pdf_maker.py       # PDF 合并转换引擎
│   │   └── scraper.py         # Playwright 网页抓取服务
│   ├── script/                # 高开销重计算独立工作模块
│   │   ├── inpaint.py         # opencv 去水印模块
│   │   └── remove_bg.py       # rembg 去背景模块
│   ├── requirements.txt       # Python 环境依赖清单
│   └── start.sh / stop.sh     # Python 后端守护管理
├── src/                       # 前端源码
│   ├── components/            # 独立复用组件库
│   ├── pages/                 # 各个工具页面视图
│   │   ├── Home.jsx           # 导航首页
│   │   ├── ImageCropper.jsx   # 裁剪工具
│   │   └── ImageResizer.jsx   # 分辨率调整工具
│   └── App.jsx / main.jsx
│   └── utils/                 # 工具函数类
│       └── cropImage.js       # 裁剪辅助函数库
├── public/                    # 静态资源
├── dist/                      # 构建输出(需编译)
└── index.html
```

## 🚀 快速开始

### 前端开发

```bash
cd /data/tool

# 安装 Node 依赖
npm install

# 启动本地热重载开发服务
npm run dev

# 编译打包静态文件
./script/build.sh

# 一键自动化部署（编译 + 装 Python 依赖 + 重启后端 + Nginx 重载）
./script/deploy.sh
```

### 后端服务

首次运行后端前需确保 Python 环境以及无头浏览器依赖。由于使用了 FastAPI 的生命周期挂载及进程内协程调度，启动也做了专门封装。

```bash
cd /data/tool/server

# 直接使用预设脚本智能启动和配置所有前后置依赖（自动判断并安装 python 甚至 playwrignt）
bash ./start.sh

# （可选）手动安装环境测试依赖的参考命令：
# pip install -r requirements.txt
# playwright install chromium 

# 优雅停止后端服务
bash ./stop.sh

# 控制台健康检查
curl http://localhost:8000/health
```

### Nginx 配置（发布时）

```bash
# 安装 Nginx 反向代理配置至系统并软链接
./script/setup-nginx.sh

# 重新载入以使修改生效
sudo nginx -s reload
```

## 🔒 隐私保护

| 工具 | 处理方式 | 安全性 |
|------|----------|--------|
| 图片格式转换 | 浏览器本地 ✅ | 原始图绝不上云 |
| 图片转 PDF | 浏览器本地 ✅ | 离屏渲染即拿即走 |
| 图片去背景(浏览器端) | 浏览器本地 ✅ | 模型存于缓存不出站 |
| 图片去背景(服务器端) | 服务器内存处理 | 前端回传结果后立马销毁无痕迹 |
| 图片裁剪 | 浏览器本地 ✅ | 纯本地 Canvas 处理 |
| 分辨率调整 | 浏览器本地 ✅ | 纯本地 Canvas 处理 |
| 网页转 PDF | 服务器代理处理 | Session 临时会话 10 分钟自动全数清理 |
| 图片去水印 | 服务器代理处理 | 实时执行完毕即刻回收 unlink |

## 📍 访问地址

- **默认前端绑定端口**：`http://localhost:10010`
- **默认后端内部 API**：`http://localhost:8000`
- **线上发布 Nginx 代理规则约定**：前端请求路径中 `/bg-api/` 项将自动反代至上方的 `http://127.0.0.1:8000/`

## 📋 API 接口目录

| 接口路线 | 请求方式 | 核心功能 |
|------|------|------|
| `/health` | GET | 服务健康检查探针测试 |
| `/api/fetch-page` | GET | 使用 Playwright 拦截渲染网页 DOM 结构提取相关图片集 |
| `/api/download-images` | POST | 允许跨域在服务端本地转存获取图片流并建立短期内资源复用 Session 缓存 |
| `/api/generate-images-pdf` | POST | 拼接组装指定图片缓存生成跨页自适应的 PDF 文件流 |
| `/api/generate-pdf` | POST | 获取网页截屏长图导出或者排版优化重写注入 CSS 导出 A4 大小 PDF |
| `/api/remove-background` | POST | 上传图片阻塞调用后台模型层进行语义分割去掉不包含的主体背景层并返回含有通道的新图像 |
| `/api/detect-watermark` | POST | 融合 OpenCV 颜色、边缘检测去标记探测水印区块的图层蒙版 |
| `/api/remove-watermark` | POST | 挂起 OpenCV 基于蒙版与周围像素的 TELEA/NS 修复算法彻底抹除特定噪点和水印痕迹 |

## 📝 系统组件与模型版本

- Node.js: 最低 `18.0.0` (推荐 `20.x`)
- Python: 最低 `3.10.0` (推荐 `3.12+`)
- Chromium: 跟随 `playwright==1.49.1` 最新主版本驱动下行
- 核心算法分析模型: `u2net` 神经网络 (~167MB，在初次启动对应服务路由时会自动执行并拉取)

## 📄 License

MIT License
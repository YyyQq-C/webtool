# 工具箱项目结构

```
/data/tool/
├── src/                          # 前端源码
│   ├── components/               # 组件
│   │   ├── UploadArea.jsx        # 通用上传组件
│   │   ├── ImageDropzone.jsx     # 旧拖拽上传组件（保留兼容）
│   │   ├── ImagePreview.jsx      # 图片预览组件
│   │   ├── Footer.jsx            # 全局页脚
│   │   └── ImageEditor.jsx       # 图片编辑器
│   ├── pages/                    # 页面
│   │   ├── Home.jsx              # 工具列表首页
│   │   ├── ImageConverter.jsx    # 图片格式转换
│   │   ├── ImageToPdf.jsx        # 图片转PDF
│   │   └── ImageBgRemover.jsx    # 图片去背景
│   ├── App.jsx                   # 主应用
│   ├── main.jsx                  # 入口文件
│   └── index.css                 # 全局样式
├── server/                       # 后端服务
│   ├── main.py                   # FastAPI 应用
│   ├── requirements.txt          # Python 依赖
│   ├── start.sh                  # 启动脚本
│   └── stop.sh                   # 停止脚本
├── public/                       # 静态资源
│   ├── beian.png                 # 备案图标
│   ├── image-cover.png           # 格式转换图标
│   └── jpg2pdf.png               # 转PDF图标
├── dist/                         # 构建输出（自动生成）
├── nginx.conf.template           # Nginx 配置模板
├── setup-nginx.sh                # Nginx 配置安装脚本
├── deploy.sh                     # 一键部署脚本
├── build.sh                      # 快速构建脚本
├── package.json                  # Node.js 依赖
├── vite.config.js                # Vite 配置
├── tailwind.config.js            # Tailwind 配置
└── postcss.config.js             # PostCSS 配置
```

## 快速开始

### 首次部署
```bash
bash /data/tool/deploy.sh
```

### 日常更新前端
```bash
bash /data/tool/build.sh
```

### 启动后端服务
```bash
bash /data/tool/server/start.sh
```

### 停止后端服务
```bash
bash /data/tool/server/stop.sh
```

### 安装 Nginx 配置
```bash
bash /data/tool/setup-nginx.sh
```

## 服务端口
- **10010**: Nginx (前端 + 后端代理)
- **8000**: 后端 API (uvicorn/FastAPI)
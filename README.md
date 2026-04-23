# 工具箱 - 图片格式转换工具

一个现代化的前端工具集合，基于 React + Vite + Tailwind CSS 构建。

## 功能特性

### 图片格式转换工具
- ✅ 拖拽上传图片
- ✅ 批量转换图片格式
- ✅ 支持格式：JPEG, PNG, WebP, BMP, GIF
- ✅ 全局格式设置或单独指定每张图片格式
- ✅ 打包下载所有转换后的图片（ZIP格式）
- ✅ 自动清理：下载完成10分钟后自动删除资源
- ✅ 本地处理，无需上传到服务器，保护隐私

## 技术栈

- **框架**: React 19
- **构建工具**: Vite 8
- **样式**: Tailwind CSS 4
- **路由**: React Router DOM
- **打包**: JSZip
- **文件保存**: FileSaver.js

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 项目结构

```
/data/tool/
├── src/
│   ├── components/
│   │   ├── ImageDropzone.jsx    # 图片拖拽上传组件
│   │   └── ImagePreview.jsx     # 图片预览组件
│   ├── pages/
│   │   ├── Home.jsx             # 工具列表首页
│   │   └── ImageConverter.jsx   # 图片格式转换页面
│   ├── App.jsx                  # 主应用组件
│   ├── main.jsx                 # 入口文件
│   └── index.css                # Tailwind CSS 入口
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

## 使用说明

1. 访问首页，点击"图片格式转换"工具
2. 拖拽或点击上传区域选择图片文件
3. 使用全局格式下拉框批量设置所有图片格式，或单独设置每张图片的格式
4. 点击"开始转换"按钮进行格式转换
5. 转换完成后，点击"打包下载"下载所有转换后的图片
6. 下载完成10分钟后，本次所有资源将自动清理

## 隐私保护

所有图片处理均在浏览器本地完成，不会上传到任何服务器，保护您的隐私安全。
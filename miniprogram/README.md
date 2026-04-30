# 蓝胖子的口袋 - 小程序版

基于 uni-app 开发的微信小程序版本。

## 项目结构

```
/data/tool/miniprogram/
├── pages/               # 页面目录
│   ├── index/           # 首页（工具列表）
│   ├── converter/       # 图片格式转换
│   ├── cropper/         # 图片裁剪
│   ├── compress/        # 图片压缩
│   ├── qrcode/          # 二维码工具
│   ├── watermark/       # 图片加水印
│   ├── splice/          # 图片拼接
│   ├── gif/             # GIF分帧提取
│   └── about/           # 关于页面
├── static/              # 静态资源
│   ├── logo.png         # Logo（需添加）
│   ├── tab-tools.png    # TabBar图标（需添加）
│   └── tab-tools-active.png
│   ├── tab-about.png
│   └── tab-about-active.png
├── components/          # 公共组件
├── utils/               # 工具函数
├── App.vue              # 应用入口
├── main.js              # 入口文件
├── manifest.json        # 应用配置
├── pages.json           # 页面路由配置
└── uni.scss             # 全局样式变量
```

## 配色方案（小程序专用）

**清新风格：**
- 主背景：`#F5F7FA`（浅灰蓝）
- 卡片背景：`#FFFFFF`
- 主色调：`#10B981`（柔和绿色）
- 文字主色：`#1F2937`（深灰）
- 文字次色：`#6B7280`（中灰）
- 边框颜色：`#E5E7EB`

**与 Web 版的区别：**
- Web 版深色背景 → 小程序浅色背景
- Web 版复杂卡片 → 小程序简化卡片
- 更适合手机屏幕的触控体验

## 功能实现

### ✅ 已实现（小程序原生支持）
- 图片选择
- 图片压缩 (`uni.compressImage`)
- 图片裁剪（使用 `uni.editImage`）
- 保存到相册

### ⚠️ 需要额外处理
- 图片格式转换（需要 Canvas）
- 二维码生成/解析（需要 Canvas 或第三方库）
- 图片水印合成（需要 Canvas）
- 图片拼接（需要 Canvas）
- GIF 分帧（需要第三方库）

## 开发指南

### 1. 添加图标

需要在 `static/` 目录添加以下图标：
- `logo.png` - 应用 Logo（建议 200x200）
- `tab-tools.png` - 工具 TabBar 图标（40x40）
- `tab-tools-active.png` - 工具选中状态图标
- `tab-about.png` - 关于 TabBar 图标
- `tab-about-active.png` - 关于选中状态图标

### 2. 开发运行

使用 HBuilderX 或 VS Code + uni-app 插件：

1. 用 HBuilderX 打开 `/data/tool/miniprogram` 目录
2. 运行 → 运行到小程序模拟器 → 微信开发者工具
3. 或运行到浏览器预览

### 3. 发布

在 HBuilderX 中：
- 发行 → 小程序-微信
- 需要在 `manifest.json` 中配置微信小程序 AppID

## 注意事项

1. **Canvas 功能限制**
   小程序的 Canvas API 与 Web 不同，需要使用 uni-app 的 canvas 组件。

2. **本地处理限制**
   部分功能（如格式转换、GIF分帧）在小程序端无法完全本地实现，可能需要：
   - 使用第三方小程序插件
   - 调用服务器 API 处理

3. **文件系统限制**
   小程序无法直接操作文件系统，需要使用 `uni.saveFile` 和 `uni.getFileInfo`。

## 与 Web 版联动

小程序可以作为 Web 版的轻量入口，复杂功能可跳转到 Web 版处理：
```javascript
// 在需要复杂处理时提示用户
uni.showModal({
  title: '提示',
  content: '该功能需要使用完整版，是否跳转到网页版？',
  success: (res) => {
    if (res.confirm) {
      // 复制网址供用户打开
      uni.setClipboardData({
        data: 'http://tool.woyoai.com/'
      })
    }
  }
})
```

## 后续优化

1. 添加更多工具页面
2. 实现 Canvas 绘制功能
3. 添加图片预览和编辑组件
4. 优化 UI 交互体验
5. 添加使用统计功能
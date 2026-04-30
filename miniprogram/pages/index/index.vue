<template>
  <view class="container">
    <!-- 头部标语 -->
    <view class="header">
      <image class="logo" src="/static/logo.png" mode="aspectFit"></image>
      <view class="title">蓝胖子的口袋</view>
      <view class="subtitle">简单、安全、高效</view>
    </view>

    <!-- 工具分类 -->
    <view class="section">
      <view class="section-title">图片处理</view>
      
      <!-- 工具网格 -->
      <view class="tool-grid">
        <view 
          class="tool-card" 
          v-for="(tool, index) in imageTools" 
          :key="index"
          @tap="navigateTo(tool.path)"
        >
          <view class="tool-icon" :style="{ backgroundColor: tool.color }">
            <text class="tool-emoji">{{ tool.emoji }}</text>
          </view>
          <view class="tool-name">{{ tool.name }}</view>
          <view class="tool-desc">{{ tool.desc }}</view>
          <view class="tool-tag" v-if="tool.local">
            <text class="tag-text">本地处理</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 二维码工具 -->
    <view class="section">
      <view class="section-title">二维码</view>
      <view class="tool-grid single">
        <view class="tool-card" @tap="navigateTo('/pages/qrcode/qrcode')">
          <view class="tool-icon" style="background-color: #14B8A6;">
            <text class="tool-emoji">📱</text>
          </view>
          <view class="tool-name">二维码工具</view>
          <view class="tool-desc">生成或解析二维码</view>
          <view class="tool-tag">
            <text class="tag-text">本地处理</text>
          </view>
        </view>
      </view>
    </view>

    <!-- GIF工具 -->
    <view class="section">
      <view class="section-title">动图处理</view>
      <view class="tool-grid single">
        <view class="tool-card" @tap="navigateTo('/pages/gif/gif')">
          <view class="tool-icon" style="background-color: #8B5CF6;">
            <text class="tool-emoji">🎬</text>
          </view>
          <view class="tool-name">GIF分帧提取</view>
          <view class="tool-desc">拆分GIF为单帧图片</view>
          <view class="tool-tag">
            <text class="tag-text">本地处理</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部信息 -->
    <view class="footer">
      <view class="footer-text">所有图片处理均在本地完成</view>
      <view class="footer-text">保护您的隐私安全</view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      imageTools: [
        {
          name: '格式转换',
          desc: '批量转换图片格式',
          emoji: '🔄',
          color: '#3B82F6',
          path: '/pages/converter/converter',
          local: true
        },
        {
          name: '图片裁剪',
          desc: '自由裁剪比例裁剪',
          emoji: '✂️',
          color: '#F97316',
          path: '/pages/cropper/cropper',
          local: true
        },
        {
          name: '图片压缩',
          desc: '调整质量压缩图片',
          emoji: '📦',
          color: '#84CC16',
          path: '/pages/compress/compress',
          local: true
        },
        {
          name: '图片加水印',
          desc: '添加文字图片水印',
          emoji: '🏷️',
          color: '#F59E0B',
          path: '/pages/watermark/watermark',
          local: true
        },
        {
          name: '图片拼接',
          desc: '多图拼接合成',
          emoji: '🧩',
          color: '#8B5CF6',
          path: '/pages/splice/splice',
          local: true
        }
      ]
    }
  },
  methods: {
    navigateTo(path) {
      uni.navigateTo({
        url: path
      })
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20rpx;
  background-color: #F5F7FA;
  min-height: 100vh;
}

/* 头部 */
.header {
  text-align: center;
  padding: 40rpx 0 30rpx;
}

.logo {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 16rpx;
}

.title {
  font-size: 44rpx;
  font-weight: bold;
  color: #1F2937;
  margin-bottom: 8rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #6B7280;
}

/* 分类区块 */
.section {
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1F2937;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

/* 工具网格 */
.tool-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tool-grid.single {
  display: block;
}

/* 工具卡片 - 小程序专用清新风格 */
.tool-card {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  width: calc(50% - 8rpx);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  transition: all 0.2s;
}

.tool-grid.single .tool-card {
  width: 100%;
}

.tool-card:active {
  transform: scale(0.98);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.08);
}

/* 工具图标 */
.tool-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.tool-emoji {
  font-size: 40rpx;
}

/* 工具名称 */
.tool-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #1F2937;
  margin-bottom: 8rpx;
}

/* 工具描述 */
.tool-desc {
  font-size: 24rpx;
  color: #6B7280;
  margin-bottom: 12rpx;
}

/* 本地处理标签 */
.tool-tag {
  background-color: #ECFDF5;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  border: 1rpx solid #A7F3D0;
}

.tag-text {
  font-size: 20rpx;
  color: #10B981;
}

/* 底部 */
.footer {
  text-align: center;
  padding: 30rpx 0;
}

.footer-text {
  font-size: 24rpx;
  color: #9CA3AF;
  margin-bottom: 8rpx;
}
</style>
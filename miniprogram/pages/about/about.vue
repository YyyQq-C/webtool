<template>
  <view class="container">
    <!-- Logo -->
    <view class="logo-section">
      <image class="logo" src="/static/logo.png" mode="aspectFit"></image>
      <view class="app-name">蓝胖子的口袋</view>
      <view class="app-version">v1.0.0</view>
    </view>

    <!-- 简介 -->
    <view class="intro-section">
      <view class="intro-text">
        简单、安全、高效的图片工具箱
      </view>
      <view class="intro-sub">
        所有图片处理均在本地完成，保护您的隐私
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="features-section">
      <view class="section-title">核心功能</view>
      
      <view class="feature-item">
        <view class="feature-icon">🔒</view>
        <view class="feature-content">
          <view class="feature-name">本地处理</view>
          <view class="feature-desc">图片不上云，隐私有保障</view>
        </view>
      </view>
      
      <view class="feature-item">
        <view class="feature-icon">⚡</view>
        <view class="feature-content">
          <view class="feature-name">高效便捷</view>
          <view class="feature-desc">一键处理，即刻下载</view>
        </view>
      </view>
      
      <view class="feature-item">
        <view class="feature-icon">🎨</view>
        <view class="feature-content">
          <view class="feature-name">多种工具</view>
          <view class="feature-desc">格式转换、裁剪、压缩等</view>
        </view>
      </view>
      
      <view class="feature-item">
        <view class="feature-icon">🆓</view>
        <view class="feature-content">
          <view class="feature-name">完全免费</view>
          <view class="feature-desc">无需注册，免费使用</view>
        </view>
      </view>
    </view>

    <!-- 技术支持 -->
    <view class="tech-section">
      <view class="section-title">技术支持</view>
      
      <view class="tech-item" @tap="copyEmail">
        <view class="tech-label">邮箱</view>
        <view class="tech-value">support@woyoai.com</view>
      </view>
      
      <view class="tech-item" @tap="openWebsite">
        <view class="tech-label">网站</view>
        <view class="tech-value">tool.woyoai.com</view>
      </view>
    </view>

    <!-- 版权信息 -->
    <view class="footer">
      <view class="footer-text">© 2026 蓝胖子的口袋</view>
      <view class="footer-text">Made with ❤️</view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    copyEmail() {
      uni.setClipboardData({
        data: 'support@woyoai.com',
        success: () => {
          uni.showToast({ title: '邮箱已复制', icon: 'success' })
        }
      })
    },
    
    openWebsite() {
      // 小程序内打开网页需要 web-view 组件或复制链接
      uni.setClipboardData({
        data: 'http://tool.woyoai.com/',
        success: () => {
          uni.showToast({ title: '网址已复制', icon: 'success' })
        }
      })
    }
  }
}
</script>

<style scoped>
.container {
  padding: 40rpx 20rpx;
  min-height: 100vh;
  background-color: #F5F7FA;
}

/* Logo 区域 */
.logo-section {
  text-align: center;
  padding: 40rpx 0;
}

.logo {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 24rpx;
}

.app-name {
  font-size: 44rpx;
  font-weight: bold;
  color: #1F2937;
  margin-bottom: 8rpx;
}

.app-version {
  font-size: 24rpx;
  color: #6B7280;
}

/* 简介 */
.intro-section {
  text-align: center;
  padding: 24rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
}

.intro-text {
  font-size: 30rpx;
  color: #1F2937;
  margin-bottom: 8rpx;
}

.intro-sub {
  font-size: 24rpx;
  color: #6B7280;
}

/* 功能列表 */
.features-section {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #1F2937;
  margin-bottom: 16rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #E5E7EB;
}

.feature-item:last-child {
  border-bottom: none;
}

.feature-icon {
  width: 60rpx;
  height: 60rpx;
  font-size: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-content {
  flex: 1;
  padding-left: 16rpx;
}

.feature-name {
  font-size: 28rpx;
  color: #1F2937;
  margin-bottom: 4rpx;
}

.feature-desc {
  font-size: 24rpx;
  color: #6B7280;
}

/* 技术支持 */
.tech-section {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.tech-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #E5E7EB;
}

.tech-item:last-child {
  border-bottom: none;
}

.tech-item:active {
  background-color: #F9FAFB;
}

.tech-label {
  font-size: 26rpx;
  color: #6B7280;
}

.tech-value {
  font-size: 26rpx;
  color: #10B981;
}

/* 版权信息 */
.footer {
  text-align: center;
  padding: 40rpx 0;
}

.footer-text {
  font-size: 24rpx;
  color: #9CA3AF;
  margin-bottom: 8rpx;
}
</style>
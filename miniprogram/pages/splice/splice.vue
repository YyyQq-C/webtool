<template>
  <view class="container">
    <!-- 上传区域 -->
    <view class="upload-area" @tap="chooseImages">
      <view class="upload-icon">🧩</view>
      <view class="upload-text">选择多张图片</view>
      <view class="upload-tip">最多选择9张图片进行拼接</view>
    </view>

    <!-- 图片列表 -->
    <view class="image-list" v-if="images.length > 0">
      <view class="list-header">
        <text class="list-title">已选择 {{ images.length }} 张图片</text>
        <view class="sort-tip">拖拽排序（长按拖动）</view>
      </view>
      
      <scroll-view class="image-scroll" scroll-x>
        <view class="image-row">
          <view 
            class="image-item"
            v-for="(img, index) in images"
            :key="index"
          >
            <image class="item-image" :src="img.path" mode="aspectFill"></image>
            <view class="item-index">{{ index + 1 }}</view>
            <view class="remove-btn" @tap="removeImage(index)">✕</view>
          </view>
          <view class="add-more" @tap="chooseImages">
            <text class="add-text">+</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 拼接设置 -->
    <view class="settings-section" v-if="images.length > 1">
      <view class="section-title">拼接方式</view>
      
      <view class="mode-grid">
        <view 
          class="mode-item"
          :class="{ active: spliceMode === 'horizontal' }"
          @tap="setSpliceMode('horizontal')"
        >
          <view class="mode-icon">→</view>
          <text class="mode-text">横向拼接</text>
        </view>
        <view 
          class="mode-item"
          :class="{ active: spliceMode === 'vertical' }"
          @tap="setSpliceMode('vertical')"
        >
          <view class="mode-icon">↓</view>
          <text class="mode-text">纵向拼接</text>
        </view>
        <view 
          class="mode-item"
          :class="{ active: spliceMode === 'grid' }"
          @tap="setSpliceMode('grid')"
        >
          <view class="mode-icon">▣</view>
          <text class="mode-text">网格拼接</text>
        </view>
      </view>
      
      <!-- 间距设置 -->
      <view class="gap-row">
        <text class="gap-label">图片间距</text>
        <slider 
          :value="gap"
          @change="onGapChange"
          min="0"
          max="20"
          show-value
          activeColor="#10B981"
        />
      </view>
      
      <!-- 背景色设置 -->
      <view class="bg-row">
        <text class="bg-label">背景颜色</text>
        <view class="bg-options">
          <view 
            class="bg-item"
            :class="{ active: bgColor === color }"
            :style="{ backgroundColor: color }"
            v-for="(color, index) in bgColors"
            :key="index"
            @tap="setBgColor(color)"
          ></view>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions" v-if="images.length > 1">
      <button class="btn-primary" @tap="spliceImages">开始拼接</button>
      <button class="btn-secondary" @tap="clearAll">清空全部</button>
    </view>

    <!-- 结果展示 -->
    <view class="result-section" v-if="resultSrc">
      <view class="section-title">拼接结果</view>
      <image class="result-image" :src="resultSrc" mode="widthFix"></image>
      <button class="btn-save" @tap="saveImage">保存到相册</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      images: [],
      spliceMode: 'horizontal',
      gap: 0,
      bgColor: '#FFFFFF',
      bgColors: ['#FFFFFF', '#F3F4F6', '#1F2937', '#10B981', '#3B82F6'],
      resultSrc: ''
    }
  },
  methods: {
    chooseImages() {
      const remaining = 9 - this.images.length
      if (remaining <= 0) {
        uni.showToast({ title: '最多选择9张图片', icon: 'none' })
        return
      }
      
      uni.chooseImage({
        count: remaining,
        sizeType: ['original'],
        sourceType: ['album'],
        success: (res) => {
          const newImages = res.tempFilePaths.map(path => ({
            path,
            name: path.split('/').pop()
          }))
          this.images = [...this.images, ...newImages]
        }
      })
    },
    
    removeImage(index) {
      this.images.splice(index, 1)
    },
    
    setSpliceMode(mode) {
      this.spliceMode = mode
    },
    
    onGapChange(e) {
      this.gap = e.detail.value
    },
    
    setBgColor(color) {
      this.bgColor = color
    },
    
    clearAll() {
      this.images = []
      this.resultSrc = ''
    },
    
    async spliceImages() {
      uni.showLoading({ title: '拼接中...' })
      
      // 小程序图片拼接需要 canvas
      // 这里简化处理
      uni.hideLoading()
      
      uni.showToast({ 
        title: '小程序暂不支持本地拼接', 
        icon: 'none',
        duration: 2000
      })
    },
    
    saveImage() {
      if (!this.resultSrc) return
      
      uni.saveImageToPhotosAlbum({
        filePath: this.resultSrc,
        success: () => {
          uni.showToast({ title: '已保存到相册', icon: 'success' })
        },
        fail: () => {
          uni.showToast({ title: '保存失败', icon: 'error' })
        }
      })
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20rpx;
  min-height: 100vh;
}

/* 上传区域 */
.upload-area {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 60rpx;
  text-align: center;
  border: 2rpx dashed #E5E7EB;
  margin-bottom: 24rpx;
}

.upload-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.upload-text {
  font-size: 32rpx;
  color: #1F2937;
  margin-bottom: 8rpx;
}

.upload-tip {
  font-size: 24rpx;
  color: #6B7280;
}

/* 图片列表 */
.image-list {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.list-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #1F2937;
}

.sort-tip {
  font-size: 22rpx;
  color: #6B7280;
}

.image-scroll {
  white-space: nowrap;
}

.image-row {
  display: inline-flex;
  gap: 12rpx;
}

.image-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.item-image {
  width: 100%;
  height: 100%;
}

.item-index {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  width: 32rpx;
  height: 32rpx;
  background-color: #10B981;
  color: #FFFFFF;
  border-radius: 50%;
  font-size: 20rpx;
  text-align: center;
  line-height: 32rpx;
}

.remove-btn {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 32rpx;
  height: 32rpx;
  background-color: rgba(0,0,0,0.5);
  color: #FFFFFF;
  border-radius: 50%;
  font-size: 20rpx;
  text-align: center;
  line-height: 32rpx;
}

.add-more {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background-color: #F3F4F6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-text {
  font-size: 60rpx;
  color: #6B7280;
}

/* 设置区域 */
.settings-section {
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

/* 拼接方式 */
.mode-grid {
  display: flex;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.mode-item {
  flex: 1;
  padding: 24rpx;
  background-color: #F3F4F6;
  border-radius: 12rpx;
  text-align: center;
  border: 2rpx solid transparent;
}

.mode-item.active {
  background-color: #ECFDF5;
  border-color: #10B981;
}

.mode-icon {
  font-size: 40rpx;
  color: #1F2937;
  margin-bottom: 8rpx;
}

.mode-text {
  font-size: 24rpx;
  color: #6B7280;
}

.mode-item.active .mode-text {
  color: #10B981;
}

/* 间距设置 */
.gap-row, .bg-row {
  padding: 8rpx 0;
}

.gap-label, .bg-label {
  font-size: 26rpx;
  color: #6B7280;
  margin-bottom: 8rpx;
}

.bg-options {
  display: flex;
  gap: 12rpx;
  margin-top: 8rpx;
}

.bg-item {
  width: 48rpx;
  height: 48rpx;
  border-radius: 8rpx;
  border: 2rpx solid #E5E7EB;
}

.bg-item.active {
  border-color: #10B981;
  border-width: 4rpx;
}

/* 操作按钮 */
.actions {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.btn-primary {
  flex: 1;
  background-color: #10B981;
  color: #FFFFFF;
  border-radius: 12rpx;
  font-size: 30rpx;
}

.btn-secondary {
  flex: 1;
  background-color: #F3F4F6;
  color: #374151;
  border-radius: 12rpx;
  font-size: 30rpx;
}

/* 结果展示 */
.result-section {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
}

.result-image {
  width: 100%;
  margin-bottom: 24rpx;
}

.btn-save {
  background-color: #3B82F6;
  color: #FFFFFF;
  border-radius: 12rpx;
  font-size: 30rpx;
}
</style>
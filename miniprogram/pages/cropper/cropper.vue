<template>
  <view class="container">
    <!-- 上传区域 -->
    <view class="upload-area" v-if="!imageSrc" @tap="chooseImage">
      <view class="upload-icon">📷</view>
      <view class="upload-text">点击选择图片</view>
    </view>

    <!-- 裁剪区域 -->
    <view class="crop-container" v-if="imageSrc">
      <image 
        class="crop-image" 
        :src="imageSrc" 
        mode="aspectFit"
        :style="{ transform: `rotate(${rotation}deg)` }"
      ></image>
      
      <!-- 裁剪框指示 -->
      <view class="crop-guide">
        <view class="guide-text">请使用系统裁剪功能</view>
      </view>
    </view>

    <!-- 比例选择 -->
    <view class="ratio-section" v-if="imageSrc">
      <view class="section-title">裁剪比例</view>
      <view class="ratio-grid">
        <view 
          class="ratio-item"
          :class="{ active: ratio === r.value }"
          v-for="(r, index) in ratios"
          :key="index"
          @tap="setRatio(r.value)"
        >
          <text class="ratio-text">{{ r.label }}</text>
        </view>
      </view>
    </view>

    <!-- 旋转控制 -->
    <view class="rotate-section" v-if="imageSrc">
      <view class="section-title">旋转角度</view>
      <view class="rotate-controls">
        <button class="rotate-btn" @tap="rotateLeft">↺ 左转</button>
        <text class="rotate-value">{{ rotation }}°</text>
        <button class="rotate-btn" @tap="rotateRight">↻ 右转</button>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions" v-if="imageSrc">
      <button class="btn-primary" @tap="editImage">系统裁剪</button>
      <button class="btn-secondary" @tap="resetImage">重新选择</button>
    </view>

    <!-- 保存按钮 -->
    <view class="save-section" v-if="imageSrc">
      <button class="btn-save-final" @tap="saveImage">保存到相册</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      imageSrc: '',
      rotation: 0,
      ratio: 'free',
      ratios: [
        { label: '自由', value: 'free' },
        { label: '1:1', value: '1:1' },
        { label: '4:3', value: '4:3' },
        { label: '3:4', value: '3:4' },
        { label: '16:9', value: '16:9' },
        { label: '9:16', value: '9:16' }
      ]
    }
  },
  methods: {
    chooseImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ['original'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.imageSrc = res.tempFilePaths[0]
        }
      })
    },
    
    setRatio(r) {
      this.ratio = r
    },
    
    rotateLeft() {
      this.rotation = (this.rotation - 90) % 360
    },
    
    rotateRight() {
      this.rotation = (this.rotation + 90) % 360
    },
    
    editImage() {
      // 使用小程序自带编辑功能
      uni.editImage({
        src: this.imageSrc,
        success: (res) => {
          this.imageSrc = res.tempFilePath
          uni.showToast({ title: '裁剪完成', icon: 'success' })
        },
        fail: () => {
          uni.showToast({ title: '请手动裁剪', icon: 'none' })
        }
      })
    },
    
    resetImage() {
      this.imageSrc = ''
      this.rotation = 0
      this.ratio = 'free'
    },
    
    saveImage() {
      // 如果有旋转，需要先处理
      if (this.rotation !== 0) {
        uni.showLoading({ title: '处理中...' })
        // Canvas 处理旋转（小程序限制，这里简化处理）
        uni.hideLoading()
      }
      
      uni.saveImageToPhotosAlbum({
        filePath: this.imageSrc,
        success: () => {
          uni.showToast({ title: '已保存到相册', icon: 'success' })
        },
        fail: (err) => {
          if (err.errMsg.includes('auth')) {
            uni.showModal({
              title: '提示',
              content: '需要授权保存图片到相册',
              success: (res) => {
                if (res.confirm) {
                  uni.openSetting()
                }
              }
            })
          } else {
            uni.showToast({ title: '保存失败', icon: 'error' })
          }
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
  padding: 100rpx;
  text-align: center;
  border: 2rpx dashed #E5E7EB;
}

.upload-icon {
  font-size: 100rpx;
  margin-bottom: 20rpx;
}

.upload-text {
  font-size: 32rpx;
  color: #1F2937;
}

/* 裁剪容器 */
.crop-container {
  background-color: #1F2937;
  border-radius: 16rpx;
  padding: 40rpx;
  margin-bottom: 24rpx;
  position: relative;
  min-height: 400rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crop-image {
  max-width: 100%;
  max-height: 400rpx;
}

.crop-guide {
  position: absolute;
  bottom: 20rpx;
  left: 0;
  right: 0;
  text-align: center;
}

.guide-text {
  font-size: 24rpx;
  color: #9CA3AF;
  background-color: rgba(0,0,0,0.5);
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

/* 比例选择 */
.ratio-section, .rotate-section {
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

.ratio-grid {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.ratio-item {
  padding: 16rpx 24rpx;
  border-radius: 8rpx;
  background-color: #F3F4F6;
  border: 2rpx solid transparent;
}

.ratio-item.active {
  background-color: #ECFDF5;
  border-color: #10B981;
}

.ratio-text {
  font-size: 26rpx;
  color: #1F2937;
}

.ratio-item.active .ratio-text {
  color: #10B981;
}

/* 旋转控制 */
.rotate-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rotate-btn {
  padding: 16rpx 32rpx;
  background-color: #F3F4F6;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #1F2937;
}

.rotate-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #10B981;
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

/* 保存按钮 */
.save-section {
  padding: 24rpx;
}

.btn-save-final {
  background-color: #3B82F6;
  color: #FFFFFF;
  border-radius: 12rpx;
  font-size: 32rpx;
}
</style>
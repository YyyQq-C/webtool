<template>
  <view class="container">
    <!-- 上传区域 -->
    <view class="upload-area" @tap="chooseImage">
      <view class="upload-icon">📦</view>
      <view class="upload-text">选择图片</view>
      <view class="upload-tip">压缩后可减小文件大小</view>
    </view>

    <!-- 图片预览 -->
    <view class="preview-section" v-if="imageSrc">
      <view class="preview-card">
        <image class="preview-image" :src="imageSrc" mode="aspectFit"></image>
        <view class="image-info">
          <text class="info-label">原始大小：</text>
          <text class="info-value">{{ formatSize(originalSize) }}</text>
        </view>
      </view>
    </view>

    <!-- 压缩设置 -->
    <view class="settings-section" v-if="imageSrc">
      <view class="section-title">压缩设置</view>
      
      <view class="quality-row">
        <text class="quality-label">压缩质量</text>
        <slider 
          :value="quality" 
          @change="onQualityChange"
          min="10" 
          max="100" 
          show-value
          activeColor="#10B981"
          backgroundColor="#E5E7EB"
        />
      </view>
      
      <view class="quality-tips">
        <view class="tip-item" @tap="setQuality(80)">
          <text class="tip-text">推荐 80%</text>
        </view>
        <view class="tip-item" @tap="setQuality(60)">
          <text class="tip-text">高质量 60%</text>
        </view>
        <view class="tip-item" @tap="setQuality(40)">
          <text class="tip-text">中等 40%</text>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions" v-if="imageSrc">
      <button class="btn-primary" @tap="compressImage">开始压缩</button>
    </view>

    <!-- 压缩结果 -->
    <view class="result-section" v-if="compressedSrc">
      <view class="section-title">压缩结果</view>
      
      <view class="result-card">
        <image class="result-image" :src="compressedSrc" mode="aspectFit"></image>
        
        <view class="compare-info">
          <view class="info-row">
            <text class="info-label">压缩后大小：</text>
            <text class="info-value success">{{ formatSize(compressedSize) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">压缩比例：</text>
            <text class="info-value success">{{ compressRatio }}%</text>
          </view>
        </view>
      </view>
      
      <button class="btn-save" @tap="saveImage">保存到相册</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      imageSrc: '',
      originalSize: 0,
      quality: 80,
      compressedSrc: '',
      compressedSize: 0,
      compressRatio: 0
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
          this.originalSize = res.tempFiles[0].size
          this.compressedSrc = ''
          this.compressedSize = 0
          this.compressRatio = 0
        }
      })
    },
    
    onQualityChange(e) {
      this.quality = e.detail.value
    },
    
    setQuality(q) {
      this.quality = q
    },
    
    formatSize(size) {
      if (size < 1024) return size + 'B'
      if (size < 1024 * 1024) return (size / 1024).toFixed(1) + 'KB'
      return (size / 1024 / 1024).toFixed(1) + 'MB'
    },
    
    async compressImage() {
      uni.showLoading({ title: '压缩中...' })
      
      try {
        const res = await uni.compressImage({
          src: this.imageSrc,
          quality: this.quality
        })
        
        this.compressedSrc = res.tempFilePath
        
        // 获取压缩后文件大小
        const fileInfo = await uni.getFileInfo({ filePath: res.tempFilePath })
        this.compressedSize = fileInfo.size
        
        // 计算压缩比例
        this.compressRatio = Math.round((1 - this.compressedSize / this.originalSize) * 100)
        
        uni.hideLoading()
        uni.showToast({ title: '压缩完成', icon: 'success' })
      } catch (err) {
        uni.hideLoading()
        uni.showToast({ title: '压缩失败', icon: 'error' })
      }
    },
    
    saveImage() {
      uni.saveImageToPhotosAlbum({
        filePath: this.compressedSrc,
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

/* 预览区域 */
.preview-section {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.preview-card {
  text-align: center;
}

.preview-image {
  width: 100%;
  max-height: 300rpx;
}

.image-info {
  padding: 16rpx;
  background-color: #F3F4F6;
  border-radius: 8rpx;
  margin-top: 16rpx;
}

.info-label {
  font-size: 24rpx;
  color: #6B7280;
}

.info-value {
  font-size: 24rpx;
  color: #1F2937;
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

.quality-row {
  padding: 16rpx 0;
}

.quality-label {
  font-size: 26rpx;
  color: #1F2937;
  margin-bottom: 8rpx;
}

.quality-tips {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}

.tip-item {
  padding: 12rpx 20rpx;
  background-color: #F3F4F6;
  border-radius: 8rpx;
}

.tip-item:active {
  background-color: #E5E7EB;
}

.tip-text {
  font-size: 24rpx;
  color: #6B7280;
}

/* 操作按钮 */
.actions {
  margin-bottom: 24rpx;
}

.btn-primary {
  background-color: #10B981;
  color: #FFFFFF;
  border-radius: 12rpx;
  font-size: 32rpx;
}

/* 结果区域 */
.result-section {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
}

.result-card {
  text-align: center;
  padding-bottom: 24rpx;
}

.result-image {
  width: 100%;
  max-height: 300rpx;
}

.compare-info {
  padding: 16rpx;
  background-color: #ECFDF5;
  border-radius: 8rpx;
  margin-top: 16rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-value.success {
  color: #10B981;
  font-weight: bold;
}

.btn-save {
  background-color: #3B82F6;
  color: #FFFFFF;
  border-radius: 12rpx;
  font-size: 30rpx;
}
</style>
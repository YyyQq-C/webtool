<template>
  <view class="container">
    <!-- 上传区域 -->
    <view class="upload-area" @tap="chooseImage">
      <view class="upload-icon">📷</view>
      <view class="upload-text">点击选择图片</view>
      <view class="upload-tip">支持 JPG/PNG/WebP/BMP/GIF</view>
    </view>

    <!-- 图片列表 -->
    <view class="image-list" v-if="images.length > 0">
      <view class="image-item" v-for="(img, index) in images" :key="index">
        <image class="preview" :src="img.path" mode="aspectFill"></image>
        <view class="image-info">
          <text class="image-name">{{ img.name }}</text>
        </view>
        <view class="remove-btn" @tap="removeImage(index)">✕</view>
      </view>
    </view>

    <!-- 格式选择 -->
    <view class="format-section" v-if="images.length > 0">
      <view class="section-title">目标格式</view>
      <view class="format-grid">
        <view 
          class="format-item" 
          :class="{ active: targetFormat === fmt }"
          v-for="(fmt, index) in formats" 
          :key="index"
          @tap="setFormat(fmt)"
        >
          <text class="format-text">{{ fmt.toUpperCase() }}</text>
        </view>
      </view>
    </view>

    <!-- 压缩质量 -->
    <view class="quality-section" v-if="images.length > 0 && needQuality">
      <view class="section-title">压缩质量</view>
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

    <!-- 操作按钮 -->
    <view class="actions" v-if="images.length > 0">
      <button class="btn-primary" @tap="convertImages">开始转换</button>
      <button class="btn-secondary" @tap="clearAll">清空全部</button>
    </view>

    <!-- 结果列表 -->
    <view class="result-list" v-if="results.length > 0">
      <view class="section-title">转换结果</view>
      <view class="result-item" v-for="(res, index) in results" :key="index">
        <image class="result-preview" :src="res.path" mode="aspectFill"></image>
        <view class="result-info">
          <text class="result-name">{{ res.name }}</text>
          <text class="result-size">{{ formatSize(res.size) }}</text>
        </view>
        <button class="btn-save" @tap="saveImage(res.path)">保存</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      images: [],
      results: [],
      targetFormat: 'png',
      quality: 80,
      formats: ['jpg', 'png', 'webp', 'bmp', 'gif']
    }
  },
  computed: {
    needQuality() {
      return ['jpg', 'webp'].includes(this.targetFormat)
    }
  },
  methods: {
    chooseImage() {
      uni.chooseImage({
        count: 9,
        sizeType: ['original'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const newImages = res.tempFiles.map(f => ({
            path: f.path,
            name: f.path.split('/').pop(),
            size: f.size
          }))
          this.images = [...this.images, ...newImages]
        }
      })
    },
    
    removeImage(index) {
      this.images.splice(index, 1)
    },
    
    setFormat(fmt) {
      this.targetFormat = fmt
    },
    
    onQualityChange(e) {
      this.quality = e.detail.value
    },
    
    clearAll() {
      this.images = []
      this.results = []
    },
    
    formatSize(size) {
      if (size < 1024) return size + 'B'
      if (size < 1024 * 1024) return (size / 1024).toFixed(1) + 'KB'
      return (size / 1024 / 1024).toFixed(1) + 'MB'
    },
    
    async convertImages() {
      uni.showLoading({ title: '转换中...' })
      
      try {
        const results = []
        for (const img of this.images) {
          const res = await this.convertSingle(img)
          results.push(res)
        }
        this.results = results
        uni.hideLoading()
        uni.showToast({ title: '转换完成', icon: 'success' })
      } catch (err) {
        uni.hideLoading()
        uni.showToast({ title: '转换失败', icon: 'error' })
      }
    },
    
    convertSingle(img) {
      return new Promise((resolve) => {
        // 小程序使用 uni.saveFile 和压缩API
        uni.compressImage({
          src: img.path,
          quality: this.quality,
          format: this.targetFormat,
          success: (res) => {
            resolve({
              path: res.tempFilePath,
              name: img.name.replace(/\.[^.]+$/, '.' + this.targetFormat),
              size: 0 // 压缩后大小需要额外获取
            })
          },
          fail: () => {
            // 如果不支持该格式，直接复制
            resolve({
              path: img.path,
              name: img.name,
              size: img.size
            })
          }
        })
      })
    },
    
    saveImage(path) {
      uni.saveImageToPhotosAlbum({
        filePath: path,
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

.upload-area:active {
  background-color: #F9FAFB;
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
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.image-item {
  position: relative;
  width: calc(33.33% - 8rpx);
  height: 200rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background-color: #F3F4F6;
}

.preview {
  width: 100%;
  height: 100%;
}

.image-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8rpx;
  background: linear-gradient(transparent, rgba(0,0,0,0.5));
}

.image-name {
  font-size: 20rpx;
  color: #FFFFFF;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-btn {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 32rpx;
  height: 32rpx;
  background-color: rgba(0,0,0,0.5);
  border-radius: 50%;
  color: #FFFFFF;
  font-size: 20rpx;
  text-align: center;
  line-height: 32rpx;
}

/* 格式选择 */
.format-section, .quality-section {
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

.format-grid {
  display: flex;
  gap: 12rpx;
}

.format-item {
  padding: 16rpx 24rpx;
  border-radius: 8rpx;
  background-color: #F3F4F6;
  border: 2rpx solid transparent;
}

.format-item.active {
  background-color: #ECFDF5;
  border-color: #10B981;
}

.format-text {
  font-size: 26rpx;
  color: #1F2937;
}

.format-item.active .format-text {
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

/* 结果列表 */
.result-list {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #E5E7EB;
}

.result-item:last-child {
  border-bottom: none;
}

.result-preview {
  width: 100rpx;
  height: 100rpx;
  border-radius: 8rpx;
}

.result-info {
  flex: 1;
  padding-left: 16rpx;
}

.result-name {
  font-size: 26rpx;
  color: #1F2937;
}

.result-size {
  font-size: 22rpx;
  color: #6B7280;
  margin-left: 8rpx;
}

.btn-save {
  padding: 12rpx 24rpx;
  background-color: #10B981;
  color: #FFFFFF;
  font-size: 24rpx;
  border-radius: 8rpx;
}
</style>
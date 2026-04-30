<template>
  <view class="container">
    <!-- 上传区域 -->
    <view class="upload-area" @tap="chooseImage">
      <view class="upload-icon">🖼️</view>
      <view class="upload-text">选择底图</view>
    </view>

    <!-- 图片预览 -->
    <view class="preview-section" v-if="imageSrc">
      <image class="preview-image" :src="imageSrc" mode="aspectFit"></image>
    </view>

    <!-- 水印设置 -->
    <view class="settings-section" v-if="imageSrc">
      <view class="section-title">水印设置</view>
      
      <!-- 水印类型 -->
      <view class="type-tabs">
        <view 
          class="type-tab"
          :class="{ active: watermarkType === 'text' }"
          @tap="setWatermarkType('text')"
        >
          <text class="tab-text">文字水印</text>
        </view>
        <view 
          class="type-tab"
          :class="{ active: watermarkType === 'image' }"
          @tap="setWatermarkType('image')"
        >
          <text class="tab-text">图片水印</text>
        </view>
      </view>
      
      <!-- 文字水印 -->
      <view class="text-section" v-if="watermarkType === 'text'">
        <input 
          class="watermark-input"
          v-model="watermarkText"
          placeholder="输入水印文字"
        />
        
        <view class="color-row">
          <text class="color-label">文字颜色</text>
          <view class="color-options">
            <view 
              class="color-item"
              :class="{ active: textColor === color }"
              :style="{ backgroundColor: color }"
              v-for="(color, index) in textColors"
              :key="index"
              @tap="setTextColor(color)"
            ></view>
          </view>
        </view>
        
        <view class="size-row">
          <text class="size-label">文字大小</text>
          <slider 
            :value="textSize"
            @change="onTextSizeChange"
            min="20"
            max="80"
            show-value
            activeColor="#10B981"
          />
        </view>
      </view>
      
      <!-- 图片水印 -->
      <view class="image-section" v-if="watermarkType === 'image'">
        <view class="choose-watermark" @tap="chooseWatermarkImage">
          <text class="choose-text">{{ watermarkImageSrc ? '已选择水印图片' : '选择水印图片' }}</text>
        </view>
        <image 
          class="watermark-preview"
          v-if="watermarkImageSrc"
          :src="watermarkImageSrc"
          mode="aspectFit"
        ></image>
      </view>
      
      <!-- 位置设置 -->
      <view class="position-section">
        <text class="position-label">水印位置</text>
        <view class="position-grid">
          <view 
            class="position-item"
            :class="{ active: position === pos }"
            v-for="(pos, index) in positions"
            :key="index"
            @tap="setPosition(pos)"
          >
            <text class="position-text">{{ posLabels[pos] }}</text>
          </view>
        </view>
      </view>
      
      <!-- 透明度 -->
      <view class="opacity-row">
        <text class="opacity-label">透明度</text>
        <slider 
          :value="opacity"
          @change="onOpacityChange"
          min="10"
          max="100"
          show-value
          activeColor="#10B981"
        />
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions" v-if="imageSrc">
      <button class="btn-primary" @tap="addWatermark">添加水印</button>
    </view>

    <!-- 结果展示 -->
    <view class="result-section" v-if="resultSrc">
      <view class="section-title">结果预览</view>
      <image class="result-image" :src="resultSrc" mode="aspectFit"></image>
      <button class="btn-save" @tap="saveImage">保存到相册</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      imageSrc: '',
      watermarkType: 'text',
      watermarkText: '',
      watermarkImageSrc: '',
      textColor: '#FFFFFF',
      textColors: ['#FFFFFF', '#000000', '#10B981', '#3B82F6', '#EF4444'],
      textSize: 40,
      position: 'bottom-right',
      positions: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
      posLabels: {
        'top-left': '左上',
        'top-right': '右上',
        'center': '居中',
        'bottom-left': '左下',
        'bottom-right': '右下'
      },
      opacity: 80,
      resultSrc: ''
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
          this.resultSrc = ''
        }
      })
    },
    
    setWatermarkType(type) {
      this.watermarkType = type
    },
    
    chooseWatermarkImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ['original'],
        sourceType: ['album'],
        success: (res) => {
          this.watermarkImageSrc = res.tempFilePaths[0]
        }
      })
    },
    
    setTextColor(color) {
      this.textColor = color
    },
    
    onTextSizeChange(e) {
      this.textSize = e.detail.value
    },
    
    setPosition(pos) {
      this.position = pos
    },
    
    onOpacityChange(e) {
      this.opacity = e.detail.value
    },
    
    async addWatermark() {
      if (!this.imageSrc) return
      
      if (this.watermarkType === 'text' && !this.watermarkText) {
        uni.showToast({ title: '请输入水印文字', icon: 'none' })
        return
      }
      
      if (this.watermarkType === 'image' && !this.watermarkImageSrc) {
        uni.showToast({ title: '请选择水印图片', icon: 'none' })
        return
      }
      
      uni.showLoading({ title: '处理中...' })
      
      // 小程序水印需要 canvas 绘制
      // 这里简化处理，实际需要 canvas 合成
      uni.hideLoading()
      
      uni.showToast({ 
        title: '小程序暂不支持本地合成', 
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
}

/* 预览区域 */
.preview-section {
  background-color: #1F2937;
  border-radius: 16rpx;
  padding: 24rpx;
  text-align: center;
  margin-bottom: 24rpx;
}

.preview-image {
  max-width: 100%;
  max-height: 400rpx;
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

/* 水印类型 */
.type-tabs {
  display: flex;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.type-tab {
  flex: 1;
  padding: 20rpx;
  background-color: #F3F4F6;
  border-radius: 12rpx;
  text-align: center;
}

.type-tab.active {
  background-color: #10B981;
}

.tab-text {
  font-size: 28rpx;
  color: #1F2937;
}

.type-tab.active .tab-text {
  color: #FFFFFF;
}

/* 文字水印设置 */
.text-section {
  padding: 16rpx 0;
}

.watermark-input {
  width: 100%;
  padding: 16rpx;
  border: 2rpx solid #E5E7EB;
  border-radius: 12rpx;
  font-size: 28rpx;
  margin-bottom: 16rpx;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.color-label {
  font-size: 26rpx;
  color: #6B7280;
}

.color-options {
  display: flex;
  gap: 12rpx;
}

.color-item {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #E5E7EB;
}

.color-item.active {
  border-color: #10B981;
  border-width: 4rpx;
}

.size-row, .opacity-row {
  padding: 8rpx 0;
}

.size-label, .opacity-label, .position-label {
  font-size: 26rpx;
  color: #6B7280;
  margin-bottom: 8rpx;
}

/* 图片水印 */
.image-section {
  padding: 16rpx 0;
}

.choose-watermark {
  padding: 24rpx;
  background-color: #F3F4F6;
  border-radius: 12rpx;
  text-align: center;
  margin-bottom: 16rpx;
}

.choose-watermark:active {
  background-color: #E5E7EB;
}

.choose-text {
  font-size: 28rpx;
  color: #1F2937;
}

.watermark-preview {
  width: 100rpx;
  height: 100rpx;
}

/* 位置设置 */
.position-section {
  padding: 16rpx 0;
}

.position-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.position-item {
  padding: 16rpx 24rpx;
  background-color: #F3F4F6;
  border-radius: 8rpx;
}

.position-item.active {
  background-color: #ECFDF5;
  border: 2rpx solid #10B981;
}

.position-text {
  font-size: 24rpx;
  color: #1F2937;
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

/* 结果展示 */
.result-section {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  text-align: center;
}

.result-image {
  max-width: 100%;
  max-height: 400rpx;
  margin-bottom: 24rpx;
}

.btn-save {
  background-color: #3B82F6;
  color: #FFFFFF;
  border-radius: 12rpx;
  font-size: 30rpx;
}
</style>
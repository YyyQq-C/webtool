<template>
  <view class="container">
    <!-- 上传区域 -->
    <view class="upload-area" @tap="chooseGif">
      <view class="upload-icon">🎬</view>
      <view class="upload-text">选择 GIF 动图</view>
      <view class="upload-tip">将 GIF 拆分为单帧图片</view>
    </view>

    <!-- GIF 预览 -->
    <view class="preview-section" v-if="gifSrc">
      <image class="gif-preview" :src="gifSrc" mode="aspectFit"></image>
      <view class="gif-info">
        <text class="info-text">已选择 GIF 文件</text>
      </view>
    </view>

    <!-- 提取设置 -->
    <view class="settings-section" v-if="gifSrc">
      <view class="section-title">提取设置</view>
      
      <view class="option-row">
        <text class="option-label">提取帧数</text>
        <radio-group @change="onFrameModeChange">
          <label class="radio-item">
            <radio value="all" :checked="frameMode === 'all'" />
            <text class="radio-text">全部帧</text>
          </label>
          <label class="radio-item">
            <radio value="custom" :checked="frameMode === 'custom'" />
            <text class="radio-text">指定帧</text>
          </label>
        </radio-group>
      </view>
      
      <view class="custom-row" v-if="frameMode === 'custom'">
        <input 
          class="frame-input"
          v-model="customFrames"
          placeholder="输入帧号，如: 1,3,5"
        />
      </view>
      
      <view class="format-row">
        <text class="format-label">输出格式</text>
        <view class="format-options">
          <view 
            class="format-item"
            :class="{ active: outputFormat === fmt }"
            v-for="(fmt, index) in formats"
            :key="index"
            @tap="setFormat(fmt)"
          >
            <text class="format-text">{{ fmt }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions" v-if="gifSrc">
      <button class="btn-primary" @tap="extractFrames">开始提取</button>
      <button class="btn-secondary" @tap="resetGif">重新选择</button>
    </view>

    <!-- 提取结果 -->
    <view class="result-section" v-if="frames.length > 0">
      <view class="section-title">提取结果 ({{ frames.length }} 帧)</view>
      
      <view class="frame-grid">
        <view 
          class="frame-item"
          v-for="(frame, index) in frames"
          :key="index"
        >
          <image class="frame-image" :src="frame.path" mode="aspectFill"></image>
          <view class="frame-index">{{ frame.index }}</view>
          <button class="frame-save" @tap="saveFrame(frame.path)">保存</button>
        </view>
      </view>
      
      <button class="btn-save-all" @tap="saveAllFrames">保存全部</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      gifSrc: '',
      frameMode: 'all',
      customFrames: '',
      outputFormat: 'png',
      formats: ['png', 'jpg', 'webp'],
      frames: []
    }
  },
  methods: {
    chooseGif() {
      uni.chooseImage({
        count: 1,
        sizeType: ['original'],
        sourceType: ['album'],
        success: (res) => {
          this.gifSrc = res.tempFilePaths[0]
          this.frames = []
        }
      })
    },
    
    onFrameModeChange(e) {
      this.frameMode = e.detail.value
    },
    
    setFormat(fmt) {
      this.outputFormat = fmt
    },
    
    resetGif() {
      this.gifSrc = ''
      this.frames = []
    },
    
    async extractFrames() {
      uni.showLoading({ title: '提取中...' })
      
      // 小程序 GIF 分帧需要特殊处理
      // 这里简化处理
      uni.hideLoading()
      
      uni.showToast({ 
        title: '小程序暂不支持本地分帧', 
        icon: 'none',
        duration: 2000
      })
    },
    
    saveFrame(path) {
      uni.saveImageToPhotosAlbum({
        filePath: path,
        success: () => {
          uni.showToast({ title: '已保存', icon: 'success' })
        },
        fail: () => {
          uni.showToast({ title: '保存失败', icon: 'error' })
        }
      })
    },
    
    async saveAllFrames() {
      uni.showLoading({ title: '保存中...' })
      
      for (let i = 0; i < this.frames.length; i++) {
        try {
          await uni.saveImageToPhotosAlbum({
            filePath: this.frames[i].path
          })
        } catch (err) {
          console.error('保存失败:', err)
        }
      }
      
      uni.hideLoading()
      uni.showToast({ title: '已保存全部', icon: 'success' })
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

/* GIF 预览 */
.preview-section {
  background-color: #1F2937;
  border-radius: 16rpx;
  padding: 40rpx;
  text-align: center;
  margin-bottom: 24rpx;
}

.gif-preview {
  max-width: 100%;
  max-height: 300rpx;
}

.gif-info {
  padding: 16rpx;
  background-color: rgba(255,255,255,0.1);
  border-radius: 8rpx;
  margin-top: 16rpx;
}

.info-text {
  font-size: 24rpx;
  color: #FFFFFF;
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

.option-row, .format-row {
  padding: 16rpx 0;
}

.option-label, .format-label {
  font-size: 26rpx;
  color: #6B7280;
  margin-bottom: 12rpx;
}

.radio-item {
  display: flex;
  align-items: center;
  margin-right: 24rpx;
}

.radio-text {
  font-size: 26rpx;
  color: #1F2937;
  margin-left: 8rpx;
}

.custom-row {
  padding: 16rpx 0;
}

.frame-input {
  width: 100%;
  padding: 16rpx;
  border: 2rpx solid #E5E7EB;
  border-radius: 12rpx;
  font-size: 26rpx;
}

.format-options {
  display: flex;
  gap: 12rpx;
}

.format-item {
  padding: 16rpx 24rpx;
  background-color: #F3F4F6;
  border-radius: 8rpx;
}

.format-item.active {
  background-color: #ECFDF5;
  border: 2rpx solid #10B981;
}

.format-text {
  font-size: 26rpx;
  color: #1F2937;
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

/* 提取结果 */
.result-section {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
}

.frame-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.frame-item {
  width: calc(33.33% - 8rpx);
  position: relative;
}

.frame-image {
  width: 100%;
  height: 200rpx;
  border-radius: 12rpx;
}

.frame-index {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  padding: 4rpx 8rpx;
  background-color: #10B981;
  color: #FFFFFF;
  border-radius: 8rpx;
  font-size: 20rpx;
}

.frame-save {
  position: absolute;
  bottom: 8rpx;
  right: 8rpx;
  padding: 8rpx 16rpx;
  background-color: #3B82F6;
  color: #FFFFFF;
  border-radius: 8rpx;
  font-size: 20rpx;
}

.btn-save-all {
  background-color: #10B981;
  color: #FFFFFF;
  border-radius: 12rpx;
  font-size: 30rpx;
}
</style>
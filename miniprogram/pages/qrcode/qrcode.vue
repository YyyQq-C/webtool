<template>
  <view class="container">
    <!-- 模式切换 -->
    <view class="mode-tabs">
      <view 
        class="mode-tab"
        :class="{ active: mode === 'generate' }"
        @tap="setMode('generate')"
      >
        <text class="tab-text">生成二维码</text>
      </view>
      <view 
        class="mode-tab"
        :class="{ active: mode === 'parse' }"
        @tap="setMode('parse')"
      >
        <text class="tab-text">解析二维码</text>
      </view>
    </view>

    <!-- 生成模式 -->
    <view class="generate-section" v-if="mode === 'generate'">
      <view class="input-section">
        <view class="section-title">输入内容</view>
        <textarea 
          class="input-area"
          v-model="inputText"
          placeholder="输入文字、链接或内容..."
          :maxlength="500"
        ></textarea>
      </view>

      <!-- 样式设置 -->
      <view class="style-section">
        <view class="section-title">二维码样式</view>
        <view class="style-row">
          <view class="style-item">
            <text class="style-label">前景色</text>
            <view class="color-picker" :style="{ backgroundColor: fgColor }" @tap="pickFgColor">
              <text class="color-text">{{ fgColor }}</text>
            </view>
          </view>
          <view class="style-item">
            <text class="style-label">背景色</text>
            <view class="color-picker" :style="{ backgroundColor: bgColor }" @tap="pickBgColor">
              <text class="color-text">{{ bgColor }}</text>
            </view>
          </view>
        </view>
        <view class="size-row">
          <text class="style-label">尺寸大小</text>
          <slider 
            :value="size" 
            @change="onSizeChange"
            min="100" 
            max="400" 
            show-value
            activeColor="#10B981"
          />
        </view>
      </view>

      <!-- 生成按钮 -->
      <button class="btn-generate" @tap="generateQR">生成二维码</button>

      <!-- 结果展示 -->
      <view class="result-section" v-if="qrImage">
        <image class="qr-result" :src="qrImage" mode="aspectFit"></image>
        <button class="btn-save" @tap="saveQR">保存到相册</button>
      </view>
    </view>

    <!-- 解析模式 -->
    <view class="parse-section" v-if="mode === 'parse'">
      <view class="upload-area" @tap="chooseQRImage">
        <view class="upload-icon">📱</view>
        <view class="upload-text">选择二维码图片</view>
      </view>

      <view class="uploaded-image" v-if="uploadedQR">
        <image class="qr-preview" :src="uploadedQR" mode="aspectFit"></image>
      </view>

      <view class="parse-result" v-if="parsedText">
        <view class="section-title">解析结果</view>
        <view class="result-box">
          <text class="result-text">{{ parsedText }}</text>
        </view>
        <button class="btn-copy" @tap="copyText">复制内容</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      mode: 'generate',
      inputText: '',
      fgColor: '#000000',
      bgColor: '#FFFFFF',
      size: 200,
      qrImage: '',
      uploadedQR: '',
      parsedText: ''
    }
  },
  methods: {
    setMode(m) {
      this.mode = m
      this.qrImage = ''
      this.parsedText = ''
      this.uploadedQR = ''
    },
    
    pickFgColor() {
      // 小程序颜色选择器有限，提供预设颜色
      const colors = ['#000000', '#1F2937', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6']
      uni.showActionSheet({
        itemList: colors,
        success: (res) => {
          this.fgColor = colors[res.tapIndex]
        }
      })
    },
    
    pickBgColor() {
      const colors = ['#FFFFFF', '#F3F4F6', '#ECFDF5', '#DBEAFE', '#FEE2E2', '#F5F3FF']
      uni.showActionSheet({
        itemList: colors,
        success: (res) => {
          this.bgColor = colors[res.tapIndex]
        }
      })
    },
    
    onSizeChange(e) {
      this.size = e.detail.value
    },
    
    generateQR() {
      if (!this.inputText) {
        uni.showToast({ title: '请输入内容', icon: 'none' })
        return
      }
      
      uni.showLoading({ title: '生成中...' })
      
      // 使用 uni-app 的二维码生成（需要 canvas）
      // 这里简化处理，实际需要 canvas 绘制
      uni.hideLoading()
      
      // 由于小程序限制，这里使用占位提示
      uni.showToast({ 
        title: '小程序暂不支持本地生成', 
        icon: 'none',
        duration: 2000
      })
    },
    
    saveQR() {
      if (!this.qrImage) return
      
      uni.saveImageToPhotosAlbum({
        filePath: this.qrImage,
        success: () => {
          uni.showToast({ title: '已保存', icon: 'success' })
        },
        fail: () => {
          uni.showToast({ title: '保存失败', icon: 'error' })
        }
      })
    },
    
    chooseQRImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ['original'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.uploadedQR = res.tempFilePaths[0]
          this.parseQRImage()
        }
      })
    },
    
    parseQRImage() {
      uni.showLoading({ title: '解析中...' })
      
      // 小程序解析二维码需要使用 canvas 或第三方服务
      // 这里简化处理
      uni.hideLoading()
      
      uni.showToast({ 
        title: '小程序暂不支持本地解析', 
        icon: 'none',
        duration: 2000
      })
    },
    
    copyText() {
      uni.setClipboardData({
        data: this.parsedText,
        success: () => {
          uni.showToast({ title: '已复制', icon: 'success' })
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

/* 模式切换 */
.mode-tabs {
  display: flex;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 8rpx;
  margin-bottom: 24rpx;
}

.mode-tab {
  flex: 1;
  padding: 24rpx;
  text-align: center;
  border-radius: 12rpx;
  transition: all 0.2s;
}

.mode-tab.active {
  background-color: #10B981;
}

.tab-text {
  font-size: 30rpx;
  color: #1F2937;
}

.mode-tab.active .tab-text {
  color: #FFFFFF;
}

/* 输入区域 */
.input-section, .style-section {
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

.input-area {
  width: 100%;
  min-height: 200rpx;
  padding: 16rpx;
  border: 2rpx solid #E5E7EB;
  border-radius: 12rpx;
  font-size: 28rpx;
}

/* 样式设置 */
.style-row {
  display: flex;
  gap: 24rpx;
  margin-bottom: 16rpx;
}

.style-item {
  flex: 1;
}

.style-label {
  font-size: 24rpx;
  color: #6B7280;
  margin-bottom: 8rpx;
}

.color-picker {
  padding: 16rpx;
  border-radius: 8rpx;
  border: 2rpx solid #E5E7EB;
}

.color-text {
  font-size: 24rpx;
  color: #1F2937;
}

.size-row {
  padding: 16rpx 0;
}

/* 生成按钮 */
.btn-generate {
  background-color: #10B981;
  color: #FFFFFF;
  border-radius: 12rpx;
  font-size: 32rpx;
  margin-bottom: 24rpx;
}

/* 结果展示 */
.result-section {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 40rpx;
  text-align: center;
}

.qr-result {
  width: 300rpx;
  height: 300rpx;
  margin-bottom: 24rpx;
}

.btn-save {
  background-color: #3B82F6;
  color: #FFFFFF;
  border-radius: 12rpx;
  font-size: 28rpx;
}

/* 解析模式 */
.upload-area {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 80rpx;
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

.uploaded-image {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  text-align: center;
  margin-bottom: 24rpx;
}

.qr-preview {
  width: 200rpx;
  height: 200rpx;
}

/* 解析结果 */
.parse-result {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
}

.result-box {
  padding: 16rpx;
  background-color: #F3F4F6;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.result-text {
  font-size: 26rpx;
  color: #1F2937;
  word-break: break-all;
}

.btn-copy {
  background-color: #10B981;
  color: #FFFFFF;
  border-radius: 12rpx;
  font-size: 28rpx;
}
</style>
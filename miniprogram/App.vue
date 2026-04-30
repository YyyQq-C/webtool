<script>
export default {
  onLaunch: function() {
    console.log('App Launch')
  },
  onShow: function() {
    console.log('App Show')
  },
  onHide: function() {
    console.log('App Hide')
  }
}
</script>

<style>
/* 全局样式 */
page {
  background-color: #F5F7FA;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 全局容器 */
.container {
  padding: 20rpx;
  min-height: 100vh;
}

/* 卡片样式 */
.card {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

/* 主按钮 */
.btn-primary {
  background-color: #10B981;
  color: #FFFFFF;
  border-radius: 12rpx;
  padding: 24rpx 48rpx;
  font-size: 32rpx;
  text-align: center;
}

.btn-primary:active {
  background-color: #059669;
}

/* 次按钮 */
.btn-secondary {
  background-color: #F3F4F6;
  color: #374151;
  border-radius: 12rpx;
  padding: 24rpx 48rpx;
  font-size: 32rpx;
  text-align: center;
}

/* 文字样式 */
.text-primary {
  color: #1F2937;
}

.text-secondary {
  color: #6B7280;
}

.text-muted {
  color: #9CA3AF;
}

.text-success {
  color: #10B981;
}

/* 间距 */
.mt-1 { margin-top: 8rpx; }
.mt-2 { margin-top: 16rpx; }
.mt-3 { margin-top: 24rpx; }
.mt-4 { margin-top: 32rpx; }
.mb-1 { margin-bottom: 8rpx; }
.mb-2 { margin-bottom: 16rpx; }
.mb-3 { margin-bottom: 24rpx; }
.mb-4 { margin-bottom: 32rpx; }
.p-1 { padding: 8rpx; }
.p-2 { padding: 16rpx; }
.p-3 { padding: 24rpx; }
.p-4 { padding: 32rpx; }
</style>
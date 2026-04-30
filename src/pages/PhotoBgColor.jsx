import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'
import UploadArea, { isImageFile } from '../components/UploadArea'

// 预设背景色
const PRESET_COLORS = [
  { name: '白色', value: '#FFFFFF', desc: '通用证件照' },
  { name: '蓝色', value: '#438EDB', desc: '毕业证、工作证' },
  { name: '红色', value: '#D92B2B', desc: '结婚证、社保卡' },
  { name: '浅蓝', value: '#87CEEB', desc: '部分签证' },
  { name: '渐变蓝', value: 'linear-gradient(180deg, #438EDB 0%, #1E5FA8 100%)', desc: '渐变效果' },
  { name: '渐变红', value: 'linear-gradient(180deg, #D92B2B 0%, #8B1A1A 100%)', desc: '渐变效果' },
]

// 证件照标准尺寸
const PHOTO_SIZES = {
  '1寸': { width: 295, height: 413, mm: '25×35mm' },
  '2寸': { width: 413, height: 579, mm: '35×49mm' },
  '小2寸': { width: 413, height: 531, mm: '35×45mm' },
}

function PhotoBgColor() {
  const [image, setImage] = useState(null)
  const [bgColor, setBgColor] = useState('#438EDB')
  const [customColor, setCustomColor] = useState('#438EDB')
  const [useCustom, setUseCustom] = useState(false)
  const [photoSize, setPhotoSize] = useState('1寸')
  const [resultImage, setResultImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mode, setMode] = useState('simple') // simple: 简单换底, smart: 智能抠图
  
  const canvasRef = useRef(null)
  const originalCanvasRef = useRef(null)

  const handleFile = useCallback((file) => {
    if (!file) return
    if (!isImageFile(file)) {
      alert('请上传图片文件')
      return
    }
    
    setImage({
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
    })
    setResultImage(null)
  }, [])

  const handleDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) handleFile(acceptedFiles[0])
  }, [handleFile])

  // 简单换底色（适用于已有白底证件照）
  const changeBgSimple = async () => {
    if (!image) return
    
    setIsProcessing(true)
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      const size = PHOTO_SIZES[photoSize]
      canvas.width = size.width
      canvas.height = size.height
      
      // 先填充背景色
      if (bgColor.includes('gradient')) {
        // 渐变背景
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        gradient.addColorStop(0, '#438EDB')
        gradient.addColorStop(1, '#1E5FA8')
        ctx.fillStyle = gradient
      } else {
        ctx.fillStyle = bgColor
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // 计算缩放比例，保持人像在中央
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.85
      const x = (canvas.width - img.width * scale) / 2
      const y = (canvas.height - img.height * scale) / 2
      
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
      
      setResultImage(canvas.toDataURL('image/jpeg', 0.95))
      setIsProcessing(false)
    }
    img.src = image.preview
  }

  // 智能换底色（需要调用后端API去背景）
  const changeBgSmart = async () => {
    if (!image) return
    
    setIsProcessing(true)
    
    try {
      // 调用后端去背景API
      const formData = new FormData()
      formData.append('file', image.file)
      
      const res = await fetch('/bg-api/api/remove-background', {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) {
        throw new Error('去背景失败')
      }
      
      const blob = await res.blob()
      const bgRemovedUrl = URL.createObjectURL(blob)
      
      // 在去背景的图片上添加新背景色
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        
        const size = PHOTO_SIZES[photoSize]
        canvas.width = size.width
        canvas.height = size.height
        
        // 填充背景色
        if (bgColor.includes('gradient')) {
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
          gradient.addColorStop(0, '#438EDB')
          gradient.addColorStop(1, '#1E5FA8')
          ctx.fillStyle = gradient
        } else {
          ctx.fillStyle = bgColor
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // 绘制去背景的人像
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.85
        const x = (canvas.width - img.width * scale) / 2
        const y = (canvas.height - img.height * scale) / 2
        
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
        
        setResultImage(canvas.toDataURL('image/jpeg', 0.95))
        setIsProcessing(false)
      }
      img.src = bgRemovedUrl
    } catch (err) {
      console.error('智能换底失败:', err)
      alert('智能换底失败，请尝试简单换底模式')
      setIsProcessing(false)
    }
  }

  const handleProcess = () => {
    if (mode === 'simple') {
      changeBgSimple()
    } else {
      changeBgSmart()
    }
  }

  const downloadResult = () => {
    if (resultImage) {
      const link = document.createElement('a')
      link.href = resultImage
      link.download = `证件照_${photoSize}_${bgColor.replace('#', '')}.jpg`
      link.click()
    }
  }

  const downloadPrint = () => {
    if (!resultImage) return
    
    // 生成排版图（6张证件照排列）
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    const size = PHOTO_SIZES[photoSize]
    // 6寸相纸尺寸 (4R: 102mm x 152mm ≈ 1200 x 1800 px @ 300dpi)
    canvas.width = 1200
    canvas.height = 1800
    
    // 白色背景
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 加载结果图片
    const img = new Image()
    img.onload = () => {
      // 计算6张证件照的位置（2行3列）
      const padding = 50
      const gap = 20
      const cols = 3
      const rows = 2
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = padding + col * (size.width + gap)
          const y = padding + row * (size.height + gap)
          ctx.drawImage(img, x, y, size.width, size.height)
        }
      }
      
      const printUrl = canvas.toDataURL('image/jpeg', 0.95)
      const link = document.createElement('a')
      link.href = printUrl
      link.download = `证件照排版_6张.jpg`
      link.click()
    }
    img.src = resultImage
  }

  useEffect(() => {
    if (image && resultImage) {
      // 自动更新结果当颜色改变时（简单模式下）
      if (mode === 'simple') {
        changeBgSimple()
      }
    }
  }, [bgColor, photoSize])

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/photo-tools" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        返回证件照工具箱
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">证件照换底色</h1>
        <p className="text-[#94A3B8]">更换证件照背景颜色，支持标准证件照尺寸</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：上传和设置 */}
        <div className="space-y-6">
          {/* 上传区域 */}
          {!image ? (
            <UploadArea onDrop={handleDrop} accept={{ 'image/*': [] }} maxFiles={1} />
          ) : (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <div className="text-center">
                <img src={image.preview} alt="原图" className="max-w-full max-h-[300px] mx-auto rounded-lg" />
                <button
                  onClick={() => setImage(null)}
                  className="mt-4 px-4 py-2 bg-[#475569] text-[#F8FAFC] rounded-lg hover:bg-[#64748B] transition-colors"
                >
                  重新上传
                </button>
              </div>
            </div>
          )}

          {/* 模式选择 */}
          {image && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">换底模式</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('simple')}
                  className={`p-4 rounded-xl border transition-all ${mode === 'simple' ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}
                >
                  <div className="text-xl mb-2">⚡</div>
                  <div className="font-semibold text-[#F8FAFC]">简单换底</div>
                  <div className="text-sm text-[#94A3B8]">适合已有证件照</div>
                </button>
                <button
                  onClick={() => setMode('smart')}
                  className={`p-4 rounded-xl border transition-all ${mode === 'smart' ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}
                >
                  <div className="text-xl mb-2">🧠</div>
                  <div className="font-semibold text-[#F8FAFC]">智能抠图</div>
                  <div className="text-sm text-[#94A3B8]">自动去背景换底</div>
                </button>
              </div>
            </div>
          )}

          {/* 背景色选择 */}
          {image && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">背景颜色</h3>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                {PRESET_COLORS.filter(c => !c.value.includes('gradient')).map((color) => (
                  <button
                    key={color.value}
                    onClick={() => {
                      setBgColor(color.value)
                      setUseCustom(false)
                    }}
                    className={`p-3 rounded-xl border transition-all ${bgColor === color.value && !useCustom ? 'border-[#22C55E]' : 'border-[#475569]'}`}
                  >
                    <div className="w-8 h-8 rounded-lg mx-auto mb-2" style={{ backgroundColor: color.value }}></div>
                    <div className="text-sm font-medium text-[#F8FAFC]">{color.name}</div>
                    <div className="text-xs text-[#94A3B8]">{color.desc}</div>
                  </button>
                ))}
              </div>

              {/* 自定义颜色 */}
              <div className="flex items-center gap-4 mt-4">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value)
                    setBgColor(e.target.value)
                    setUseCustom(true)
                  }}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value)
                    setBgColor(e.target.value)
                    setUseCustom(true)
                  }}
                  className="flex-1 px-3 py-2 bg-[#475569] border border-[#64748B] rounded-lg text-[#F8FAFC] focus:border-[#22C55E]"
                  placeholder="#FFFFFF"
                />
                <span className="text-sm text-[#94A3B8]">自定义</span>
              </div>
            </div>
          )}

          {/* 尺寸选择 */}
          {image && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">证件照尺寸</h3>
              
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(PHOTO_SIZES).map(([name, size]) => (
                  <button
                    key={name}
                    onClick={() => setPhotoSize(name)}
                    className={`p-3 rounded-xl border transition-all ${photoSize === name ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}
                  >
                    <div className="font-semibold text-[#F8FAFC]">{name}</div>
                    <div className="text-sm text-[#94A3B8]">{size.mm}</div>
                    <div className="text-xs text-[#64748B]">{size.width}×{size.height}px</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 处理按钮 */}
          {image && (
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full py-4 bg-[#22C55E] text-white font-semibold rounded-xl hover:bg-[#16A34A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? '处理中...' : '开始换底'}
            </button>
          )}
        </div>

        {/* 右侧：结果预览 */}
        <div className="space-y-6">
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569] min-h-[400px] flex flex-col items-center justify-center">
            {resultImage ? (
              <>
                <img src={resultImage} alt="结果" className="max-w-full max-h-[400px] rounded-lg shadow-lg" />
                <div className="mt-4 text-[#94A3B8] text-sm">
                  {photoSize}证件照 · {useCustom ? customColor : PRESET_COLORS.find(c => c.value === bgColor)?.name || bgColor}
                </div>
              </>
            ) : (
              <div className="text-[#94A3B8]">
                <div className="text-4xl mb-4">📷</div>
                <p>上传图片后开始处理</p>
              </div>
            )}
          </div>

          {/* 下载按钮 */}
          {resultImage && (
            <div className="flex gap-4">
              <button
                onClick={downloadResult}
                className="flex-1 py-3 bg-[#3B82F6] text-white font-semibold rounded-xl hover:bg-[#2563EB] transition-colors"
              >
                下载证件照
              </button>
              <button
                onClick={downloadPrint}
                className="flex-1 py-3 bg-[#8B5CF6] text-white font-semibold rounded-xl hover:bg-[#7C3AED] transition-colors"
              >
                下载排版图（6张）
              </button>
            </div>
          )}

          {/* 尺寸说明 */}
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">证件照用途参考</h3>
            <div className="space-y-2 text-sm text-[#94A3B8]">
              <div className="flex justify-between">
                <span>白色背景</span>
                <span>护照、签证、驾驶证、身份证</span>
              </div>
              <div className="flex justify-between">
                <span>蓝色背景</span>
                <span>毕业证、工作证、简历</span>
              </div>
              <div className="flex justify-between">
                <span>红色背景</span>
                <span>结婚证、社保卡、IC卡</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 隐藏的 canvas */}
      <canvas ref={canvasRef} className="hidden"></canvas>
      <canvas ref={originalCanvasRef} className="hidden"></canvas>
    </div>
  )
}

export default PhotoBgColor
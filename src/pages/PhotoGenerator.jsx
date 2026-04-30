import { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import UploadArea, { isImageFile } from '../components/UploadArea'

// 证件照标准尺寸
const PHOTO_SIZES = {
  '1寸': { width: 295, height: 413, mm: '25×35mm', dpi: 300 },
  '2寸': { width: 413, height: 579, mm: '35×49mm', dpi: 300 },
  '小2寸': { width: 413, height: 531, mm: '35×45mm', dpi: 300 },
  '美国签证': { width: 600, height: 600, mm: '51×51mm', dpi: 300 },
  '欧洲签证': { width: 413, height: 531, mm: '35×45mm', dpi: 300 },
  '日本签证': { width: 450, height: 450, mm: '45×45mm', dpi: 300 },
}

// 背景色
const BG_COLORS = {
  '白色': '#FFFFFF',
  '蓝色': '#438EDB',
  '红色': '#D92B2B',
  '浅蓝': '#87CEEB',
}

function PhotoGenerator() {
  const [image, setImage] = useState(null)
  const [photoSize, setPhotoSize] = useState('1寸')
  const [bgColor, setBgColor] = useState('#FFFFFF')
  const [bgColorName, setBgColorName] = useState('白色')
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultImage, setResultImage] = useState(null)
  const [showCrop, setShowCrop] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  
  const canvasRef = useRef(null)
  const previewCanvasRef = useRef(null)
  const imageRef = useRef(null)

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
    setShowCrop(true)
    
    // 自动检测人脸区域（简化版，实际需要AI）
    // 这里设置一个默认裁剪区域
    setFaceDetected(false)
  }, [])

  const handleDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) handleFile(acceptedFiles[0])
  }, [handleFile])

  // 自动裁剪（模拟人脸检测）
  const autoCrop = () => {
    if (!image) return
    
    const img = new Image()
    img.onload = () => {
      // 假设人脸在图片上半部分中央
      // 实际应用需要真正的人脸检测
      const faceWidth = img.width * 0.4
      const faceHeight = img.height * 0.5
      const x = (img.width - faceWidth) / 2
      const y = img.height * 0.1
      
      setCropArea({ x, y, width: faceWidth, height: faceHeight })
      setFaceDetected(true)
      
      // 绘制预览
      drawPreview(img, { x, y, width: faceWidth, height: faceHeight })
    }
    img.src = image.preview
  }

  // 手动调整裁剪区域
  const adjustCrop = (direction) => {
    const delta = 20
    let newArea = { ...cropArea }
    
    switch (direction) {
      case 'up': newArea.y -= delta; break
      case 'down': newArea.y += delta; break
      case 'left': newArea.x -= delta; break
      case 'right': newArea.x += delta; break
      case 'wider': newArea.width += delta; newArea.x -= delta/2; break
      case 'narrower': newArea.width -= delta; newArea.x += delta/2; break
      case 'taller': newArea.height += delta; newArea.y -= delta/2; break
      case 'shorter': newArea.height -= delta; newArea.y += delta/2; break
    }
    
    setCropArea(newArea)
    
    if (image) {
      const img = new Image()
      img.onload = () => drawPreview(img, newArea)
      img.src = image.preview
    }
  }

  // 绘制裁剪预览
  const drawPreview = (img, area) => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const size = PHOTO_SIZES[photoSize]
    
    canvas.width = size.width
    canvas.height = size.height
    
    // 填充背景色
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 计算裁剪区域的缩放比例
    const scaleX = canvas.width / area.width
    const scaleY = canvas.height / area.height
    const scale = Math.max(scaleX, scaleY)
    
    // 绘制裁剪区域
    ctx.drawImage(
      img,
      area.x, area.y, area.width, area.height,
      0, 0, canvas.width, canvas.height
    )
  }

  // 生成证件照
  const generatePhoto = async () => {
    if (!image || !cropArea.width) return
    
    setIsProcessing(true)
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      const size = PHOTO_SIZES[photoSize]
      canvas.width = size.width
      canvas.height = size.height
      
      // 填充背景色
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // 绘制裁剪区域
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, canvas.width, canvas.height
      )
      
      setResultImage(canvas.toDataURL('image/jpeg', 0.95))
      setIsProcessing(false)
    }
    img.src = image.preview
  }

  // 下载证件照
  const downloadPhoto = () => {
    if (!resultImage) return
    
    const link = document.createElement('a')
    link.href = resultImage
    link.download = `证件照_${photoSize}_${bgColorName}.jpg`
    link.click()
  }

  // 下载排版图（一张6寸相纸上排8张）
  const downloadPrintSheet = () => {
    if (!resultImage) return
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // 6寸相纸 (4R: 1200 x 1800 px)
    canvas.width = 1200
    canvas.height = 1800
    
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    const img = new Image()
    img.onload = () => {
      const size = PHOTO_SIZES[photoSize]
      
      // 计算8张证件照的布局（根据尺寸调整）
      let cols, rows
      if (size.width > size.height) {
        cols = 2
        rows = 4
      } else {
        cols = 4
        rows = 2
      }
      
      const padding = 40
      const gapX = (canvas.width - padding * 2 - cols * size.width) / (cols - 1 || 1)
      const gapY = (canvas.height - padding * 2 - rows * size.height) / (rows - 1 || 1)
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = padding + col * (size.width + gapX)
          const y = padding + row * (size.height + gapY)
          ctx.drawImage(img, x, y, size.width, size.height)
        }
      }
      
      const printUrl = canvas.toDataURL('image/jpeg', 0.95)
      const link = document.createElement('a')
      link.href = printUrl
      link.download = `证件照排版_${photoSize}_8张.jpg`
      link.click()
    }
    img.src = resultImage
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/photo-tools" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        返回证件照工具箱
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">一键生成证件照</h1>
        <p className="text-[#94A3B8]">自动裁剪、调整尺寸、生成排版图</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：上传和设置 */}
        <div className="space-y-6">
          {/* 上传区域 */}
          {!image ? (
            <UploadArea onDrop={handleDrop} accept={{ 'image/*': [] }} maxFiles={1} />
          ) : (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">原图预览</h3>
              <div className="relative">
                <img 
                  ref={imageRef}
                  src={image.preview} 
                  alt="原图" 
                  className="max-w-full max-h-[300px] mx-auto rounded-lg"
                />
                
                {/* 裁剪框指示 */}
                {showCrop && cropArea.width > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-[#22C55E] bg-[#22C55E]/10 rounded"
                      style={{
                        width: `${(cropArea.width / imageRef.current?.naturalWidth) * 100}%`,
                        height: `${(cropArea.height / imageRef.current?.naturalHeight) * 100}%`,
                      }}
                    ></div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={autoCrop}
                  className="px-4 py-2 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A]"
                >
                  🔍 自动检测
                </button>
                <button
                  onClick={() => setImage(null)}
                  className="px-4 py-2 bg-[#475569] text-[#F8FAFC] rounded-lg hover:bg-[#64748B]"
                >
                  重新上传
                </button>
              </div>
            </div>
          )}

          {/* 裁剪调整 */}
          {image && showCrop && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">调整裁剪区域</h3>
              
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div></div>
                <button onClick={() => adjustCrop('up')} className="p-2 bg-[#475569] rounded text-[#F8FAFC]">↑</button>
                <div></div>
                <button onClick={() => adjustCrop('left')} className="p-2 bg-[#475569] rounded text-[#F8FAFC]">←</button>
                <button onClick={() => adjustCrop('wider')} className="p-2 bg-[#475569] rounded text-[#F8FAFC] text-xs">放宽</button>
                <button onClick={() => adjustCrop('right')} className="p-2 bg-[#475569] rounded text-[#F8FAFC]">→</button>
                <div></div>
                <button onClick={() => adjustCrop('down')} className="p-2 bg-[#475569] rounded text-[#F8FAFC]">↓</button>
                <div></div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => adjustCrop('narrower')} className="p-2 bg-[#475569] rounded text-[#F8FAFC] text-sm">缩窄</button>
                <button onClick={() => adjustCrop('wider')} className="p-2 bg-[#475569] rounded text-[#F8FAFC] text-sm">放宽</button>
                <button onClick={() => adjustCrop('shorter')} className="p-2 bg-[#475569] rounded text-[#F8FAFC] text-sm">缩短</button>
                <button onClick={() => adjustCrop('taller')} className="p-2 bg-[#475569] rounded text-[#F8FAFC] text-sm">拉高</button>
              </div>
            </div>
          )}

          {/* 尺寸选择 */}
          {image && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">证件照规格</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PHOTO_SIZES).map(([name, size]) => (
                  <button
                    key={name}
                    onClick={() => {
                      setPhotoSize(name)
                      if (cropArea.width) {
                        const img = new Image()
                        img.onload = () => drawPreview(img, cropArea)
                        img.src = image.preview
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all text-left ${photoSize === name ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}
                  >
                    <div className="font-semibold text-[#F8FAFC]">{name}</div>
                    <div className="text-sm text-[#94A3B8]">{size.mm}</div>
                    <div className="text-xs text-[#64748B]">{size.width}×{size.height}px</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 背景色选择 */}
          {image && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">背景颜色</h3>
              
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(BG_COLORS).map(([name, color]) => (
                  <button
                    key={name}
                    onClick={() => {
                      setBgColor(color)
                      setBgColorName(name)
                      if (cropArea.width) {
                        const img = new Image()
                        img.onload = () => drawPreview(img, cropArea)
                        img.src = image.preview
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all ${bgColorName === name ? 'border-[#22C55E]' : 'border-[#475569]'}`}
                  >
                    <div className="w-8 h-8 rounded-lg mx-auto mb-2" style={{ backgroundColor: color }}></div>
                    <div className="text-sm font-medium text-[#F8FAFC]">{name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 生成按钮 */}
          {image && cropArea.width > 0 && (
            <button
              onClick={generatePhoto}
              disabled={isProcessing}
              className="w-full py-4 bg-[#22C55E] text-white font-semibold rounded-xl hover:bg-[#16A34A] transition-colors disabled:opacity-50"
            >
              {isProcessing ? '生成中...' : '✨ 一键生成证件照'}
            </button>
          )}
        </div>

        {/* 右侧：结果预览 */}
        <div className="space-y-6">
          {/* 实时预览 */}
          {image && showCrop && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">实时预览</h3>
              <canvas 
                ref={previewCanvasRef}
                className="mx-auto rounded-lg shadow-lg bg-white"
              ></canvas>
              <div className="mt-2 text-center text-sm text-[#94A3B8]">
                {photoSize} · {bgColorName}背景
              </div>
            </div>
          )}

          {/* 最终结果 */}
          {resultImage && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">生成结果</h3>
              <img src={resultImage} alt="证件照" className="mx-auto rounded-lg shadow-lg max-w-full" />
              
              <div className="flex gap-4 mt-4">
                <button
                  onClick={downloadPhoto}
                  className="flex-1 py-3 bg-[#3B82F6] text-white font-semibold rounded-xl hover:bg-[#2563EB]"
                >
                  下载证件照
                </button>
                <button
                  onClick={downloadPrintSheet}
                  className="flex-1 py-3 bg-[#8B5CF6] text-white font-semibold rounded-xl hover:bg-[#7C3AED]"
                >
                  下载排版（8张）
                </button>
              </div>
            </div>
          )}

          {/* 使用说明 */}
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">使用说明</h3>
            <div className="space-y-2 text-sm text-[#94A3B8]">
              <p>1. 上传正面照片，确保面部清晰可见</p>
              <p>2. 点击"自动检测"定位人脸区域</p>
              <p>3. 调整裁剪区域确保头部完整</p>
              <p>4. 选择证件照规格和背景颜色</p>
              <p>5. 生成后可下载单张或排版图</p>
            </div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  )
}

export default PhotoGenerator
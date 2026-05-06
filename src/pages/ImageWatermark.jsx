import { useState, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'
import UploadArea from '../components/UploadArea'

function ImageWatermark() {
  const [image, setImage] = useState(null)
  const [watermarkType, setWatermarkType] = useState('text') // text, image
  const [watermarkText, setWatermarkText] = useState('')
  const [watermarkImage, setWatermarkImage] = useState(null)
  const [position, setPosition] = useState('bottom-right')
  const [opacity, setOpacity] = useState(50)
  const [fontSize, setFontSize] = useState(24)
  const [fontColor, setFontColor] = useState('#FFFFFF')
  const [scale, setScale] = useState(20) // 图片水印缩放比例%
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const mainImageRef = useRef(null)
  const watermarkImageRef = useRef(null)

  // 加载主图片
  useEffect(() => {
    if (image?.file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          mainImageRef.current = img
          updatePreview()
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(image.file)
    } else {
      mainImageRef.current = null
      setPreviewUrl(null)
    }
  }, [image])

  // 加载水印图片
  useEffect(() => {
    if (watermarkImage?.file && watermarkType === 'image') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          watermarkImageRef.current = img
          updatePreview()
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(watermarkImage.file)
    } else {
      watermarkImageRef.current = null
      if (watermarkType === 'image') {
        setPreviewUrl(null)
      }
    }
  }, [watermarkImage, watermarkType])

  // 设置变化时更新预览
  useEffect(() => {
    updatePreview()
  }, [watermarkText, position, opacity, fontSize, fontColor, scale, watermarkType])

  const handleDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file) {
      setImage({
        file,
        name: file.name,
        preview: URL.createObjectURL(file),
      })
    }
  }, [])

  const handleWatermarkImageDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file) {
      setWatermarkImage({
        file,
        preview: URL.createObjectURL(file),
      })
    }
  }, [])

  const clearImage = () => {
    if (image?.preview) URL.revokeObjectURL(image.preview)
    if (watermarkImage?.preview) URL.revokeObjectURL(watermarkImage.preview)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImage(null)
    setWatermarkImage(null)
    setWatermarkText('')
    setPreviewUrl(null)
    mainImageRef.current = null
    watermarkImageRef.current = null
  }

  const getPositionCoords = (imgWidth, imgHeight, wmWidth, wmHeight) => {
    const padding = 20
    const positions = {
      'top-left': { x: padding, y: padding },
      'top-center': { x: (imgWidth - wmWidth) / 2, y: padding },
      'top-right': { x: imgWidth - wmWidth - padding, y: padding },
      'center': { x: (imgWidth - wmWidth) / 2, y: (imgHeight - wmHeight) / 2 },
      'bottom-left': { x: padding, y: imgHeight - wmHeight - padding },
      'bottom-center': { x: (imgWidth - wmWidth) / 2, y: imgHeight - wmHeight - padding },
      'bottom-right': { x: imgWidth - wmWidth - padding, y: imgHeight - wmHeight - padding },
    }
    return positions[position] || positions['bottom-right']
  }

  const updatePreview = () => {
    if (!mainImageRef.current) return
    
    // 检查是否可以生成预览
    if (watermarkType === 'text' && !watermarkText.trim()) {
      setPreviewUrl(image?.preview || null)
      return
    }
    if (watermarkType === 'image' && !watermarkImageRef.current) {
      setPreviewUrl(image?.preview || null)
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = mainImageRef.current.width
    canvas.height = mainImageRef.current.height
    const ctx = canvas.getContext('2d')

    // 绘制主图片
    ctx.drawImage(mainImageRef.current, 0, 0)

    // 设置透明度
    ctx.globalAlpha = opacity / 100

    if (watermarkType === 'text' && watermarkText.trim()) {
      // 文字水印
      ctx.font = `${fontSize}px Arial`
      ctx.fillStyle = fontColor
      
      const textWidth = ctx.measureText(watermarkText).width
      const textHeight = fontSize
      const coords = getPositionCoords(canvas.width, canvas.height, textWidth, textHeight)
      
      ctx.fillText(watermarkText, coords.x, coords.y + textHeight)
    } else if (watermarkType === 'image' && watermarkImageRef.current) {
      // 图片水印
      const wmWidth = watermarkImageRef.current.width * (scale / 100)
      const wmHeight = watermarkImageRef.current.height * (scale / 100)
      const coords = getPositionCoords(canvas.width, canvas.height, wmWidth, wmHeight)
      
      ctx.drawImage(watermarkImageRef.current, coords.x, coords.y, wmWidth, wmHeight)
    }

    ctx.globalAlpha = 1

    // 生成预览 URL
    const newPreviewUrl = canvas.toDataURL('image/png')
    if (previewUrl && previewUrl !== image?.preview) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(newPreviewUrl)
  }

  const addWatermark = async () => {
    if (!image || !previewUrl) return
    setIsProcessing(true)

    try {
      // 直接从预览 URL 下载
      const link = document.createElement('a')
      link.href = previewUrl
      link.download = `watermarked-${image.name}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setIsProcessing(false)
    } catch (error) {
      console.error('下载失败:', error)
      setIsProcessing(false)
    }
  }

  const canDownload = watermarkType === 'text' 
    ? watermarkText.trim() !== '' 
    : watermarkImage !== null

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回工具列表
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#F8FAFC] mb-2">图片加水印</h1>
        <p className="text-[#94A3B8]">为图片添加文字或图片水印，支持实时预览</p>
      </div>

      {/* 主图上传 */}
      {!image && <UploadArea onDrop={handleDrop} accept="image/*" text="拖拽或点击上传主图片" />}

      {image && (
        <div className="space-y-6">
          {/* 预览区域 */}
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-4 border border-[#475569]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-[#F8FAFC]">预览效果</h3>
              <button onClick={clearImage} className="text-[#DC2626] hover:text-[#B91C1C] text-sm">
                清除图片
              </button>
            </div>
            <div className="flex justify-center">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="预览" 
                  className="max-w-full max-h-[400px] rounded-lg shadow-lg"
                />
              ) : (
                <img 
                  src={image.preview} 
                  alt={image.name} 
                  className="max-w-full max-h-[400px] rounded-lg"
                />
              )}
            </div>
          </div>

          {/* 水印设置 */}
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">水印设置</h3>
            
            {/* 水印类型 */}
            <div className="mb-4">
              <label className="text-[#94A3B8] text-sm mb-2 block">水印类型：</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setWatermarkType('text')}
                  className={`px-4 py-2 rounded-lg transition-all ${watermarkType === 'text' ? 'bg-[#22C55E] text-[#0F172A]' : 'bg-[#334155] text-[#F8FAFC]'}`}
                >
                  文字水印
                </button>
                <button
                  onClick={() => setWatermarkType('image')}
                  className={`px-4 py-2 rounded-lg transition-all ${watermarkType === 'image' ? 'bg-[#22C55E] text-[#0F172A]' : 'bg-[#334155] text-[#F8FAFC]'}`}
                >
                  图片水印
                </button>
              </div>
            </div>

            {/* 文字水印设置 */}
            {watermarkType === 'text' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[#94A3B8] text-sm mb-1 block">水印文字：</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="输入水印文字"
                    className="w-full bg-[#334155] text-[#F8FAFC] px-4 py-2 rounded-lg border border-[#475569] focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#94A3B8] text-sm mb-1 block">字体大小：</label>
                    <input
                      type="range"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      min="12"
                      max="100"
                      className="w-full"
                    />
                    <span className="text-[#F8FAFC] text-sm">{fontSize}px</span>
                  </div>
                  <div>
                    <label className="text-[#94A3B8] text-sm mb-1 block">文字颜色：</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={fontColor}
                        onChange={(e) => setFontColor(e.target.value)}
                        className="bg-[#334155] rounded-lg border border-[#475569] w-12 h-10 cursor-pointer"
                      />
                      <span className="text-[#F8FAFC] text-sm mt-2">{fontColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 图片水印设置 */}
            {watermarkType === 'image' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[#94A3B8] text-sm mb-2 block">水印图片：</label>
                  {watermarkImage ? (
                    <div className="flex items-center gap-2">
                      <img src={watermarkImage.preview} alt="水印" className="w-16 h-16 object-contain rounded border border-[#475569]" />
                      <button onClick={() => setWatermarkImage(null)} className="text-[#DC2626] text-sm">清除</button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (file) setWatermarkImage({ file, preview: URL.createObjectURL(file) })
                      }}
                      className="bg-[#334155] text-[#F8FAFC] px-4 py-2 rounded-lg border border-[#475569] w-full"
                    />
                  )}
                </div>
                <div>
                  <label className="text-[#94A3B8] text-sm mb-1 block">缩放比例：</label>
                  <input
                    type="range"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    min="5"
                    max="100"
                    className="w-full"
                  />
                  <span className="text-[#F8FAFC] text-sm">{scale}%</span>
                </div>
              </div>
            )}

            {/* 通用设置 */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-[#94A3B8] text-sm mb-1 block">位置：</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full bg-[#334155] text-[#F8FAFC] px-4 py-2 rounded-lg border border-[#475569] focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                >
                  <option value="top-left">左上角</option>
                  <option value="top-center">顶部居中</option>
                  <option value="top-right">右上角</option>
                  <option value="center">居中</option>
                  <option value="bottom-left">左下角</option>
                  <option value="bottom-center">底部居中</option>
                  <option value="bottom-right">右下角</option>
                </select>
              </div>
              <div>
                <label className="text-[#94A3B8] text-sm mb-1 block">透明度：</label>
                <input
                  type="range"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  min="10"
                  max="100"
                  className="w-full"
                />
                <span className="text-[#F8FAFC] text-sm">{opacity}%</span>
              </div>
            </div>
          </div>

          {/* 下载按钮 */}
          <button
            onClick={addWatermark}
            disabled={isProcessing || !canDownload}
            className="w-full px-6 py-3 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '下载中...' : '下载水印图片'}
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageWatermark
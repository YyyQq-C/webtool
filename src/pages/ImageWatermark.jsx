import { useState, useCallback } from 'react'
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
    setImage(null)
    setWatermarkImage(null)
    setWatermarkText('')
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

  const addWatermark = async () => {
    if (!image) return
    setIsProcessing(true)

    try {
      // 加载主图片
      const mainImage = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = e.target.result
        }
        reader.onerror = reject
        reader.readAsDataURL(image.file)
      })

      const canvas = document.createElement('canvas')
      canvas.width = mainImage.width
      canvas.height = mainImage.height
      const ctx = canvas.getContext('2d')

      // 绘制主图片
      ctx.drawImage(mainImage, 0, 0)

      // 设置透明度
      ctx.globalAlpha = opacity / 100

      if (watermarkType === 'text' && watermarkText) {
        // 文字水印
        ctx.font = `${fontSize}px Arial`
        ctx.fillStyle = fontColor
        
        const textWidth = ctx.measureText(watermarkText).width
        const textHeight = fontSize
        const coords = getPositionCoords(canvas.width, canvas.height, textWidth, textHeight)
        
        ctx.fillText(watermarkText, coords.x, coords.y + textHeight)
      } else if (watermarkType === 'image' && watermarkImage) {
        // 图片水印
        const wmImg = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = e.target.result
          }
          reader.onerror = reject
          reader.readAsDataURL(watermarkImage.file)
        })

        const wmWidth = wmImg.width * (scale / 100)
        const wmHeight = wmImg.height * (scale / 100)
        const coords = getPositionCoords(canvas.width, canvas.height, wmWidth, wmHeight)
        
        ctx.drawImage(wmImg, coords.x, coords.y, wmWidth, wmHeight)
      }

      ctx.globalAlpha = 1

      // 下载
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `watermarked-${image.name}`)
        }
        setIsProcessing(false)
      }, 'image/png')
    } catch (error) {
      console.error('加水印失败:', error)
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回工具列表
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#F8FAFC] mb-2">图片加水印</h1>
        <p className="text-[#94A3B8]">为图片添加文字或图片水印，保护版权</p>
      </div>

      {/* 主图上传 */}
      {!image && <UploadArea onDrop={handleDrop} accept="image/*" text="拖拽或点击上传主图片" />}

      {image && (
        <div className="space-y-6">
          {/* 主图预览 */}
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-4 border border-[#475569]">
            <div className="flex items-start gap-4">
              <img src={image.preview} alt={image.name} className="max-w-xs rounded-lg" />
              <div className="flex-grow">
                <p className="text-[#F8FAFC] font-medium">{image.name}</p>
                <button onClick={clearImage} className="mt-2 text-[#DC2626] hover:text-[#B91C1C] text-sm">
                  清除图片
                </button>
              </div>
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
                <div className="flex gap-4">
                  <div>
                    <label className="text-[#94A3B8] text-sm mb-1 block">字体大小：</label>
                    <input
                      type="number"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      min="12"
                      max="100"
                      className="bg-[#334155] text-[#F8FAFC] px-3 py-2 rounded-lg border border-[#475569] w-24 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                    />
                  </div>
                  <div>
                    <label className="text-[#94A3B8] text-sm mb-1 block">文字颜色：</label>
                    <input
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      className="bg-[#334155] rounded-lg border border-[#475569] w-12 h-10 cursor-pointer"
                    />
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
                    type="number"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    min="5"
                    max="100"
                    className="bg-[#334155] text-[#F8FAFC] px-3 py-2 rounded-lg border border-[#475569] w-24 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                  />
                  <span className="text-[#94A3B8] ml-2">%</span>
                </div>
              </div>
            )}

            {/* 通用设置 */}
            <div className="flex gap-4 mt-4">
              <div>
                <label className="text-[#94A3B8] text-sm mb-1 block">位置：</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="bg-[#334155] text-[#F8FAFC] px-4 py-2 rounded-lg border border-[#475569] focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
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
                  type="number"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  min="10"
                  max="100"
                  className="bg-[#334155] text-[#F8FAFC] px-3 py-2 rounded-lg border border-[#475569] w-24 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                />
                <span className="text-[#94A3B8] ml-2">%</span>
              </div>
            </div>
          </div>

          {/* 生成按钮 */}
          <button
            onClick={addWatermark}
            disabled={isProcessing || (watermarkType === 'text' && !watermarkText) || (watermarkType === 'image' && !watermarkImage)}
            className="w-full px-6 py-3 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '处理中...' : '生成水印图片'}
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageWatermark
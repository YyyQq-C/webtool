import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'
import UploadArea from '../components/UploadArea'

function ImageShape() {
  const [image, setImage] = useState(null)
  const [shape, setShape] = useState('circle') // circle, rounded, heart, star
  const [radius, setRadius] = useState(50) // 圆角半径%
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

  const clearImage = () => {
    if (image?.preview) URL.revokeObjectURL(image.preview)
    setImage(null)
  }

  const drawHeart = (ctx, x, y, size) => {
    ctx.beginPath()
    const topCurveHeight = size * 0.3
    ctx.moveTo(x, y + topCurveHeight)
    // 左上曲线
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight)
    // 左下曲线
    ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 2, x, y + size)
    // 右下曲线
    ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight)
    // 右上曲线
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight)
    ctx.closePath()
  }

  const drawStar = (ctx, cx, cy, outerRadius, innerRadius, points) => {
    ctx.beginPath()
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const angle = (i * Math.PI) / points - Math.PI / 2
      const x = cx + Math.cos(angle) * radius
      const y = cy + Math.sin(angle) * radius
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
  }

  const applyShape = async () => {
    if (!image) return
    setIsProcessing(true)

    try {
      const img = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const image = new Image()
          image.onload = () => resolve(image)
          image.onerror = reject
          image.src = e.target.result
        }
        reader.onerror = reject
        reader.readAsDataURL(image.file)
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const size = Math.min(img.width, img.height)
      canvas.width = size
      canvas.height = size

      // 创建裁剪路径
      ctx.beginPath()

      if (shape === 'circle') {
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      } else if (shape === 'rounded') {
        const r = size * (radius / 100)
        ctx.moveTo(r, 0)
        ctx.lineTo(size - r, 0)
        ctx.arcTo(size, 0, size, r, r)
        ctx.lineTo(size, size - r)
        ctx.arcTo(size, size, size - r, r)
        ctx.lineTo(r, size)
        ctx.arcTo(0, size, 0, size - r, r)
        ctx.lineTo(0, r)
        ctx.arcTo(0, 0, r, 0)
      } else if (shape === 'heart') {
        drawHeart(ctx, size / 2, size * 0.1, size * 0.8)
      } else if (shape === 'star') {
        drawStar(ctx, size / 2, size / 2, size / 2, size / 4, 5)
      }

      ctx.closePath()
      ctx.clip()

      // 计算裁剪位置（居中）
      const offsetX = (img.width - size) / 2
      const offsetY = (img.height - size) / 2
      ctx.drawImage(img, -offsetX, -offsetY)

      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `shaped-${shape}-${image.name.replace(/\.[^/.]+$/, '.png')}`)
        }
        setIsProcessing(false)
      }, 'image/png')
    } catch (error) {
      console.error('裁切失败:', error)
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
        <h1 className="text-4xl font-bold text-[#F8FAFC] mb-2">图片形状裁切</h1>
        <p className="text-[#94A3B8]">将图片裁切为圆形、圆角矩形、爱心、星形等形状</p>
      </div>

      {!image && <UploadArea onDrop={handleDrop} accept="image/*" text="拖拽或点击上传图片" />}

      {image && (
        <div className="space-y-6">
          {/* 图片预览 */}
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

          {/* 形状设置 */}
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">形状设置</h3>

            <div className="mb-4">
              <label className="text-[#94A3B8] text-sm mb-2 block">选择形状：</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'circle', name: '圆形', icon: '⚫' },
                  { id: 'rounded', name: '圆角矩形', icon: '🔲' },
                  { id: 'heart', name: '爱心', icon: '❤️' },
                  { id: 'star', name: '五角星', icon: '⭐' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setShape(s.id)}
                    className={`px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${shape === s.id ? 'bg-[#22C55E] text-[#0F172A]' : 'bg-[#334155] text-[#F8FAFC]'}`}
                  >
                    <span className="text-xl">{s.icon}</span>
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {shape === 'rounded' && (
              <div>
                <label className="text-[#94A3B8] text-sm mb-1 block">圆角半径：</label>
                <input
                  type="range"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  min="5"
                  max="50"
                  className="w-full accent-[#22C55E]"
                />
                <span className="text-[#94A3B8]">{radius}%</span>
              </div>
            )}
          </div>

          {/* 生成按钮 */}
          <button
            onClick={applyShape}
            disabled={isProcessing}
            className="w-full px-6 py-3 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '处理中...' : '生成裁切图片'}
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageShape
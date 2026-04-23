import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'

function ImageWatermarkRemover() {
  const [image, setImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [brushSize, setBrushSize] = useState(20)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('manual') // 'manual' | 'auto'

  const canvasRef = useRef(null)
  const maskCanvasRef = useRef(null)
  const containerRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })

  // 处理文件上传
  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('请上传图片文件')
      return
    }

    setError('')
    setResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        setImage({
          file,
          name: file.name,
          size: file.size,
          preview: e.target.result,
          width: img.width,
          height: img.height,
        })
        setImageSize({ width: img.width, height: img.height })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) handleFile(acceptedFiles[0])
  }, [handleFile])

  // 更新显示尺寸
  useEffect(() => {
    if (!image || !containerRef.current) return

    const container = containerRef.current
    const maxWidth = container.clientWidth - 32
    const maxHeight = 500

    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
    setDisplaySize({
      width: image.width * scale,
      height: image.height * scale,
    })
  }, [image])

  // 初始化 Canvas
  useEffect(() => {
    if (!image || !canvasRef.current || !maskCanvasRef.current) return

    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current

    canvas.width = displaySize.width
    canvas.height = displaySize.height
    maskCanvas.width = displaySize.width
    maskCanvas.height = displaySize.height

    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, displaySize.width, displaySize.height)
    }
    img.src = image.preview

    // 清空 mask canvas
    const maskCtx = maskCanvas.getContext('2d')
    maskCtx.clearRect(0, 0, displaySize.width, displaySize.height)
  }, [image, displaySize])

  // 获取鼠标位置
  const getPosition = useCallback((e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  // 绘制
  const draw = useCallback((e) => {
    if (!isDrawing) return
    e.preventDefault()

    const maskCanvas = maskCanvasRef.current
    const maskCtx = maskCanvas.getContext('2d')
    const { x, y } = getPosition(e)

    maskCtx.fillStyle = 'rgba(255, 0, 0, 0.5)'
    maskCtx.beginPath()
    maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    maskCtx.fill()
  }, [isDrawing, brushSize, getPosition])

  const startDrawing = useCallback((e) => {
    setIsDrawing(true)
    draw(e)
  }, [draw])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  // 清除标记
  const clearMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return
    const maskCtx = maskCanvas.getContext('2d')
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)

    // 重绘原图
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, displaySize.width, displaySize.height)
    }
    img.src = image.preview
  }, [image, displaySize])

  // 去除水印
  const removeWatermark = useCallback(async () => {
    if (!image) return

    setIsProcessing(true)
    setError('')

    try {
      // 获取 mask
      const maskCanvas = maskCanvasRef.current
      const maskCtx = maskCanvas.getContext('2d')
      const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)

      // 检查是否有标记
      let hasMask = false
      for (let i = 0; i < maskData.data.length; i += 4) {
        if (maskData.data[i + 3] > 0) {
          hasMask = true
          break
        }
      }

      if (!hasMask) {
        setError('请先用画笔标记水印区域')
        setIsProcessing(false)
        return
      }

      // 创建原图的完整尺寸 mask
      const fullMaskCanvas = document.createElement('canvas')
      fullMaskCanvas.width = imageSize.width
      fullMaskCanvas.height = imageSize.height
      const fullMaskCtx = fullMaskCanvas.getContext('2d')
      fullMaskCtx.drawImage(maskCanvas, 0, 0, imageSize.width, imageSize.height)
      const fullMaskData = fullMaskCtx.getImageData(0, 0, imageSize.width, imageSize.height)

      // 将 mask 数据转换为服务器需要的格式
      const maskBlob = await new Promise(resolve => {
        fullMaskCanvas.toBlob(resolve, 'image/png')
      })

      const formData = new FormData()
      formData.append('image', image.file)
      formData.append('mask', maskBlob, 'mask.png')
      formData.append('mode', mode)

      const res = await fetch('/bg-api/api/remove-watermark', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `处理失败 (${res.status})`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setResult(url)
    } catch (err) {
      setError(err.message || '处理失败')
    } finally {
      setIsProcessing(false)
    }
  }, [image, imageSize, mode])

  // 下载结果
  const downloadResult = useCallback(() => {
    if (!result) return
    const name = image.name.replace(/\.[^/.]+$/, '')
    saveAs(result, `${name}-no-watermark.png`)
  }, [result, image])

  // 清空
  const clearAll = useCallback(() => {
    if (image?.preview) URL.revokeObjectURL(image.preview)
    if (result) URL.revokeObjectURL(result)
    setImage(null)
    setResult(null)
    setError('')
  }, [image, result])

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回工具列表
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#F8FAFC] mb-2">图片去水印</h1>
        <p className="text-[#94A3B8]">用画笔标记水印区域，AI 智能去除</p>
      </div>

      {/* 操作栏 */}
      {image && !result && (
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 mb-6 border border-[#475569]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[#94A3B8] text-sm">画笔大小：</span>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-[#F8FAFC] text-sm w-10">{brushSize}px</span>
              </div>
              <button
                onClick={clearMask}
                className="px-4 py-2 bg-[#475569] hover:bg-[#64748B] text-white rounded-lg transition-colors text-sm"
                type="button"
              >
                清除标记
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={clearAll}
                className="px-6 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg transition-colors"
                type="button"
              >
                清空
              </button>
              <button
                onClick={removeWatermark}
                disabled={isProcessing}
                className="px-6 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {isProcessing ? '处理中...' : '去除水印'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* 上传区域 */}
      {!image && (
        <div
          className="relative border-2 border-dashed border-[#475569] bg-[#1E293B]/40 hover:border-[#22C55E] hover:bg-[#1E293B]/60 rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
            if (files.length > 0) handleDrop(files)
          }}
          onClick={() => document.getElementById('watermark-file-input').click()}
        >
          <input
            id="watermark-file-input"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const files = Array.from(e.target.files)
              if (files.length > 0) handleFile(files[0])
              e.target.value = ''
            }}
            className="hidden"
          />
          <div className="text-6xl mb-4">💧</div>
          <p className="text-xl font-medium text-[#F8FAFC] mb-2">拖拽图片到这里</p>
          <p className="text-[#94A3B8]">或点击选择文件</p>
        </div>
      )}

      {/* 编辑区域 */}
      {image && !result && (
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl border border-[#475569] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#475569] flex items-center justify-between">
            <div>
              <h3 className="text-[#F8FAFC] font-semibold">标记水印区域</h3>
              <p className="text-[#94A3B8] text-sm">用红色画笔涂抹水印位置</p>
            </div>
            <span className="text-[#64748B] text-sm">{image.name} ({formatFileSize(image.size)})</span>
          </div>
          <div ref={containerRef} className="p-4 flex justify-center">
            <div className="relative inline-block">
              <canvas
                ref={canvasRef}
                className="border border-[#475569] rounded-lg"
                style={{ touchAction: 'none' }}
              />
              <canvas
                ref={maskCanvasRef}
                className="absolute top-0 left-0 cursor-crosshair"
                style={{ touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          </div>
        </div>
      )}

      {/* 结果预览 */}
      {result && (
        <div className="space-y-6">
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-[#F8FAFC] font-semibold">去水印结果</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    URL.revokeObjectURL(result)
                    setResult(null)
                  }}
                  className="px-4 py-2 bg-[#475569] hover:bg-[#64748B] text-white rounded-lg transition-colors"
                  type="button"
                >
                  重新编辑
                </button>
                <button
                  onClick={downloadResult}
                  className="px-6 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all"
                  type="button"
                >
                  下载图片
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl border border-[#475569] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#475569]">
                <h3 className="text-[#F8FAFC] font-semibold">原图</h3>
              </div>
              <div className="p-4">
                <img src={image.preview} alt="原图" className="w-full h-auto rounded-lg" />
              </div>
            </div>

            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl border border-[#475569] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#475569]">
                <h3 className="text-[#F8FAFC] font-semibold">去水印后</h3>
              </div>
              <div className="p-4">
                <img src={result} alt="去水印" className="w-full h-auto rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-12 bg-[#1E293B]/40 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
        <h3 className="text-lg font-semibold text-[#F8FAFC] mb-3">使用说明</h3>
        <ul className="space-y-2 text-[#94A3B8]">
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">1.</span>
            <span>上传需要去除水印的图片</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">2.</span>
            <span>调整画笔大小，用红色画笔涂抹水印区域</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">3.</span>
            <span>点击"去除水印"按钮，AI 将智能修复标记区域</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">4.</span>
            <span>预览结果，满意后下载</span>
          </li>
        </ul>
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-300 text-sm">
            💡 提示：尽量精确标记水印区域，不要标记到不需要修改的部分，这样效果会更好。
          </p>
        </div>
      </div>
    </div>
  )
}

export default ImageWatermarkRemover
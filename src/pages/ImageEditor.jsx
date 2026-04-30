import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import UploadArea, { isImageFile } from '../components/UploadArea'

// ============================================================================
// 常量预设
// ============================================================================

const BORDER_PRESETS = [
  { name: '无边框', color: '', width: 0 },
  { name: '白色细边', color: '#FFFFFF', width: 10 },
  { name: '白色粗边', color: '#FFFFFF', width: 30 },
  { name: '黑色细边', color: '#000000', width: 10 },
  { name: '黑色粗边', color: '#000000', width: 30 },
  { name: '灰色边框', color: '#E5E7EB', width: 20 },
  { name: '渐变边框', color: 'gradient', width: 20 },
]

const FILTER_PRESETS = [
  { name: '原图', id: 'original', desc: '不添加滤镜' },
  { name: '复古', id: 'vintage', desc: '怀旧老照片风格' },
  { name: '黑白', id: 'grayscale', desc: '黑白照片效果' },
  { name: '模糊', id: 'blur', desc: '轻度模糊效果' },
  { name: '暖色调', id: 'warm', desc: '暖色温馨氛围' },
  { name: '冷色调', id: 'cool', desc: '冷色清新感觉' },
]

const ANNOTATE_TOOLS = [
  { id: 'text', name: '📝 文字', desc: '点击添加文字' },
  { id: 'arrow', name: '➡️ 箭头', desc: '拖拽画箭头' },
  { id: 'rect', name: '⬜ 矩形框', desc: '拖拽画框' },
  { id: 'highlight', name: '🔆 高亮', desc: '拖拽高亮区域' },
]

// ============================================================================
// 工具 Tab 定义
// ============================================================================

const TABS = [
  { id: 'enhance', name: '编辑增强', icon: '✨' },
  { id: 'annotate', name: '文字标注', icon: '✏️' },
]

// ============================================================================
// 箭头绘制工具函数
// ============================================================================

function drawArrow(ctx, fromX, fromY, toX, toY, color) {
  const headLength = 15
  const dx = toX - fromX
  const dy = toY - fromY
  const angle = Math.atan2(dy, dx)

  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(toX, toY)
  ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6))
  ctx.moveTo(toX, toY)
  ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6))
  ctx.stroke()
}

// ============================================================================
// 主组件
// ============================================================================

function ImageEditor() {
  const [activeTab, setActiveTab] = useState('enhance')

  // 图片状态
  const [image, setImage] = useState(null)

  // ---- 增强设置 ----
  const [borderColor, setBorderColor] = useState('#FFFFFF')
  const [borderWidth, setBorderWidth] = useState(0)
  const [radius, setRadius] = useState(0)
  const [shadow, setShadow] = useState({ enabled: false, blur: 20, color: '#000000', opacity: 30 })
  const [filter, setFilter] = useState(FILTER_PRESETS[0])

  // ---- 标注设置 ----
  const [annotations, setAnnotations] = useState([])
  const [annotateTool, setAnnotateTool] = useState('text')
  const [textContent, setTextContent] = useState('')
  const [fontSize, setFontSize] = useState(24)
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [textBgColor, setTextBgColor] = useState('#EF4444')
  const [arrowColor, setArrowColor] = useState('#F97316')
  const [rectColor, setRectColor] = useState('#22C55E')
  const [highlightColor, setHighlightColor] = useState('#FBBF2480')
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState(null)

  // 结果
  const [resultImage, setResultImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const canvasRef = useRef(null)
  const previewCanvasRef = useRef(null)
  const hiddenImgRef = useRef(null)
  const containerRef = useRef(null)

  // ========================================================================
  // 图片上传
  // ========================================================================

  const handleFile = useCallback((file) => {
    if (!file) return
    if (!isImageFile(file)) {
      alert('请上传图片文件')
      return
    }
    setImage({ file, name: file.name, preview: URL.createObjectURL(file) })
    setResultImage(null)
    setAnnotations([])
  }, [])

  const handleDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) handleFile(acceptedFiles[0])
  }, [handleFile])

  const resetImage = useCallback(() => {
    setImage(null)
    setResultImage(null)
    setAnnotations([])
  }, [])

  // ========================================================================
  // 增强：应用效果
  // ========================================================================

  const applyEnhance = useCallback(() => {
    if (!image) return
    setIsProcessing(true)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      const totalW = img.width + borderWidth * 2
      const totalH = img.height + borderWidth * 2
      canvas.width = totalW
      canvas.height = totalH

      // 阴影
      if (shadow.enabled) {
        ctx.shadowColor = shadow.color
        ctx.shadowBlur = shadow.blur
        ctx.shadowOffsetX = 5
        ctx.shadowOffsetY = 5
      }

      // 边框背景
      if (borderColor === 'gradient' || borderColor) {
        if (borderColor === 'gradient') {
          const g = ctx.createLinearGradient(0, 0, totalW, totalH)
          g.addColorStop(0, '#F97316')
          g.addColorStop(0.5, '#EC4899')
          g.addColorStop(1, '#8B5CF6')
          ctx.fillStyle = g
        } else {
          ctx.fillStyle = borderColor
        }
      }

      // 圆角
      if (radius > 0) {
        ctx.beginPath()
        ctx.roundRect(0, 0, totalW, totalH, radius)
        ctx.fill()
        ctx.shadowColor = 'transparent'
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(borderWidth, borderWidth, img.width, img.height, radius)
        ctx.clip()
        ctx.drawImage(img, borderWidth, borderWidth)
        ctx.restore()
      } else {
        if (borderColor) ctx.fillRect(0, 0, totalW, totalH)
        ctx.shadowColor = 'transparent'
        ctx.drawImage(img, borderWidth, borderWidth)
      }

      // 滤镜
      if (filter.id !== 'original') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        switch (filter.id) {
          case 'grayscale':
            for (let i = 0; i < data.length; i += 4) {
              const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
              data[i] = data[i + 1] = data[i + 2] = gray
            }
            break
          case 'vintage':
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.min(255, data[i] * 1.2 + 30)
              data[i + 1] = Math.min(255, data[i + 1] * 0.9)
              data[i + 2] = Math.min(255, data[i + 2] * 0.8)
            }
            break
          case 'warm':
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.min(255, data[i] + 20)
              data[i + 1] = Math.min(255, data[i + 1] + 10)
            }
            break
          case 'cool':
            for (let i = 0; i < data.length; i += 4) {
              data[i + 2] = Math.min(255, data[i + 2] + 20)
              data[i] = Math.max(0, data[i] - 10)
            }
            break
          case 'blur':
            ctx.filter = 'blur(2px)'
            ctx.drawImage(canvas, 0, 0)
            ctx.filter = 'none'
            break
        }
        if (filter.id !== 'blur') ctx.putImageData(imageData, 0, 0)
      }

      setResultImage(canvas.toDataURL('image/png'))
      setIsProcessing(false)
    }
    img.src = image.preview
  }, [image, borderWidth, borderColor, radius, shadow, filter])

  // ========================================================================
  // 标注：在增强结果或原图上绘制
  // ========================================================================

  /** 获取标注源（增强结果优先，否则用原图） */
  const getAnnotateSource = () => {
    return resultImage || (image ? image.preview : null)
  }

  // 初始化标注画布
  useEffect(() => {
    const src = getAnnotateSource()
    if (!src || !canvasRef.current) return

    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      if (annotations.length > 0) renderAnnotations()
    }
    img.src = src
  }, [resultImage, image, activeTab])

  /** 在标注 canvas 上绘制所有标注 */
  const renderAnnotations = useCallback((currentPos = null) => {
    const canvas = canvasRef.current
    if (!canvas || !hiddenImgRef.current) return

    const ctx = canvas.getContext('2d')

    // 重绘源图
    ctx.drawImage(hiddenImgRef.current, 0, 0, canvas.width, canvas.height)

    // 绘制已保存的标注
    annotations.forEach(ann => {
      switch (ann.type) {
        case 'text': {
          ctx.font = `bold ${ann.fontSize}px sans-serif`
          const tw = ctx.measureText(ann.content).width + 20
          ctx.fillStyle = ann.bgColor
          ctx.fillRect(ann.x - 10, ann.y - ann.fontSize - 5, tw, ann.fontSize + 10)
          ctx.fillStyle = ann.color
          ctx.fillText(ann.content, ann.x, ann.y)
          break
        }
        case 'arrow':
          drawArrow(ctx, ann.startX, ann.startY, ann.endX, ann.endY, ann.color)
          break
        case 'rect':
          ctx.strokeStyle = ann.color
          ctx.lineWidth = 3
          ctx.strokeRect(ann.startX, ann.startY, ann.endX - ann.startX, ann.endY - ann.startY)
          break
        case 'highlight':
          ctx.fillStyle = ann.color
          ctx.fillRect(ann.startX, ann.startY, ann.endX - ann.startX, ann.endY - ann.startY)
          break
      }
    })

    // 绘制正在拖拽的标注
    if (currentPos && startPos) {
      switch (annotateTool) {
        case 'arrow':
          drawArrow(ctx, startPos.x, startPos.y, currentPos.x, currentPos.y, arrowColor)
          break
        case 'rect':
          ctx.strokeStyle = rectColor
          ctx.lineWidth = 3
          ctx.strokeRect(startPos.x, startPos.y, currentPos.x - startPos.x, currentPos.y - startPos.y)
          break
        case 'highlight':
          ctx.fillStyle = highlightColor
          ctx.fillRect(startPos.x, startPos.y, currentPos.x - startPos.x, currentPos.y - startPos.y)
          break
      }
    }
  }, [annotations, startPos, annotateTool, arrowColor, rectColor, highlightColor])

  // ========================================================================
  // 标注交互
  // ========================================================================

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const handleClickCanvas = (e) => {
    if (annotateTool !== 'text' || !textContent) return
    const pos = getCanvasPos(e)
    setAnnotations(prev => [...prev, {
      type: 'text', x: pos.x, y: pos.y,
      content: textContent, fontSize, color: textColor, bgColor: textBgColor,
    }])
    renderAnnotations()
  }

  const handleMouseDownCanvas = (e) => {
    if (annotateTool === 'text') return
    setIsDrawing(true)
    setStartPos(getCanvasPos(e))
  }

  const handleMouseMoveCanvas = (e) => {
    if (!isDrawing || annotateTool === 'text') return
    renderAnnotations(getCanvasPos(e))
  }

  const handleMouseUpCanvas = (e) => {
    if (!isDrawing || annotateTool === 'text') return
    const endPos = getCanvasPos(e)
    setAnnotations(prev => [...prev, {
      type: annotateTool,
      startX: startPos.x, startY: startPos.y,
      endX: endPos.x, endY: endPos.y,
      color: annotateTool === 'arrow' ? arrowColor : annotateTool === 'rect' ? rectColor : highlightColor,
    }])
    setIsDrawing(false)
    setStartPos(null)
    renderAnnotations()
  }

  const undoAnnotation = () => {
    setAnnotations(prev => prev.slice(0, -1))
    renderAnnotations()
  }

  const clearAnnotations = () => {
    setAnnotations([])
    renderAnnotations()
  }

  const exportImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `编辑图片_${Date.now()}.png`
    link.click()
  }

  const downloadEnhance = () => {
    if (!resultImage) return
    const link = document.createElement('a')
    link.href = resultImage
    link.download = `增强图片_${Date.now()}.png`
    link.click()
  }

  // ========================================================================
  // 渲染
  // ========================================================================

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 返回 */}
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        返回首页
      </Link>

      {/* 标题 */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">图片编辑</h1>
        <p className="text-[#94A3B8]">增强滤镜 + 文字标注，一站式图片处理</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6 justify-center">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all text-sm ${
              activeTab === tab.id
                ? 'bg-[#22C55E] text-white shadow-lg shadow-green-500/20'
                : 'bg-[#1E293B] text-[#94A3B8] hover:text-white border border-[#475569]'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.name}
          </button>
        ))}
      </div>

      {/* 未上传图片：共享上传区 */}
      {!image && (
        <div className="max-w-2xl mx-auto">
          <UploadArea onDrop={handleDrop} accept={{ 'image/*': [] }} maxFiles={1} />
        </div>
      )}

      {/* 已上传：分 Tab 渲染 */}
      {image && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ==================== 左侧：控制面板 ==================== */}
          <aside className="lg:col-span-1 space-y-4">

            {/* 重新上传 */}
            <button
              onClick={resetImage}
              className="w-full py-2 bg-[#475569] text-[#F8FAFC] rounded-lg hover:bg-[#64748B] transition-colors"
            >
              重新上传
            </button>

            {/* ======== Tab: 编辑增强 ======== */}
            {activeTab === 'enhance' && (
              <>
                {/* 边框 */}
                <section className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4">
                  <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3">🖼️ 边框设置</h3>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {BORDER_PRESETS.slice(0, 6).map(p => (
                      <button
                        key={p.name}
                        onClick={() => {
                          setBorderColor(p.color === 'gradient' ? 'gradient' : p.color)
                          setBorderWidth(p.width)
                        }}
                        className={`p-2 rounded-lg border transition-all text-xs ${
                          borderWidth === p.width && borderColor === (p.color === 'gradient' ? 'gradient' : p.color)
                            ? 'bg-[#22C55E]/20 border-[#22C55E]'
                            : 'bg-[#475569]/20 border-[#475569]'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  {/* 渐变边框 */}
                  <button
                    onClick={() => { setBorderColor('gradient'); setBorderWidth(20) }}
                    className={`w-full p-2 rounded-lg border transition-all text-xs mb-3 ${
                      borderColor === 'gradient' ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'
                    }`}
                  >
                    🌈 渐变边框
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#94A3B8]">宽度</span>
                    <input type="range" min="0" max="50" value={borderWidth}
                      onChange={e => setBorderWidth(parseInt(e.target.value))}
                      className="flex-1 accent-[#22C55E]" />
                    <span className="text-xs text-[#F8FAFC] w-8 text-right">{borderWidth}px</span>
                  </div>
                </section>

                {/* 圆角 */}
                <section className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4">
                  <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3">⬜ 圆角效果</h3>
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="100" value={radius}
                      onChange={e => setRadius(parseInt(e.target.value))}
                      className="flex-1 accent-[#22C55E]" />
                    <span className="text-xs text-[#F8FAFC] w-8 text-right">{radius}px</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {[0, 10, 20, 50].map(r => (
                      <button key={r} onClick={() => setRadius(r)}
                        className={`px-3 py-1 rounded-lg text-xs ${
                          radius === r ? 'bg-[#22C55E] text-white' : 'bg-[#475569] text-[#F8FAFC]'
                        }`}>
                        {r === 0 ? '无' : `${r}px`}
                      </button>
                    ))}
                  </div>
                </section>

                {/* 阴影 */}
                <section className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4">
                  <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3">🌑 阴影效果</h3>
                  <label className="flex items-center gap-3 mb-3 cursor-pointer">
                    <input type="checkbox" checked={shadow.enabled}
                      onChange={e => setShadow(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="w-5 h-5 accent-[#22C55E]" />
                    <span className="text-sm text-[#F8FAFC]">启用阴影</span>
                  </label>
                  {shadow.enabled && (
                    <>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs text-[#94A3B8]">模糊</span>
                        <input type="range" min="5" max="50" value={shadow.blur}
                          onChange={e => setShadow(prev => ({ ...prev, blur: parseInt(e.target.value) }))}
                          className="flex-1 accent-[#22C55E]" />
                        <span className="text-xs text-[#F8FAFC] w-8 text-right">{shadow.blur}px</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#94A3B8]">颜色</span>
                        <input type="color" value={shadow.color}
                          onChange={e => setShadow(prev => ({ ...prev, color: e.target.value }))}
                          className="w-8 h-8 rounded cursor-pointer" />
                      </div>
                    </>
                  )}
                </section>

                {/* 滤镜 */}
                <section className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4">
                  <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3">🎨 滤镜效果</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {FILTER_PRESETS.map(p => (
                      <button key={p.id} onClick={() => setFilter(p)}
                        className={`p-3 rounded-lg border transition-all text-center ${
                          filter.id === p.id ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'
                        }`}>
                        <div className="text-xs font-medium text-[#F8FAFC]">{p.name}</div>
                        <div className="text-[10px] text-[#94A3B8] mt-1">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* 应用按钮 */}
                <button
                  onClick={applyEnhance}
                  disabled={isProcessing}
                  className="w-full py-3 bg-[#22C55E] text-white font-semibold rounded-xl
                    hover:bg-[#16A34A] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
                >
                  {isProcessing ? '处理中...' : '🚀 应用效果'}
                </button>

                {/* 增强结果下载 */}
                {resultImage && (
                  <button
                    onClick={downloadEnhance}
                    className="w-full py-3 bg-[#3B82F6] text-white font-semibold rounded-xl hover:bg-[#2563EB] transition-colors"
                  >
                    📥 下载增强图片
                  </button>
                )}
              </>
            )}

            {/* ======== Tab: 文字标注 ======== */}
            {activeTab === 'annotate' && (
              <>
                {/* 标注工具选择 */}
                <section className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4">
                  <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3">标注工具</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {ANNOTATE_TOOLS.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setAnnotateTool(t.id)}
                        className={`p-2 rounded-lg text-sm transition-all ${
                          annotateTool === t.id ? 'bg-[#22C55E] text-white' : 'bg-[#475569] text-[#F8FAFC] hover:bg-[#64748B]'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </section>

                {/* 文字设置 */}
                {annotateTool === 'text' && (
                  <section className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4">
                    <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3">文字设置</h3>
                    <input type="text" value={textContent} onChange={e => setTextContent(e.target.value)}
                      placeholder="输入标注文字..."
                      className="w-full px-3 py-2 bg-[#475569] border border-[#64748B] rounded-lg text-[#F8FAFC] text-sm mb-3" />
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs text-[#94A3B8]">字号</span>
                      <input type="range" min="12" max="48" value={fontSize}
                        onChange={e => setFontSize(parseInt(e.target.value))}
                        className="flex-1 accent-[#22C55E]" />
                      <span className="text-xs text-[#F8FAFC] w-6 text-right">{fontSize}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-[#94A3B8]">文字色</span>
                      <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer" />
                      <span className="text-xs text-[#94A3B8]">背景</span>
                      <input type="color" value={textBgColor} onChange={e => setTextBgColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer" />
                    </div>
                    <p className="text-xs text-[#94A3B8]">点击图片添加文字标注</p>
                  </section>
                )}

                {/* 颜色设置（箭头/矩形/高亮） */}
                {annotateTool !== 'text' && (
                  <section className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4">
                    <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3">颜色</h3>
                    <div className="flex items-center gap-3">
                      <input type="color"
                        value={
                          annotateTool === 'arrow' ? arrowColor :
                          annotateTool === 'rect' ? rectColor :
                          highlightColor.slice(0, 7)
                        }
                        onChange={e => {
                          if (annotateTool === 'arrow') setArrowColor(e.target.value)
                          else if (annotateTool === 'rect') setRectColor(e.target.value)
                          else setHighlightColor(e.target.value + '80')
                        }}
                        className="w-8 h-8 rounded cursor-pointer" />
                      <span className="text-xs text-[#94A3B8]">拖拽绘制标注</span>
                    </div>
                  </section>
                )}

                {/* 标注操作 */}
                <div className="space-y-2">
                  <button onClick={undoAnnotation}
                    className="w-full py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors">
                    ↩️ 撤销上一个
                  </button>
                  <button onClick={clearAnnotations}
                    className="w-full py-2 bg-[#EF4444] text-white rounded-lg hover:bg-[#DC2626] transition-colors">
                    🗑️ 清空标注
                  </button>
                  <button onClick={exportImage}
                    className="w-full py-2 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] transition-colors">
                    📥 导出图片
                  </button>
                </div>

                <p className="text-xs text-[#64748B] text-center">
                  已添加 {annotations.length} 个标注
                </p>
              </>
            )}
          </aside>

          {/* ==================== 右侧：预览/画布 ==================== */}
          <main className="lg:col-span-2">

            {/* ---- 增强 Tab：预览 ---- */}
            {activeTab === 'enhance' && (
              <div className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4 min-h-[400px] flex flex-col items-center justify-center">
                {resultImage ? (
                  <>
                    <img src={resultImage} alt="增强结果" className="max-w-full rounded-lg shadow-lg" />
                    <p className="mt-3 text-sm text-[#94A3B8]">增强已完成，可下载或切换到标注 Tab</p>
                  </>
                ) : (
                  <>
                    <img src={image.preview} alt="原图" className="max-w-full max-h-[500px] rounded-lg" />
                    <div className="mt-4 text-center text-[#94A3B8]">
                      <p>调整左侧参数后点击"应用效果"</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ---- 标注 Tab：Canvas 画布 ---- */}
            {activeTab === 'annotate' && (
              <div
                ref={containerRef}
                className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4 overflow-auto"
              >
                {/* 提示：如果增强结果已生成，在其上标注；否则在原图上标注 */}
                {resultImage && (
                  <div className="mb-3 px-3 py-2 bg-green-900/30 border border-green-500/30 rounded-lg text-sm text-green-400">
                    ✅ 正在增强结果上标注（如需重新增强，请先在增强 Tab 操作）
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  onClick={handleClickCanvas}
                  onMouseDown={handleMouseDownCanvas}
                  onMouseMove={handleMouseMoveCanvas}
                  onMouseUp={handleMouseUpCanvas}
                  onMouseLeave={handleMouseUpCanvas}
                  className="max-w-full cursor-crosshair rounded-lg"
                  style={{ display: 'block' }}
                />
                {/* 隐藏的图片用于加载源 */}
                <img
                  ref={hiddenImgRef}
                  src={getAnnotateSource() || ''}
                  alt=""
                  className="hidden"
                />
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}

export default ImageEditor

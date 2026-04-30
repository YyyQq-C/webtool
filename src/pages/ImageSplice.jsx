import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'
import UploadArea from '../components/UploadArea'

function ImageSplice() {
  const [images, setImages] = useState([])
  const [layout, setLayout] = useState('horizontal')
  const [gap, setGap] = useState(0)
  const [cols, setCols] = useState(3)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)

  const previewCanvasRef = useRef(null)
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)

  // ========================================================================
  // 图片上传 / 删除 / 清空
  // ========================================================================

  const handleDrop = useCallback((acceptedFiles) => {
    const newImages = acceptedFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
    }))
    setImages(prev => [...prev, ...newImages])
  }, [])

  const removeImage = (id) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img?.preview) URL.revokeObjectURL(img.preview)
      return prev.filter(i => i.id !== id)
    })
  }

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview))
    setImages([])
    setPreviewUrl(null)
  }

  // ========================================================================
  // 拖拽排序（原生 DnD）
  // ========================================================================

  const handleDragStart = (index) => {
    dragItem.current = index
  }

  const handleDragEnter = (index) => {
    dragOverItem.current = index
  }

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null
      dragOverItem.current = null
      return
    }

    setImages(prev => {
      const newImages = [...prev]
      const [dragged] = newImages.splice(dragItem.current, 1)
      newImages.splice(dragOverItem.current, 0, dragged)
      return newImages
    })

    dragItem.current = null
    dragOverItem.current = null
  }

  // ========================================================================
  // 拼接核心逻辑（返回 canvas）
  // ========================================================================

  async function buildCanvas(imgList, layoutMode, gapSize, colCount) {
    if (!imgList.length) return null

    // 加载所有图片
    const loadedImages = await Promise.all(
      imgList.map(img => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const image = new Image()
            image.onload = () => resolve(image)
            image.onerror = reject
            image.src = e.target.result
          }
          reader.onerror = reject
          reader.readAsDataURL(img.file)
        })
      })
    )

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (layoutMode === 'horizontal') {
      const totalWidth = loadedImages.reduce((sum, img) => sum + img.width, 0) + gapSize * (loadedImages.length - 1)
      const maxHeight = Math.max(...loadedImages.map(img => img.height))
      canvas.width = totalWidth
      canvas.height = maxHeight

      let x = 0
      loadedImages.forEach(img => {
        ctx.drawImage(img, x, 0)
        x += img.width + gapSize
      })
    } else if (layoutMode === 'vertical') {
      const maxWidth = Math.max(...loadedImages.map(img => img.width))
      const totalHeight = loadedImages.reduce((sum, img) => sum + img.height, 0) + gapSize * (loadedImages.length - 1)
      canvas.width = maxWidth
      canvas.height = totalHeight

      let y = 0
      loadedImages.forEach(img => {
        ctx.drawImage(img, 0, y)
        y += img.height + gapSize
      })
    } else if (layoutMode === 'grid') {
      const rows = Math.ceil(loadedImages.length / colCount)
      const cellWidth = Math.max(...loadedImages.map(img => img.width))
      const cellHeight = Math.max(...loadedImages.map(img => img.height))
      canvas.width = cellWidth * colCount + gapSize * (colCount - 1)
      canvas.height = cellHeight * rows + gapSize * (rows - 1)

      loadedImages.forEach((img, index) => {
        const col = index % colCount
        const row = Math.floor(index / colCount)
        const x = col * (cellWidth + gapSize)
        const y = row * (cellHeight + gapSize)
        ctx.drawImage(img, x, y)
      })
    }

    return canvas
  }

  // ========================================================================
  // 实时预览（图片/布局/间距/列数变化时自动重绘）
  // ========================================================================

  useEffect(() => {
    if (images.length === 0) {
      setPreviewUrl(null)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const canvas = await buildCanvas(images, layout, gap, cols)
        if (cancelled || !canvas) return

        // 将拼接结果缩放到预览 canvas 中显示
        const previewCanvas = previewCanvasRef.current
        if (!previewCanvas) return

        const maxPreviewW = 800
        const maxPreviewH = 600
        const scale = Math.min(maxPreviewW / canvas.width, maxPreviewH / canvas.height, 1)

        previewCanvas.width = Math.round(canvas.width * scale)
        previewCanvas.height = Math.round(canvas.height * scale)
        previewCanvas.getContext('2d').drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height)

        // 生成 data URL 用于下载
        setPreviewUrl(canvas.toDataURL('image/png'))
      } catch (err) {
        console.error('Preview render error:', err)
      }
    })()

    return () => { cancelled = true }
  }, [images, layout, gap, cols])

  // ========================================================================
  // 生成高清拼接图并下载
  // ========================================================================

  const spliceImages = async () => {
    if (images.length === 0) return
    setIsProcessing(true)

    try {
      const canvas = await buildCanvas(images, layout, gap, cols)
      if (!canvas) return

      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `spliced-${layout}-${Date.now()}.png`)
        }
        setIsProcessing(false)
      }, 'image/png')
    } catch (error) {
      console.error('拼接失败:', error)
      setIsProcessing(false)
    }
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
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">图片拼接</h1>
        <p className="text-[#94A3B8]">拖拽排序 → 实时预览 → 一键下载</p>
      </div>

      {/* 设置面板 */}
      <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-5 mb-6 border border-[#475569]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 布局选择 */}
            <div className="flex items-center gap-2">
              <label className="text-[#F8FAFC] font-medium text-sm">布局：</label>
              <div className="flex gap-1">
                {[
                  { value: 'horizontal', label: '↔ 横向' },
                  { value: 'vertical', label: '↕ 纵向' },
                  { value: 'grid', label: '⊞ 网格' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setLayout(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      layout === opt.value
                        ? 'bg-[#22C55E] text-[#0F172A] font-semibold'
                        : 'bg-[#334155] text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 间距 */}
            <div className="flex items-center gap-2">
              <label className="text-[#F8FAFC] font-medium text-sm">间距：</label>
              <input
                type="range"
                min="0"
                max="50"
                value={gap}
                onChange={e => setGap(Number(e.target.value))}
                className="w-28 accent-[#22C55E]"
              />
              <span className="text-[#F8FAFC] text-sm w-8 text-right">{gap}px</span>
            </div>

            {/* 网格列数 */}
            {layout === 'grid' && (
              <div className="flex items-center gap-2">
                <label className="text-[#F8FAFC] font-medium text-sm">列数：</label>
                <input
                  type="number"
                  value={cols}
                  onChange={e => setCols(Math.max(1, Number(e.target.value)))}
                  min="1"
                  max="10"
                  className="bg-[#334155] text-[#F8FAFC] px-2 py-1 rounded-lg border border-[#475569] w-16 text-center"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {images.length > 0 && (
              <button
                onClick={clearAll}
                className="px-4 py-2 bg-[#475569] hover:bg-[#64748B] text-[#F8FAFC] text-sm rounded-lg transition-colors"
              >
                清空所有
              </button>
            )}
            <button
              onClick={spliceImages}
              disabled={images.length === 0 || isProcessing}
              className="px-6 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-semibold text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? '处理中...' : '📥 下载高清'}
            </button>
          </div>
        </div>
      </div>

      {/* 上传区域 */}
      {images.length === 0 ? (
        <UploadArea onDrop={handleDrop} accept={{ 'image/*': [] }} maxFiles={10} />
      ) : (
        <button
          onClick={() => document.getElementById('splice-add-more')?.click()}
          className="w-full py-3 border-2 border-dashed border-[#475569] rounded-2xl text-[#94A3B8]
            hover:border-[#22C55E] hover:text-[#22C55E] transition-colors cursor-pointer bg-[#1E293B]/30"
        >
          + 点击添加更多图片（或拖拽到下方列表）
        </button>
      )}
      <input
        id="splice-add-more"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          if (e.target.files) handleDrop(Array.from(e.target.files))
          e.target.value = ''
        }}
      />

      {/* ==================================================================
          图片列表 + 实时预览
          ================================================================== */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

          {/* ---- 左侧：拖拽排序列表 ---- */}
          <div>
            <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2">
              📋 图片顺序
              <span className="text-xs text-[#94A3B8] font-normal">拖拽卡片排序</span>
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  className={`flex items-center gap-3 bg-[#1E293B]/60 backdrop-blur-sm rounded-xl
                    border border-[#475569] p-2 cursor-grab active:cursor-grabbing transition-all
                    hover:border-[#22C55E] group`}
                >
                  {/* 序号 */}
                  <div className="shrink-0 w-7 h-7 rounded-full bg-[#334155] flex items-center justify-center
                    text-xs font-bold text-[#F8FAFC]">
                    {index + 1}
                  </div>

                  {/* 缩略图 */}
                  <img
                    src={image.preview}
                    alt={image.name}
                    className="w-16 h-12 object-cover rounded-lg border border-[#475569]"
                  />

                  {/* 文件名 */}
                  <span className="text-xs text-[#94A3B8] truncate flex-1">{image.name}</span>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setImages(prev => {
                          const newImages = [...prev]
                          if (index > 0) {
                            [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]]
                          }
                          return newImages
                        })
                      }}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => {
                        setImages(prev => {
                          const newImages = [...prev]
                          if (index < prev.length - 1) {
                            [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]]
                          }
                          return newImages
                        })
                      }}
                      disabled={index === images.length - 1}
                      className="p-1 rounded hover:bg-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeImage(image.id)}
                      className="p-1 rounded hover:bg-red-900/50 text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---- 右侧：实时预览 ---- */}
          <div>
            <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3">
              👁️ 实时预览
              <span className="text-xs text-[#94A3B8] font-normal ml-2">
                {layout === 'horizontal' ? '横向' : layout === 'vertical' ? '纵向' : `网格(${cols}列)`}
                {gap > 0 ? ` · 间距${gap}px` : ''}
              </span>
            </h3>
            <div className="bg-[#0F172A] rounded-xl border border-[#475569] p-4 flex items-center justify-center min-h-[300px] max-h-[400px]">
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-[380px] rounded shadow-lg"
              />
            </div>

            {/* 快速操作 */}
            <div className="flex gap-3 mt-3">
              <button
                onClick={spliceImages}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-semibold text-sm
                  rounded-lg transition-colors disabled:opacity-50"
              >
                📥 下载高清原图
              </button>
              {previewUrl && (
                <a
                  href={previewUrl}
                  download={`spliced-preview-${Date.now()}.png`}
                  className="flex-1 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm
                    rounded-lg text-center font-semibold transition-colors"
                >
                  📥 下载预览图
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageSplice

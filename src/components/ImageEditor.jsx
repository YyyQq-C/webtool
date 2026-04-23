import { useState, useCallback, useRef, useEffect } from 'react'

function ImageEditor({ originalImage, resultImage, onSave }) {
  const [isEditing, setIsEditing] = useState(false)
  const [brushMode, setBrushMode] = useState('remove') // 'remove' | 'restore'
  const [brushSize, setBrushSize] = useState(20)
  const [isDrawing, setIsDrawing] = useState(false)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const containerRef = useRef(null)

  // 初始化编辑器
  useEffect(() => {
    if (!isEditing || !resultImage || !originalImage) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // 设置 Canvas 尺寸
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      saveToHistory()
    }
    img.src = resultImage
  }, [isEditing, resultImage, originalImage])

  // 保存到历史记录
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL()
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(dataUrl)
      return newHistory.slice(-20) // 最多保留20步
    })
    setHistoryIndex(prev => Math.min(prev + 1, 19))
  }, [historyIndex])

  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
    img.src = history[newIndex]
    setHistoryIndex(newIndex)
  }, [history, historyIndex])

  // 重做
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
    img.src = history[newIndex]
    setHistoryIndex(newIndex)
  }, [history, historyIndex])

  // 获取鼠标/触摸位置
  const getPosition = useCallback((e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }, [])

  // 绘制
  const draw = useCallback((e) => {
    if (!isDrawing) return
    e.preventDefault()

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getPosition(e)

    if (brushMode === 'remove') {
      // 擦除模式：使区域透明
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // 还原模式：从原始图片取样
      ctx.globalCompositeOperation = 'source-over'
      const origImg = new Image()
      origImg.onload = () => {
        ctx.save()
        ctx.beginPath()
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(origImg, 0, 0)
        ctx.restore()
      }
      origImg.src = originalImage
    }
  }, [isDrawing, brushMode, brushSize, getPosition, originalImage])

  const startDrawing = useCallback((e) => {
    setIsDrawing(true)
    draw(e)
  }, [draw])

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false)
      saveToHistory()
    }
  }, [isDrawing, saveToHistory])

  // 保存结果
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      onSave(url)
      setIsEditing(false)
    }, 'image/png')
  }, [onSave])

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        disabled={!resultImage}
        className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        编辑结果
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* 顶部工具栏 */}
      <div className="bg-[#1E293B] border-b border-[#475569] p-4">
        <div className="flex items-center justify-between flex-wrap gap-4 max-w-6xl mx-auto">
          <h3 className="text-[#F8FAFC] font-semibold">图片编辑</h3>

          <div className="flex items-center gap-4 flex-wrap">
            {/* 画笔模式 */}
            <div className="flex bg-[#334155] rounded-lg overflow-hidden">
              <button
                onClick={() => setBrushMode('remove')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  brushMode === 'remove'
                    ? 'bg-[#22C55E] text-[#0F172A]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                ✂️ 去除背景
              </button>
              <button
                onClick={() => setBrushMode('restore')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  brushMode === 'restore'
                    ? 'bg-[#22C55E] text-[#0F172A]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                🖌️ 还原背景
              </button>
            </div>

            {/* 画笔大小 */}
            <div className="flex items-center gap-2">
              <span className="text-[#94A3B8] text-sm">画笔：</span>
              <input
                type="range"
                min="5"
                max="100"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-[#F8FAFC] text-sm w-8">{brushSize}px</span>
            </div>

            {/* 撤销/重做 */}
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
                </svg>
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
                </svg>
              </button>
            </div>

            {/* 保存/取消 */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-[#475569] hover:bg-[#64748B] text-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 画布区域 */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        <div ref={containerRef} className="relative max-w-full max-h-full">
          {/* 棋盘格背景（显示透明区域） */}
          <div
            className="relative"
            style={{
              backgroundImage: `
                linear-gradient(45deg, #334155 25%, transparent 25%),
                linear-gradient(-45deg, #334155 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #334155 75%),
                linear-gradient(-45deg, transparent 75%, #334155 75%)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }}
          >
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[calc(100vh-200px)] object-contain cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{ touchAction: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* 底部提示 */}
      <div className="bg-[#1E293B] border-t border-[#475569] px-4 py-2">
        <p className="text-[#94A3B8] text-sm text-center">
          {brushMode === 'remove'
            ? '🖌️ 涂抹区域将变为透明（去除背景）'
            : '🖌️ 涂抹区域将还原原始图片内容（还原背景）'}
        </p>
      </div>
    </div>
  )
}

export default ImageEditor
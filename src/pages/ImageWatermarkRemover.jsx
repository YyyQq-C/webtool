import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'

function ImageWatermarkRemover() {
  const [image, setImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [brushSize, setBrushSize] = useState(20)
  const [error, setError] = useState('')
  const [isAutoDetecting, setIsAutoDetecting] = useState(false)
  const [hasMask, setHasMask] = useState(false)

  const canvasRef = useRef(null)
  const maskCanvasRef = useRef(null)
  const containerRef = useRef(null)
  const originalImageRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const [canvasKey, setCanvasKey] = useState(0) // 改成 state

  // 处理文件上传
  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) { setError('请上传图片文件'); return }
    setError(''); setResult(null); setHasMask(false); setIsAutoDetecting(false); setCanvasKey(prev => prev + 1)
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        setImage({ file, name: file.name, size: file.size, preview: e.target.result, width: img.width, height: img.height })
        originalImageRef.current = img
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((f) => { if (f.length > 0) handleFile(f[0]) }, [handleFile])

  // 计算显示尺寸
  useEffect(() => {
    if (!image || !containerRef.current) return
    const c = containerRef.current, maxW = c.clientWidth - 32, maxH = 600
    const scale = Math.min(maxW / image.width, maxH / image.height, 1)
    setDisplaySize({ width: Math.round(image.width * scale), height: Math.round(image.height * scale) })
  }, [image])

  // 初始化/重绘 Canvas
  useEffect(() => {
    if (!image || !canvasRef.current || !maskCanvasRef.current || displaySize.width === 0) return
    const canvas = canvasRef.current, maskCanvas = maskCanvasRef.current
    canvas.width = displaySize.width; canvas.height = displaySize.height
    maskCanvas.width = displaySize.width; maskCanvas.height = displaySize.height
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, displaySize.width, displaySize.height)
    if (originalImageRef.current) ctx.drawImage(originalImageRef.current, 0, 0, displaySize.width, displaySize.height)
    const maskCtx = maskCanvas.getContext('2d'); maskCtx.clearRect(0, 0, displaySize.width, displaySize.height)
    setHasMask(false)
  }, [image, displaySize, canvasKey])

  const getPosition = useCallback((e) => {
    const canvas = canvasRef.current, rect = canvas.getBoundingClientRect()
    return { x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left, y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top }
  }, [])

  const draw = useCallback((e) => {
    if (!isDrawing) return; e.preventDefault()
    const maskCtx = maskCanvasRef.current.getContext('2d')
    const { x, y } = getPosition(e)
    maskCtx.fillStyle = 'rgba(255, 0, 0, 0.5)'; maskCtx.beginPath(); maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2); maskCtx.fill()
    setHasMask(true)
  }, [isDrawing, brushSize, getPosition])

  const startDrawing = useCallback((e) => { setIsDrawing(true); draw(e) }, [draw])
  const stopDrawing = useCallback(() => { setIsDrawing(false) }, [])

  const clearMask = useCallback(() => {
    const mc = maskCanvasRef.current, cc = canvasRef.current
    if (!mc || !cc || !originalImageRef.current) return
    mc.getContext('2d').clearRect(0, 0, mc.width, mc.height)
    const ctx = cc.getContext('2d'); ctx.clearRect(0, 0, cc.width, cc.height)
    ctx.drawImage(originalImageRef.current, 0, 0, cc.width, cc.height); setHasMask(false)
  }, [])

  // 智能检测水印
  const autoDetectWatermark = useCallback(async () => {
    if (!image) return; setIsAutoDetecting(true); setError('')
    try {
      const fd = new FormData(); fd.append('image', image.file)
      const res = await fetch('/bg-api/api/detect-watermark', { method: 'POST', body: fd })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || `检测失败 (${res.status})`) }
      const data = await res.json()
      const maskCanvas = maskCanvasRef.current; if (!maskCanvas) return
      const maskImg = new Image()
      maskImg.onload = () => {
        const maskCtx = maskCanvas.getContext('2d'); maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
        maskCtx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height); setHasMask(true); setIsAutoDetecting(false)
      }
      maskImg.src = `data:image/png;base64,${data.mask}`
    } catch (err) { setError(err.message || '检测失败'); setIsAutoDetecting(false) }
  }, [image])

  // 去除水印
  const removeWatermark = useCallback(async () => {
    if (!image) return
    if (!hasMask) { setError('请先用画笔标记水印区域，或使用智能检测'); return }
    setIsProcessing(true); setError('')
    try {
      const maskCanvas = maskCanvasRef.current
      const fmc = document.createElement('canvas'); fmc.width = image.width; fmc.height = image.height
      fmc.getContext('2d').drawImage(maskCanvas, 0, 0, image.width, image.height)
      const maskBlob = await new Promise(r => { fmc.toBlob(r, 'image/png') })
      const fd = new FormData(); fd.append('image', image.file); fd.append('mask', maskBlob, 'mask.png')
      const res = await fetch('/bg-api/api/remove-watermark', { method: 'POST', body: fd })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || `处理失败 (${res.status})`) }
      setResult(URL.createObjectURL(await res.blob()))
    } catch (err) { setError(err.message || '处理失败') } finally { setIsProcessing(false) }
  }, [image, hasMask])

  const downloadResult = useCallback(() => { if (!result) return; saveAs(result, image.name.replace(/\.[^/.]+$/, '') + '-no-watermark.png') }, [result, image])

  // 重新编辑 - 修复 canvas 重绘问题
  const handleReEdit = useCallback(() => {
    if (!result) return
    URL.revokeObjectURL(result)
    setResult(null)
    setError('')
    setHasMask(false)
    // 强制重新渲染 canvas
    setCanvasKey(prev => prev + 1)
  }, [result])

  const clearAll = useCallback(() => {
    if (image?.preview) URL.revokeObjectURL(image.preview)
    if (result) URL.revokeObjectURL(result)
    setImage(null); setResult(null); setError(''); setIsAutoDetecting(false); setHasMask(false)
    originalImageRef.current = null; setCanvasKey(prev => prev + 1)
  }, [image, result])

  const formatSize = (b) => { if (!b) return '0 B'; const k = 1024, s = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(b) / Math.log(k)); return Math.round(b / Math.pow(k, i) * 100) / 100 + ' ' + s[i] }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>返回工具列表
      </Link>
      <div className="text-center mb-8"><h1 className="text-4xl font-bold text-[#F8FAFC] mb-2">图片去水印</h1><p className="text-[#94A3B8]">智能识别或手动标记，无损去除水印</p></div>

      {image && !result && (
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 mb-6 border border-[#475569]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2"><span className="text-[#94A3B8] text-sm">画笔大小：</span><input type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-32" /><span className="text-[#F8FAFC] text-sm w-10">{brushSize}px</span></div>
              <button onClick={autoDetectWatermark} disabled={isAutoDetecting} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed" type="button">{isAutoDetecting ? '检测中...' : '🔍 智能检测'}</button>
              <button onClick={clearMask} className="px-4 py-2 bg-[#475569] hover:bg-[#64748B] text-white rounded-lg transition-colors text-sm" type="button">清除标记</button>
            </div>
            <div className="flex gap-3">
              <button onClick={clearAll} className="px-6 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg transition-colors" type="button">清空</button>
              <button onClick={removeWatermark} disabled={isProcessing} className="px-6 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed" type="button">{isProcessing ? '处理中...' : '去除水印'}</button>
            </div>
          </div>
          {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg"><p className="text-red-400 text-sm">{error}</p></div>}
        </div>
      )}

      {!image && (
        <div className="relative border-2 border-dashed border-[#475569] bg-[#1E293B]/40 hover:border-[#22C55E] hover:bg-[#1E293B]/60 rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (f.length > 0) handleDrop(f) }} onClick={() => document.getElementById('wm-fi').click()}>
          <input id="wm-fi" type="file" accept="image/*" onChange={(e) => { const f = Array.from(e.target.files); if (f.length > 0) handleFile(f[0]); e.target.value = '' }} className="hidden" />
          <div className="text-6xl mb-4">💧</div><p className="text-xl font-medium text-[#F8FAFC] mb-2">拖拽图片到这里</p><p className="text-[#94A3B8]">或点击选择文件</p>
        </div>
      )}

      {image && !result && (
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl border border-[#475569] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#475569] flex items-center justify-between"><div><h3 className="text-[#F8FAFC] font-semibold">标记水印区域</h3><p className="text-[#94A3B8] text-sm">用红色画笔涂抹水印位置，或使用智能检测</p></div><span className="text-[#64748B] text-sm">{image.name} ({formatSize(image.size)})</span></div>
          <div ref={containerRef} className="p-4 flex justify-center">
            <div className="relative inline-block" key={canvasKey}>
              <canvas ref={canvasRef} className="border border-[#475569] rounded-lg" style={{ touchAction: 'none' }} />
              <canvas ref={maskCanvasRef} className="absolute top-0 left-0 cursor-crosshair" style={{ touchAction: 'none' }} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
            <div className="flex items-center justify-between flex-wrap gap-4"><h3 className="text-[#F8FAFC] font-semibold">去水印结果</h3><div className="flex gap-3"><button onClick={handleReEdit} className="px-4 py-2 bg-[#475569] hover:bg-[#64748B] text-white rounded-lg transition-colors" type="button">重新编辑</button><button onClick={downloadResult} className="px-6 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all" type="button">下载图片</button></div></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl border border-[#475569] overflow-hidden"><div className="px-4 py-3 border-b border-[#475569]"><h3 className="text-[#F8FAFC] font-semibold">原图</h3></div><div className="p-4"><img src={image.preview} alt="原图" className="w-full h-auto rounded-lg" /></div></div>
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl border border-[#475569] overflow-hidden"><div className="px-4 py-3 border-b border-[#475569]"><h3 className="text-[#F8FAFC] font-semibold">去水印后</h3></div><div className="p-4"><img src={result} alt="去水印" className="w-full h-auto rounded-lg" /></div></div>
          </div>
        </div>
      )}

      <div className="mt-12 bg-[#1E293B]/40 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
        <h3 className="text-lg font-semibold text-[#F8FAFC] mb-3">使用说明</h3>
        <ul className="space-y-2 text-[#94A3B8]">
          <li className="flex items-start"><span className="text-[#22C55E] mr-2">1.</span><span>上传需要去除水印的图片</span></li>
          <li className="flex items-start"><span className="text-[#22C55E] mr-2">2.</span><span><strong className="text-[#F8FAFC]">手动模式</strong>：调整画笔大小，用红色画笔涂抹水印区域</span></li>
          <li className="flex items-start"><span className="text-[#22C55E] mr-2">3.</span><span><strong className="text-[#F8FAFC]">智能检测</strong>：点击"🔍 智能检测"自动识别水印区域</span></li>
          <li className="flex items-start"><span className="text-[#22C55E] mr-2">4.</span><span>点击"去除水印"，使用 OpenCV 智能修复算法填充水印区域</span></li>
          <li className="flex items-start"><span className="text-[#22C55E] mr-2">5.</span><span>预览结果，可重新编辑或直接下载</span></li>
        </ul>
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg"><p className="text-blue-300 text-sm">💡 提示：智能检测适合规则水印（文字、logo 等），复杂水印建议手动标记以获得最佳效果。</p></div>
      </div>
    </div>
  )
}

export default ImageWatermarkRemover
import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { saveAs } from 'file-saver'
import UploadArea, { isImageFile } from '../components/UploadArea'

// 辅助函数：将 canvas 转换为 Blob
function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob)
    }, 'image/png')
  })
}

function ImageCropper() {
  const [image, setImage] = useState(null)
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState()
  const [aspect, setAspect] = useState(undefined)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  
  // 用于平移的 offset
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const imgRef = useRef(null)
  const containerRef = useRef(null)
  const [uploadError, setUploadError] = useState('')

  // 默认初始裁剪区域
  function onImageLoad(e) {
    const { width, height } = e.currentTarget
    // 初始重置缩放和平移
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    
    if (aspect) {
        const newCrop = centerCrop(
            makeAspectCrop(
              {
                unit: '%',
                width: 90,
              },
              aspect,
              width,
              height,
            ),
            width,
            height,
          )
        setCrop(newCrop)
    } else {
        setCrop({ unit: '%', width: 90, height: 90, x: 5, y: 5 })
    }
  }

  const handleFile = useCallback((file) => {
    setUploadError('')
    if (!file) return

    if (!isImageFile(file)) {
      setUploadError('不支持的文件格式，请上传图片文件')
      setTimeout(() => setUploadError(''), 3000)
      return
    }

    setImage({
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
    })
  }, [])

  const handleDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) handleFile(acceptedFiles[0])
  }, [handleFile])

  // 处理导出
  const downloadCroppedImage = async () => {
    if (!completedCrop || !imgRef.current) return

    const image = imgRef.current
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // 关键：ReactCrop 返回的是相对于渲染尺寸的坐标
    // 我们需要将其映射回原始尺寸 (naturalWidth/naturalHeight)
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const pixelRatio = window.devicePixelRatio

    canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio)
    canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio)

    ctx.scale(pixelRatio, pixelRatio)
    ctx.imageSmoothingQuality = 'high'

    const cropX = completedCrop.x * scaleX
    const cropY = completedCrop.y * scaleY

    const rotateRads = (rotation * Math.PI) / 180
    const centerX = image.naturalWidth / 2
    const centerY = image.naturalHeight / 2

    ctx.save()

    // 逻辑：将画布原点移动到我们想要截取的左上角
    ctx.translate(-cropX * pixelRatio, -cropY * pixelRatio)
    
    // 如果有旋转：
    ctx.translate(centerX * pixelRatio, centerY * pixelRatio)
    ctx.rotate(rotateRads)
    ctx.translate(-centerX * pixelRatio, -centerY * pixelRatio)
    
    // 绘制图片
    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      0,
      0,
      image.naturalWidth * pixelRatio,
      image.naturalHeight * pixelRatio
    )

    ctx.restore()

    const blob = await canvasToBlob(canvas)
    if (blob) {
      const url = URL.createObjectURL(blob)
      const name = image.name || 'cropped-image'
      saveAs(url, `${name.replace(/\.[^/.]+$/, '')}-cropped.png`)
      URL.revokeObjectURL(url)
    }
  }

  // 滚轮缩放画布预览
  const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey || true) { // 默认允许缩放预览
          e.preventDefault()
          const delta = e.deltaY > 0 ? 0.9 : 1.1
          setZoom(z => Math.min(Math.max(z * delta, 0.5), 10))
      }
  }

  // 鼠标平移画布 (空格键按下或中键)
  const onMouseDown = (e) => {
      if (e.button === 1 || e.altKey) {
          setIsPanning(true)
          setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
      }
  }

  const onMouseMove = (e) => {
      if (isPanning) {
          setOffset({
              x: e.clientX - panStart.x,
              y: e.clientY - panStart.y
          })
      }
  }

  const onMouseUp = () => {
      setIsPanning(false)
  }

  const clearAll = () => {
    if (image?.preview) URL.revokeObjectURL(image.preview)
    setImage(null)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setRotation(0)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setAspect(undefined)
  }

  const handleAspectChange = (newAspect) => {
    setAspect(newAspect)
    if (newAspect && imgRef.current) {
        const { width, height } = imgRef.current
        const newCrop = centerCrop(
            makeAspectCrop(
              {
                unit: '%',
                width: 90,
              },
              newAspect,
              width,
              height,
            ),
            width,
            height,
          )
        setCrop(newCrop)
    } else {
        setCrop(prev => ({ ...prev, aspect: undefined }))
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors font-medium">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回工具列表
      </Link>

      <div className="text-center mb-8 font-sans">
        <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent mb-3 tracking-tight">智能图片裁剪</h1>
        <p className="text-[#94A3B8] text-lg font-medium">支持鼠标缩放画布、自由拖拽选择，精准像素级处理</p>
      </div>

      {!image ? (
        <UploadArea
          onDrop={handleDrop}
          isImageFile={isImageFile}
          error={uploadError}
          setError={setUploadError}
          onFileSelect={handleFile}
        />
      ) : (
        <div className="bg-[#1E293B]/80 backdrop-blur-xl rounded-3xl border border-[#475569] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[#475569]">
            {/* 交互裁剪区 (画布缩放区域) */}
            <div 
                className="flex-1 p-8 bg-[#0F172A]/80 min-h-[600px] flex items-center justify-center relative overflow-hidden cursor-grab active:cursor-grabbing"
                onWheel={handleWheel}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
            >
              <div 
                className="transition-transform duration-75 ease-out select-none"
                style={{ 
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                }}
              >
                <div className="relative shadow-2xl">
                    <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                    className="rounded-lg"
                    >
                    <img
                        ref={imgRef}
                        alt="Crop me"
                        src={image.preview}
                        style={{ transform: `rotate(${rotation}deg)` }}
                        onLoad={onImageLoad}
                        className="max-w-[70vw] max-h-[70vh] block"
                        draggable={false}
                    />
                    </ReactCrop>
                </div>
              </div>

              {/* 画布缩放工具条 (悬浮) */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 z-10 shadow-2xl">
                 <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="text-white hover:text-emerald-400 p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                 </button>
                 <span className="text-xs font-mono text-white/90 min-w-[50px] text-center">画布: {Math.round(zoom * 100)}%</span>
                 <button onClick={() => setZoom(z => Math.min(z + 0.2, 10))} className="text-white hover:text-emerald-400 p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                 </button>
                 <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                 <button onClick={() => { setZoom(1); setOffset({x:0,y:0}); }} className="text-white/60 hover:text-white text-[10px] uppercase font-bold px-2">重置视图</button>
              </div>

              {/* 悬浮快捷提示 */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-[10px] text-white/60 pointer-events-none flex items-center gap-3">
                <span>🖱️ 滚轮缩放画布</span>
                <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                <span>🖱️ Alt + 拖拽可平移视图</span>
              </div>
            </div>

            {/* 控制面板 */}
            <div className="w-full lg:w-96 p-8 bg-[#1E293B] flex flex-col gap-8 shadow-inner">
              {/* 模式选择 */}
              <div>
                <label className="text-[10px] uppercase tracking-widest font-black text-emerald-500 mb-5 block opacity-80">常用尺寸比例</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.label}
                      onClick={() => handleAspectChange(ratio.value)}
                      className={`py-3.5 px-2 rounded-2xl text-[11px] font-black transition-all border-2 ${
                        aspect === ratio.value
                          ? 'bg-emerald-500 border-emerald-400 text-[#0F172A] shadow-xl shadow-emerald-500/30'
                          : 'bg-[#0F172A]/50 border-[#475569] text-[#94A3B8] hover:border-emerald-400/50'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 旋转滑块 */}
              <div className="space-y-8">
                <div>
                   <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] font-black text-[#F8FAFC] uppercase tracking-wider opacity-80">图片旋转角度</label>
                    <span className="text-[11px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">{rotation}°</span>
                   </div>
                   <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-[#0F172A] rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex gap-2.5 mt-5">
                    <button 
                       onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                       className="flex-1 py-3 bg-[#0F172A] hover:bg-[#334155] border border-[#475569] rounded-xl text-[10px] text-white font-black transition-all shadow-lg"
                    >
                       左旋 90°
                    </button>
                    <button 
                       onClick={() => setRotation((r) => (r + 90) % 360)}
                       className="flex-1 py-3 bg-[#0F172A] hover:bg-[#334155] border border-[#475569] rounded-xl text-[10px] text-white font-black transition-all shadow-lg"
                    >
                       右旋 90°
                    </button>
                  </div>
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="mt-auto space-y-4 pt-8 border-t border-[#475569]/50">
                <button
                  disabled={!completedCrop}
                  onClick={downloadCroppedImage}
                  className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-[#0F172A] text-sm font-black rounded-3xl shadow-2xl shadow-emerald-500/30 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:grayscale disabled:transform-none"
                >
                  确认并导出裁剪图片
                </button>
                <button
                  onClick={clearAll}
                  className="w-full py-4 bg-transparent hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400 text-[11px] font-black rounded-3xl border border-[#475569] hover:border-red-400/50 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  重置本图
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageCropper

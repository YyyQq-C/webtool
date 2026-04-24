import { useState, useCallback, useRef } from 'react'
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
  const [scale, setScale] = useState(1)
  
  const imgRef = useRef(null)
  const [uploadError, setUploadError] = useState('')

  // 默认初始裁剪区域
  function onImageLoad(e) {
    const { width, height } = e.currentTarget
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

  const downloadCroppedImage = async () => {
    if (!completedCrop || !imgRef.current) return

    const image = imgRef.current
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) return

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

    // 1. 移动到画布中心进行旋转和缩放
    ctx.translate(-cropX * pixelRatio, -cropY * pixelRatio)
    ctx.translate(centerX * pixelRatio, centerY * pixelRatio)
    ctx.rotate(rotateRads)
    ctx.scale(scale, scale)
    ctx.translate(-centerX * pixelRatio, -centerY * pixelRatio)
    
    // 2. 绘制原始尺寸图片
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

  const clearAll = () => {
    if (image?.preview) URL.revokeObjectURL(image.preview)
    setImage(null)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setRotation(0)
    setScale(1)
    setAspect(undefined)
  }

  const aspectRatios = [
    { label: '自由选择', value: undefined },
    { label: '1:1', value: 1 / 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '16:9', value: 16 / 9 },
    { label: '3:2', value: 3 / 2 },
  ]

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
        // 如果切回自由选择，保持当前位置但不再受锁定
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
        <p className="text-[#94A3B8] text-lg font-medium">支持鼠标自由拖拽选择区域，精准每一像素的处理</p>
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
            {/* 交互裁剪区 */}
            <div className="flex-1 p-8 bg-[#0F172A]/50 min-h-[500px] flex items-center justify-center relative">
              <div className="relative group">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspect}
                  className="max-w-full rounded-lg shadow-2xl"
                  style={{ maxHeight: '70vh' }}
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={image.preview}
                    style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
                    onLoad={onImageLoad}
                    className="max-w-full block"
                  />
                </ReactCrop>
              </div>

              {/* 悬浮快捷提示 */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-xs text-white/80 pointer-events-none">
                💡 鼠标拖拽图片边缘可自由调整裁剪范围
              </div>
            </div>

            {/* 控制面板 */}
            <div className="w-full lg:w-96 p-8 bg-[#1E293B] flex flex-col gap-8">
              {/* 模式选择 */}
              <div>
                <label className="text-xs uppercase tracking-widest font-bold text-emerald-500 mb-4 block">常用尺寸比例</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.label}
                      onClick={() => handleAspectChange(ratio.value)}
                      className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border ${
                        aspect === ratio.value
                          ? 'bg-emerald-500 border-emerald-400 text-[#0F172A] shadow-lg shadow-emerald-500/20'
                          : 'bg-[#0F172A]/40 border-[#475569] text-[#94A3B8] hover:border-emerald-400/50'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 编辑滑块 */}
              <div className="space-y-6">
                <div>
                   <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-[#F8FAFC]">缩放比例</label>
                    <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">{scale.toFixed(2)}x</span>
                   </div>
                   <input
                    type="range"
                    min={0.1}
                    max={2}
                    step={0.01}
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-[#0F172A] rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                   <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-[#F8FAFC]">旋转角度</label>
                    <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">{rotation}°</span>
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
                  <div className="flex gap-2 mt-4">
                    <button 
                       onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                       className="flex-1 py-2 bg-[#0F172A] hover:bg-[#334155] border border-[#475569] rounded-lg text-[10px] text-white font-bold transition-all"
                    >
                       左旋 90°
                    </button>
                    <button 
                       onClick={() => setRotation((r) => (r + 90) % 360)}
                       className="flex-1 py-2 bg-[#0F172A] hover:bg-[#334155] border border-[#475569] rounded-lg text-[10px] text-white font-bold transition-all"
                    >
                       右旋 90°
                    </button>
                  </div>
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="mt-6 space-y-4">
                <button
                  disabled={!completedCrop}
                  onClick={downloadCroppedImage}
                  className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-[#0F172A] text-sm font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:grayscale disabled:transform-none"
                >
                  确认并导出裁剪图片
                </button>
                <button
                  onClick={clearAll}
                  className="w-full py-4 bg-[#0F172A] hover:bg-[#DC2626]/10 text-[#94A3B8] hover:text-red-400 text-xs font-bold rounded-2xl border border-[#475569] hover:border-red-400/50 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  重置画布
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

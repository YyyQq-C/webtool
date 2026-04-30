import { useState, useCallback, useRef, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import UploadArea, { isImageFile } from '../components/UploadArea'

// ========== 公共数据 ==========

const PHOTO_SIZES = {
  '1寸': { width: 295, height: 413, mm: '25×35mm' },
  '2寸': { width: 413, height: 579, mm: '35×49mm' },
  '小2寸': { width: 413, height: 531, mm: '35×45mm' },
}

const BG_COLORS = [
  { name: '白色', value: '#FFFFFF', desc: '通用证件照' },
  { name: '蓝色', value: '#438EDB', desc: '毕业证、工作证' },
  { name: '红色', value: '#D92B2B', desc: '结婚证、社保卡' },
  { name: '浅蓝', value: '#87CEEB', desc: '部分签证' },
]

const GRADIENT_COLORS = [
  { name: '渐变蓝', value: 'linear-gradient(180deg, #438EDB 0%, #1E5FA8 100%)', desc: '渐变效果' },
  { name: '渐变红', value: 'linear-gradient(180deg, #D92B2B 0%, #8B1A1A 100%)', desc: '渐变效果' },
]

const BEAUTY_OPTIONS = {
  smoothing: { name: '磨皮', min: 0, max: 100, default: 30, desc: '平滑皮肤纹理' },
  brightness: { name: '亮度', min: -50, max: 50, default: 10, desc: '调整整体亮度' },
  contrast: { name: '对比度', min: -50, max: 50, default: 5, desc: '增强层次感' },
  saturation: { name: '饱和度', min: -50, max: 50, default: 0, desc: '调整色彩浓度' },
  whitening: { name: '美白', min: 0, max: 100, default: 20, desc: '皮肤美白效果' },
}

const BEAUTY_PRESETS = [
  { name: '自然', values: { smoothing: 20, brightness: 5, contrast: 0, saturation: 0, whitening: 10 } },
  { name: '证件照', values: { smoothing: 30, brightness: 15, contrast: 5, saturation: 0, whitening: 25 } },
  { name: '轻美颜', values: { smoothing: 40, brightness: 10, contrast: 10, saturation: 5, whitening: 30 } },
  { name: '无', values: { smoothing: 0, brightness: 0, contrast: 0, saturation: 0, whitening: 0 } },
]

const PHOTO_SPECS = [
  { id: 'china-1inch', name: '中国1寸', width: 295, height: 413, mm: '25×35mm', usage: '身份证、工作证、学生证' },
  { id: 'china-2inch', name: '中国2寸', width: 413, height: 579, mm: '35×49mm', usage: '护照、签证、毕业证' },
  { id: 'china-small-2inch', name: '中国小2寸', width: 413, height: 531, mm: '35×45mm', usage: '部分公务员考试' },
  { id: 'us-visa', name: '美国签证', width: 600, height: 600, mm: '51×51mm', usage: '美国签证申请' },
  { id: 'eu-visa', name: '欧洲签证', width: 413, height: 531, mm: '35×45mm', usage: '申根签证、英国签证' },
  { id: 'japan-visa', name: '日本签证', width: 450, height: 450, mm: '45×45mm', usage: '日本签证申请' },
  { id: 'korea-visa', name: '韩国签证', width: 413, height: 531, mm: '35×45mm', usage: '韩国签证申请' },
  { id: 'driver-license', name: '驾驶证', width: 260, height: 378, mm: '22×32mm', usage: '中国驾驶证' },
  { id: 'social-security', name: '社保卡', width: 358, height: 441, mm: '26×32mm', usage: '社保卡、医保卡' },
]

// Tab 定义
const TABS = [
  { id: 'bg-color', name: '换底色', icon: '🎨' },
  { id: 'generator', name: '一键生成', icon: '📸' },
  { id: 'sizes', name: '多尺寸', icon: '📋' },
  { id: 'beauty', name: '美颜', icon: '✨' },
]

// ========== 组件 ==========

function PhotoTools() {
  const [searchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') || 'bg-color'
  const [activeTab, setActiveTab] = useState(tabFromUrl)
  const [image, setImage] = useState(null)

  const handleFile = useCallback((file) => {
    if (!file) return
    if (!isImageFile(file)) {
      alert('请上传图片文件')
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

  const resetImage = useCallback(() => setImage(null), [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        返回首页
      </Link>

      {/* 标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">证件照工具箱</h1>
        <p className="text-[#94A3B8]">换底、美颜、多尺寸、一键生成，一站搞定</p>
      </div>

      {/* 选项卡 */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-5 py-3 rounded-xl font-semibold transition-all text-sm ${
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

      {/* 上传区域（共享） */}
      {!image && (
        <div className="mb-8">
          <UploadArea onDrop={handleDrop} accept={{ 'image/*': [] }} maxFiles={1} />
        </div>
      )}

      {/* 功能面板 */}
      {activeTab === 'bg-color' && <BgColorPanel image={image} onReset={resetImage} />}
      {activeTab === 'generator' && <GeneratorPanel image={image} onReset={resetImage} />}
      {activeTab === 'sizes' && <SizesPanel image={image} onReset={resetImage} />}
      {activeTab === 'beauty' && <BeautyPanel image={image} onReset={resetImage} />}
    </div>
  )
}

// ========== 1. 证件照换底 ==========

function BgColorPanel({ image, onReset }) {
  const [bgColor, setBgColor] = useState('#438EDB')
  const [customColor, setCustomColor] = useState('#438EDB')
  const [useCustom, setUseCustom] = useState(false)
  const [photoSize, setPhotoSize] = useState('1寸')
  const [resultImage, setResultImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mode, setMode] = useState('simple')
  
  const canvasRef = useRef(null)

  const changeBgSimple = async () => {
    if (!image) return
    setIsProcessing(true)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const size = PHOTO_SIZES[photoSize]
      canvas.width = size.width
      canvas.height = size.height
      
      if (bgColor.includes('gradient')) {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        gradient.addColorStop(0, '#438EDB')
        gradient.addColorStop(1, '#1E5FA8')
        ctx.fillStyle = gradient
      } else {
        ctx.fillStyle = bgColor
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.85
      const x = (canvas.width - img.width * scale) / 2
      const y = (canvas.height - img.height * scale) / 2
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
      
      setResultImage(canvas.toDataURL('image/jpeg', 0.95))
      setIsProcessing(false)
    }
    img.src = image.preview
  }

  const changeBgSmart = async () => {
    if (!image) return
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', image.file)
      const res = await fetch('/bg-api/api/remove-background', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('去背景失败')
      const blob = await res.blob()
      const bgRemovedUrl = URL.createObjectURL(blob)
      
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const size = PHOTO_SIZES[photoSize]
        canvas.width = size.width
        canvas.height = size.height
        
        if (bgColor.includes('gradient')) {
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
          gradient.addColorStop(0, '#438EDB')
          gradient.addColorStop(1, '#1E5FA8')
          ctx.fillStyle = gradient
        } else {
          ctx.fillStyle = bgColor
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.85
        const x = (canvas.width - img.width * scale) / 2
        const y = (canvas.height - img.height * scale) / 2
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
        
        setResultImage(canvas.toDataURL('image/jpeg', 0.95))
        setIsProcessing(false)
      }
      img.src = bgRemovedUrl
    } catch (err) {
      console.error('智能换底失败:', err)
      alert('智能换底失败，请尝试简单换底模式')
      setIsProcessing(false)
    }
  }

  const handleProcess = () => {
    mode === 'simple' ? changeBgSimple() : changeBgSmart()
  }

  const downloadResult = () => {
    if (resultImage) {
      const link = document.createElement('a')
      link.href = resultImage
      link.download = `证件照_${photoSize}_${bgColor.replace('#', '')}.jpg`
      link.click()
    }
  }

  const downloadPrint = () => {
    if (!resultImage) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 1200
    canvas.height = 1800
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    const img = new Image()
    img.onload = () => {
      const size = PHOTO_SIZES[photoSize]
      const padding = 50, gap = 20, cols = 3, rows = 2
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = padding + col * (size.width + gap)
          const y = padding + row * (size.height + gap)
          ctx.drawImage(img, x, y, size.width, size.height)
        }
      }
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/jpeg', 0.95)
      link.download = '证件照排版_6张.jpg'
      link.click()
    }
    img.src = resultImage
  }

  useEffect(() => {
    if (image && resultImage && mode === 'simple') {
      changeBgSimple()
    }
  }, [bgColor, photoSize])

  if (!image) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        {/* 上传 */}
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <img src={image.preview} alt="原图" className="max-w-full max-h-[250px] mx-auto rounded-lg" />
          <button onClick={onReset} className="mt-4 px-4 py-2 bg-[#475569] text-[#F8FAFC] rounded-lg hover:bg-[#64748B] transition-colors">
            重新上传
          </button>
        </div>

        {/* 模式 */}
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">换底模式</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setMode('simple')} className={`p-4 rounded-xl border transition-all ${mode === 'simple' ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}>
              <div className="text-xl mb-2">⚡</div>
              <div className="font-semibold text-[#F8FAFC]">简单换底</div>
              <div className="text-sm text-[#94A3B8]">适合已有证件照</div>
            </button>
            <button onClick={() => setMode('smart')} className={`p-4 rounded-xl border transition-all ${mode === 'smart' ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}>
              <div className="text-xl mb-2">🧠</div>
              <div className="font-semibold text-[#F8FAFC]">智能抠图</div>
              <div className="text-sm text-[#94A3B8]">自动去背景换底</div>
            </button>
          </div>
        </div>

        {/* 背景色 */}
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">背景颜色</h3>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {BG_COLORS.map(color => (
              <button key={color.value} onClick={() => { setBgColor(color.value); setUseCustom(false); }}
                className={`p-3 rounded-xl border transition-all ${bgColor === color.value && !useCustom ? 'border-[#22C55E]' : 'border-[#475569]'}`}>
                <div className="w-8 h-8 rounded-lg mx-auto mb-2 border border-gray-600" style={{ backgroundColor: color.value }}></div>
                <div className="text-xs font-medium text-[#F8FAFC]">{color.name}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {GRADIENT_COLORS.map(color => (
              <button key={color.name} onClick={() => { setBgColor(color.value); setUseCustom(false); }}
                className={`p-3 rounded-xl border transition-all ${bgColor === color.value && !useCustom ? 'border-[#22C55E]' : 'border-[#475569]'}`}>
                <div className="w-8 h-8 rounded-lg mx-auto mb-2 border border-gray-600" style={{ background: color.value }}></div>
                <div className="text-xs font-medium text-[#F8FAFC]">{color.name}</div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <input type="color" value={customColor} onChange={e => { setCustomColor(e.target.value); setBgColor(e.target.value); setUseCustom(true); }} className="w-10 h-10 rounded cursor-pointer" />
            <input type="text" value={customColor} onChange={e => { setCustomColor(e.target.value); setBgColor(e.target.value); setUseCustom(true); }}
              className="flex-1 px-3 py-2 bg-[#475569] border border-[#64748B] rounded-lg text-[#F8FAFC] focus:border-[#22C55E]" placeholder="#FFFFFF" />
            <span className="text-sm text-[#94A3B8]">自定义</span>
          </div>
        </div>

        {/* 尺寸 */}
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">证件照尺寸</h3>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(PHOTO_SIZES).map(([name, size]) => (
              <button key={name} onClick={() => setPhotoSize(name)}
                className={`p-3 rounded-xl border transition-all ${photoSize === name ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}>
                <div className="font-semibold text-[#F8FAFC]">{name}</div>
                <div className="text-sm text-[#94A3B8]">{size.mm}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleProcess} disabled={isProcessing}
          className="w-full py-4 bg-[#22C55E] text-white font-semibold rounded-xl hover:bg-[#16A34A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {isProcessing ? '处理中...' : '开始换底'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569] min-h-[300px] flex flex-col items-center justify-center">
          {resultImage ? (
            <>
              <img src={resultImage} alt="结果" className="max-w-full max-h-[350px] rounded-lg shadow-lg" />
              <div className="mt-4 text-[#94A3B8] text-sm">{photoSize}证件照 · {useCustom ? customColor : (BG_COLORS.find(c => c.value === bgColor)?.name || GRADIENT_COLORS.find(c => c.value === bgColor)?.name || bgColor)}</div>
            </>
          ) : (
            <div className="text-[#94A3B8]">
              <div className="text-4xl mb-4">📷</div>
              <p>设置参数后点击"开始换底"</p>
            </div>
          )}
        </div>

        {resultImage && (
          <div className="flex gap-4">
            <button onClick={downloadResult} className="flex-1 py-3 bg-[#3B82F6] text-white font-semibold rounded-xl hover:bg-[#2563EB] transition-colors">下载证件照</button>
            <button onClick={downloadPrint} className="flex-1 py-3 bg-[#8B5CF6] text-white font-semibold rounded-xl hover:bg-[#7C3AED] transition-colors">下载排版（6张）</button>
          </div>
        )}

        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">用途参考</h3>
          <div className="space-y-2 text-sm text-[#94A3B8]">
            <div className="flex justify-between"><span>白色背景</span><span>护照、签证、身份证</span></div>
            <div className="flex justify-between"><span>蓝色背景</span><span>毕业证、工作证、简历</span></div>
            <div className="flex justify-between"><span>红色背景</span><span>结婚证、社保卡、IC卡</span></div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  )
}

// ========== 2. 一键生成证件照 ==========

function GeneratorPanel({ image, onReset }) {
  const [photoSize, setPhotoSize] = useState('1寸')
  const [bgColor, setBgColor] = useState('#FFFFFF')
  const [bgColorName, setBgColorName] = useState('白色')
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultImage, setResultImage] = useState(null)
  const [showCrop, setShowCrop] = useState(false)
  
  const canvasRef = useRef(null)
  const previewCanvasRef = useRef(null)
  const imageRef = useRef(null)

  const autoCrop = () => {
    if (!image) return
    const img = new Image()
    img.onload = () => {
      const faceWidth = img.width * 0.4
      const faceHeight = img.height * 0.5
      const x = (img.width - faceWidth) / 2
      const y = img.height * 0.1
      setCropArea({ x, y, width: faceWidth, height: faceHeight })
      drawPreview(img, { x, y, width: faceWidth, height: faceHeight })
    }
    img.src = image.preview
  }

  const adjustCrop = (direction) => {
    const delta = 20
    let newArea = { ...cropArea }
    switch (direction) {
      case 'up': newArea.y -= delta; break
      case 'down': newArea.y += delta; break
      case 'left': newArea.x -= delta; break
      case 'right': newArea.x += delta; break
      case 'wider': newArea.width += delta; newArea.x -= delta/2; break
      case 'narrower': newArea.width -= delta; newArea.x += delta/2; break
      case 'taller': newArea.height += delta; newArea.y -= delta/2; break
      case 'shorter': newArea.height -= delta; newArea.y += delta/2; break
    }
    setCropArea(newArea)
    if (image) {
      const img = new Image()
      img.onload = () => drawPreview(img, newArea)
      img.src = image.preview
    }
  }

  const drawPreview = (img, area) => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = PHOTO_SIZES[photoSize]
    canvas.width = size.width
    canvas.height = size.height
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)
  }

  const generatePhoto = () => {
    if (!image || !cropArea.width) return
    setIsProcessing(true)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const size = PHOTO_SIZES[photoSize]
      canvas.width = size.width
      canvas.height = size.height
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, cropArea.x, cropArea.y, cropArea.width, cropArea.height, 0, 0, canvas.width, canvas.height)
      setResultImage(canvas.toDataURL('image/jpeg', 0.95))
      setIsProcessing(false)
    }
    img.src = image.preview
  }

  const downloadPhoto = () => {
    if (!resultImage) return
    const link = document.createElement('a')
    link.href = resultImage
    link.download = `证件照_${photoSize}_${bgColorName}.jpg`
    link.click()
  }

  const downloadPrintSheet = () => {
    if (!resultImage) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 1200
    canvas.height = 1800
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const img = new Image()
    img.onload = () => {
      const size = PHOTO_SIZES[photoSize]
      const padding = 40, cols = 3, rows = 3
      const gapX = (canvas.width - padding * 2 - cols * size.width) / (cols - 1)
      const gapY = (canvas.height - padding * 2 - rows * size.height) / (rows - 1)
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = padding + col * (size.width + gapX)
          const y = padding + row * (size.height + gapY)
          ctx.drawImage(img, x, y, size.width, size.height)
        }
      }
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/jpeg', 0.95)
      link.download = `证件照排版_${photoSize}_9张.jpg`
      link.click()
    }
    img.src = resultImage
  }

  if (!image) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <div className="relative">
            <img ref={imageRef} src={image.preview} alt="原图" className="max-w-full max-h-[250px] mx-auto rounded-lg" />
            {showCrop && cropArea.width > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-[#22C55E] bg-[#22C55E]/10 rounded"
                  style={{ width: `${(cropArea.width / imageRef.current?.naturalWidth) * 100}%`, height: `${(cropArea.height / imageRef.current?.naturalHeight) * 100}%` }}>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={autoCrop} className="px-4 py-2 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] transition-colors">🔍 自动检测</button>
            <button onClick={onReset} className="px-4 py-2 bg-[#475569] text-[#F8FAFC] rounded-lg hover:bg-[#64748B] transition-colors">重新上传</button>
          </div>
        </div>

        {showCrop && (
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">调整裁剪区域</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div></div>
              <button onClick={() => adjustCrop('up')} className="p-2 bg-[#475569] rounded text-[#F8FAFC] hover:bg-[#64748B]">↑</button>
              <div></div>
              <button onClick={() => adjustCrop('left')} className="p-2 bg-[#475569] rounded text-[#F8FAFC] hover:bg-[#64748B]">←</button>
              <button onClick={() => adjustCrop('wider')} className="p-2 bg-[#475569] rounded text-[#F8FAFC] hover:bg-[#64748B]">放宽</button>
              <button onClick={() => adjustCrop('right')} className="p-2 bg-[#475569] rounded text-[#F8FAFC] hover:bg-[#64748B]">→</button>
              <div></div>
              <button onClick={() => adjustCrop('down')} className="p-2 bg-[#475569] rounded text-[#F8FAFC] hover:bg-[#64748B]">↓</button>
              <div></div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => adjustCrop('narrower')} className="p-2 bg-[#475569] rounded text-[#F8FAFC] text-sm hover:bg-[#64748B]">缩窄</button>
              <button onClick={() => adjustCrop('wider')} className="p-2 bg-[#475569] rounded text-[#F8FAFC] text-sm hover:bg-[#64748B]">放宽</button>
              <button onClick={() => adjustCrop('shorter')} className="p-2 bg-[#475569] rounded text-[#F8FAFC] text-sm hover:bg-[#64748B]">缩短</button>
              <button onClick={() => adjustCrop('taller')} className="p-2 bg-[#475569] rounded text-[#F8FAFC] text-sm hover:bg-[#64748B]">拉高</button>
            </div>
          </div>
        )}

        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">证件照规格</h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(PHOTO_SIZES).map(([name, size]) => (
              <button key={name} onClick={() => { setPhotoSize(name); if (cropArea.width) { const img = new Image(); img.onload = () => drawPreview(img, cropArea); img.src = image.preview } }}
                className={`p-3 rounded-xl border transition-all ${photoSize === name ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}>
                <div className="font-semibold text-[#F8FAFC]">{name}</div>
                <div className="text-sm text-[#94A3B8]">{size.mm}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">背景颜色</h3>
          <div className="grid grid-cols-4 gap-3">
            {BG_COLORS.map(c => (
              <button key={c.value} onClick={() => { setBgColor(c.value); setBgColorName(c.name); if (cropArea.width) { const img = new Image(); img.onload = () => drawPreview(img, cropArea); img.src = image.preview } }}
                className={`p-3 rounded-xl border transition-all ${bgColorName === c.name ? 'border-[#22C55E]' : 'border-[#475569]'}`}>
                <div className="w-8 h-8 rounded-lg mx-auto mb-2 border border-gray-600" style={{ backgroundColor: c.value }}></div>
                <div className="text-xs font-medium text-[#F8FAFC]">{c.name}</div>
              </button>
            ))}
          </div>
        </div>

        {cropArea.width > 0 && (
          <button onClick={generatePhoto} disabled={isProcessing}
            className="w-full py-4 bg-[#22C55E] text-white font-semibold rounded-xl hover:bg-[#16A34A] transition-colors disabled:opacity-50">
            {isProcessing ? '生成中...' : '✨ 生成证件照'}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {showCrop && (
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">实时预览</h3>
            <canvas ref={previewCanvasRef} className="mx-auto rounded-lg shadow-lg bg-white max-w-full" />
            <div className="mt-2 text-center text-sm text-[#94A3B8]">{photoSize} · {bgColorName}背景</div>
          </div>
        )}

        {resultImage && (
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">生成结果</h3>
            <img src={resultImage} alt="证件照" className="mx-auto rounded-lg shadow-lg max-w-full" />
            <div className="flex gap-4 mt-4">
              <button onClick={downloadPhoto} className="flex-1 py-3 bg-[#3B82F6] text-white font-semibold rounded-xl hover:bg-[#2563EB] transition-colors">下载证件照</button>
              <button onClick={downloadPrintSheet} className="flex-1 py-3 bg-[#8B5CF6] text-white font-semibold rounded-xl hover:bg-[#7C3AED] transition-colors">下载排版（9张）</button>
            </div>
          </div>
        )}

        {!resultImage && (
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569] min-h-[200px] flex items-center justify-center">
            <div className="text-center text-[#94A3B8]">
              <div className="text-4xl mb-4">📸</div>
              <p>自动检测人脸后生成</p>
            </div>
          </div>
        )}

        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">使用说明</h3>
          <div className="space-y-2 text-sm text-[#94A3B8]">
            <p>1. 上传正面照片，确保面部清晰</p>
            <p>2. 点击"自动检测"定位人脸</p>
            <p>3. 调整裁剪区域确保头部完整</p>
            <p>4. 选择规格和背景颜色</p>
            <p>5. 生成后下载单张或排版图</p>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  )
}

// ========== 3. 多尺寸证件照 ==========

function SizesPanel({ image, onReset }) {
  const [selectedSizes, setSelectedSizes] = useState(['china-1inch'])
  const [bgColor, setBgColor] = useState('#FFFFFF')
  const [results, setResults] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const canvasRef = useRef(null)

  const toggleSize = (id) => {
    setSelectedSizes(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const generatePhotos = () => {
    if (!image || selectedSizes.length === 0) return
    setIsProcessing(true)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const newResults = []
      selectedSizes.forEach(sizeId => {
        const spec = PHOTO_SPECS.find(s => s.id === sizeId)
        if (!spec) return
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        canvas.width = spec.width
        canvas.height = spec.height
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height)
        const sw = img.width * scale, sh = img.height * scale
        const x = (canvas.width - sw) / 2, y = (canvas.height - sh) / 2
        ctx.drawImage(img, x, y, sw, sh)
        newResults.push({ id: sizeId, name: spec.name, size: spec.mm, usage: spec.usage, width: spec.width, height: spec.height, url: canvas.toDataURL('image/jpeg', 0.95) })
      })
      setResults(newResults)
      setIsProcessing(false)
    }
    img.src = image.preview
  }

  const downloadSingle = (result) => {
    const link = document.createElement('a')
    link.href = result.url
    link.download = `证件照_${result.name}_${result.width}x${result.height}.jpg`
    link.click()
  }

  const downloadAll = () => {
    results.forEach((result, i) => setTimeout(() => downloadSingle(result), 200 * i))
  }

  const downloadPrintSheet = () => {
    if (results.length === 0) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 1200
    canvas.height = 1800
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    let loaded = 0
    results.forEach((result, index) => {
      const img = new Image()
      img.onload = () => {
        loaded++
        const col = index % 3, row = Math.floor(index / 3)
        const padding = 30, gap = 20
        const x = padding + col * (result.width + gap), y = padding + row * (result.height + gap)
        ctx.drawImage(img, x, y, result.width, result.height)
        ctx.fillStyle = '#333333'
        ctx.font = '12px sans-serif'
        ctx.fillText(result.name, x, y + result.height + 15)
        if (loaded === results.length) {
          const link = document.createElement('a')
          link.href = canvas.toDataURL('image/jpeg', 0.95)
          link.download = '证件照多规格排版.jpg'
          link.click()
        }
      }
      img.src = result.url
    })
  }

  if (!image) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <img src={image.preview} alt="原图" className="max-w-full max-h-[200px] mx-auto rounded-lg" />
          <button onClick={onReset} className="mt-4 px-4 py-2 bg-[#475569] text-[#F8FAFC] rounded-lg hover:bg-[#64748B] transition-colors">重新上传</button>
        </div>

        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">选择规格（可多选）</h3>
          <div className="grid grid-cols-2 gap-3">
            {PHOTO_SPECS.map(spec => (
              <button key={spec.id} onClick={() => toggleSize(spec.id)}
                className={`p-3 rounded-xl border transition-all text-left ${selectedSizes.includes(spec.id) ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-[#F8FAFC]">{spec.name}</span>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${selectedSizes.includes(spec.id) ? 'bg-[#22C55E] text-white' : 'bg-[#64748B] text-[#94A3B8]'}`}>
                    {selectedSizes.includes(spec.id) ? '✓' : ''}
                  </span>
                </div>
                <div className="text-sm text-[#94A3B8]">{spec.mm}</div>
                <div className="text-xs text-[#64748B] mt-1">{spec.usage}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 text-sm text-[#94A3B8]">已选择 {selectedSizes.length} 种规格</div>
        </div>

        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">背景颜色</h3>
          <div className="flex gap-4">
            {BG_COLORS.map(c => (
              <button key={c.value} onClick={() => setBgColor(c.value)}
                className={`flex-1 p-3 rounded-xl border transition-all ${bgColor === c.value ? 'border-[#22C55E]' : 'border-[#475569]'}`}>
                <div className="w-10 h-10 rounded-lg mx-auto mb-2 border border-gray-600" style={{ backgroundColor: c.value }}></div>
                <div className="text-sm font-medium text-[#F8FAFC]">{c.name}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedSizes.length > 0 && (
          <button onClick={generatePhotos} disabled={isProcessing}
            className="w-full py-4 bg-[#22C55E] text-white font-semibold rounded-xl hover:bg-[#16A34A] transition-colors disabled:opacity-50">
            {isProcessing ? `生成中 (${selectedSizes.length}种)...` : `生成 ${selectedSizes.length} 种规格证件照`}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {results.length > 0 ? (
          <>
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">生成结果</h3>
              <div className="grid grid-cols-2 gap-4">
                {results.map(result => (
                  <div key={result.id} className="bg-[#475569]/20 rounded-xl p-3">
                    <img src={result.url} alt={result.name} className="mx-auto rounded-lg shadow max-w-full" />
                    <div className="mt-2 text-center">
                      <div className="font-semibold text-[#F8FAFC]">{result.name}</div>
                      <div className="text-xs text-[#94A3B8]">{result.size}</div>
                    </div>
                    <button onClick={() => downloadSingle(result)} className="w-full mt-2 py-1 bg-[#3B82F6] text-white text-sm rounded-lg hover:bg-[#2563EB] transition-colors">下载</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={downloadAll} className="flex-1 py-3 bg-[#3B82F6] text-white font-semibold rounded-xl hover:bg-[#2563EB] transition-colors">批量下载全部</button>
              <button onClick={downloadPrintSheet} className="flex-1 py-3 bg-[#8B5CF6] text-white font-semibold rounded-xl hover:bg-[#7C3AED] transition-colors">下载排版图</button>
            </div>
          </>
        ) : (
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569] min-h-[300px] flex items-center justify-center">
            <div className="text-center text-[#94A3B8]">
              <div className="text-4xl mb-4">📋</div>
              <p>选择规格后批量生成</p>
            </div>
          </div>
        )}

        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">规格说明</h3>
          <div className="space-y-2 text-sm text-[#94A3B8]">
            <p>• 所有规格按300dpi标准生成，适合打印</p>
            <p>• 建议上传正面清晰照片，背景简单</p>
            <p>• 白色背景适用于大多数证件照</p>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  )
}

// ========== 4. 美颜证件照 ==========

function BeautyPanel({ image, onReset }) {
  const [beautyParams, setBeautyParams] = useState({ smoothing: 30, brightness: 10, contrast: 5, saturation: 0, whitening: 20 })
  const [selectedPreset, setSelectedPreset] = useState('证件照')
  const [resultImage, setResultImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const canvasRef = useRef(null)

  const applyPreset = (presetName) => {
    const preset = BEAUTY_PRESETS.find(p => p.name === presetName)
    if (preset) {
      setBeautyParams(preset.values)
      setSelectedPreset(presetName)
      if (image) setTimeout(() => applyBeauty(), 100)
    }
  }

  const updateParam = (param, value) => {
    setBeautyParams(prev => ({ ...prev, [param]: parseInt(value) }))
    setSelectedPreset('')
  }

  const applyBeauty = () => {
    if (!image) return
    setIsProcessing(true)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      const { smoothing, brightness, contrast, saturation, whitening } = beautyParams

      if (brightness !== 0) {
        const b = brightness * 2.55
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, data[i] + b))
          data[i+1] = Math.min(255, Math.max(0, data[i+1] + b))
          data[i+2] = Math.min(255, Math.max(0, data[i+2] + b))
        }
      }

      if (contrast !== 0) {
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128))
          data[i+1] = Math.min(255, Math.max(0, factor * (data[i+1] - 128) + 128))
          data[i+2] = Math.min(255, Math.max(0, factor * (data[i+2] - 128) + 128))
        }
      }

      if (saturation !== 0) {
        const s = saturation / 100
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.2989 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]
          data[i] = Math.min(255, Math.max(0, gray + (data[i] - gray) * (1 + s)))
          data[i+1] = Math.min(255, Math.max(0, gray + (data[i+1] - gray) * (1 + s)))
          data[i+2] = Math.min(255, Math.max(0, gray + (data[i+2] - gray) * (1 + s)))
        }
      }

      if (whitening > 0) {
        const w = whitening / 100
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i+1] + data[i+2]) / 3
          if (brightness > 100) {
            data[i] = Math.min(255, data[i] + (255 - data[i]) * w * 0.3)
            data[i+1] = Math.min(255, data[i+1] + (255 - data[i+1]) * w * 0.3)
            data[i+2] = Math.min(255, data[i+2] + (255 - data[i+2]) * w * 0.3)
          }
        }
      }

      if (smoothing > 0) {
        const radius = Math.ceil(smoothing / 10)
        const tempData = new Uint8ClampedArray(data)
        for (let y = radius; y < canvas.height - radius; y++) {
          for (let x = radius; x < canvas.width - radius; x++) {
            let r = 0, g = 0, b = 0, count = 0
            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                const idx = ((y + dy) * canvas.width + (x + dx)) * 4
                r += tempData[idx]; g += tempData[idx+1]; b += tempData[idx+2]; count++
              }
            }
            const idx = (y * canvas.width + x) * 4
            const blend = smoothing / 100
            data[idx] = tempData[idx] * (1 - blend) + (r / count) * blend
            data[idx+1] = tempData[idx+1] * (1 - blend) + (g / count) * blend
            data[idx+2] = tempData[idx+2] * (1 - blend) + (b / count) * blend
          }
        }
      }

      ctx.putImageData(imageData, 0, 0)
      setResultImage(canvas.toDataURL('image/jpeg', 0.95))
      setIsProcessing(false)
    }
    img.src = image.preview
  }

  const downloadResult = () => {
    if (!resultImage) return
    const link = document.createElement('a')
    link.href = resultImage
    link.download = `美颜证件照_${Date.now()}.jpg`
    link.click()
  }

  if (!image) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#F8FAFC]">原图</h3>
            <button onClick={() => setCompareMode(!compareMode)} className="px-3 py-1 bg-[#475569] text-[#F8FAFC] rounded-lg text-sm hover:bg-[#64748B] transition-colors">
              {compareMode ? '隐藏对比' : '对比模式'}
            </button>
          </div>
          <img src={image.preview} alt="原图" className={`max-w-full max-h-[250px] mx-auto rounded-lg ${compareMode ? 'opacity-50' : ''}`} />
          <button onClick={onReset} className="mt-4 px-4 py-2 bg-[#475569] text-[#F8FAFC] rounded-lg hover:bg-[#64748B] transition-colors">重新上传</button>
        </div>

        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">预设方案</h3>
          <div className="grid grid-cols-4 gap-3">
            {BEAUTY_PRESETS.map(preset => (
              <button key={preset.name} onClick={() => applyPreset(preset.name)}
                className={`p-3 rounded-xl border transition-all ${selectedPreset === preset.name ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}>
                <div className="font-semibold text-[#F8FAFC] text-sm">{preset.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">精细调整</h3>
          <div className="space-y-4">
            {Object.entries(BEAUTY_OPTIONS).map(([key, option]) => (
              <div key={key}>
                <div className="flex justify-between mb-2">
                  <span className="text-[#F8FAFC]">{option.name}</span>
                  <span className="text-[#94A3B8]">{beautyParams[key]}</span>
                </div>
                <input type="range" min={option.min} max={option.max} value={beautyParams[key]} onChange={e => updateParam(key, e.target.value)}
                  className="w-full h-2 bg-[#475569] rounded-lg appearance-none cursor-pointer accent-[#22C55E]" />
                <p className="text-xs text-[#64748B] mt-1">{option.desc}</p>
              </div>
            ))}
          </div>
          <button onClick={applyBeauty} disabled={isProcessing}
            className="w-full mt-4 py-3 bg-[#22C55E] text-white font-semibold rounded-xl hover:bg-[#16A34A] transition-colors disabled:opacity-50">
            {isProcessing ? '处理中...' : '应用美颜'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {resultImage ? (
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">美颜结果</h3>
            <div className="relative">
              <img src={resultImage} alt="结果" className="max-w-full max-h-[400px] mx-auto rounded-lg shadow-lg" />
              {compareMode && <img src={image.preview} alt="原图对比" className="absolute top-0 left-0 max-w-full max-h-[400px] opacity-50 rounded-lg pointer-events-none" />}
            </div>
            <div className="flex gap-4 mt-4">
              <button onClick={downloadResult} className="flex-1 py-3 bg-[#3B82F6] text-white font-semibold rounded-xl hover:bg-[#2563EB] transition-colors">下载美颜照</button>
              <button onClick={() => setCompareMode(!compareMode)} className="flex-1 py-3 bg-[#475569] text-[#F8FAFC] font-semibold rounded-xl hover:bg-[#64748B] transition-colors">{compareMode ? '关闭对比' : '原图对比'}</button>
            </div>
          </div>
        ) : (
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569] min-h-[300px] flex items-center justify-center">
            <div className="text-center text-[#94A3B8]">
              <div className="text-4xl mb-4">✨</div>
              <p>选择预设或调整后应用美颜</p>
            </div>
          </div>
        )}

        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">美颜说明</h3>
          <div className="space-y-2 text-sm text-[#94A3B8]">
            <p>• 轻度美颜，保持自然真实</p>
            <p>• 磨皮平滑皮肤，不影响五官</p>
            <p>• 美白均匀肤色，不过度漂白</p>
            <p>• 证件照建议使用"证件照"预设</p>
            <p>• 重要证件请谨慎使用美颜</p>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  )
}

export default PhotoTools
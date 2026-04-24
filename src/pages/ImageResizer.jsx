import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import UploadArea from '../components/UploadArea'

function ImageResizer() {
  const [images, setImages] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedFiles, setProcessedFiles] = useState([])

  const PRESETS = [
    { id: 'custom', name: '自定义尺寸', width: '', height: '' },
    { id: '720p', name: 'HD (720p)', width: 1280, height: 720 },
    { id: '1080p', name: 'Full HD (1080p)', width: 1920, height: 1080 },
    { id: '2k', name: '2K QHD', width: 2560, height: 1440 },
    { id: '4k', name: '4K UHD', width: 3840, height: 2160 },
    { id: 'avatar', name: '头像 (512x512)', width: 512, height: 512 },
    { id: 'wechat', name: '微信公众号 (900x383)', width: 900, height: 383 },
  ]

  // 全局设置
  const [selectedPreset, setSelectedPreset] = useState('custom')
  const [globalWidth, setGlobalWidth] = useState('')
  const [globalHeight, setGlobalHeight] = useState('')
  const [lockAspect, setLockAspect] = useState(true)
  const [resizeMode, setResizeMode] = useState('scale') // 'scale' | 'fixed'

  const handlePresetChange = (presetId) => {
    setSelectedPreset(presetId)
    const preset = PRESETS.find(p => p.id === presetId)
    if (preset && presetId !== 'custom') {
        setGlobalWidth(preset.width.toString())
        setGlobalHeight(preset.height.toString())
    }
  }

  // 处理文件上传
  const handleDrop = useCallback((acceptedFiles) => {
    const newImages = acceptedFiles.map(file => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.src = url

      return {
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        size: file.size,
        preview: url,
        originalWidth: 0,
        originalHeight: 0,
        targetWidth: 0,
        targetHeight: 0,
        aspectRatio: 1
      }
    })

    // 读取原始尺寸
    newImages.forEach(item => {
      const img = new Image()
      img.onload = () => {
        setImages(prev => prev.map(i => {
          if (i.id === item.id) {
            return {
              ...i,
              originalWidth: img.width,
              originalHeight: img.height,
              targetWidth: img.width,
              targetHeight: img.height,
              aspectRatio: img.width / img.height
            }
          }
          return i
        }))
      }
      img.src = item.preview
    })

    setImages(prev => [...prev, ...newImages])
  }, [])

  // 批量调整所有目标尺寸
  useEffect(() => {
    if (images.length === 0) return

    setImages(prev => prev.map(img => {
      let tw = img.targetWidth
      let th = img.targetHeight

      if (resizeMode === 'scale') {
        // 如果是比例缩放，通常基于宽或者高中的一个
        if (globalWidth && !globalHeight) {
          tw = parseInt(globalWidth)
          th = Math.round(tw / img.aspectRatio)
        } else if (!globalWidth && globalHeight) {
          th = parseInt(globalHeight)
          tw = Math.round(th * img.aspectRatio)
        } else if (globalWidth && globalHeight) {
          tw = parseInt(globalWidth)
          th = lockAspect ? Math.round(tw / img.aspectRatio) : parseInt(globalHeight)
        }
      } else if (resizeMode === 'fixed') {
        if (globalWidth) tw = parseInt(globalWidth)
        if (globalHeight) th = parseInt(globalHeight)
      }

      return { ...img, targetWidth: tw || img.originalWidth, targetHeight: th || img.originalHeight }
    }))
  }, [globalWidth, globalHeight, lockAspect, resizeMode])

  const handleResize = async () => {
    setIsProcessing(true)
    const results = []

    for (const item of images) {
      const result = await new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = item.targetWidth
          canvas.height = item.targetHeight
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, item.targetWidth, item.targetHeight)

          canvas.toBlob((blob) => {
            resolve({
              blob,
              name: `resized-${item.name}`,
              width: item.targetWidth,
              height: item.targetHeight
            })
          }, item.file.type, 0.95)
        }
        img.src = item.preview
      })
      results.push(result)
    }

    setProcessedFiles(results)
    setIsProcessing(false)
  }

  const downloadAll = async () => {
    if (processedFiles.length === 1) {
      saveAs(processedFiles[0].blob, processedFiles[0].name)
      return
    }
    const zip = new JSZip()
    processedFiles.forEach(f => zip.file(f.name, f.blob))
    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, `resized-images-${Date.now()}.zip`)
  }

  const clearAll = () => {
    images.forEach(i => URL.revokeObjectURL(i.preview))
    setImages([])
    setProcessedFiles([])
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回工具列表
      </Link>

      <div className="text-center mb-10">
        <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-3 tracking-tight">图片分辨率调整</h1>
        <p className="text-[#94A3B8] text-lg font-medium">支持批量处理、比例锁定与高质量智能缩放</p>
      </div>

      <div className="bg-[#1E293B]/80 backdrop-blur-xl rounded-3xl p-8 mb-10 border border-[#475569] shadow-2xl overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
        
        {/* 预设分辨率选择 */}
        <div className="mb-8 relative">
           <label className="text-[10px] uppercase tracking-widest font-black text-blue-400 mb-4 block opacity-80">目标分辨率预设</label>
           <div className="flex flex-wrap gap-2.5">
              {PRESETS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handlePresetChange(p.id)}
                    className={`px-5 py-3 rounded-2xl text-[11px] font-black tracking-tight transition-all border-2 ${
                        selectedPreset === p.id 
                        ? 'bg-blue-500 border-blue-400 text-[#0F172A] shadow-xl shadow-blue-500/30 ring-2 ring-blue-500/20'
                        : 'bg-[#0F172A]/50 border-[#334155] text-[#94A3B8] hover:border-blue-400/50 hover:text-white'
                    }`}
                  >
                    {p.name}
                  </button>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-end relative">
          <div className={`space-y-3 transition-all duration-300 ${selectedPreset === 'custom' ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
            <label className="text-[10px] font-black text-blue-400 uppercase tracking-wider">宽度 (px)</label>
            <input
              type="number"
              placeholder="自动"
              disabled={selectedPreset !== 'custom'}
              value={globalWidth}
              onChange={(e) => setGlobalWidth(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-[#334155] text-sm font-bold"
            />
          </div>
          <div className={`space-y-3 transition-all duration-300 ${selectedPreset === 'custom' ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
            <label className="text-[10px] font-black text-purple-400 uppercase tracking-wider">高度 (px)</label>
            <input
              type="number"
              placeholder="自动"
              disabled={selectedPreset !== 'custom'}
              value={globalHeight}
              onChange={(e) => setGlobalHeight(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder:text-[#334155] text-sm font-bold"
            />
          </div>
          <div className="flex items-center gap-5 h-14">
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <div className="relative">
                <input
                    type="checkbox"
                    checked={lockAspect}
                    onChange={(e) => setLockAspect(e.target.checked)}
                    className="sr-only peer"
                />
                <div className="w-10 h-6 bg-[#0F172A] border border-[#334155] rounded-full peer-checked:bg-blue-500 transition-all"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-[#94A3B8] rounded-full transition-all peer-checked:translate-x-4 peer-checked:bg-white shadow"></div>
              </div>
              <span className="text-[11px] font-black text-[#94A3B8] group-hover:text-white transition-colors uppercase tracking-widest">锁定比例</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleResize}
              disabled={images.length === 0 || isProcessing}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-[#0F172A] text-xs font-black uppercase tracking-widest py-5 rounded-3xl disabled:opacity-50 disabled:grayscale transition-all shadow-2xl shadow-blue-500/20 active:scale-95"
            >
              {isProcessing ? '处理中...' : '开始调整'}
            </button>
            {processedFiles.length > 0 && (
              <button
                onClick={downloadAll}
                className="bg-emerald-500 hover:bg-emerald-400 text-[#0F172A] font-black px-8 py-5 rounded-3xl transition-all shadow-2xl shadow-emerald-500/30 active:scale-95"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4-4v12" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <UploadArea onDrop={handleDrop} />

      {images.length > 0 && (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map(img => (
            <div key={img.id} className="bg-[#1E293B]/40 rounded-2xl border border-[#334155] overflow-hidden group hover:border-blue-500/50 transition-all">
              <div className="aspect-video relative overflow-hidden bg-[#0F172A]">
                <img src={img.preview} className="w-full h-full object-contain" />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm p-3 flex justify-between items-center">
                  <span className="text-[10px] text-white/60 font-mono">原始: {img.originalWidth}x{img.originalHeight}</span>
                  <span className="text-xs text-blue-400 font-bold">目标: {img.targetWidth}x{img.targetHeight}</span>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="truncate pr-4">
                  <p className="text-sm text-[#F8FAFC] font-medium truncate">{img.name}</p>
                  <p className="text-[10px] text-[#94A3B8]">{(img.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => {
                    URL.revokeObjectURL(img.preview)
                    setImages(prev => prev.filter(i => i.id !== img.id))
                  }}
                  className="p-2 text-[#94A3B8] hover:text-red-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button onClick={clearAll} className="text-[#94A3B8] hover:text-white text-sm flex items-center gap-2 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            清空数据列表
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageResizer

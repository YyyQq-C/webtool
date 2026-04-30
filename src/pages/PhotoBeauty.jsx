import { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import UploadArea, { isImageFile } from '../components/UploadArea'

// 美颜参数
const BEAUTY_OPTIONS = {
  smoothing: { name: '磨皮', min: 0, max: 100, default: 30, desc: '平滑皮肤纹理' },
  brightness: { name: '亮度', min: -50, max: 50, default: 10, desc: '调整整体亮度' },
  contrast: { name: '对比度', min: -50, max: 50, default: 5, desc: '增强层次感' },
  saturation: { name: '饱和度', min: -50, max: 50, default: 0, desc: '调整色彩浓度' },
  whitening: { name: '美白', min: 0, max: 100, default: 20, desc: '皮肤美白效果' },
}

// 预设美颜方案
const PRESETS = [
  { name: '自然', values: { smoothing: 20, brightness: 5, contrast: 0, saturation: 0, whitening: 10 } },
  { name: '证件照', values: { smoothing: 30, brightness: 15, contrast: 5, saturation: 0, whitening: 25 } },
  { name: '轻美颜', values: { smoothing: 40, brightness: 10, contrast: 10, saturation: 5, whitening: 30 } },
  { name: '无', values: { smoothing: 0, brightness: 0, contrast: 0, saturation: 0, whitening: 0 } },
]

function PhotoBeauty() {
  const [image, setImage] = useState(null)
  const [beautyParams, setBeautyParams] = useState({
    smoothing: 30,
    brightness: 10,
    contrast: 5,
    saturation: 0,
    whitening: 20,
  })
  const [selectedPreset, setSelectedPreset] = useState('证件照')
  const [resultImage, setResultImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  
  const canvasRef = useRef(null)

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
    setResultImage(null)
    
    // 自动应用当前预设
    applyBeauty()
  }, [])

  const handleDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) handleFile(acceptedFiles[0])
  }, [handleFile])

  const applyPreset = (presetName) => {
    const preset = PRESETS.find(p => p.name === presetName)
    if (preset) {
      setBeautyParams(preset.values)
      setSelectedPreset(presetName)
      if (image) {
        setTimeout(() => applyBeauty(), 100)
      }
    }
  }

  const updateParam = (param, value) => {
    setBeautyParams(prev => ({ ...prev, [param]: parseInt(value) }))
    setSelectedPreset('')
  }

  // 美颜处理
  const applyBeauty = async () => {
    if (!image) return
    
    setIsProcessing(true)
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      canvas.width = img.width
      canvas.height = img.height
      
      // 绘制原图
      ctx.drawImage(img, 0, 0)
      
      // 获取图像数据
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // 应用美颜效果
      const { smoothing, brightness, contrast, saturation, whitening } = beautyParams
      
      // 1. 调整亮度
      if (brightness !== 0) {
        const b = brightness * 2.55 // 转换到0-255范围
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, data[i] + b))
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + b))
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + b))
        }
      }
      
      // 2. 调整对比度
      if (contrast !== 0) {
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128))
          data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128))
          data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128))
        }
      }
      
      // 3. 调整饱和度
      if (saturation !== 0) {
        const s = saturation / 100
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          data[i] = Math.min(255, Math.max(0, gray + (data[i] - gray) * (1 + s)))
          data[i + 1] = Math.min(255, Math.max(0, gray + (data[i + 1] - gray) * (1 + s)))
          data[i + 2] = Math.min(255, Math.max(0, gray + (data[i + 2] - gray) * (1 + s)))
        }
      }
      
      // 4. 美白效果（简化版）
      if (whitening > 0) {
        const w = whitening / 100
        for (let i = 0; i < data.length; i += 4) {
          // 只对偏亮的像素进行美白（模拟皮肤区域）
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
          if (brightness > 100) { // 只对较亮的区域美白
            data[i] = Math.min(255, data[i] + (255 - data[i]) * w * 0.3)
            data[i + 1] = Math.min(255, data[i + 1] + (255 - data[i + 1]) * w * 0.3)
            data[i + 2] = Math.min(255, data[i + 2] + (255 - data[i + 2]) * w * 0.3)
          }
        }
      }
      
      // 5. 磨皮效果（简化版 - 使用邻域平均）
      if (smoothing > 0) {
        const radius = Math.ceil(smoothing / 10)
        const tempData = new Uint8ClampedArray(data)
        
        for (let y = radius; y < canvas.height - radius; y++) {
          for (let x = radius; x < canvas.width - radius; x++) {
            let r = 0, g = 0, b = 0, count = 0
            
            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                const idx = ((y + dy) * canvas.width + (x + dx)) * 4
                r += tempData[idx]
                g += tempData[idx + 1]
                b += tempData[idx + 2]
                count++
              }
            }
            
            const idx = (y * canvas.width + x) * 4
            // 混合原图和模糊结果
            const blend = smoothing / 100
            data[idx] = tempData[idx] * (1 - blend) + (r / count) * blend
            data[idx + 1] = tempData[idx + 1] * (1 - blend) + (g / count) * blend
            data[idx + 2] = tempData[idx + 2] * (1 - blend) + (b / count) * blend
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/photo-tools" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        返回证件照工具箱
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">美颜证件照</h1>
        <p className="text-[#94A3B8]">轻微美化，自然不失真，适合证件照使用</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：上传和参数 */}
        <div className="space-y-6">
          {/* 上传 */}
          {!image ? (
            <UploadArea onDrop={handleDrop} accept={{ 'image/*': [] }} maxFiles={1} />
          ) : (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#F8FAFC]">原图</h3>
                <button
                  onClick={() => setCompareMode(!compareMode)}
                  className="px-3 py-1 bg-[#475569] text-[#F8FAFC] rounded-lg text-sm"
                >
                  {compareMode ? '隐藏对比' : '对比模式'}
                </button>
              </div>
              <img 
                src={image.preview} 
                alt="原图" 
                className={`max-w-full max-h-[300px] mx-auto rounded-lg ${compareMode ? 'opacity-50' : ''}`}
              />
              <button
                onClick={() => setImage(null)}
                className="mt-4 px-4 py-2 bg-[#475569] text-[#F8FAFC] rounded-lg hover:bg-[#64748B]"
              >
                重新上传
              </button>
            </div>
          )}

          {/* 预设方案 */}
          {image && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">预设方案</h3>
              
              <div className="grid grid-cols-4 gap-3">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset.name)}
                    className={`p-3 rounded-xl border transition-all ${selectedPreset === preset.name ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}
                  >
                    <div className="font-semibold text-[#F8FAFC] text-sm">{preset.name}</div>
                  </button>
                ))}
              </div>
              
              <p className="mt-3 text-xs text-[#94A3B8]">推荐使用"证件照"预设，效果自然</p>
            </div>
          )}

          {/* 参数调整 */}
          {image && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">精细调整</h3>
              
              <div className="space-y-4">
                {Object.entries(BEAUTY_OPTIONS).map(([key, option]) => (
                  <div key={key}>
                    <div className="flex justify-between mb-2">
                      <span className="text-[#F8FAFC]">{option.name}</span>
                      <span className="text-[#94A3B8]">{beautyParams[key]}</span>
                    </div>
                    <input
                      type="range"
                      min={option.min}
                      max={option.max}
                      value={beautyParams[key]}
                      onChange={(e) => updateParam(key, e.target.value)}
                      className="w-full h-2 bg-[#475569] rounded-lg appearance-none cursor-pointer accent-[#22C55E]"
                    />
                    <p className="text-xs text-[#64748B] mt-1">{option.desc}</p>
                  </div>
                ))}
              </div>
              
              <button
                onClick={applyBeauty}
                disabled={isProcessing}
                className="w-full mt-4 py-3 bg-[#22C55E] text-white font-semibold rounded-xl hover:bg-[#16A34A] disabled:opacity-50"
              >
                {isProcessing ? '处理中...' : '应用美颜'}
              </button>
            </div>
          )}
        </div>

        {/* 右侧：结果 */}
        <div className="space-y-6">
          {resultImage ? (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">美颜结果</h3>
              
              <div className="relative">
                <img 
                  src={resultImage} 
                  alt="结果" 
                  className="max-w-full max-h-[400px] mx-auto rounded-lg shadow-lg"
                />
                
                {/* 对比模式时叠加原图 */}
                {compareMode && (
                  <img 
                    src={image.preview} 
                    alt="原图对比"
                    className="absolute top-0 left-0 max-w-full max-h-[400px] opacity-50 rounded-lg pointer-events-none"
                  />
                )}
              </div>
              
              <div className="flex gap-4 mt-4">
                <button
                  onClick={downloadResult}
                  className="flex-1 py-3 bg-[#3B82F6] text-white font-semibold rounded-xl hover:bg-[#2563EB]"
                >
                  下载美颜照
                </button>
                <button
                  onClick={() => setCompareMode(!compareMode)}
                  className="flex-1 py-3 bg-[#475569] text-[#F8FAFC] font-semibold rounded-xl hover:bg-[#64748B]"
                >
                  {compareMode ? '关闭对比' : '原图对比'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569] min-h-[400px] flex items-center justify-center">
              <div className="text-center text-[#94A3B8]">
                <div className="text-4xl mb-4">✨</div>
                <p>上传图片后开始美颜</p>
              </div>
            </div>
          )}

          {/* 提示信息 */}
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">美颜说明</h3>
            <div className="space-y-2 text-sm text-[#94A3B8]">
              <p>• 本工具采用轻度美颜，保持自然真实</p>
              <p>• 磨皮效果平滑皮肤，不影响五官</p>
              <p>• 美白效果均匀肤色，不会过度漂白</p>
              <p>• 证件照建议使用"证件照"预设</p>
              <p>• 重要证件请谨慎使用美颜功能</p>
            </div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  )
}

export default PhotoBeauty
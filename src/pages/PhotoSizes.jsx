import { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import UploadArea, { isImageFile } from '../components/UploadArea'

// 证件照规格库
const PHOTO_SPECS = [
  {
    id: 'china-1inch',
    name: '中国1寸',
    width: 295,
    height: 413,
    mm: '25×35mm',
    dpi: 300,
    usage: '身份证、工作证、学生证',
    bgColor: '#FFFFFF',
  },
  {
    id: 'china-2inch',
    name: '中国2寸',
    width: 413,
    height: 579,
    mm: '35×49mm',
    dpi: 300,
    usage: '护照、签证、毕业证',
    bgColor: '#FFFFFF',
  },
  {
    id: 'china-small-2inch',
    name: '中国小2寸',
    width: 413,
    height: 531,
    mm: '35×45mm',
    dpi: 300,
    usage: '部分公务员考试',
    bgColor: '#FFFFFF',
  },
  {
    id: 'us-visa',
    name: '美国签证',
    width: 600,
    height: 600,
    mm: '51×51mm',
    dpi: 300,
    usage: '美国签证申请',
    bgColor: '#FFFFFF',
  },
  {
    id: 'eu-visa',
    name: '欧洲签证',
    width: 413,
    height: 531,
    mm: '35×45mm',
    dpi: 300,
    usage: '申根签证、英国签证',
    bgColor: '#FFFFFF',
  },
  {
    id: 'japan-visa',
    name: '日本签证',
    width: 450,
    height: 450,
    mm: '45×45mm',
    dpi: 300,
    usage: '日本签证申请',
    bgColor: '#FFFFFF',
  },
  {
    id: 'korea-visa',
    name: '韩国签证',
    width: 413,
    height: 531,
    mm: '35×45mm',
    dpi: 300,
    usage: '韩国签证申请',
    bgColor: '#FFFFFF',
  },
  {
    id: 'driver-license',
    name: '驾驶证',
    width: 260,
    height: 378,
    mm: '22×32mm',
    dpi: 300,
    usage: '中国驾驶证',
    bgColor: '#FFFFFF',
  },
  {
    id: 'social-security',
    name: '社保卡',
    width: 358,
    height: 441,
    mm: '26×32mm',
    dpi: 300,
    usage: '社保卡、医保卡',
    bgColor: '#FFFFFF',
  },
]

const BG_COLORS = {
  '白色': '#FFFFFF',
  '蓝色': '#438EDB',
  '红色': '#D92B2B',
}

function PhotoSizes() {
  const [image, setImage] = useState(null)
  const [selectedSizes, setSelectedSizes] = useState(['china-1inch'])
  const [bgColor, setBgColor] = useState('#FFFFFF')
  const [results, setResults] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  
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
    setResults([])
  }, [])

  const handleDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) handleFile(acceptedFiles[0])
  }, [handleFile])

  const toggleSize = (id) => {
    setSelectedSizes(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    )
  }

  const generatePhotos = async () => {
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
        
        // 填充背景
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // 计算缩放比例（保持人像居中）
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        const x = (canvas.width - scaledWidth) / 2
        const y = (canvas.height - scaledHeight) / 2
        
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
        
        newResults.push({
          id: sizeId,
          name: spec.name,
          size: spec.mm,
          usage: spec.usage,
          width: spec.width,
          height: spec.height,
          url: canvas.toDataURL('image/jpeg', 0.95),
        })
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
    results.forEach(result => {
      setTimeout(() => downloadSingle(result), 200 * results.indexOf(result))
    })
  }

  const downloadPrintSheet = () => {
    if (results.length === 0) return
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // 6寸相纸
    canvas.width = 1200
    canvas.height = 1800
    
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    let loaded = 0
    results.forEach((result, index) => {
      const img = new Image()
      img.onload = () => {
        loaded++
        
        const col = index % 3
        const row = Math.floor(index / 3)
        const padding = 30
        const gap = 20
        
        const x = padding + col * (result.width + gap)
        const y = padding + row * (result.height + gap)
        
        ctx.drawImage(img, x, y, result.width, result.height)
        
        // 添加规格标注
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/photo-tools" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        返回证件照工具箱
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">多尺寸证件照生成</h1>
        <p className="text-[#94A3B8]">一次生成多种规格证件照，满足不同场合需求</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧 */}
        <div className="space-y-6">
          {/* 上传 */}
          {!image ? (
            <UploadArea onDrop={handleDrop} accept={{ 'image/*': [] }} maxFiles={1} />
          ) : (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <img src={image.preview} alt="原图" className="max-w-full max-h-[200px] mx-auto rounded-lg" />
              <button
                onClick={() => setImage(null)}
                className="mt-4 px-4 py-2 bg-[#475569] text-[#F8FAFC] rounded-lg hover:bg-[#64748B]"
              >
                重新上传
              </button>
            </div>
          )}

          {/* 规格选择 */}
          {image && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">选择规格（可多选）</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {PHOTO_SPECS.map((spec) => (
                  <button
                    key={spec.id}
                    onClick={() => toggleSize(spec.id)}
                    className={`p-3 rounded-xl border transition-all text-left ${selectedSizes.includes(spec.id) ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}
                  >
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
              
              <div className="mt-4 text-sm text-[#94A3B8]">
                已选择 {selectedSizes.length} 种规格
              </div>
            </div>
          )}

          {/* 背景色 */}
          {image && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">背景颜色</h3>
              
              <div className="flex gap-4">
                {Object.entries(BG_COLORS).map(([name, color]) => (
                  <button
                    key={name}
                    onClick={() => setBgColor(color)}
                    className={`flex-1 p-3 rounded-xl border transition-all ${bgColor === color ? 'border-[#22C55E]' : 'border-[#475569]'}`}
                  >
                    <div className="w-10 h-10 rounded-lg mx-auto mb-2" style={{ backgroundColor: color }}></div>
                    <div className="text-sm font-medium text-[#F8FAFC]">{name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 生成按钮 */}
          {image && selectedSizes.length > 0 && (
            <button
              onClick={generatePhotos}
              disabled={isProcessing}
              className="w-full py-4 bg-[#22C55E] text-white font-semibold rounded-xl hover:bg-[#16A34A] disabled:opacity-50"
            >
              {isProcessing ? `生成中 (${selectedSizes.length}种)...` : `生成 ${selectedSizes.length} 种规格证件照`}
            </button>
          )}
        </div>

        {/* 右侧：结果 */}
        <div className="space-y-6">
          {results.length > 0 ? (
            <>
              <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
                <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">生成结果</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {results.map((result) => (
                    <div key={result.id} className="bg-[#475569]/20 rounded-xl p-3">
                      <img src={result.url} alt={result.name} className="mx-auto rounded-lg shadow max-w-full" />
                      <div className="mt-2 text-center">
                        <div className="font-semibold text-[#F8FAFC]">{result.name}</div>
                        <div className="text-xs text-[#94A3B8]">{result.size}</div>
                      </div>
                      <button
                        onClick={() => downloadSingle(result)}
                        className="w-full mt-2 py-1 bg-[#3B82F6] text-white text-sm rounded-lg"
                      >
                        下载
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={downloadAll}
                  className="flex-1 py-3 bg-[#3B82F6] text-white font-semibold rounded-xl hover:bg-[#2563EB]"
                >
                  批量下载全部
                </button>
                <button
                  onClick={downloadPrintSheet}
                  className="flex-1 py-3 bg-[#8B5CF6] text-white font-semibold rounded-xl hover:bg-[#7C3AED]"
                >
                  下载排版图
                </button>
              </div>
            </>
          ) : (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569] min-h-[400px] flex items-center justify-center">
              <div className="text-center text-[#94A3B8]">
                <div className="text-4xl mb-4">📷</div>
                <p>上传图片并选择规格后生成</p>
              </div>
            </div>
          )}

          {/* 规格说明 */}
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">规格说明</h3>
            <div className="space-y-2 text-sm text-[#94A3B8]">
              <p>• 所有规格均按300dpi标准生成，适合打印</p>
              <p>• 建议上传正面清晰照片，背景简单</p>
              <p>• 白色背景适用于大多数证件照</p>
              <p>• 如需换底色请使用证件照换底工具</p>
            </div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  )
}

export default PhotoSizes
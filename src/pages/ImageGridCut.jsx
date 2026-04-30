import { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import UploadArea, { isImageFile } from '../components/UploadArea'

// 切图模式
const GRID_MODES = [
  { id: '3x3', name: '九宫格', cols: 3, rows: 3, desc: '朋友圈九宫格' },
  { id: '2x2', name: '四宫格', cols: 2, rows: 2, desc: '四张拼接' },
  { id: '3x2', name: '六宫格', cols: 3, rows: 2, desc: '横版六张' },
  { id: '2x3', name: '六宫格', cols: 2, rows: 3, desc: '竖版六张' },
  { id: '4x4', name: '十六宫格', cols: 4, rows: 4, desc: '更多切片' },
]

function ImageGridCut() {
  const [image, setImage] = useState(null)
  const [gridMode, setGridMode] = useState('3x3')
  const [results, setResults] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showNumbers, setShowNumbers] = useState(true)
  
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

  const cutImage = async () => {
    if (!image) return
    
    setIsProcessing(true)
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const mode = GRID_MODES.find(m => m.id === gridMode)
      const { cols, rows } = mode
      
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      // 每个切片的尺寸
      const sliceWidth = Math.floor(img.width / cols)
      const sliceHeight = Math.floor(img.height / rows)
      
      canvas.width = sliceWidth
      canvas.height = sliceHeight
      
      const newResults = []
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          // 绘制切片
          ctx.drawImage(
            img,
            col * sliceWidth,
            row * sliceHeight,
            sliceWidth,
            sliceHeight,
            0, 0,
            sliceWidth,
            sliceHeight
          )
          
          // 添加序号（可选）
          if (showNumbers) {
            const index = row * cols + col + 1
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
            ctx.font = 'bold 24px sans-serif'
            ctx.fillText(index.toString(), 8, 30)
          }
          
          newResults.push({
            index: row * cols + col + 1,
            row,
            col,
            url: canvas.toDataURL('image/png'),
            width: sliceWidth,
            height: sliceHeight,
          })
        }
      }
      
      setResults(newResults)
      setIsProcessing(false)
    }
    img.src = image.preview
  }

  const downloadSingle = (result) => {
    const link = document.createElement('a')
    link.href = result.url
    link.download = `切图_${result.index}.png`
    link.click()
  }

  const downloadAllZip = async () => {
    const zip = new JSZip()
    
    results.forEach((result, index) => {
      // 转换 base64 到 Blob
      const base64 = result.url.split(',')[1]
      zip.file(`切图_${result.index}.png`, base64, { base64: true })
    })
    
    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, `九宫格切图_${gridMode}.zip`)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        返回首页
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">图片九宫格切图</h1>
        <p className="text-[#94A3B8]">将图片切分为多张小图，适合朋友圈九宫格分享</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧 */}
        <div className="space-y-6">
          {/* 上传 */}
          {!image ? (
            <UploadArea onDrop={handleDrop} accept={{ 'image/*': [] }} maxFiles={1} />
          ) : (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">原图预览</h3>
              <img src={image.preview} alt="原图" className="max-w-full max-h-[300px] mx-auto rounded-lg" />
              
              {/* 切割线预览 */}
              {results.length === 0 && (
                <div className="relative mt-4">
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0">
                    {Array(9).fill(0).map((_, i) => (
                      <div key={i} className="border border-[#22C55E]/50"></div>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setImage(null)}
                className="mt-4 px-4 py-2 bg-[#475569] text-[#F8FAFC] rounded-lg hover:bg-[#64748B]"
              >
                重新上传
              </button>
            </div>
          )}

          {/* 切图模式 */}
          {image && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">切图模式</h3>
              
              <div className="grid grid-cols-3 gap-3">
                {GRID_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setGridMode(mode.id)}
                    className={`p-3 rounded-xl border transition-all ${gridMode === mode.id ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}
                  >
                    <div className="text-2xl mb-1">
                      {mode.id === '3x3' && '🔲'}
                      {mode.id === '2x2' && '⬜'}
                      {mode.id === '3x2' && '📦'}
                      {mode.id === '2x3' && '📦'}
                      {mode.id === '4x4' && '🧩'}
                    </div>
                    <div className="font-semibold text-[#F8FAFC]">{mode.name}</div>
                    <div className="text-xs text-[#94A3B8]">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 选项 */}
          {image && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">切图选项</h3>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNumbers}
                  onChange={(e) => setShowNumbers(e.target.checked)}
                  className="w-5 h-5 rounded accent-[#22C55E]"
                />
                <span className="text-[#F8FAFC]">在切片上标注序号</span>
              </label>
              <p className="text-xs text-[#94A3B8] mt-2">标注序号方便按顺序发布朋友圈</p>
            </div>
          )}

          {/* 切图按钮 */}
          {image && (
            <button
              onClick={cutImage}
              disabled={isProcessing}
              className="w-full py-4 bg-[#22C55E] text-white font-semibold rounded-xl hover:bg-[#16A34A] disabled:opacity-50"
            >
              {isProcessing ? '切图中...' : '开始切图'}
            </button>
          )}
        </div>

        {/* 右侧：结果 */}
        <div className="space-y-6">
          {results.length > 0 ? (
            <>
              <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
                <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">
                  切图结果 ({results.length} 张)
                </h3>
                
                {/* 网格展示 */}
                <div className={`grid gap-2 ${gridMode === '3x3' ? 'grid-cols-3' : gridMode === '2x2' ? 'grid-cols-2' : gridMode === '4x4' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  {results.map((result) => (
                    <div 
                      key={result.index}
                      className="bg-[#475569]/20 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#22C55E] transition-all"
                      onClick={() => downloadSingle(result)}
                    >
                      <img src={result.url} alt={`切图${result.index}`} className="w-full" />
                      <div className="p-2 text-center text-xs text-[#94A3B8]">
                        #{result.index}
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-sm text-[#94A3B8] mt-4 text-center">
                  点击单张图片可单独下载
                </p>
              </div>

              {/* 下载按钮 */}
              <div className="flex gap-4">
                <button
                  onClick={downloadAllZip}
                  className="flex-1 py-3 bg-[#3B82F6] text-white font-semibold rounded-xl hover:bg-[#2563EB]"
                >
                  📦 打包下载全部 ({results.length}张)
                </button>
              </div>
            </>
          ) : (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569] min-h-[400px] flex items-center justify-center">
              <div className="text-center text-[#94A3B8]">
                <div className="text-4xl mb-4">🔲</div>
                <p>上传图片后开始切图</p>
              </div>
            </div>
          )}

          {/* 使用说明 */}
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">使用说明</h3>
            <div className="space-y-2 text-sm text-[#94A3B8]">
              <p>1. 上传要切分的图片</p>
              <p>2. 选择切图模式（九宫格、四宫格等）</p>
              <p>3. 点击开始切图</p>
              <p>4. 点击单张下载或打包下载全部</p>
              <p>5. 按序号顺序发布朋友圈即可</p>
            </div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  )
}

export default ImageGridCut
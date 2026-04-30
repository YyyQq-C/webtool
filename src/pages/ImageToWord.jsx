import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import UploadArea, { isImageFile } from '../components/UploadArea'

function ImageToWord() {
  const [images, setImages] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [error, setError] = useState('')
  const [ocrEngine, setOcrEngine] = useState('tesseract')

  const handleDrop = useCallback((acceptedFiles) => {
    const validFiles = acceptedFiles.filter(f => isImageFile(f))
    if (validFiles.length === 0) {
      setError('请上传图片文件')
      return
    }
    
    const newImages = validFiles.map(file => ({
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
    }))
    
    setImages(prev => [...prev, ...newImages])
    setError('')
    setResultUrl('')
  }, [])

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setImages([])
    setResultUrl('')
    setError('')
  }

  const convertToWord = async () => {
    if (images.length === 0) return
    
    setIsProcessing(true)
    setError('')
    setProgress('准备处理...')
    
    try {
      const formData = new FormData()
      images.forEach(img => {
        formData.append('files', img.file)
      })
      formData.append('engine', ocrEngine)
      
      setProgress('正在识别图片中的文字...')
      
      const res = await fetch('/bg-api/api/image-to-word', {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) {
        throw new Error('识别失败，请检查图片是否包含文字')
      }
      
      setProgress('正在生成Word文件...')
      
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setResultUrl(url)
      setProgress('')
      
      const link = document.createElement('a')
      link.href = url
      link.download = `识别结果_${Date.now()}.docx`
      link.click()
      
    } catch (err) {
      setError(err.message || '处理失败，请重试')
      setProgress('')
    }
    
    setIsProcessing(false)
  }

  const downloadResult = () => {
    if (!resultUrl) return
    
    const link = document.createElement('a')
    link.href = resultUrl
    link.download = `识别结果_${Date.now()}.docx`
    link.click()
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
        <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">图片转Word</h1>
        <p className="text-[#94A3B8]">识别图片中的文字内容，生成可编辑的Word文档</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧 */}
        <div className="space-y-6">
          {/* 上传 */}
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
            <UploadArea onDrop={handleDrop} accept={{ 'image/*': [] }} maxFiles={9} />
            
            {images.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[#F8FAFC]">已选择 {images.length} 张图片</span>
                  <button onClick={clearAll} className="text-sm text-[#EF4444]">
                    清空全部
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img, index) => (
                    <div key={index} className="relative rounded-lg overflow-hidden">
                      <img src={img.preview} alt={img.name} className="w-full h-20 object-cover" />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-[#EF4444] rounded-full text-white text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* OCR引擎 */}
          {images.length > 0 && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">识别引擎</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setOcrEngine('tesseract')}
                  className={`p-3 rounded-xl border transition-all ${ocrEngine === 'tesseract' ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}
                >
                  <div className="font-semibold text-[#F8FAFC]">Tesseract</div>
                  <div className="text-sm text-[#94A3B8]">开源OCR</div>
                </button>
                <button
                  onClick={() => setOcrEngine('paddleocr')}
                  className={`p-3 rounded-xl border transition-all ${ocrEngine === 'paddleocr' ? 'bg-[#22C55E]/20 border-[#22C55E]' : 'bg-[#475569]/20 border-[#475569]'}`}
                >
                  <div className="font-semibold text-[#F8FAFC]">PaddleOCR</div>
                  <div className="text-sm text-[#94A3B8]">AI识别</div>
                </button>
              </div>
            </div>
          )}

          {/* 按钮 */}
          {images.length > 0 && (
            <button
              onClick={convertToWord}
              disabled={isProcessing}
              className="w-full py-4 bg-[#22C55E] text-white font-semibold rounded-xl hover:bg-[#16A34A] disabled:opacity-50"
            >
              {isProcessing ? progress : '开始识别转换'}
            </button>
          )}

          {error && (
            <div className="bg-[#EF4444]/20 border border-[#EF4444] rounded-xl p-4 text-[#FCA5A5]">
              {error}
            </div>
          )}
        </div>

        {/* 右侧 */}
        <div className="space-y-6">
          {resultUrl ? (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">转换完成</h3>
              
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-[#F8FAFC] mb-4">Word文件已生成</p>
                <button
                  onClick={downloadResult}
                  className="px-6 py-3 bg-[#3B82F6] text-white rounded-xl"
                >
                  再次下载Word
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569] min-h-[300px] flex items-center justify-center">
              <div className="text-center text-[#94A3B8]">
                <div className="text-4xl mb-4">📝</div>
                <p>上传包含文字的图片</p>
              </div>
            </div>
          )}

          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#475569]">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">使用说明</h3>
            <div className="space-y-2 text-sm text-[#94A3B8]">
              <p>1. 上传包含文字的图片</p>
              <p>2. 文字需清晰可见</p>
              <p>3. 支持中英文识别</p>
              <p>4. 识别后自动生成Word</p>
            </div>
            
            <div className="mt-4 p-3 bg-[#475569]/20 rounded-lg">
              <p className="text-xs text-[#F59E0B]">⚠️ 需要服务器端处理</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageToWord
import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import UploadArea from '../components/UploadArea'

function ImageCompare() {
  const [image1, setImage1] = useState(null)
  const [image2, setImage2] = useState(null)
  const [isComparing, setIsComparing] = useState(false)
  const [result, setResult] = useState(null)

  const handleDrop1 = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file) {
      setImage1({
        file,
        name: file.name,
        preview: URL.createObjectURL(file),
      })
      setResult(null)
    }
  }, [])

  const handleDrop2 = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file) {
      setImage2({
        file,
        name: file.name,
        preview: URL.createObjectURL(file),
      })
      setResult(null)
    }
  }, [])

  const clearImages = () => {
    if (image1?.preview) URL.revokeObjectURL(image1.preview)
    if (image2?.preview) URL.revokeObjectURL(image2.preview)
    setImage1(null)
    setImage2(null)
    setResult(null)
  }

  const compareImages = async () => {
    if (!image1 || !image2) return
    setIsComparing(true)

    try {
      const formData = new FormData()
      formData.append('image1', image1.file)
      formData.append('image2', image2.file)

      const res = await fetch('/bg-api/api/image-compare', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setResult(data)
      } else {
        const err = await res.json()
        alert(err.error || '对比失败')
      }
    } catch (error) {
      console.error('对比失败:', error)
      alert('对比失败，请检查服务器是否运行')
    }
    setIsComparing(false)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回工具列表
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#F8FAFC] mb-2">图片相似度对比</h1>
        <p className="text-[#94A3B8]">对比两张图片的相似程度，返回相似度评分</p>
      </div>

      {/* 图片上传区 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-[#F8FAFC] font-medium mb-2">图片 A</h3>
          {!image1 && <UploadArea onDrop={handleDrop1} accept="image/*" text="上传第一张图片" />}
          {image1 && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-3 border border-[#475569]">
              <img src={image1.preview} alt={image1.name} className="w-full rounded-lg mb-2" />
              <p className="text-[#94A3B8] text-xs truncate">{image1.name}</p>
              <button onClick={() => setImage1(null)} className="mt-2 text-[#DC2626] text-sm">清除</button>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-[#F8FAFC] font-medium mb-2">图片 B</h3>
          {!image2 && <UploadArea onDrop={handleDrop2} accept="image/*" text="上传第二张图片" />}
          {image2 && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-3 border border-[#475569]">
              <img src={image2.preview} alt={image2.name} className="w-full rounded-lg mb-2" />
              <p className="text-[#94A3B8] text-xs truncate">{image2.name}</p>
              <button onClick={() => setImage2(null)} className="mt-2 text-[#DC2626] text-sm">清除</button>
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-center gap-4 mb-6">
        {image1 && image2 && (
          <button onClick={clearImages} className="px-6 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg">
            清空所有
          </button>
        )}
        <button
          onClick={compareImages}
          disabled={!image1 || !image2 || isComparing}
          className="px-6 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50"
        >
          {isComparing ? '对比中...' : '开始对比'}
        </button>
      </div>

      {/* 结果显示 */}
      {result && (
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">对比结果</h3>

          <div className="bg-[#334155] px-6 py-4 rounded-lg text-center">
            <p className="text-[#94A3B8] mb-2">相似度评分</p>
            <p className={`text-5xl font-bold ${result.similarity >= 80 ? 'text-[#22C55E]' : result.similarity >= 50 ? 'text-[#EAB308]' : 'text-[#DC2626]'}`}>
              {result.similarity.toFixed(1)}%
            </p>
          </div>

          <div className="mt-4 text-[#94A3B8] text-sm space-y-1">
            <p>• 结构相似度: {result.structural?.toFixed(2) || 'N/A'}</p>
            <p>• 直方图相似度: {result.histogram?.toFixed(2) || 'N/A'}</p>
            {result.message && <p className="mt-2 text-[#F8FAFC]">{result.message}</p>}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-8 bg-[#1E293B]/40 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
        <h3 className="text-lg font-semibold text-[#F8FAFC] mb-3">使用说明</h3>
        <ul className="space-y-2 text-[#94A3B8]">
          <li>• 上传两张需要对比的图片</li>
          <li>• 支持多种图片格式 (JPG, PNG, WebP 等)</li>
          <li>• 相似度 80% 以上：图片高度相似</li>
          <li>• 相似度 50-80%：图片部分相似</li>
          <li>• 相似度 50% 以下：图片差异较大</li>
        </ul>
      </div>
    </div>
  )
}

export default ImageCompare
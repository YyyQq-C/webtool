import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'
import UploadArea from '../components/UploadArea'

function ImageSplice() {
  const [images, setImages] = useState([])
  const [layout, setLayout] = useState('horizontal') // horizontal, vertical, grid
  const [gap, setGap] = useState(0)
  const [cols, setCols] = useState(3) // 网格列数
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDrop = useCallback((acceptedFiles) => {
    const newImages = acceptedFiles.map(file => ({
      id: `${file.name}-${Date.now()}`,
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
    }))
    setImages(prev => [...prev, ...newImages])
  }, [])

  const removeImage = (id) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img?.preview) URL.revokeObjectURL(img.preview)
      return prev.filter(i => i.id !== id)
    })
  }

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview))
    setImages([])
  }

  const moveImage = (id, direction) => {
    setImages(prev => {
      const index = prev.findIndex(i => i.id === id)
      if (index === -1) return prev
      const newIndex = direction === 'left' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev
      const newImages = [...prev]
      [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]]
      return newImages
    })
  }

  const spliceImages = async () => {
    if (images.length === 0) return
    setIsProcessing(true)

    try {
      // 加载所有图片
      const loadedImages = await Promise.all(
        images.map(img => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              const image = new Image()
              image.onload = () => resolve(image)
              image.onerror = reject
              image.src = e.target.result
            }
            reader.onerror = reject
            reader.readAsDataURL(img.file)
          })
        })
      )

      // 计算画布尺寸
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (layout === 'horizontal') {
        // 横向拼接
        const totalWidth = loadedImages.reduce((sum, img) => sum + img.width, 0) + gap * (loadedImages.length - 1)
        const maxHeight = Math.max(...loadedImages.map(img => img.height))
        canvas.width = totalWidth
        canvas.height = maxHeight

        let x = 0
        loadedImages.forEach(img => {
          ctx.drawImage(img, x, 0)
          x += img.width + gap
        })
      } else if (layout === 'vertical') {
        // 纵向拼接
        const maxWidth = Math.max(...loadedImages.map(img => img.width))
        const totalHeight = loadedImages.reduce((sum, img) => sum + img.height, 0) + gap * (loadedImages.length - 1)
        canvas.width = maxWidth
        canvas.height = totalHeight

        let y = 0
        loadedImages.forEach(img => {
          ctx.drawImage(img, 0, y)
          y += img.height + gap
        })
      } else if (layout === 'grid') {
        // 网格拼接
        const rows = Math.ceil(loadedImages.length / cols)
        const cellWidth = Math.max(...loadedImages.map(img => img.width))
        const cellHeight = Math.max(...loadedImages.map(img => img.height))
        canvas.width = cellWidth * cols + gap * (cols - 1)
        canvas.height = cellHeight * rows + gap * (rows - 1)

        loadedImages.forEach((img, index) => {
          const col = index % cols
          const row = Math.floor(index / cols)
          const x = col * (cellWidth + gap)
          const y = row * (cellHeight + gap)
          ctx.drawImage(img, x, y)
        })
      }

      // 下载
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `spliced-${layout}-${Date.now()}.png`)
        }
        setIsProcessing(false)
      }, 'image/png')
    } catch (error) {
      console.error('拼接失败:', error)
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回工具列表
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#F8FAFC] mb-2">图片拼接</h1>
        <p className="text-[#94A3B8]">将多张图片拼接成一张，支持横向、纵向、网格布局</p>
      </div>

      {/* 设置面板 */}
      <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 mb-6 border border-[#475569]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[#F8FAFC] font-medium">布局：</label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
                className="bg-[#334155] text-[#F8FAFC] px-4 py-2 rounded-lg border border-[#475569] focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
              >
                <option value="horizontal">横向拼接</option>
                <option value="vertical">纵向拼接</option>
                <option value="grid">网格拼接</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[#F8FAFC] font-medium">间距：</label>
              <input
                type="number"
                value={gap}
                onChange={(e) => setGap(Number(e.target.value))}
                min="0"
                max="100"
                className="bg-[#334155] text-[#F8FAFC] px-3 py-2 rounded-lg border border-[#475569] w-20 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
              />
              <span className="text-[#94A3B8]">px</span>
            </div>
            {layout === 'grid' && (
              <div className="flex items-center gap-2">
                <label className="text-[#F8FAFC] font-medium">列数：</label>
                <input
                  type="number"
                  value={cols}
                  onChange={(e) => setCols(Number(e.target.value))}
                  min="1"
                  max="10"
                  className="bg-[#334155] text-[#F8FAFC] px-3 py-2 rounded-lg border border-[#475569] w-20 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {images.length > 0 && (
              <button onClick={clearAll} className="px-6 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg transition-colors">
                清空所有
              </button>
            )}
            <button
              onClick={spliceImages}
              disabled={images.length === 0 || isProcessing}
              className="px-6 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? '处理中...' : '生成拼接图'}
            </button>
          </div>
        </div>
      </div>

      <UploadArea onDrop={handleDrop} accept="image/*" text="拖拽或点击上传图片" />

      {/* 图片列表 */}
      {images.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-[#F8FAFC] mb-4">已上传 {images.length} 张图片（可拖拽排序）</h3>
          <div className="flex flex-wrap gap-4">
            {images.map((image, index) => (
              <div key={image.id} className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl overflow-hidden border border-[#475569] relative w-48">
                <img src={image.preview} alt={image.name} className="w-full h-32 object-cover" />
                <div className="absolute top-1 left-1 bg-[#22C55E] text-[#0F172A] text-xs font-bold px-2 py-1 rounded">
                  {index + 1}
                </div>
                <div className="absolute top-1 right-1 flex gap-1">
                  <button
                    onClick={() => moveImage(image.id, 'left')}
                    disabled={index === 0}
                    className="bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] p-1 rounded disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveImage(image.id, 'right')}
                    disabled={index === images.length - 1}
                    className="bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] p-1 rounded disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button onClick={() => removeImage(image.id)} className="bg-[#DC2626] hover:bg-[#B91C1C] text-white p-1 rounded">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-2">
                  <p className="text-[#94A3B8] text-xs truncate">{image.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageSplice
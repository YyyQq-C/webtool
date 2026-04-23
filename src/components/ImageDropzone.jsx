import { useState, useCallback } from 'react'

function ImageDropzone({ onDrop }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    )

    if (files.length > 0) {
      onDrop(files)
    }
  }, [onDrop])

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      onDrop(files)
    }
    e.target.value = ''
  }, [onDrop])

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
        ${isDragging
          ? 'border-[#22C55E] bg-[#22C55E]/10 scale-105'
          : 'border-[#475569] bg-[#1E293B]/40 hover:border-[#22C55E] hover:bg-[#1E293B]/60'
        }
      `}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      <div className="pointer-events-none">
        <div className="text-6xl mb-4">
          {isDragging ? '📸' : '🖼️'}
        </div>
        <p className="text-xl font-medium text-[#F8FAFC] mb-2">
          {isDragging ? '松开以上传图片' : '拖拽图片到这里'}
        </p>
        <p className="text-[#94A3B8]">
          或点击选择文件
        </p>
        <p className="text-[#64748B] text-sm mt-3">
          支持 JPG, PNG, WebP, BMP, GIF, AVIF, ICO, TIFF, PDF 格式
        </p>
      </div>
    </div>
  )
}

export default ImageDropzone
import { useState, useCallback, useRef } from 'react'

// 支持的文件扩展名
const IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 
  'ico', 'avif', 'tiff', 'tif', 'svg', 'heic', 'heif'
]

function isImageFile(file) {
  // 方法1：检查MIME类型
  if (file.type && file.type.startsWith('image/')) return true
  
  // 方法2：检查文件扩展名（某些浏览器可能无法识别MIME类型）
  const ext = file.name.split('.').pop().toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext)
}

function ImageDropzone({ onDrop }) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setError('')
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
    setError('')

    const allFiles = Array.from(e.dataTransfer.files)
    const validFiles = allFiles.filter(isImageFile)
    const invalidFiles = allFiles.filter(f => !isImageFile(f))

    if (invalidFiles.length > 0) {
      setError(`以下 ${invalidFiles.length} 个文件不是支持的图片格式`)
      setTimeout(() => setError(''), 3000)
    }

    if (validFiles.length > 0) {
      onDrop(validFiles)
    }
  }, [onDrop])

  const handleFileInput = useCallback((e) => {
    setError('')
    const allFiles = Array.from(e.target.files)
    const validFiles = allFiles.filter(isImageFile)
    const invalidFiles = allFiles.filter(f => !isImageFile(f))

    if (invalidFiles.length > 0) {
      setError(`以下 ${invalidFiles.length} 个文件不是支持的图片格式`)
      setTimeout(() => setError(''), 3000)
    }

    if (validFiles.length > 0) {
      onDrop(validFiles)
    } else if (allFiles.length === 0) {
      // 用户取消了选择
    } else {
      setError('所有选择的文件都不是支持的图片格式')
      setTimeout(() => setError(''), 3000)
    }

    e.target.value = ''
  }, [onDrop])

  // 处理点击区域触发文件选择（兼容移动端）
  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div>
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
          ${isDragging
            ? 'border-[#22C55E] bg-[#22C55E]/10 scale-105'
            : 'border-[#475569] bg-[#1E293B]/40 hover:border-[#22C55E] hover:bg-[#1E293B]/60'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onTouchEnd={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.heic,.heif"
          onChange={handleFileInput}
          className="hidden"
        />

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
          支持 JPG, PNG, WebP, BMP, GIF, AVIF, ICO, TIFF, SVG 格式
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

export default ImageDropzone
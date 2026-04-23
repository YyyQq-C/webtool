import { useState, useCallback, useRef } from 'react'

// 支持的文件扩展名
const IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 
  'ico', 'avif', 'tiff', 'tif', 'svg', 'heic', 'heif'
]

export function isImageFile(file) {
  // 方法1：检查MIME类型
  if (file.type && file.type.startsWith('image/')) return true
  
  // 方法2：检查文件扩展名（某些浏览器可能无法识别MIME类型）
  const ext = file.name.split('.').pop().toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext)
}

function UploadArea({ onDrop, isImageFile: customIsImageFile, onFileSelect, error }) {
  const [isDragging, setIsDragging] = useState(false)
  const [localError, setLocalError] = useState('')
  const fileInputRef = useRef(null)

  const checkImage = customIsImageFile || isImageFile

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setLocalError('')
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
    setLocalError('')

    const allFiles = Array.from(e.dataTransfer.files)
    const validFiles = allFiles.filter(checkImage)

    if (validFiles.length === 0 && allFiles.length > 0) {
      setLocalError('不支持的文件格式，请上传图片文件')
      setTimeout(() => setLocalError(''), 3000)
    }

    if (validFiles.length > 0 && onDrop) {
      onDrop(validFiles)
    }
  }, [onDrop, checkImage])

  const handleFileInput = useCallback((e) => {
    setLocalError('')
    const allFiles = Array.from(e.target.files)
    const validFiles = allFiles.filter(checkImage)

    if (validFiles.length === 0 && allFiles.length > 0) {
      setLocalError('不支持的文件格式，请上传图片文件')
      setTimeout(() => setLocalError(''), 3000)
    }

    if (validFiles.length > 0) {
      if (onFileSelect) {
        onFileSelect(validFiles[0])
      } else if (onDrop) {
        onDrop(validFiles)
      }
    } else if (allFiles.length === 0) {
      // 用户取消了选择
    }

    e.target.value = ''
  }, [onDrop, onFileSelect, checkImage])

  // 处理点击 - 兼容移动端
  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const displayError = error || localError

  return (
    <div>
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all duration-300 cursor-pointer select-none
          ${isDragging
            ? 'border-[#22C55E] bg-[#22C55E]/10 scale-105'
            : 'border-[#475569] bg-[#1E293B]/40 hover:border-[#22C55E] hover:bg-[#1E293B]/60 active:bg-[#1E293B]/60'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* 隐藏的文件输入 - 通过ref触发 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.heic,.heif"
          onChange={handleFileInput}
          className="hidden"
        />

        {/* 可见的点击触发按钮 - 兼容移动端 */}
        <button
          type="button"
          className="inline-flex flex-col items-center pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation()
            handleClick()
          }}
        >
          <div className="text-5xl md:text-6xl mb-3 md:mb-4">
            {isDragging ? '📸' : '🖼️'}
          </div>
          <p className="text-lg md:text-xl font-medium text-[#F8FAFC] mb-1 md:mb-2">
            {isDragging ? '松开以上传图片' : '拖拽图片到这里'}
          </p>
          <p className="text-sm md:text-base text-[#94A3B8] mb-3 md:mb-4">
            或点击选择文件
          </p>
          <span className="inline-block px-4 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium text-sm rounded-lg transition-colors">
            选择图片
          </span>
        </button>

        <p className="text-[#64748B] text-xs md:text-sm mt-4">
          支持 JPG, PNG, WebP, BMP, GIF, AVIF, ICO, TIFF, SVG 格式
        </p>
      </div>

      {/* 错误提示 */}
      {displayError && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-center">
          <p className="text-red-400 text-sm">{displayError}</p>
        </div>
      )}
    </div>
  )
}

export default UploadArea
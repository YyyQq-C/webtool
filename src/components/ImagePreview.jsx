import { useState, useEffect } from 'react'
import { saveAs } from 'file-saver'

const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'ico', 'avif', 'tiff', 'pdf']

function ImagePreview({ image, onFormatChange, onRemove, converted }) {
  const [localFormat, setLocalFormat] = useState(image.format)

  useEffect(() => {
    setLocalFormat(image.format)
  }, [image.format])

  const handleFormatChange = (format) => {
    setLocalFormat(format)
    onFormatChange(image.id, format)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // 下载单张转换后的图片
  const downloadSingle = () => {
    if (converted && converted.blob) {
      saveAs(converted.blob, converted.name)
    }
  }

  return (
    <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl overflow-hidden border border-[#475569] hover:border-[#22C55E] transition-all">
      {/* 图片预览 */}
      <div className="aspect-video bg-gray-900 relative overflow-hidden">
        <img
          src={image.preview}
          alt={image.name}
          className="w-full h-full object-cover"
        />
        {converted && (
          <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
            已转换
          </div>
        )}
        <button
          onClick={() => onRemove(image.id)}
          className="absolute top-2 left-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 图片信息 */}
      <div className="p-4">
        <p className="text-[#F8FAFC] font-medium truncate mb-2" title={image.name}>
          {image.name}
        </p>
        <p className="text-[#94A3B8] text-sm mb-3">
          原始大小: {formatFileSize(image.size)}
        </p>

        {/* 格式选择 */}
        <div className="mb-3">
          <label className="text-[#94A3B8] text-sm mb-1 block">转换格式：</label>
          <select
            value={localFormat}
            onChange={(e) => handleFormatChange(e.target.value)}
            className="w-full bg-[#334155] text-[#F8FAFC] px-3 py-2 rounded-lg border border-[#475569] focus:outline-none focus:ring-2 focus:ring-[#22C55E] text-sm"
          >
            {SUPPORTED_FORMATS.map(format => (
              <option key={format} value={format}>
                {format.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* 转换后信息 */}
        {converted && (
          <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-2">
            <p className="text-green-300 text-xs truncate">
              转换后: {converted.name}
            </p>
            <p className="text-green-300 text-xs mb-2">
              大小: {formatFileSize(converted.size)}
            </p>
            {/* 单张下载按钮 */}
            <button
              onClick={downloadSingle}
              className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] text-xs font-medium py-1.5 rounded-lg transition-all flex items-center justify-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载此图片
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImagePreview
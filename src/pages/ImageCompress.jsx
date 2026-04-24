import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'
import UploadArea from '../components/UploadArea'

function ImageCompress() {
  const [image, setImage] = useState(null)
  const [quality, setQuality] = useState(92)
  const [format, setFormat] = useState('jpeg')
  const [compressed, setCompressed] = useState(null)
  const [isCompressing, setIsCompressing] = useState(false)

  const handleDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file) {
      setImage({
        file,
        name: file.name,
        size: file.size,
        preview: URL.createObjectURL(file),
      })
      setCompressed(null)
    }
  }, [])

  const clearImage = () => {
    if (image?.preview) URL.revokeObjectURL(image.preview)
    if (compressed?.preview) URL.revokeObjectURL(compressed.preview)
    setImage(null)
    setCompressed(null)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const compressImage = async () => {
    if (!image) return
    setIsCompressing(true)

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')

          // PNG → JPG 时填充白底
          if (format === 'jpeg' && image.file.type === 'image/png') {
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }

          ctx.drawImage(img, 0, 0)

          const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/webp'
          canvas.toBlob(
            (blob) => {
              if (blob) {
                setCompressed({
                  blob,
                  name: image.name.replace(/\.[^/.]+$/, `.${format}`),
                  size: blob.size,
                  preview: URL.createObjectURL(blob),
                  width: img.width,
                  height: img.height,
                })
              }
              setIsCompressing(false)
            },
            mimeType,
            quality / 100
          )
        }
        img.onerror = () => setIsCompressing(false)
        img.src = e.target.result
      }
      reader.onerror = () => setIsCompressing(false)
      reader.readAsDataURL(image.file)
    } catch (error) {
      console.error('压缩失败:', error)
      setIsCompressing(false)
    }
  }

  const downloadCompressed = () => {
    if (compressed?.blob) {
      saveAs(compressed.blob, compressed.name)
    }
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
        <h1 className="text-4xl font-bold text-[#F8FAFC] mb-2">图片压缩预览</h1>
        <p className="text-[#94A3B8]">实时预览不同压缩率效果，一键下载压缩图片</p>
      </div>

      {!image && <UploadArea onDrop={handleDrop} accept="image/*" text="拖拽或点击上传图片" />}

      {image && (
        <div className="space-y-6">
          {/* 原图信息 */}
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-4 border border-[#475569]">
            <div className="flex items-start gap-4">
              <img src={image.preview} alt={image.name} className="max-w-xs rounded-lg" />
              <div className="flex-grow">
                <p className="text-[#F8FAFC] font-medium">{image.name}</p>
                <p className="text-[#94A3B8] mt-1">原始大小: {formatFileSize(image.size)}</p>
                <button onClick={clearImage} className="mt-2 text-[#DC2626] hover:text-[#B91C1C] text-sm">
                  清除图片
                </button>
              </div>
            </div>
          </div>

          {/* 压缩设置 */}
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">压缩设置</h3>

            <div className="flex gap-6 items-start">
              <div className="flex-grow">
                <label className="text-[#94A3B8] text-sm mb-2 block">压缩质量：</label>
                <input
                  type="range"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  min="10"
                  max="100"
                  className="w-full accent-[#22C55E]"
                />
                <div className="flex justify-between text-[#94A3B8] text-sm mt-1">
                  <span>10%</span>
                  <span className="text-[#F8FAFC] font-medium">{quality}%</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="text-[#94A3B8] text-sm mb-2 block">输出格式：</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="bg-[#334155] text-[#F8FAFC] px-4 py-2 rounded-lg border border-[#475569]"
                >
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>

              <button
                onClick={compressImage}
                disabled={isCompressing}
                className="px-6 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50"
              >
                {isCompressing ? '压缩中...' : '压缩预览'}
              </button>
            </div>
          </div>

          {/* 压缩结果 */}
          {compressed && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">压缩结果</h3>

              <div className="flex items-start gap-4">
                <img src={compressed.preview} alt="Compressed" className="max-w-xs rounded-lg" />

                <div className="flex-grow">
                  <div className="bg-[#334155] px-4 py-3 rounded-lg mb-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-[#94A3B8]">原始大小：</span>
                      <span className="text-[#F8FAFC]">{formatFileSize(image.size)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-[#94A3B8]">压缩后大小：</span>
                      <span className="text-[#22C55E] font-medium">{formatFileSize(compressed.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">节省空间：</span>
                      <span className="text-[#22C55E] font-medium">
                        {Math.round((1 - compressed.size / image.size) * 100)}%
                      </span>
                    </div>
                  </div>

                  <p className="text-[#94A3B8] text-sm">
                    尺寸: {compressed.width} × {compressed.height}
                  </p>

                  <button
                    onClick={downloadCompressed}
                    className="mt-4 px-6 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-all"
                  >
                    下载压缩图片
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ImageCompress
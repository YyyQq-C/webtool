import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import ImageDropzone from '../components/ImageDropzone'
import ImagePreview from '../components/ImagePreview'

const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'ico', 'avif', 'tiff', 'pdf']
const DEFAULT_FORMAT = 'png'

function ImageConverter() {
  const [images, setImages] = useState([])
  const [globalFormat, setGlobalFormat] = useState(DEFAULT_FORMAT)
  const [compressionQuality, setCompressionQuality] = useState(null) // null = 不压缩
  const [isConverting, setIsConverting] = useState(false)
  const [convertedFiles, setConvertedFiles] = useState([])

  // 自动清理：10分钟后删除资源
  useEffect(() => {
    if (convertedFiles.length > 0) {
      const timer = setTimeout(() => {
        setImages([])
        setConvertedFiles([])
        setGlobalFormat(DEFAULT_FORMAT)
        console.log('资源已自动清理')
      }, 10 * 60 * 1000) // 10分钟

      return () => clearTimeout(timer)
    }
  }, [convertedFiles])

  // 处理文件上传
  const handleDrop = useCallback((acceptedFiles) => {
    const newImages = acceptedFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: URL.createObjectURL(file),
      format: DEFAULT_FORMAT,
      converted: null,
    }))
    setImages(prev => [...prev, ...newImages])
  }, [])

  // 更新单个图片格式
  const updateImageFormat = (id, format) => {
    setImages(prev => prev.map(img =>
      img.id === id ? { ...img, format } : img
    ))
  }

  // 更新全局格式
  const handleGlobalFormatChange = (format) => {
    setGlobalFormat(format)
    setImages(prev => prev.map(img => ({ ...img, format })))
  }

  // 转换单个图片
  const convertImage = async (imageData, targetFormat, quality) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')

          // PNG → JPG/WebP/AVIF 等有损格式：填充白底处理透明
          const needsWhiteBg = ['jpg', 'jpeg', 'webp', 'avif'].includes(targetFormat)
            && imageData.type === 'image/png'
          if (needsWhiteBg) {
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }

          ctx.drawImage(img, 0, 0)

          // 不同格式的处理
          const formatMap = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
            bmp: 'image/bmp',
            gif: 'image/gif',
            avif: 'image/avif',
            ico: 'image/png', // ico转为png包装
            tiff: 'image/png', // tiff用png替代
            pdf: 'image/png', // pdf用png替代
          }

          const mimeType = formatMap[targetFormat] || 'image/png'
          // 只有指定了压缩率且目标格式支持压缩时才生效
          const effectiveQuality = (quality !== null && ['jpg', 'jpeg', 'webp', 'avif'].includes(targetFormat))
            ? quality / 100
            : undefined

          canvas.toBlob((blob) => {
            if (blob) {
              resolve({
                blob,
                name: imageData.name.replace(/\.[^/.]+$/, `.${targetFormat}`),
                size: blob.size,
                format: targetFormat,
              })
            } else {
              reject(new Error(`转换${targetFormat.toUpperCase()}格式失败`))
            }
          }, mimeType, effectiveQuality)
        }
        img.onerror = () => reject(new Error('图片加载失败'))
        img.src = e.target.result
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsDataURL(imageData.file)
    })
  }

  // 批量转换所有图片
  const convertAllImages = async () => {
    setIsConverting(true)
    const converted = []

    for (const img of images) {
      const result = await convertImage(img, img.format, compressionQuality)
      converted.push(result)
    }

    setConvertedFiles(converted)
    setIsConverting(false)
  }

  // 打包下载
  const downloadAll = async () => {
    const zip = new JSZip()

    convertedFiles.forEach((file) => {
      zip.file(file.name, file.blob)
    })

    const content = await zip.generateAsync({ type: 'blob' })
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    saveAs(content, `converted-images-${timestamp}.zip`)
  }

  // 删除图片
  const removeImage = (id) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img?.preview) {
        URL.revokeObjectURL(img.preview)
      }
      return prev.filter(i => i.id !== id)
    })
  }

  // 清空所有
  const clearAll = () => {
    images.forEach(img => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview)
      }
    })
    setImages([])
    setConvertedFiles([])
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 返回按钮 */}
      <Link
        to="/"
        className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回工具列表
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#F8FAFC] mb-2">
          图片格式转换
        </h1>
        <p className="text-[#94A3B8]">
          拖拽或点击上传图片，支持批量转换格式
        </p>
      </div>

      {/* 全局格式选择 + 压缩率 */}
      <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 mb-6 border border-[#475569]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[#F8FAFC] font-medium">全局格式：</label>
              <select
                value={globalFormat}
                onChange={(e) => handleGlobalFormatChange(e.target.value)}
                className="bg-[#334155] text-[#F8FAFC] px-4 py-2 rounded-lg border border-[#475569] focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
              >
                {SUPPORTED_FORMATS.map(format => (
                  <option key={format} value={format}>
                    {format.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[#F8FAFC] font-medium">压缩率：</label>
              <select
                value={compressionQuality === null ? 'none' : compressionQuality}
                onChange={(e) => setCompressionQuality(e.target.value === 'none' ? null : Number(e.target.value))}
                className="bg-[#334155] text-[#F8FAFC] px-4 py-2 rounded-lg border border-[#475569] focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
              >
                <option value="none">不压缩</option>
                <option value="100">100% (最高质量)</option>
                <option value="92">92%</option>
                <option value="85">85%</option>
                <option value="75">75%</option>
                <option value="60">60%</option>
                <option value="50">50%</option>
                <option value="30">30%</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            {images.length > 0 && (
              <button
                onClick={clearAll}
                className="px-6 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg transition-colors"
              >
                清空所有
              </button>
            )}
            <button
              onClick={convertAllImages}
              disabled={images.length === 0 || isConverting}
              className="px-6 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConverting ? '转换中...' : '开始转换'}
            </button>
            {convertedFiles.length > 0 && (
              <button
                onClick={downloadAll}
                className="px-6 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-all"
              >
                打包下载
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 拖拽上传区域 */}
      <ImageDropzone onDrop={handleDrop} />

      {/* 图片列表 */}
      {images.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-[#F8FAFC]">
              已上传 {images.length} 张图片
            </h3>
            {convertedFiles.length > 0 && (
              <p className="text-[#94A3B8] text-sm">
                资源将在 10 分钟后自动清理
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <ImagePreview
                key={image.id}
                image={image}
                onFormatChange={updateImageFormat}
                onRemove={removeImage}
                converted={convertedFiles.find(f => f.name.includes(image.name.split('.')[0]))}
              />
            ))}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-12 bg-[#1E293B]/40 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
        <h3 className="text-lg font-semibold text-[#F8FAFC] mb-3">使用说明</h3>
        <ul className="space-y-2 text-[#94A3B8]">
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">1.</span>
            <span>拖拽或点击上传区域选择图片文件</span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-400 mr-2">2.</span>
            <span>使用全局格式下拉框批量设置所有图片格式，或单独设置每张图片的格式</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">3.</span>
            <span>可选设置压缩率：默认不压缩，也可指定质量百分比（仅对JPG/WebP/AVIF生效）。PNG→JPG会自动添加白底</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">4.</span>
            <span>点击"开始转换"按钮进行格式转换</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">5.</span>
            <span>转换完成后，点击"打包下载"下载所有转换后的图片</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">6.</span>
            <span>下载完成 10 分钟后，本次所有资源将自动清理</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default ImageConverter
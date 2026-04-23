import { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'
import ImageDropzone from '../components/ImageDropzone'

function ImageToPdf() {
  const [images, setImages] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const dragIndex = useRef(null)
  const dragOverIndex = useRef(null)

  // 自动清理
  const autoCleanup = useCallback(() => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
    }
    images.forEach(img => {
      if (img.preview) URL.revokeObjectURL(img.preview)
    })
    setImages([])
  }, [images, pdfUrl])

  // 处理文件上传
  const handleDrop = useCallback((acceptedFiles) => {
    const newImages = acceptedFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
      width: 0,
      height: 0,
    }))

    // 获取图片尺寸
    newImages.forEach(img => {
      const image = new Image()
      image.onload = () => {
        setImages(prev => prev.map(i =>
          i.id === img.id ? { ...i, width: image.width, height: image.height } : i
        ))
      }
      image.src = img.preview
    })

    setImages(prev => [...prev, ...newImages])
  }, [])

  // 拖拽排序
  const handleDragStart = (index) => {
    dragIndex.current = index
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    dragOverIndex.current = index
  }

  const handleDropOrder = (e, dropIndex) => {
    e.preventDefault()
    const dragIdx = dragIndex.current
    if (dragIdx === null || dragIdx === dropIndex) return

    setImages(prev => {
      const newImages = [...prev]
      const [dragged] = newImages.splice(dragIdx, 1)
      newImages.splice(dropIndex, 0, dragged)
      return newImages
    })

    dragIndex.current = null
    dragOverIndex.current = null
  }

  const handleDragEnd = () => {
    dragIndex.current = null
    dragOverIndex.current = null
  }

  // 移动图片
  const moveImage = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= images.length) return

    setImages(prev => {
      const newImages = [...prev]
      const temp = newImages[index]
      newImages[index] = newImages[newIndex]
      newImages[newIndex] = temp
      return newImages
    })
  }

  // 删除图片
  const removeImage = (id) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img?.preview) URL.revokeObjectURL(img.preview)
      return prev.filter(i => i.id !== id)
    })
  }

  // 清空所有
  const clearAll = () => {
    images.forEach(img => {
      if (img.preview) URL.revokeObjectURL(img.preview)
    })
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setImages([])
    setPdfUrl(null)
  }

  // 生成PDF
  const generatePdf = async () => {
    if (images.length === 0) return

    setIsGenerating(true)

    // 清理之前的PDF
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
    }

    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10

    for (let i = 0; i < images.length; i++) {
      const img = images[i]

      if (i > 0) {
        pdf.addPage()
      }

      // 读取图片
      const imageData = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.readAsDataURL(img.file)
      })

      // 判断横版图片：宽 > 高
      const imgWidth = img.width || 800
      const imgHeight = img.height || 600
      const isLandscape = imgWidth > imgHeight

      // 实际渲染尺寸
      let finalWidth, finalHeight

      if (isLandscape) {
        // 横版图片：旋转后按竖版适配页面
        finalWidth = imgHeight
        finalHeight = imgWidth
      } else {
        finalWidth = imgWidth
        finalHeight = imgHeight
      }

      // 计算缩放比例适配页面
      const maxWidth = pageWidth - margin * 2
      const maxHeight = pageHeight - margin * 2
      const ratio = Math.min(maxWidth / finalWidth, maxHeight / finalHeight, 1)

      const scaledWidth = finalWidth * ratio
      const scaledHeight = finalHeight * ratio

      // 居中
      const x = (pageWidth - scaledWidth) / 2
      const y = (pageHeight - scaledHeight) / 2

      // 判断图片格式
      const ext = img.name.split('.').pop().toLowerCase()
      const format = ['jpg', 'jpeg'].includes(ext) ? 'JPEG' : ext === 'png' ? 'PNG' : 'JPEG'

      if (isLandscape) {
        // 横版图片：使用 Canvas 旋转 90° 后添加到 PDF
        const canvas = document.createElement('canvas')
        canvas.width = imgHeight
        canvas.height = imgWidth
        const ctx = canvas.getContext('2d')

        // 旋转 90 度
        ctx.translate(imgHeight / 2, imgWidth / 2)
        ctx.rotate(Math.PI / 2)
        ctx.drawImage(
          await new Promise((resolve) => {
            const image = new Image()
            image.onload = () => resolve(image)
            image.src = imageData
          }),
          -imgWidth / 2,
          -imgHeight / 2
        )

        const rotatedDataUrl = canvas.toDataURL(`image/${format === 'PNG' ? 'png' : 'jpeg'}`)
        pdf.addImage(rotatedDataUrl, format === 'PNG' ? 'PNG' : 'JPEG', x, y, scaledWidth, scaledHeight)
      } else {
        // 竖版图片：直接添加
        pdf.addImage(imageData, format, x, y, scaledWidth, scaledHeight)
      }
    }

    const blob = pdf.output('blob')
    const url = URL.createObjectURL(blob)
    setPdfUrl(url)

    setIsGenerating(false)
  }

  // 下载PDF
  const downloadPdf = () => {
    if (!pdfUrl) return
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    saveAs(pdfUrl, `images-${timestamp}.pdf`)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
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
          图片转 PDF
        </h1>
        <p className="text-[#94A3B8]">
          上传图片，拖拽排序，一键生成PDF文档
        </p>
      </div>

      {/* 操作栏 */}
      <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 mb-6 border border-[#475569]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="text-[#94A3B8]">
            {images.length > 0 ? (
              <span>已上传 <strong className="text-[#F8FAFC]">{images.length}</strong> 张图片</span>
            ) : (
              <span>上传图片以开始</span>
            )}
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
              onClick={generatePdf}
              disabled={images.length === 0 || isGenerating}
              className="px-6 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? '生成中...' : '生成 PDF'}
            </button>
            {pdfUrl && (
              <button
                onClick={downloadPdf}
                className="px-6 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-all"
              >
                下载 PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 拖拽上传区域 */}
      <ImageDropzone onDrop={handleDrop} />

      {/* 图片排序列表 */}
      {images.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-[#F8FAFC]">
              拖拽排序（PDF页面顺序）
            </h3>
            <p className="text-[#94A3B8] text-sm">
              拖拽卡片调整顺序，或使用上下箭头
            </p>
          </div>

          <div className="space-y-3">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDropOrder(e, index)}
                onDragEnd={handleDragEnd}
                className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl border border-[#475569] hover:border-[#22C55E] transition-all cursor-move"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* 序号 + 拖拽手柄 */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="w-8 h-8 flex items-center justify-center bg-[#334155] text-[#F8FAFC] rounded-lg font-bold text-sm">
                      {index + 1}
                    </span>
                    <div className="text-[#64748B] cursor-grab active:cursor-grabbing">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                        <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                        <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                      </svg>
                    </div>
                  </div>

                  {/* 缩略图 */}
                  <div className="w-16 h-16 bg-[#334155] rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={image.preview}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 文件信息 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F8FAFC] font-medium truncate" title={image.name}>
                      {image.name}
                    </p>
                    <p className="text-[#94A3B8] text-sm">
                      {formatFileSize(image.size)}
                      {image.width > 0 && (
                        <span className="ml-2">
                          {image.width} × {image.height}
                        </span>
                      )}
                      {image.width > 0 && image.width > image.height && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 bg-[#F59E0B]/20 text-[#FBBF24] text-xs rounded">
                          横版 将旋转
                        </span>
                      )}
                    </p>
                  </div>

                  {/* 上下移动按钮 */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveImage(index, -1)}
                      disabled={index === 0}
                      className="p-1 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveImage(index, 1)}
                      disabled={index === images.length - 1}
                      className="p-1 bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* 删除按钮 */}
                  <button
                    onClick={() => removeImage(image.id)}
                    className="p-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF预览 */}
      {pdfUrl && (
        <div className="mt-6 bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 border border-[#22C55E]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-[#F8FAFC]">
              PDF 已生成
            </h3>
            <button
              onClick={downloadPdf}
              className="px-6 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all"
            >
              下载 PDF
            </button>
          </div>
          <div className="bg-[#334155] rounded-lg h-96">
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg"
              title="PDF预览"
            />
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-12 bg-[#1E293B]/40 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
        <h3 className="text-lg font-semibold text-[#F8FAFC] mb-3">使用说明</h3>
        <ul className="space-y-2 text-[#94A3B8]">
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">1.</span>
            <span>拖拽或点击上传区域选择图片文件，支持多张</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">2.</span>
            <span>拖拽列表中的卡片调整图片顺序，或使用上下箭头按钮</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">3.</span>
            <span>点击"生成 PDF"按钮，图片将按顺序转换为PDF文档</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">4.</span>
            <span>预览PDF内容，确认无误后点击"下载 PDF"</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default ImageToPdf
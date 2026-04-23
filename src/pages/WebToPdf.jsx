import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'

const SERVER_URL = '' // 通过 nginx 代理

function WebToPdf() {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [mode, setMode] = useState('full') // 'full' | 'images'
  const [fetchedHtml, setFetchedHtml] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [pageImages, setPageImages] = useState([])
  const [sessionId, setSessionId] = useState('')
  const [downloadedImages, setDownloadedImages] = useState([])
  const [expiresAt, setExpiresAt] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const previewFrameRef = useRef(null)
  const countdownRef = useRef(null)

  // 倒计时
  useEffect(() => {
    if (expiresAt) {
      countdownRef.current = setInterval(() => {
        const remaining = expiresAt - Date.now()
        if (remaining <= 0) {
          clearInterval(countdownRef.current)
          setSessionId('')
          setDownloadedImages([])
          setExpiresAt(null)
          setError('会话已过期，图片已清理。请重新解析。')
        }
      }, 1000)
      return () => clearInterval(countdownRef.current)
    }
  }, [expiresAt])

  // 将 HTML 加载到 iframe 中（隔离 CSS）
  useEffect(() => {
    if (!fetchedHtml || !previewFrameRef.current) return

    const iframe = previewFrameRef.current
    const doc = iframe.contentDocument

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 16px;
            font-family: system-ui, -apple-system, sans-serif;
            background: white;
            color: #1a1a1a;
            overflow: auto;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          a {
            color: #3b82f6;
          }
          * {
            max-width: 100%;
          }
        </style>
      </head>
      <body>
        ${fetchedHtml}
      </body>
      </html>
    `)
    doc.close()
  }, [fetchedHtml])

  // 解析网页
  const loadPage = useCallback(async () => {
    if (!url.trim()) {
      setError('请输入网址')
      return
    }

    let targetUrl = url.trim()
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }

    setIsLoading(true)
    setError('')
    setWarning('')
    setFetchedHtml('')
    setPageTitle('')
    setPageImages([])
    setSessionId('')
    setDownloadedImages([])
    setExpiresAt(null)

    try {
      const res = await fetch(`${SERVER_URL}/bg-api/api/fetch-page?url=${encodeURIComponent(targetUrl)}&mode=${mode}`)

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `请求失败 (${res.status})`)
      }

      const data = await res.json()
      setFetchedHtml(data.html)
      setPageTitle(data.title || '网页')
      if (data.warning) {
        setWarning(data.warning)
      }
      if (data.images && data.images.length > 0) {
        setPageImages(data.images)
      }
    } catch (err) {
      setError(err.message || '解析失败')
    } finally {
      setIsLoading(false)
    }
  }, [url, mode])

  // 下载图片到服务器
  const downloadImages = useCallback(async () => {
    if (pageImages.length === 0) return

    setIsDownloading(true)
    setError('')

    try {
      const res = await fetch(`${SERVER_URL}/bg-api/api/download-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, images: pageImages }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `下载失败 (${res.status})`)
      }

      const data = await res.json()
      setSessionId(data.sessionId)
      setDownloadedImages(data.images.filter(img => !img.error))
      setExpiresAt(data.expiresAt)
    } catch (err) {
      setError(err.message || '下载失败')
    } finally {
      setIsDownloading(false)
    }
  }, [url, pageImages])

  // 生成图片 PDF
  const generateImagesPdf = useCallback(async () => {
    const selectedImages = downloadedImages.filter(img => img.selected !== false)
    if (selectedImages.length === 0) {
      setError('请至少选择一张图片')
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch(`${SERVER_URL}/bg-api/api/generate-images-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, selectedImages }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `生成失败 (${res.status})`)
      }

      const blob = await res.blob()
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
      saveAs(blob, `${pageTitle || 'images'}_${timestamp}.pdf`)
    } catch (err) {
      setError(err.message || 'PDF生成失败')
    } finally {
      setIsGenerating(false)
    }
  }, [sessionId, downloadedImages, pageTitle])

  // 生成PDF（完整页面）
  const generateFullPdf = useCallback(async () => {
    if (!url.trim()) return

    let targetUrl = url.trim()
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }

    setIsGenerating(true)
    try {
      const res = await fetch(`${SERVER_URL}/bg-api/api/generate-pdf?url=${encodeURIComponent(targetUrl)}&mode=${mode}`, {
        method: 'POST',
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `生成失败 (${res.status})`)
      }

      const blob = await res.blob()
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
      const domain = new URL(targetUrl).hostname.replace(/\./g, '_')
      saveAs(blob, `${domain}_${timestamp}.pdf`)
    } catch (err) {
      setError(err.message || 'PDF生成失败')
    } finally {
      setIsGenerating(false)
    }
  }, [url, mode])

  // 生成PDF
  const generatePdf = useCallback(() => {
    if (mode === 'images' && sessionId) {
      generateImagesPdf()
    } else {
      generateFullPdf()
    }
  }, [mode, sessionId, generateImagesPdf, generateFullPdf])

  // 切换图片选择
  const toggleImageSelection = useCallback((id) => {
    setDownloadedImages(prev =>
      prev.map(img =>
        img.id === id ? { ...img, selected: !img.selected } : img
      )
    )
  }, [])

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    const allSelected = downloadedImages.every(img => img.selected !== false)
    setDownloadedImages(prev =>
      prev.map(img => ({ ...img, selected: !allSelected }))
    )
  }, [downloadedImages])

  // 拖拽排序
  const handleDragStart = useCallback((index) => {
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
  }, [])

  const handleDrop = useCallback((dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }

    setDownloadedImages(prev => {
      const newImages = [...prev]
      const [dragged] = newImages.splice(dragIndex, 1)
      newImages.splice(dropIndex, 0, dragged)
      return newImages
    })

    setDragIndex(null)
    setDragOverIndex(null)
  }, [dragIndex])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  // 上移/下移
  const moveImage = useCallback((index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= downloadedImages.length) return

    setDownloadedImages(prev => {
      const newImages = [...prev]
      const temp = newImages[index]
      newImages[index] = newImages[newIndex]
      newImages[newIndex] = temp
      return newImages
    })
  }, [downloadedImages.length])

  // 获取剩余时间
  const getRemainingTime = useCallback(() => {
    if (!expiresAt) return ''
    const remaining = expiresAt - Date.now()
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)
    return `${minutes}分${seconds}秒`
  }, [expiresAt])

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const selectedCount = downloadedImages.filter(img => img.selected !== false).length

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回工具列表
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#F8FAFC] mb-2">网页转 PDF</h1>
        <p className="text-[#94A3B8]">输入网址，将整个页面或页面中的图片导出为PDF</p>
      </div>

      {/* 输入区域 */}
      <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 mb-6 border border-[#475569]">
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-1 w-full relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="输入网址，如 https://example.com"
              className="w-full bg-[#334155] text-[#F8FAFC] px-4 py-3 pr-10 rounded-lg border border-[#475569] focus:outline-none focus:ring-2 focus:ring-[#22C55E] placeholder-[#64748B]"
              onKeyDown={(e) => e.key === 'Enter' && loadPage()}
            />
            {url && (
              <button
                onClick={() => setUrl('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F8FAFC] transition-colors p-1"
                title="清除"
                type="button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex gap-3 w-full md:w-auto flex-shrink-0">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="bg-[#334155] text-[#F8FAFC] px-4 py-3 rounded-lg border border-[#475569] focus:outline-none focus:ring-2 focus:ring-[#22C55E] flex-shrink-0"
            >
              <option value="full">完整页面</option>
              <option value="images">仅提取图片</option>
            </select>
            <button
              onClick={loadPage}
              disabled={isLoading}
              className="px-6 py-3 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
              type="button"
            >
              {isLoading ? '加载中...' : '解析网页'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {warning && (
          <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm">⚠️ {warning}</p>
          </div>
        )}
      </div>

      {/* 预览和导出 */}
      {fetchedHtml && (
        <div className="space-y-6">
          {/* 操作栏 */}
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-[#94A3B8]">
                <span className="text-[#F8FAFC] font-medium">{pageTitle}</span>
                {mode === 'images' && pageImages.length > 0 && (
                  <span className="ml-2">— 已提取 {pageImages.length} 张图片</span>
                )}
              </div>
              <div className="flex gap-3">
                {mode === 'images' && sessionId && (
                  <>
                    <span className="text-[#94A3B8] text-sm">
                      已选 {selectedCount}/{downloadedImages.length} 张 | 剩余时间：{getRemainingTime()}
                    </span>
                    <button
                      onClick={generatePdf}
                      disabled={isGenerating || selectedCount === 0}
                      className="px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      type="button"
                    >
                      {isGenerating ? '生成中...' : '📄 导出 PDF'}
                    </button>
                  </>
                )}
                {mode === 'full' && (
                  <button
                    onClick={generatePdf}
                    disabled={isGenerating}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                  >
                    {isGenerating ? '生成中...' : '📄 导出 PDF'}
                  </button>
                )}
                {mode === 'images' && !sessionId && pageImages.length > 0 && (
                  <button
                    onClick={downloadImages}
                    disabled={isDownloading}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                  >
                    {isDownloading ? '下载中...' : '📥 下载图片'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 图片模式 - 显示下载的图片列表 */}
          {mode === 'images' && sessionId && downloadedImages.length > 0 && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl border border-[#475569] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#475569] flex items-center justify-between">
                <h3 className="text-[#F8FAFC] font-semibold">
                  已下载 {downloadedImages.length} 张图片
                </h3>
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                  type="button"
                >
                  {downloadedImages.every(img => img.selected !== false) ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                {downloadedImages.map((img, idx) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={`relative bg-[#334155] rounded-lg overflow-hidden transition-all ${
                      img.selected === false ? 'opacity-50' : ''
                    } ${dragOverIndex === idx ? 'ring-2 ring-[#22C55E]' : ''}`}
                  >
                    {/* 选择框 */}
                    <div className="absolute top-2 left-2 z-10">
                      <button
                        onClick={() => toggleImageSelection(img.id)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                          img.selected !== false
                            ? 'bg-[#22C55E] border-[#22C55E]'
                            : 'bg-transparent border-[#64748B]'
                        }`}
                        type="button"
                      >
                        {img.selected !== false && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* 拖拽手柄 */}
                    <div className="absolute top-2 right-2 z-10 cursor-grab active:cursor-grabbing text-[#64748B] hover:text-[#F8FAFC]">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                        <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                        <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                      </svg>
                    </div>

                    {/* 序号 */}
                    <div className="absolute bottom-2 left-2 z-10 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {idx + 1}
                    </div>

                    <img
                      src={img.path}
                      alt={img.alt}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                    />
                    <div className="p-2">
                      <p className="text-[#94A3B8] text-xs truncate" title={img.alt}>{img.alt}</p>
                      <p className="text-[#64748B] text-xs">{formatFileSize(img.size)}</p>
                    </div>

                    {/* 上下移动按钮 */}
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <button
                        onClick={() => moveImage(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 bg-black/60 hover:bg-black/80 text-white rounded disabled:opacity-30 transition-colors"
                        type="button"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveImage(idx, 1)}
                        disabled={idx === downloadedImages.length - 1}
                        className="p-1 bg-black/60 hover:bg-black/80 text-white rounded disabled:opacity-30 transition-colors"
                        type="button"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 图片模式 - 显示提取的图片（未下载） */}
          {mode === 'images' && !sessionId && pageImages.length > 0 && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl border border-[#475569] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#475569]">
                <h3 className="text-[#F8FAFC] font-semibold">提取的图片</h3>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto">
                {pageImages.map((img, idx) => (
                  <div key={idx} className="bg-[#334155] rounded-lg overflow-hidden">
                    <img src={img.src} alt={img.alt} className="w-full h-32 object-cover" loading="lazy" />
                    <div className="p-2">
                      <p className="text-[#94A3B8] text-xs truncate" title={img.alt}>{img.alt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 完整页面预览 */}
          {mode === 'full' && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl border border-[#475569] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#475569]">
                <h3 className="text-[#F8FAFC] font-semibold">页面预览</h3>
              </div>
              <div className="p-4 overflow-auto max-h-[70vh]">
                <div
                  ref={previewFrameRef}
                  className="bg-white rounded-lg overflow-hidden"
                  style={{ height: '70vh' }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-12 bg-[#1E293B]/40 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
        <h3 className="text-lg font-semibold text-[#F8FAFC] mb-3">使用说明</h3>
        <ul className="space-y-2 text-[#94A3B8]">
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">1.</span>
            <span>输入目标网址（如 https://example.com）</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">2.</span>
            <span>选择模式：<strong className="text-[#F8FAFC]">完整页面</strong>（整个网页转PDF）或 <strong className="text-[#F8FAFC]">仅提取图片</strong>（页面所有图片转PDF）</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">3.</span>
            <span>点击"解析网页"加载页面内容</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">4.</span>
            <span>确认预览无误后，点击"导出 PDF"下载（PDF在服务端生成，无跨域问题）</span>
          </li>
        </ul>
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-300 text-sm">
            ⚠️ 注意：部分网站（如微信公众号）内容需要通过 JavaScript 动态加载，可能无法完整获取。建议使用静态网页。
          </p>
        </div>
      </div>
    </div>
  )
}

export default WebToPdf
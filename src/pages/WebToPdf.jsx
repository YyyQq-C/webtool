import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'

const SERVER_URL = '' // 通过 nginx 代理

function WebToPdf() {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [mode, setMode] = useState('full') // 'full' | 'images'
  const [fetchedHtml, setFetchedHtml] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [pageImages, setPageImages] = useState([])
  const previewFrameRef = useRef(null)

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
          /* 阻止外部 CSS 影响父页面 */
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

  // 服务端生成PDF
  const generatePdf = useCallback(async () => {
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
        throw new Error(errData.detail || `生成失败 (${res.status})`)
      }

      const blob = await res.blob()
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
      const domain = new URL(targetUrl).hostname.replace(/\./g, '_')
      const suffix = mode === 'images' ? '_images' : ''
      saveAs(blob, `${domain}${suffix}_${timestamp}.pdf`)
    } catch (err) {
      setError(err.message || 'PDF生成失败')
    } finally {
      setIsGenerating(false)
    }
  }, [url, mode])

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
              <button
                onClick={generatePdf}
                disabled={isGenerating}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {isGenerating ? '生成中...' : '📄 导出 PDF'}
              </button>
            </div>
          </div>

          {/* 图片模式 */}
          {mode === 'images' && pageImages.length > 0 && (
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

          {/* 完整页面预览 - 使用 iframe 隔离 CSS */}
          {mode === 'full' && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl border border-[#475569] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#475569]">
                <h3 className="text-[#F8FAFC] font-semibold">页面预览</h3>
              </div>
              <div className="p-4">
                <div className="bg-white rounded-lg overflow-hidden" style={{ height: '70vh' }}>
                  <iframe
                    ref={previewFrameRef}
                    title="网页预览"
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
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
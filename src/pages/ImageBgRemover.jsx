import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'
import { removeBackground } from '@imgly/background-removal'

const SERVER_URL = '' // 通过同域 nginx 代理，/bg-api → :8000

function ImageBgRemover() {
  const [image, setImage] = useState(null)
  const [result, setResult] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [mode, setMode] = useState('browser') // 'browser' | 'server'

  // 处理文件上传
  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return

    if (result) {
      URL.revokeObjectURL(result)
      setResult(null)
    }

    setImage({
      file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
    })
  }, [result])

  const handleDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) handleFile(acceptedFiles[0])
  }, [handleFile])

  // 浏览器端去背景
  const removeBgBrowser = async () => {
    setIsProcessing(true)
    setProgress('正在加载AI模型...（首次使用约需下载80MB模型文件）')

    try {
      const blob = await removeBackground(image.file, {
        debug: false,
        model: 'medium',
        output: { format: 'image/png', type: 'foreground' },
        progress: (key, current, total) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100)
            if (key.includes('model')) setProgress(`正在下载AI模型... ${pct}%`)
          }
        },
      })

      const url = URL.createObjectURL(blob)
      setResult(url)
      setProgress('✅ 处理完成！')
    } catch (err) {
      console.error('Browser removal failed:', err)
      setProgress(`浏览器模式失败: ${err.message || '未知错误'}`)
    }
    setIsProcessing(false)
  }

  // 服务器端去背景
  const removeBgServer = async () => {
    setIsProcessing(true)
    setProgress('正在上传到服务器处理...')

    try {
      const formData = new FormData()
      formData.append('file', image.file)

      const res = await fetch(`/bg-api/api/remove-background`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: '服务器错误' }))
        throw new Error(err.detail || '处理失败')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setResult(url)
      setProgress('✅ 服务器处理完成！')
    } catch (err) {
      console.error('Server removal failed:', err)
      setProgress(`服务器模式失败: ${err.message || '请确认后端服务已启动'}`)
    }
    setIsProcessing(false)
  }

  // 去背景（根据模式选择）
  const removeBg = () => {
    if (!image) return
    mode === 'browser' ? removeBgBrowser() : removeBgServer()
  }

  // 下载结果
  const downloadResult = () => {
    if (!result) return
    const name = image.name.replace(/\.[^/.]+$/, '')
    saveAs(result, `${name}-no-bg.png`)
  }

  // 清空
  const clearAll = () => {
    if (image?.preview) URL.revokeObjectURL(image.preview)
    if (result) URL.revokeObjectURL(result)
    setImage(null)
    setResult(null)
    setProgress('')
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const isError = progress.includes('失败')
  const isSuccess = progress.includes('✅')

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回工具列表
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#F8FAFC] mb-2">图片去背景</h1>
        <p className="text-[#94A3B8]">AI智能识别，一键去除图片背景，支持预览和下载PNG</p>
      </div>

      {/* 操作栏 */}
      <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 mb-6 border border-[#475569]">
        {/* 模式切换 */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[#94A3B8] text-sm">处理模式：</span>
          <div className="flex bg-[#334155] rounded-lg overflow-hidden">
            <button
              onClick={() => setMode('browser')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'browser'
                  ? 'bg-[#22C55E] text-[#0F172A]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              🌐 浏览器端
            </button>
            <button
              onClick={() => setMode('server')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'server'
                  ? 'bg-[#22C55E] text-[#0F172A]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              🖥️ 服务器端
            </button>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${
            mode === 'browser'
              ? 'bg-blue-500/20 text-blue-300'
              : 'bg-purple-500/20 text-purple-300'
          }`}>
            {mode === 'browser'
              ? '本地处理 · 无需上传 · 首次需下载模型'
              : '服务器处理 · 效果更好 · 文件10分钟后自动清理'}
          </span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="text-[#94A3B8]">
            {image ? (
              <span>已选择：<strong className="text-[#F8FAFC]">{image.name}</strong></span>
            ) : (
              <span>上传一张图片以开始</span>
            )}
          </div>

          <div className="flex gap-3">
            {image && (
              <button onClick={clearAll} className="px-6 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg transition-colors">
                清空
              </button>
            )}
            <button
              onClick={removeBg}
              disabled={!image || isProcessing}
              className="px-6 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? '处理中...' : '去除背景'}
            </button>
            {result && (
              <button onClick={downloadResult} className="px-6 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-all">
                下载 PNG
              </button>
            )}
          </div>
        </div>

        {/* 进度提示 */}
        {(isProcessing || progress) && (
          <div className="mt-4 flex items-center gap-3">
            {isProcessing && <div className="w-4 h-4 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin"></div>}
            <span className={`text-sm ${isError ? 'text-red-400' : isSuccess ? 'text-[#22C55E]' : 'text-[#94A3B8]'}`}>
              {progress}
            </span>
          </div>
        )}
      </div>

      {/* 上传区域 */}
      {!image && (
        <div
          className="relative border-2 border-dashed border-[#475569] bg-[#1E293B]/40 hover:border-[#22C55E] hover:bg-[#1E293B]/60 rounded-2xl p-12 text-center transition-all duration-300"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
            if (files.length > 0) handleDrop(files)
          }}
          onClick={() => document.getElementById('bg-file-input').click()}
        >
          <input
            id="bg-file-input"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const files = Array.from(e.target.files)
              if (files.length > 0) handleFile(files[0])
              e.target.value = ''
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="text-6xl mb-4">🖼️</div>
          <p className="text-xl font-medium text-[#F8FAFC] mb-2">拖拽图片到这里</p>
          <p className="text-[#94A3B8]">或点击选择文件</p>
        </div>
      )}

      {/* 对比预览 */}
      {image && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl border border-[#475569] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#475569]">
              <h3 className="text-[#F8FAFC] font-semibold">原始图片</h3>
              <p className="text-[#94A3B8] text-sm">{formatFileSize(image.size)}</p>
            </div>
            <div className="p-4">
              <div className="bg-[#334155] rounded-lg overflow-hidden">
                <img src={image.preview} alt="原图" className="w-full h-auto" />
              </div>
            </div>
          </div>

          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl border border-[#475569] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#475569]">
              <h3 className="text-[#F8FAFC] font-semibold">{result ? '去背景结果' : '处理结果'}</h3>
              {result && <p className="text-[#22C55E] text-sm">✅ 已完成，可下载PNG</p>}
            </div>
            <div className="p-4">
              <div
                className="rounded-lg overflow-hidden min-h-[200px] flex items-center justify-center"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #334155 25%, transparent 25%),
                    linear-gradient(-45deg, #334155 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #334155 75%),
                    linear-gradient(-45deg, transparent 75%, #334155 75%)
                  `,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                }}
              >
                {result ? (
                  <img src={result} alt="去背景" className="w-full h-auto" />
                ) : isProcessing ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-[#94A3B8] text-sm">{progress}</p>
                  </div>
                ) : (
                  <p className="text-[#64748B] text-sm py-12">点击"去除背景"按钮开始处理</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-12 bg-[#1E293B]/40 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
        <h3 className="text-lg font-semibold text-[#F8FAFC] mb-3">使用说明</h3>
        <ul className="space-y-2 text-[#94A3B8]">
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">1.</span>
            <span>选择处理模式：<strong className="text-[#F8FAFC]">浏览器端</strong>（本地处理，隐私好）或 <strong className="text-[#F8FAFC]">服务器端</strong>（效果更好）</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">2.</span>
            <span>拖拽或点击上传区域选择一张图片</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">3.</span>
            <span>点击"去除背景"按钮，AI将自动识别并去除背景</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">4.</span>
            <span>确认效果满意后，点击"下载 PNG"保存结果</span>
          </li>
        </ul>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              🌐 <strong>浏览器端</strong>：首次需下载 ~80MB AI模型，模型会缓存在浏览器中。所有处理在本地完成，无需上传。
            </p>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <p className="text-purple-300 text-sm">
              🖥️ <strong>服务器端</strong>：基于 rembg (u2net模型)，去除效果更好。图片上传到服务器处理，处理结果10分钟后自动清理。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageBgRemover
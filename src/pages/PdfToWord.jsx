import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

// 支持的PDF文件检查
function isPdfFile(file) {
  if (file.type === 'application/pdf') return true
  const ext = file.name.split('.').pop().toLowerCase()
  return ext === 'pdf'
}

function PdfToWord() {
  const [files, setFiles] = useState([])
  const [converting, setConverting] = useState(false)
  const [convertedFiles, setConvertedFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [serverStatus, setServerStatus] = useState({ libreoffice: false, pdf2docx: false })

  // 检查服务器状态
  useEffect(() => {
    fetch('/bg-api/api/pdf2word/status')
      .then(res => res.json())
      .then(data => setServerStatus(data))
      .catch(() => setServerStatus({ libreoffice: false, pdf2docx: false }))
  }, [])

  // 自动清理
  useEffect(() => {
    if (convertedFiles.length > 0) {
      const timer = setTimeout(() => {
        setFiles([])
        setConvertedFiles([])
        console.log('资源已自动清理')
      }, 10 * 60 * 1000)
      return () => clearTimeout(timer)
    }
  }, [convertedFiles])

  // 拖拽处理
  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    setError('')

    const allFiles = Array.from(e.dataTransfer.files)
    const validFiles = allFiles.filter(isPdfFile)
    const sizeValidFiles = validFiles.filter(f => f.size <= 100 * 1024 * 1024)

    if (validFiles.length === 0 && allFiles.length > 0) {
      setError('只支持PDF文件')
      setTimeout(() => setError(''), 3000)
    } else if (sizeValidFiles.length < validFiles.length) {
      setError('文件过大（最大100MB）')
      setTimeout(() => setError(''), 3000)
    }

    if (sizeValidFiles.length > 0) {
      const newFiles = sizeValidFiles.map(f => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        name: f.name,
        size: f.size,
        status: 'pending',
        progress: 0,
        output: null,
        error: null
      }))
      setFiles(prev => [...prev, ...newFiles])
    }
  }, [])

  // 文件选择
  const handleFileInput = (e) => {
    setError('')
    const allFiles = Array.from(e.target.files)
    const validFiles = allFiles.filter(isPdfFile)
    const sizeValidFiles = validFiles.filter(f => f.size <= 100 * 1024 * 1024)

    if (validFiles.length === 0 && allFiles.length > 0) {
      setError('只支持PDF文件')
      setTimeout(() => setError(''), 3000)
    } else if (sizeValidFiles.length < validFiles.length) {
      setError('文件过大（最大100MB）')
      setTimeout(() => setError(''), 3000)
    }

    if (sizeValidFiles.length > 0) {
      const newFiles = sizeValidFiles.map(f => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        name: f.name,
        size: f.size,
        status: 'pending',
        progress: 0,
        output: null,
        error: null
      }))
      setFiles(prev => [...prev, ...newFiles])
    }
    e.target.value = ''
  }

  // 开始转换
  const startConvert = async () => {
    if (files.length === 0) return
    setConverting(true)
    setConvertedFiles([])

    const formData = new FormData()
    files.forEach(f => formData.append('files', f.file))

    try {
      const res = await fetch('/bg-api/api/pdf2word/batch', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || '上传失败')
        setConverting(false)
        return
      }

      const data = await res.json()
      const taskIds = data.tasks.map(t => t.taskId)

      // 更新文件状态为处理中
      setFiles(prev => prev.map(f => ({ ...f, status: 'processing', progress: 10 })))

      // 保存原始文件名映射
      const fileNameMap = files.map(f => f.name)

      // 轮询任务状态
      const pollTasks = async () => {
        let allDone = false
        let finalResults = []
        
        while (!allDone) {
          await new Promise(r => setTimeout(r, 1000))

          const results = []
          for (const taskId of taskIds) {
            const statusRes = await fetch(`/bg-api/api/pdf2word/task/${taskId}`)
            const statusData = await statusRes.json()
            results.push(statusData)
          }

          finalResults = results

          // 更新进度
          setFiles(prev => prev.map((f, i) => {
            const task = results[i]
            if (!task) return f
            return {
              ...f,
              status: task.status,
              progress: task.progress || 0,
              error: task.status === 'failed' ? task.message : null,
              taskId: taskIds[i]
            }
          }))

          allDone = results.every(r => r.status === 'completed' || r.status === 'failed')
        }

        // 收集完成的结果
        const completed = []
        for (let i = 0; i < taskIds.length; i++) {
          const task = finalResults[i]
          if (task && task.status === 'completed') {
            completed.push({
              taskId: taskIds[i],
              name: fileNameMap[i].replace('.pdf', '.docx'),
              url: `/bg-api/api/pdf2word/download/${taskIds[i]}`
            })
          }
        }

        setConvertedFiles(completed)
        setConverting(false)
      }

      pollTasks()

    } catch (e) {
      setError('转换失败: ' + e.message)
      setConverting(false)
    }
  }

  // 下载单个
  const downloadSingle = async (file) => {
    const res = await fetch(file.url)
    const blob = await res.blob()
    saveAs(blob, file.name)
  }

  // 打包下载
  const downloadAll = async () => {
    if (convertedFiles.length === 0) return

    const zip = new JSZip()
    for (const file of convertedFiles) {
      const res = await fetch(file.url)
      const blob = await res.blob()
      zip.file(file.name, blob)
    }

    const content = await zip.generateAsync({ type: 'blob' })
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    saveAs(content, `pdf-to-word-${timestamp}.zip`)
  }

  // 删除文件
  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  // 清空
  const clearAll = () => {
    setFiles([])
    setConvertedFiles([])
  }

  // 格式化文件大小
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  // 状态显示
  const getStatusText = (status) => {
    const map = {
      pending: '等待转换',
      processing: '转换中...',
      completed: '已完成',
      failed: '失败'
    }
    return map[status] || status
  }

  const getStatusColor = (status) => {
    const map = {
      pending: 'text-[#94A3B8]',
      processing: 'text-[#F59E0B]',
      completed: 'text-[#22C55E]',
      failed: 'text-[#DC2626]'
    }
    return map[status] || 'text-[#94A3B8]'
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

      {/* 标题 */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#F8FAFC] mb-2">
          PDF转Word
        </h1>
        <p className="text-[#94A3B8]">
          拖拽或点击上传PDF，批量转换为Word文档
        </p>
      </div>

      {/* 服务器状态 */}
      <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-4 mb-6 border border-[#475569]">
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${serverStatus.libreoffice ? 'bg-[#22C55E]' : 'bg-[#DC2626]'}`}></span>
            <span className="text-[#94A3B8] text-sm">LibreOffice</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${serverStatus.pdf2docx ? 'bg-[#22C55E]' : 'bg-[#DC2626]'}`}></span>
            <span className="text-[#94A3B8] text-sm">pdf2docx (兜底)</span>
          </div>
        </div>
      </div>

      {/* 上传区域 */}
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all duration-300 cursor-pointer
          ${dragging
            ? 'border-[#22C55E] bg-[#22C55E]/10 scale-105'
            : 'border-[#475569] bg-[#1E293B]/40 hover:border-[#22C55E] hover:bg-[#1E293B]/60'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('pdf-input').click()}
      >
        <input
          id="pdf-input"
          type="file"
          multiple
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="text-5xl md:text-6xl mb-3 md:mb-4">
          {dragging ? '📄' : '📑'}
        </div>
        <p className="text-lg md:text-xl font-medium text-[#F8FAFC] mb-1 md:mb-2">
          {dragging ? '松开以上传PDF' : '拖拽PDF文件到这里'}
        </p>
        <p className="text-sm md:text-base text-[#94A3B8] mb-3 md:mb-4">
          或点击选择文件
        </p>
        <span className="inline-block px-4 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium text-sm rounded-lg transition-colors">
          选择PDF
        </span>

        <p className="text-[#64748B] text-xs md:text-sm mt-4">
          支持批量上传，单个文件最大100MB
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-[#F8FAFC]">
              已上传 {files.length} 个PDF
            </h3>
            <div className="flex gap-3">
              <button
                onClick={clearAll}
                className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg transition-colors text-sm"
              >
                清空
              </button>
              <button
                onClick={startConvert}
                disabled={converting}
                className="px-6 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {converting ? '转换中...' : '开始转换'}
              </button>
              {convertedFiles.length > 0 && (
                <button
                  onClick={downloadAll}
                  className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-all text-sm"
                >
                  打包下载
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="bg-[#1E293B]/60 rounded-xl p-4 border border-[#475569]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <p className="text-[#F8FAFC] font-medium">{file.name}</p>
                      <p className="text-[#64748B] text-sm">{formatSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${getStatusColor(file.status)}`}>
                      {getStatusText(file.status)}
                    </span>
                    {file.status === 'pending' && (
                      <button
                        onClick={() => removeFile(file.id)}
                        className="text-[#94A3B8] hover:text-[#DC2626] transition-colors"
                      >
                        ✕
                      </button>
                    )}
                    {file.status === 'completed' && convertedFiles.find(c => c.taskId === file.taskId) && (
                      <button
                        onClick={() => downloadSingle(convertedFiles.find(c => c.taskId === file.taskId))}
                        className="px-3 py-1 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-sm transition-colors"
                      >
                        下载
                      </button>
                    )}
                  </div>
                </div>
                {file.status === 'processing' && (
                  <div className="mt-3">
                    <div className="w-full h-2 bg-[#334155] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#22C55E] to-[#10B981] transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {file.error && (
                  <p className="mt-2 text-[#DC2626] text-sm">{file.error}</p>
                )}
              </div>
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
            <span>拖拽或点击上传区域选择PDF文件，支持批量上传</span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-400 mr-2">2.</span>
            <span>点击"开始转换"按钮，系统将自动转换PDF为Word格式</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">3.</span>
            <span>转换引擎：优先使用LibreOffice（格式保留更好），失败时自动切换pdf2docx兜底</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">4.</span>
            <span>转换完成后可单独下载或打包下载所有Word文档</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#22C55E] mr-2">5.</span>
            <span>文件保留10分钟后自动清理</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default PdfToWord
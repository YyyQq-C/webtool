import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import UploadArea from '../components/UploadArea'
import gifuct from 'gifuct-js'

function GifExtractor() {
  const [gif, setGif] = useState(null)
  const [frames, setFrames] = useState([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [selectedFrames, setSelectedFrames] = useState([])

  const handleDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file && file.type === 'image/gif') {
      setGif({
        file,
        name: file.name,
        preview: URL.createObjectURL(file),
      })
      setFrames([])
      setSelectedFrames([])
    }
  }, [])

  const clearGif = () => {
    if (gif?.preview) URL.revokeObjectURL(gif.preview)
    frames.forEach(f => URL.revokeObjectURL(f.preview))
    setGif(null)
    setFrames([])
    setSelectedFrames([])
  }

  const extractFrames = async () => {
    if (!gif) return
    setIsExtracting(true)

    try {
      const arrayBuffer = await gif.file.arrayBuffer()
      const gifData = gifuct.parseGIF(arrayBuffer)
      const framesData = gifuct.decompressFrames(gifData, true)

      const extractedFrames = framesData.map((frameData, index) => {
        const canvas = document.createElement('canvas')
        canvas.width = frameData.dims.width
        canvas.height = frameData.dims.height
        const ctx = canvas.getContext('2d')

        const imageData = new ImageData(
          new Uint8ClampedArray(frameData.patch),
          frameData.dims.width,
          frameData.dims.height
        )
        ctx.putImageData(imageData, 0, 0)

        return {
          id: index,
          preview: canvas.toDataURL('image/png'),
          canvas,
          name: `frame-${index + 1}.png`,
        }
      })

      setFrames(extractedFrames)
      setSelectedFrames(extractedFrames.map(f => f.id))
    } catch (error) {
      console.error('解析 GIF 失败:', error)
      alert('解析 GIF 失败，请确保上传的是有效的 GIF 文件')
    }
    setIsExtracting(false)
  }

  const toggleFrame = (id) => {
    setSelectedFrames(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const downloadSingle = (frame) => {
    frame.canvas.toBlob((blob) => {
      if (blob) saveAs(blob, frame.name)
    }, 'image/png')
  }

  const downloadSelected = async () => {
    const selected = frames.filter(f => selectedFrames.includes(f.id))
    if (selected.length === 0) return

    if (selected.length === 1) {
      downloadSingle(selected[0])
    } else {
      const zip = new JSZip()
      selected.forEach((frame) => {
        const dataUrl = frame.preview.split(',')[1]
        zip.file(frame.name, dataUrl, { base64: true })
      })
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, `gif-frames-${Date.now()}.zip`)
    }
  }

  const downloadAll = async () => {
    const zip = new JSZip()
    frames.forEach((frame) => {
      const dataUrl = frame.preview.split(',')[1]
      zip.file(frame.name, dataUrl, { base64: true })
    })
    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, `gif-frames-all-${Date.now()}.zip`)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回工具列表
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-[#F8FAFC] mb-2">GIF 分帧提取</h1>
        <p className="text-[#94A3B8]">将 GIF 动图拆分为单帧图片，支持选择性下载</p>
      </div>

      {!gif && <UploadArea onDrop={handleDrop} accept="image/gif" text="拖拽或点击上传 GIF 文件" />}

      {gif && (
        <div className="space-y-6">
          {/* GIF 预览 */}
          <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-4 border border-[#475569]">
            <div className="flex items-start gap-4">
              <img src={gif.preview} alt={gif.name} className="max-w-xs rounded-lg" />
              <div className="flex-grow">
                <p className="text-[#F8FAFC] font-medium">{gif.name}</p>
                <button onClick={clearGif} className="mt-2 text-[#DC2626] hover:text-[#B91C1C] text-sm">
                  清除 GIF
                </button>
              </div>
              <button
                onClick={extractFrames}
                disabled={isExtracting}
                className="px-6 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50"
              >
                {isExtracting ? '提取中...' : '提取帧'}
              </button>
            </div>
          </div>

          {/* 帧列表 */}
          {frames.length > 0 && (
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-4 border border-[#475569]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#F8FAFC]">
                  共 {frames.length} 帧，已选 {selectedFrames.length} 帧
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={downloadSelected}
                    disabled={selectedFrames.length === 0}
                    className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-all disabled:opacity-50"
                  >
                    下载选中
                  </button>
                  <button
                    onClick={downloadAll}
                    className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg transition-all"
                  >
                    下载全部
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {frames.map((frame) => (
                  <div
                    key={frame.id}
                    onClick={() => toggleFrame(frame.id)}
                    className={`relative rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedFrames.includes(frame.id)
                        ? 'ring-2 ring-[#22C55E] bg-[#22C55E]/10'
                        : 'bg-[#334155]'
                    }`}
                  >
                    <img src={frame.preview} alt={`Frame ${frame.id + 1}`} className="w-full aspect-square object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-[#0F172A]/80 px-2 py-1 flex items-center justify-between">
                      <span className="text-[#F8FAFC] text-xs">#{frame.id + 1}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadSingle(frame)
                        }}
                        className="text-[#22C55E] hover:text-[#16A34A]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GifExtractor
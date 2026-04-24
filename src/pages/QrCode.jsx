import { useState } from 'react'
import { Link } from 'react-router-dom'
import { saveAs } from 'file-saver'
import QRCode from 'qrcode'
import jsQR from 'jsqr'

function QrCode() {
  const [mode, setMode] = useState('generate') // generate, parse
  const [text, setText] = useState('')
  const [qrImage, setQrImage] = useState(null)
  const [parsedText, setParsedText] = useState('')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [size, setSize] = useState(300)
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#FFFFFF')

  const generateQR = async () => {
    if (!text) return
    try {
      const canvas = document.createElement('canvas')
      await QRCode.toCanvas(canvas, text, {
        width: size,
        color: {
          dark: fgColor,
          light: bgColor,
        },
      })
      const dataUrl = canvas.toDataURL('image/png')
      setQrImage(dataUrl)
    } catch (error) {
      console.error('生成二维码失败:', error)
      alert('生成失败，请检查输入内容')
    }
  }

  const downloadQR = () => {
    if (qrImage) {
      const link = document.createElement('a')
      link.href = qrImage
      link.download = `qrcode-${Date.now()}.png`
      link.click()
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploadedImage(URL.createObjectURL(file))
      setParsedText('')
      parseQR(file)
    }
  }

  const parseQR = async (file) => {
    try {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code) {
          setParsedText(code.data)
        } else {
          setParsedText('未识别到二维码')
        }
      }
      img.src = URL.createObjectURL(file)
    } catch (error) {
      console.error('解析失败:', error)
      setParsedText('解析失败')
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
        <h1 className="text-4xl font-bold text-[#F8FAFC] mb-2">二维码工具</h1>
        <p className="text-[#94A3B8]">生成二维码或解析图片中的二维码内容</p>
      </div>

      {/* 模式切换 */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => setMode('generate')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${mode === 'generate' ? 'bg-[#22C55E] text-[#0F172A]' : 'bg-[#334155] text-[#F8FAFC]'}`}
        >
          生成二维码
        </button>
        <button
          onClick={() => setMode('parse')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${mode === 'parse' ? 'bg-[#22C55E] text-[#0F172A]' : 'bg-[#334155] text-[#F8FAFC]'}`}
        >
          解析二维码
        </button>
      </div>

      {mode === 'generate' && (
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
          <div className="space-y-4">
            <div>
              <label className="text-[#94A3B8] text-sm mb-1 block">输入内容：</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="输入文字、链接、电话号码等"
                rows={3}
                className="w-full bg-[#334155] text-[#F8FAFC] px-4 py-3 rounded-lg border border-[#475569] focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
              />
            </div>

            <div className="flex gap-4">
              <div>
                <label className="text-[#94A3B8] text-sm mb-1 block">尺寸：</label>
                <input
                  type="number"
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  min="100"
                  max="500"
                  className="bg-[#334155] text-[#F8FAFC] px-3 py-2 rounded-lg border border-[#475569] w-24"
                />
              </div>
              <div>
                <label className="text-[#94A3B8] text-sm mb-1 block">前景色：</label>
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="bg-[#334155] rounded-lg border border-[#475569] w-12 h-10"
                />
              </div>
              <div>
                <label className="text-[#94A3B8] text-sm mb-1 block">背景色：</label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="bg-[#334155] rounded-lg border border-[#475569] w-12 h-10"
                />
              </div>
            </div>

            <button
              onClick={generateQR}
              disabled={!text}
              className="w-full px-6 py-3 bg-[#22C55E] hover:bg-[#16A34A] text-[#0F172A] font-medium rounded-lg transition-all disabled:opacity-50"
            >
              生成二维码
            </button>

            {qrImage && (
              <div className="flex flex-col items-center gap-4">
                <img src={qrImage} alt="QR Code" className="rounded-lg shadow-lg" />
                <button
                  onClick={downloadQR}
                  className="px-6 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg"
                >
                  下载二维码
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'parse' && (
        <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-xl p-6 border border-[#475569]">
          <div className="space-y-4">
            <div>
              <label className="text-[#94A3B8] text-sm mb-2 block">上传二维码图片：</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="bg-[#334155] text-[#F8FAFC] px-4 py-2 rounded-lg border border-[#475569] w-full"
              />
            </div>

            {uploadedImage && (
              <div className="flex flex-col items-center gap-4">
                <img src={uploadedImage} alt="Uploaded" className="max-w-xs rounded-lg" />
                <div className="bg-[#334155] px-4 py-3 rounded-lg max-w-full">
                  <p className="text-[#94A3B8] text-sm mb-1">识别结果：</p>
                  <p className="text-[#F8FAFC] font-medium break-all">{parsedText}</p>
                </div>
                {parsedText && parsedText !== '未识别到二维码' && parsedText !== '解析失败' && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(parsedText)
                      alert('已复制')
                    }}
                    className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg"
                  >
                    复制内容
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default QrCode
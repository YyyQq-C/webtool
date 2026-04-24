import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Cropper from 'react-easy-crop'
import { saveAs } from 'file-saver'
import UploadArea, { isImageFile } from '../components/UploadArea'
import getCroppedImg from '../utils/cropImage'

function ImageCropper() {
  const [image, setImage] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [aspect, setAspect] = useState(undefined) // undefined means free aspect ratio

  const [uploadError, setUploadError] = useState('')

  const handleFile = useCallback((file) => {
    setUploadError('')
    if (!file) return

    if (!isImageFile(file)) {
      setUploadError('不支持的文件格式，请上传图片文件')
      setTimeout(() => setUploadError(''), 3000)
      return
    }

    setImage({
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
    })
  }, [])

  const handleDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) handleFile(acceptedFiles[0])
  }, [handleFile])

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const showCroppedImage = async () => {
    try {
      const croppedImage = await getCroppedImg(
        image.preview,
        croppedAreaPixels,
        rotation
      )
      const name = image.name.replace(/\.[^/.]+$/, '')
      saveAs(croppedImage, `${name}-cropped.png`)
    } catch (e) {
      console.error(e)
    }
  }

  const clearAll = () => {
    if (image?.preview) URL.revokeObjectURL(image.preview)
    setImage(null)
    setRotation(0)
    setZoom(1)
    setAspect(undefined)
  }

  const aspectRatios = [
    { label: '自由', value: undefined },
    { label: '1:1', value: 1 / 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '16:9', value: 16 / 9 },
    { label: '3:2', value: 3 / 2 },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors font-medium">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回工具列表
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-2">图片裁剪工具</h1>
        <p className="text-[#94A3B8]">自由裁剪、比例裁剪、旋转图片，由于是本地处理，您的隐私完全保密</p>
      </div>

      {!image ? (
        <UploadArea
          onDrop={handleDrop}
          isImageFile={isImageFile}
          error={uploadError}
          setError={setUploadError}
          onFileSelect={handleFile}
        />
      ) : (
        <div className="bg-[#1E293B]/60 backdrop-blur-md rounded-2xl border border-[#475569] p-6 shadow-xl animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* 裁剪区域 */}
            <div className="flex-1">
              <div className="relative h-[500px] w-full rounded-xl overflow-hidden bg-[#0F172A] border border-[#334155]">
                <Cropper
                  image={image.preview}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  rotation={rotation}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                />
              </div>
            </div>

            {/* 控制面板 */}
            <div className="w-full lg:w-80 flex flex-col gap-6">
              <div>
                <h3 className="text-[#F8FAFC] font-semibold mb-3 flex items-center">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full mr-2"></span>
                  比例选择
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.label}
                      onClick={() => setAspect(ratio.value)}
                      className={`py-2 px-3 rounded-lg text-sm transition-all border ${
                        aspect === ratio.value
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                          : 'bg-[#334155] border-[#475569] text-[#94A3B8] hover:border-blue-400/50'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[#F8FAFC] font-semibold mb-3 flex items-center">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full mr-2"></span>
                  缩放: {zoom.toFixed(1)}x
                </h3>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-blue-500 h-2 bg-[#334155] rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <h3 className="text-[#F8FAFC] font-semibold mb-3 flex items-center">
                  <span className="w-1.5 h-6 bg-purple-500 rounded-full mr-2"></span>
                  旋转: {rotation}°
                </h3>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full accent-indigo-500 h-2 bg-[#334155] rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-2">
                    <button onClick={() => setRotation((r) => (r - 90 + 360) % 360)} className="text-xs text-[#94A3B8] hover:text-white px-2 py-1 rounded bg-[#334155]">左转 90°</button>
                    <button onClick={() => setRotation((r) => (r + 90) % 360)} className="text-xs text-[#94A3B8] hover:text-white px-2 py-1 rounded bg-[#334155]">右转 90°</button>
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <button
                  onClick={showCroppedImage}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  导出裁剪图片
                </button>
                <button
                  onClick={clearAll}
                  className="w-full py-3 bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white rounded-xl border border-[#475569] transition-all"
                >
                  重选图片
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 说明区域 */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1E293B]/40 p-6 rounded-2xl border border-[#475569]">
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-[#F8FAFC] font-semibold mb-2">安全隐私</h3>
          <p className="text-[#94A3B8] text-sm leading-relaxed">基于浏览器本地 Canvas 技术处理图片，所有操作均在您的电脑上完成，图片绝不上传任何服务器。</p>
        </div>
        <div className="bg-[#1E293B]/40 p-6 rounded-2xl border border-[#475569]">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
          <h3 className="text-[#F8FAFC] font-semibold mb-2">灵活比例</h3>
          <p className="text-[#94A3B8] text-sm leading-relaxed">预设多种常用社交媒体及文档比例，支持自由拉伸调整，满足不同场景下的尺寸需求。</p>
        </div>
        <div className="bg-[#1E293B]/40 p-6 rounded-2xl border border-[#475569]">
          <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="text-[#F8FAFC] font-semibold mb-2">精细旋转</h3>
          <p className="text-[#94A3B8] text-sm leading-relaxed">支持 360 度任意角度旋转调节，可修正拍摄倾斜的图片，边缘自动对齐裁切。</p>
        </div>
      </div>
    </div>
  )
}

export default ImageCropper

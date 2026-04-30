import { useState, useCallback, useRef, useEffect, useReducer, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Cropper from 'react-easy-crop'
import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal'

// ============================================================================
// 常量定义
// ============================================================================

/** 证件照尺寸预设（单位：mm + 300dpi换算后的像素） */
const SIZE_PRESETS = [
  { id: 'one-inch',  name: '一寸',   mm: '25×35mm',  pxW: 295,  pxH: 413,  desc: '身份证、工作证、学生证' },
  { id: 'two-inch',  name: '二寸',   mm: '35×49mm',  pxW: 413,  pxH: 579,  desc: '护照、签证、毕业证' },
  { id: 'small-two', name: '小二寸', mm: '35×45mm',  pxW: 413,  pxH: 531,  desc: '公务员考试' },
  { id: 'passport',  name: '护照',   mm: '33×48mm',  pxW: 390,  pxH: 567,  desc: '因私普通护照' },
  { id: 'visa-us',   name: '美国签证', mm: '51×51mm', pxW: 600,  pxH: 600,  desc: '美国签证申请' },
  { id: 'visa-jp',   name: '日本签证', mm: '45×45mm', pxW: 531,  pxH: 531,  desc: '日本签证申请' },
]

/** 背景色预设 */
const BG_COLORS = [
  { name: '白色', value: '#FFFFFF' },
  { name: '蓝色', value: '#438EDB' },
  { name: '红色', value: '#D92B2B' },
]

/** 排版预设 */
const LAYOUT_PRESETS = [
  { id: '6inch-8', name: '6寸·8张', paperW: 1800, paperH: 1200, cols: 4, rows: 2, desc: '最常用' },
  { id: '6inch-9', name: '6寸·9张', paperW: 1800, paperH: 1200, cols: 3, rows: 3, desc: '紧凑排列' },
  { id: 'a4',      name: 'A4排版',  paperW: 2480, paperH: 3508, cols: 5, rows: 7, desc: 'A4纸打印' },
]

// ============================================================================
// useReducer 状态管理
// ============================================================================

const initialState = {
  // 图片
  imageFile: null,
  imageSrc: null,       // 用于 Cropper 的 URL
  imageSize: null,      // { width, height } 原始图片尺寸
  transparentUrl: null, // 去背景后的透明图 URL（缓存）
  bgRemoving: false,    // 是否正在去背景
  bgProgress: '',       // 去背景进度提示

  // 裁剪
  crop: { x: 0, y: 0 },
  zoom: 1,
  croppedAreaPixels: null,

  // 尺寸与比例
  selectedSize: SIZE_PRESETS[0],

  // 背景
  bgColor: BG_COLORS[1].value,
  customColor: '#438EDB',
  useCustomColor: false,

  // 图像调整参数
  brightness: 0,        // -100 ~ 100
  contrast: 0,          // -100 ~ 100
  sharpen: 0,           // 0 ~ 100
  smoothing: 0,         // 0 ~ 100

  // 换底模式
  bgMode: 'ai',         // 'ai' = AI抠图换底 | 'simple' = 直接覆盖

  // 排版设置
  layout: LAYOUT_PRESETS[0],

  // 生成结果
  resultUrl: null,      // 单张照片
  layoutUrl: null,      // 排版结果
  isGenerating: false,

  // 检测提示
  warnings: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_IMAGE':
      return {
        ...state,
        imageFile: action.payload.file,
        imageSrc: action.payload.url,
        imageSize: action.payload.size,
        transparentUrl: null,  // 重置去背景缓存
        bgRemoving: true,       // 开始去背景
        resultUrl: null,
        layoutUrl: null,
        warnings: [],
      }

    case 'SET_TRANSPARENT':
      return {
        ...state,
        transparentUrl: action.payload,
        bgRemoving: false,
        bgProgress: '',
      }

    case 'SET_BG_REMOVING':
      return { ...state, bgRemoving: action.payload, bgProgress: action.payload ? '正在初始化 AI 模型...' : '' }

    case 'SET_BG_PROGRESS':
      return { ...state, bgProgress: action.payload }

    case 'SET_BG_MODE':
      return { ...state, bgMode: action.payload }

    case 'RESET':
      // 释放透明图 URL
      if (state.transparentUrl) URL.revokeObjectURL(state.transparentUrl)
      return {
        ...initialState,
        selectedSize: state.selectedSize,
      }

    case 'SET_CROP':
      return { ...state, crop: action.payload }

    case 'SET_ZOOM':
      return { ...state, zoom: action.payload }

    case 'SET_CROPPED_AREA':
      return { ...state, croppedAreaPixels: action.payload }

    case 'SET_SIZE':
      return {
        ...state,
        selectedSize: action.payload,
        resultUrl: null,
        layoutUrl: null,
        // 切换尺寸时重置裁剪位置
        crop: { x: 0, y: 0 },
        zoom: 1,
      }

    case 'SET_BG_COLOR':
      return { ...state, bgColor: action.payload }

    case 'SET_CUSTOM_COLOR':
      return {
        ...state,
        customColor: action.payload,
        useCustomColor: true,
        bgColor: action.payload,
      }

    case 'SET_ADJUST':
      return { ...state, ...action.payload, resultUrl: null, layoutUrl: null }

    case 'SET_LAYOUT':
      return { ...state, layout: action.payload }

    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload }

    case 'SET_RESULT':
      return {
        ...state,
        resultUrl: action.payload.resultUrl,
        layoutUrl: action.payload.layoutUrl || null,
        isGenerating: false,
      }

    case 'SET_WARNINGS':
      return { ...state, warnings: action.payload }

    default:
      return state
  }
}

// ============================================================================
// Canvas 工具函数
// ============================================================================

/** 将裁剪区域从原图映射到目标尺寸 */
function getCropParams(croppedAreaPixels, targetW, targetH) {
  return {
    cropX: croppedAreaPixels.x,
    cropY: croppedAreaPixels.y,
    cropW: croppedAreaPixels.width,
    cropH: croppedAreaPixels.height,
    targetW,
    targetH,
  }
}

/**
 * 从原图裁剪并缩放至目标尺寸
 * @returns HTMLCanvasElement
 */
async function cropImage(imageSrc, croppedAreaPixels, targetW, targetH) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = targetW
      canvas.height = targetH
      const ctx = canvas.getContext('2d')
      ctx.drawImage(
        img,
        croppedAreaPixels.x, croppedAreaPixels.y,
        croppedAreaPixels.width, croppedAreaPixels.height,
        0, 0, targetW, targetH
      )
      resolve(canvas)
    }
    img.onerror = reject
    img.src = imageSrc
  })
}

/**
 * 使用 @imgly/background-removal 在浏览器本地 AI 去背景
 * 优点：图片不上云、隐私安全、专门针对人像优化
 * @param {File} file - 原始图片文件
 * @returns {Promise<string>} - 透明背景图片的 blob URL
 */
async function removeBackground(file) {
  // 调用 imgly AI 去背景（浏览器内 ONNX 模型推理）
  const blob = await imglyRemoveBackground(file, {
    progress: (key, current, total) => {
      // 静默加载模型，不打扰用户
    },
  })
  return URL.createObjectURL(blob)
}

/**
 * 将已去背景的透明图裁剪到目标尺寸
 * @param {string} transparentUrl - 透明背景图 URL
 * @param {object} croppedAreaPixels - 裁剪区域（相对原图）
 * @param {number} imgWidth - 原图宽度
 * @param {number} imgHeight - 原图高度
 * @param {number} targetW - 目标宽度
 * @param {number} targetH - 目标高度
 * @returns {Promise<HTMLCanvasElement>} - 裁剪后的透明 canvas
 */
async function cropTransparentImage(transparentUrl, croppedAreaPixels, imgWidth, imgHeight, targetW, targetH) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = targetW
      canvas.height = targetH
      const ctx = canvas.getContext('2d')

      // 计算裁剪区域在透明图中的对应位置（透明图可能已被缩放）
      const scaleRatio = Math.max(img.width / imgWidth, img.height / imgHeight)
      const offsetX = (img.width - imgWidth * scaleRatio) / 2
      const offsetY = (img.height - imgHeight * scaleRatio) / 2

      const sx = offsetX + croppedAreaPixels.x * scaleRatio
      const sy = offsetY + croppedAreaPixels.y * scaleRatio
      const sw = croppedAreaPixels.width * scaleRatio
      const sh = croppedAreaPixels.height * scaleRatio

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH)
      resolve(canvas)
    }
    img.onerror = reject
    img.src = transparentUrl
  })
}

/**
 * 应用图像调整（亮度/对比度/锐化/磨皮）
 */
function applyAdjustments(canvas, { brightness, contrast, sharpen, smoothing }) {
  const ctx = canvas.getContext('2d')
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  // ---- 亮度 ----
  if (brightness !== 0) {
    const b = brightness * 2.55
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = Math.min(255, Math.max(0, data[i] + b))
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + b))
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + b))
    }
  }

  // ---- 对比度 ----
  if (contrast !== 0) {
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128))
      data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128))
      data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128))
    }
  }

  // ---- 磨皮（简单均值模糊模拟）----
  if (smoothing > 0) {
    const radius = Math.max(1, Math.ceil(smoothing / 25))
    const copy = new Uint8ClampedArray(data)
    const w = canvas.width, h = canvas.height
    for (let y = radius; y < h - radius; y++) {
      for (let x = radius; x < w - radius; x++) {
        let r = 0, g = 0, b = 0, count = 0
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const idx = ((y + dy) * w + (x + dx)) * 4
            r += copy[idx]
            g += copy[idx + 1]
            b += copy[idx + 2]
            count++
          }
        }
        const idx = (y * w + x) * 4
        const mix = smoothing / 100 // 混合比例
        data[idx]     = copy[idx]     * (1 - mix) + (r / count) * mix
        data[idx + 1] = copy[idx + 1] * (1 - mix) + (g / count) * mix
        data[idx + 2] = copy[idx + 2] * (1 - mix) + (b / count) * mix
      }
    }
  }

  // ---- 锐化（简单非锐化掩蔽模拟）----
  if (sharpen > 0) {
    const amount = sharpen / 100
    const copy = new Uint8ClampedArray(data)
    const w = canvas.width, h = canvas.height
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4
        for (let c = 0; c < 3; c++) {
          const center = copy[idx + c] * 5
          const neighbors =
            copy[((y - 1) * w + x) * 4 + c] +
            copy[((y + 1) * w + x) * 4 + c] +
            copy[(y * w + x - 1) * 4 + c] +
            copy[(y * w + x + 1) * 4 + c]
          const sharpened = center - neighbors
          data[idx + c] = Math.min(255, Math.max(0, copy[idx + c] + (sharpened - copy[idx + c]) * amount * 0.5))
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/**
 * 在裁剪图片上绘制背景色
 */
function drawWithBackground(canvas, bgColor) {
  const ctx = canvas.getContext('2d')
  const w = canvas.width, h = canvas.height

  // 获取当前像素数据
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  // 将接近透明的像素替换为背景色
  const bgR = parseInt(bgColor.slice(1, 3), 16)
  const bgG = parseInt(bgColor.slice(3, 5), 16)
  const bgB = parseInt(bgColor.slice(5, 7), 16)

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) {
      const alpha = 1 - data[i + 3] / 255
      data[i]     = Math.round(data[i] * (1 - alpha) + bgR * alpha)
      data[i + 1] = Math.round(data[i + 1] * (1 - alpha) + bgG * alpha)
      data[i + 2] = Math.round(data[i + 2] * (1 - alpha) + bgB * alpha)
      data[i + 3] = 255
    }
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/**
 * 生成排版打印画布（6寸/A4）
 */
function generateLayout(photoCanvas, layout, dpi = 300) {
  const { paperW, paperH, cols, rows } = layout
  const canvas = document.createElement('canvas')
  canvas.width = paperW
  canvas.height = paperH
  const ctx = canvas.getContext('2d')

  // 白色底
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, paperW, paperH)

  const photoW = photoCanvas.width
  const photoH = photoCanvas.height

  // 计算居中位置
  const totalW = cols * photoW + (cols - 1) * 20
  const totalH = rows * photoH + (rows - 1) * 20
  const offsetX = (paperW - totalW) / 2
  const offsetY = (paperH - totalH) / 2

  // 绘制照片
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * (photoW + 20)
      const y = offsetY + r * (photoH + 20)
      ctx.drawImage(photoCanvas, x, y, photoW, photoH)

      // 绘制虚线裁剪框
      ctx.save()
      ctx.strokeStyle = '#CCCCCC'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 4])
      ctx.strokeRect(x, y, photoW, photoH)
      ctx.restore()
    }
  }

  return canvas
}

// ============================================================================
// 人脸辅助线组件
// ============================================================================

function FaceGuides({ containerSize, crop, zoom }) {
  if (!containerSize.width) return null
  const { width, height } = containerSize
  // 眼睛线：距顶部约 38%
  const eyeY = height * 0.38
  // 头顶线：距顶部约 15%
  const topY = height * 0.15

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* 眼睛参考线 */}
      <div
        className="absolute left-0 right-0 border-t border-dashed border-yellow-400/50"
        style={{ top: eyeY }}
      />
      <div className="absolute left-2 text-[10px] text-yellow-400/70 font-mono" style={{ top: eyeY - 14 }}>
        👁 眼睛线
      </div>

      {/* 头顶参考线 */}
      <div
        className="absolute left-0 right-0 border-t border-dashed border-yellow-400/50"
        style={{ top: topY }}
      />
      <div className="absolute left-2 text-[10px] text-yellow-400/70 font-mono" style={{ top: topY - 14 }}>
        ↑ 头顶线
      </div>

      {/* 中线 */}
      <div className="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-yellow-400/30" />
    </div>
  )
}

// ============================================================================
// 警告提示组件
// ============================================================================

function WarningsPanel({ warnings }) {
  if (!warnings.length) return null
  return (
    <div className="mt-3 space-y-2">
      {warnings.map((w, i) => (
        <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
          w.type === 'error' ? 'bg-red-900/30 text-red-400' :
          w.type === 'warn'  ? 'bg-yellow-900/30 text-yellow-400' :
          'bg-blue-900/30 text-blue-400'
        }`}>
          <span>{w.type === 'error' ? '❌' : w.type === 'warn' ? '⚠️' : 'ℹ️'}</span>
          <span>{w.message}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// 滑块组件（复用）
// ============================================================================

function ParamSlider({ label, value, min = -100, max = 100, default: def = 0, onChange, unit = '' }) {
  const display = def === 0 ? value : value - def
  const displayText = display > 0 ? `+${display}` : `${display}`
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[#94A3B8] w-14 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="flex-1 h-1.5 bg-[#334155] rounded-lg appearance-none cursor-pointer accent-[#22C55E]"
      />
      <span className="text-xs text-[#94A3B8] w-10 text-right font-mono">{displayText}{unit}</span>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

function IdPhotoMaker() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const cropperRef = useRef(null)
  const containerRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const previewCanvasRef = useRef(null)

  // ---- 测量容器尺寸 ----
  useEffect(() => {
    if (!containerRef.current || !state.imageSrc) return
    const el = containerRef.current
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [state.imageSrc])

  // ---- 图片上传 ----
  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = async () => {
      dispatch({
        type: 'SET_IMAGE',
        payload: { file, url, size: { width: img.width, height: img.height } },
      })

      // 后台去背景，缓存透明图用于预览和生成
      try {
        dispatch({ type: 'SET_BG_PROGRESS', payload: 'AI 模型加载中（首次需下载约 30MB）...' })
        const transparentUrl = await removeBackground(file)
        dispatch({ type: 'SET_TRANSPARENT', payload: transparentUrl })
      } catch (err) {
        console.error('背景去除失败:', err)
        dispatch({ type: 'SET_BG_REMOVING', payload: false })
      }
    }
    img.src = url
  }, [])

  const handleDrop = useCallback((files) => {
    if (files && files.length > 0) handleFile(files[0])
  }, [handleFile])

  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  // ---- 裁剪完成回调 ----
  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    dispatch({ type: 'SET_CROPPED_AREA', payload: croppedAreaPixels })
  }, [])

  // ---- 规范检测 ----
  useEffect(() => {
    if (!state.imageSize || !state.croppedAreaPixels) {
      dispatch({ type: 'SET_WARNINGS', payload: [] })
      return
    }
    const { width: imgW, height: imgH } = state.imageSize
    const { width: cropW, height: cropH } = state.croppedAreaPixels

    const warns = []

    // 检测1：裁剪区域过小
    const ratio = Math.min(cropW / imgW, cropH / imgH)
    if (ratio < 0.2) {
      warns.push({ type: 'warn', message: '裁剪区域过小，可能影响证件照清晰度' })
    }

    // 检测2：原始图片分辨率不足
    const { pxW, pxH } = state.selectedSize
    if (imgW < pxW || imgH < pxH) {
      warns.push({ type: 'error', message: `图片分辨率不足，需要至少 ${pxW}×${pxH}px` })
    }

    // 检测3：人像可能偏移（裁剪区域中心与图片中心偏差过大）
    const imgCenterX = imgW / 2
    const cropCenterX = state.croppedAreaPixels.x + cropW / 2
    const offset = Math.abs(cropCenterX - imgCenterX) / imgW
    if (offset > 0.3) {
      warns.push({ type: 'warn', message: '人像可能偏离中心，建议调整' })
    }

    dispatch({ type: 'SET_WARNINGS', payload: warns })
  }, [state.imageSize, state.croppedAreaPixels, state.selectedSize])

  // ---- 实时预览 ----
  useEffect(() => {
    if (!state.imageSrc || !state.croppedAreaPixels) return

    let cancelled = false
    const { pxW, pxH } = state.selectedSize
    const activeBg = state.useCustomColor ? state.customColor : state.bgColor

    ;(async () => {
      try {
        let canvas
        if (state.bgMode === 'ai' && state.transparentUrl && state.imageSize) {
          // AI 模式：用去背景的透明图裁剪 + 绘制背景色
          canvas = await cropTransparentImage(
            state.transparentUrl,
            state.croppedAreaPixels,
            state.imageSize.width,
            state.imageSize.height,
            pxW,
            pxH
          )
          if (cancelled) return
          applyAdjustments(canvas, {
            brightness: state.brightness,
            contrast: state.contrast,
            sharpen: state.sharpen,
            smoothing: state.smoothing,
          })
          if (cancelled) return
          drawWithBackground(canvas, activeBg)
        } else {
          // 简单模式：直接裁剪（背景色不生效，仅展示裁剪结果）
          canvas = await cropImage(state.imageSrc, state.croppedAreaPixels, pxW, pxH)
          if (cancelled) return
          applyAdjustments(canvas, {
            brightness: state.brightness,
            contrast: state.contrast,
            sharpen: state.sharpen,
            smoothing: state.smoothing,
          })
        }
        if (cancelled) return

        // 更新预览 canvas
        const previewCanvas = previewCanvasRef.current
        if (previewCanvas) {
          const pCtx = previewCanvas.getContext('2d')
          previewCanvas.width = pxW
          previewCanvas.height = pxH
          pCtx.clearRect(0, 0, pxW, pxH)
          pCtx.drawImage(canvas, 0, 0)
        }
      } catch (err) {
        console.error('Preview render error:', err)
      }
    })()

    return () => { cancelled = true }
  }, [
    state.imageSrc, state.transparentUrl, state.imageSize,
    state.croppedAreaPixels, state.selectedSize, state.bgMode,
    state.bgColor, state.customColor, state.useCustomColor,
    state.brightness, state.contrast, state.sharpen, state.smoothing,
  ])

  // ---- 一键生成 ----
  const handleGenerate = useCallback(async () => {
    if (!state.imageSrc || !state.croppedAreaPixels) return

    dispatch({ type: 'SET_GENERATING', payload: true })
    const { pxW, pxH } = state.selectedSize
    const activeBg = state.useCustomColor ? state.customColor : state.bgColor

    try {
      let photoCanvas

      if (state.bgMode === 'ai') {
        // AI 抠图模式：使用去背景透明图
        if (state.transparentUrl && state.imageSize) {
          photoCanvas = await cropTransparentImage(
            state.transparentUrl,
            state.croppedAreaPixels,
            state.imageSize.width,
            state.imageSize.height,
            pxW,
            pxH
          )
        } else {
          // 去背景还未完成，实时做一次
          dispatch({ type: 'SET_BG_PROGRESS', payload: 'AI 正在抠图中...' })
          const transparentUrl = await removeBackground(state.imageFile)
          photoCanvas = await cropTransparentImage(
            transparentUrl,
            state.croppedAreaPixels,
            state.imageSize?.width || 1,
            state.imageSize?.height || 1,
            pxW,
            pxH
          )
        }
        // 应用调整参数
        applyAdjustments(photoCanvas, {
          brightness: state.brightness,
          contrast: state.contrast,
          sharpen: state.sharpen,
          smoothing: state.smoothing,
        })
        // 绘制背景色（透明区域替换为背景色）
        drawWithBackground(photoCanvas, activeBg)
      } else {
        // 简单模式：直接裁剪 + 背景色覆盖（适合已有证件照）
        photoCanvas = document.createElement('canvas')
        photoCanvas.width = pxW
        photoCanvas.height = pxH
        const ctx = photoCanvas.getContext('2d')

        // 1. 先画背景色
        ctx.fillStyle = activeBg
        ctx.fillRect(0, 0, pxW, pxH)

        // 2. 裁剪图片并居中覆盖
        const srcImg = new Image()
        srcImg.src = state.imageSrc
        await new Promise((r, j) => { srcImg.onload = r; srcImg.onerror = j })

        const scaleX = pxW / srcImg.width
        const scaleY = pxH / srcImg.height
        const scale = Math.max(scaleX, scaleY)
        const drawW = srcImg.width * scale
        const drawH = srcImg.height * scale
        const dx = (pxW - drawW) / 2
        const dy = (pxH - drawH) / 2

        ctx.drawImage(srcImg, dx, dy, drawW, drawH)

        // 3. 应用调整参数
        applyAdjustments(photoCanvas, {
          brightness: state.brightness,
          contrast: state.contrast,
          sharpen: state.sharpen,
          smoothing: state.smoothing,
        })
      }

      const resultUrl = photoCanvas.toDataURL('image/png')

      // 4. 生成排版
      const layoutCanvas = generateLayout(photoCanvas, state.layout)
      const layoutUrl = layoutCanvas.toDataURL('image/jpeg', 0.92)

      dispatch({ type: 'SET_RESULT', payload: { resultUrl, layoutUrl } })
    } catch (err) {
      console.error('Generate error:', err)
      alert('生成失败，请重试')
      dispatch({ type: 'SET_GENERATING', payload: false })
    }
  }, [state.imageSrc, state.imageFile, state.imageSize, state.transparentUrl, state.croppedAreaPixels, state.selectedSize, state.bgMode, state.bgColor, state.customColor, state.useCustomColor, state.brightness, state.contrast, state.sharpen, state.smoothing, state.layout])

  // ---- 下载 ----
  const downloadPhoto = useCallback((hd = false) => {
    if (!state.resultUrl) return
    const link = document.createElement('a')
    link.download = hd ? '证件照_高清.png' : '证件照.png'

    if (hd) {
      // 高清导出：2倍放大
      const img = new Image()
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = img.width * 2
        c.height = img.height * 2
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0, c.width, c.height)
        link.href = c.toDataURL('image/png')
        link.click()
      }
      img.src = state.resultUrl
    } else {
      link.href = state.resultUrl
      link.click()
    }
  }, [state.resultUrl])

  const downloadLayout = useCallback(() => {
    if (!state.layoutUrl) return
    const link = document.createElement('a')
    link.href = state.layoutUrl
    link.download = `证件照排版_${state.layout.name}.jpg`
    link.click()
  }, [state.layoutUrl, state.layout.name])

  // ---- 批量处理（结构预留）----
  const [batchFiles, setBatchFiles] = useState([])
  const [batchResults, setBatchResults] = useState([])
  const [showBatch, setShowBatch] = useState(false)

  const handleBatchDrop = useCallback((files) => {
    const validFiles = (files || []).filter(f => f.type.startsWith('image/'))
    setBatchFiles(prev => [...prev, ...validFiles])
  }, [])

  const processBatch = useCallback(async () => {
    if (!batchFiles.length) return
    const results = []
    for (const file of batchFiles) {
      // 预留：对每个文件执行同样的生成流程
      const url = URL.createObjectURL(file)
      results.push({ name: file.name, url, status: 'pending' })
    }
    setBatchResults(results)
    // 实际处理逻辑可在此扩展
  }, [batchFiles])

  const aspect = state.selectedSize.pxW / state.selectedSize.pxH

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 返回链接 */}
      <Link to="/" className="inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] mb-6 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        返回首页
      </Link>

      {/* 标题 */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">证件照制作</h1>
        <p className="text-[#94A3B8]">上传照片 → 裁剪调整 → 一键生成 → 下载打印</p>
      </div>

      {/* ---- 未上传图片：显示上传区域 ---- */}
      {!state.imageSrc && (
        <div className="max-w-2xl mx-auto">
          <div
            className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
              border-[#475569] bg-[#1E293B]/40 hover:border-[#22C55E] hover:bg-[#1E293B]/60"
            onClick={() => document.getElementById('id-photo-upload')?.click()}
            onDragOver={e => { e.preventDefault() }}
            onDrop={e => { e.preventDefault(); handleDrop(Array.from(e.dataTransfer.files)) }}
          >
            <input
              id="id-photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
            <div className="text-6xl mb-4">📷</div>
            <p className="text-xl font-medium text-[#F8FAFC] mb-2">拖拽图片到这里</p>
            <p className="text-[#94A3B8] mb-4">或点击选择文件</p>
            <span className="inline-block px-6 py-2 bg-[#22C55E] text-[#0F172A] font-medium rounded-lg">
              选择图片
            </span>
            <p className="text-[#64748B] text-xs mt-4">支持 JPG, PNG, WebP 等格式（最大 25MB）</p>
          </div>
        </div>
      )}

      {/* ---- 已上传图片：主工作区 ---- */}
      {state.imageSrc && (
        <>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* ====== 左侧控制面板 (320px) ====== */}
            <aside className="w-full lg:w-80 shrink-0 space-y-4">

              {/* 1. 图片上传 */}
              <section className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4">
                <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2">
                  📁 图片来源
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => document.getElementById('id-photo-reupload')?.click()}
                    className="flex-1 px-3 py-2 bg-[#334155] text-[#F8FAFC] text-sm rounded-lg hover:bg-[#475569] transition-colors"
                  >
                    重新上传
                  </button>
                  <input
                    id="id-photo-reupload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                  <button
                    onClick={() => dispatch({ type: 'RESET' })}
                    className="px-3 py-2 bg-red-900/30 text-red-400 text-sm rounded-lg hover:bg-red-900/50 transition-colors"
                  >
                    重置
                  </button>
                </div>
              </section>

              {/* 2. 换底模式 + 背景设置 */}
              <section className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4">
                <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2">
                  🎨 换底模式
                </h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => dispatch({ type: 'SET_BG_MODE', payload: 'ai' })}
                    className={`p-2 rounded-lg border transition-all text-xs ${
                      state.bgMode === 'ai'
                        ? 'bg-[#22C55E]/15 border-[#22C55E]'
                        : 'bg-[#334155]/50 border-[#475569]'
                    }`}
                  >
                    <div className="font-medium text-[#F8FAFC]">🤖 AI抠图换底</div>
                    <div className="text-[10px] text-[#94A3B8]">自动识别人像，效果最佳</div>
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'SET_BG_MODE', payload: 'simple' })}
                    className={`p-2 rounded-lg border transition-all text-xs ${
                      state.bgMode === 'simple'
                        ? 'bg-[#22C55E]/15 border-[#22C55E]'
                        : 'bg-[#334155]/50 border-[#475569]'
                    }`}
                  >
                    <div className="font-medium text-[#F8FAFC]">⚡ 直接替换</div>
                    <div className="text-[10px] text-[#94A3B8]">适合已有证件照</div>
                  </button>
                </div>
                <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2">
                  🎨 背景颜色
                </h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {BG_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => dispatch({ type: 'SET_BG_COLOR', payload: c.value })}
                      className={`p-2 rounded-lg border transition-all text-xs ${
                        !state.useCustomColor && state.bgColor === c.value
                          ? 'border-[#22C55E]' : 'border-[#475569]'
                      }`}
                    >
                      <div
                        className="w-8 h-6 rounded mx-auto mb-1 border border-gray-600"
                        style={{ backgroundColor: c.value }}
                      />
                      <span className="text-[#94A3B8]">{c.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[#94A3B8]">自定义</label>
                  <input
                    type="color"
                    value={state.customColor}
                    onChange={e => dispatch({ type: 'SET_CUSTOM_COLOR', payload: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={state.customColor}
                    onChange={e => dispatch({ type: 'SET_CUSTOM_COLOR', payload: e.target.value })}
                    className="flex-1 px-2 py-1 bg-[#334155] border border-[#475569] rounded text-[#F8FAFC] text-xs font-mono"
                    placeholder="#000000"
                  />
                </div>
              </section>

              {/* 3. 尺寸选择 */}
              <section className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4">
                <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2">
                  📐 证件照尺寸
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {SIZE_PRESETS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => dispatch({ type: 'SET_SIZE', payload: s })}
                      className={`p-2 rounded-lg border transition-all text-left ${
                        state.selectedSize.id === s.id
                          ? 'bg-[#22C55E]/15 border-[#22C55E]'
                          : 'bg-[#334155]/50 border-[#475569] hover:border-[#64748B]'
                      }`}
                    >
                      <div className="text-sm font-medium text-[#F8FAFC]">{s.name}</div>
                      <div className="text-[10px] text-[#94A3B8]">{s.mm} · {s.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-[#64748B]">
                  当前：{state.selectedSize.name} ({state.selectedSize.mm}) {state.selectedSize.pxW}×{state.selectedSize.pxH}px
                </div>
              </section>

              {/* 4. 人像调整 */}
              <section className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4">
                <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2">
                  🖌️ 人像调整
                </h3>
                <div className="space-y-3">
                  <ParamSlider
                    label="亮度"
                    value={state.brightness}
                    onChange={v => dispatch({ type: 'SET_ADJUST', payload: { brightness: v } })}
                  />
                  <ParamSlider
                    label="对比度"
                    value={state.contrast}
                    onChange={v => dispatch({ type: 'SET_ADJUST', payload: { contrast: v } })}
                  />
                  <ParamSlider
                    label="磨皮"
                    value={state.smoothing}
                    min={0}
                    max={100}
                    onChange={v => dispatch({ type: 'SET_ADJUST', payload: { smoothing: v } })}
                  />
                  <ParamSlider
                    label="锐化"
                    value={state.sharpen}
                    min={0}
                    max={100}
                    onChange={v => dispatch({ type: 'SET_ADJUST', payload: { sharpen: v } })}
                  />
                </div>
              </section>

              {/* 5. 排版设置 */}
              <section className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4">
                <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2">
                  🖨️ 排版打印
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {LAYOUT_PRESETS.map(l => (
                    <button
                      key={l.id}
                      onClick={() => dispatch({ type: 'SET_LAYOUT', payload: l })}
                      className={`p-2 rounded-lg border transition-all text-center ${
                        state.layout.id === l.id
                          ? 'bg-[#22C55E]/15 border-[#22C55E]'
                          : 'bg-[#334155]/50 border-[#475569]'
                      }`}
                    >
                      <div className="text-xs font-medium text-[#F8FAFC]">{l.name}</div>
                      <div className="text-[10px] text-[#94A3B8]">{l.desc}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* 6. 一键生成 */}
              <button
                onClick={handleGenerate}
                disabled={state.isGenerating || !state.croppedAreaPixels}
                className="w-full py-3 bg-[#22C55E] text-[#0F172A] font-bold rounded-xl
                  hover:bg-[#16A34A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  text-lg shadow-lg shadow-green-500/20"
              >
                {state.isGenerating ? '⏳ 生成中...' : '🚀 一键生成证件照'}
              </button>

              {/* 12. 批量处理入口 */}
              <button
                onClick={() => setShowBatch(!showBatch)}
                className="w-full py-2 bg-[#334155] text-[#94A3B8] text-sm rounded-lg
                  hover:bg-[#475569] hover:text-[#F8FAFC] transition-colors"
              >
                {showBatch ? '收起批量' : '📦 批量处理'}
              </button>

              {showBatch && (
                <section className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4">
                  <div
                    className="border-2 border-dashed border-[#475569] rounded-lg p-6 text-center cursor-pointer
                      hover:border-[#22C55E] transition-colors"
                    onClick={() => document.getElementById('batch-upload')?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleBatchDrop(Array.from(e.dataTransfer.files)) }}
                  >
                    <input
                      id="batch-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => handleBatchDrop(Array.from(e.target.files))}
                    />
                    <p className="text-sm text-[#94A3B8]">拖拽或点击添加多张照片</p>
                    <p className="text-xs text-[#64748B] mt-1">已添加 {batchFiles.length} 张</p>
                  </div>
                  {batchFiles.length > 0 && (
                    <button
                      onClick={processBatch}
                      className="mt-3 w-full py-2 bg-[#3B82F6] text-white text-sm rounded-lg hover:bg-[#2563EB] transition-colors"
                    >
                      开始批量处理
                    </button>
                  )}
                  {batchResults.length > 0 && (
                    <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                      {batchResults.map((r, i) => (
                        <div key={i} className="flex items-center justify-between bg-[#334155] rounded px-2 py-1">
                          <span className="text-xs text-[#F8FAFC] truncate">{r.name}</span>
                          <span className="text-[10px] text-yellow-400">{r.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* 警告提示 */}
              <WarningsPanel warnings={state.warnings} />
            </aside>

            {/* ====== 右侧预览区域 ====== */}
            <main className="flex-1 min-w-0">
              <div className="bg-[#1E293B]/70 backdrop-blur-sm rounded-xl border border-[#475569] p-4 h-full">
                <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center justify-between">
                  <span>👁️ 实时预览</span>
                  <span className="text-xs text-[#94A3B8] font-normal">
                    {state.selectedSize.name} · {state.selectedSize.mm}
                  </span>
                </h3>

                {/* 裁剪预览区 */}
                <div
                  ref={containerRef}
                  className="relative bg-[#0F172A] rounded-lg overflow-hidden"
                  style={{ minHeight: 400, maxHeight: '70vh' }}
                >
                  <Cropper
                    image={state.imageSrc}
                    crop={state.crop}
                    zoom={state.zoom}
                    aspect={aspect}
                    onCropChange={crop => dispatch({ type: 'SET_CROP', payload: crop })}
                    onZoomChange={zoom => dispatch({ type: 'SET_ZOOM', payload: zoom })}
                    onCropComplete={onCropComplete}
                    cropShape="rect"
                    showGrid={false}
                    zoomSpeed={0.1}
                    minZoom={0.5}
                    maxZoom={3}
                  />

                  {/* 人脸辅助线 */}
                  <FaceGuides containerSize={containerSize} crop={state.crop} zoom={state.zoom} />
                </div>

                {/* 去背景状态 */}
                {state.bgProgress && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-900/30 rounded-lg text-sm text-blue-400">
                    <span className="animate-spin">⏳</span>
                    <span>{state.bgProgress}</span>
                  </div>
                )}
                {state.transparentUrl && state.bgMode === 'ai' && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-900/30 rounded-lg text-sm text-green-400">
                    ✅ <span>AI 抠图完成，切换颜色实时预览</span>
                  </div>
                )}
                {state.bgMode === 'simple' && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-yellow-900/30 rounded-lg text-sm text-yellow-400">
                    ℹ️ <span>简单模式：直接裁剪覆盖，适合已有证件照</span>
                  </div>
                )}

                {/* 裁剪结果预览 */}
                {state.croppedAreaPixels && (
                  <div className="mt-4 flex items-center justify-center gap-6">
                    <div className="text-center">
                      <div className="text-xs text-[#94A3B8] mb-2">裁剪结果预览</div>
                      <canvas
                        ref={previewCanvasRef}
                        className="rounded-lg shadow-lg border border-[#475569]"
                        style={{ maxWidth: 200, maxHeight: 280 }}
                      />
                    </div>
                  </div>
                )}

                {/* 生成结果 */}
                {state.resultUrl && (
                  <div className="mt-6 space-y-4">
                    <h4 className="text-sm font-semibold text-[#F8FAFC]">✅ 生成结果</h4>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="text-center flex-1">
                        <div className="text-xs text-[#94A3B8] mb-2">证件照</div>
                        <img
                          src={state.resultUrl}
                          alt="证件照结果"
                          className="mx-auto rounded-lg shadow-lg border border-[#475569]"
                          style={{ maxWidth: 180 }}
                        />
                      </div>
                      {state.layoutUrl && (
                        <div className="text-center flex-1">
                          <div className="text-xs text-[#94A3B8] mb-2">{state.layout.name}排版</div>
                          <img
                            src={state.layoutUrl}
                            alt="排版结果"
                            className="mx-auto rounded-lg shadow-lg border border-[#475569]"
                            style={{ maxWidth: 300 }}
                          />
                        </div>
                      )}
                    </div>

                    {/* 底部操作区：下载按钮 */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={() => downloadPhoto(false)}
                        className="flex-1 py-3 bg-[#3B82F6] text-white font-semibold rounded-xl
                          hover:bg-[#2563EB] transition-colors shadow-lg shadow-blue-500/20"
                      >
                        📥 下载证件照
                      </button>
                      <button
                        onClick={() => downloadPhoto(true)}
                        className="flex-1 py-3 bg-[#8B5CF6] text-white font-semibold rounded-xl
                          hover:bg-[#7C3AED] transition-colors shadow-lg shadow-purple-500/20"
                      >
                        📥 高清下载 (2x)
                      </button>
                      {state.layoutUrl && (
                        <button
                          onClick={downloadLayout}
                          className="flex-1 py-3 bg-[#F59E0B] text-white font-semibold rounded-xl
                            hover:bg-[#D97706] transition-colors shadow-lg shadow-amber-500/20"
                        >
                          🖨️ 下载排版图
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        </>
      )}
    </div>
  )
}

export default IdPhotoMaker

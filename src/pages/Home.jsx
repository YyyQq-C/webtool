import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const tools = [
  {
    id: 'image-converter',
    name: '图片格式转换',
    description: '支持拖拽上传，批量转换图片格式，打包下载',
    icon: '/image-cover.png',
    path: '/image-converter',
    iconBg: 'bg-[#3b82f6]',
    localOnly: true,
  },
  {
    id: 'image-to-pdf',
    name: '图片转PDF',
    description: '多张图片合并为PDF，拖拽排序，一键生成',
    icon: '/image-pdf.png',
    path: '/image-to-pdf',
    iconBg: 'bg-[#22c55e]',
    localOnly: true,
  },
  {
    id: 'id-photo-maker',
    name: '证件照制作',
    description: '裁剪、换底、美颜、排版打印，一站式证件照生成',
    icon: null,
    emoji: '📷',
    path: '/id-photo-maker',
    iconBg: 'bg-gradient-to-br from-[#ec4899] to-[#8b5cf6]',
    localOnly: true,
    badge: 'NEW',
  },
  {
    id: 'image-cropper',
    name: '图片裁剪',
    description: '自由裁剪、比例裁剪、旋转图片',
    icon: "/image_cut.png",
    path: '/image-cropper',
    iconBg: 'bg-[#f97316]',
    localOnly: true,
  },
  {
    id: 'image-splice',
    name: '图片拼接',
    description: '多张图片横向、纵向、网格拼接成一张',
    icon: null,
    emoji: '🧩',
    path: '/image-splice',
    iconBg: 'bg-[#8b5cf6]',
    localOnly: true,
  },
  {
    id: 'image-watermark',
    name: '图片加水印',
    description: '添加文字或图片水印，位置透明度可调',
    icon: null,
    emoji: '🏷️',
    path: '/image-watermark',
    iconBg: 'bg-[#f59e0b]',
    localOnly: true,
  },
  {
    id: 'image-shape',
    name: '形状裁切',
    description: '圆形、圆角矩形、爱心、星形裁切',
    icon: null,
    emoji: '✨',
    path: '/image-shape',
    iconBg: 'bg-[#ec4899]',
    localOnly: true,
  },
  {
    id: 'gif-extractor',
    name: 'GIF 分帧提取',
    description: '将 GIF 动图拆分为单帧图片下载',
    icon: null,
    emoji: '🎬',
    path: '/gif-extractor',
    iconBg: 'bg-[#8b5cf6]',
    localOnly: true,
  },
  {
    id: 'qr-code',
    name: '二维码工具',
    description: '生成二维码或解析图片中二维码',
    icon: null,
    emoji: '📱',
    path: '/qr-code',
    iconBg: 'bg-[#14b8a6]',
    localOnly: true,
  },
  {
    id: 'image-compress',
    name: '图片压缩',
    description: '实时预览压缩效果，调整质量下载',
    icon: null,
    emoji: '📦',
    path: '/image-compress',
    iconBg: 'bg-[#84cc16]',
    localOnly: true,
  },
  {
    id: 'image-compare',
    name: '图片相似度',
    description: '对比两张图片相似程度，返回评分',
    icon: null,
    emoji: '🔍',
    path: '/image-compare',
    iconBg: 'bg-[#0ea5e9]',
    localOnly: false,
  },
  {
    id: 'web-to-pdf',
    name: '网页转PDF',
    description: '输入网址，将整个页面或页面图片导出为PDF',
    icon: "/pdf_dump.png",
    path: '/web-to-pdf',
    iconBg: 'bg-[#8b5cf6]',
    localOnly: false,
  },
  {
    id: 'pdf-to-word',
    name: 'PDF转Word',
    description: 'PDF文档转换为Word格式，支持批量处理',
    icon: null,
    emoji: '📝',
    path: '/pdf-to-word',
    iconBg: 'bg-[#6366f1]',
    localOnly: false,
  },
  {
    id: 'image-bg-remover',
    name: '图片去背景',
    description: 'AI智能去除图片背景，支持预览和下载PNG',
    icon: "/remove_bg.png",
    path: '/image-bg-remover',
    iconBg: 'bg-[#22c55e]',
    localOnly: false,
  },
  {
    id: 'image-watermark-remover',
    name: '图片去水印',
    description: '用画笔标记水印区域，AI智能去除',
    icon: "/water_remove.png",
    path: '/image-watermark-remover',
    iconBg: 'bg-[#06b6d4]',
    localOnly: false,
  },
  {
    id: 'image-resizer',
    name: '分辨率调整',
    description: '批量修改图片宽高，支持等比例缩放',
    icon: "/resolution_ratio.png",
    path: '/image-resizer',
    iconBg: 'bg-[#ec4899]',
    localOnly: true,
 },
  // 图片切图/转换
  {
    id: 'image-grid-cut',
    name: '九宫格切图',
    description: '将图片切分为多张，适合朋友圈分享',
    icon: null,
    emoji: '🔲',
    path: '/image-grid-cut',
    iconBg: 'bg-[#10b981]',
    localOnly: true,
  },
  {
    id: 'image-to-excel',
    name: '图片转Excel',
    description: '识别图片表格内容，生成可编辑Excel',
    icon: null,
    emoji: '📊',
    path: '/image-to-excel',
    iconBg: 'bg-[#3b82f6]',
    localOnly: false,
  },
  {
    id: 'image-to-word',
    name: '图片转Word',
    description: '识别图片文字内容，生成可编辑Word',
    icon: null,
    emoji: '📝',
    path: '/image-to-word',
    iconBg: 'bg-[#64748b]',
    localOnly: false,
  },
  // 图片编辑（合并：增强 + 标注）
  {
    id: 'image-editor',
    name: '图片编辑',
    description: '边框、圆角、阴影、滤镜 + 文字、箭头、框选标注',
    icon: null,
    emoji: '🎨',
    path: '/image-editor',
    iconBg: 'bg-gradient-to-br from-[#f59e0b] to-[#ef4444]',
    localOnly: true,
    badge: '2合1',
  },
]

function Home() {
  const [stats, setStats] = useState({ visits: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      const CACHE_KEY = 'webtool_stats_cache'
      const ONE_HOUR = 60 * 60 * 1000
      const now = Date.now()

      // 1. 先尝试从本地读取缓存
      const cached = localStorage.getItem(CACHE_KEY)
      let cachedData = null
      if (cached) {
        try {
          cachedData = JSON.parse(cached)
          // 如果缓存有数据且 visits > 0，先显示缓存值
          if (cachedData.visits > 0) {
            setStats({ visits: cachedData.visits })
          }
        } catch (e) {
          console.error('Stats cache parse error')
          cachedData = null
        }
      }

      // 2. 检查是否需要向服务器请求
      // 条件：缓存不存在 || 缓存的visits为0 || 超过1小时
      const needsRequest = !cachedData || cachedData.visits === 0 || (now - cachedData.timestamp > ONE_HOUR)

      if (needsRequest) {
        try {
          // 首次访问或缓存过期时，请求服务器并计数
          const res = await fetch('/bg-api/api/stats?increment=true')
          if (res.ok) {
            const data = await res.json()
            setStats(data)
            // 更新本地缓存
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              visits: data.visits,
              timestamp: now
            }))
          }
        } catch (err) {
          console.error('Failed to fetch stats:', err)
          // 如果请求失败但缓存有值，继续显示缓存
          if (cachedData && cachedData.visits > 0) {
            setStats({ visits: cachedData.visits })
          }
        }
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="container mx-auto px-4 py-12 flex flex-col xl:flex-row items-center xl:items-start gap-12">
      {/* 顶部/左侧图标 */}
      <div className="xl:flex-shrink-0 xl:sticky xl:top-12 flex flex-col items-center">
        <Link to="/" className="hover:opacity-80 transition-opacity mb-4">
          <img src="/tool-logo.png" alt="蓝胖子的口袋" className="w-32 h-32 md:w-36 md:h-36 xl:w-44 xl:h-44 object-contain shadow-2xl rounded-3xl" />
        </Link>
        <div className="flex items-center gap-3 bg-[#1E293B]/40 px-4 py-2 rounded-full border border-[#334155] backdrop-blur-md">
          <h2 className="text-[#F8FAFC] font-bold tracking-wider text-sm">蓝胖子的工具</h2>
          <div className="h-3 w-[1px] bg-[#334155]"></div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"></span>
            <span className="text-[#94A3B8] font-mono text-xs font-bold">{"累计访问: " + stats.visits.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex-grow w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              to={tool.path}
              className="group block"
            >
              <article className="bg-[#1E293B]/60 backdrop-blur-sm border border-[#475569] rounded-xl p-6 flex flex-col justify-between hover:border-[#22C55E] transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
                <div>
                  <div className="flex items-start space-x-4 mb-4">
                    <div className={`rounded-xl w-12 h-12 flex items-center justify-center shadow-lg ${tool.iconBg || 'bg-[#f97316]'}`}>
                      {tool.icon ? (
                        <img src={tool.icon} alt="" className="w-7 h-7 object-contain brightness-0 invert" />
                      ) : (
                        <span className="text-white text-2xl">{tool.emoji}</span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold mt-1 text-white group-hover:text-[#22C55E] transition-colors">
                      {tool.name}
                    </h2>
                  </div>
                  <p className="text-[#9CA3AF] text-sm leading-relaxed mb-8">
                    {tool.description}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {tool.localOnly ? (
                      <span className="text-xs font-medium text-white bg-[#1a7332] px-2 py-1 rounded border border-[#2ea043]">无损本地</span>
                    ) : (
                      <span className="text-xs font-medium text-[#9CA3AF] bg-[#374151] px-2 py-1 rounded">云端处理</span>
                    )}
                    {tool.badge && (
                      <span className="text-xs font-medium text-white bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] px-2 py-1 rounded">{tool.badge}</span>
                    )}
                  </div>
                  <span className="text-blue-400 text-sm flex items-center">
                    开始使用 <span className="ml-1 group-hover:translate-x-1 inline-block transition-transform">→</span>
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Home
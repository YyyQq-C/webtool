import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const tools = [
  {
    id: 'image-converter',
    name: '图片格式转换',
    description: '支持拖拽上传，批量转换图片格式，打包下载',
    icon: '/image-cover.png',
    path: '/image-converter',
    color: 'from-blue-500 to-purple-600',
    localOnly: true, // 浏览器本地处理
  },
  {
    id: 'image-to-pdf',
    name: '图片转PDF',
    description: '多张图片合并为PDF，拖拽排序，一键生成',
    icon: '/image-pdf.png',
    path: '/image-to-pdf',
    color: 'from-green-500 to-teal-600',
    localOnly: true, // 浏览器本地处理
  },
  {
    id: 'image-cropper',
    name: '图片裁剪',
    description: '自由裁剪、比例裁剪、旋转图片',
    icon: "/image_cut.png",
    path: '/image-cropper',
    color: 'from-orange-500 to-red-600',
    localOnly: true,
  },
  {
    id: 'web-to-pdf',
    name: '网页转PDF',
    description: '输入网址，将整个页面或页面图片导出为PDF',
    icon: "/pdf_dump.png",
    path: '/web-to-pdf',
    color: 'from-purple-500 to-blue-600',
    localOnly: false, // 需要服务器处理
  },
  {
    id: 'image-bg-remover',
    name: '图片去背景',
    description: 'AI智能去除图片背景，支持预览和下载PNG',
    icon: "/remove_bg.png",
    path: '/image-bg-remover',
    color: 'from-green-500 to-teal-600',
    localOnly: false, // 需要服务器处理
  },
  {
    id: 'image-watermark-remover',
    name: '图片去水印',
    description: '用画笔标记水印区域，AI智能去除',
    icon: "/water_remove.png",
    path: '/image-watermark-remover',
    color: 'from-cyan-500 to-blue-600',
    localOnly: false, // 需要服务器处理
  },
  {
    id: 'image-resizer',
    name: '分辨率调整',
    description: '批量修改图片宽高，支持等比例缩放',
    icon: "/resolution_ratio.png",
    path: '/image-resizer',
    color: 'from-pink-500 to-rose-600',
    localOnly: true,
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
              <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 hover:bg-[#1E293B]/80 transition-all duration-300 border border-[#475569] hover:border-[#22C55E] hover:shadow-2xl hover:shadow-green-500/20 transform hover:-translate-y-1 h-auto min-h-[220px] flex flex-col relative overflow-hidden">
                {/* 背景装饰 */}
                <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${tool.color} opacity-10 blur-2xl rounded-full group-hover:opacity-20 transition-opacity`}></div>

                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-2xl shadow-lg`}>
                    {tool.icon ? (
                      // brightness-0 invert
                      <img src={tool.icon} alt="" className="w-8 h-8 object-contain brightness-0 invert" />
                    ) : (
                      <span>{tool.emoji}</span>
                    )}
                  </div>
                  {tool.localOnly && (
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-[#22C55E] bg-[#22C55E]/10 px-2 py-1 rounded-md">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <span>无损本地</span>
                    </div>
                  )}
                </div>

                {/* 标题 */}
                <h3 className="text-xl font-bold text-[#F8FAFC] mb-2 group-hover:text-[#22C55E] transition-colors">
                  {tool.name}
                </h3>

                {/* 描述 */}
                <p className="text-[#94A3B8] text-sm leading-relaxed mb-4">
                  {tool.description}
                </p>

                {/* 底部箭头 */}
                <div className="mt-auto pt-4 flex items-center text-[#22C55E] group-hover:text-[#10B981]">
                  <span>开始使用</span>
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Home
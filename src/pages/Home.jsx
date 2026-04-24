import { Link } from 'react-router-dom'
import { useState } from 'react'

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
    icon: '/jpg2pdf.png',
    path: '/image-to-pdf',
    color: 'from-green-500 to-teal-600',
    localOnly: true, // 浏览器本地处理
  },
  {
    id: 'web-to-pdf',
    name: '网页转PDF',
    description: '输入网址，将整个页面或页面图片导出为PDF',
    icon: null,
    emoji: '🌐',
    path: '/web-to-pdf',
    color: 'from-purple-500 to-blue-600',
    localOnly: false, // 需要服务器处理
  },
  {
    id: 'image-bg-remover',
    name: '图片去背景',
    description: 'AI智能去除图片背景，支持预览和下载PNG',
    icon: null,
    emoji: '✂️',
    path: '/image-bg-remover',
    color: 'from-green-500 to-teal-600',
    localOnly: false, // 需要服务器处理
  },
  {
    id: 'image-watermark-remover',
    name: '图片去水印',
    description: '用画笔标记水印区域，AI智能去除',
    icon: null,
    emoji: '💧',
    path: '/image-watermark-remover',
    color: 'from-cyan-500 to-blue-600',
    localOnly: false, // 需要服务器处理
  },
]

function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* 顶部图标 */}
      <div className="flex justify-center md:justify-start mb-8 md:mb-12">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <img src="/tool-logo.png" alt="蓝胖子的口袋" className="w-40 md:w-56 h-auto object-contain" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            to={tool.path}
            className="group block"
          >
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 hover:bg-[#1E293B]/80 transition-all duration-300 border border-[#475569] hover:border-[#22C55E] hover:shadow-2xl hover:shadow-green-500/20 transform hover:-translate-y-1 h-[200px] flex flex-col">
              {/* 标题 */}
              <h3 className="text-xl font-semibold text-[#F8FAFC] mb-2 line-clamp-1 flex-shrink-0">
                {tool.name}
              </h3>

              {/* 描述 */}
              <p className="text-[#94A3B8] text-sm line-clamp-2 flex-shrink-0">
                {tool.description}
              </p>

              {/* 本地处理标识 */}
              {tool.localOnly && (
                <div className="mt-2 flex items-center gap-1 text-xs text-[#22C55E] bg-[#22C55E]/10 px-2 py-1 rounded-full flex-shrink-0">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span>浏览器本地处理</span>
                </div>
              )}

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
  )
}

export default Home
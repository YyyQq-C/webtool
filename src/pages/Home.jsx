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
  },
  {
    id: 'image-to-pdf',
    name: '图片转PDF',
    description: '多张图片合并为PDF，拖拽排序，一键生成',
    icon: '/jpg2pdf.png',
    path: '/image-to-pdf',
    color: 'from-green-500 to-teal-600',
  },
  {
    id: 'image-bg-remover',
    name: '图片去背景',
    description: 'AI智能去除图片背景，支持预览和下载PNG',
    icon: null,
    emoji: '✂️',
    path: '/image-bg-remover',
    color: 'from-green-500 to-teal-600',
  },
  {
    id: 'web-to-pdf',
    name: '网页转PDF',
    description: '输入网址，将整个页面或页面图片导出为PDF',
    icon: null,
    emoji: '🌐',
    path: '/web-to-pdf',
    color: 'from-purple-500 to-blue-600',
  },
  // 未来可以添加更多工具
]

function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-[#F8FAFC] mb-4">
          工具箱
        </h1>
        <p className="text-[#94A3B8] text-lg">
          选择你需要的工具
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            to={tool.path}
            className="group block"
          >
            <div className="bg-[#1E293B]/60 backdrop-blur-sm rounded-2xl p-6 hover:bg-[#1E293B]/80 transition-all duration-300 border border-[#475569] hover:border-[#22C55E] hover:shadow-2xl hover:shadow-green-500/20 transform hover:-translate-y-1 h-[280px] flex flex-col">
              {/* 图标 - 固定大小 */}
              <div className="w-16 h-16 mb-4 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center flex-shrink-0">
                {tool.icon ? (
                  <img src={tool.icon} alt={tool.name} className="w-14 h-14 object-contain rounded-lg" />
                ) : (
                  <span className="text-5xl">{tool.emoji || '🔧'}</span>
                )}
              </div>

              {/* 标题 - 固定高度 */}
              <h3 className="text-xl font-semibold text-[#F8FAFC] mb-2 line-clamp-1 flex-shrink-0">
                {tool.name}
              </h3>

              {/* 描述 - 固定行数 */}
              <p className="text-[#94A3B8] text-sm line-clamp-2 flex-shrink-0">
                {tool.description}
              </p>

              {/* 底部箭头 - 推到底部 */}
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

      <div className="text-center mt-16 text-[#94A3B8] text-sm">
        <p>所有文件处理均在浏览器本地完成，保护您的隐私</p>
      </div>
    </div>
  )
}

export default Home
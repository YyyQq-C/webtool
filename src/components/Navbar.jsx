import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

// 工具分类配置
const toolCategories = [
  {
    name: '图片基础',
    icon: '🖼️',
    items: [
      { name: '格式转换', path: '/image-converter' },
      { name: '裁剪', path: '/image-cropper' },
      { name: '压缩', path: '/image-compress' },
      { name: '分辨率调整', path: '/image-resizer' },
      { name: '编辑', path: '/image-editor' },
    ],
  },
  {
    name: '图片转换',
    icon: '🔄',
    items: [
      { name: '图片转PDF', path: '/image-to-pdf' },
      { name: '网页转PDF', path: '/web-to-pdf' },
      { name: 'PDF转Word', path: '/pdf-to-word' },
      { name: '图片转Excel', path: '/image-to-excel' },
      { name: '图片转Word', path: '/image-to-word' },
    ],
  },
  {
    name: '去背景/水印',
    icon: '✨',
    items: [
      { name: '去背景', path: '/image-bg-remover' },
      { name: '去水印', path: '/image-watermark-remover' },
    ],
  },
  {
    name: '证件照',
    icon: '📷',
    items: [
      { name: '证件照制作', path: '/id-photo-maker' },
    ],
  },
  {
    name: '合成/拼接',
    icon: '🧩',
    items: [
      { name: '图片拼接', path: '/image-splice' },
      { name: '加水印', path: '/image-watermark' },
      { name: '形状裁切', path: '/image-shape' },
      { name: '九宫格切图', path: '/image-grid-cut' },
    ],
  },
  {
    name: '其他工具',
    icon: '🔧',
    items: [
      { name: 'GIF分帧', path: '/gif-extractor' },
      { name: '二维码', path: '/qr-code' },
      { name: '图片相似度', path: '/image-compare' },
    ],
  },
]

function Navbar() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)
  const dropdownRef = useRef(null)
  const categoryTimeoutRef = useRef(null)

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setActiveCategory(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCategoryEnter = (index) => {
    clearTimeout(categoryTimeoutRef.current)
    setActiveCategory(index)
  }

  const handleCategoryLeave = () => {
    categoryTimeoutRef.current = setTimeout(() => {
      setActiveCategory(null)
    }, 200)
  }

  return (
    <nav className="sticky top-0 z-50 bg-[#0F172A]/80 backdrop-blur-xl border-b border-[#334155]/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* 左侧 Logo + 工具菜单 */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/tool-logo.png" alt="蓝胖子的口袋" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
              <span className="text-[#F8FAFC] font-bold text-sm hidden sm:inline whitespace-nowrap">蓝胖子的口袋</span>
            </Link>

            {/* 工具分类下拉菜单 */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={() => setIsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]/60 rounded-lg transition-all"
              >
                <span>🔧</span>
                <span>所有工具</span>
                <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* 下拉面板 */}
              {isOpen && (
                <div
                  className="absolute top-full left-0 mt-2 w-[520px] bg-[#1E293B] border border-[#475569] rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
                  onMouseEnter={() => setIsOpen(true)}
                  onMouseLeave={() => {
                    categoryTimeoutRef.current = setTimeout(() => {
                      setIsOpen(false)
                      setActiveCategory(null)
                    }, 200)
                  }}
                >
                  <div className="flex">
                    {/* 左侧分类列表 */}
                    <div className="w-40 border-r border-[#334155] py-2">
                      {toolCategories.map((cat, index) => (
                        <button
                          key={cat.name}
                          onMouseEnter={() => handleCategoryEnter(index)}
                          className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                            activeCategory === index
                              ? 'bg-[#22C55E]/10 text-[#22C55E] border-r-2 border-[#22C55E]'
                              : 'text-[#94A3B8] hover:bg-[#334155]/50 hover:text-[#F8FAFC]'
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* 右侧工具列表 */}
                    <div className="flex-1 p-4 min-h-[200px]">
                      {activeCategory !== null && toolCategories[activeCategory] ? (
                        <div>
                          <h4 className="text-xs text-[#64748B] mb-2 font-medium">
                            {toolCategories[activeCategory].name}
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {toolCategories[activeCategory].items.map((item) => {
                              const isActive = location.pathname === item.path
                              return (
                                <Link
                                  key={item.path}
                                  to={item.path}
                                  onClick={() => {
                                    setIsOpen(false)
                                    setActiveCategory(null)
                                  }}
                                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                                    isActive
                                      ? 'bg-[#22C55E]/15 text-[#22C55E] font-medium'
                                      : 'text-[#CBD5E1] hover:bg-[#334155] hover:text-[#F8FAFC]'
                                  }`}
                                >
                                  {item.name}
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-[#64748B] text-sm">
                          ← 选择工具分类
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：快速工具链接 + 仓库 */}
          <div className="flex items-center gap-2 ml-auto">
            {/* 常用工具快捷方式 */}
            <div className="hidden lg:flex items-center gap-1">
              {[
                { name: '证件照', path: '/id-photo-maker', emoji: '📷' },
                { name: '去背景', path: '/image-bg-remover', emoji: '✨' },
                { name: '格式转换', path: '/image-converter', emoji: '🔄' },
                { name: '加水印', path: '/image-watermark', emoji: '🏷️' },
              ].map((tool) => {
                const isActive = location.pathname === tool.path
                return (
                  <Link
                    key={tool.path}
                    to={tool.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? 'bg-[#22C55E]/15 text-[#22C55E]'
                        : 'text-[#94A3B8] hover:bg-[#1E293B]/60 hover:text-[#F8FAFC]'
                    }`}
                  >
                    <span className="flex-shrink-0">{tool.emoji}</span>
                    <span className="truncate">{tool.name}</span>
                  </Link>
                )
              })}
            </div>

            {/* 分割线 */}
            <div className="h-6 w-[1px] bg-[#334155] hidden lg:block flex-shrink-0"></div>

            {/* 仓库链接 - 最右边 */}
            <a
              href="https://gitee.com/YongQianc/webtool"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-2 rounded-lg hover:bg-[#1E293B]/60 transition-all"
              title="Gitee 仓库"
            >
              <img src="/gitee.png" alt="Gitee" className="w-5 h-5 object-contain opacity-50 hover:opacity-100 transition-opacity" />
            </a>
            <a
              href="https://github.com/YyyQq-C/webtool"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-2 rounded-lg hover:bg-[#1E293B]/60 transition-all"
              title="GitHub 仓库"
            >
              <img src="/github.png" alt="GitHub" className="w-5 h-5 object-contain opacity-50 hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

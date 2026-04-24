import { useState, useEffect } from 'react'

function Footer() {
  const [stats, setStats] = useState({ visits: 0 })

  useEffect(() => {
    // 只有在首页或者全局加载一次访问统计
    const fetchStats = async () => {
      try {
        const res = await fetch('/bg-api/api/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      }
    }
    fetchStats()
  }, [])

  return (
    <footer className="bg-[#0F172A]/40 backdrop-blur-md border-t border-[#334155] mt-auto py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* 左侧：版权与备案 */}
          <div className="text-center md:text-left space-y-2">
             <p className="text-[#94A3B8] text-sm font-medium">© 2026 蓝胖子的口袋 | ALL RIGHTS RESERVED</p>
             <div className="flex items-center justify-center md:justify-start gap-4 text-[11px] text-[#475569]">
                <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-500 transition-colors">
                  蜀ICP备2025139402号
                </a>
                <a href="http://www.beian.gov.cn/portal/registerSystemInfo" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-emerald-500 transition-colors">
                  <img src="/beian.png" alt="" className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                  <span>川公网安备51019002007976号</span>
                </a>
             </div>
          </div>

          {/* 右侧：访问统计 */}
          <div className="flex items-center gap-6">
             <div className="bg-[#1E293B]/60 rounded-full px-5 py-2 border border-[#334155] shadow-sm flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[#94A3B8] text-xs font-bold uppercase tracking-wider">访问总量</span>
                <span className="text-emerald-400 font-mono text-lg font-black">{stats.visits.toLocaleString()}</span>
             </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
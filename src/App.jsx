import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ImageConverter from './pages/ImageConverter'
import ImageToPdf from './pages/ImageToPdf'
import ImageBgRemover from './pages/ImageBgRemover'
import WebToPdf from './pages/WebToPdf'
import ImageWatermarkRemover from './pages/ImageWatermarkRemover'
import ImageCropper from './pages/ImageCropper'
import ImageResizer from './pages/ImageResizer'
import ImageSplice from './pages/ImageSplice'
import Footer from './components/Footer'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] flex flex-col relative">
        {/* 页头：社交/仓库 链接 - 随页面滚动，窄屏幕隐藏 */}
        <header className="hidden md:flex w-full justify-end px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            {/* Gitee */}
            <a
              href="https://gitee.com/YongQianc/webtool"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
              title="Gitee 仓库"
            >
              <div className="bg-[#1E293B]/60 backdrop-blur-xl p-3 rounded-2xl border border-white/10 hover:border-red-500/50 transition-all duration-300 shadow-lg hover:shadow-red-500/20 group-hover:scale-110 active:scale-95">
                <img src="/gitee.png" alt="Gitee" className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>

            {/* GitHub */}
            <a
              href="https://github.com/YyyQq-C/webtool"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
              title="GitHub 仓库"
            >
              <div className="bg-[#1E293B]/60 backdrop-blur-xl p-3 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all duration-300 shadow-lg hover:shadow-emerald-500/20 group-hover:scale-110 active:scale-95">
                <img src="/github.png" alt="GitHub" className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          </div>
        </header>

        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/image-converter" element={<ImageConverter />} />
            <Route path="/image-to-pdf" element={<ImageToPdf />} />
            <Route path="/web-to-pdf" element={<WebToPdf />} />
            <Route path="/image-bg-remover" element={<ImageBgRemover />} />
            <Route path="/image-watermark-remover" element={<ImageWatermarkRemover />} />
            <Route path="/image-cropper" element={<ImageCropper />} />
            <Route path="/image-resizer" element={<ImageResizer />} />
            <Route path="/image-splice" element={<ImageSplice />} />
          </Routes>
        </main>
        {/* <Footer /> */}
      </div>
    </Router>
  )
}

export default App
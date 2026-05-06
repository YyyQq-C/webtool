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
import ImageWatermark from './pages/ImageWatermark'
import ImageShape from './pages/ImageShape'
import GifExtractor from './pages/GifExtractor'
import QrCode from './pages/QrCode'
import ImageCompress from './pages/ImageCompress'
import ImageCompare from './pages/ImageCompare'
import PdfToWord from './pages/PdfToWord'
import PhotoTools from './pages/PhotoTools'
import ImageGridCut from './pages/ImageGridCut'
import ImageToExcel from './pages/ImageToExcel'
import ImageToWord from './pages/ImageToWord'
import ImageEditor from './pages/ImageEditor'
import IdPhotoMaker from './pages/IdPhotoMaker'
import Footer from './components/Footer'
import Navbar from './components/Navbar'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] flex flex-col relative">
        {/* 导航栏 */}
        <Navbar />

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
            <Route path="/image-watermark" element={<ImageWatermark />} />
            <Route path="/image-shape" element={<ImageShape />}  />
            <Route path="/gif-extractor" element={<GifExtractor />} />
            <Route path="/qr-code" element={<QrCode />} />
            <Route path="/image-compress" element={<ImageCompress />} />
            <Route path="/image-compare" element={<ImageCompare />} />
            <Route path="/pdf-to-word" element={<PdfToWord />} />
            <Route path="/photo-tools" element={<PhotoTools />} />
            <Route path="/image-grid-cut" element={<ImageGridCut />} />
            <Route path="/image-to-excel" element={<ImageToExcel />} />
            <Route path="/image-to-word" element={<ImageToWord />} />
            <Route path="/image-editor" element={<ImageEditor />} />
            <Route path="/id-photo-maker" element={<IdPhotoMaker />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
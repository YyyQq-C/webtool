import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ImageConverter from './pages/ImageConverter'
import ImageToPdf from './pages/ImageToPdf'
import ImageBgRemover from './pages/ImageBgRemover'
import Footer from './components/Footer'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] flex flex-col">
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/image-converter" element={<ImageConverter />} />
            <Route path="/image-to-pdf" element={<ImageToPdf />} />
            <Route path="/image-bg-remover" element={<ImageBgRemover />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
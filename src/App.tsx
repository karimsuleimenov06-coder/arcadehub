import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import Footer from './components/Footer'
import NeonBackground from './components/NeonBackground'
import Home from './pages/Home'
import GamePage from './pages/GamePage'
import Profile from './pages/Profile'
import Settings from './pages/Settings'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <NeonBackground />
      <Header />
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game/:gameId" element={<GamePage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}
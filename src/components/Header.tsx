import { Link } from 'react-router-dom'
import { useState } from 'react'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="relative z-20 glass border-b border-[var(--glass-border)]" style={{ paddingTop: 'var(--sat)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-20">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[var(--neon-blue)] to-[var(--neon-purple)] flex items-center justify-center font-orbitron font-bold text-sm sm:text-base text-white group-hover:shadow-[var(--neon-blue)]/50 transition-shadow">
              A
            </div>
            <span className="font-orbitron text-lg sm:text-xl font-bold neon-text-blue">
              ArcadeHub
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--neon-blue)] transition-colors">
              Главная
            </Link>
            <Link to="/?section=all-games" className="text-sm text-[var(--text-secondary)] hover:text-[var(--neon-blue)] transition-colors">
              Все игры
            </Link>
            <Link to="/profile" className="text-sm text-[var(--text-secondary)] hover:text-[var(--neon-blue)] transition-colors">
              Профиль
            </Link>
            <Link to="/settings" className="text-sm text-[var(--text-secondary)] hover:text-[var(--neon-blue)] transition-colors">
              Настройки
            </Link>
          </nav>

          <button
            className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--neon-blue)] active:text-[var(--neon-blue)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Меню"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <nav className="md:hidden pb-4 flex flex-col gap-1">
            <Link to="/" className="block px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--neon-blue)] active:text-[var(--neon-blue)] rounded-lg hover:bg-[var(--glass-hover)] transition-colors min-h-[44px] flex items-center" onClick={() => setMenuOpen(false)}>
              Главная
            </Link>
            <Link to="/?section=all-games" className="block px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--neon-blue)] active:text-[var(--neon-blue)] rounded-lg hover:bg-[var(--glass-hover)] transition-colors min-h-[44px] flex items-center" onClick={() => setMenuOpen(false)}>
              Все игры
            </Link>
            <Link to="/profile" className="block px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--neon-blue)] active:text-[var(--neon-blue)] rounded-lg hover:bg-[var(--glass-hover)] transition-colors min-h-[44px] flex items-center" onClick={() => setMenuOpen(false)}>
              Профиль
            </Link>
            <Link to="/settings" className="block px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--neon-blue)] active:text-[var(--neon-blue)] rounded-lg hover:bg-[var(--glass-hover)] transition-colors min-h-[44px] flex items-center" onClick={() => setMenuOpen(false)}>
              Настройки
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}
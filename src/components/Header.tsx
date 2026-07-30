import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="sticky top-0 z-30 transition-all duration-300"
      style={{
        paddingTop: 'var(--sat)',
        background: scrolled
          ? 'rgba(10, 10, 26, 0.85)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--glass-border)' : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 sm:h-20">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[var(--neon-blue)] to-[var(--neon-purple)] flex items-center justify-center font-orbitron font-bold text-xs sm:text-base text-white">
              A
            </div>
            <span className={`font-orbitron text-base sm:text-xl font-bold neon-text-blue transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-100'}`}>
              ArcadeHub
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--neon-blue)] transition-colors">Главная</Link>
            <Link to="/?section=all-games" className="text-sm text-[var(--text-secondary)] hover:text-[var(--neon-blue)] transition-colors">Все игры</Link>
            <Link to="/settings" className="text-sm text-[var(--text-secondary)] hover:text-[var(--neon-blue)] transition-colors">Настройки</Link>
            {user ? (
              <Link to="/profile" className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--neon-blue)] transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--neon-blue)] to-[var(--neon-purple)] flex items-center justify-center text-[10px] font-bold text-white">
                  {user.nickname[0].toUpperCase()}
                </div>
                <span>{user.nickname}</span>
              </Link>
            ) : (
              <Link to="/login" className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[var(--neon-blue)] to-[var(--neon-purple)] text-white text-xs font-semibold">
                Войти
              </Link>
            )}
          </nav>

          <button
            className="md:hidden p-2 text-[var(--text-secondary)] active:text-[var(--neon-blue)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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
          <nav className="md:hidden pb-3 flex flex-col gap-0.5">
            {[
              { to: '/', label: 'Главная', icon: 'H' },
              { to: '/?section=all-games', label: 'Все игры', icon: 'G' },
              ...(user ? [{ to: '/profile', label: 'Профиль', icon: user.nickname[0].toUpperCase() }] : []),
              { to: '/settings', label: 'Настройки', icon: 'S' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-secondary)] active:text-[var(--neon-blue)] rounded-xl active:bg-[var(--neon-blue)]/10 transition-colors min-h-[44px]"
                onClick={() => setMenuOpen(false)}
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--glass-bg)] flex items-center justify-center text-xs font-bold">{item.icon}</div>
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
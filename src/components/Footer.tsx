import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Главная', icon: 'H' },
  { to: '/?section=all-games', label: 'Игры', icon: 'G' },
  { to: '/profile', label: 'Профиль', icon: 'P' },
  { to: '/settings', label: 'Настройки', icon: 'S' },
]

export default function Footer() {
  const location = useLocation()

  return (
    <>
      {/* Bottom nav for mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass border-t border-[var(--glass-border)]" style={{ paddingBottom: 'var(--sab)' }}>
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const isActive = item.to === '/'
              ? location.pathname === '/' && !location.search
              : location.pathname === item.to || (item.to.includes('?') && location.pathname + location.search === item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center min-w-[60px] min-h-[44px] rounded-lg transition-colors ${
                  isActive ? 'text-[var(--neon-blue)]' : 'text-[var(--text-muted)]'
                }`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-[var(--neon-blue)]/20' : ''
                }`}>
                  {item.icon}
                </div>
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop footer */}
      <footer className="hidden md:block relative z-20 glass border-t border-[var(--glass-border)] py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-[var(--neon-blue)] to-[var(--neon-purple)] flex items-center justify-center font-orbitron font-bold text-xs text-white">
                A
              </div>
              <span className="font-orbitron text-sm font-bold neon-text-blue">ArcadeHub</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              &copy; 2026 ArcadeHub &middot; Портал браузерных игр &middot; Только виртуальные фишки
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
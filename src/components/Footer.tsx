import { Link, useLocation } from 'react-router-dom'

const navItems = [
  {
    to: '/', label: 'Главная',
    icon: (a: boolean) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.5}>
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/?section=all-games', label: 'Игры',
    icon: (a: boolean) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.5}>
        <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/profile', label: 'Профиль',
    icon: (a: boolean) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.5}>
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    to: '/settings', label: 'Настройки',
    icon: (a: boolean) => (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.5}>
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function Footer() {
  const location = useLocation()

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40" style={{ paddingBottom: 'var(--sab)' }}>
        <div className="glass border-t border-[var(--glass-border)]">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const isActive = item.to === '/'
                ? location.pathname === '/' && !location.search
                : location.pathname === item.to || (item.to.includes('?') && location.pathname + location.search === item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] rounded-xl transition-all duration-200 relative ${
                    isActive ? 'text-[var(--neon-blue)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {isActive && (
                    <div className="absolute -top-0.5 w-8 h-0.5 rounded-full bg-[var(--neon-blue)] shadow-[0_0_8px_rgba(0,243,255,0.6)]" />
                  )}
                  <div className={`transition-all duration-200 ${isActive ? 'scale-110' : ''}`}>
                    {item.icon(isActive)}
                  </div>
                  <span className={`text-[10px] mt-0.5 font-medium transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      <footer className="hidden md:block relative z-20 glass border-t border-[var(--glass-border)] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-[var(--neon-blue)] to-[var(--neon-purple)] flex items-center justify-center font-orbitron font-bold text-xs text-white">A</div>
              <span className="font-orbitron text-sm font-bold neon-text-blue">ArcadeHub</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">&copy; 2026 ArcadeHub &middot; Портал браузерных игр &middot; Только виртуальные фишки</p>
          </div>
        </div>
      </footer>
    </>
  )
}
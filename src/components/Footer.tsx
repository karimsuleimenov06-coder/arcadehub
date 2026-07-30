export default function Footer() {
  return (
    <footer className="relative z-20 glass border-t border-[var(--glass-border)] py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[var(--neon-blue)] to-[var(--neon-purple)] flex items-center justify-center font-orbitron font-bold text-xs text-white">
              A
            </div>
            <span className="font-orbitron text-sm font-bold neon-text-blue">ArcadeHub</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            © 2026 ArcadeHub · Портал браузерных игр · Только виртуальные фишки, без реальных денег
          </p>
        </div>
      </div>
    </footer>
  )
}
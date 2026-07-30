import { useState, useEffect } from 'react'

export default function SplashScreen() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setHidden(true), 1200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={`splash ${hidden ? 'hidden' : ''}`}>
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--neon-blue)] to-[var(--neon-purple)] flex items-center justify-center font-orbitron font-bold text-3xl text-white mb-4 animate-glow">
        A
      </div>
      <h1 className="font-orbitron text-2xl font-bold mb-1">
        <span className="neon-text-blue">Arcade</span><span className="neon-text-purple">Hub</span>
      </h1>
      <p className="text-xs text-[var(--text-muted)]">Загрузка...</p>
      <div className="mt-6 flex gap-1.5">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-[var(--neon-blue)] animate-bounce" style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }} />
        ))}
      </div>
    </div>
  )
}
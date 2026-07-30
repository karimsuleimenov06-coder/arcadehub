import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGame } from '../context/GameContext'
import { GAMES } from '../types/game'

export default function Profile() {
  const { user, logout, updateProfile } = useAuth()
  const { progress, level, xpForNextLevel } = useGame()
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState(user?.nickname || '')

  if (!user) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-sm mx-auto px-4 py-20 text-center">
        <div className="glass rounded-2xl p-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--neon-blue)] to-[var(--neon-purple)] flex items-center justify-center text-2xl font-bold mx-auto mb-4">?</div>
          <h2 className="text-lg font-bold mb-2">Вы не авторизованы</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">Войдите или создайте аккаунт, чтобы сохранять прогресс</p>
          <Link to="/login" className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--neon-blue)] to-[var(--neon-purple)] text-white font-semibold text-sm">
            Войти
          </Link>
        </div>
      </motion.div>
    )
  }

  const achievements = [
    { icon: '🏆', label: 'Игр сыграно', value: progress.gamesPlayed.toString() },
    { icon: '⭐', label: 'Уровень', value: level.toString() },
    { icon: '💰', label: 'Монет', value: progress.coins.toString() },
    { icon: '📊', label: 'XP', value: `${progress.xp} / ${(level) * 100}` },
  ]

  const highScoreEntries = Object.entries(progress.highScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const topGames = highScoreEntries.map(([id, score]) => ({
    game: GAMES.find(g => g.id === id),
    score,
  })).filter(e => e.game)

  const saveNickname = () => {
    if (nickname.trim()) {
      updateProfile({ nickname: nickname.trim() })
    }
    setEditing(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto px-4 py-6 sm:py-10 pb-20">
      {/* Profile header */}
      <div className="glass rounded-2xl p-6 sm:p-8 mb-4 sm:mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--neon-blue)] to-[var(--neon-purple)] flex items-center justify-center text-2xl font-bold shrink-0">
            {user.nickname[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  className="glass rounded-lg px-3 py-1.5 text-sm outline-none flex-1"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && saveNickname()}
                />
                <button onClick={saveNickname} className="text-xs text-[var(--neon-blue)]">OK</button>
                <button onClick={() => setEditing(false)} className="text-xs text-[var(--text-muted)]">Отмена</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{user.nickname}</h1>
                <button onClick={() => { setNickname(user.nickname); setEditing(true) }} className="text-xs text-[var(--text-muted)] hover:text-[var(--neon-blue)]">
                  ✎
                </button>
              </div>
            )}
            <p className="text-xs text-[var(--text-muted)]">
              Уровень {level} · {progress.gamesPlayed} игр
            </p>
            {/* XP bar */}
            <div className="mt-2 h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--neon-blue)] to-[var(--neon-purple)] transition-all duration-500"
                style={{ width: `${100 - (xpForNextLevel / 100) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 sm:mb-6">
        {achievements.map(a => (
          <div key={a.label} className="glass rounded-xl p-3 sm:p-4 text-center">
            <div className="text-lg mb-0.5">{a.icon}</div>
            <div className="text-lg font-bold neon-text-blue">{a.value}</div>
            <div className="text-[10px] sm:text-xs text-[var(--text-muted)]">{a.label}</div>
          </div>
        ))}
      </div>

      {/* Top scores */}
      <div className="glass rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-sm font-bold mb-3">Лучшие результаты</h2>
        {topGames.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Сыграйте в игры, чтобы увидеть результаты</p>
        ) : (
          <div className="space-y-2">
            {topGames.map(({ game, score }, i) => (
              <div key={game!.id} className="flex items-center gap-3">
                <span className="text-[10px] text-[var(--text-muted)] w-4">#{i + 1}</span>
                <div className="w-6 h-6 rounded flex items-center justify-center text-xs" style={{ background: game!.color + '22', color: game!.color }}>
                  {game!.emoji}
                </div>
                <span className="text-xs flex-1 truncate">{game!.title}</span>
                <span className="text-xs font-bold neon-text-green">{score}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="glass rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-sm font-bold mb-3">История игр</h2>
        {progress.history.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">История пуста</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {progress.history.slice(0, 20).map((h, i) => {
              const g = GAMES.find(gg => gg.id === h.gameId)
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--text-muted)]">{new Date(h.date).toLocaleDateString('ru')}</span>
                  <span style={{ color: g?.color }}>{g?.emoji || '?'}</span>
                  <span className="flex-1 truncate">{g?.title || h.gameId}</span>
                  <span className="font-medium text-[var(--neon-green)]">+{h.score}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button
        onClick={logout}
        className="w-full py-2.5 glass rounded-xl text-sm text-[var(--neon-red)] active:scale-[0.98] transition-transform"
      >
        Выйти
      </button>
    </motion.div>
  )
}
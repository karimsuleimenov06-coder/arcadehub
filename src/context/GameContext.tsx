import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from './AuthContext'

export type GameProgress = {
  gamesPlayed: number
  totalScore: number
  highScores: Record<string, number>
  coins: number
  xp: number
  history: { gameId: string; score: number; date: number }[]
}

type GameContextType = {
  progress: GameProgress
  addScore: (gameId: string, score: number) => void
  level: number
  xpForNextLevel: number
}

const DEFAULT_PROGRESS: GameProgress = {
  gamesPlayed: 0,
  totalScore: 0,
  highScores: {},
  coins: 0,
  xp: 0,
  history: [],
}

const PROGRESS_API = '/api/progress.mjs'

const GameContext = createContext<GameContextType | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [progress, setProgress] = useState<GameProgress>(DEFAULT_PROGRESS)
  const [synced, setSynced] = useState(false)

  // Load progress from cloud on login
  useEffect(() => {
    if (!user) {
      setProgress(DEFAULT_PROGRESS)
      setSynced(false)
      return
    }
    if (synced) return

    const loadFromCloud = async () => {
      try {
        const res = await fetch(PROGRESS_API, {
          headers: { Authorization: `Bearer ${user.token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.data && Object.keys(data.data).length > 0) {
            setProgress(data.data as GameProgress)
          }
        }
      } catch {}
      setSynced(true)
    }
    loadFromCloud()

    // Also try local as fallback
    const local = localStorage.getItem(`arcadehub_progress_${user.username}`)
    if (local) {
      try {
        const p = JSON.parse(local) as GameProgress
        setProgress(prev => ({ ...p, ...prev }))
      } catch {}
    }
  }, [user, synced])

  const save = useCallback(async (p: GameProgress) => {
    setProgress(p)
    if (user) {
      localStorage.setItem(`arcadehub_progress_${user.username}`, JSON.stringify(p))
      try {
        await fetch(PROGRESS_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ data: p }),
        })
      } catch {}
    }
  }, [user])

  const addScore = useCallback((gameId: string, score: number) => {
    setProgress(prev => {
      const newHighScores = { ...prev.highScores }
      if (!newHighScores[gameId] || score > newHighScores[gameId]) {
        newHighScores[gameId] = score
      }
      const coinsEarned = Math.max(1, Math.floor(score / 10))
      const xpEarned = Math.max(1, Math.floor(score / 5))
      const updated: GameProgress = {
        gamesPlayed: prev.gamesPlayed + 1,
        totalScore: prev.totalScore + score,
        highScores: newHighScores,
        coins: prev.coins + coinsEarned,
        xp: prev.xp + xpEarned,
        history: [{ gameId, score, date: Date.now() }, ...prev.history].slice(0, 100),
      }
      if (user) {
        localStorage.setItem(`arcadehub_progress_${user.username}`, JSON.stringify(updated))
        fetch(PROGRESS_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ data: updated }),
        }).catch(() => {})
        fetch('/api/leaderboard.mjs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ game: gameId, score }),
        })
          .then(r => r.json())
          .then(res => {
            if (res.ok) window.dispatchEvent(new CustomEvent('arcadehub:leaderboard', { detail: { game: gameId, entries: res.entries } }))
          })
          .catch(() => {})
      }
      return updated
    })
  }, [user])

  const level = Math.floor(progress.xp / 100) + 1
  const xpForNextLevel = 100 - (progress.xp % 100)

  return (
    <GameContext.Provider value={{ progress, addScore, level, xpForNextLevel }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be inside GameProvider')
  return ctx
}
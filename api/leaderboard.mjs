import { verifyToken } from './db.mjs'
import store from './store.mjs'

const GAME_WHITELIST = ['snake', 'tictactoe', 'pong', 'poker', '2048']
const MAX_ENTRIES = 50

function key(gameId) {
  return `lb:${gameId}`
}

async function loadList(gameId) {
  const raw = await store.get(key(gameId))
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

async function saveList(gameId, list) {
  await store.set(key(gameId), JSON.stringify(list.slice(0, MAX_ENTRIES)))
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const game = (req.query?.game || req.body?.game || '').toLowerCase()
  if (!GAME_WHITELIST.includes(game)) return res.status(400).json({ error: 'Unknown game' })

  try {
    if (req.method === 'GET') {
      const list = await loadList(game)
      return res.status(200).json({ ok: true, game, entries: list.slice(0, 10) })
    }

    if (req.method === 'POST') {
      const auth = req.headers.authorization
      if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' })

      const payload = await verifyToken(auth.slice(7))
      if (!payload || !payload.username) return res.status(401).json({ error: 'Invalid token' })

      const score = Math.max(0, Math.floor(Number(req.body?.score) || 0))

      const list = await loadList(game)
      const existing = list.find(e => e.username === payload.username)
      if (existing && existing.score >= score) {
        return res.status(200).json({ ok: true, submitted: false, entries: list.slice(0, 10) })
      }

      const nickname = existing?.nickname || payload.username
      const entry = { username: payload.username, nickname, score, date: Date.now() }
      const next = [entry, ...list.filter(e => e.username !== payload.username)]
        .sort((a, b) => b.score - a.score || a.date - b.date)
        .slice(0, MAX_ENTRIES)

      await saveList(game, next)
      return res.status(200).json({ ok: true, submitted: true, entries: next.slice(0, 10) })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

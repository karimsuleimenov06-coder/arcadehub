import { randomBytes } from 'crypto'
import { verifyToken } from './db.mjs'

const rooms = {}

function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let r = ''
  for (let i = 0; i < 6; i++) r += c[randomBytes(1)[0] % c.length]
  return r
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { action, roomCode, username, game, move } = req.body || {}
    const code = (roomCode || '').toUpperCase()

    if (action === 'create') {
      if (!game || !username) return res.status(400).json({ error: 'Missing fields' })
      let c; do { c = genCode() } while (rooms[c])
      rooms[c] = {
        id: c, game, status: 'waiting',
        players: [
          { username, ready: false, wScore: 0 },
          { username: null, ready: false, wScore: 0 },
        ],
        turn: 0, moves: [], createdAt: Date.now(),
        state: game === 'tictactoe' ? { board: Array(9).fill(null), winner: null } : {},
      }
      return res.status(200).json({ ok: true, room: rooms[c] })
    }

    if (action === 'join') {
      if (!code || !username) return res.status(400).json({ error: 'Missing fields' })
      const room = rooms[code]
      if (!room) return res.status(404).json({ error: 'Комната не найдена' })
      if (room.status !== 'waiting') return res.status(400).json({ error: 'Игра уже началась' })
      if (room.players[1].username) return res.status(400).json({ error: 'Комната полна' })
      room.players[1] = { username, ready: false, wScore: 0 }
      room.status = 'playing'
      room.turn = 0
      room.moves = []
      if (room.game === 'tictactoe') room.state = { board: Array(9).fill(null), winner: null }
      return res.status(200).json({ ok: true, room })
    }

    if (action === 'status') {
      if (!code) return res.status(400).json({ error: 'Missing roomCode' })
      const room = rooms[code]
      if (!room) return res.status(404).json({ error: 'Комната не найдена' })
      return res.status(200).json({ ok: true, room })
    }

    if (action === 'start') {
      if (!code) return res.status(400).json({ error: 'Missing roomCode' })
      const room = rooms[code]
      if (!room) return res.status(404).json({ error: 'Комната не найдена' })
      if (!room.players[0].username || !room.players[1].username) return res.status(400).json({ error: 'Нужно 2 игрока' })
      room.status = 'playing'
      room.turn = 0; room.moves = []
      if (room.game === 'tictactoe') room.state = { board: Array(9).fill(null), winner: null }
      return res.status(200).json({ ok: true, room })
    }

    if (action === 'move') {
      if (!code || !username || move === undefined) return res.status(400).json({ error: 'Missing fields' })
      const room = rooms[code]
      if (!room) return res.status(404).json({ error: 'Комната не найдена' })
      if (room.status !== 'playing') return res.status(400).json({ error: 'Игра не активна' })

      const pi = room.players.findIndex(p => p.username === username)
      if (pi < 0) return res.status(403).json({ error: 'Не в этой игре' })
      if (pi !== room.turn) return res.status(400).json({ error: 'Не ваш ход' })

      room.moves.push({ player: username, move, at: Date.now() })

      if (room.game === 'tictactoe') {
        const b = room.state.board
        if (b[move] !== null) return res.status(400).json({ error: 'Клетка занята' })
        b[move] = pi === 0 ? 'X' : 'O'

        const W = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
        for (const [a,c,d] of W) {
          if (b[a] && b[a] === b[c] && b[a] === b[d]) {
            room.state.winner = b[a]; room.status = 'finished'; room.players[pi].wScore++
            return res.status(200).json({ ok: true, room })
          }
        }
        if (b.every(c => c !== null)) { room.state.winner = 'draw'; room.status = 'finished'; return res.status(200).json({ ok: true, room }) }
        room.turn = 1 - pi
      }
      return res.status(200).json({ ok: true, room })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}
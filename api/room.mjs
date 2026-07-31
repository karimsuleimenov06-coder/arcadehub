import { randomBytes } from 'crypto'
import store from './store.mjs'

function roomKey(code) { return `room:${code}` }
async function getRoom(code) {
  const raw = await store.get(roomKey(code))
  return raw ? JSON.parse(raw) : null
}
async function saveRoom(room) {
  await store.set(roomKey(room.id), JSON.stringify(room))
}

const SUITS = ["♠","♥","♦","♣"]
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"]
const RV = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14}

function shuffle(a) {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] }
  return b
}

function evalHand(cards) {
  const v = cards.map(c => RV[c.rank]).sort((a, b) => b - a)
  const s = cards.every(c => c.suit === cards[0].suit)
  const cnt = {}
  for (const x of v) cnt[x] = (cnt[x] || 0) + 1
  const g = Object.entries(cnt).map(([k, c]) => ({ v: +k, c })).sort((a, b) => b.c - a.c || b.v - a.v)
  const u = [...new Set(v)].sort((a, b) => b - a)
  let sh = 0
  if (u.length >= 5) {
    if (u[0] - u[4] === 4) sh = u[0]
    else if (u[0] === 14 && u[1] === 5 && u[2] === 4 && u[3] === 3 && u[4] === 2) sh = 5
  }
  if (s && sh === 14) return { n: "Роял-флеш", s: 10, k: [14] }
  if (s && sh) return { n: "Стрит-флеш", s: 9, k: [sh] }
  if (g[0].c === 4) return { n: "Каре", s: 8, k: [g[0].v, g[1]?.v || 0] }
  if (g[0].c === 3 && g[1]?.c === 2) return { n: "Фулл-хаус", s: 7, k: [g[0].v, g[1].v] }
  if (s) return { n: "Флеш", s: 6, k: v }
  if (sh) return { n: "Стрит", s: 5, k: [sh] }
  if (g[0].c === 3) return { n: "Сет", s: 4, k: [g[0].v, ...g.slice(1).map(x => x.v)] }
  if (g[0].c === 2 && g[1]?.c === 2) { const p = [g[0].v, g[1].v].sort((a, b) => b - a); return { n: "Две пары", s: 3, k: [...p, g[2]?.v || 0] } }
  if (g[0].c === 2) return { n: "Пара", s: 2, k: [g[0].v, ...g.slice(1).map(x => x.v)] }
  return { n: "Старшая", s: 1, k: v }
}

function compareHands(a, b) {
  const ha = evalHand(a), hb = evalHand(b)
  if (ha.s !== hb.s) return ha.s - hb.s
  for (let i = 0; i < Math.max(ha.k.length, hb.k.length); i++) {
    if ((ha.k[i] || 0) !== (hb.k[i] || 0)) return (ha.k[i] || 0) - (hb.k[i] || 0)
  }
  return 0
}

function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let r = ''
  for (let i = 0; i < 6; i++) r += c[randomBytes(1)[0] % c.length]
  return r
}

function initState(game) {
  if (game === 'tictactoe') return { board: Array(9).fill(null), winner: null }
  if (game === 'pong') return { p1y: 170, p2y: 170, p1dy: 0, p2dy: 0, score: { p1: 0, p2: 0 }, winner: null, ball: null }
  if (game === 'snake') return { snake1: [{ x: 10, y: 10 }], snake2: [{ x: 5, y: 5 }], dir1: 'RIGHT', dir2: 'LEFT', food: { x: 15, y: 10 } }
  if (game === 'poker') return {
    phase: 'idle', deck: [], community: [],
    p1chips: 1000, p2chips: 1000, p1bet: 0, p2bet: 0,
    p1folded: false, p2folded: false, p1allin: false, p2allin: false,
    p1cards: [], p2cards: [],
    pot: 0, cb: 0, turn: 0, round: 0, lastAction: '', result: null
  }
  return {}
}

function pokerDeal(s) {
  const d = shuffle([...Array(52)].map((_, i) => ({ rank: RANKS[i % 13], suit: SUITS[Math.floor(i / 13)] })))
  s.deck = d.slice(4)
  s.p1cards = [d[0], d[1]]
  s.p2cards = [d[2], d[3]]
  s.p1chips = 1000; s.p2chips = 1000
  s.p1bet = 10; s.p2bet = 20
  s.p1folded = false; s.p2folded = false
  s.p1allin = false; s.p2allin = false
  s.pot = 30; s.cb = 20; s.turn = 0; s.round = 0
  s.community = []; s.phase = 'preflop'
  s.result = null; s.lastAction = 'Blinds posted'
}

function pokerAdvance(s) {
  const p1Active = !s.p1folded && !s.p1allin
  const p2Active = !s.p2folded && !s.p2allin
  if (!p1Active && !p2Active) { pokerEnd(s); return }
  if (!p1Active || !p2Active) { pokerEnd(s); return }
  const bothActed = (s.p1bet === s.cb || s.p1folded || s.p1allin) && (s.p2bet === s.cb || s.p2folded || s.p2allin)
  if (!bothActed) {
    s.turn = s.turn === 0 ? 1 : 0
    if (s.turn === 0 && (s.p1folded || s.p1allin)) s.turn = 1
    if (s.turn === 1 && (s.p2folded || s.p2allin)) s.turn = 0
    return
  }
  s.p1bet = 0; s.p2bet = 0; s.cb = 0; s.round++
  if (s.phase === 'preflop') {
    s.phase = 'flop'
    s.community = s.deck.slice(-3)
    s.deck = s.deck.slice(0, -3)
    s.turn = 0
    s.lastAction = 'Flop dealt'
  } else if (s.phase === 'flop') {
    s.phase = 'turn'
    s.community.push(s.deck[s.deck.length - 1])
    s.deck = s.deck.slice(0, -1)
    s.turn = 0
    s.lastAction = 'Turn dealt'
  } else if (s.phase === 'turn') {
    s.phase = 'river'
    s.community.push(s.deck[s.deck.length - 1])
    s.deck = s.deck.slice(0, -1)
    s.turn = 0
    s.lastAction = 'River dealt'
  } else if (s.phase === 'river') {
    pokerEnd(s)
  }
}

function pokerEnd(s) {
  s.phase = 'result'
  const p1All = s.p1cards.concat(s.community)
  const p2All = s.p2cards.concat(s.community)
  if (s.p1folded) {
    s.result = { winner: 1, text: 'P2 wins (fold)', h1: '', h2: evalHand(p2All).n }
    s.p2chips += s.pot
    return
  }
  if (s.p2folded) {
    s.result = { winner: 0, text: 'P1 wins (fold)', h1: evalHand(p1All).n, h2: '' }
    s.p1chips += s.pot
    return
  }
  const cmp = compareHands(p1All, p2All)
  if (cmp > 0) {
    s.result = { winner: 0, text: 'P1 wins', h1: evalHand(p1All).n, h2: evalHand(p2All).n }
    s.p1chips += s.pot
  } else if (cmp < 0) {
    s.result = { winner: 1, text: 'P2 wins', h1: evalHand(p1All).n, h2: evalHand(p2All).n }
    s.p2chips += s.pot
  } else {
    const half = Math.floor(s.pot / 2)
    s.result = { winner: -1, text: 'Split pot', h1: evalHand(p1All).n, h2: evalHand(p2All).n }
    s.p1chips += half; s.p2chips += s.pot - half
  }
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
      let c; do { c = genCode() } while (await getRoom(c))
      const room = {
        id: c, game, status: 'waiting',
        players: [
          { username, ready: false, wScore: 0 },
          { username: null, ready: false, wScore: 0 },
        ],
        turn: 0, moves: [], createdAt: Date.now(),
        state: initState(game),
      }
      await saveRoom(room)
      return res.status(200).json({ ok: true, room })
    }

    if (action === 'join') {
      if (!code || !username) return res.status(400).json({ error: 'Missing fields' })
      const room = await getRoom(code)
      if (!room) return res.status(404).json({ error: 'Комната не найдена' })
      if (room.status !== 'waiting') return res.status(400).json({ error: 'Игра уже началась' })
      if (room.players[1].username) return res.status(400).json({ error: 'Комната полна' })
      let uname = username
      if (room.players[0].username === uname) uname = `${uname}2`
      room.players[1] = { username: uname, ready: false, wScore: 0 }
      room.status = 'playing'
      room.turn = 0
      room.moves = []
      room.state = initState(room.game)
      if (room.game === 'poker') pokerDeal(room.state)
      await saveRoom(room)
      return res.status(200).json({ ok: true, room })
    }

    if (action === 'status') {
      if (!code) return res.status(400).json({ error: 'Missing roomCode' })
      const room = await getRoom(code)
      if (!room) return res.status(404).json({ error: 'Комната не найдена' })
      return res.status(200).json({ ok: true, room })
    }

    if (action === 'move') {
      if (!code || !username || move === undefined) return res.status(400).json({ error: 'Missing fields' })
      const room = await getRoom(code)
      if (!room) return res.status(404).json({ error: 'Комната не найдена' })
      if (room.status !== 'playing') return res.status(400).json({ error: 'Игра не активна' })

      const pi = room.players.findIndex(p => p.username === username)
      if (pi < 0) return res.status(403).json({ error: 'Не в этой игре' })

      if (room.game === 'tictactoe') {
        if (pi !== room.turn) return res.status(400).json({ error: 'Не ваш ход' })
        const b = room.state.board
        if (b[move] !== null) return res.status(400).json({ error: 'Клетка занята' })
        b[move] = pi === 0 ? 'X' : 'O'
        const W = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
        for (const [a,c,d] of W) {
          if (b[a] && b[a] === b[c] && b[a] === b[d]) {
            room.state.winner = b[a]; room.status = 'finished'; room.players[pi].wScore++
            await saveRoom(room)
            return res.status(200).json({ ok: true, room })
          }
        }
        if (b.every(c => c !== null)) { room.state.winner = 'draw'; room.status = 'finished'; await saveRoom(room); return res.status(200).json({ ok: true, room }) }
        room.turn = 1 - pi
      }

      if (room.game === 'pong') {
        let dy = 0
        if (typeof move === 'number') {
          dy = move
        } else if (move && typeof move === 'object') {
          dy = move.dy || 0
          if (move.ball) room.state.ball = move.ball
        }
        if (pi === 0) { room.state.p1dy = dy; room.state.p1y = Math.max(0, Math.min(340, (room.state.p1y || 170) + dy)) }
        else { room.state.p2dy = dy; room.state.p2y = Math.max(0, Math.min(340, (room.state.p2y || 170) + dy)) }
      }

      if (room.game === 'snake') {
        let dir = move
        if (move && typeof move === 'object') {
          dir = typeof move.dir === 'string' ? move.dir : null
        }
        if (typeof dir !== 'string') return res.status(400).json({ error: 'Invalid direction' })
        if (pi === 0) {
          room.state.dir1 = dir
          if (move && move.snake) room.state.snake1 = move.snake
        } else {
          room.state.dir2 = dir
          if (move && move.snake) room.state.snake2 = move.snake
        }
      }

      if (room.game === 'poker') {
        const s = room.state
        if (s.phase === 'result') return res.status(400).json({ error: 'Раунд окончен' })
        if (pi !== s.turn) return res.status(400).json({ error: 'Не ваш ход' })
        const myChips = pi === 0 ? s.p1chips : s.p2chips
        const myBet = pi === 0 ? s.p1bet : s.p2bet
        const a = move.action || 'fold'
        if (a === 'fold') {
          if (pi === 0) s.p1folded = true; else s.p2folded = true
          s.lastAction = (pi === 0 ? 'P1' : 'P2') + ' fold'
          pokerEnd(s)
        } else if (a === 'call') {
          const need = s.cb - myBet
          const amt = Math.min(need, myChips)
          if (pi === 0) { s.p1chips -= amt; s.p1bet += amt } else { s.p2chips -= amt; s.p2bet += amt }
          s.pot += amt
          s.lastAction = (pi === 0 ? 'P1' : 'P2') + ' call ' + amt
          if (myChips - amt <= 0) { if (pi === 0) s.p1allin = true; else s.p2allin = true }
          pokerAdvance(s)
        } else if (a === 'raise') {
          const ra = Math.min(Math.max(s.cb * 2, move.amount || 40), myChips)
          const amt = Math.min(ra, myChips)
          if (pi === 0) { s.p1chips -= amt; s.p1bet += amt } else { s.p2chips -= amt; s.p2bet += amt }
          s.pot += amt; s.cb = Math.max(s.cb, ra)
          s.lastAction = (pi === 0 ? 'P1' : 'P2') + ' raise ' + amt
          if (myChips - amt <= 0) { if (pi === 0) s.p1allin = true; else s.p2allin = true }
          pokerAdvance(s)
        }
      }

      room.moves.push({ player: username, move, at: Date.now() })
      await saveRoom(room)
      return res.status(200).json({ ok: true, room })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

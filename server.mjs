import http from 'http'
import crypto from 'crypto'

const store = {}
const JWT_SECRET = process.env.JWT_SECRET || 'arcadehub-secret-key-2026'

function jwtSign(payload) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const data = `${b64(header)}.${b64(payload)}`
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

function jwtVerify(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url')
    if (sig !== parts[2]) return null
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString())
  } catch { return null }
}

async function handleAuth(body) {
  const { action, username, password } = body
  if (!action || !username || !password) return { status: 400, data: { error: 'Missing fields' } }
  const key = `user:${username.toLowerCase()}`

  if (action === 'register') {
    if (store[key]) return { status: 400, data: { error: 'Имя уже занято' } }
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
    store[key] = JSON.stringify({ username, salt, hash, nickname: username, avatar: 'U', registeredAt: Date.now() })
  }

  if (action === 'login' || action === 'register') {
    const raw = store[key]
    if (!raw) return { status: 400, data: { error: 'Неверное имя или пароль' } }
    const data = JSON.parse(raw)
    const hash = crypto.pbkdf2Sync(password, data.salt, 1000, 64, 'sha512').toString('hex')
    if (hash !== data.hash) return { status: 400, data: { error: 'Неверное имя или пароль' } }
    const token = jwtSign({ username: data.username, iat: Date.now() })
    return { status: 200, data: { ok: true, token, user: { username: data.username, nickname: data.nickname, avatar: data.avatar, registeredAt: data.registeredAt } } }
  }

  return { status: 400, data: { error: 'Unknown action' } }
}

async function handleProgress(method, authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { status: 401, data: { error: 'No token' } }
  const payload = jwtVerify(authHeader.slice(7))
  if (!payload) return { status: 401, data: { error: 'Invalid token' } }
  const key = `progress:${payload.username.toLowerCase()}`

  if (method === 'GET') {
    const raw = store[key]
    return { status: 200, data: { data: raw ? JSON.parse(raw) : {} } }
  }
  return { status: 405, data: { error: 'Method not allowed' } }
}

async function handleProgressPost(body, authHeader, method) {
  if (method === 'POST') {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return { status: 401, data: { error: 'No token' } }
    const payload = jwtVerify(authHeader.slice(7))
    if (!payload) return { status: 401, data: { error: 'Invalid token' } }
    const key = `progress:${payload.username.toLowerCase()}`
    store[key] = JSON.stringify(body.data)
    return { status: 200, data: { ok: true } }
  }
  return null
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }

  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname

  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', async () => {
    const parsedBody = body ? JSON.parse(body) : {}

    let result = null
    if (path === '/api/auth.mjs') {
      result = await handleAuth(parsedBody)
    } else if (path === '/api/progress.mjs') {
      if (req.method === 'POST') {
        result = await handleProgressPost(parsedBody, req.headers.authorization, req.method)
      } else {
        result = await handleProgress(req.method, req.headers.authorization)
      }
    }

    if (result) {
      res.writeHead(result.status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result.data))
    } else {
      res.writeHead(404)
      res.end('Not found')
    }
  })
})

const PORT = 3001
server.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`)
})
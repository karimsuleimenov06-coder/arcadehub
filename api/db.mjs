import crypto from 'crypto'

const store = {}

export async function register(username, password) {
  const key = `user:${username.toLowerCase()}`
  if (store[key]) return { ok: false, error: 'Имя уже занято' }
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  store[key] = JSON.stringify({ username, salt, hash, nickname: username, avatar: 'U', registeredAt: Date.now() })
  return { ok: true }
}

export async function login(username, password) {
  const key = `user:${username.toLowerCase()}`
  const raw = store[key]
  if (!raw) return { ok: false, error: 'Неверное имя или пароль' }
  const data = JSON.parse(raw)
  const hash = crypto.pbkdf2Sync(password, data.salt, 1000, 64, 'sha512').toString('hex')
  if (hash !== data.hash) return { ok: false, error: 'Неверное имя или пароль' }

  const header = { alg: 'HS256', typ: 'JWT' }
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const payload = { username: data.username, iat: Date.now() }
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'arcadehub-secret').update(`${b64(header)}.${b64(payload)}`).digest('base64url')
  const token = `${b64(header)}.${b64(payload)}.${signature}`

  return {
    ok: true,
    token,
    user: { username: data.username, nickname: data.nickname, avatar: data.avatar, registeredAt: data.registeredAt },
  }
}

export async function verifyToken(token) {
  try {
    const [h, p, sig] = token.split('.')
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || 'arcadehub-secret').update(`${h}.${p}`).digest('base64url')
    if (expected !== sig) return null
    return JSON.parse(Buffer.from(p, 'base64url').toString())
  } catch { return null }
}

export async function saveProgress(username, data) {
  store[`progress:${username.toLowerCase()}`] = JSON.stringify(data)
}

export async function loadProgress(username) {
  const raw = store[`progress:${username.toLowerCase()}`]
  return raw ? JSON.parse(raw) : null
}
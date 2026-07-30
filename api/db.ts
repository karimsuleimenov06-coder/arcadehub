import crypto from 'crypto'

// Simple in-memory store (works as fallback, lost on cold start)
const store: Record<string, string> = {}

function getStore(): Record<string, string> {
  // Try Vercel KV first (disabled by default, graceful fallback)
  if (typeof process !== 'undefined' && process.env.KV_REST_API_URL) {
    // KV will be handled separately via fetch
    return store
  }
  return store
}

function jwtSign(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const data = `${b64(header)}.${b64(payload)}`
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${sig}`
}

function jwtVerify(token: string, secret: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const sig = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url')
    if (sig !== parts[2]) return null
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString())
  } catch { return null }
}

export async function register(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const s = getStore()
  const key = `user:${username.toLowerCase()}`
  if (s[key]) return { ok: false, error: 'Имя уже занято' }
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  s[key] = JSON.stringify({ username, salt, hash, nickname: username, avatar: 'U', registeredAt: Date.now() })
  return { ok: true }
}

export async function login(username: string, password: string): Promise<{ ok: boolean; token?: string; user?: unknown; error?: string }> {
  const s = getStore()
  const key = `user:${username.toLowerCase()}`
  const raw = s[key]
  if (!raw) return { ok: false, error: 'Неверное имя или пароль' }
  const data = JSON.parse(raw)
  const hash = crypto.pbkdf2Sync(password, data.salt, 1000, 64, 'sha512').toString('hex')
  if (hash !== data.hash) return { ok: false, error: 'Неверное имя или пароль' }
  const token = jwtSign({ username: data.username, iat: Date.now() }, process.env.JWT_SECRET || 'arcadehub-secret-key-2026')
  return { ok: true, token, user: { username: data.username, nickname: data.nickname, avatar: data.avatar, registeredAt: data.registeredAt } }
}

export async function verifyToken(token: string): Promise<{ ok: boolean; username?: string; error?: string }> {
  const payload = jwtVerify(token, process.env.JWT_SECRET || 'arcadehub-secret-key-2026')
  if (!payload) return { ok: false, error: 'Invalid token' }
  return { ok: true, username: payload.username as string }
}

export async function saveProgress(username: string, data: unknown): Promise<void> {
  const s = getStore()
  s[`progress:${username.toLowerCase()}`] = JSON.stringify(data)
}

export async function loadProgress(username: string): Promise<unknown | null> {
  const s = getStore()
  const raw = s[`progress:${username.toLowerCase()}`]
  return raw ? JSON.parse(raw) : null
}
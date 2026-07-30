import type { VercelRequest, VercelResponse } from '@vercel/node'
import { register, login } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, username, password } = req.body

  if (!action || !username || !password) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  if (username.length < 3) return res.status(400).json({ error: 'Имя минимум 3 символа' })
  if (password.length < 4) return res.status(400).json({ error: 'Пароль минимум 4 символа' })

  try {
    if (action === 'register') {
      const result = await register(username, password)
      if (!result.ok) return res.status(400).json({ error: result.error })
      const loginResult = await login(username, password)
      return res.status(200).json(loginResult)
    }

    if (action === 'login') {
      const result = await login(username, password)
      if (!result.ok) return res.status(400).json({ error: result.error })
      return res.status(200).json(result)
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}
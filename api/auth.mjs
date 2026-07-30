import { register, login } from './db.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, username, password } = req.body || {}

  if (!action || !username || !password) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  try {
    if (action === 'register') {
      const r = await register(username, password)
      if (!r.ok) return res.status(400).json({ error: r.error })
      const l = await login(username, password)
      return res.status(200).json(l)
    }
    if (action === 'login') {
      const r = await login(username, password)
      if (!r.ok) return res.status(400).json({ error: r.error })
      return res.status(200).json(r)
    }
    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}
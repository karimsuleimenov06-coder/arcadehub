import { verifyToken, saveProgress, loadProgress } from './db.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' })

  const payload = await verifyToken(auth.slice(7))
  if (!payload || !payload.username) return res.status(401).json({ error: 'Invalid token' })

  try {
    if (req.method === 'GET') {
      const data = await loadProgress(payload.username)
      return res.status(200).json({ data: data || {} })
    }
    if (req.method === 'POST') {
      await saveProgress(payload.username, req.body?.data)
      return res.status(200).json({ ok: true })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}
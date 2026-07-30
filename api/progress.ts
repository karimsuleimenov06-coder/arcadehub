import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken, saveProgress, loadProgress } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' })
  }

  const token = auth.slice(7)
  const verification = await verifyToken(token)
  if (!verification.ok || !verification.username) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const username = verification.username

  try {
    if (req.method === 'GET') {
      const data = await loadProgress(username)
      return res.status(200).json({ data: data || {} })
    }

    if (req.method === 'POST') {
      const { data } = req.body
      await saveProgress(username, data)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}
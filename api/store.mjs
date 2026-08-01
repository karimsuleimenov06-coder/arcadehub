const mem = new Map()
const TTL = 2000

const gh = !!(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO)
const GH_OWNER = process.env.GITHUB_OWNER
const GH_REPO = process.env.GITHUB_REPO
const GH_TOKEN = process.env.GITHUB_TOKEN
const GH_BRANCH = process.env.GITHUB_KV_BRANCH || 'kv'
const GH_HEADERS = {
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'arcadehub',
}

function pathFor(key) {
  return `kv/${key.replace(/[^A-Za-z0-9_-]/g, '_')}.json`
}

async function ghGet(path) {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}?ref=${GH_BRANCH}`
  const res = await fetch(url, { headers: GH_HEADERS })
  if (res.status === 404) return { notFound: true }
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.message || 'GitHub read failed')
    err.status = res.status
    throw err
  }
  return { content: Buffer.from(data.content, 'base64').toString('utf8'), sha: data.sha }
}

async function ghPut(path, content, sha) {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`
  const body = { message: 'kv', content: Buffer.from(content).toString('base64'), branch: GH_BRANCH }
  if (sha) body.sha = sha
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...GH_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.message || 'GitHub write failed')
    err.status = res.status
    throw err
  }
  return data
}

function cached(key) {
  const c = mem.get(key)
  return c && Date.now() - c.ts < TTL ? c : null
}

async function get(key) {
  const c = cached(key)
  if (c) return c.v
  if (!gh) return mem.get(key)?.v ?? null
  try {
    const r = await ghGet(pathFor(key))
    const v = r.notFound ? null : r.content
    mem.set(key, { v, ts: Date.now(), __sha: r.sha })
    return v
  } catch (err) {
    console.error('store get error:', err.message)
    return mem.get(key)?.v ?? null
  }
}

async function set(key, value) {
  mem.set(key, { v: value, ts: Date.now() })
  if (!gh) return { result: 'OK' }

  const p = pathFor(key)
  let sha
  const c = cached(key)
  if (c && c.__sha) sha = c.__sha
  else {
    const r = await ghGet(p)
    sha = r.notFound ? undefined : r.sha
  }

  const commit = async (freshSha) => {
    const data = await ghPut(p, value, freshSha)
    mem.set(key, { v: value, ts: Date.now(), __sha: data?.content?.sha })
  }

  try {
    await commit(sha)
  } catch (err) {
    if (err.status === 409) {
      try {
        const r = await ghGet(p)
        await commit(r.notFound ? undefined : r.sha)
      } catch (err2) {
        console.error('store set retry error:', err2.message)
      }
    } else {
      console.error('store set error:', err.message)
    }
  }
  return { result: 'OK' }
}

export default { get, set }

const mem = new Map()

const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

function kvUrl(op, key) {
  const b64 = Buffer.from(key).toString('base64url')
  return `${process.env.KV_REST_API_URL}/${op}/${b64}`
}

async function kvGet(key) {
  if (useKV) {
    try {
      const res = await fetch(kvUrl('get', key), {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
      })
      const data = await res.json()
      if (data && data.error) throw new Error(data.error)
      return data && data.result != null ? data.result : null
    } catch (err) {
      console.error('KV get fallback to memory:', err.message)
      return mem.get(key) ?? null
    }
  }
  return mem.get(key) ?? null
}

async function kvSet(key, value) {
  if (useKV) {
    try {
      const res = await fetch(kvUrl('set', key), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
        body: value,
      })
      const data = await res.json()
      if (data && data.error) throw new Error(data.error)
      return data
    } catch (err) {
      console.error('KV set fallback to memory:', err.message)
      mem.set(key, value)
      return { result: 'OK' }
    }
  }
  mem.set(key, value)
  return { result: 'OK' }
}

export default { get: kvGet, set: kvSet }

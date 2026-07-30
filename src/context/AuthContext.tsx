import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

type User = {
  username: string
  nickname: string
  avatar: string
  registeredAt: number
  token: string
}

type AuthContextType = {
  user: User | null
  login: (username: string, password: string) => Promise<string | null>
  register: (username: string, password: string) => Promise<string | null>
  logout: () => void
  updateProfile: (data: Partial<User>) => void
  loading: boolean
}

const API = '/api/auth.mjs'

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('arcadehub_token')
    const savedUser = localStorage.getItem('arcadehub_user')
    if (saved && savedUser) {
      try {
        const u = JSON.parse(savedUser)
        setUser({ ...u, token: saved })
      } catch {}
    }
    setLoading(false)
  }, [])

  const saveUser = useCallback((u: User | null) => {
    setUser(u)
    if (u) {
      localStorage.setItem('arcadehub_token', u.token)
      localStorage.setItem('arcadehub_user', JSON.stringify({ username: u.username, nickname: u.nickname, avatar: u.avatar, registeredAt: u.registeredAt }))
    } else {
      localStorage.removeItem('arcadehub_token')
      localStorage.removeItem('arcadehub_user')
    }
  }, [])

  const apiFetch = useCallback(async (action: string, username: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, username, password }),
      })
      const data = await res.json()
      if (!res.ok) return data.error || 'Ошибка сервера'
      if (data.ok && data.token) {
        saveUser({ username: data.user.username, nickname: data.user.nickname, avatar: data.user.avatar, registeredAt: data.user.registeredAt, token: data.token })
        return null
      }
      return data.error || 'Ошибка'
    } catch {
      return 'Ошибка соединения с сервером'
    }
  }, [saveUser])

  const login = useCallback((username: string, password: string) => apiFetch('login', username, password), [apiFetch])
  const register = useCallback((username: string, password: string) => apiFetch('register', username, password), [apiFetch])

  const logout = useCallback(() => saveUser(null), [saveUser])

  const updateProfile = useCallback((data: Partial<User>) => {
    if (!user) return
    const updated = { ...user, ...data }
    saveUser(updated)
  }, [user, saveUser])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
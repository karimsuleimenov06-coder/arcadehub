import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

type User = {
  username: string
  nickname: string
  avatar: string
  registeredAt: number
}

type AuthContextType = {
  user: User | null
  login: (username: string, password: string) => boolean
  register: (username: string, password: string) => boolean
  logout: () => void
  updateProfile: (data: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('arcadehub_user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
  }, [])

  const saveUser = useCallback((u: User | null) => {
    setUser(u)
    if (u) localStorage.setItem('arcadehub_user', JSON.stringify(u))
    else localStorage.removeItem('arcadehub_user')
  }, [])

  const login = useCallback((username: string, password: string) => {
    const data = localStorage.getItem('arcadehub_accounts')
    const accounts: Record<string, string> = data ? JSON.parse(data) : {}
    if (accounts[username] && accounts[username] === password) {
      const profiles = localStorage.getItem('arcadehub_profiles')
      const profilesData: Record<string, User> = profiles ? JSON.parse(profiles) : {}
      saveUser(profilesData[username] || { username, nickname: username, avatar: 'U', registeredAt: Date.now() })
      return true
    }
    return false
  }, [saveUser])

  const register = useCallback((username: string, password: string) => {
    const data = localStorage.getItem('arcadehub_accounts')
    const accounts: Record<string, string> = data ? JSON.parse(data) : {}
    if (accounts[username]) return false
    accounts[username] = password
    localStorage.setItem('arcadehub_accounts', JSON.stringify(accounts))
    const profiles = localStorage.getItem('arcadehub_profiles')
    const profilesData: Record<string, User> = profiles ? JSON.parse(profiles) : {}
    const newUser: User = { username, nickname: username, avatar: 'U', registeredAt: Date.now() }
    profilesData[username] = newUser
    localStorage.setItem('arcadehub_profiles', JSON.stringify(profilesData))
    saveUser(newUser)
    return true
  }, [saveUser])

  const logout = useCallback(() => saveUser(null), [saveUser])

  const updateProfile = useCallback((data: Partial<User>) => {
    if (!user) return
    const updated = { ...user, ...data }
    saveUser(updated)
    const profiles = localStorage.getItem('arcadehub_profiles')
    const profilesData: Record<string, User> = profiles ? JSON.parse(profiles) : {}
    profilesData[user.username] = updated
    localStorage.setItem('arcadehub_profiles', JSON.stringify(profilesData))
  }, [user, saveUser])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
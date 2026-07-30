import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      setError('Заполните все поля')
      return
    }
    if (username.length < 3) {
      setError('Имя минимум 3 символа')
      return
    }
    if (password.length < 4) {
      setError('Пароль минимум 4 символа')
      return
    }
    const ok = isRegister ? register(username, password) : login(username, password)
    if (ok) {
      navigate('/profile')
    } else {
      setError(isRegister ? 'Имя уже занято' : 'Неверное имя или пароль')
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-sm mx-auto px-4 py-10 sm:py-16">
      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--neon-blue)] to-[var(--neon-purple)] flex items-center justify-center font-orbitron font-bold text-2xl text-white mx-auto mb-3">
            A
          </div>
          <h1 className="text-xl font-bold">{isRegister ? 'Регистрация' : 'Вход'}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {isRegister ? 'Создайте аккаунт для сохранения прогресса' : 'Войдите в свой аккаунт'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">Имя пользователя</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full glass rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--neon-blue)] transition-colors"
              placeholder="Ваше имя"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full glass rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--neon-blue)] transition-colors"
              placeholder="Пароль"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <p className="text-xs text-[var(--neon-red)]">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--neon-blue)] to-[var(--neon-purple)] text-white font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            {isRegister ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsRegister(!isRegister); setError('') }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--neon-blue)] transition-colors"
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
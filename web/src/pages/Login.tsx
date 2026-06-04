import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../App'

const API_BASE = '/api/v1'

export default function Login() {
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')

  if (getToken()) {
    navigate('/')
    return null
  }

  const handleSubmit = async () => {
    setError('')
    const endpoint = isRegister ? '/auth/register' : '/auth/login'
    const body: Record<string, string> = { email, password }
    if (isRegister) body.nickname = nickname

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'request failed')
        return
      }
      if (!isRegister) {
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        navigate('/')
      } else {
        setIsRegister(false)
        setError('注册成功，请登录')
      }
    } catch {
      setError('network error')
    }
  }

  return (
    <div className="card" style={{ maxWidth: 400, margin: '40px auto' }}>
      <h2 className="mb-4">{isRegister ? '注册' : '登录'}名人堂</h2>

      {error && (
        <div className="card" style={{ background: '#ffebe9', marginBottom: 16, padding: 10, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="form-group">
        <label>邮箱</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
      </div>
      <div className="form-group">
        <label>密码</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少6位" />
      </div>
      {isRegister && (
        <div className="form-group">
          <label>昵称</label>
          <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="选填" />
        </div>
      )}
      <button className="btn btn-primary" onClick={handleSubmit} style={{ width: '100%', marginBottom: 12 }}>
        {isRegister ? '注册' : '登录'}
      </button>
      <button className="btn" onClick={() => { setIsRegister(!isRegister); setError('') }} style={{ width: '100%' }}>
        {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
      </button>
    </div>
  )
}

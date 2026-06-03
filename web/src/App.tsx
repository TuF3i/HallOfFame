import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import Quotes from './pages/Quotes'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Profile from './pages/Profile'

const API_BASE = '/api/v1'

export function getToken() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('access_token')
  if (token) {
    localStorage.setItem('access_token', token)
    window.history.replaceState({}, '', window.location.pathname)
  }
  const refresh = params.get('refresh_token')
  if (refresh) {
    localStorage.setItem('refresh_token', refresh)
  }
  return localStorage.getItem('access_token')
}

export function getRefreshToken() {
  return localStorage.getItem('refresh_token')
}

export function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers })
}

function App() {
  const navigate = useNavigate()
  const token = getToken()

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/login')
  }

  return (
    <>
      <nav className="navbar">
        <div className="container">
          <Link to="/" className="brand">名人堂</Link>
          <div>
            <Link to="/">言论</Link>
            {token && <Link to="/admin">管理</Link>}
            {token && <Link to="/profile">个人</Link>}
            {token ? (
              <button className="btn btn-danger" onClick={handleLogout}>退出</button>
            ) : (
              <Link to="/login" className="btn btn-primary">登录</Link>
            )}
          </div>
        </div>
      </nav>
      <div className="container">
        <Routes>
          <Route path="/" element={<Quotes />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </>
  )
}

export default App

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../App'

export default function Login() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = getToken()
    if (token) {
      navigate('/')
    }
  }, [navigate])

  const handleGitHubLogin = () => {
    window.location.href = '/api/v1/auth/github/login'
  }

  return (
    <div className="card text-center" style={{ maxWidth: 400, margin: '40px auto' }}>
      <h2 className="mb-4">登录名人堂</h2>
      <p className="mb-4" style={{ color: '#666' }}>
        使用 GitHub 账号登录
      </p>
      <button className="btn btn-primary" onClick={handleGitHubLogin} style={{ fontSize: 16, padding: '12px 24px' }}>
        通过 GitHub 登录
      </button>
    </div>
  )
}

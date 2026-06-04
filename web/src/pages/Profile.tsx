import { useEffect, useState } from 'react'
import { apiFetch } from '../App'

interface UserProfile {
  id: number
  email: string
  nickname: string
  role: string
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    apiFetch('/user/profile')
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(console.error)
  }, [])

  if (!profile) return <div className="card">加载中...</div>

  return (
    <div className="card" style={{ maxWidth: 500, margin: '0 auto' }}>
      <h2 className="mb-4">个人信息</h2>
      <div className="form-group">
        <label>昵称</label>
        <div>{profile.nickname}</div>
      </div>
      <div className="form-group">
        <label>邮箱</label>
        <div>{profile.email}</div>
      </div>
      <div className="form-group">
        <label>角色</label>
        <div>
          <span className={`badge badge-${profile.role}`}>{profile.role}</span>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { apiFetch } from '../App'

interface User {
  ID: number
  email: string
  nickname: string
  role: string
  created_at: string
}

interface WhitelistEntry {
  ID: number
  email: string
  added_by: number
  created_at: string
}

interface LoginLog {
  ID: number
  user_id: number
  ip: string
  success: boolean
  fail_reason: string
  created_at: string
}

type Tab = 'users' | 'whitelist' | 'logs'

export default function Admin() {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<User[]>([])
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([])
  const [logs, setLogs] = useState<LoginLog[]>([])
  const [logPage, setLogPage] = useState(1)
  const [logTotal, setLogTotal] = useState(0)
  const [newWhitelist, setNewWhitelist] = useState('')

  useEffect(() => {
    if (tab === 'users') {
      apiFetch('/admin/users').then(r => r.json()).then(d => setUsers(d.users || [])).catch(console.error)
    } else if (tab === 'whitelist') {
      apiFetch('/admin/whitelist').then(r => r.json()).then(d => setWhitelist(d.whitelist || [])).catch(console.error)
    } else if (tab === 'logs') {
      apiFetch(`/admin/login-logs?page=${logPage}&page_size=20`).then(r => r.json()).then(d => {
        setLogs(d.logs || [])
        setLogTotal(d.total || 0)
      }).catch(console.error)
    }
  }, [tab, logPage])

  const handleUpdateRole = async (id: number, role: string) => {
    try {
      await apiFetch(`/admin/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      })
      setUsers(users.map(u => u.ID === id ? { ...u, role } : u))
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddWhitelist = async () => {
    if (!newWhitelist) return
    try {
      const res = await apiFetch('/admin/whitelist', {
        method: 'POST',
        body: JSON.stringify({ email: newWhitelist }),
      })
      if (res.ok) {
        setNewWhitelist('')
        const d = await apiFetch('/admin/whitelist').then(r => r.json())
        setWhitelist(d.whitelist || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleRemoveWhitelist = async (id: number) => {
    if (!confirm('确定移除？')) return
    try {
      await apiFetch(`/admin/whitelist/${id}`, { method: 'DELETE' })
      setWhitelist(whitelist.filter(w => w.ID !== id))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div>
      <h2 className="mb-4">管理员后台</h2>
      <div className="card mb-4">
        <div className="flex gap-2">
          <button className={`btn ${tab === 'users' ? 'btn-primary' : ''}`} onClick={() => setTab('users')}>用户管理</button>
          <button className={`btn ${tab === 'whitelist' ? 'btn-primary' : ''}`} onClick={() => setTab('whitelist')}>白名单</button>
          <button className={`btn ${tab === 'logs' ? 'btn-primary' : ''}`} onClick={() => setTab('logs')}>登录日志</button>
        </div>
      </div>

      {tab === 'users' && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>邮箱</th>
                <th>昵称</th>
                <th>角色</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.ID}>
                  <td>{u.ID}</td>
                  <td>{u.email}</td>
                  <td>{u.nickname}</td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td>
                    <select
                      value={u.role}
                      onChange={e => handleUpdateRole(u.ID, e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5da' }}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                      <option value="banned">banned</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'whitelist' && (
        <div className="card">
          <div className="flex gap-2 mb-4">
            <input
              value={newWhitelist}
              onChange={e => setNewWhitelist(e.target.value)}
              placeholder="输入邮箱地址"
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5da', borderRadius: 6 }}
            />
            <button className="btn btn-primary" onClick={handleAddWhitelist}>添加</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>邮箱</th>
                <th>添加时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {whitelist.map(w => (
                <tr key={w.ID}>
                  <td>{w.ID}</td>
                  <td>{w.email}</td>
                  <td>{new Date(w.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => handleRemoveWhitelist(w.ID)}>
                      移除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'logs' && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>用户ID</th>
                <th>IP</th>
                <th>结果</th>
                <th>原因</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.ID}>
                  <td>{l.ID}</td>
                  <td>{l.user_id}</td>
                  <td>{l.ip}</td>
                  <td>
                    <span className={`badge ${l.success ? 'badge-user' : 'badge-banned'}`}>
                      {l.success ? '成功' : '失败'}
                    </span>
                  </td>
                  <td>{l.fail_reason || '-'}</td>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logTotal > 20 && (
            <div className="flex gap-2 mt-4" style={{ justifyContent: 'center' }}>
              <button className="btn" disabled={logPage <= 1} onClick={() => setLogPage(logPage - 1)}>上一页</button>
              <span style={{ padding: '8px 16px' }}>{logPage} / {Math.ceil(logTotal / 20)}</span>
              <button className="btn" disabled={logPage >= Math.ceil(logTotal / 20)} onClick={() => setLogPage(logPage + 1)}>下一页</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { apiFetch, getToken } from '../App'

interface Quote {
  id: string
  qq_group: string
  speaker: string
  content: string
  images: string[]
  is_featured: boolean
  created_by: number
  created_at: string
}

interface Group {
  id: string
  name: string
}

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [filter, setFilter] = useState({ qq_group: '', is_featured: '', page: 1 })
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ qq_group: '', speaker: '', content: '' })
  const token = getToken()

  const loadQuotes = () => {
    const params = new URLSearchParams()
    if (filter.qq_group) params.set('qq_group', filter.qq_group)
    if (filter.is_featured) params.set('is_featured', filter.is_featured)
    params.set('page', String(filter.page))
    params.set('page_size', String(pageSize))

    apiFetch('/quotes?' + params.toString())
      .then(res => res.json())
      .then(data => {
        setQuotes(data.quotes || [])
        setTotal(data.total || 0)
      })
      .catch(console.error)
  }

  useEffect(() => {
    loadQuotes()
  }, [filter])

  useEffect(() => {
    apiFetch('/groups')
      .then(res => res.json())
      .then(data => setGroups(data.groups || []))
      .catch(console.error)
  }, [])

  const handleCreate = async () => {
    if (!form.qq_group || !form.content) return
    try {
      const res = await apiFetch('/quotes', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ qq_group: '', speaker: '', content: '' })
        loadQuotes()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此言论？')) return
    try {
      await apiFetch(`/quotes/${id}`, { method: 'DELETE' })
      loadQuotes()
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleFeatured = async (id: string, current: boolean) => {
    try {
      await apiFetch(`/quotes/${id}/feature`, {
        method: 'PUT',
        body: JSON.stringify({ featured: !current }),
      })
      loadQuotes()
    } catch (e) {
      console.error(e)
    }
  }

  // Simple markdown rendering
  const renderContent = (content: string) => {
    return content
      .split('\n')
      .map((line, i) => <p key={i}>{line || <br />}</p>)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="flex-between mb-4">
        <h2>名人言论</h2>
        {token && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '取消' : '添加言论'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-4">
          <h3 className="mb-4">添加言论</h3>
          <div className="form-group">
            <label>QQ 群</label>
            <div className="flex gap-2">
              <input
                list="group-list"
                value={form.qq_group}
                onChange={e => setForm({ ...form, qq_group: e.target.value })}
                placeholder="群名称"
              />
              <datalist id="group-list">
                {groups.map(g => <option key={g.id} value={g.name} />)}
              </datalist>
            </div>
          </div>
          <div className="form-group">
            <label>发言人</label>
            <input value={form.speaker} onChange={e => setForm({ ...form, speaker: e.target.value })} placeholder="谁说的" />
          </div>
          <div className="form-group">
            <label>内容 (支持 Markdown)</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={handleCreate}>提交</button>
        </div>
      )}

      <div className="card mb-4">
        <div className="flex gap-2" style={{ alignItems: 'center' }}>
          <select value={filter.qq_group} onChange={e => setFilter({ ...filter, qq_group: e.target.value, page: 1 })}>
            <option value="">全部群</option>
            {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
          </select>
          <select value={filter.is_featured} onChange={e => setFilter({ ...filter, is_featured: e.target.value, page: 1 })}>
            <option value="">全部</option>
            <option value="true">精华</option>
            <option value="false">非精华</option>
          </select>
        </div>
      </div>

      {quotes.map(q => (
        <div key={q.id} className="card">
          <div className="flex-between mb-4">
            <div>
              <strong>{q.speaker || '匿名'}</strong>
              <span style={{ color: '#666', fontSize: 13, marginLeft: 8 }}>
                #{q.qq_group}
              </span>
              {q.is_featured && <span className="badge badge-owner" style={{ marginLeft: 8 }}>精华</span>}
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>
              {new Date(q.created_at).toLocaleDateString()}
              {token && (
                <span style={{ marginLeft: 8 }}>
                  <button
                    className="btn"
                    style={{ padding: '2px 8px', fontSize: 12 }}
                    onClick={() => handleToggleFeatured(q.id, q.is_featured)}
                  >
                    {q.is_featured ? '取消精华' : '设精华'}
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '2px 8px', fontSize: 12, marginLeft: 4 }}
                    onClick={() => handleDelete(q.id)}
                  >
                    删除
                  </button>
                </span>
              )}
            </div>
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {renderContent(q.content)}
          </div>
          {q.images && q.images.length > 0 && (
            <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
              {q.images.map((img, i) => (
                <img key={i} src={img} alt="" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 4 }} />
              ))}
            </div>
          )}
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex gap-2" style={{ justifyContent: 'center', marginTop: 16 }}>
          <button
            className="btn"
            disabled={filter.page <= 1}
            onClick={() => setFilter({ ...filter, page: filter.page - 1 })}
          >
            上一页
          </button>
          <span style={{ padding: '8px 16px' }}>{filter.page} / {totalPages}</span>
          <button
            className="btn"
            disabled={filter.page >= totalPages}
            onClick={() => setFilter({ ...filter, page: filter.page + 1 })}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Zap, Clock, Video, Trash2, History, Search, ChevronRight, Film, Users, X, LayoutDashboard, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// --- Tool Registry ---
const TOOLS = [
  { id: 'all', label: 'All Activity', icon: LayoutDashboard, color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', storageKey: null, apiSource: null, href: null, loadKey: null },
  { id: 'viral-clips', label: 'Viral Clips Maker', icon: Zap, color: '#10B981', bg: 'rgba(16,185,129,0.15)', storageKey: 'viralClipsHistory', apiSource: null, href: '/tools/viral-clips', loadKey: 'viralClipsLoadItem' },
  { id: 'lead-finder', label: 'Lead Finder', icon: Users, color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', storageKey: null, apiSource: '/api/lead-finder', href: '/tools/lead-finder', loadKey: null },
  { id: 'broll-finder', label: 'B-Roll Finder', icon: Film, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', storageKey: 'brollHistory', apiSource: null, href: '/tools/broll-finder', loadKey: null },
]

interface HistoryItem {
  id: string
  date: string
  toolId: string
  toolLabel: string
  toolColor: string
  toolBg: string
  youtubeUrl?: string
  clips?: any[]
  niche?: string      // lead finder
  leads?: any[]       // lead finder
  [key: string]: any
}

function groupByDate(items: HistoryItem[]) {
  const groups: Record<string, HistoryItem[]> = { Today: [], Yesterday: [], 'This Week': [], Older: [] }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const lastWeek = new Date(today); lastWeek.setDate(lastWeek.getDate() - 7)
  items.forEach(item => {
    const d = new Date(item.date)
    if (d >= today) groups['Today'].push(item)
    else if (d >= yesterday) groups['Yesterday'].push(item)
    else if (d >= lastWeek) groups['This Week'].push(item)
    else groups['Older'].push(item)
  })
  return groups
}

export default function HistoryPage() {
  const [activeTool, setActiveTool] = useState('all')
  const [allHistory, setAllHistory] = useState<HistoryItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      const items: HistoryItem[] = []

      // 1. LocalStorage sources (e.g. viral-clips)
      TOOLS.forEach(tool => {
        if (!tool.storageKey) return
        try {
          const saved = localStorage.getItem(tool.storageKey)
          if (saved) {
            JSON.parse(saved).forEach((item: any) => {
              items.push({
                ...item,
                toolId: tool.id,
                toolLabel: tool.label,
                toolColor: tool.color,
                toolBg: tool.bg,
                date: item.date || item.created_at,
              })
            })
          }
        } catch { }
      })

      // 2. API sources (e.g. lead-finder — stored in Supabase)
      await Promise.all(
        TOOLS.filter(t => t.apiSource).map(async tool => {
          try {
            const res = await fetch(`${tool.apiSource!}?t=${Date.now()}`, {
              cache: 'no-store',
              headers: {
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache'
              }
            })
            if (!res.ok) return
            const data = await res.json()
            const list = data.history || []
            list.forEach((item: any) => {
              items.push({
                ...item,
                toolId: tool.id,
                toolLabel: tool.label,
                toolColor: tool.color,
                toolBg: tool.bg,
                date: item.created_at || item.date,
              })
            })
          } catch { }
        })
      )

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setAllHistory(items)
      setLoading(false)
    }
    loadAll()
  }, [])

  const filtered = useMemo(() => {
    return allHistory.filter(item => {
      if (activeTool !== 'all' && item.toolId !== activeTool) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          item.toolLabel?.toLowerCase().includes(q) ||
          item.youtubeUrl?.toLowerCase().includes(q) ||
          item.niche?.toLowerCase().includes(q) ||
          item.clips?.some((c: any) => c.reason?.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [allHistory, activeTool, search])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])
  const totalItems = allHistory.length
  const activeTotalForTool = activeTool === 'all' ? totalItems : allHistory.filter(h => h.toolId === activeTool).length

  const deleteItem = async (id: string, toolId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return

    const tool = TOOLS.find(t => t.id === toolId)
    if (tool?.storageKey) {
      try {
        const saved = localStorage.getItem(tool.storageKey)
        if (saved) {
          const updated = JSON.parse(saved).filter((h: any) => h.id !== id)
          localStorage.setItem(tool.storageKey, JSON.stringify(updated))
        }
      } catch { }
    } else if (tool?.apiSource) {
      try {
        const res = await fetch(`${tool.apiSource}?id=${id}`, { method: 'DELETE' })
        if (!res.ok) {
          alert('Failed to delete item from the server.')
          return
        }
      } catch {
        alert('Network error when deleting item.')
        return
      }
    }
    setAllHistory(prev => prev.filter(h => h.id !== id))
  }

  const clearToolHistory = async (toolId: string) => {
    if (!window.confirm('Are you sure you want to clear this entire section? This action cannot be undone.')) {
      return
    }

    const tool = TOOLS.find(t => t.id === toolId)

    if (tool?.storageKey) {
      localStorage.removeItem(tool.storageKey)
    } else if (tool?.apiSource) {
      try {
        const res = await fetch(`${tool.apiSource}?id=all`, { method: 'DELETE' })
        if (!res.ok) {
          console.error('Failed to clear history from server')
          alert('Failed to clear history from the server. Please try again.')
          return
        }
      } catch (err) {
        console.error('Network error clearing history:', err)
        alert('Network error. Please try again.')
        return
      }
    }

    setAllHistory(prev => prev.filter(h => h.toolId !== toolId))
  }

  const openItem = (item: HistoryItem) => {
    const tool = TOOLS.find(t => t.id === item.toolId)
    if (!tool?.href) return
    if (tool.loadKey) {
      localStorage.setItem(tool.loadKey, JSON.stringify(item))
    }
    router.push(tool.href)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--background)', color: 'var(--foreground)' }}>

      {/* Sidebar */}
      <aside style={{ width: '260px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', paddingTop: '32px', position: 'fixed', top: 0, bottom: 0, left: 0, overflowY: 'auto', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)', zIndex: 50 }}>

        {/* Logo */}
        <div style={{ padding: '0 20px 12px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="/lengoailogo.png" alt="Logo" style={{ height: '42px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          </Link>
        </div>

        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Activity History</h2>
        </div>

        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {TOOLS.map(tool => {
            const count = tool.id === 'all' ? totalItems : allHistory.filter(h => h.toolId === tool.id).length
            const isActive = activeTool === tool.id
            return (
              <button key={tool.id} onClick={() => setActiveTool(tool.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '4px', background: isActive ? tool.bg : 'transparent', color: isActive ? tool.color : 'var(--muted)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: isActive ? tool.bg : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <tool.icon size={16} color={isActive ? tool.color : 'var(--muted)'} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: isActive ? 700 : 500, flex: 1, textAlign: 'left' }}>{tool.label}</span>
                {count > 0 && (
                  <span style={{ fontSize: '12px', background: isActive ? tool.bg : 'rgba(255,255,255,0.06)', color: isActive ? tool.color : 'var(--muted)', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>{count}</span>
                )}
              </button>
            )
          })}
        </nav>

        {activeTool !== 'all' && activeTotalForTool > 0 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => clearToolHistory(activeTool)}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#F87171', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.05)'}>
              <Trash2 size={14} /> Clear Section
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main style={{ marginLeft: '260px', flex: 1, padding: '100px 48px 60px', minHeight: '100vh' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(139,92,246,0.15)', padding: '14px', borderRadius: '18px', color: '#8B5CF6', display: 'flex' }}>
              <History size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: '#fff' }}>Activity History</h1>
              <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '15px' }}>
                {loading ? 'Loading...' : `${activeTotalForTool} item${activeTotalForTool !== 1 ? 's' : ''} · ${activeTool === 'all' ? 'All tools' : TOOLS.find(t => t.id === activeTool)?.label}`}
              </p>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: '440px' }}>
            <Search size={18} color="var(--muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search history..."
              style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '80px', color: 'var(--muted)' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '18px', fontWeight: 600 }}>Loading your history...</span>
          </div>
        )}

        {/* Groups */}
        {!loading && Object.entries(grouped).map(([groupName, items]) => {
          if (items.length === 0) return null
          return (
            <div key={groupName} style={{ marginBottom: '56px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0 }}>{groupName}</h2>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
                {items.map(item => {
                  const tool = TOOLS.find(t => t.id === item.toolId)
                  const hasLink = !!tool?.href
                  return (
                    <motion.div key={item.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -4 }}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '24px', position: 'relative', cursor: hasLink ? 'pointer' : 'default', transition: 'border-color 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
                      onClick={() => openItem(item)}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = `${item.toolColor}44`}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'}
                    >
                      {/* Tool badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <div style={{ background: item.toolBg, padding: '6px', borderRadius: '8px', display: 'flex' }}>
                          {tool && <tool.icon size={14} color={item.toolColor} />}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: item.toolColor }}>{item.toolLabel}</span>
                      </div>

                      {/* Content preview */}
                      {item.niche && (
                        <p style={{ margin: '0 0 10px', color: '#fff', fontWeight: 700, fontSize: '15px' }}>"{item.niche}"</p>
                      )}
                      {item.inputText && (
                        <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: '14px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          "{item.inputText}{item.inputText.length >= 120 ? '...' : ''}"
                        </p>
                      )}
                      {item.youtubeUrl && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                          <Video size={13} color="#EF4444" />
                          <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>YouTube Source</span>
                        </div>
                      )}

                      {/* Date */}
                      <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} />
                        {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>

                      {/* Stats badges */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {item.clips && (
                          <span style={{ fontSize: '12px', background: 'rgba(16,185,129,0.12)', color: '#6EE7B7', padding: '5px 12px', borderRadius: '100px', fontWeight: 700 }}>
                            {item.clips.length} Clips
                          </span>
                        )}
                        {item.leads && (
                          <span style={{ fontSize: '12px', background: 'rgba(59,130,246,0.12)', color: '#93C5FD', padding: '5px 12px', borderRadius: '100px', fontWeight: 700 }}>
                            {item.leads.length} Leads
                          </span>
                        )}
                        {item.brolls && (
                          <span style={{ fontSize: '12px', background: 'rgba(245,158,11,0.12)', color: '#FCD34D', padding: '5px 12px', borderRadius: '100px', fontWeight: 700 }}>
                            {item.brolls.length} B-Rolls
                          </span>
                        )}
                      </div>

                      {hasLink && <ChevronRight size={16} color="var(--muted)" style={{ position: 'absolute', bottom: '24px', right: '44px' }} />}

                      {/* Delete */}
                      <button onClick={e => { e.stopPropagation(); deleteItem(item.id, item.toolId) }}
                        style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.15)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'transparent' }}>
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px 40px', color: 'var(--muted)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <History size={80} style={{ margin: '0 auto 28px', opacity: 0.1 }} />
              <h3 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 12px', color: '#fff' }}>
                {search ? 'No results found' : 'No history yet'}
              </h3>
              <p style={{ fontSize: '16px', marginBottom: '32px' }}>
                {search ? `No activity matches "${search}"` : 'Start using tools to see your activity here.'}
              </p>
              {!search && (
                <Link href="/#tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: '#fff', padding: '14px 28px', borderRadius: '100px', textDecoration: 'none', fontWeight: 700, fontSize: '15px' }}>
                  <Zap size={18} /> Explore Tools
                </Link>
              )}
            </motion.div>
          </div>
        )}
      </main>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

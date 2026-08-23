'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Search, Copy, Check, Users, ShieldAlert,
  Loader2, Mail, ExternalLink, Download, Filter, Globe, Calendar, Award, Trash2
} from 'lucide-react'
import Link from 'next/link'
import { generateGeminiContent } from '@/app/actions/gemini'

const InstagramIcon = ({ size = 24, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

const TwitterIcon = ({ size = 24, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
)

interface CreatorLead {
  channelId: string
  name: string
  thumbnail: string
  subscribers: number
  totalViews: number
  videoCount: number
  country: string
  description: string
  email: string | null
  instagram: string | null
  twitter: string | null
  channelUrl: string
  lastUpload: string | null
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IE', name: 'Ireland' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'MA', name: 'Morocco' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'QA', name: 'Qatar' },
  { code: 'KW', name: 'Kuwait' },
]

export default function CreatorLeadFinderPage() {
  const [mounted, setMounted] = useState(false)
  const [niche, setNiche] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [results, setResults] = useState<CreatorLead[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // History State
  const [history, setHistory] = useState<any[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  // Filters State
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [minSubs, setMinSubs] = useState('1000')
  const [maxSubs, setMaxSubs] = useState('')
  const [lastUploadDays, setLastUploadDays] = useState('90')
  const [onlyWithEmail, setOnlyWithEmail] = useState(false)
  const [onlyWithSocial, setOnlyWithSocial] = useState(false)

  const loadHistory = async () => {
    try {
      setIsHistoryLoading(true)
      const res = await fetch('/api/lead-finder?t=' + Date.now(), {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      })
      if (res.ok) {
        const data = await res.json()
        setHistory(data.history || [])
      }
    } catch (e) {
      console.warn('Failed to load history', e)
    } finally {
      setIsHistoryLoading(false)
    }
  }

  const handleDeleteHistory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // prevent triggering the card click (load results)
    // Optimistic update — remove from UI immediately
    setHistory(prev => prev.filter(h => h.id !== id))
    try {
      await fetch(`/api/lead-finder?id=${id}`, { method: 'DELETE' })
    } catch (err) {
      console.warn('Failed to delete history item', err)
      loadHistory() // re-fetch if delete failed
    }
  }

  useEffect(() => {
    setMounted(true)
    loadHistory()
  }, [])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const exportToCSV = () => {
    if (results.length === 0) return
    const headers = ['Name', 'Channel URL', 'Subscribers', 'Views', 'Videos', 'Country', 'Email', 'Instagram', 'Twitter', 'Last Upload']
    const rows = results.map(r => [
      `"${r.name.replace(/"/g, '""')}"`,
      r.channelUrl,
      r.subscribers,
      r.totalViews,
      r.videoCount,
      r.country || 'N/A',
      r.email || '',
      r.instagram ? `@${r.instagram}` : '',
      r.twitter ? `@${r.twitter}` : '',
      r.lastUpload ? new Date(r.lastUpload).toLocaleDateString() : 'N/A'
    ])

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `creator_leads_${niche.replace(/\s+/g, '_') || 'export'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSearch = async () => {
    if (!niche.trim()) {
      setError('Please enter a niche or search query.')
      return
    }

    setError(null)
    setIsLoading(true)
    setResults([])

    try {
      // Step 1: Expand keywords using Gemini
      setStatus('AI is generating search keywords...')

      const systemPrompt = `You are a YouTube search strategist helping discover independent content creators in a specific niche. 
Your goal is to generate exactly 6 highly effective, DISTINCT YouTube search queries to find active channels for outreach.

CRITICAL RULES FOR KEYWORD MIX:
1. Provide a mix of broad and specific queries:
   - 2 keywords should be relatively BROAD (2-3 words) to capture a wide net of creators in this niche (e.g., "[niche] gameplay", "[niche] review").
   - 4 keywords should be SPECIFIC/LONG-TAIL (3-5 words) reflecting current YouTube trends or common title formats in this niche (e.g., "how I built [niche]", "surviving 100 days in [niche]").
2. Do NOT focus on "podcasts" unless the provided niche explicitly includes the word "podcast" or "interview".
3. The generated queries must help filter OUT corporate channels (like Vevo, News networks) and filter IN real, independent creators.
4. Return ONLY a valid JSON array containing exactly 6 string elements. No markdown.`

      const userPrompt = `Niche: "${niche.trim()}"`
      
      const config = {
        temperature: 0.7,
        responseMimeType: 'application/json',
      }

      let keywords = [niche.trim()]
      try {
        const rawResponse = await generateGeminiContent(systemPrompt, userPrompt, config)
        
        const cleanResponse = rawResponse.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
        const parsed = JSON.parse(cleanResponse)
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          keywords = parsed
        }
      } catch (geminiErr) {
        console.warn('Gemini keyword generation failed, me basic niche.', geminiErr)
      }

      setStatus(`Searching YouTube API for creators using ${keywords.length} keywords...`)

      // Step 2: Fetch leads from API route
      const response = await fetch('/api/lead-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: niche.trim(),
          keywords,
          filters: {
            countries: selectedCountries.length > 0 ? selectedCountries : undefined,
            minSubs: minSubs ? parseInt(minSubs, 10) : undefined,
            maxSubs: maxSubs ? parseInt(maxSubs, 10) : undefined,
            lastUploadDays: lastUploadDays ? parseInt(lastUploadDays, 10) : undefined,
          }
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to fetch creator leads.')
      }

      const data = await response.json()
      setResults(data.leads || [])

      if (!data.leads || data.leads.length === 0) {
        setError('No creators found matching the current criteria. Try expanding filters.')
      }

      // Refresh search history list in background
      loadHistory()
    } catch (e: any) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setIsLoading(false)
      setStatus('')
    }
  }

  if (!mounted) return null

  const ACCENT = '#3F59E7'
  const ACCENT_DIM = 'rgba(63,89,231,0.12)'
  const ACCENT_BORDER = 'rgba(63,89,231,0.25)'

  // Client-side quick filter logic
  const filteredResults = results.filter(r => {
    if (onlyWithEmail && !r.email) return false
    if (onlyWithSocial && !r.instagram && !r.twitter) return false
    return true
  })

  return (
    <main style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>
      {/* Background Gradient */}
      <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100vw', height: '500px', background: `radial-gradient(ellipse at top, rgba(63,89,231,0.07) 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />

      <div className="container-xl" style={{ maxWidth: '1000px', position: 'relative', zIndex: 1 }}>

        {/* Back Link */}
        <Link href="/#tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
          <ArrowLeft size={16} /> Back to Tools
        </Link>

        {/* Page Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: ACCENT_DIM, border: `1px solid ${ACCENT_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={24} color={ACCENT} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 600, letterSpacing: '-1px', color: '#fff', margin: 0 }}>
                Creator <span style={{ color: ACCENT }}>Lead Finder</span>
              </h1>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.25)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Free Beta Testing
              </span>
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', maxWidth: '640px', lineHeight: 1.6, margin: 0 }}>
            Find targeted creators in any niche. Get their subscriber counts, contact emails, social profiles, and country from their channels and latest uploads.
          </p>
        </div>

        {/* Input & Main Controls */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
              <Search size={18} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={niche}
                onChange={e => setNiche(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                placeholder="Niche (e.g., 'moroccan food', 'tech reviews', 'gaming')"
                style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.01)', color: '#fff', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = ACCENT}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              style={{ padding: '14px 28px', borderRadius: '8px', border: 'none', background: isLoading ? 'rgba(255,255,255,0.05)' : ACCENT, color: '#fff', fontSize: '15px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(63,89,231,0.25)' }}
            >
              {isLoading ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Searching...</>
              ) : (
                <><Search size={18} />Find Creators</>
              )}
            </button>
          </div>

          {/* Advanced Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>

            {/* Countries Filter (Multi-select Pills) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Globe size={13} color={ACCENT} /> Countries (Select multiple - global search if empty)
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COUNTRIES.map(c => {
                  const isSelected = selectedCountries.includes(c.code)
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCountries(selectedCountries.filter(x => x !== c.code))
                        } else {
                          setSelectedCountries([...selectedCountries, c.code])
                        }
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '100px',
                        border: '1px solid',
                        borderColor: isSelected ? ACCENT : 'rgba(255,255,255,0.08)',
                        background: isSelected ? ACCENT_DIM : 'rgba(255,255,255,0.02)',
                        color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {c.name}
                    </button>
                  )
                })}
                {selectedCountries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCountries([])}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '100px',
                      border: '1px solid transparent',
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Min Subs */}
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Users size={12} style={{ marginRight: '4px', display: 'inline' }} /> Min Subs
              </label>
              <select
                value={minSubs}
                onChange={e => setMinSubs(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(10,12,42,0.95)', color: '#fff', fontSize: '13px', outline: 'none' }}
              >
                <option value="">Any</option>
                <option value="1000">1,000+</option>
                <option value="5000">5,000+</option>
                <option value="10000">10,000+</option>
                <option value="50000">50,000+</option>
                <option value="100000">100,000+</option>
                <option value="500000">500,000+</option>
                <option value="1000000">1,000,000+</option>
              </select>
            </div>

            {/* Max Subs */}
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Max Subs
              </label>
              <select
                value={maxSubs}
                onChange={e => setMaxSubs(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(10,12,42,0.95)', color: '#fff', fontSize: '13px', outline: 'none' }}
              >
                <option value="">Any</option>
                <option value="10000">10,000</option>
                <option value="50000">50,000</option>
                <option value="100000">100,000</option>
                <option value="500000">500,000</option>
                <option value="1000000">1,000,000</option>
                <option value="5000000">5,000,000</option>
              </select>
            </div>

            {/* Last Upload */}
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Calendar size={12} style={{ marginRight: '4px', display: 'inline' }} /> Last Video Upload
              </label>
              <select
                value={lastUploadDays}
                onChange={e => setLastUploadDays(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(10,12,42,0.95)', color: '#fff', fontSize: '13px', outline: 'none' }}
              >
                <option value="">Any Time</option>
                <option value="30">Within 30 Days</option>
                <option value="90">Within 90 Days</option>
                <option value="180">Within 180 Days</option>
                <option value="365">Within 1 Year</option>
              </select>
            </div>

          </div>
        </div>

        {/* Status Indicator */}
        {isLoading && status && (
          <div style={{ textAlign: 'center', margin: '20px 0', color: 'var(--muted)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Loader2 size={16} className="animate-spin" /> {status}
          </div>
        )}

        {/* Error Messages */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '14px 18px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
              <ShieldAlert size={18} />{error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        {filteredResults.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: 0 }}>
                Leads Found ({filteredResults.length})
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={exportToCSV}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>

            {/* Quick toggles */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={onlyWithEmail}
                  onChange={e => setOnlyWithEmail(e.target.checked)}
                  style={{ accentColor: ACCENT }}
                />
                Only with Email
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={onlyWithSocial}
                  onChange={e => setOnlyWithSocial(e.target.checked)}
                  style={{ accentColor: ACCENT }}
                />
                Only with Instagram/Twitter
              </label>
            </div>

            {/* Leads List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredResults.map((lead) => (
                <div key={lead.channelId} style={{ display: 'flex', gap: '20px', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', flexWrap: 'wrap', alignItems: 'flex-start' }}>

                  {/* Thumbnail */}
                  {lead.thumbnail ? (
                    <img
                      src={lead.thumbnail}
                      alt={lead.name}
                      style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}
                      onError={(e) => {
                        const target = e.currentTarget
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          const fallback = document.createElement('div')
                          fallback.style.cssText = 'width:60px;height:60px;border-radius:50%;background:rgba(63,89,231,0.2);border:1px solid rgba(63,89,231,0.3);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#94A2F2;flex-shrink:0'
                          fallback.textContent = lead.name.charAt(0).toUpperCase()
                          parent.insertBefore(fallback, target)
                        }
                      }}
                    />
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(63,89,231,0.2)', border: '1px solid rgba(63,89,231,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, color: '#94A2F2', flexShrink: 0 }}>
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Channel details */}
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>{lead.name}</h3>
                      <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' }}>
                        {lead.country || 'Global'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span><strong>{lead.subscribers.toLocaleString()}</strong> Subscribers</span>
                      <span><strong>{lead.videoCount.toLocaleString()}</strong> Videos</span>
                      {lead.lastUpload && (
                        <span>Last Upload: <strong>{new Date(lead.lastUpload).toLocaleDateString()}</strong></span>
                      )}
                    </div>

                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                      {lead.description || 'No channel description provided.'}
                    </p>

                    {/* Contacts & Socials */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {lead.email ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(63,89,231,0.08)', border: '1px solid rgba(63,89,231,0.2)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', color: '#94A2F2' }}>
                          <Mail size={13} />
                          <span>{lead.email}</span>
                          <button
                            onClick={() => handleCopy(lead.email!)}
                            style={{ background: 'transparent', border: 'none', color: copiedText === lead.email ? '#10B981' : 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', padding: 0 }}
                          >
                            {copiedText === lead.email ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                          <Mail size={13} />
                          <span>No Email Found</span>
                        </div>
                      )}

                      {lead.instagram && (
                        <a
                          href={`https://instagram.com/${lead.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(236, 72, 153, 0.08)', border: '1px solid rgba(236, 72, 153, 0.2)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', color: '#f472b6', textDecoration: 'none' }}
                        >
                          <InstagramIcon size={13} />
                          <span>@{lead.instagram}</span>
                        </a>
                      )}

                      {lead.twitter && (
                        <a
                          href={`https://x.com/${lead.twitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', color: '#fff', textDecoration: 'none' }}
                        >
                          <TwitterIcon size={13} />
                          <span>@{lead.twitter}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ flexShrink: 0 }}>
                    <a
                      href={lead.channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '12px', fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    >
                      Visit Channel <ExternalLink size={12} />
                    </a>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {/* History List Section */}
        {history.length > 0 && (
          <div style={{ marginTop: '56px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={18} color={ACCENT} /> Search History
            </h2>
            {isHistoryLoading && history.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading history...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setNiche(item.niche)
                      setResults(item.leads || [])
                      window.scrollTo({ top: 400, behavior: 'smooth' })
                    }}
                    style={{
                      padding: '18px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.01)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(63,89,231,0.3)'
                      e.currentTarget.style.background = 'rgba(63,89,231,0.02)'
                      const btn = e.currentTarget.querySelector('.del-btn') as HTMLElement
                      if (btn) btn.style.opacity = '1'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                      e.currentTarget.style.background = 'rgba(255,255,255,0.01)'
                      const btn = e.currentTarget.querySelector('.del-btn') as HTMLElement
                      if (btn) btn.style.opacity = '0'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>
                        "{item.niche}"
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                        <button
                          className="del-btn"
                          onClick={(e) => handleDeleteHistory(e, item.id)}
                          title="Delete this history"
                          style={{
                            opacity: 0,
                            transition: 'opacity 0.15s',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            borderRadius: '5px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3px 5px',
                            flexShrink: 0,
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.2)'
                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {item.leads?.length || 0} creators found
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </main>
  )
}

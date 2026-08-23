'use client'

import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, Copy, Check, AlertCircle, TrendingUp, Zap, Clock, Trash2, Monitor, Smartphone, Download, Video, CheckCircle2, PlaySquare, Film, Link as LinkIcon, Type, Maximize, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

// Platform icons not in this version of lucide-react
const YoutubeIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)
const TwitchIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
  </svg>
)
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getUserTokens } from '@/app/actions/tokens'

// --- Types ---
interface Clip {
  clipNumber: number
  start: string | null
  end: string | null
  score: number
  type: string
  title: string
}

interface HistoryItem {
  id: string
  date: string
  fileName: string | null
  youtubeUrl: string | null
  transcriptPreview: string
  durationFormat: 'reel' | 'youtube'
  clips: Clip[]
}

interface JobStatus {
  status: 'idle' | 'processing' | 'done' | 'error'
  progress: number
  jobId?: string
  videoBlobUrl?: string
  outputName?: string
  error?: string
}

const TYPE_COLORS: Record<string, string> = {
  Story: '#6A7DED',
  Funny: '#F59E0B',
  Emotional: '#EC4899',
  Unexpected: '#8B5CF6',
  Opinion: '#3F59E7',
  Educational: '#10B981',
  Controversial: '#EF4444',
  Segment: '#3B82F6' // for long youtube segments
}

// --- Helper Functions ---
function detectTimestamps(text: string): boolean {
  return /\d{1,2}:\d{2}:\d{2}/.test(text) || /\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2},\d{3}/.test(text) || /\[\d{2}:\d{2}:\d{2}\]/.test(text)
}

function friendlyError(raw: string): string {
  if (!raw) return 'Processing failed. Please try again.'
  const r = raw.toLowerCase()
  if (r.includes('sign in') || r.includes('age') || r.includes('unavailable') || r.includes('private'))
    return 'This video is unavailable or age-restricted. Try a different URL.'
  if (r.includes('403') || r.includes('forbidden'))
    return 'YouTube blocked the request (403). Try again in a moment.'
  if (r.includes('429') || r.includes('too many'))
    return 'Too many requests to YouTube. Wait a minute and try again.'
  if (r.includes('youtube download failed'))
    return raw.replace('YouTube download failed: ', '')
  if (r.includes('no such file') || r.includes('not found'))
    return 'FFmpeg could not find the downloaded video. Please retry.'
  if (r.includes('invalid data') || r.includes('moov atom'))
    return 'Video format issue — try a different quality or URL.'
  if (r.includes('ffmpeg'))
    return 'FFmpeg encoding failed. Check timestamps and try again.'
  return raw.length > 120 ? raw.slice(0, 120) + '…' : raw
}

function ViralClipsInner() {
  const router = useRouter()
  const [tokens, setTokens] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Step 1: Configuration
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [streamContext, setStreamContext] = useState('')
  const [showContext, setShowContext] = useState(false)
  const [durationFormat, setDurationFormat] = useState<'reel' | 'youtube'>('reel')
  const [vidFormat, setVidFormat] = useState<'16:9' | '9:16' | '1:1'>('9:16')
  const [cropX, setCropX] = useState(0.5) // 0 to 1

  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const updateCropX = useCallback((clientX: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const w = vidFormat === '9:16' ? 0.3164 : 0.5625
    const thumbWidthPx = w * rect.width

    let left = clientX - rect.left - (thumbWidthPx / 2)
    const maxLeft = rect.width - thumbWidthPx
    if (left < 0) left = 0
    if (left > maxLeft) left = maxLeft

    setCropX(maxLeft === 0 ? 0.5 : left / maxLeft)
  }, [vidFormat])

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    updateCropX(e.clientX)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) updateCropX(e.clientX)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  // Step 2: Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeStep, setAnalyzeStep] = useState('')
  const [clips, setClips] = useState<Clip[]>([])
  const [error, setError] = useState('')

  // Step 3: Selection & Batch Processing
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showGenerating, setShowGenerating] = useState(false)
  const [batchJobs, setBatchJobs] = useState<Record<number, JobStatus>>({})
  const pollingIntervals = useRef<Record<number, NodeJS.Timeout>>({})
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    getUserTokens().then(t => setTokens(t))
    const saved = localStorage.getItem('viralClipsHistory')
    if (saved) {
      try { setHistory(JSON.parse(saved)) } catch (e) { }
    }
    // Load item if navigated from Navbar history panel
    const pendingLoad = localStorage.getItem('viralClipsLoadItem')
    if (pendingLoad) {
      try {
        const item = JSON.parse(pendingLoad)
        setClips(item.clips || [])
        setYoutubeUrl(item.youtubeUrl || '')
        setStreamContext(item.streamContext || '')
        if (item.streamContext) setShowContext(true)
        if (item.durationFormat) setDurationFormat(item.durationFormat)
        setSelectedIndices([])
        setBatchJobs({})
      } catch { }
      localStorage.removeItem('viralClipsLoadItem')
    }
    return () => {
      Object.values(pollingIntervals.current).forEach(clearInterval)
    }
  }, [])

  const handleAnalyze = async () => {
    if (!youtubeUrl.trim()) { setError('Please provide a YouTube URL.'); return }
    if (tokens === null) { setError('Please log in to use this tool.'); return }

    setIsAnalyzing(true); setError(''); setClips([]); setSelectedIndices([]); setBatchJobs({})
    Object.values(pollingIntervals.current).forEach(clearInterval)
    pollingIntervals.current = {}

    let finalTranscript = ''
    let hasTimestamps = false

    try {
      setAnalyzeStep('Fetching transcript...')
      const res = await fetch('/api/youtube-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch transcript')
      finalTranscript = data.transcript
      hasTimestamps = detectTimestamps(finalTranscript)

      setAnalyzeStep(durationFormat === 'youtube' ? 'Segmenting video topics...' : 'Finding viral clips...')
      const analysisRes = await fetch('/api/viral-clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: finalTranscript, numClips: 10, durationFormat, hasTimestamps, streamContext }),
      })
      const analysisData = await analysisRes.json()
      if (!analysisRes.ok) throw new Error(analysisData.error || 'Analysis failed')
      setClips(analysisData.clips || [])

      if (analysisData.clips && analysisData.clips.length > 0) {
        // Play notification sound
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
          const playTone = (freq: number, start: number, dur: number) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.frequency.value = freq
            osc.type = 'sine'
            gain.gain.setValueAtTime(0.3, ctx.currentTime + start)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
            osc.start(ctx.currentTime + start)
            osc.stop(ctx.currentTime + start + dur)
          }
          playTone(523, 0, 0.15)    // C5
          playTone(659, 0.15, 0.15)  // E5
          playTone(784, 0.3, 0.3)   // G5
        } catch { }

        const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          fileName: null,
          youtubeUrl,
          transcriptPreview: finalTranscript.substring(0, 50) + '...',
          durationFormat,
          clips: analysisData.clips,
        }
        setHistory(prev => {
          const updated = [newHistoryItem, ...prev].slice(0, 10)
          localStorage.setItem('viralClipsHistory', JSON.stringify(updated))
          return updated
        })
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsAnalyzing(false)
      setAnalyzeStep('')
    }
  }


  const toggleSelection = (idx: number) => {
    setSelectedIndices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    )
  }

  const generateClip = async (idx: number) => {
    const clip = clips[idx]
    if (!clip.start || !clip.end) {
      setBatchJobs(prev => ({ ...prev, [idx]: { status: 'error', progress: 0, error: 'Missing timestamps' } }))
      return
    }
    setBatchJobs(prev => ({ ...prev, [idx]: { status: 'processing', progress: 0 } }))

    const fd = new FormData()
    fd.append('youtubeUrl', youtubeUrl.trim())
    fd.append('start', clip.start)
    fd.append('end', clip.end)
    fd.append('format', vidFormat)
    if (vidFormat !== '16:9') {
      fd.append('cropX', cropX.toString())
    }

    try {
      const res = await fetch('/api/clip-maker', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')

      setBatchJobs(prev => ({ ...prev, [idx]: { ...prev[idx], jobId: data.jobId } }))

      return new Promise<void>((resolve) => {
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/clip-maker/status/${data.jobId}`)
            const statusData = await statusRes.json()
            if (statusData.status === 'done') {
              clearInterval(pollInterval)
              setBatchJobs(prev => ({
                ...prev,
                [idx]: {
                  ...prev[idx],
                  status: 'done',
                  progress: 100,
                  videoBlobUrl: `/api/clip-maker/download/${data.jobId}`,
                  outputName: statusData.outputName || 'clip.mp4'
                }
              }))
              resolve()
            } else if (statusData.status === 'error') {
              clearInterval(pollInterval)
              setBatchJobs(prev => ({ ...prev, [idx]: { ...prev[idx], status: 'error', error: friendlyError(statusData.error || '') } }))
              resolve()
            } else {
              setBatchJobs(prev => ({ ...prev, [idx]: { ...prev[idx], status: 'processing', progress: statusData.progress || 0 } }))
            }
          } catch {
            // Ignore network errors and retry on next tick
          }
        }, 2000)
        pollingIntervals.current[idx] = pollInterval
      })
    } catch (err: any) {
      setBatchJobs(prev => ({ ...prev, [idx]: { status: 'error', progress: 0, error: err.message || 'Request failed' } }))
    }
  }

  const playDoneSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523, ctx.currentTime)
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15)
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.8)
    } catch { }
  }

  const handleGenerateBatch = async () => {
    if (selectedIndices.length === 0) return
    setIsGenerating(true)
    setShowGenerating(true)

    const initialJobs = { ...batchJobs }
    for (const idx of selectedIndices) {
      if (!initialJobs[idx]) {
        initialJobs[idx] = { status: 'idle', progress: 0 }
      }
    }
    setBatchJobs(initialJobs)

    const promises = selectedIndices.map(async (idx, i) => {
      // Stagger the initial API calls by 500ms each to prevent Supabase burst rate limits, 
      // but keep the actual generation running in parallel.
      await new Promise(resolve => setTimeout(resolve, i * 500))
      return generateClip(idx)
    })

    await Promise.all(promises)
    setIsGenerating(false)
    playDoneSound()
    // Scroll to results
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
  }

  const loadHistoryItem = (item: HistoryItem) => {
    setClips(item.clips)
    setDurationFormat(item.durationFormat)
    setYoutubeUrl(item.youtubeUrl || '')
    setSelectedIndices([])
    setBatchJobs({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDownloadAll = async () => {
    const successfulJobs = selectedIndices
      .map((idx, i) => ({ job: batchJobs[idx], clipNum: i + 1 }))
      .filter(({ job }) => job?.status === 'done' && job.jobId)

    if (successfulJobs.length === 0) return

    // Download each clip individually with a small delay
    for (const { job, clipNum } of successfulJobs) {
      const a = document.createElement('a')
      a.href = `/api/clip-maker/download/${job.jobId}`
      a.download = `clip_${clipNum}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // Small delay so browser can register each download
      await new Promise(resolve => setTimeout(resolve, 600))
    }
  }

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id)
      localStorage.setItem('viralClipsHistory', JSON.stringify(updated))
      return updated
    })
  }

  if (!mounted) return null

  return (
    <main style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%,-50%)', width: '80vw', height: '500px', background: 'radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 60%)', filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div className="container-xl" style={{ maxWidth: '1000px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: '60px', textAlign: 'center' }}>
          <Link href="/#tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '32px', fontSize: '15px', fontWeight: 600 }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
            <ArrowLeft size={18} /> Back to Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(109,40,217,0.2))', border: '1px solid rgba(139,92,246,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(139,92,246,0.3)' }}>
              <Zap size={36} color="#8B5CF6" />
            </div>
            <h1 style={{ fontSize: 'clamp(40px,6vw,56px)', fontWeight: 800, letterSpacing: '-1px', background: 'linear-gradient(135deg, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              Smart <span style={{ color: '#8B5CF6', WebkitTextFillColor: '#8B5CF6' }}>Clips Maker</span>
            </h1>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '20px', maxWidth: '600px', margin: '0 auto' }}>
            Turn any YouTube stream into engaging shorts or long-form highlights instantly.
          </p>
        </div>

        {/* STEP 1: Link Input (Separate Block) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '40px', marginBottom: '32px', backdropFilter: 'blur(10px)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LinkIcon size={24} color="#EF4444" />
            </div>
            <div>
              <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}>1. Paste Stream Link</h2>
              <p style={{ color: 'var(--muted)', fontSize: '15px', margin: 0 }}>Enter the YouTube URL you want to process</p>
            </div>
          </div>
          <input
            value={youtubeUrl}
            onChange={e => {
              setYoutubeUrl(e.target.value)
              if (e.target.value) { setClips([]); setSelectedIndices([]); setBatchJobs({}) }
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            style={{ width: '100%', padding: '24px 28px', borderRadius: '18px', background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '18px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', transition: 'all 0.3s' }}
            onFocus={e => { e.target.style.borderColor = '#8B5CF6'; e.target.style.boxShadow = '0 0 20px rgba(139,92,246,0.2)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
          />



          {!showContext ? (
            <button onClick={() => setShowContext(true)}
              style={{ marginTop: '16px', background: 'transparent', border: 'none', color: 'var(--muted)', padding: '8px 0', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#8B5CF6' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)' }}
            >
              <Film size={16} /> + Add Stream Context (Optional)
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 24 }} style={{ overflow: 'hidden' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Film size={16} color="#8B5CF6" />
                    <h3 style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 600, margin: 0 }}>Stream Context</h3>
                    <span style={{ fontSize: '13px', color: 'var(--muted)' }}>(Optional)</span>
                  </div>
                  <button onClick={() => { setShowContext(false); setStreamContext(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                    title="Remove context">
                    <Trash2 size={16} />
                  </button>
                </div>
                <input
                  value={streamContext}
                  onChange={e => setStreamContext(e.target.value)}
                  placeholder="e.g. Valorant game, looking for Aces and funny moments"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'all 0.3s' }}
                  onFocus={e => { e.target.style.borderColor = '#8B5CF6'; e.target.style.boxShadow = '0 0 15px rgba(139,92,246,0.15)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* STEP 2: Content Type (Separate Block) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '40px', marginBottom: '32px', backdropFilter: 'blur(10px)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Type size={24} color="#3B82F6" />
            </div>
            <div>
              <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}>2. Content Type</h2>
              <p style={{ color: 'var(--muted)', fontSize: '15px', margin: 0 }}>Choose the style of clips you want</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <button onClick={() => setDurationFormat('reel')}
              style={{ padding: '32px 24px', borderRadius: '20px', border: durationFormat === 'reel' ? '3px solid #3B82F6' : '3px solid rgba(255,255,255,0.05)', background: durationFormat === 'reel' ? 'rgba(59,130,246,0.1)' : 'rgba(0,0,0,0.2)', color: durationFormat === 'reel' ? '#fff' : 'var(--muted)', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: durationFormat === 'reel' ? '0 10px 30px rgba(59,130,246,0.2)' : 'none' }}>
              <Smartphone size={40} color={durationFormat === 'reel' ? '#93C5FD' : 'currentColor'} />
              <div>
                <span style={{ display: 'block', fontWeight: 800, fontSize: '20px', marginBottom: '8px', color: durationFormat === 'reel' ? '#fff' : '#e2e8f0' }}>Viral Shorts</span>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)' }}>Best for TikTok, Reels, Shorts</span>
              </div>
            </button>

            <button onClick={() => setDurationFormat('youtube')}
              style={{ padding: '32px 24px', borderRadius: '20px', border: durationFormat === 'youtube' ? '3px solid #3B82F6' : '3px solid rgba(255,255,255,0.05)', background: durationFormat === 'youtube' ? 'rgba(59,130,246,0.1)' : 'rgba(0,0,0,0.2)', color: durationFormat === 'youtube' ? '#fff' : 'var(--muted)', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: durationFormat === 'youtube' ? '0 10px 30px rgba(59,130,246,0.2)' : 'none' }}>
              <Monitor size={40} color={durationFormat === 'youtube' ? '#93C5FD' : 'currentColor'} />
              <div>
                <span style={{ display: 'block', fontWeight: 800, fontSize: '20px', marginBottom: '8px', color: durationFormat === 'youtube' ? '#fff' : '#e2e8f0' }}>Long Highlights</span>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)' }}>Best for YouTube full videos</span>
              </div>
            </button>
          </div>
        </motion.div>

        {/* STEP 3: Video Size (Separate Block) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '40px', marginBottom: '40px', backdropFilter: 'blur(10px)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Maximize size={24} color="#10B981" />
            </div>
            <div>
              <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}>3. Video Size</h2>
              <p style={{ color: 'var(--muted)', fontSize: '15px', margin: 0 }}>Select your preferred aspect ratio</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
            {[
              { id: '9:16', icon: Smartphone, label: '9:16 (Vertical)' },
              { id: '16:9', icon: Monitor, label: '16:9 (Horizontal)' },
              { id: '1:1', icon: PlaySquare, label: '1:1 (Square)' }
            ].map(sz => (
              <button key={sz.id} onClick={() => setVidFormat(sz.id as any)}
                style={{ padding: '24px 16px', borderRadius: '20px', border: vidFormat === sz.id ? '3px solid #10B981' : '3px solid rgba(255,255,255,0.05)', background: vidFormat === sz.id ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.2)', color: vidFormat === sz.id ? '#fff' : 'var(--muted)', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', boxShadow: vidFormat === sz.id ? '0 10px 30px rgba(16,185,129,0.2)' : 'none' }}>
                <sz.icon size={36} color={vidFormat === sz.id ? '#6EE7B7' : 'currentColor'} />
                <span style={{ fontWeight: 800, fontSize: '18px', color: vidFormat === sz.id ? '#fff' : '#e2e8f0', textAlign: 'center' }}>{sz.label}</span>
              </button>
            ))}
          </div>

          {/* Position Selector for Cropped Formats */}
          <AnimatePresence>
            {(vidFormat === '9:16' || vidFormat === '1:1') && (
              <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 24 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <AlignCenter size={18} color="#10B981" />
                    <h3 style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 600, margin: 0 }}>Frame Position</h3>
                  </div>

                  <div style={{ padding: '10px 0' }}>
                    <div
                      ref={trackRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      style={{
                        width: '100%',
                        maxWidth: '360px',
                        aspectRatio: '16/9',
                        background: '#0f172a',
                        backgroundImage: 'linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b), linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b)',
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 0, 10px 10px',
                        margin: '0 auto',
                        borderRadius: '12px',
                        position: 'relative',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        border: '1px solid rgba(255,255,255,0.1)',
                        overflow: 'hidden',
                        touchAction: 'none',
                        boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.5)'
                      }}
                    >
                      {/* Left dark area */}
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `calc((100% - ${vidFormat === '9:16' ? 31.64 : 56.25}%) * ${cropX})`, background: 'rgba(0,0,0,0.7)', pointerEvents: 'none' }} />
                      {/* Right dark area */}
                      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `calc((100% - ${vidFormat === '9:16' ? 31.64 : 56.25}%) * ${1 - cropX})`, background: 'rgba(0,0,0,0.7)', pointerEvents: 'none' }} />

                      {/* The crop box */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `calc((100% - ${vidFormat === '9:16' ? 31.64 : 56.25}%) * ${cropX})`,
                        width: `${vidFormat === '9:16' ? 31.64 : 56.25}%`,
                        border: '3px solid #10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        boxShadow: '0 0 15px rgba(16,185,129,0.3), inset 0 0 15px rgba(16,185,129,0.1)'
                      }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <div style={{ width: '4px', height: '24px', background: '#fff', borderRadius: '4px', opacity: 0.8 }} />
                          <div style={{ width: '4px', height: '24px', background: '#fff', borderRadius: '4px', opacity: 0.8 }} />
                        </div>
                      </div>
                    </div>
                    <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '14px', marginTop: '16px', fontWeight: 500 }}>
                      Drag the frame horizontally to set your crop position
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Generate Topics Action */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ marginBottom: '60px' }}>
          <button onClick={handleAnalyze} disabled={isAnalyzing || !youtubeUrl.trim() || tokens === null}
            style={{ width: '100%', padding: '24px', borderRadius: '20px', border: 'none', background: isAnalyzing || !youtubeUrl.trim() || tokens === null ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: isAnalyzing || !youtubeUrl.trim() || tokens === null ? 'var(--muted)' : '#fff', fontSize: '20px', fontWeight: 800, cursor: isAnalyzing || !youtubeUrl.trim() || tokens === null ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: isAnalyzing || !youtubeUrl.trim() || tokens === null ? 'none' : '0 15px 40px rgba(109,40,217,0.5)', transition: 'all 0.3s' }}
            onMouseEnter={e => { if (!isAnalyzing && youtubeUrl.trim() && tokens !== null) e.currentTarget.style.transform = 'translateY(-4px)' }}
            onMouseLeave={e => { if (!isAnalyzing && youtubeUrl.trim() && tokens !== null) e.currentTarget.style.transform = 'translateY(0)' }}>
            {isAnalyzing ? <><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> {analyzeStep}</> : <><TrendingUp size={24} /> Extract Topics & Moments</>}
          </button>

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '24px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', padding: '16px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px' }}>
              <AlertCircle size={20} />{error}
            </motion.div>
          )}
        </motion.div>

        {/* Topics Section — hidden while generating */}
        <AnimatePresence>
          {clips.length > 0 && !showGenerating && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '44px', height: '44px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.05))',
                    border: '1px solid rgba(139,92,246,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(139,92,246,0.15), inset 0 0 10px rgba(139,92,246,0.1)'
                  }}>
                    <Film size={22} color="#C4B5FD" />
                  </div>
                  Topics Found
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button onClick={() => setSelectedIndices(clips.map((_, i) => i))}
                    style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#C4B5FD', padding: '10px 20px', borderRadius: '100px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                    Select All
                  </button>
                  <button onClick={() => setSelectedIndices([])}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)', padding: '10px 20px', borderRadius: '100px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                    Clear
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginBottom: '60px' }}>
                {clips.map((clip, i) => {
                  const isSelected = selectedIndices.includes(i)
                  const job = batchJobs[i]
                  const color = TYPE_COLORS[clip.type] || '#8B5CF6'

                  return (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                      onClick={() => { if (!job) toggleSelection(i) }}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: isSelected ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '24px',
                        padding: '28px',
                        cursor: job ? 'default' : 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s',
                        boxShadow: isSelected ? `0 15px 40px ${color}30` : '0 10px 30px rgba(0,0,0,0.1)',
                        transform: isSelected ? 'translateY(-6px)' : 'none'
                      }}>

                      {/* Glassmorphism Loader Overlay */}
                      <AnimatePresence>
                        {job && (job.status === 'processing' || job.status === 'done') && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(10px)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
                            {job.status === 'processing' ? (
                              <>
                                <Loader2 size={40} color={color} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                                <span style={{ color: '#fff', fontWeight: 700, fontSize: '18px' }}>Generating Video...</span>
                                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', marginTop: '16px', overflow: 'hidden' }}>
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${job.progress}%` }} style={{ height: '100%', background: color }} />
                                </div>
                                <span style={{ color: color, fontSize: '16px', fontWeight: 800, marginTop: '8px' }}>{job.progress}%</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={48} color="#10B981" style={{ marginBottom: '16px' }} />
                                <span style={{ color: '#10B981', fontWeight: 800, fontSize: '20px' }}>Ready Below!</span>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ padding: '6px 16px', borderRadius: '100px', background: `${color}20`, color, fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                          {clip.type}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', color: 'var(--muted)', fontSize: '13px', fontFamily: 'monospace', fontWeight: 600 }}>
                          <span style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '6px' }}>{clip.start ?? '—'}</span>
                          <span>→</span>
                          <span style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '6px' }}>{clip.end ?? '—'}</span>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: '0 0 24px', lineHeight: 1.4 }}>
                        {clip.title}
                      </h3>

                      {/* Checkmark indicator */}
                      <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '32px', height: '32px', borderRadius: '16px', border: isSelected ? `2px solid ${color}` : '2px solid rgba(255,255,255,0.2)', background: isSelected ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                        {isSelected && <Check size={18} color="#fff" strokeWidth={3} />}
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {selectedIndices.length > 0 && !isGenerating && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'center', marginBottom: '80px' }}>
                  <button onClick={handleGenerateBatch}
                    style={{ padding: '24px 60px', borderRadius: '100px', border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontSize: '22px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 15px 40px rgba(16,185,129,0.5)', transition: 'transform 0.3s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    <Video size={28} /> Generate {selectedIndices.length} Videos Now
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Generation Progress Card ── */}
        <AnimatePresence>
          {showGenerating && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px', padding: '60px 40px', marginBottom: '60px', backdropFilter: 'blur(20px)', boxShadow: '0 30px 80px rgba(0,0,0,0.4)', textAlign: 'center' }}>
              {isGenerating ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid rgba(139,92,246,0.2)', borderTop: '4px solid #8B5CF6', margin: '0 auto 32px' }} />
                  <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Generating Your Clips...</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '18px', margin: '0 0 48px' }}>This may take a few minutes. Stay on this page.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', maxWidth: '800px', margin: '0 auto' }}>
                    {selectedIndices.map((idx, i) => {
                      const job = batchJobs[idx]
                      const clip = clips[idx]
                      const color = TYPE_COLORS[clip?.type] || '#8B5CF6'
                      const pct = job?.progress || 0
                      const status = job?.status || 'idle'
                      return (
                        <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${status === 'done' ? '#10B981' : status === 'error' ? '#EF4444' : 'rgba(255,255,255,0.08)'}`, borderRadius: '18px', padding: '20px', textAlign: 'center' }}>
                          <div style={{ position: 'relative', width: '64px', height: '64px', margin: '0 auto 12px' }}>
                            <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                              <circle cx="32" cy="32" r="28" fill="none" stroke={status === 'done' ? '#10B981' : status === 'error' ? '#EF4444' : color} strokeWidth="4"
                                strokeDasharray={`${2 * Math.PI * 28}`}
                                strokeDashoffset={`${2 * Math.PI * 28 * (1 - pct / 100)}`}
                                style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {status === 'done' ? <CheckCircle2 size={24} color="#10B981" /> : status === 'error' ? <AlertCircle size={24} color="#EF4444" /> : <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{pct}%</span>}
                            </div>
                          </div>
                          <p style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 600, margin: 0 }}>Clip {i + 1}</p>
                          <p style={{ color: status === 'done' ? '#10B981' : status === 'error' ? '#EF4444' : '#fff', fontSize: '11px', fontWeight: 700, margin: '4px 0 0', textTransform: 'uppercase' }}>
                            {status === 'done' ? 'Done' : status === 'error' ? 'Failed' : status === 'processing' ? 'Processing' : 'Queued'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.1))', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', boxShadow: '0 0 60px rgba(16,185,129,0.4)' }}>
                      <CheckCircle2 size={52} color="#10B981" />
                    </div>
                  </motion.div>
                  <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>All Done! 🎉</h2>
                  <p style={{ color: 'var(--muted)', fontSize: '18px', margin: '0 0 32px' }}>Your clips are ready to watch and download below.</p>
                  <button onClick={() => { setShowGenerating(false); setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100) }}
                    style={{ padding: '18px 48px', borderRadius: '100px', border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontSize: '18px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 30px rgba(16,185,129,0.4)', transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><PlaySquare size={22} /> View My Clips</span>
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Showcase */}
        <div ref={resultsRef} />
        <AnimatePresence>
          {!isGenerating && Object.values(batchJobs).some(j => j.status === 'done' || j.status === 'error') && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '40px', paddingTop: '60px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '40px', fontWeight: 800, margin: '0 0 16px', color: '#fff' }}>
                  Your Videos are Ready 🎉
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '18px', marginBottom: '24px' }}>Download your automatically generated clips below.</p>

                {Object.values(batchJobs).filter(j => j.status === 'done').length > 1 && (
                  <button onClick={handleDownloadAll}
                    style={{ padding: '16px 32px', borderRadius: '100px', border: 'none', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#fff', fontSize: '16px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(59,130,246,0.4)', transition: 'transform 0.3s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    <Download size={20} /> Download All Clips
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '32px' }}>
                {(() => {
                  const doneIndices = selectedIndices.filter(idx => batchJobs[idx]?.status === 'done')
                  const errorIndices = selectedIndices.filter(idx => batchJobs[idx]?.status === 'error')

                  // Render successful ones first, then error ones
                  return [...doneIndices, ...errorIndices].map(idx => {
                    const job = batchJobs[idx]
                    const clip = clips[idx]

                    return (
                      <motion.div key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '28px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                        {job.status === 'error' ? (
                          <div style={{ padding: '60px 30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px' }}>
                            <AlertCircle size={48} color="#F87171" style={{ marginBottom: '16px' }} />
                            <h4 style={{ fontWeight: 800, fontSize: '20px', marginBottom: '8px', color: '#F87171' }}>Generation Failed</h4>
                            <p style={{ fontWeight: 500, fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>{job.error}</p>
                            <button onClick={() => generateClip(idx)}
                              style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#FCA5A5', padding: '12px 24px', borderRadius: '100px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.25)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)' }}>
                              <Zap size={16} /> Retry Generation
                            </button>
                          </div>
                        ) : job.status === 'done' && job.videoBlobUrl ? (
                          <>
                            <div style={{ background: '#000', width: '100%', position: 'relative', paddingTop: vidFormat === '9:16' ? '177%' : vidFormat === '1:1' ? '100%' : '56.25%' }}>
                              <video
                                src={job.videoBlobUrl}
                                controls
                                preload="metadata"
                                playsInline
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                              />
                            </div>
                            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, background: 'rgba(0,0,0,0.3)' }}>
                              <h4 style={{ color: '#fff', margin: 0, fontSize: '18px', fontWeight: 700, lineHeight: 1.4 }}>
                                {clip.title}
                              </h4>
                              <button onClick={() => {
                                const a = document.createElement('a')
                                a.href = `${job.videoBlobUrl}?dl=1`
                                a.download = job.outputName || 'video.mp4'
                                a.click()
                              }} style={{ marginTop: 'auto', width: '100%', padding: '18px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontSize: '16px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 8px 20px rgba(16,185,129,0.3)' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(16,185,129,0.4)' }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(16,185,129,0.3)' }}>
                                <Download size={20} /> Download Clip
                              </button>
                            </div>
                          </>
                        ) : null}
                      </motion.div>
                    )
                  })
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}

export default function ViralClipsPage() {
  return (
    <Suspense fallback={null}>
      <ViralClipsInner />
    </Suspense>
  )
}

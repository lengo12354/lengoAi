'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Scissors, Loader2, Download, AlertCircle, CheckCircle2, Monitor, Smartphone, RefreshCcw, Video } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getUserTokens } from '@/app/actions/tokens'

// Default YouTube video dimensions for crop calculations
const DEFAULT_NAT_W = 1920
const DEFAULT_NAT_H = 1080

// Map raw FFmpeg / ytdl error text → short user-friendly message
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
  // Fallback: trim to 120 chars max
  return raw.length > 120 ? raw.slice(0, 120) + '…' : raw
}

function ClipMakerInner() {
  const searchParams = useSearchParams()

  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [urlValid, setUrlValid] = useState<boolean | null>(null)

  const [startTs, setStartTs] = useState(searchParams.get('start') || '')
  const [endTs, setEndTs] = useState(searchParams.get('end') || '')
  const [format, setFormat] = useState<'16:9' | '9:16'>('16:9')
  const [tokens, setTokens] = useState<number | null>(null)

  // Crop state (for 9:16 mode) — based on default 1920×1080
  const [cropX, setCropX] = useState(540)   // centered: (1920 - 607) / 2 ≈ 656 but 9:16 of 1080h = 607w
  const [cropY, setCropY] = useState(0)
  const [cropW, setCropW] = useState(607)   // 1080 * 9/16 ≈ 607
  const [cropH, setCropH] = useState(1080)
  const [isDraggingCrop, setIsDraggingCrop] = useState(false)
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, cx: 0, cy: 0 })

  // Job state
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [jobError, setJobError] = useState('')
  const [outputName, setOutputName] = useState('')

  const previewContainerRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    getUserTokens().then(t => setTokens(t))
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Validate YouTube URL on change
  const handleUrlChange = (val: string) => {
    setYoutubeUrl(val)
    if (!val.trim()) { setUrlValid(null); return }
    try {
      const u = new URL(val.trim())
      const isYT = (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') && u.searchParams.has('v')
      const isShort = u.hostname === 'youtu.be' && u.pathname.length > 1
      setUrlValid(isYT || isShort)
    } catch {
      setUrlValid(false)
    }
  }

  // Scale factor: natural video (1920×1080) → displayed preview div width
  const getScale = useCallback(() => {
    if (!previewContainerRef.current) return 1
    return previewContainerRef.current.clientWidth / DEFAULT_NAT_W
  }, [])

  // Crop drag handlers
  const onCropMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingCrop(true)
    setDragStart({ mx: e.clientX, my: e.clientY, cx: cropX, cy: cropY })
  }

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingCrop) return
    const scale = getScale()
    const dx = (e.clientX - dragStart.mx) / scale
    const dy = (e.clientY - dragStart.my) / scale
    const newX = Math.max(0, Math.min(DEFAULT_NAT_W - cropW, dragStart.cx + dx))
    const newY = Math.max(0, Math.min(DEFAULT_NAT_H - cropH, dragStart.cy + dy))
    setCropX(Math.round(newX)); setCropY(Math.round(newY))
  }, [isDraggingCrop, dragStart, cropW, cropH, getScale])

  const onMouseUp = useCallback(() => setIsDraggingCrop(false), [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [onMouseMove, onMouseUp])

  const startPolling = (jId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/clip-maker/status/${jId}`)
        const data = await res.json()
        if (data.status === 'done') {
          clearInterval(pollRef.current!); setProgress(100); setJobStatus('done'); setOutputName(data.outputName || 'clip.mp4')
        } else if (data.status === 'error') {
          clearInterval(pollRef.current!); setJobStatus('error')
          setJobError(friendlyError(data.error || ''))
        } else {
          setProgress(data.progress || 0)
        }
      } catch {
        clearInterval(pollRef.current!); setJobStatus('error'); setJobError('Could not reach server.')
      }
    }, 2000)
  }

  const handleCreate = async () => {
    if (!youtubeUrl.trim() || !urlValid) { setJobError('Please enter a valid YouTube URL.'); return }
    if (!startTs.trim() || !endTs.trim()) { setJobError('Please enter start and end timestamps.'); return }
    if (tokens === null) { setJobError('Please log in.'); return }

    setJobStatus('processing'); setJobError(''); setProgress(0)

    const fd = new FormData()
    fd.append('youtubeUrl', youtubeUrl.trim())
    fd.append('start', startTs.trim())
    fd.append('end', endTs.trim())
    fd.append('format', format)
    if (format === '9:16') {
      fd.append('crop', JSON.stringify({ x: cropX, y: cropY, width: cropW, height: cropH }))
    }

    try {
      const res = await fetch('/api/clip-maker', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setJobId(data.jobId); startPolling(data.jobId)
    } catch (err: any) {
      setJobStatus('error'); setJobError(err.message || 'Request failed')
    }
  }

  const handleDownload = () => {
    if (!jobId) return
    const a = document.createElement('a')
    a.href = `/api/clip-maker/download/${jobId}`
    a.download = outputName || 'clip.mp4'
    a.click()
  }

  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setJobId(null); setJobStatus('idle'); setProgress(0); setJobError(''); setOutputName('')
  }

  const isProcessing = jobStatus === 'processing'

  if (!mounted) return null

  return (
    <main style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%,-50%)', width: '70vw', height: '500px', background: 'radial-gradient(ellipse, rgba(63,89,231,0.1) 0%, transparent 60%)', filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div className="container-xl" style={{ maxWidth: '900px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <Link href="/#tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
            <ArrowLeft size={16} /> Back to Tools
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(63,89,231,0.4), rgba(27,56,220,0.2))', border: '1px solid rgba(63,89,231,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scissors size={28} color="#3F59E7" />
            </div>
            <h1 style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 800, letterSpacing: '-1px', background: 'linear-gradient(135deg, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              Clip <span style={{ color: '#3F59E7', WebkitTextFillColor: '#3F59E7' }}>Maker</span>
            </h1>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '17px' }}>Paste a YouTube URL, set timestamps, choose format — FFmpeg does the rest.</p>
        </div>

        {/* Auth warning */}
        {tokens === null && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '16px 20px', borderRadius: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>You need to be logged in to use this tool.</span>
            <a href="/auth/login" style={{ background: '#f59e0b', color: '#080C2A', fontWeight: 700, padding: '8px 18px', borderRadius: '100px', textDecoration: 'none', fontSize: '14px' }}>Log In</a>
          </div>
        )}

        {/* Error */}
        <AnimatePresence>
          {jobError && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
              <AlertCircle size={18} />{jobError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── YouTube URL Input ── */}
        <div style={{ marginBottom: '28px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${urlValid === false ? 'rgba(239,68,68,0.4)' : urlValid ? 'rgba(63,89,231,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '16px', padding: '20px 24px', transition: 'border-color 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Video size={18} color="#FF0000" />
            <span style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>YouTube Video URL</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={youtubeUrl}
              onChange={e => handleUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={isProcessing}
              style={{
                flex: 1, minWidth: '260px', padding: '12px 16px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(63,89,231,0.3)',
                color: '#fff', fontSize: '14px', fontFamily: 'monospace', outline: 'none',
                boxSizing: 'border-box', opacity: isProcessing ? 0.5 : 1,
              }}
            />
            {youtubeUrl && (
              <button
                onClick={() => { setYoutubeUrl(''); setUrlValid(null) }}
                disabled={isProcessing}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>
                <RefreshCcw size={13} /> Clear
              </button>
            )}
          </div>
          {urlValid === false && (
            <p style={{ color: '#f87171', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>
              ⚠️ Please enter a valid YouTube URL (youtube.com/watch?v=... or youtu.be/...)
            </p>
          )}
          {urlValid === true && (
            <p style={{ color: '#34D399', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>
              ✓ Valid YouTube URL
            </p>
          )}
        </div>

        {/* 9:16 Crop Positioning Panel */}
        {format === '9:16' && (
          <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '16px' }}>
            <p style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Drag the blue frame to position your 9:16 crop</p>
            {/* Simulated 16:9 canvas showing where the crop box sits */}
            <div
              ref={previewContainerRef}
              style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden', userSelect: 'none' }}
            >
              {/* Grid lines */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.04) 59px, rgba(255,255,255,0.04) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.04) 59px, rgba(255,255,255,0.04) 60px)' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: '13px', fontWeight: 500 }}>1920 × 1080 canvas (YouTube 16:9)</span>
              </div>
              {/* Crop overlay */}
              <div
                onMouseDown={onCropMouseDown}
                style={{
                  position: 'absolute',
                  left: `${(cropX / DEFAULT_NAT_W) * 100}%`,
                  top: `${(cropY / DEFAULT_NAT_H) * 100}%`,
                  width: `${(cropW / DEFAULT_NAT_W) * 100}%`,
                  height: `${(cropH / DEFAULT_NAT_H) * 100}%`,
                  border: '2px solid #3F59E7',
                  background: 'rgba(63,89,231,0.12)',
                  cursor: isDraggingCrop ? 'grabbing' : 'grab',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.52)',
                  zIndex: 10,
                }}
              >
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(63,89,231,0.85)', padding: '4px 10px', borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                  9:16 Crop — drag to reposition
                </div>
              </div>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Crop: x={cropX} y={cropY} w={cropW} h={cropH}</span>
              <button onClick={() => {
                const targetW = Math.round(DEFAULT_NAT_H * 9 / 16)
                setCropW(Math.min(targetW, DEFAULT_NAT_W)); setCropH(DEFAULT_NAT_H)
                setCropX(Math.max(0, Math.round((DEFAULT_NAT_W - targetW) / 2))); setCropY(0)
              }} style={{ background: 'transparent', border: '1px solid rgba(63,89,231,0.4)', color: '#6A7DED', padding: '4px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
                Reset to center
              </button>
            </div>
          </div>
        )}

        {/* Timestamps + Format */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
            <p style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>Timestamps</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[{ label: 'Start', val: startTs, set: setStartTs }, { label: 'End', val: endTs, set: setEndTs }].map(({ label, val, set }) => (
                <div key={label}>
                  <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '6px' }}>{label}</p>
                  <input
                    value={val}
                    onChange={e => set(e.target.value)}
                    placeholder="HH:MM:SS"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(63,89,231,0.3)', color: '#fff', fontSize: '15px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
            <p style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px' }}>Output Format</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {([
                { val: '16:9', label: 'YouTube — 16:9', icon: Monitor, desc: 'Original aspect ratio, no crop' },
                { val: '9:16', label: 'Vertical — 9:16', icon: Smartphone, desc: 'Crop to 1080×1920 (Reels, Shorts, TikTok)' },
              ] as const).map(({ val, label, icon: Icon, desc }) => (
                <button key={val} onClick={() => setFormat(val)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', border: format === val ? '1.5px solid #3F59E7' : '1px solid rgba(255,255,255,0.08)', background: format === val ? 'rgba(63,89,231,0.12)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                  <Icon size={20} color={format === val ? '#6A7DED' : 'var(--muted)'} />
                  <div>
                    <p style={{ color: format === val ? '#fff' : 'var(--muted)', fontWeight: 600, fontSize: '14px', margin: 0 }}>{label}</p>
                    <p style={{ color: 'var(--muted)', fontSize: '12px', margin: 0 }}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Job status */}
        <AnimatePresence>
          {isProcessing ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(63,89,231,0.08)', border: '1px solid rgba(63,89,231,0.25)', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <Loader2 size={20} color="#6A7DED" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#fff', fontWeight: 600 }}>Fetching &amp; processing with FFmpeg...</span>
                <span style={{ color: 'var(--muted)', marginLeft: 'auto', fontSize: '14px' }}>{progress}%</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <motion.div animate={{ width: `${progress}%` }} transition={{ ease: 'linear' }} style={{ height: '100%', background: 'linear-gradient(90deg, #3F59E7, #8B5CF6)', borderRadius: '3px' }} />
              </div>
            </motion.div>
          ) : jobStatus === 'done' ? (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '14px', padding: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <CheckCircle2 size={24} color="#34D399" />
              <div style={{ flex: 1 }}>
                <p style={{ color: '#34D399', fontWeight: 700, margin: 0 }}>Clip ready!</p>
                <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>{outputName}</p>
              </div>
              <button onClick={handleDownload}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10B981', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '100px', fontWeight: 700, cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 16px rgba(16,185,129,0.4)' }}>
                <Download size={18} /> Download Clip
              </button>
              <button onClick={handleReset} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)', padding: '12px 18px', borderRadius: '100px', cursor: 'pointer', fontSize: '14px' }}>
                New Clip
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Create button */}
        {jobStatus !== 'done' && (
          <button onClick={handleCreate}
            disabled={!urlValid || isProcessing || tokens === null}
            style={{ width: '100%', padding: '18px', borderRadius: '14px', border: 'none', background: !urlValid || isProcessing || tokens === null ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #ffffff, #d4d4d8)', color: !urlValid || isProcessing || tokens === null ? 'var(--muted)' : '#000', fontSize: '16px', fontWeight: 700, cursor: !urlValid || isProcessing || tokens === null ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: !urlValid || isProcessing || tokens === null ? 'none' : '0 8px 32px rgba(255,255,255,0.15)', transition: 'all 0.3s' }}>
            <Scissors size={20} /> Generate Clip
          </button>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}

export default function ClipMakerPage() {
  return (
    <Suspense fallback={null}>
      <ClipMakerInner />
    </Suspense>
  )
}

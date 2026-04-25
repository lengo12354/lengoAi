'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, FileAudio, Loader2, CheckCircle2, Download, ArrowLeft, AlertCircle, Captions, FileText, RefreshCcw, Zap } from 'lucide-react'
import Link from 'next/link'
import { checkAndDeductTokens, getUserTokens } from '@/app/actions/tokens'

type Language = 'darija_ar' | 'darija_fr' | 'other'

interface SubtitleBlock {
  index: number
  start: number // seconds
  end: number   // seconds
  text: string
  rawTimestamp: string
}

const LANGUAGE_OPTIONS: { value: Language; label: string; desc: string; emoji: string }[] = [
  { value: 'darija_ar', emoji: '🇲🇦', label: 'Darija (العربية)', desc: 'كتابة بالحروف العربية' },
  { value: 'darija_fr', emoji: '🇲🇦', label: 'Darija (Franco)', desc: 'Ktaba b 7orf latini' },
  { value: 'other', emoji: '🌍', label: 'Other Languages', desc: 'English, French, Spanish...' },
]

const PROCESSING_MESSAGES = [
  'Extracting audio...',
  'Analyzing speech patterns...',
  'Generating subtitles...',
  'Formatting SRT output...',
  'Almost there...',
]

function srtTimeToSeconds(ts: string): number {
  // "00:00:01,500" -> 1.5
  const [hms, ms] = ts.split(',')
  const [h, m, s] = hms.split(':').map(Number)
  return h * 3600 + m * 60 + s + Number(ms) / 1000
}

function parseSrt(srt: string): SubtitleBlock[] {
  const blocks = srt.trim().split(/\n\n+/)
  const result: SubtitleBlock[] = []
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue
    const index = parseInt(lines[0])
    const timeParts = lines[1].split(' --> ')
    if (timeParts.length !== 2) continue
    const start = srtTimeToSeconds(timeParts[0].trim())
    const end = srtTimeToSeconds(timeParts[1].trim())
    const text = lines.slice(2).join('\n')
    result.push({ index, start, end, text, rawTimestamp: lines[1] })
  }
  return result
}

function srtToVtt(srt: string): string {
  return 'WEBVTT\n\n' + srt
    .replace(/\r\n|\r/g, '\n')
    .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4')
}

export default function AutoSubtitlePage() {
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState<Language>('darija_ar')
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [srtResult, setSrtResult] = useState<string | null>(null)
  const [subtitles, setSubtitles] = useState<SubtitleBlock[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processingMsg, setProcessingMsg] = useState(PROCESSING_MESSAGES[0])
  const [currentTime, setCurrentTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioDuration, setAudioDuration] = useState<number>(0)
  const [tokens, setTokens] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const processingInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const activeSubRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    getUserTokens().then(t => setTokens(t))
  }, [])

  // Find active subtitle index
  const activeIdx = subtitles.findIndex(s => currentTime >= s.start && currentTime <= s.end)

  useEffect(() => {
    return () => {
      if (processingInterval.current) clearInterval(processingInterval.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  // Auto-scroll to active subtitle
  useEffect(() => {
    if (activeSubRef.current) {
      const rect = activeSubRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight
      
      // Only scroll down if the element is going off the bottom of the screen
      if (rect.bottom > windowHeight - 50) {
        window.scrollBy({
          top: rect.bottom - windowHeight + 150, // Scroll just enough to show it clearly
          behavior: 'smooth'
        })
      }
    }
  }, [activeIdx])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(true)
  }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
  }, [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    if (e.dataTransfer.files?.length > 0) handleFileSelection(e.dataTransfer.files[0])
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFileSelection(e.target.files[0])
  }

  const handleFileSelection = (selectedFile: File) => {
    setError(null); setSrtResult(null); setSubtitles([])
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null) }
    const validExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.mp4', '.mov', '.webm', '.mkv']
    if (!validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext))) {
      setError('Unsupported format. Please upload an audio or video file.'); return
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      setError('File size exceeds 25MB limit (Groq API limit).'); return
    }
    setFile(selectedFile)
    const url = URL.createObjectURL(selectedFile)
    setAudioUrl(url)
    
    // Calculate audio duration
    const audio = new Audio(url)
    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration)
    })
  }

  const startProcessingMessages = () => {
    let i = 0
    setProcessingMsg(PROCESSING_MESSAGES[0])
    processingInterval.current = setInterval(() => {
      i = Math.min(i + 1, PROCESSING_MESSAGES.length - 1)
      setProcessingMsg(PROCESSING_MESSAGES[i])
    }, 4000)
  }

  const stopProcessingMessages = () => {
    if (processingInterval.current) { clearInterval(processingInterval.current); processingInterval.current = null }
  }

  const handleGenerate = async () => {
    if (!file) return
    setError(null); setIsProcessing(true); startProcessingMessages()

    const tokenRes = await checkAndDeductTokens(audioDuration)
    if (!tokenRes.success) {
      setError(tokenRes.error || 'Insufficient tokens.')
      setIsProcessing(false); stopProcessingMessages()
      return
    }
    if (tokenRes.remainingBalance !== undefined) {
      setTokens(tokenRes.remainingBalance)
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('language', language)
      const response = await fetch('/api/auto-subtitle', { method: 'POST', body: formData })
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Processing failed') }
      const srt = await response.text()
      setSrtResult(srt)
      setSubtitles(parseSrt(srt))
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsProcessing(false); stopProcessingMessages()
    }
  }

  const handleDownloadSrt = () => {
    if (!srtResult || !file) return
    const blob = new Blob([srtResult], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${file.name.replace(/\.[^/.]+$/, '')}.srt`; a.click(); URL.revokeObjectURL(url)
  }

  const handleDownloadVtt = () => {
    if (!srtResult || !file) return
    const blob = new Blob([srtToVtt(srtResult)], { type: 'text/vtt; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${file.name.replace(/\.[^/.]+$/, '')}.vtt`; a.click(); URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setFile(null); setSrtResult(null); setSubtitles([]); setError(null)
    setIsProcessing(false); stopProcessingMessages(); setCurrentTime(0)
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null) }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!mounted) return null

  return (
    <main style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: '80vw', height: '500px', background: 'radial-gradient(ellipse, rgba(138,43,226,0.2) 0%, transparent 60%)', filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: '70%', left: '30%', width: '40vw', height: '300px', background: 'radial-gradient(ellipse, rgba(0,229,255,0.08) 0%, transparent 60%)', filter: 'blur(60px)', zIndex: 0, pointerEvents: 'none' }} />

      <div className="container-xl" style={{ maxWidth: '900px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <Link href="/#tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
            <ArrowLeft size={16} /> Back to Tools
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(138,43,226,0.4), rgba(0,229,255,0.2))', border: '1px solid rgba(138,43,226,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Captions size={28} color="#a855f7" />
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-1px', background: 'linear-gradient(135deg, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              AI <span style={{ color: '#a855f7', WebkitTextFillColor: '#a855f7' }}>Auto Subtitles</span>
            </h1>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '18px', maxWidth: '620px' }}>
            Generate accurate subtitles from any audio or video. Supports <strong style={{ color: '#a855f7' }}>Darija</strong>, English, French, and 90+ languages.
          </p>
        </div>

        {/* Tokens Alert */}
        {(tokens === 0 || tokens === null) && (
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '16px 24px', borderRadius: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#f59e0b' }}>
              <Zap size={24} fill="#f59e0b" strokeWidth={1} />
              <div>
                <span style={{ fontWeight: 700, display: 'block', fontSize: '16px' }}>{tokens === null ? 'You need tokens to continue!' : 'You are out of tokens!'}</span>
                <span style={{ fontSize: '13px', opacity: 0.8 }}>Please buy tokens to start generating subtitles.</span>
              </div>
            </div>
            <a href="/#pricing" className="btn-banger" style={{ padding: '10px 20px', fontSize: '14px', whiteSpace: 'nowrap' }}>
              Buy Tokens
            </a>
          </div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.2)', color: '#ff6b6b', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={20} />{error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!srtResult ? (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>

              {/* Language Selector */}
              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Select Language</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {LANGUAGE_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setLanguage(opt.value)} style={{ padding: '16px', borderRadius: '14px', border: language === opt.value ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.07)', background: language === opt.value ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', color: '#fff' }}>
                      <span style={{ fontSize: '22px', display: 'block', marginBottom: '8px' }}>{opt.emoji}</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>{opt.label}</span>
                      <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Zone */}
              <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => !file && fileInputRef.current?.click()}
                style={{ border: `2px dashed ${isDragging ? '#a855f7' : file ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '20px', padding: '40px 32px', cursor: file ? 'default' : 'pointer', transition: 'all 0.3s ease', background: isDragging ? 'rgba(168,85,247,0.08)' : file ? 'rgba(168,85,247,0.05)' : 'rgba(255,255,255,0.02)', textAlign: 'center', marginBottom: '24px' }}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.flac,.mp4,.mov,.webm,.mkv" style={{ display: 'none' }} />
                <AnimatePresence mode="wait">
                  {file ? (
                    <motion.div key="file" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <FileAudio size={30} color="#a855f7" />
                      </div>
                      <p style={{ color: '#fff', fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>{file.name}</p>
                      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      {audioDuration > 0 && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 12px', borderRadius: '100px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                           <Zap size={14} fill="#f59e0b" color="#f59e0b" />
                           <span style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 600 }}>Cost: {Math.ceil(audioDuration * (2000 / 3600))} Tokens</span>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <UploadCloud size={32} color="var(--muted)" strokeWidth={1.5} />
                      </div>
                      <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Drag & drop audio or video</h3>
                      <p style={{ color: 'var(--muted)', fontSize: '14px' }}>MP3, WAV, MP4, MOV, MKV... up to 25MB</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Generate Button */}
              <button onClick={handleGenerate} disabled={!file || isProcessing || tokens === 0 || tokens === null} style={{ width: '100%', padding: '18px', borderRadius: '14px', border: 'none', background: !file || isProcessing || tokens === 0 || tokens === null ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #a855f7, #7c3aed)', color: !file || isProcessing || tokens === 0 || tokens === null ? 'var(--muted)' : '#fff', fontSize: '16px', fontWeight: 700, cursor: !file || isProcessing || tokens === 0 || tokens === null ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: !file || isProcessing || tokens === 0 || tokens === null ? 'none' : '0 8px 32px rgba(168,85,247,0.3)' }}>
                {isProcessing ? (<><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />{processingMsg}</>) : (<><Captions size={20} />Generate Subtitles</>)}
              </button>
            </motion.div>

          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Success Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '16px 20px', borderRadius: '16px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}>
                <CheckCircle2 size={22} color="#a855f7" />
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#fff', fontWeight: 600, margin: 0 }}>Subtitles Generated!</p>
                  <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>{subtitles.length} blocks from &quot;{file?.name}&quot;</p>
                </div>
                <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)' }}>
                  <RefreshCcw size={14} /> New File
                </button>
              </div>

              {/* Audio Player */}
              {audioUrl && (
                <div style={{ marginBottom: '24px', padding: '20px', borderRadius: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>🎵 Audio Player</p>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    controls
                    onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                    style={{ width: '100%', borderRadius: '8px', outline: 'none', accentColor: '#a855f7' }}
                  />
                </div>
              )}

              {/* Download Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                <button onClick={handleDownloadSrt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(168,85,247,0.3)' }}>
                  <Download size={18} />Download .SRT
                </button>
                <button onClick={handleDownloadVtt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', borderRadius: '14px', border: '1.5px solid rgba(168,85,247,0.5)', background: 'rgba(168,85,247,0.08)', color: '#a855f7', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
                  <FileText size={18} />Download .VTT
                </button>
              </div>

              {/* Synchronized Subtitle Preview */}
              <div>
                <p style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Subtitle Preview — <span style={{ color: activeIdx >= 0 ? '#a855f7' : 'var(--muted)' }}>{activeIdx >= 0 ? `Block ${subtitles[activeIdx].index} active` : 'Play audio to sync'}</span>
                </p>
                <div ref={listRef} style={{ position: 'relative', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {subtitles.map((sub, i) => {
                    const isActive = i === activeIdx
                    return (
                      <motion.div
                        key={sub.index}
                        ref={isActive ? activeSubRef : null}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.01, 0.5) }}
                        onClick={() => { if (audioRef.current) { audioRef.current.currentTime = sub.start; audioRef.current.play() } }}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: isActive ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.02)',
                          border: isActive ? '1.5px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.25s ease',
                          transform: isActive ? 'scale(1.01)' : 'scale(1)',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', color: isActive ? '#a855f7' : 'rgba(168,85,247,0.5)', fontWeight: 700, minWidth: '18px' }}>{sub.index}</span>
                          <span style={{ fontSize: '10px', color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--muted)', fontFamily: 'monospace' }}>{sub.rawTimestamp}</span>
                          {isActive && <span style={{ marginLeft: 'auto', fontSize: '10px', background: '#a855f7', color: '#fff', padding: '1px 8px', borderRadius: '99px', fontWeight: 700 }}>▶ NOW</span>}
                        </div>
                        <p style={{ margin: 0, color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: '15px', lineHeight: 1.6, fontWeight: isActive ? 600 : 400, direction: language === 'darija_ar' ? 'rtl' : 'ltr' }}>
                          {sub.text}
                        </p>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}

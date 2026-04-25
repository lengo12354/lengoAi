'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, FileAudio, Loader2, CheckCircle2, Copy, Download, ArrowLeft, PlayCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ScriptExtractorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ text: string, segments: any[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [language, setLanguage] = useState('auto')
  const [granularity, setGranularity] = useState<'segment' | 'word'>('segment')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0])
    }
  }

  const handleFileSelection = (selectedFile: File) => {
    setError(null)
    // Check if it's an audio file
    if (!selectedFile.type.startsWith('audio/')) {
      setError('Please upload a valid audio file (.mp3, .wav, etc).')
      return
    }
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File size exceeds the 100MB limit.')
      return
    }
    setFile(selectedFile)
    setResult(null)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(URL.createObjectURL(selectedFile))
  }

  const handleExtract = async () => {
    if (!file) return

    setIsProcessing(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('language', language)
    formData.append('granularity', granularity)

    try {
      const res = await fetch('/api/extract-script', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const cleanText = (text: string) => {
    return text.replace(/[.,!?]/g, '').trim()
  }

  const formatSrtTime = (seconds: number) => {
    const hh = Math.floor(seconds / 3600).toString().padStart(2, '0')
    const mm = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
    const ss = Math.floor(seconds % 60).toString().padStart(2, '0')
    const ms = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0')
    return `${hh}:${mm}:${ss},${ms}`
  }

  const handleCopy = () => {
    if (result) {
      let content = ''
      if (result.segments && result.segments.length > 0) {
        content = result.segments.map((s: any) => cleanText(s.text)).join(' ')
      } else {
        content = cleanText(result.text)
      }
      navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    if (result) {
      let content = ''
      if (result.segments && result.segments.length > 0) {
        content = result.segments.map((segment: any, idx: number) => {
          const start = formatSrtTime(segment.start)
          const end = formatSrtTime(segment.end)
          const text = cleanText(segment.text)
          return `${idx + 1}\n${start} --> ${end}\n${text}\n`
        }).join('\n')
      } else {
        content = cleanText(result.text)
      }

      const blob = new Blob([content], { type: 'text/srt' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transcript-${file?.name || 'audio'}.srt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <main style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>
      {/* Background Glow */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: '80vw', height: '500px', background: 'radial-gradient(ellipse, rgba(123,97,255,0.15) 0%, transparent 60%)', filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div className="container-xl" style={{ maxWidth: '900px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <Link href="/#tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
            <ArrowLeft size={16} /> Back to Tools
          </Link>

          <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '16px', background: 'linear-gradient(135deg, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Neural <span style={{ color: '#7b61ff', WebkitTextFillColor: '#7b61ff' }}>ScriptExtractor</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '18px', maxWidth: '600px' }}>
            Upload your audio recording and let Groq's lightning-fast Whisper model extract perfectly timed scripts in seconds.
          </p>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.2)', color: '#ff4444', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={20} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Panel */}
        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {/* Language Selector */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '12px' }}>
                🌐 Audio Language
              </label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23a1a1aa' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '12px',
                  paddingRight: '36px',
                }}
              >
                <option value="auto" style={{ background: '#1a1a2e' }}>🔍 Auto-detect</option>
                <optgroup label="— Common —" style={{ background: '#1a1a2e' }}>
                  <option value="en" style={{ background: '#1a1a2e' }}>🇺🇸 English</option>
                  <option value="fr" style={{ background: '#1a1a2e' }}>🇫🇷 Français</option>
                  <option value="ar" style={{ background: '#1a1a2e' }}>🇸🇦 العربية</option>
                  <option value="es" style={{ background: '#1a1a2e' }}>🇪🇸 Español</option>
                  <option value="de" style={{ background: '#1a1a2e' }}>🇩🇪 Deutsch</option>
                  <option value="pt" style={{ background: '#1a1a2e' }}>🇵🇹 Português</option>
                  <option value="it" style={{ background: '#1a1a2e' }}>🇮🇹 Italiano</option>
                  <option value="ru" style={{ background: '#1a1a2e' }}>🇷🇺 Русский</option>
                  <option value="ja" style={{ background: '#1a1a2e' }}>🇯🇵 日本語</option>
                  <option value="tr" style={{ background: '#1a1a2e' }}>🇹🇷 Türkçe</option>
                </optgroup>
                <optgroup label="— 🇲🇦 Darija (AI) —" style={{ background: '#1a1a2e' }}>
                  <option value="darija-ar" style={{ background: '#1a1a2e' }}>🇲🇦 الدارجة (بالعربي)</option>
                  <option value="darija-fr" style={{ background: '#1a1a2e' }}>🇲🇦 Darija (b français)</option>
                </optgroup>
              </select>
              {(language === 'darija-ar' || language === 'darija-fr') && (
                <div style={{ marginTop: '10px', background: 'rgba(123,97,255,0.1)', border: '1px solid rgba(123,97,255,0.3)', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>✨</span>
                  <p style={{ fontSize: '11px', color: '#c4b5fd', lineHeight: 1.5 }}>
                    <strong>AI Translation enabled:</strong> Whisper will transcribe first, then Groq AI will translate to {language === 'darija-ar' ? 'الدارجة (Arabic script)' : 'Darija (Latin script)'}.
                  </p>
                </div>
              )}
            </div>

            {/* Granularity Toggle */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '12px' }}>
                ✂️ Script Style
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setGranularity('segment')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: `1px solid ${granularity === 'segment' ? '#7b61ff' : 'rgba(255,255,255,0.08)'}`,
                    background: granularity === 'segment' ? 'rgba(123,97,255,0.15)' : 'rgba(255,255,255,0.03)',
                    color: granularity === 'segment' ? '#fff' : 'var(--muted)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                >
                  📝 Sentence by Sentence
                  <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '4px', opacity: 0.7 }}>Best for subtitles</div>
                </button>
                <button
                  onClick={() => setGranularity('word')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: `1px solid ${granularity === 'word' ? '#00e5ff' : 'rgba(255,255,255,0.08)'}`,
                    background: granularity === 'word' ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
                    color: granularity === 'word' ? '#fff' : 'var(--muted)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                >
                  🔤 Word by Word
                  <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '4px', opacity: 0.7 }}>Best for karaoke</div>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Upload Zone */}
        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '40px' }}
          >
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#7b61ff' : 'var(--card-border)'}`,
                borderRadius: '24px',
                background: isDragging ? 'rgba(123,97,255,0.05)' : 'var(--card-bg)',
                padding: '60px 40px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px'
              }}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" style={{ display: 'none' }} />

              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div key="file" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(123,97,255,0.1)', color: '#7b61ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                      <FileAudio size={32} />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>{file.name}</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleExtract()
                      }}
                      disabled={isProcessing}
                      className="btn-banger"
                      style={{ width: '100%', maxWidth: '250px' }}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Extracting...
                        </>
                      ) : (
                        <>
                          <PlayCircle size={18} /> Extract Script
                        </>
                      )}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="upload" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                      <UploadCloud size={36} strokeWidth={1.5} />
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>Drag & drop audio</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '16px' }}>or click to browse from your computer (Max 100MB)</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Results Zone */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card"
              style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '70vh', maxHeight: '800px' }}
            >
              {/* Toolbar */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0,229,255,0.1)', color: '#00e5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Extraction Complete</h3>
                    <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{file?.name}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button onClick={handleCopy} className="btn-ghost-banger" style={{ padding: '8px 16px', fontSize: '13px' }}>
                    {copied ? <CheckCircle2 size={16} color="#00d4aa" /> : <Copy size={16} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={handleDownload} className="btn-banger" style={{ padding: '8px 16px', fontSize: '13px' }}>
                    <Download size={16} /> Download
                  </button>
                  <button onClick={() => { setResult(null); setFile(null); if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null); }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--muted)', borderRadius: '100px', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
                    New File
                  </button>
                </div>
              </div>

              {/* Audio Player Row */}
              {audioUrl && (
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'center' }}>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    controls
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    style={{ height: '40px', width: '100%', maxWidth: '600px', borderRadius: '100px' }}
                  />
                </div>
              )}

              {/* Transcript Display */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '32px', scrollBehavior: 'smooth' }}>
                {result.segments && result.segments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {result.segments.map((segment: any, idx: number) => {
                      const isActive = currentTime >= segment.start && currentTime <= segment.end;
                      return (
                        <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                          <button
                            onClick={() => {
                              if (audioRef.current) {
                                audioRef.current.currentTime = segment.start;
                                audioRef.current.play();
                              }
                            }}
                            style={{
                              cursor: 'pointer',
                              color: isActive ? '#fff' : '#7b61ff',
                              fontSize: '13px',
                              fontWeight: 600,
                              padding: '4px 8px',
                              background: isActive ? '#7b61ff' : 'rgba(123,97,255,0.1)',
                              borderRadius: '6px',
                              whiteSpace: 'nowrap',
                              border: 'none',
                              transition: 'all 0.2s'
                            }}
                          >
                            {formatTime(segment.start)}
                          </button>
                          <p style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: '16px', lineHeight: 1.6, transition: 'color 0.2s' }}>
                            {cleanText(segment.text)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p style={{ color: '#fff', fontSize: '18px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                    {cleanText(result.text)}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}

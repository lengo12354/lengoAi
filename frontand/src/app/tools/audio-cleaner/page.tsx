'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, FileAudio, Loader2, CheckCircle2, Download, ArrowLeft, PlayCircle, AlertCircle, Wand2 } from 'lucide-react'
import Link from 'next/link'

export default function AudioCleanerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [resultAudioUrl, setResultAudioUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const originalAudioRef = useRef<HTMLAudioElement>(null)
  const cleanedAudioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      if (resultAudioUrl) URL.revokeObjectURL(resultAudioUrl)
    }
  }, [audioUrl, resultAudioUrl])

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
    // We now support multiple formats
    const validTypes = ['.wav', '.mp3', '.m4a', '.ogg', '.aac', '.flac']
    if (!validTypes.some(ext => selectedFile.name.toLowerCase().endsWith(ext))) {
      setError('Unsupported audio format. Please upload an audio file.')
      return
    }
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File size exceeds the 100MB limit.')
      return
    }
    setFile(selectedFile)
    setResultBlob(null)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    if (resultAudioUrl) URL.revokeObjectURL(resultAudioUrl)
    setResultAudioUrl(null)
    setAudioUrl(URL.createObjectURL(selectedFile))
  }

  const handleEnhance = async () => {
    if (!file) return

    setIsProcessing(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/enhance-voice', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong during enhancement')
      }

      const blob = await res.blob()
      setResultBlob(blob)
      setResultAudioUrl(URL.createObjectURL(blob))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (resultAudioUrl && file) {
      const a = document.createElement('a')
      a.href = resultAudioUrl
      a.download = `enhanced-${file.name}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  return (
    <main style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>
      {/* Background Glow */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: '80vw', height: '500px', background: 'radial-gradient(ellipse, rgba(0,229,255,0.15) 0%, transparent 60%)', filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div className="container-xl" style={{ maxWidth: '900px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <Link href="/#tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
            <ArrowLeft size={16} /> Back to Tools
          </Link>

          <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: '16px', background: 'linear-gradient(135deg, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI <span style={{ color: '#00e5ff', WebkitTextFillColor: '#00e5ff' }}>AudioCleaner</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '18px', maxWidth: '600px' }}>
            Remove background noise, static, and echo instantly. Upload your audio file to get studio-quality audio.
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

        {/* Upload Zone */}
        {!resultBlob && (
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
                border: `2px dashed ${isDragging ? '#00e5ff' : 'var(--card-border)'}`,
                borderRadius: '24px',
                background: isDragging ? 'rgba(0,229,255,0.05)' : 'var(--card-bg)',
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
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac" style={{ display: 'none' }} />

              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div key="file" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(0,229,255,0.1)', color: '#00e5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                      <FileAudio size={32} />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>{file.name}</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEnhance()
                      }}
                      disabled={isProcessing}
                      className="btn-banger"
                      style={{ width: '100%', maxWidth: '250px', background: 'linear-gradient(135deg, #00e5ff 0%, #00b3cc 100%)', boxShadow: '0 10px 30px -10px #00e5ff' }}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Processing...
                        </>
                      ) : (
                        <>
                          <Wand2 size={18} /> Clean Audio
                        </>
                      )}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="upload" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                      <UploadCloud size={36} strokeWidth={1.5} />
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>Drag & drop your Audio</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '16px' }}>or click to browse from your computer (Max 100MB)</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Results Zone */}
        <AnimatePresence>
          {resultBlob && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card"
              style={{ padding: '0', display: 'flex', flexDirection: 'column' }}
            >
              {/* Toolbar */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0,229,255,0.1)', color: '#00e5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Audio Cleaned Successfully</h3>
                    <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{file?.name}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button onClick={handleDownload} className="btn-banger" style={{ padding: '8px 16px', fontSize: '13px', background: 'linear-gradient(135deg, #00e5ff 0%, #00b3cc 100%)', boxShadow: '0 5px 15px -5px #00e5ff' }}>
                    <Download size={16} /> Download Clean Audio
                  </button>
                  <button onClick={() => { setResultBlob(null); setFile(null); if (audioUrl) URL.revokeObjectURL(audioUrl); if (resultAudioUrl) URL.revokeObjectURL(resultAudioUrl); setAudioUrl(null); setResultAudioUrl(null); }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--muted)', borderRadius: '100px', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
                    New File
                  </button>
                </div>
              </div>

              {/* Comparison Section */}
              <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {audioUrl && (
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original Audio (Noisy)</h4>
                    <audio
                      ref={originalAudioRef}
                      src={audioUrl}
                      controls
                      style={{ height: '40px', width: '100%', borderRadius: '100px' }}
                    />
                  </div>
                )}

                {resultAudioUrl && (
                  <div style={{ background: 'rgba(0,229,255,0.05)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(0,229,255,0.2)' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#00e5ff', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Wand2 size={16} /> Enhanced Audio (Clean)
                    </h4>
                    <audio
                      ref={cleanedAudioRef}
                      src={resultAudioUrl}
                      controls
                      style={{ height: '40px', width: '100%', borderRadius: '100px' }}
                    />
                  </div>
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

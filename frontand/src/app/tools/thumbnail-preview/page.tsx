'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Upload, Download, MonitorPlay, Video, Layout } from 'lucide-react'
import Link from 'next/link'

export default function ThumbnailPreviewPage() {
  const [mounted, setMounted] = useState(false)
  const format = 'card'
  const [image, setImage] = useState<string | null>(null)
  const [bgColor, setBgColor] = useState('#010208')
  const [padding, setPadding] = useState(20)
  const [title, setTitle] = useState('Your Video Title Goes Here')
  const [channel, setChannel] = useState('Channel Name')
  const [views, setViews] = useState('120K')
  const [duration, setDuration] = useState('10:30')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImage(url)
    }
  }

  const handleDownload = async (withBg: boolean) => {
    try {
      const { toPng } = await import('html-to-image')

      const targetElement = withBg ? previewRef.current : cardRef.current
      if (!targetElement) return

      const url = await toPng(targetElement, {
        backgroundColor: withBg ? undefined : 'transparent',
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
        }
      })

      const a = document.createElement('a')
      a.href = url
      a.download = `thumbnail-mockup-${withBg ? 'full' : 'card'}-${Date.now()}.png`
      a.click()
    } catch (err) {
      console.error('Failed to download mockup', err)
      alert('Failed to generate image. Please try again.')
    }
  }

  if (!mounted) return null

  return (
    <main style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '100px', position: 'relative' }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', top: '0', left: '50%', transform: 'translateX(-50%)', width: '100vw', height: '500px', background: 'radial-gradient(ellipse at top, rgba(63, 89, 231, 0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div className="container-xl" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <Link href="/#tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
            <ArrowLeft size={16} /> Back to Tools
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(63, 89, 231, 0.1)', border: '1px solid rgba(63, 89, 231, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MonitorPlay size={24} color="#3F59E7" />
            </div>
            <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 600, letterSpacing: '-1px', color: '#fff', margin: 0 }}>
              Thumbnail <span style={{ color: '#3F59E7' }}>Preview</span>
            </h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', maxWidth: '580px', lineHeight: 1.6, margin: 0 }}>
            Mockup your YouTube thumbnails before uploading. See exactly how they will look to your viewers.
          </p>
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>

          {/* Left: Preview Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, margin: 0 }}>Preview</h2>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '24px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '500px'
            }}>
              {/* Mockup Container */}
              <div
                ref={previewRef}
                style={{
                  position: 'relative',
                  background: bgColor,
                  padding: format === 'card' ? `${padding}px` : '0',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'padding 0.2s, background 0.2s',
                  overflow: 'hidden'
                }}
              >
                {/* Wrapper to hold Card + Glow */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>

                  {/* Glowing Contour (Blurred Image behind the card) */}
                  {format === 'card' && image && (
                    <div style={{
                      position: 'absolute',
                      inset: '-4px', // Spread the glow out slightly
                      zIndex: 0,
                      background: `url(${image}) center/cover`,
                      filter: 'blur(20px)',
                      opacity: 0.85,
                      borderRadius: '24px'
                    }} />
                  )}

                  {/* The YouTube Card */}
                  <div
                    ref={cardRef}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      padding: format === 'card' ? '16px' : '0',
                      borderRadius: format === 'card' ? '16px' : '0',
                      border: format === 'card' ? '1px solid rgba(255,255,255,0.15)' : 'none',
                      boxShadow: format === 'card' ? '0 20px 40px rgba(0,0,0,0.3)' : 'none',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Glass Background of the Card */}
                    {format === 'card' && image && (
                      <div style={{
                        position: 'absolute',
                        inset: '-20px', // expand to avoid blurry edges
                        zIndex: 0,
                        background: `url(${image}) center/cover`,
                        filter: 'blur(25px)',
                        transform: 'scale(1.1)'
                      }} />
                    )}

                    {/* Dark Overlay for the Card Glass */}
                    {format === 'card' && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 1,
                        background: 'rgba(20, 20, 25, 0.65)'
                      }} />
                    )}

                    {/* Content Container */}
                    <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Thumbnail Image */}
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '16/9',
                        background: '#2A2A30',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {image ? (
                          <img src={image} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Upload thumbnail</span>
                        )}
                        {/* Duration Badge */}
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.8)',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 500,
                          padding: '3px 6px',
                          borderRadius: '4px',
                          letterSpacing: '0.5px'
                        }}>
                          {duration || '0:00'}
                        </div>
                      </div>

                      {/* Video Info */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: format === 'card' ? '0 4px' : '4px 0' }}>
                        <h3 style={{
                          color: '#fff',
                          fontSize: '16px',
                          fontWeight: 600,
                          margin: 0,
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {title || 'Your Video Title Goes Here'}
                        </h3>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: '13px',
                          background: format === 'card' ? 'rgba(255,255,255,0.05)' : 'transparent',
                          padding: format === 'card' ? '8px 12px' : '0',
                          borderRadius: '8px'
                        }}>
                          <span>{channel || 'Channel Name'}</span>
                          <span>{views ? `${views} views` : '0 views'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Settings Panel */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Thumbnail Upload */}
            <div>
              <label style={{ display: 'block', color: '#fff', fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>Thumbnail Image</label>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.02)', color: '#fff', fontSize: '14px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              >
                <Upload size={16} /> Select Thumbnail
              </button>
            </div>

            {/* Background Color */}
            {format === 'card' && (
              <div>
                <label style={{ display: 'block', color: '#fff', fontSize: '13px', fontWeight: 500, marginBottom: '12px' }}>Background Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    style={{ width: '32px', height: '32px', padding: 0, border: 'none', borderRadius: '50%', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}
                  />
                  <input
                    type="text"
                    value={bgColor.toUpperCase()}
                    onChange={(e) => setBgColor(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', fontFamily: 'monospace', outline: 'none', width: '100%' }}
                  />
                </div>
              </div>
            )}

            {/* Padding Slider */}
            {format === 'card' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>Side Padding</label>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{padding}px</span>
                </div>
                <input
                  type="range" min="0" max="100" value={padding} onChange={(e) => setPadding(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#3F59E7' }}
                />
              </div>
            )}

            {/* Text Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>Video Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Enter title..."
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>Channel Name</label>
                <input
                  type="text"
                  value={channel}
                  onChange={e => setChannel(e.target.value)}
                  placeholder="Channel Name"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>Views (e.g. 120K)</label>
                  <input
                    type="text"
                    value={views}
                    onChange={e => setViews(e.target.value)}
                    placeholder="120K"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>Duration (e.g. 10:30)</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    placeholder="10:30"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* Download Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => handleDownload(false)}
                className="btn-banger no-hover-btn"
                style={{ padding: '14px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', boxShadow: 'none' }}
              >
                <Download size={16} /> Without BG
              </button>
              <button
                onClick={() => handleDownload(true)}
                className="btn-banger no-hover-btn"
                style={{ padding: '14px', background: 'linear-gradient(135deg, #3F59E7, #1B38DC)', color: '#fff', border: 'none', fontSize: '13px', boxShadow: 'none' }}
              >
                <Download size={16} /> With BG
              </button>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .container-xl > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }
        }
        
        .no-hover-btn:hover {
          transform: none !important;
          box-shadow: none !important;
        }
        .no-hover-btn:hover::before {
          display: none !important;
          opacity: 0 !important;
        }
      `}</style>
    </main>
  )
}

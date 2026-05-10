'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Sparkles, Copy, Check, ChevronDown, ChevronUp,
  AlertCircle, Loader2, Video, TrendingUp, KeyRound, RefreshCcw, Star, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

const SYSTEM_PROMPT = `You are a YouTube CTR optimization expert. 
IMPORTANT: Detect the exact language/dialect of the user's title (e.g., Moroccan Darija, English, Arabic, French). 
You MUST write all 3 new titles AND all text (feedback, analysis, drawbacks, tips) entirely in THAT SAME LANGUAGE.

Respond ONLY with valid JSON.
Format:
{
  "originalAnalysis": {
    "rating": number (1-10),
    "feedback": "string (why the original title is good or bad)"
  },
  "titles": [
    {
      "title": "string (new optimized title)",
      "rating": number (1-10),
      "analysis": "string (why this title works)",
      "drawbacks": "string (limitations)",
      "tips": "string (best practice)"
    }
  ] // EXACTLY 3 items in titles array
}`

interface TitleResult {
  title: string
  rating: number
  analysis: string
  drawbacks: string
  tips: string
}

interface OriginalAnalysis {
  rating: number
  feedback: string
}

export default function TitleOptimizerPage() {
  const [mounted, setMounted] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [inputTitle, setInputTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [originalAnalysis, setOriginalAnalysis] = useState<OriginalAnalysis | null>(null)
  const [results, setResults] = useState<TitleResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const handleGenerate = async () => {
    if (!inputTitle.trim()) { setError('Please enter a YouTube title.'); return }
    if (!apiKey.trim()) { setError('Please enter your Gemini API key.'); return }

    setError(null)
    setResults([])
    setOriginalAnalysis(null)
    setIsLoading(true)
    setExpandedIdx(null)

    const userPrompt = `Analyze this YouTube title and give 3 optimized alternatives: "${inputTitle.trim()}"`

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { 
              temperature: 0.85, 
              maxOutputTokens: 1500,
              responseMimeType: "application/json"
            },
          }),
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err?.error?.message || `API error ${res.status}`
        throw new Error(msg)
      }

      const data = await res.json()
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

      if (!raw) throw new Error('Empty response from Gemini.')

      try {
        const parsed = JSON.parse(raw)
        if (parsed.originalAnalysis) {
          setOriginalAnalysis(parsed.originalAnalysis)
        }
        if (parsed.titles && Array.isArray(parsed.titles) && parsed.titles.length > 0) {
          setResults(parsed.titles.slice(0, 3))
          setExpandedIdx(0)
        } else {
          throw new Error('No titles found in response.')
        }
      } catch (parseErr) {
        console.error('Parse error:', raw)
        setError('Could not parse the response format. Please try again.')
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <main style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>
      {/* Background gradients */}
      <div style={{ position: 'fixed', top: '0', left: '50%', transform: 'translateX(-50%)', width: '100vw', height: '500px', background: 'radial-gradient(ellipse at top, rgba(255,0,0,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div className="container-xl" style={{ maxWidth: '780px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: '44px' }}>
          <Link href="/#tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
            <ArrowLeft size={16} /> Back to Tools
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Video size={24} color="#FF0000" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 600, letterSpacing: '-1px', color: '#fff', margin: 0 }}>
                YouTube <span style={{ color: '#FF0000' }}>Optimizer</span>
              </h1>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', background: 'linear-gradient(90deg, rgba(0,220,100,0.15), rgba(0,220,100,0.05))', color: '#00dc64', border: '1px solid rgba(0,220,100,0.2)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} /> Unlimited Free • 0 Tokens
              </span>
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', maxWidth: '580px', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
            Paste your video title and get <strong style={{ color: '#fff', fontWeight: 600 }}>3 AI-optimized variants</strong> that maximize CTR. No platform tokens required.
          </p>
        </div>

        {/* API Key Card */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={16} color="rgba(255,255,255,0.8)" />
              <span style={{ color: '#fff', fontWeight: 500, fontSize: '14px' }}>Gemini API Key</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.5px' }}>FREE</span>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            >
              Get free key <ExternalLink size={14} />
            </a>
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIza..."
              style={{
                width: '100%', padding: '14px 60px 14px 16px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)',
                color: '#fff', fontSize: '14px', fontFamily: 'monospace', outline: 'none',
                transition: 'border-color 0.2s', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            <button onClick={() => setShowKey(!showKey)}
              style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>
              {showKey ? 'HIDE' : 'SHOW'}
            </button>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '8px', margin: '8px 0 0' }}>
            🔒 Your key stays in your browser only — never sent to our servers.
          </p>
        </div>

        {/* Title Input */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
            Current YouTube Title
          </p>
          <textarea
            value={inputTitle}
            onChange={e => setInputTitle(e.target.value)}
            placeholder="e.g. How to make money online in 2024"
            rows={2}
            style={{
              width: '100%', padding: '16px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)',
              color: '#fff', fontSize: '15px', outline: 'none', resize: 'vertical',
              fontFamily: 'inherit', lineHeight: 1.5, transition: 'border-color 0.2s, background 0.2s', boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(255,0,0,0.5)'; e.target.style.background = 'rgba(255,0,0,0.02)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.02)' }}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate() }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Press <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>Ctrl</kbd> + <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>Enter</kbd>
            </span>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.2)', color: '#ff6b6b', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
              <AlertCircle size={18} />{error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          style={{
            width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid transparent',
            background: isLoading ? 'rgba(255,255,255,0.05)' : '#FF0000',
            color: isLoading ? 'rgba(255,255,255,0.5)' : '#fff', fontSize: '15px', fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: isLoading ? 'none' : '0 4px 14px rgba(255,0,0,0.25)',
            marginBottom: '40px',
          }}
          onMouseEnter={e => { if(!isLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = '#e60000' } }}
          onMouseLeave={e => { if(!isLoading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#FF0000' } }}
        >
          {isLoading
            ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Generating...</>
            : <><Sparkles size={18} />Optimize Title</>
          }
        </button>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={14} color="#FF0000" /> 3 CTR-Optimized Titles
                </p>
                <button onClick={handleGenerate} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
                  <RefreshCcw size={12} /> Regenerate
                </button>
              </div>

              {originalAnalysis && (
                <div style={{ 
                  background: originalAnalysis.rating >= 8 ? 'rgba(0,220,100,0.05)' : originalAnalysis.rating >= 5 ? 'rgba(245,158,11,0.05)' : 'rgba(255,0,0,0.05)', 
                  border: originalAnalysis.rating >= 8 ? '1px solid rgba(0,220,100,0.2)' : originalAnalysis.rating >= 5 ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(255,0,0,0.2)', 
                  borderRadius: '12px', padding: '20px', marginBottom: '24px', transition: 'all 0.3s' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500, margin: 0 }}>
                      Original Title Score
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Star size={12} fill="#fbbf24" color="#fbbf24" />
                      <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>{originalAnalysis.rating}/10</span>
                    </div>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                    {originalAnalysis.feedback}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {results.map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    style={{ borderRadius: '12px', border: expandedIdx === i ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)', background: expandedIdx === i ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)', overflow: 'hidden', transition: 'all 0.2s ease' }}>

                    {/* Title Row */}
                    <div style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,0,0,0.1)', color: '#FF0000', border: '1px solid rgba(255,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 600, fontSize: '13px' }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#fff', fontSize: '16px', fontWeight: 500, lineHeight: 1.5, margin: '0 0 12px', wordBreak: 'break-word' }}>
                          {r.title}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {Array.from({ length: 10 }).map((_, si) => (
                              <Star key={si} size={12} fill={si < r.rating ? '#fbbf24' : 'transparent'} color={si < r.rating ? '#fbbf24' : 'rgba(255,255,255,0.15)'} />
                            ))}
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 500 }}>{r.rating}/10</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button onClick={() => handleCopy(r.title, i)}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: copiedIdx === i ? '#FF0000' : 'rgba(255,255,255,0.05)', color: copiedIdx === i ? '#fff' : 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
                          {copiedIdx === i ? <><Check size={14} />Copied!</> : <><Copy size={14} />Copy</>}
                        </button>
                        {(r.analysis || r.drawbacks || r.tips) && (
                          <button onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                            {expandedIdx === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {expandedIdx === i && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {r.analysis && (
                              <div>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', marginTop: 0 }}>Analysis</p>
                                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{r.analysis}</p>
                              </div>
                            )}
                            {r.drawbacks && (
                              <div>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', marginTop: 0 }}>Drawbacks</p>
                                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{r.drawbacks}</p>
                              </div>
                            )}
                            {r.tips && (
                              <div>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', marginTop: 0 }}>Best Practice</p>
                                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{r.tips}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}

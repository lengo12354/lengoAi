'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Sparkles, Copy, Check, ChevronDown, ChevronUp,
  AlertCircle, Loader2, Film, TrendingUp, KeyRound, RefreshCcw, ExternalLink, Clapperboard, Play, Zap
} from 'lucide-react'
import Link from 'next/link'
import { generateGeminiContent } from '@/app/actions/gemini'
import { getUserTokens, deductFixedTokens } from '@/app/actions/tokens'

const SYSTEM_PROMPT = `You are a professional film/video editor and movie expert.
IMPORTANT: Detect the exact language/dialect of the user's text/script (e.g., Moroccan Darija, English, Arabic, French).
You MUST write all your suggestions and explanations entirely in THAT SAME LANGUAGE.

CRITICAL REQUIREMENT:
Suggest short B-roll clips (5-15 seconds) from FAMOUS movies or TV series that editors can use as visual B-roll over their voiceover.
Prioritize iconic, visually striking shots that are highly likely to be found on YouTube as standalone clips.

Respond ONLY with valid JSON matching the provided schema.`

interface BrollResult {
  movieOrSeries: string
  timestamp: string
  shotDescription: string
  visualStyle: string
  whyItFits: string
  youtubeSearchQuery: string
}

export default function BrollFinderPage() {
  const [mounted, setMounted] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<BrollResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const [tokens, setTokens] = useState<number | null>(null)

  useEffect(() => { 
    setMounted(true)
    getUserTokens().then(bal => setTokens(bal))
  }, [])

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const handleGenerate = async () => {
    if (!inputText.trim()) { setError('Please enter a script or voiceover text.'); return }
    if (tokens !== null && tokens < 200) {
      setError('Insufficient tokens. You need 200 tokens to find B-Rolls.')
      return
    }

    setError(null)
    setResults([])
    setIsLoading(true)
    setExpandedIdx(null)

    const userPrompt = `Find 5 short B-roll clips from famous movies or TV series that a video editor can use as visual B-roll over this voiceover/script: "${inputText.trim()}"`

    try {
      // Deduct tokens first
      const tokenRes = await deductFixedTokens(200)
      if (!tokenRes.success) {
        setError(tokenRes.error || 'Failed to deduct tokens.')
        setIsLoading(false)
        return
      }

      if (tokenRes.remainingBalance !== undefined) {
        setTokens(tokenRes.remainingBalance)
      }

      const generationConfig = {
        temperature: 0.8,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            brolls: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  movieOrSeries:      { type: 'string' },
                  timestamp:          { type: 'string' },
                  shotDescription:    { type: 'string' },
                  visualStyle:        { type: 'string' },
                  whyItFits:          { type: 'string' },
                  youtubeSearchQuery: { type: 'string' },
                },
                required: ['movieOrSeries', 'timestamp', 'shotDescription', 'visualStyle', 'whyItFits', 'youtubeSearchQuery'],
              },
              minItems: 5,
              maxItems: 5,
            },
          },
          required: ['brolls'],
        },
      }

      const raw = await generateGeminiContent(SYSTEM_PROMPT, userPrompt, generationConfig)

      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(cleaned)

      if (parsed.brolls && Array.isArray(parsed.brolls) && parsed.brolls.length > 0) {
        setResults(parsed.brolls.slice(0, 5))
        setExpandedIdx(0)
      } else {
        throw new Error('No B-roll suggestions found in response.')
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) return null

  const ACCENT = '#F59E0B'
  const ACCENT_DIM = 'rgba(245,158,11,0.15)'
  const ACCENT_BORDER = 'rgba(245,158,11,0.25)'

  return (
    <main style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>
      {/* Background */}
      <div style={{ position: 'fixed', top: '0', left: '50%', transform: 'translateX(-50%)', width: '100vw', height: '500px', background: `radial-gradient(ellipse at top, rgba(245,158,11,0.05) 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />

      <div className="container-xl" style={{ maxWidth: '780px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: '44px' }}>
          <Link href="/#tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
            <ArrowLeft size={16} /> Back to Tools
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: ACCENT_DIM, border: `1px solid ${ACCENT_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clapperboard size={24} color={ACCENT} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 600, letterSpacing: '-1px', color: '#fff', margin: 0 }}>
                B-Roll <span style={{ color: ACCENT }}>Finder</span>
              </h1>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', background: 'linear-gradient(90deg, rgba(63,89,231,0.15), rgba(63,89,231,0.05))', color: '#94A2F2', border: '1px solid rgba(63,89,231,0.2)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={12} fill="currentColor" /> 200 Tokens per use
              </span>
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', maxWidth: '580px', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
            Paste your voiceover or script and let AI find <strong style={{ color: '#fff', fontWeight: 600 }}>5 cinematic B-roll clips</strong> from famous movies & series to layer over your edit.
          </p>

          {tokens !== null && (
            <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
              <Zap size={14} color="#f59e0b" fill="#f59e0b" />
              Your Balance: <strong style={{ color: '#fff' }}>{tokens.toLocaleString()}</strong> tokens
            </div>
          )}
        </div>

        {/* Tokens Alert */}
        {(tokens === null || tokens < 200) && (
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '16px 24px', borderRadius: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#f59e0b' }}>
              <Zap size={24} fill="#f59e0b" strokeWidth={1} />
              <div>
                <span style={{ fontWeight: 700, display: 'block', fontSize: '16px' }}>{tokens === null ? 'You need to be logged in!' : 'Insufficient tokens!'}</span>
                <span style={{ fontSize: '13px', opacity: 0.8 }}>{tokens === null ? 'Please log in to use this tool.' : 'You need at least 200 tokens to find B-Rolls.'}</span>
              </div>
            </div>
            {tokens === null ? (
              <a href="/auth/login" style={{ background: '#f59e0b', color: '#080C2A', fontWeight: 700, padding: '10px 20px', fontSize: '14px', borderRadius: '100px', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}
                 onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = '#FBBF24' }}
                 onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#f59e0b' }}>
                Log In
              </a>
            ) : (
              <a href="/#pricing" style={{ background: '#f59e0b', color: '#080C2A', fontWeight: 700, padding: '10px 20px', fontSize: '14px', borderRadius: '100px', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}
                 onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = '#FBBF24' }}
                 onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#f59e0b' }}>
                Buy Tokens
              </a>
            )}
          </div>
        )}


        {/* Text Input */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
            Your Voiceover / Script
          </p>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="e.g., When you finally achieve your goals, you realize the journey was the most important part..."
            rows={4}
            style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: '#fff', fontSize: '15px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, transition: 'border-color 0.2s, background 0.2s', boxSizing: 'border-box' }}
            onFocus={e => { e.target.style.borderColor = ACCENT_BORDER; e.target.style.background = 'rgba(245,158,11,0.02)' }}
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
          disabled={isLoading || tokens === null || tokens < 200}
          style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid transparent', background: isLoading || tokens === null || tokens < 200 ? 'rgba(255,255,255,0.05)' : ACCENT, color: isLoading || tokens === null || tokens < 200 ? 'rgba(255,255,255,0.5)' : '#080C2A', fontSize: '15px', fontWeight: 600, cursor: isLoading || tokens === null || tokens < 200 ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: isLoading || tokens === null || tokens < 200 ? 'none' : '0 4px 14px rgba(245,158,11,0.3)', marginBottom: '40px' }}
          onMouseEnter={e => { if (!isLoading && tokens !== null && tokens >= 200) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = '#FBBF24' } }}
          onMouseLeave={e => { if (!isLoading && tokens !== null && tokens >= 200) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = ACCENT } }}
        >
          {isLoading
            ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Finding B-Roll Clips...</>
            : <><Film size={18} />Find B-Roll Clips</>
          }
        </button>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={14} color={ACCENT} /> 5 Cinematic B-Roll Clips
                </p>
                <button onClick={handleGenerate} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
                  <RefreshCcw size={12} /> Regenerate
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {results.map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    style={{ borderRadius: '12px', border: expandedIdx === i ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.08)', background: expandedIdx === i ? 'rgba(245,158,11,0.03)' : 'rgba(255,255,255,0.01)', overflow: 'hidden', transition: 'all 0.2s ease' }}>

                    {/* Card Header */}
                    <div style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                      {/* Number badge */}
                      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: ACCENT_DIM, color: ACCENT, border: `1px solid ${ACCENT_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '13px' }}>
                        {i + 1}
                      </div>

                      {/* Main info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#fff', fontSize: '16px', fontWeight: 600, lineHeight: 1.4, margin: '0 0 6px', wordBreak: 'break-word' }}>
                          {r.movieOrSeries}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: 1.5, margin: '0 0 10px', wordBreak: 'break-word' }}>
                          {r.shotDescription}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500, background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            ⏱ {r.timestamp}
                          </span>
                          <span style={{ color: ACCENT, fontSize: '12px', fontWeight: 500, background: ACCENT_DIM, padding: '3px 8px', borderRadius: '4px', border: `1px solid ${ACCENT_BORDER}` }}>
                            {r.visualStyle}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                        {/* YouTube button */}
                        {r.youtubeSearchQuery && (
                          <a
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(r.youtubeSearchQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,0,0,0.3)', background: 'rgba(255,0,0,0.1)', color: '#ff4444', textDecoration: 'none', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#ff0000'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#ff0000' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,0,0,0.1)'; e.currentTarget.style.color = '#ff4444'; e.currentTarget.style.borderColor = 'rgba(255,0,0,0.3)' }}
                          >
                            <Play size={13} fill="currentColor" /> YouTube
                          </a>
                        )}
                        {/* Copy button */}
                        <button
                          onClick={() => handleCopy(`${r.movieOrSeries} — ${r.timestamp}\n${r.shotDescription}\nStyle: ${r.visualStyle}\nWhy: ${r.whyItFits}\nSearch: ${r.youtubeSearchQuery}`, i)}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: copiedIdx === i ? ACCENT : 'rgba(255,255,255,0.05)', color: copiedIdx === i ? '#080C2A' : 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                          {copiedIdx === i ? <><Check size={13} />Copied!</> : <><Copy size={13} />Copy</>}
                        </button>
                        {/* Expand button */}
                        <button
                          onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                          style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                          {expandedIdx === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {expandedIdx === i && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {r.whyItFits && (
                              <div>
                                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', marginTop: 0 }}>Why It Works As B-Roll</p>
                                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', lineHeight: 1.65, margin: 0 }}>{r.whyItFits}</p>
                              </div>
                            )}
                            {r.youtubeSearchQuery && (
                              <div>
                                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', marginTop: 0 }}>YouTube Search Query</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                  <code style={{ color: ACCENT, fontSize: '13px', background: ACCENT_DIM, padding: '6px 12px', borderRadius: '6px', border: `1px solid ${ACCENT_BORDER}`, flex: 1, wordBreak: 'break-all' }}>{r.youtubeSearchQuery}</code>
                                  <a
                                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(r.youtubeSearchQuery)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid rgba(255,0,0,0.3)', background: 'rgba(255,0,0,0.1)', color: '#ff4444', textDecoration: 'none', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#ff0000'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#ff0000' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,0,0,0.1)'; e.currentTarget.style.color = '#ff4444'; e.currentTarget.style.borderColor = 'rgba(255,0,0,0.3)' }}
                                  >
                                    <Play size={14} fill="currentColor" /> Search on YouTube
                                  </a>
                                </div>
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

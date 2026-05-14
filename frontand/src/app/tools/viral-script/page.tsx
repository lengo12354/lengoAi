'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Sparkles, Copy, Check,
  AlertCircle, Loader2, ScrollText, TrendingUp, RefreshCcw, Zap
} from 'lucide-react'
import Link from 'next/link'
import { generateGeminiContent } from '@/app/actions/gemini'
import { getUserTokens, deductFixedTokens } from '@/app/actions/tokens'

const SYSTEM_PROMPT = `You are an elite short-form video copywriter (TikTok, IG Reels, YouTube Shorts).
Your goal is to write 2 highly engaging, viral video scripts based on the user's topic.

IMPORTANT: Detect the exact language/dialect of the user's input (e.g., Moroccan Darija, English, Arabic, French). 
You MUST write the ENTIRE script in THAT SAME LANGUAGE.

CRITICAL INSTRUCTIONS:
- Write ONLY the actual spoken script text (what the speaker will actually say out loud).
- Structure the script into distinct sections using brackets: [ HOOK ], [ BODY ], and [ CALL TO ACTION ].
- DO NOT include ANY visual cues, text-on-screen instructions, or "Why it works" analysis.
- The ONLY things inside brackets should be the section titles.

Respond ONLY with valid JSON.`

interface ScriptResult {
  variation: string
  content: string
}

export default function ScriptGeneratorPage() {
  const [mounted, setMounted] = useState(false)
  const [inputTopic, setInputTopic] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<ScriptResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const [tokens, setTokens] = useState<number | null>(null)

  useEffect(() => { 
    setMounted(true)
    getUserTokens().then(bal => setTokens(bal))
  }, [])

  const handleCopy = (script: ScriptResult, idx: number) => {
    navigator.clipboard.writeText(script.content)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const handleGenerate = async () => {
    if (!inputTopic.trim()) { setError('Please enter a topic.'); return }
    if (tokens !== null && tokens < 200) {
      setError('Insufficient tokens. You need 200 tokens to generate scripts.')
      return
    }

    setError(null)
    setResults([])
    setIsLoading(true)

    const userPrompt = `Write 2 highly engaging viral short-form video scripts for this topic: "${inputTopic.trim()}"`

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
        temperature: 0.9, 
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            scripts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  variation: { type: "string" },
                  content: { type: "string" }
                },
                required: ["variation", "content"]
              },
              minItems: 2,
              maxItems: 2
            }
          },
          required: ["scripts"]
        }
      }

      const raw = await generateGeminiContent(SYSTEM_PROMPT, userPrompt, generationConfig)

      try {
        const jsonStr = raw.replace(/```json/g, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(jsonStr)
        if (parsed.scripts && Array.isArray(parsed.scripts) && parsed.scripts.length > 0) {
          setResults(parsed.scripts)
        } else {
          throw new Error('No scripts found in response.')
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
      <div style={{ position: 'fixed', top: '0', left: '50%', transform: 'translateX(-50%)', width: '100vw', height: '500px', background: 'radial-gradient(ellipse at top, rgba(16, 185, 129, 0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div className="container-xl" style={{ maxWidth: '840px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: '44px' }}>
          <Link href="/#tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '24px', fontSize: '14px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
            <ArrowLeft size={16} /> Back to Tools
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ScrollText size={24} color="#10B981" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 600, letterSpacing: '-1px', color: '#fff', margin: 0 }}>
                Viral Script <span style={{ color: '#10B981' }}>Generator</span>
              </h1>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', background: 'linear-gradient(90deg, rgba(63,89,231,0.15), rgba(63,89,231,0.05))', color: '#94A2F2', border: '1px solid rgba(63,89,231,0.2)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={12} fill="currentColor" /> 200 Tokens per use
              </span>
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', maxWidth: '640px', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
            Enter your topic and get <strong style={{ color: '#fff', fontWeight: 600 }}>2 pure viral scripts</strong> for Reels/TikTok ready to be read.
          </p>
          
          {tokens !== null && (
            <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
              <Zap size={14} color="#f59e0b" fill="#f59e0b" />
              Your Balance: <strong style={{ color: '#fff' }}>{tokens.toLocaleString()}</strong> tokens
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
            What is your video about?
          </p>
          <textarea
            value={inputTopic}
            onChange={e => setInputTopic(e.target.value)}
            placeholder="e.g., 3 AI tools that will save you 10 hours a week, How to start a faceless channel..."
            rows={3}
            style={{
              width: '100%', padding: '16px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)',
              color: '#fff', fontSize: '15px', outline: 'none', resize: 'vertical',
              fontFamily: 'inherit', lineHeight: 1.5, transition: 'border-color 0.2s, background 0.2s', boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(16, 185, 129, 0.5)'; e.target.style.background = 'rgba(16, 185, 129, 0.02)' }}
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
              style={{ background: 'rgba(255, 69, 0, 0.08)', border: '1px solid rgba(255, 69, 0, 0.2)', color: '#ff7b4b', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
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
            background: isLoading ? 'rgba(255,255,255,0.05)' : '#10B981',
            color: isLoading ? 'rgba(255,255,255,0.5)' : '#022c22', fontSize: '15px', fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: isLoading ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.25)',
            marginBottom: '40px',
          }}
          onMouseEnter={e => { if(!isLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = '#059669' } }}
          onMouseLeave={e => { if(!isLoading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#10B981' } }}
        >
          {isLoading
            ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Generating Scripts...</>
            : <><Sparkles size={18} />Generate Scripts</>
          }
        </button>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={14} color="#10B981" /> 2 Script Variations
                </p>
                <button onClick={handleGenerate} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
                  <RefreshCcw size={12} /> Regenerate
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {results.map((script, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    style={{ borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.02)', overflow: 'hidden' }}>

                    {/* Card Header */}
                    <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 600, fontSize: '13px' }}>
                          {i + 1}
                        </div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 600 }}>
                          {script.variation}
                        </h3>
                      </div>
                      <button onClick={() => handleCopy(script, i)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: copiedIdx === i ? '#10B981' : 'rgba(255,255,255,0.05)', color: copiedIdx === i ? '#022c22' : 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
                        {copiedIdx === i ? <><Check size={14} />Copied!</> : <><Copy size={14} />Copy</>}
                      </button>
                    </div>

                    {/* Script Content */}
                    <div style={{ padding: '24px' }}>
                      <p 
                        dir="auto"
                        style={{ 
                          margin: 0, 
                          color: 'rgba(255,255,255,0.9)', 
                          fontSize: '16px', 
                          lineHeight: 1.8, 
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'inherit',
                          textAlign: 'start'
                        }}>
                        {script.content}
                      </p>
                    </div>

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

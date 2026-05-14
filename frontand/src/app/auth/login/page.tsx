'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Captions, Mail, Loader2, Lock, ArrowRight, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { initUserProfile } from '@/app/actions/tokens'

type Mode = 'login' | 'signup'
type SignupStep = 'email' | 'verify' | 'password'

// Only allow specific email providers for signup
const ALLOWED_DOMAINS = ['gmail.com', 'outlook.com']

function isAllowedDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return ALLOWED_DOMAINS.includes(domain)
}

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [mode, setMode] = useState<Mode>('login')
  const [signupStep, setSignupStep] = useState<SignupStep>('email')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // ─── LOGIN FLOW ───
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  // ─── SIGNUP FLOW ───
  // Step 1: Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Only allow gmail.com addresses
    if (!isAllowedDomain(email)) {
      setMessage({
        type: 'error',
        text: 'Only Gmail addresses (@gmail.com) are accepted for sign up.'
      })
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      }
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    } else {
      setMessage({ type: 'success', text: `We sent an 8-digit code to ${email}` })
      setSignupStep('verify')
      setLoading(false)
    }
  }

  // Step 2: Verify the OTP code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    } else {
      setMessage({ type: 'success', text: 'Email verified! Please set your new password.' })
      setSignupStep('password')
      setLoading(false)
    }
  }

  // Step 3: Set the password (since they are now logged in via OTP)
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    } else {
      // Create profile with 300 free tokens for new user
      await initUserProfile()
      router.push('/')
      router.refresh()
    }
  }

  // Helper to switch modes
  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    setSignupStep('email')
    setMessage(null)
    setCode('')
    setPassword('')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
      {/* Background Glow */}
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(63,89,231,0.1) 0%, transparent 70%)',
          filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: '420px', zIndex: 1 }}
        className="glass-card"
      >
        <div style={{ padding: '40px' }}>
          
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              <div style={{
                width: '48px', height: '48px',
                background: 'linear-gradient(135deg, #3F59E7, #1B38DC)',
                borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 30px rgba(63, 89, 231, 0.4)',
              }}>
                <Captions size={24} color="white" strokeWidth={2} />
              </div>
            </a>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            {mode === 'login' 
              ? 'Welcome back' 
              : signupStep === 'email' ? 'Create an account'
              : signupStep === 'verify' ? 'Check your email'
              : 'Set your password'
            }
          </h1>
          <p style={{ color: 'var(--muted)', textAlign: 'center', marginBottom: '24px', fontSize: '15px' }}>
            {mode === 'login' 
              ? 'Sign in to your lengoAi account.'
              : signupStep === 'email' ? 'Enter your email to get started.'
              : signupStep === 'verify' ? 'Enter the 8-digit code we sent you.'
              : 'Choose a strong password for your account.'
            }
          </p>

          {/* Mode Toggle (Only show if not in the middle of signup steps) */}
          {((mode === 'login') || (mode === 'signup' && signupStep === 'email')) && (
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px', marginBottom: '24px' }}>
              <button
                onClick={() => switchMode('login')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: mode === 'login' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: mode === 'login' ? 'white' : 'var(--muted)',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                Log In
              </button>
              <button
                onClick={() => switchMode('signup')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: mode === 'signup' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: mode === 'signup' ? 'white' : 'var(--muted)',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Error / Success Message */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginBottom: '24px' }}
              >
                <div style={{
                  padding: '12px 16px', borderRadius: '8px', fontSize: '14px',
                  background: message.type === 'success' ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 107, 107, 0.1)',
                  color: message.type === 'success' ? '#94A2F2' : '#ff6b6b',
                  border: `1px solid ${message.type === 'success' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 107, 107, 0.2)'}`
                }}>
                  {message.text}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── LOGIN FORM ─── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--muted)', marginBottom: '8px' }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="var(--muted-hi)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" required
                    style={{
                      width: '100%', padding: '12px 16px 12px 44px', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white', fontSize: '15px', outline: 'none', transition: 'border 0.2s ease',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(63,89,231,0.5)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--muted)', marginBottom: '8px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="var(--muted-hi)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    style={{
                      width: '100%', padding: '12px 16px 12px 44px', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white', fontSize: '15px', outline: 'none', transition: 'border 0.2s ease',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(63,89,231,0.5)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading || !email || !password}
                className="btn-banger"
                style={{
                  width: '100%', padding: '14px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                  opacity: (loading || !email || !password) ? 0.7 : 1, cursor: (loading || !email || !password) ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                Log In
              </button>
            </form>
          )}

          {/* ─── SIGNUP FORM (3 STEPS) ─── */}
          {mode === 'signup' && (
            <>
              {/* Step 1: Email */}
              {signupStep === 'email' && (
                <form onSubmit={handleSendOtp}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--muted)', marginBottom: '8px' }}>
                      Email address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} color="var(--muted-hi)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com" required
                        style={{
                          width: '100%', padding: '12px 16px 12px 44px', borderRadius: '12px',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          color: 'white', fontSize: '15px', outline: 'none', transition: 'border 0.2s ease',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'rgba(63,89,231,0.5)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                    </div>
                  </div>

                  <button
                    type="submit" disabled={loading || !email}
                    className="btn-banger"
                    style={{
                      width: '100%', padding: '14px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                      opacity: (loading || !email) ? 0.7 : 1, cursor: (loading || !email) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                    Send verification code
                  </button>
                </form>
              )}

              {/* Step 2: Verify Code */}
              {signupStep === 'verify' && (
                <form onSubmit={handleVerifyOtp}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--muted)', marginBottom: '8px', textAlign: 'center' }}>
                      8-Digit Verification Code
                    </label>
                    <input
                      type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="00000000" required
                      style={{
                        width: '100%', padding: '16px', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', fontSize: '24px', letterSpacing: '8px', textAlign: 'center',
                        outline: 'none', transition: 'border 0.2s ease', fontWeight: 'bold'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(63,89,231,0.5)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>

                  <button
                    type="submit" disabled={loading || code.length !== 8}
                    className="btn-banger"
                    style={{
                      width: '100%', padding: '14px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                      opacity: (loading || code.length !== 8) ? 0.7 : 1, cursor: (loading || code.length !== 8) ? 'not-allowed' : 'pointer',
                      marginBottom: '16px',
                    }}
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                    Verify Code
                  </button>
                  <button
                    type="button" onClick={() => { setSignupStep('email'); setMessage(null); setCode(''); }}
                    style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Change Email
                  </button>
                </form>
              )}

              {/* Step 3: Set Password */}
              {signupStep === 'password' && (
                <form onSubmit={handleSetPassword}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--muted)', marginBottom: '8px' }}>
                      Set a Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} color="var(--muted-hi)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" required minLength={6}
                        style={{
                          width: '100%', padding: '12px 16px 12px 44px', borderRadius: '12px',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          color: 'white', fontSize: '15px', outline: 'none', transition: 'border 0.2s ease',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'rgba(63,89,231,0.5)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                    </div>
                  </div>

                  <button
                    type="submit" disabled={loading || password.length < 6}
                    className="btn-banger"
                    style={{
                      width: '100%', padding: '14px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                      opacity: (loading || password.length < 6) ? 0.7 : 1, cursor: (loading || password.length < 6) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                    Save Password & Enter
                  </button>
                </form>
              )}
            </>
          )}

        </div>
      </motion.div>
    </div>
  )
}

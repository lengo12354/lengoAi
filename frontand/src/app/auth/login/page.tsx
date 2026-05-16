'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Clapperboard, Mail, Loader2, Lock, ArrowRight, ShieldCheck, Star, Quote, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react'
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
    }
  }

  // ─── SIGNUP FLOW ───
  // Step 1: Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Only allow specific domains
    if (!isAllowedDomain(email)) {
      setMessage({
        type: 'error',
        text: 'Only Gmail & Outlook addresses are accepted for sign up.'
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

  // Step 3: Set the password
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
      try {
        // Create profile with 300 free tokens for new user
        await initUserProfile()
      } catch (err: any) {
        console.error("Profile initialization error:", err)
      } finally {
        setLoading(false)
        router.push('/')
      }
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
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .auth-container { display: flex; min-height: 100vh; background-color: #030303; color: white; font-family: 'Inter', system-ui, sans-serif; }
        .auth-left { flex: 1; display: flex; flex-direction: column; position: relative; z-index: 1; background-color: #050505; border-right: 1px solid rgba(255,255,255,0.05); }
        .auth-right { flex: 1.2; display: none; position: relative; overflow: hidden; background: #000; }
        @media (min-width: 900px) {
          .auth-right { display: flex; flex-direction: column; justify-content: center; padding: 60px 80px; }
        }
        .auth-content { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .auth-box { width: 100%; max-width: 360px; }
        .input-field { width: 100%; padding: 12px 14px 12px 40px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: white; font-size: 14px; outline: none; transition: all 0.2s ease; }
        .input-field:focus { border-color: rgba(63,89,231,0.6); background: rgba(63,89,231,0.05); box-shadow: 0 0 0 3px rgba(63,89,231,0.1); }
        .auth-right-bg { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 800px; height: 800px; background: radial-gradient(circle, rgba(63,89,231,0.15) 0%, transparent 60%); filter: blur(80px); pointer-events: none; z-index: 0; }
        .glass-panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 32px; backdrop-filter: blur(20px); position: relative; z-index: 1; box-shadow: 0 24px 48px rgba(0,0,0,0.4); }
        .toggle-btn { flex: 1; padding: 8px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .toggle-btn.active { background: rgba(255,255,255,0.1); color: white; }
        .toggle-btn.inactive { background: transparent; color: var(--muted, #888); }
        .toggle-btn.inactive:hover { color: white; }
        .btn-action { width: 100%; padding: 12px; font-size: 14px; display: flex; justify-content: center; align-items: center; gap: 8px; border-radius: 10px; font-weight: 600; }
      `}} />

      <div className="auth-container">
        {/* ─── LEFT COLUMN: AUTH FORM ─── */}
        <div className="auth-left">

          {/* Subtle Logo / Back Link */}
          <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}>
            <a href="/"
              style={{ display: 'inline-block', opacity: 0.5, transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>
              <img
                src="/lengoailogo.png"
                alt="Awartools"
                style={{ height: '22px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              />
            </a>
          </div>

          <div className="auth-content">
            <div className="auth-box">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.5px' }}>
                  {mode === 'login'
                    ? 'Welcome back'
                    : signupStep === 'email' ? 'Create an account'
                      : signupStep === 'verify' ? 'Check your email'
                        : 'Set your password'
                  }
                </h1>
                <p style={{ color: 'var(--muted, #888)', marginBottom: '20px', fontSize: '14px' }}>
                  {mode === 'login'
                    ? 'Enter your credentials to access your account.'
                    : signupStep === 'email' ? 'Start generating viral content in seconds.'
                      : signupStep === 'verify' ? 'Enter the 8-digit code we sent you.'
                        : 'Choose a strong password for your account.'
                  }
                </p>

                {/* Mode Toggle */}
                {((mode === 'login') || (mode === 'signup' && signupStep === 'email')) && (
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
                    <button
                      onClick={() => switchMode('login')}
                      className={`toggle-btn ${mode === 'login' ? 'active' : 'inactive'}`}
                    >
                      Log In
                    </button>
                    <button
                      onClick={() => switchMode('signup')}
                      className={`toggle-btn ${mode === 'signup' ? 'active' : 'inactive'}`}
                    >
                      Sign Up
                    </button>
                  </div>
                )}

                {/* Message Banner */}
                <AnimatePresence>
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden', marginBottom: '16px' }}
                    >
                      <div style={{
                        padding: '12px 14px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                        background: message.type === 'success' ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255, 107, 107, 0.05)',
                        color: message.type === 'success' ? '#00e5ff' : '#ff6b6b',
                        border: `1px solid ${message.type === 'success' ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 107, 107, 0.1)'}`
                      }}>
                        {message.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
                        <span>{message.text}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ─── LOGIN FORM ─── */}
                {mode === 'login' && (
                  <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#aaa', marginBottom: '6px' }}>
                        Email address
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={16} color="#666" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com" required
                          className="input-field"
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#aaa', marginBottom: '6px' }}>
                        Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={16} color="#666" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••" required
                          className="input-field"
                        />
                      </div>
                    </div>

                    <button
                      type="submit" disabled={loading || !email || !password}
                      className="btn-banger btn-action"
                      style={{
                        opacity: (loading || !email || !password) ? 0.7 : 1, cursor: (loading || !email || !password) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                      Log In to Dashboard
                    </button>
                  </form>
                )}

                {/* ─── SIGNUP FORM ─── */}
                {mode === 'signup' && (
                  <>
                    {/* Step 1: Email */}
                    {signupStep === 'email' && (
                      <form onSubmit={handleSendOtp}>
                        <div style={{ marginBottom: '24px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#aaa', marginBottom: '6px' }}>
                            Email address
                          </label>
                          <div style={{ position: 'relative' }}>
                            <Mail size={16} color="#666" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                              placeholder="you@gmail.com" required
                              className="input-field"
                            />
                          </div>
                          <p style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
                            * Currently in beta. Only @gmail.com or @outlook.com emails are accepted.
                          </p>
                        </div>

                        <button
                          type="submit" disabled={loading || !email}
                          className="btn-banger btn-action"
                          style={{
                            opacity: (loading || !email) ? 0.7 : 1, cursor: (loading || !email) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                          Continue with Email
                        </button>
                      </form>
                    )}

                    {/* Step 2: Verify Code */}
                    {signupStep === 'verify' && (
                      <form onSubmit={handleVerifyOtp}>
                        <div style={{ marginBottom: '24px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#aaa', marginBottom: '6px', textAlign: 'center' }}>
                            8-Digit Verification Code
                          </label>
                          <input
                            type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            placeholder="00000000" required
                            className="input-field"
                            style={{ fontSize: '20px', letterSpacing: '8px', textAlign: 'center', padding: '16px', fontWeight: 'bold' }}
                          />
                        </div>

                        <button
                          type="submit" disabled={loading || code.length !== 8}
                          className="btn-banger btn-action"
                          style={{
                            opacity: (loading || code.length !== 8) ? 0.7 : 1, cursor: (loading || code.length !== 8) ? 'not-allowed' : 'pointer',
                            marginBottom: '12px'
                          }}
                        >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                          Verify Code
                        </button>
                        <button
                          type="button" onClick={() => { setSignupStep('email'); setMessage(null); setCode(''); }}
                          style={{ width: '100%', padding: '8px', background: 'transparent', border: 'none', color: '#888', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Change Email Address
                        </button>
                      </form>
                    )}

                    {/* Step 3: Set Password */}
                    {signupStep === 'password' && (
                      <form onSubmit={handleSetPassword}>
                        <div style={{ marginBottom: '24px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#aaa', marginBottom: '6px' }}>
                            Set a Password
                          </label>
                          <div style={{ position: 'relative' }}>
                            <Lock size={16} color="#666" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••" required minLength={6}
                              className="input-field"
                            />
                          </div>
                        </div>

                        <button
                          type="submit" disabled={loading || password.length < 6}
                          className="btn-banger btn-action"
                          style={{
                            opacity: (loading || password.length < 6) ? 0.7 : 1, cursor: (loading || password.length < 6) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                          Save Password & Enter
                        </button>
                      </form>
                    )}
                  </>
                )}

              </motion.div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: MARKETING SHOWCASE ─── */}
        <div className="auth-right">
          {/* Animated Background Orbs */}
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(63,89,231,0.4) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }}
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0 }}
          />

          <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '520px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Title Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
              <h2 style={{ fontSize: '40px', fontWeight: 700, color: '#fff', marginBottom: '16px', letterSpacing: '-1px', lineHeight: 1.1 }}>
                Your AI Video <br /><span style={{ color: '#3F59E7' }}>Superpower.</span>
              </h2>
              <p style={{ color: '#888', fontSize: '16px', lineHeight: 1.5, maxWidth: '400px' }}>
                Join thousands of top creators saving 10+ hours a week with our automated post-production suite.
              </p>
            </motion.div>

            {/* Overlapping Cards Cluster */}
            <div style={{ position: 'relative', height: '320px', marginTop: '10px' }}>

              {/* Main Video Player Mockup */}
              <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
                style={{ position: 'absolute', top: 0, left: 0, right: '50px', background: 'rgba(20,20,25,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(30px)', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(63,89,231,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clapperboard size={20} color="#60A5FA" />
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Project_Final_v2.mp4</div>
                      <div style={{ color: '#888', fontSize: '12px' }}>Processing Audio...</div>
                    </div>
                  </div>
                  <div style={{ padding: '6px 12px', background: 'rgba(39,201,63,0.1)', border: '1px solid rgba(39,201,63,0.2)', borderRadius: '100px', color: '#27C93F', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#27C93F', boxShadow: '0 0 8px #27C93F' }} />
                    Active
                  </div>
                </div>

                <div style={{ height: '80px', background: 'rgba(0,0,0,0.4)', borderRadius: '14px', marginBottom: '16px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <motion.div
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    style={{ position: 'absolute', top: 0, bottom: 0, width: '2px', background: '#3F59E7', boxShadow: '0 0 20px 4px rgba(63,89,231,0.6)', zIndex: 2 }}
                  />
                  {/* Fake Audio Waveforms */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '0 10px', opacity: 0.6 }}>
                    {[...Array(40)].map((_, i) => (
                      <motion.div key={i} animate={{ height: ['20%', `${Math.random() * 80 + 20}%`, '20%'] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }} style={{ width: '3px', background: '#fff', borderRadius: '2px' }} />
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Floating Stat Card */}
              <motion.div
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
                style={{ position: 'absolute', top: '130px', right: 0, background: 'rgba(30,30,35,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '20px', backdropFilter: 'blur(30px)', width: '220px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ background: 'rgba(39,201,63,0.15)', padding: '8px', borderRadius: '10px' }}>
                    <CheckCircle2 size={18} color="#27C93F" />
                  </div>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Caption Accuracy</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#fff', marginBottom: '6px', letterSpacing: '-1px' }}>98.5%</div>
                <div style={{ fontSize: '12px', color: '#27C93F', fontWeight: 500 }}>↑ Perfect Audio sync</div>
              </motion.div>

              {/* Floating Subtitle Pill */}
              <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.7 }}
                style={{ position: 'absolute', bottom: '0px', left: '30px', background: 'rgba(63,89,231,0.15)', border: '1px solid rgba(63,89,231,0.3)', borderRadius: '100px', padding: '12px 24px', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}
              >
                <Sparkles size={16} color="#60A5FA" />
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>Auto-captions generated in <strong style={{color: '#fff'}}>English</strong></span>
              </motion.div>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}

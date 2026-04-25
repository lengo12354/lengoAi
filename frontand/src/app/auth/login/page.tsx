'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Captions, Mail, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Check your email for the login link!' })
      setEmail('')
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setGoogleLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
      {/* Background Glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
          filter: 'blur(80px)',
          zIndex: 0,
          pointerEvents: 'none',
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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #a855f7, #7b61ff)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)',
                }}
              >
                <Captions size={24} color="white" strokeWidth={2} />
              </div>
            </a>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            Welcome back
          </h1>
          <p style={{ color: 'var(--muted)', textAlign: 'center', marginBottom: '32px', fontSize: '15px' }}>
            Sign in to lengoAi to continue.
          </p>

          {message && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px',
              background: message.type === 'success' ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 107, 107, 0.1)',
              color: message.type === 'success' ? '#00e5ff' : '#ff6b6b',
              border: `1px solid ${message.type === 'success' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 107, 107, 0.2)'}`
            }}>
              {message.text}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              background: 'white',
              color: 'black',
              border: 'none',
              fontWeight: 600,
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              marginBottom: '24px',
              transition: 'opacity 0.2s ease',
              opacity: googleLoading ? 0.8 : 1,
            }}
          >
            {googleLoading ? <Loader2 size={18} className="animate-spin" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <form onSubmit={handleEmailLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--muted)', marginBottom: '8px' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border 0.2s ease',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(168,85,247,0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="btn-banger"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                opacity: (loading || !email) ? 0.7 : 1,
                cursor: (loading || !email) ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
              Send Magic Link
            </button>
          </form>

        </div>
      </motion.div>
    </div>
  )
}

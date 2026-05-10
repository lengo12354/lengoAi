'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Captions, LogOut, User, Zap, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navLinks = [
  { label: 'Features', href: '#tools' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [tokens, setTokens] = useState<number | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)

    const supabase = createClient()

    const fetchTokens = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('tokens_balance').eq('id', userId).single()
      if (data) setTokens(data.tokens_balance)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) fetchTokens(currentUser.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchTokens(currentUser.id)
      } else {
        setTokens(null)
      }
    })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      subscription.unsubscribe()
    }
  }, [])

  if (!mounted) return null

  return (
    <>
      <nav
        style={{
          position: 'absolute',
          top: '24px',
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          padding: '0 20px',
        }}
        className="nav-container"
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1200px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(20px) saturate(180%)',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
          }}
          className="nav-pill"
        >
          {/* Logo */}
          <a
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: 'var(--foreground)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '20px',
              letterSpacing: '-0.5px',
            }}
          >
            <img
              src="/lengoailogo.png"
              alt="lengoAi Logo"
              style={{ height: '44px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            />
          </a>

          {/* Desktop Nav Links */}
          <div
            className="nav-links"
            style={{
              display: 'flex',
              gap: '4px',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '6px',
              borderRadius: '100px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="nav-item"
                style={{
                  color: 'var(--muted)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '8px 16px',
                  borderRadius: '100px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  const el = e.target as HTMLElement
                  el.style.color = 'var(--foreground)'
                  el.style.background = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={(e) => {
                  const el = e.target as HTMLElement
                  el.style.color = 'var(--muted)'
                  el.style.background = 'transparent'
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {user ? (
              <div className="nav-cta-desktop" style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '4px 12px 4px 4px',
                    borderRadius: '100px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3F59E7, #162DB2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: '14px' }}>
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500, paddingRight: '4px' }}>
                    {user.email?.split('@')[0] || 'Account'}
                  </span>
                  <ChevronDown size={14} color="var(--muted)" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: '240px',
                        background: 'rgba(10, 10, 15, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        padding: '16px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        zIndex: 100,
                      }}
                    >
                      <div style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                        <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '15px' }}>{user.email?.split('@')[0]}</p>
                        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                            <Zap size={16} fill="#f59e0b" strokeWidth={1} />
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>Tokens</span>
                          </div>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>{tokens !== null ? tokens.toLocaleString() : '0'}</span>
                        </div>
                        {(tokens === 0 || tokens === null) && (
                          <a
                            href="/#pricing"
                            onClick={() => setDropdownOpen(false)}
                            style={{
                              display: 'block',
                              textAlign: 'center',
                              background: 'rgba(245, 158, 11, 0.1)',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                              color: '#f59e0b',
                              textDecoration: 'none',
                              padding: '8px',
                              borderRadius: '10px',
                              fontSize: '13px',
                              fontWeight: 600,
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}
                          >
                            Upgrade Plan
                          </a>
                        )}
                      </div>

                      <button
                        onClick={async () => {
                          const supabase = createClient()
                          await supabase.auth.signOut()
                          setDropdownOpen(false)
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'rgba(255, 107, 107, 0.05)',
                          border: '1px solid rgba(255, 107, 107, 0.1)',
                          color: '#ff6b6b',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.05)'}
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <a
                href="/auth/login"
                className="btn-banger nav-cta-desktop"
                style={{ padding: '10px 24px', fontSize: '14px', whiteSpace: 'nowrap' }}
              >
                Sign In
              </a>
            )}

            {/* Mobile hamburger */}
            <button
              id="mobile-menu-toggle"
              className="hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: 'none',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                width: '40px',
                height: '40px',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--foreground)',
              }}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'fixed',
            top: '80px',
            left: '20px',
            right: '20px',
            background: 'var(--card-bg)',
            backdropFilter: 'blur(30px) saturate(200%)',
            border: '1px solid var(--card-border)',
            borderRadius: '24px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            zIndex: 99,
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                color: 'var(--foreground)',
                textDecoration: 'none',
                fontSize: '18px',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {link.label}
            </a>
          ))}
          {user ? (
            <button
              onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                setMenuOpen(false)
              }}
              className="btn-ghost-banger"
              style={{ width: '100%', marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          ) : (
            <a href="/auth/login" className="btn-banger" style={{ width: '100%', marginTop: '12px' }}>
              Sign In
            </a>
          )}
        </motion.div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .nav-links { display: none !important; }
          .hamburger { display: flex !important; }
          .nav-pill { padding: 10px 16px !important; }
          .nav-cta-desktop { display: none !important; }
        }
      `}</style>
    </>
  )
}

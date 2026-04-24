'use client'

import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Menu, X, Command } from 'lucide-react'

const navLinks = ['Tools', 'How it Works', 'Pricing', 'Blog']

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!mounted) return null

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: scrolled ? '16px' : '24px',
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          padding: '0 20px',
          transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
        }}
        className="nav-container"
      >
        <div
          style={{
            width: '100%',
            maxWidth: scrolled ? '840px' : '1200px',
            borderRadius: scrolled ? '100px' : '24px',
            border: scrolled ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.05)',
            background: scrolled ? 'rgba(10, 10, 15, 0.75)' : 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(20px) saturate(180%)',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
            transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
          }}
          className="nav-pill"
        >
          {/* Logo */}
          <a
            href="#"
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
            <div
              style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #7b61ff, #00e5ff)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(123, 97, 255, 0.4)',
              }}
            >
              <Command size={16} color="white" strokeWidth={2.5} />
            </div>
            lengoAi
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
                key={link}
                href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
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
                  const el = e.target as HTMLElement;
                  el.style.color = 'var(--foreground)';
                  el.style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  const el = e.target as HTMLElement;
                  el.style.color = 'var(--muted)';
                  el.style.background = 'transparent';
                }}
              >
                {link}
              </a>
            ))}
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a href="#pricing" className="btn-banger nav-cta-desktop" style={{ padding: '10px 24px', fontSize: '14px', whiteSpace: 'nowrap' }}>
              Start Free
            </a>

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

      {/* Mobile Menu Overlay */}
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
              key={link}
              href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
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
              {link}
            </a>
          ))}
          <a href="#pricing" className="btn-banger" style={{ width: '100%', marginTop: '12px' }}>
            Get started
          </a>
        </motion.div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .nav-links { display: none !important; }
          .hamburger { display: flex !important; }
          .nav-pill { padding: 10px 16px !important; }
        }
      `}</style>
    </>
  )
}

'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Play, Captions, Languages } from 'lucide-react'
import { useRef } from 'react'

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 15])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9])
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <section
      ref={containerRef}
      id="hero"
      style={{
        minHeight: '110vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '80px',
        overflow: 'hidden',
        perspective: '1000px',
      }}
    >
      {/* Background Image */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%) scale(1.05)',
          width: '100vw',
          height: '110vh',
          background: 'url(/hero-bg.webp) no-repeat center center',
          backgroundSize: 'cover',
          filter: 'blur(12px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="container-xl" style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', paddingTop: '0' }}>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: 'var(--font-coolvetica)',
            fontSize: 'clamp(52px, 8vw, 108px)',
            fontWeight: 400,
            lineHeight: 0.95,
            letterSpacing: '-0.04em',
            marginBottom: '32px',
            textShadow: '0 10px 40px rgba(0,0,0,0.5)',
          }}
        >
          Focus on creating.<br />
          <span className="gradient-text-accent">Let AI <span style={{ fontFamily: 'var(--font-coolvetica-it)', fontSize: '1.15em', fontWeight: 400, letterSpacing: '0' }}>do the rest.</span></span>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: 'clamp(18px, 2vw, 22px)',
            color: 'var(--muted)',
            lineHeight: 1.6,
            maxWidth: '700px',
            margin: '0 auto 48px',
          }}
        >
          A powerful suite of AI tools built for Graphic Designers, YouTubers, and Video Editors. Generate thumbnails, auto-subtitle videos, optimize titles, and more all in one place.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '72px' }}
        >
          <a href="#tools" className="btn-banger" style={{ padding: '18px 40px', fontSize: '16px' }}>
            Explore Tools <ArrowRight size={18} />
          </a>
          <a href="#how-it-works" className="btn-ghost-banger" style={{ padding: '18px 32px', fontSize: '16px' }}>
            <Play size={16} fill="currentColor" />
            How it works
          </a>
        </motion.div>
      </div>
    </section>
  )
}

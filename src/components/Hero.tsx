'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Play, Command, Sparkles } from 'lucide-react'
import { useRef } from 'react'

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  // Tilted 3D effect on scroll
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
      {/* Massive Graphic Glow */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80vw',
          height: '600px',
          background: 'radial-gradient(circle, rgba(123,97,255,0.15) 0%, transparent 60%)',
          filter: 'blur(80px)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '40vw',
          height: '400px',
          background: 'radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 50%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div className="container-xl" style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', paddingTop: '100px' }}>

        {/* Cinematic Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: 'clamp(56px, 8vw, 110px)',
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: '-0.04em',
            marginBottom: '32px',
            textShadow: '0 10px 40px rgba(0,0,0,0.5)',
          }}
        >
          Do impossible work.<br />
          <span className="gradient-text-accent">At lightspeed.</span>
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
            maxWidth: '680px',
            margin: '0 auto 48px',
          }}
        >
          The ultimate AI productivity suite. Automate your scripts, refactor your codebase, and design stunning UIs—all from one unified workspace.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '80px' }}
        >
          <a href="#pricing" className="btn-banger" style={{ padding: '18px 40px', fontSize: '16px' }}>
            Get started <ArrowRight size={18} />
          </a>
          <a href="#demo" className="btn-ghost-banger" style={{ padding: '18px 32px', fontSize: '16px' }}>
            <Play size={16} fill="currentColor" />
            Watch Demo
          </a>
        </motion.div>
      </div>
    </section>
  )
}

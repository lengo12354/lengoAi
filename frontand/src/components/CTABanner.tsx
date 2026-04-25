'use client'

import { motion } from 'framer-motion'
import { Captions } from 'lucide-react'

export default function CTABanner() {
  return (
    <section
      id="cta"
      className="section-padding"
      style={{
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.03)',
        marginTop: '60px'
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100vw',
          height: '600px',
          background: 'radial-gradient(ellipse, rgba(168,85,247,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="container-xl" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #a855f7, #7b61ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(168,85,247,0.4)'
            }}>
              <Captions size={32} color="#fff" />
            </div>
          </div>

          <h2
            style={{
              fontSize: 'clamp(48px, 8vw, 96px)',
              fontWeight: 800,
              letterSpacing: '-2px',
              lineHeight: 1.0,
              marginBottom: '24px',
              fontFamily: 'var(--font-heading)'
            }}
          >
            Your subtitles.<br />Ready in seconds.
          </h2>
          <p
            style={{
              fontSize: '20px',
              color: 'var(--muted)',
              marginBottom: '48px',
              maxWidth: '580px',
              margin: '0 auto 48px'
            }}
          >
            Join thousands of creators who use lengoAi to subtitle their content in Darija, French, English and beyond — for free.
          </p>
          <a
            href="/tools/auto-subtitle"
            className="btn-banger"
            style={{ padding: '20px 48px', fontSize: '18px' }}
          >
            Generate subtitles free →
          </a>
        </motion.div>
      </div>
    </section>
  )
}

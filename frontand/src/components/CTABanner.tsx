'use client'

import { motion } from 'framer-motion'
import { Rocket } from 'lucide-react'

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
          background: 'radial-gradient(ellipse, rgba(63,89,231,0.15) 0%, transparent 70%)',
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
              background: 'linear-gradient(135deg, #3F59E7, #1B38DC)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(63,89,231,0.4)'
            }}>
              <Rocket size={32} color="#fff" />
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
            Your best content.<br />Ready in minutes.
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
            Join thousands of creators who use lengoAi to design, edit, and optimize their workflow.
          </p>
          <a
            href="#tools"
            className="btn-banger"
            style={{ padding: '20px 48px', fontSize: '18px' }}
          >
            Explore all tools →
          </a>
        </motion.div>
      </div>
    </section>
  )
}

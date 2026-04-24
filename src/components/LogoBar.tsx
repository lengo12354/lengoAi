'use client'

import { motion } from 'framer-motion'

const logos = ['Notion', 'Vercel', 'Linear', 'Figma', 'Stripe', 'Loom', 'OpenAI', 'Anthropic']
// duplicate array for seamless marquee
const marqueeItems = [...logos, ...logos, ...logos]

export default function LogoBar() {
  return (
    <section
      style={{
        paddingTop: '64px',
        paddingBottom: '64px',
        borderTop: '1px solid rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        position: 'relative',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.01)',
      }}
    >
      {/* Fade masks for edges */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, bottom: 0, width: '15vw',
          background: 'linear-gradient(to right, var(--background), transparent)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0, right: 0, bottom: 0, width: '15vw',
          background: 'linear-gradient(to left, var(--background), transparent)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative', zIndex: 1 }}>
        <p
          style={{
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            fontFamily: 'var(--font-heading)',
          }}
        >
          Trusted by pioneering teams
        </p>
      </div>

      <div style={{ display: 'flex', whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            duration: 30,
            ease: 'linear',
            repeat: Infinity,
          }}
          style={{ display: 'flex', gap: '80px', paddingRight: '80px', willChange: 'transform' }}
        >
          {marqueeItems.map((logo, i) => (
            <div
              key={i}
              style={{
                fontSize: '24px',
                fontWeight: 700,
                letterSpacing: '-0.5px',
                color: 'var(--foreground)',
                opacity: 0.3,
                fontFamily: 'var(--font-heading)',
                display: 'inline-block',
                userSelect: 'none',
                transition: 'opacity 0.3s ease',
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = '1')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = '0.3')}
            >
              {logo}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

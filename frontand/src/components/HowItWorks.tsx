'use client'

import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { useRef } from 'react'
import { Upload, Cpu, Download } from 'lucide-react'

const steps = [
  {
    icon: Upload,
    title: 'Upload Your File',
    description: 'Drop in any audio or video file — MP3, WAV, MP4, MOV and 50+ formats. No account needed to get started.',
  },
  {
    icon: Cpu,
    title: 'AI Transcribes It',
    description: 'Our model detects the language automatically and generates word-level timestamps with 97% accuracy — including Darija, Franco, Arabic, French and English.',
  },
  {
    icon: Download,
    title: 'Export & Use',
    description: 'Download your subtitles as SRT, VTT, or copy directly into CapCut, Premiere Pro, DaVinci Resolve, or Final Cut Pro with one click.',
  },
]

export default function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start center', 'end center']
  })

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 50, damping: 20 })
  const lineHeight = useTransform(smoothProgress, [0, 1], ['0%', '100%'])

  return (
    <section id="how-it-works" className="section-padding" style={{ position: 'relative' }}>
      <div className="container-xl" ref={containerRef}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '80px' }}
        >
          <span className="section-badge">How It Works</span>
          <h2
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 700,
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
            }}
          >
            From upload to subtitles<br />
            <span style={{ color: '#a855f7' }}>in under a minute.</span>
          </h2>
        </motion.div>

        <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
          {/* Timeline background */}
          <div
            style={{
              position: 'absolute',
              top: '0',
              bottom: '0',
              left: '40px',
              width: '2px',
              background: 'rgba(255,255,255,0.05)',
              zIndex: 0,
            }}
            className="timeline-bg"
          />

          {/* Active scroll line */}
          <motion.div
            style={{
              position: 'absolute',
              top: '0',
              left: '40px',
              width: '2px',
              height: lineHeight,
              background: 'linear-gradient(to bottom, transparent, #a855f7, #7b61ff, transparent)',
              zIndex: 1,
            }}
            className="timeline-active"
          />

          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: 0.1 }}
                style={{
                  display: 'flex',
                  gap: '48px',
                  marginBottom: index === steps.length - 1 ? 0 : '80px',
                  position: 'relative',
                  zIndex: 2,
                }}
                className="step-row"
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '24px',
                    background: 'var(--background)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 0 30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
                    position: 'relative',
                  }}
                >
                  <Icon size={28} color="#a855f7" strokeWidth={1.5} />
                  <div
                    style={{
                      position: 'absolute',
                      left: '-40px',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: '#020204',
                      border: '2px solid #a855f7',
                      boxShadow: '0 0 10px rgba(168,85,247,0.8)',
                    }}
                    className="timeline-dot"
                  />
                </div>

                <div style={{ paddingTop: '10px' }}>
                  <div style={{ color: '#a855f7', fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
                    STEP 0{index + 1}
                  </div>
                  <h3 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '16px', letterSpacing: '-0.5px' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: '16px', color: 'var(--muted)', lineHeight: 1.7 }}>
                    {step.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .timeline-bg, .timeline-active, .timeline-dot { display: none !important; }
          .step-row { flex-direction: column; gap: 24px !important; margin-bottom: 64px !important; }
        }
      `}</style>
    </section>
  )
}

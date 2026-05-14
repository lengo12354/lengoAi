'use client'

import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { useRef } from 'react'
import { MousePointerClick, Cpu, Download } from 'lucide-react'

const steps = [
  {
    icon: MousePointerClick,
    title: 'Choose Your Tool',
    description: 'Select from our suite of editing tools. Whether you need auto-subtitles, cinematic B-roll, or a viral script, we have you covered.',
  },
  {
    icon: Cpu,
    title: 'Let AI Do The Work',
    description: 'Our advanced AI models analyze your video script, suggest cinematic shots, or accurately transcribe your audio in seconds.',
  },
  {
    icon: Download,
    title: 'Export & Publish',
    description: 'Download your optimized assets, copy high-retention scripts, or export subtitles directly to your favorite editing software with one click.',
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
              fontFamily: 'var(--font-coolvetica)',
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 400,
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
            }}
          >
            From idea to published<br />
            <span style={{ color: '#3F59E7' }}>in record time.</span>
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
              background: 'linear-gradient(to bottom, transparent, #3F59E7, #1B38DC, transparent)',
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
                  <Icon size={28} color="#3F59E7" strokeWidth={1.5} />
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
                      border: '2px solid #3F59E7',
                      boxShadow: '0 0 10px rgba(63,89,231,0.8)',
                    }}
                    className="timeline-dot"
                  />
                </div>

                <div style={{ paddingTop: '10px' }}>
                  <div style={{ color: '#3F59E7', fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
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

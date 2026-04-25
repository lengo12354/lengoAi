'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Code } from 'lucide-react'

const terminalLines = [
  { text: '~ lengoai login', delay: 0.1, color: '#fff' },
  { text: 'Authenticate successful. Welcome back.', delay: 0.5, color: 'var(--muted)' },
  { text: '~ lengoai generate ui "glassmorphism bento box"', delay: 1.2, color: '#fff' },
  { text: '→ Analyzing intent...', delay: 1.8, color: '#00e5ff' },
  { text: '→ Constructing responsive grid... ███████ 100%', delay: 2.2, color: '#7b61ff' },
  { text: '→ Applying Tailwind v4 utilities...', delay: 2.6, color: '#00e5ff' },
  { text: '✓ UI Component ready in 420ms.', delay: 3.0, color: '#28c840' },
  { text: '', delay: 3.2, color: 'transparent' },
  { text: 'export default function Bento() {', delay: 3.4, color: '#a1a1aa' },
  { text: '  return (', delay: 3.5, color: '#a1a1aa' },
  { text: '    <div className="glass-card spotlight-card">', delay: 3.6, color: '#fff' },
  { text: '      <h3 className="gradient-text">Stunning</h3>', delay: 3.7, color: '#fff' },
  { text: '    </div>', delay: 3.8, color: '#a1a1aa' },
  { text: '  )', delay: 3.9, color: '#a1a1aa' },
  { text: '}', delay: 4.0, color: '#a1a1aa' },
]

export default function Demo() {
  return (
    <section id="demo" className="section-padding">
      <div className="container-xl">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '64px',
            alignItems: 'center',
          }}
          className="demo-grid"
        >
          {/* Left Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2
              style={{
                fontSize: 'clamp(36px, 5vw, 56px)',
                fontWeight: 700,
                letterSpacing: '-1.5px',
                lineHeight: 1.1,
                marginBottom: '24px',
              }}
            >
              Command your workflow.
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: 'var(--muted)',
                lineHeight: 1.7,
                marginBottom: '32px',
              }}
            >
              Control lengoAi directly from your native terminal or use the integrated web CLI. Experience the true speed of AI that doesn't just chat, it executes.
            </p>
            <a href="#pricing" className="btn-banger">
              Try the CLI <ArrowRight size={18} />
            </a>
          </motion.div>

          {/* Right Terminal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="glass-card"
              style={{
                padding: '0',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 60px -10px rgba(0,0,0,0.8), 0 0 40px rgba(0,229,255,0.1)',
                background: 'rgba(5,5,10,0.8)',
              }}
            >
              {/* Chrome */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ display: 'flex', gap: '6px' }}>
                   <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                   <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                   <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto', color: 'var(--muted)', fontSize: '12px', fontFamily: 'monospace' }}>
                  <Code size={14} /> lengoai-cli
                </div>
              </div>

              {/* Terminal Body */}
              <div
                style={{
                  padding: '24px',
                  fontFamily: '"Fira Code", "Cascadia Code", monospace',
                  fontSize: '13px',
                  lineHeight: 1.8,
                  height: '380px',
                }}
              >
                {terminalLines.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: line.delay, duration: 0.1 }}
                    style={{ color: line.color }}
                  >
                    {line.text === '' ? '\u00A0' : line.text}
                  </motion.div>
                ))}
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '16px',
                    background: '#00e5ff',
                    verticalAlign: 'middle',
                    animation: 'blink 1s step-end infinite',
                    marginLeft: '8px',
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

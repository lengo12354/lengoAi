'use client'

import { motion } from 'framer-motion'

const testimonials = [
  {
    quote: "lengoAi completely changed how I produce content. What used to take me 3 hours of transcription now happens in 30 seconds. The script quality is remarkable.",
    name: "Sarah Chen",
    role: "Content Creator",
    company: "SarahMakes",
    avatarColor: "linear-gradient(135deg, #FF6B6B, #FF8E53)"
  },
  {
    quote: "The AI code editor is genuinely impressive. It understands context across files and suggests refactors that I wouldn't have caught for hours. It's like pair programming with a senior dev.",
    name: "Marcus Williams",
    role: "Senior Engineer",
    company: "Vercel",
    avatarColor: "linear-gradient(135deg, #00d4aa, #0088ff)"
  },
  {
    quote: "We've replaced four different tools with lengoAi. The team collaboration features are seamless, and the workflow automator saves us about 6 hours a week across the whole team.",
    name: "Priya Kapoor",
    role: "Head of Product",
    company: "Linear",
    avatarColor: "linear-gradient(135deg, #7b61ff, #ff007b)"
  },
  {
    quote: "I can literally describe an interface concept in natural language and have production-ready React components deployed in minutes. Unbelievable.",
    name: "Evan Davis",
    role: "Frontend Tech Lead",
    company: "Figma",
    avatarColor: "linear-gradient(135deg, #333, #666)"
  },
]

export default function Testimonials() {
  return (
    <section id="testimonials" className="section-padding">
      <div className="container-xl">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.6 }}
           style={{ textAlign: 'center', marginBottom: '80px' }}
        >
          <h2
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 700,
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
            }}
          >
            Don't just take our word for it.
          </h2>
        </motion.div>

        <div
          style={{
            columns: '1',
            columnGap: '24px',
          }}
          className="masonry-grid"
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card"
              style={{
                padding: '40px',
                marginBottom: '24px',
                display: 'inline-block',
                width: '100%',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ color: '#7b61ff', fontSize: '48px', lineHeight: 0.8, fontFamily: 'serif', opacity: 0.5 }}>"</div>
              <p
                style={{
                  fontSize: '18px',
                  color: 'var(--foreground)',
                  lineHeight: 1.6,
                  marginBottom: '32px',
                  fontWeight: 500
                }}
              >
                {t.quote}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: t.avatarColor,
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)'
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px', fontFamily: 'var(--font-heading)' }}>{t.name}</div>
                  <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                    {t.role} at {t.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .masonry-grid { columns: 2 !important; }
        }
      `}</style>
    </section>
  )
}

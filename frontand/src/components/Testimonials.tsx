'use client'

import { motion } from 'framer-motion'

const testimonials = [
  {
    quote: "The Thumbnail Preview tool is a lifesaver. Being able to see exactly how my design looks in the YouTube UI before uploading has completely changed my workflow.",
    name: "Yassine El Amrani",
    role: "Graphic Designer",
    company: "Freelance",
    avatarColor: "linear-gradient(135deg, #3F59E7, #1B38DC)"
  },
  {
    quote: "lengoAi is the only suite that actually handles Darija properly for subtitles. I stopped manually writing them for my content. It saves me hours every week.",
    name: "Fatima Zahra",
    role: "Content Creator",
    company: "TikTok Morocco",
    avatarColor: "linear-gradient(135deg, #FF6B6B, #FF8E53)"
  },
  {
    quote: "The YouTube Title Optimizer helped us increase our average click-through rate by 30%. It consistently generates titles that grab attention without being clickbait.",
    name: "Mehdi Benali",
    role: "YouTube Strategist",
    company: "Sawt Studio",
    avatarColor: "linear-gradient(135deg, #00d4aa, #0088ff)"
  },
  {
    quote: "Having all these tools in one place is incredible. From perfectly timed subtitle exports for Premiere Pro to testing thumbnail variations, it's my daily driver.",
    name: "Salma Ouhssain",
    role: "Video Editor",
    company: "Creator Agency",
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
          <span className="section-badge" style={{ background: 'rgba(63,89,231,0.08)', color: '#6A7DED', border: '1px solid rgba(63,89,231,0.2)' }}>
            Testimonials
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-coolvetica)',
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 400,
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
              marginTop: '20px',
            }}
          >
            Creators love lengoAi.
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
              <div style={{ color: '#3F59E7', fontSize: '48px', lineHeight: 0.8, fontFamily: 'serif', opacity: 0.5 }}>"</div>
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
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px', fontFamily: 'var(--font-heading)' }}>{t.name}</div>
                  <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                    {t.role} · {t.company}
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

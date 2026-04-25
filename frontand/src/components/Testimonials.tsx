'use client'

import { motion } from 'framer-motion'

const testimonials = [
  {
    quote: "lengoAi is the only tool that actually handles Darija properly. I stopped manually writing subtitles for my content — it saves me hours every single week.",
    name: "Yassine El Amrani",
    role: "Content Creator",
    company: "YouTube Morocco",
    avatarColor: "linear-gradient(135deg, #a855f7, #7b61ff)"
  },
  {
    quote: "The CapCut export is seamless. I upload my video, get subtitles in 30 seconds, import to CapCut and I'm done. Absolute game changer for my workflow.",
    name: "Fatima Zahra",
    role: "Short-form Video Editor",
    company: "TikTok Creator",
    avatarColor: "linear-gradient(135deg, #FF6B6B, #FF8E53)"
  },
  {
    quote: "We subtitle 50+ podcast episodes a month. lengoAi cut our post-production time by 80%. The French and Darija accuracy is genuinely impressive.",
    name: "Mehdi Benali",
    role: "Podcast Producer",
    company: "Sawt Studio",
    avatarColor: "linear-gradient(135deg, #00d4aa, #0088ff)"
  },
  {
    quote: "The Premiere Pro XML export is perfect. Subtitles drop right onto the timeline with correct timing. I haven't touched a subtitle manually in months.",
    name: "Salma Ouhssain",
    role: "Video Editor",
    company: "Freelance",
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
          <span className="section-badge" style={{ background: 'rgba(168,85,247,0.08)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }}>
            Testimonials
          </span>
          <h2
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 700,
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
              <div style={{ color: '#a855f7', fontSize: '48px', lineHeight: 0.8, fontFamily: 'serif', opacity: 0.5 }}>"</div>
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

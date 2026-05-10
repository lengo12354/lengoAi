'use client'

import { motion } from 'framer-motion'
import { Captions, Video, MonitorPlay } from 'lucide-react'
import { useRouter } from 'next/navigation'

const features = [
  {
    icon: Captions,
    title: 'AI Auto Subtitles',
    description: 'Generate accurate subtitles for any audio or video in Darija, English, French and 90+ languages. Export to CapCut, Premiere, DaVinci & more.',
    tag: 'POPULAR',
    href: '/tools/auto-subtitle',
  },
  {
    icon: Video,
    title: 'YouTube Title Optimizer',
    description: 'Paste your video title and get 3 AI-powered CTR-optimized alternatives designed to boost views and click-through rates.',
    tag: 'HOT',
    href: '/tools/title-optimizer',
  },
  {
    icon: MonitorPlay,
    title: 'Thumbnail Preview',
    description: 'Mockup your YouTube thumbnails in a realistic channel layout before uploading. See exactly how they look to your viewers.',
    tag: 'NEW',
    href: '/tools/thumbnail-preview',
  },
]

export default function Tools() {
  const router = useRouter()

  return (
    <section id="tools" className="section-padding" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse, rgba(63,89,231,0.07) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0, pointerEvents: 'none' }} />

      <div className="container-xl" style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '72px' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <span className="section-badge">Creator Suite</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              fontSize: 'clamp(40px, 6vw, 64px)',
              fontWeight: 800,
              letterSpacing: '-2px',
              lineHeight: 1.05,
              marginTop: '24px',
              color: '#fff',
            }}
          >
            One suite.<br />
            <span style={{ background: 'linear-gradient(135deg, #3F59E7 0%, #94A2F2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Every tool you need.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ fontSize: '18px', color: 'var(--muted)', maxWidth: '520px', margin: '24px auto 0', lineHeight: 1.6 }}
          >
            From thumbnails to subtitles to viral titles — everything in one place.
          </motion.p>
        </div>

        {/* 3 Cards Row */}
        <div className="tools-cards-grid">
          {features.map((tool, i) => {
            const Icon = tool.icon
            return (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="tool-card-wrapper"
                onClick={() => router.push(tool.href)}
              >
                {/* Spinning border */}
                <div className="tool-animated-border" />

                {/* Inner card */}
                <div className="tool-card-inner">
                  {/* Tag */}
                  <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{
                      background: 'linear-gradient(135deg, #3F59E7, #6A7DED)',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '100px',
                      letterSpacing: '0.08em',
                      fontFamily: 'var(--font-heading)',
                    }}>
                      {tool.tag}
                    </span>
                  </div>

                  {/* Icon */}
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, rgba(63,89,231,0.2), rgba(63,89,231,0.05))',
                    border: '1px solid rgba(63,89,231,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '28px',
                    color: '#6A7DED',
                  }}>
                    <Icon size={30} strokeWidth={1.5} />
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#fff',
                    marginBottom: '16px',
                    letterSpacing: '-0.4px',
                    lineHeight: 1.2,
                  }}>
                    {tool.title}
                  </h3>

                  {/* Description */}
                  <p style={{
                    fontSize: '15px',
                    color: 'var(--muted)',
                    lineHeight: 1.65,
                    flexGrow: 1,
                  }}>
                    {tool.description}
                  </p>

                  {/* CTA */}
                  <div style={{
                    marginTop: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#6A7DED',
                    fontWeight: 600,
                    fontSize: '14px',
                    fontFamily: 'var(--font-heading)',
                  }}>
                    Open tool →
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{ textAlign: 'center', marginTop: '64px' }}
        >
          <a href="#pricing" className="btn-banger" style={{ padding: '18px 48px', fontSize: '16px' }}>
            Get Full Access →
          </a>
        </motion.div>
      </div>

      <style>{`
        .tools-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: '24px';
          gap: 24px;
          align-items: stretch;
        }

        .tool-card-wrapper {
          position: relative;
          border-radius: 26px;
          padding: 2px;
          cursor: pointer;
          background: rgba(255,255,255,0.03);
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .tool-card-wrapper:hover {
          transform: translateY(-6px);
        }

        .tool-animated-border {
          position: absolute;
          inset: 0;
          border-radius: 26px;
          overflow: hidden;
          z-index: 0;
          opacity: 0;
          transition: opacity 0.4s ease;
        }

        .tool-card-wrapper:hover .tool-animated-border {
          opacity: 1;
        }

        .tool-animated-border::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(63,89,231,0.9) 90deg,
            rgba(148,162,242,0.7) 180deg,
            transparent 270deg
          );
          animation: tool-rotate 3s linear infinite;
          z-index: 0;
        }

        @keyframes tool-rotate {
          100% { transform: rotate(360deg); }
        }

        .tool-card-inner {
          position: relative;
          z-index: 1;
          background: rgba(8, 12, 42, 0.95);
          border-radius: 25px;
          padding: 36px 32px;
          display: flex;
          flex-direction: column;
          height: 100%;
          border: 1px solid rgba(63,89,231,0.08);
        }

        .tool-card-wrapper:not(:hover) .tool-card-inner {
          border: 1px solid rgba(63,89,231,0.12);
        }

        @media (max-width: 900px) {
          .tools-cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'

type Plan = {
  name: string
  monthlyPrice: number | string
  yearlyPrice: number | string
  description: string
  features: string[]
  cta: string
  featured: boolean
}

const plans: Plan[] = [
  {
    name: 'Starter',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Perfect for trying lengoAi Auto Subtitles for free.',
    features: [
      '5 subtitle exports per month',
      'Up to 10 min per file',
      'SRT & VTT export',
      'Darija, English & French',
      'Community support',
    ],
    cta: 'Get started free',
    featured: false,
  },
  {
    name: 'Pro',
    monthlyPrice: 19,
    yearlyPrice: 15,
    description: 'For creators and editors who subtitle regularly.',
    features: [
      'Unlimited exports',
      'Files up to 4 hours long',
      'All 90+ languages + Darija',
      'CapCut, Premiere, DaVinci & FCP export',
      'Styled & animated subtitles',
      'Word-level timestamps',
      'Priority processing queue',
      'API access (5k req/mo)',
    ],
    cta: 'Start Pro trial',
    featured: true,
  },
]

export default function Pricing() {
  const [yearly, setYearly] = useState(true)

  return (
    <section id="pricing" className="section-padding">
      <div className="container-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: '80px' }}
        >
          <span className="section-badge">Pricing</span>
          <h2
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 700,
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
              marginBottom: '32px',
            }}
          >
            A plan for every creator.
          </h2>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--card-border)',
              borderRadius: '100px',
              padding: '6px',
            }}
          >
            <button
              onClick={() => setYearly(false)}
              style={{
                padding: '10px 24px',
                borderRadius: '100px',
                border: 'none',
                background: !yearly ? 'var(--foreground)' : 'transparent',
                color: !yearly ? 'var(--background)' : 'var(--muted)',
                fontFamily: 'var(--font-heading)',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              style={{
                padding: '10px 24px',
                borderRadius: '100px',
                border: 'none',
                background: yearly ? 'var(--foreground)' : 'transparent',
                color: yearly ? 'var(--background)' : 'var(--muted)',
                fontFamily: 'var(--font-heading)',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Annually <span style={{ color: yearly ? '#a855f7' : '#00e5ff', fontSize: '13px' }}>-20%</span>
            </button>
          </div>
        </motion.div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '24px',
            alignItems: 'center',
            maxWidth: '860px',
            margin: '0 auto',
          }}
          className="pricing-grid"
        >
          {plans.map((plan, i) => {
            const isFeatured = plan.featured
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={isFeatured ? 'featured-card-wrapper' : 'glass-card'}
                style={{
                  position: 'relative',
                  padding: isFeatured ? '2px' : '32px',
                  height: isFeatured ? 'auto' : '100%',
                }}
              >
                {isFeatured && (
                  <>
                    <div className="animated-border" />
                    <div
                      className="glass-card"
                      style={{
                        padding: '40px 32px',
                        background: 'rgba(5,5,10,0.9)',
                        border: 'none',
                        height: '100%',
                        zIndex: 1,
                        position: 'relative',
                      }}
                    >
                      <PlanContent plan={plan} yearly={yearly} isFeatured={isFeatured} />
                    </div>

                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #a855f7, #7b61ff)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-heading)',
                        padding: '6px 16px',
                        borderRadius: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 0 20px rgba(168,85,247,0.5)',
                        whiteSpace: 'nowrap'
                      }}>
                        <Sparkles size={14} /> MOST POPULAR
                      </div>
                    </div>
                  </>
                )}

                {!isFeatured && <PlanContent plan={plan} yearly={yearly} isFeatured={isFeatured} />}
              </motion.div>
            )
          })}
        </div>
      </div>

      <style>{`
        .featured-card-wrapper {
          position: relative;
          border-radius: 26px;
          background: rgba(255,255,255,0.05);
          z-index: 0;
          transform: scale(1.05);
        }
        .animated-border {
          position: absolute;
          inset: 0;
          border-radius: 26px;
          overflow: hidden;
          z-index: 0;
        }
        .animated-border::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(168,85,247,0.8) 90deg,
            rgba(123,97,255,0.8) 180deg,
            transparent 270deg
          );
          animation: rotate 4s linear infinite;
          z-index: -1;
        }
        @keyframes rotate {
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .pricing-grid { grid-template-columns: 1fr !important; max-width: 480px; margin: 0 auto; }
          .featured-card-wrapper { transform: scale(1) !important; }
        }
      `}</style>
    </section>
  )
}

function PlanContent({ plan, yearly, isFeatured }: { plan: Plan; yearly: boolean; isFeatured: boolean }) {
  return (
    <>
      <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--foreground)', marginBottom: '8px' }}>
        {plan.name}
      </h3>
      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '24px', minHeight: '45px' }}>
        {plan.description}
      </p>

      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '56px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, fontFamily: 'var(--font-heading)' }}>
          ${yearly ? plan.yearlyPrice : plan.monthlyPrice}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: '16px' }}>/mo</span>
      </div>

      <a
        href={`https://wa.me/212679635087?text=${encodeURIComponent(`Salam, bghit nchri l'${plan.name} Plan ($${yearly ? plan.yearlyPrice : plan.monthlyPrice}) bach nakhod l'Tokens d'l'auto-subtitle. Achno ndir?`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={isFeatured ? 'btn-banger' : 'btn-ghost-banger'}
        style={{ width: '100%', marginBottom: '40px' }}
      >
        {plan.cta}
      </a>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {plan.features.map((feat) => (
          <div key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
              <Check size={12} color="#a855f7" strokeWidth={3} />
            </div>
            <span style={{ fontSize: '15px', color: '#e4e4e7', lineHeight: 1.5 }}>{feat}</span>
          </div>
        ))}
      </div>
    </>
  )
}

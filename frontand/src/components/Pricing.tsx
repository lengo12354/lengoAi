'use client'

import { motion } from 'framer-motion'
import { Check, Sparkles, Zap, Star, Coins } from 'lucide-react'

type Plan = {
  name: string
  price: number
  tokens: string
  description: string
  features: string[]
  cta: string
  featured: boolean
  icon: any
}

const plans: Plan[] = [
  {
    name: 'Starter',
    price: 10,
    tokens: '4,000 Tokens',
    description: 'Perfect for freelance editors and occasional projects.',
    icon: Star,
    features: [
      'Access to all editor tools',
      'Standard generation speed',
      'Standard output quality',
      'Email support',
    ],
    cta: 'Get Starter Pack',
    featured: false,
  },
  {
    name: 'Pro Editor',
    price: 20,
    tokens: '10,000 Tokens',
    description: 'Best value for full-time video editors.',
    icon: Sparkles,
    features: [
      'Access to all editor tools',
      'Priority generation speed',
      'Premium output quality',
      'Early access to new tools',
      '24/7 Priority support',
    ],
    cta: 'Get Editor Pack',
    featured: true,
  },
  {
    name: 'Agency',
    price: 50,
    tokens: 'Unlimited Tokens',
    description: 'For heavy users, teams, and professional agencies.',
    icon: Zap,
    features: [
      'Access to all editor tools',
      'Highest generation priority',
      'Maximum output quality',
      'Custom workflows support',
      'Dedicated account manager',
    ],
    cta: 'Get Agency Pack',
    featured: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="section-padding" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background elements for SaaS look */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '100vw', height: '600px', pointerEvents: 'none', zIndex: 0 }} />

      <div className="container-xl" style={{ position: 'relative', zIndex: 1 }}>
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
              fontFamily: 'var(--font-coolvetica)',
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 400,
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
              marginBottom: '32px',
            }}
          >
            Upgrade your plan.
          </h2>
        </motion.div>

        <div className="pricing-grid">
          {plans.map((plan, i) => {
            const isFeatured = plan.featured
            const Icon = plan.icon
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={isFeatured ? 'featured-card-wrapper' : 'glass-card standard-card'}
                style={{
                  position: 'relative',
                  padding: isFeatured ? '2px' : '32px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {isFeatured && (
                  <>
                    <div className="animated-border" />
                    <div
                      className="glass-card"
                      style={{
                        padding: '40px 32px',
                        background: 'rgba(5,5,10,0.95)',
                        border: 'none',
                        height: '100%',
                        zIndex: 1,
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <PlanContent plan={plan} isFeatured={isFeatured} Icon={Icon} />
                    </div>

                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #3F59E7, #1B38DC)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-heading)',
                        padding: '6px 16px',
                        borderRadius: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        whiteSpace: 'nowrap'
                      }}>
                        <Sparkles size={14} /> MOST POPULAR
                      </div>
                    </div>
                  </>
                )}

                {!isFeatured && <PlanContent plan={plan} isFeatured={isFeatured} Icon={Icon} />}
              </motion.div>
            )
          })}
        </div>
      </div>

      <style>{`
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          align-items: stretch;
          max-width: 1200px;
          margin: 0 auto;
        }
        .standard-card {
          transition: transform 0.3s ease, border-color 0.3s ease;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .standard-card:hover {
          transform: translateY(-8px);
          border-color: rgba(255,255,255,0.15);
        }
        .featured-card-wrapper {
          position: relative;
          border-radius: 26px;
          background: rgba(255,255,255,0.05);
          z-index: 0;
          transform: scale(1.05);
          transition: transform 0.3s ease;
        }
        .featured-card-wrapper:hover {
          transform: scale(1.05) translateY(-8px);
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
            rgba(63,89,231,0.9) 90deg,
            rgba(148,162,242,0.7) 180deg,
            transparent 270deg
          );
          animation: rotate 4s linear infinite;
          z-index: -1;
        }
        @keyframes rotate {
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 1024px) {
          .pricing-grid { 
            grid-template-columns: repeat(2, 1fr); 
            max-width: 800px;
          }
          .featured-card-wrapper { transform: scale(1); }
          .featured-card-wrapper:hover { transform: translateY(-8px); }
        }
        
        @media (max-width: 768px) {
          .pricing-grid { 
            grid-template-columns: 1fr; 
            max-width: 480px; 
          }
        }
      `}</style>
    </section>
  )
}

function PlanContent({ plan, isFeatured, Icon }: { plan: Plan; isFeatured: boolean; Icon: any }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: isFeatured ? 'rgba(63,89,231,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isFeatured ? '#94A2F2' : 'var(--muted)', border: isFeatured ? '1px solid rgba(63,89,231,0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
          <Icon size={20} />
        </div>
        <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
          {plan.name}
        </h3>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '28px', minHeight: '45px', lineHeight: 1.5 }}>
        {plan.description}
      </p>

      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '56px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, fontFamily: 'var(--font-heading)' }}>
          ${plan.price}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: '16px' }}>/month</span>
      </div>

      <div style={{ marginBottom: '32px', display: 'inline-flex', alignItems: 'center', background: isFeatured ? 'rgba(63,89,231,0.1)' : 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '100px', border: isFeatured ? '1px solid rgba(63,89,231,0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: isFeatured ? '#94A2F2' : '#fff', fontSize: '14px', fontWeight: 700, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Zap size={16} fill="currentColor" color="currentColor" /> {plan.tokens}
        </span>
      </div>

      <a
        href={`https://wa.me/212679635087?text=${encodeURIComponent(`Salam, bghit nchri l'${plan.name} Pack ($${plan.price} l ${plan.tokens}) dyal lengoAi Editor Suite. Achno ndir?`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={isFeatured ? 'btn-banger' : 'btn-ghost-banger'}
        style={{ width: '100%', marginBottom: '40px' }}
      >
        {plan.cta}
      </a>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1 }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Includes:</p>
        {plan.features.map((feat) => (
          <div key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: isFeatured ? 'rgba(63,89,231,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
              <Check size={12} color={isFeatured ? "#94A2F2" : "var(--muted)"} strokeWidth={3} />
            </div>
            <span style={{ fontSize: '15px', color: '#e4e4e7', lineHeight: 1.5 }}>{feat}</span>
          </div>
        ))}
      </div>
    </>
  )
}

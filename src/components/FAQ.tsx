'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: "What's included in the free plan?",
    answer:
      'The free plan includes 5 exports per month, access to the Video → Script and Smart Summarizer tools, and community support. No credit card required to sign up.',
  },
  {
    question: 'What export formats are supported?',
    answer:
      'We support SRT, VTT, plain text, CapCut JSON, Premiere Pro XML, and direct copy-paste for all script exports. For design exports, we generate clean HTML/CSS and Tailwind code. Code editor outputs are compatible with all major languages.',
  },
  {
    question: 'Which video editors does lengoAi integrate with?',
    answer:
      'lengoAi integrates natively with CapCut, Adobe Premiere Pro, DaVinci Resolve, and Final Cut Pro. You can also export universally compatible SRT files for any other editor.',
  },
  {
    question: 'Can I use lengoAi with my whole team?',
    answer:
      'Yes! The Pro plan supports up to 3 users with shared workspaces and real-time collaboration. The Team plan supports up to 10 users and adds API access, custom branding, and SSO support.',
  },
  {
    question: 'How does lengoAi handle my data and privacy?',
    answer:
      'All uploaded files are processed in isolated, encrypted environments and deleted within 24 hours of processing. We are SOC 2 Type II compliant and never use your content to train our models. Your data is always yours.',
  },
  {
    question: 'Can I cancel at any time?',
    answer:
      "Absolutely. There are no lock-in contracts. You can cancel your subscription at any time from your account settings, and you'll retain access until the end of your billing period.",
  },
]

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      style={{
        borderBottom: '1px solid var(--border)',
      }}
    >
      <button
        id={`faq-${index}`}
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--foreground)',
          textAlign: 'left',
          gap: '20px',
        }}
      >
        <span style={{ fontSize: '17px', fontWeight: 500 }}>{faq.question}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ flexShrink: 0, color: 'var(--muted)' }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <p
              style={{
                paddingBottom: '24px',
                color: 'var(--muted)',
                fontSize: '16px',
                lineHeight: 1.7,
                maxWidth: '640px',
              }}
            >
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQ() {
  return (
    <section id="faq" className="section-padding">
      <div className="container-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: '64px' }}
        >
          <h2
            style={{
              fontSize: 'clamp(32px, 4vw, 52px)',
              fontWeight: 700,
              letterSpacing: '-1px',
              lineHeight: 1.15,
            }}
          >
            Frequently asked questions
          </h2>
        </motion.div>

        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          {faqs.map((faq, i) => (
            <FAQItem key={faq.question} faq={faq} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

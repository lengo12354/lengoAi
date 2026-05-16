'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: 'Who is Awartools built for?',
    answer:
      'Awartools is designed for Video Editors who want to streamline their workflow, edit faster, and save hours of manual work.',
  },
  {
    question: 'Can I use the tools for free?',
    answer:
      'Yes! We offer a free Starter plan that gives you limited access to all our tools, including auto-subtitles and B-roll finder, so you can test the quality before upgrading.',
  },
  {
    question: 'What languages are supported for Auto-Subtitles?',
    answer:
      'We support 90+ languages including Moroccan Darija (Arabic script and Franco/Latin), English, French, Spanish, Arabic, and many more. Language is detected automatically.',
  },
  {
    question: 'Where do the B-roll suggestions come from?',
    answer:
      'Our AI analyzes your script and suggests cinematic B-roll clips from famous movies, TV shows, and pop culture that you can easily find and download from YouTube.',
  },
  {
    question: 'What export formats are available for subtitles?',
    answer:
      'You can export as SRT, VTT, plain text, CapCut JSON, Premiere Pro XML, DaVinci Resolve SRT, and Final Cut Pro FCPXML. All exports include word-level timestamps on Pro.',
  },
  {
    question: 'When will the Creator Lead Finder be available?',
    answer:
      `The Creator Lead Finder is launching very soon! This powerful tool will help freelance editors and designers discover high-quality clients by searching across YouTube, Instagram, Twitter, and Spotify. You'll get verified contact info, follower metrics, and niche-specific leads all in one place. Stay tuned!`,
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
      style={{ borderBottom: '1px solid var(--border)' }}
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
          <span className="section-badge">FAQ</span>
          <h2
            style={{
              fontFamily: 'var(--font-coolvetica)',
              fontSize: 'clamp(32px, 4vw, 52px)',
              fontWeight: 400,
              letterSpacing: '-1px',
              lineHeight: 1.15,
              marginTop: '20px',
            }}
          >
            Frequently asked questions
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--muted)', maxWidth: '520px', margin: '20px auto 0', lineHeight: 1.6 }}>
            Everything you need to know about the Awartools Editor Suite.
          </p>
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

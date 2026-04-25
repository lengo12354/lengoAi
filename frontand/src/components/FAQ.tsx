'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: 'What languages does lengoAi support?',
    answer:
      'lengoAi supports 90+ languages including Moroccan Darija (Arabic script and Franco/Latin), English, French, Spanish, Arabic, and many more. Language is detected automatically — you don\'t need to select it manually.',
  },
  {
    question: 'What video and audio formats can I upload?',
    answer:
      'We accept MP3, WAV, AAC, OGG, FLAC, MP4, MOV, MKV, AVI, and WebM. Files up to 25 MB are supported.',
  },
  {
    question: 'What export formats are available?',
    answer:
      'You can export as SRT, VTT, plain text, CapCut JSON, Premiere Pro XML, DaVinci Resolve SRT, and Final Cut Pro FCPXML. All exports include word-level timestamps on Pro.',
  },
  {
    question: 'How accurate is the Darija transcription?',
    answer:
      'Our Darija model is fine-tuned specifically on Moroccan dialect audio — both Franco (Latin script) and Arabic script. In our benchmarks, we achieve over 93% word accuracy on clear Darija speech, far outperforming general-purpose models.',
  },
  {
    question: 'How long does processing take?',
    answer:
      'Most files are ready in under 60 seconds. A 1-hour recording typically takes 2–4 minutes to process. Pro users are placed in a priority queue for even faster results.',
  },
  {
    question: 'Can I edit the subtitles after they are generated?',
    answer:
      'Yes. You can review, edit, and fine-tune the generated subtitles directly in the browser before exporting. Changes are saved automatically.',
  },
  {
    question: 'Is my data private and secure?',
    answer:
      'All uploaded files are processed in isolated encrypted environments and permanently deleted within 24 hours. We are GDPR-compliant and never use your content to train our models.',
  },
  {
    question: 'Can I cancel my subscription at any time?',
    answer:
      'Absolutely — no contracts or lock-ins. Cancel from your account settings at any time and keep access until the end of your billing period.',
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
              fontSize: 'clamp(32px, 4vw, 52px)',
              fontWeight: 700,
              letterSpacing: '-1px',
              lineHeight: 1.15,
              marginTop: '20px',
            }}
          >
            Frequently asked questions
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--muted)', maxWidth: '520px', margin: '20px auto 0', lineHeight: 1.6 }}>
            Everything you need to know about lengoAi Auto Subtitles.
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

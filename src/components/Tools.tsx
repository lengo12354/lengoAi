'use client'

import { motion } from 'framer-motion'
import { Captions } from 'lucide-react'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const tools = [
  {
    icon: Captions,
    title: 'AI Auto Subtitles',
    description: 'Generate accurate subtitles for any audio or video in Darija (Arabic & Franco), English, French and 90+ languages.',
    color: '#a855f7',
    href: '/tools/auto-subtitle',
  },
]

export default function Tools() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <section id="tools" className="section-padding" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background elements */}
      <div style={{ position: 'absolute', top: '10%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(123,97,255,0.15) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(192,192,192,0.1) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div className="container-xl" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="section-badge" style={{ background: 'rgba(123,97,255,0.1)', color: '#c0c0c0', border: '1px solid rgba(123,97,255,0.2)' }}>
              Pro Tools
            </span>
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
              lineHeight: 1.1,
              marginTop: '24px',
              background: 'linear-gradient(135deg, #fff 0%, #c0c0c0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Everything you need.<br />
            <span style={{ color: '#7b61ff', WebkitTextFillColor: '#7b61ff' }}>Nothing you don't.</span>
          </motion.h2>
        </div>

        <div
          ref={containerRef}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {tools.map((tool, i) => (
            <ToolCard key={tool.title} tool={tool} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ToolCard({ tool, index }: { tool: any, index: number }) {
  const Icon = tool.icon
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => tool.href && tool.href !== '#' && router.push(tool.href)}
      style={{
        position: 'relative',
        padding: '1px',
        borderRadius: '24px',
        background: isHovered
          ? `linear-gradient(135deg, ${tool.color}50, rgba(255,255,255,0.1))`
          : 'rgba(255,255,255,0.05)',
        transition: 'background 0.3s ease',
        cursor: tool.href && tool.href !== '#' ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '23px',
          padding: '40px 32px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {/* Hover Glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at top right, ${tool.color}15, transparent 70%)`,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.5s ease',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <motion.div
            animate={{
              scale: isHovered ? 1.1 : 1,
              rotate: isHovered ? 5 : 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${tool.color}20, rgba(255,255,255,0.05))`,
              border: `1px solid ${tool.color}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '32px',
              color: tool.color,
              boxShadow: isHovered ? `0 10px 30px -10px ${tool.color}` : 'none',
            }}
          >
            <Icon size={28} strokeWidth={1.5} />
          </motion.div>

          <h3
            style={{
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '16px',
              color: '#fff',
              letterSpacing: '-0.5px',
            }}
          >
            {tool.title}
          </h3>

          <p
            style={{
              fontSize: '16px',
              color: 'var(--muted)',
              lineHeight: 1.6,
            }}
          >
            {tool.description}
          </p>
        </div>

        {/* Animated Arrow on Hover */}
        <motion.div
          animate={{
            x: isHovered ? 0 : -10,
            opacity: isHovered ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
          style={{
            marginTop: 'auto',
            paddingTop: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: tool.color,
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          Explore Tool
          <motion.span
            animate={{ x: isHovered ? 5 : 0 }}
            transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.8 }}
          >
            →
          </motion.span>
        </motion.div>
      </div>
    </motion.div>
  )
}

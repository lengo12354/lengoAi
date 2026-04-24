'use client'

import { Command } from 'lucide-react'

const footerLinks = {
  Product: ['Overview', 'Tools', 'Pricing', 'Changelog', 'Roadmap'],
  Platform: ['Video to Script', 'AI Code Editor', 'UI Generation', 'Automations', 'API Reference'],
  Company: ['About', 'Blog', 'Careers', 'Brand Assets', 'Contact'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security'],
}

export default function Footer() {
  return (
    <footer
      style={{
        background: 'var(--background)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        paddingTop: '80px',
        paddingBottom: '40px',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div className="container-xl">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr repeat(4, 1fr)',
            gap: '48px',
            marginBottom: '80px',
          }}
          className="footer-grid"
        >
          {/* Brand */}
          <div style={{ paddingRight: '40px' }}>
            <a
              href="#"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '20px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, #7b61ff, #00e5ff)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Command size={16} color="white" strokeWidth={2.5} />
              </div>
              lengoAi
            </a>
            <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.6 }}>
              The unified intelligence layer for your creative workflow.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--foreground)',
                  marginBottom: '24px',
                }}
              >
                {category}
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      style={{
                        color: 'var(--muted)',
                        textDecoration: 'none',
                        fontSize: '14px',
                        transition: 'color 0.2s ease',
                      }}
                      onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#fff')}
                      onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--muted)')}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '32px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            flexWrap: 'wrap',
            gap: '16px',
            color: 'var(--muted)',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', gap: '24px' }}>
            <span>© {new Date().getFullYear()} lengoAi Inc.</span>
            <span>All systems operational.</span>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#fff')} onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--muted)')}>Twitter</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#fff')} onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--muted)')}>GitHub</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#fff')} onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--muted)')}>Discord</a>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .footer-grid { grid-template-columns: 1fr 1fr 1fr !important; }
          .footer-grid > div:first-child { grid-column: 1 / -1; margin-bottom: 24px; }
        }
        @media (max-width: 640px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </footer>
  )
}

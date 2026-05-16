'use client'

export default function Footer() {
  return (
    <footer
      style={{
        position: 'relative',
        zIndex: 2,
        marginTop: '80px',
      }}
    >
      {/* Decorative top border glow */}
      <div style={{ height: '1px', width: '100%', background: 'linear-gradient(90deg, transparent, rgba(63,89,231,0.5), transparent)' }} />
      
      <div 
        style={{
          background: 'rgba(5, 5, 10, 0.4)',
          backdropFilter: 'blur(20px)',
          paddingTop: '60px',
          paddingBottom: '40px',
        }}
      >
        <div className="container-xl">
          <div 
            style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              justifyContent: 'space-between', 
              gap: '48px',
              marginBottom: '48px'
            }}
          >
            {/* Left - Brand */}
            <div style={{ maxWidth: '320px' }}>
              <a href="/" style={{ display: 'inline-flex', marginBottom: '20px' }}>
                <img
                  src="/lengoailogo.png"
                  alt="Awartools Logo"
                  style={{ height: '36px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                />
              </a>
              <p style={{ color: 'var(--muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
                The ultimate AI toolkit designed specifically to help video editors streamline their workflow and save hours of manual editing.
              </p>
              
              {/* Social Links (Text) */}
              <div style={{ display: 'flex', gap: '16px' }}>
                {[
                  { name: 'YouTube', href: 'https://www.youtube.com/@AwarTools' },
                  { name: 'Instagram', href: 'https://www.instagram.com/awartools' },
                ].map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '100px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--muted)',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(63,89,231,0.1)'
                      e.currentTarget.style.color = '#fff'
                      e.currentTarget.style.borderColor = 'rgba(63,89,231,0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                      e.currentTarget.style.color = 'var(--muted)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                    }}
                  >
                    {social.name}
                  </a>
                ))}
              </div>
            </div>

            {/* Right - Links */}
            <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
              <div>
                <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '20px', fontFamily: 'var(--font-heading)' }}>Platform</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['Tools', 'Pricing', 'How it Works'].map(link => (
                    <a key={link} href={`#${link.toLowerCase().replace(/ /g, '-')}`} style={{ color: 'var(--muted)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
                      {link}
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '20px', fontFamily: 'var(--font-heading)' }}>Legal</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['Privacy Policy', 'Terms of Service', 'Contact Us'].map(link => (
                    <a key={link} href="#" style={{ color: 'var(--muted)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>
              © {new Date().getFullYear()} Awartools. All rights reserved.
            </p>

          </div>
        </div>
      </div>
    </footer>
  )
}

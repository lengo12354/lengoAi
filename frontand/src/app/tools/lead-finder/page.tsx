'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Search, Video, Camera, MessageCircle, Headphones,
  Lock, Users, TrendingUp, Mail, ArrowRight, Sparkles
} from 'lucide-react'
import Link from 'next/link'

type Platform = 'youtube' | 'instagram' | 'twitter' | 'spotify'

export default function LeadFinderPage() {
  const [activePlatform, setActivePlatform] = useState<Platform>('youtube')
  const [isSearchClicked, setIsSearchClicked] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const platforms = [
    { id: 'youtube', label: 'YouTube', icon: Video, color: '#FF0000', hover: 'rgba(255, 0, 0, 0.15)' },
    { id: 'instagram', label: 'Instagram', icon: Camera, color: '#E1306C', hover: 'rgba(225, 48, 108, 0.15)' },
    { id: 'twitter', label: 'Twitter', icon: MessageCircle, color: '#1DA1F2', hover: 'rgba(29, 161, 242, 0.15)' },
    { id: 'spotify', label: 'Spotify', icon: Headphones, color: '#1DB954', hover: 'rgba(29, 185, 84, 0.15)' },
  ]

  const getPlatformColors = () => platforms.find(p => p.id === activePlatform) || platforms[0]

  return (
    <main style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* Huge Dynamic Background Glow */}
      <div style={{ position: 'fixed', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '150vw', height: '80vh', background: `radial-gradient(circle at top, ${getPlatformColors().hover.replace('0.15', '0.05')} 0%, transparent 60%)`, pointerEvents: 'none', zIndex: 0, transition: 'background 0.8s ease' }} />

      {/* Top Navbar specifically for the tool */}
      <div style={{ position: 'relative', zIndex: 10, padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
         <Link href="/#tools" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
            <ArrowLeft size={16} /> Back to Suite
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)' }}>
             <Users size={14} color="#60A5FA" />
             <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>Creator Lead Finder</span>
          </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: isSearchClicked ? 'flex-start' : 'center', paddingTop: isSearchClicked ? '40px' : '0', transition: 'all 0.5s ease', width: '100%' }}>

        <motion.div 
           initial={false}
           animate={{ y: isSearchClicked ? -20 : 0, scale: isSearchClicked ? 0.95 : 1 }}
           style={{ width: '100%', maxWidth: '800px', padding: '0 24px', textAlign: 'center' }}
        >
          {!isSearchClicked && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.1)', color: '#FCD34D', padding: '6px 16px', borderRadius: '100px', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '24px' }}>
                <Lock size={14} /> Early Access / Coming Soon
              </div>
              <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 700, letterSpacing: '-2px', color: '#fff', margin: '0 0 16px 0', lineHeight: 1.1 }}>
                Find your next <br/><span style={{ color: getPlatformColors().color, transition: 'color 0.5s ease' }}>high-paying client.</span>
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: '18px', maxWidth: '500px', margin: '0 auto 48px', lineHeight: 1.5 }}>
                Search millions of creators. Get verified emails, follower metrics, and DM links in one click.
              </p>
            </motion.div>
          )}

          {/* Central Search Engine UI */}
          <div style={{ background: 'rgba(15,15,20,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '32px', padding: '12px', backdropFilter: 'blur(40px)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', margin: '0 auto', width: '100%' }}>
            
            {/* Tabs Row */}
            <div style={{ display: 'flex', gap: '8px', padding: '0 12px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
              {platforms.map(p => (
                <button
                  key={p.id}
                  onClick={() => setActivePlatform(p.id as Platform)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '100px',
                    background: activePlatform === p.id ? p.hover : 'transparent',
                    color: activePlatform === p.id ? p.color : 'rgba(255,255,255,0.5)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={e => { if(activePlatform !== p.id) e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { if(activePlatform !== p.id) e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
                >
                  <p.icon size={18} /> {p.label}
                </button>
              ))}
            </div>

            {/* Big Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 12px 0' }}>
               <div style={{ position: 'relative', flex: 1 }}>
                 <Search size={24} color={getPlatformColors().color} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.8, transition: 'all 0.3s ease' }} />
                 <input 
                   type="text" 
                   placeholder={`Search ${getPlatformColors().label} niches (e.g. "Tech Reviewers in USA")`}
                   value={searchValue}
                   onChange={(e) => setSearchValue(e.target.value)}
                   onKeyDown={(e) => { if (e.key === 'Enter') setIsSearchClicked(true) }}
                   style={{ 
                     width: '100%', padding: '20px 20px 20px 56px', borderRadius: '20px', border: 'none', 
                     background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '18px', outline: 'none',
                     transition: 'background 0.3s'
                   }}
                   onFocus={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
                   onBlur={e => e.target.style.background = 'rgba(255,255,255,0.03)'}
                 />
               </div>
               <button 
                 onClick={() => setIsSearchClicked(true)}
                 style={{
                   marginLeft: '12px', padding: '0 32px', height: '64px', borderRadius: '20px', border: 'none',
                   background: getPlatformColors().color, color: '#fff', fontSize: '16px', fontWeight: 700,
                   cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
                   boxShadow: `0 10px 30px ${getPlatformColors().hover}`
                 }}
                 onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                 onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
               >
                 Search <ArrowRight size={18} />
               </button>
            </div>

          </div>
        </motion.div>

        {/* The Results Area (Appears below search bar when clicked) */}
        <AnimatePresence>
          {isSearchClicked && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ width: '100%', maxWidth: '1000px', padding: '40px 24px', position: 'relative' }}
            >
              
              {/* Coming Soon Glass Overlay */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.4)', borderRadius: '32px' }}>
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}
                    style={{ background: 'rgba(20,20,25,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '24px', padding: '48px', maxWidth: '480px', textAlign: 'center', boxShadow: '0 40px 80px rgba(0,0,0,0.8)' }}
                  >
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      <Lock size={40} color="#FCD34D" />
                    </div>
                    <h3 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.5px' }}>Unlocking in V2.0</h3>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', lineHeight: 1.6, marginBottom: '32px' }}>
                      We are integrating with top-tier data providers to bring you live, accurate emails and creator metrics. This powerful search engine will be available soon.
                    </p>
                    <button 
                      onClick={() => setIsSearchClicked(false)}
                      style={{ background: '#fff', color: '#000', border: 'none', padding: '16px 32px', borderRadius: '100px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', width: '100%', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      Return to Search
                    </button>
                  </motion.div>
              </div>

              {/* Blurred Mock Data behind the overlay */}
              <div style={{ opacity: 0.5, filter: 'blur(6px)', pointerEvents: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div style={{ color: '#fff', fontSize: '20px', fontWeight: 600 }}>Found <span style={{ color: getPlatformColors().color }}>8,492</span> Leads for "{searchValue || 'Your Niche'}"</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                        <div>
                          <div style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Creator Name</div>
                          <div style={{ color: getPlatformColors().color, fontSize: '13px', fontWeight: 500 }}>@creatorhandle</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                        <div style={{ flex: 1 }}>
                           <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Followers</div>
                           <div style={{ color: '#fff', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={14} color="#27C93F" /> 1.2M</div>
                        </div>
                        <div style={{ flex: 1 }}>
                           <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Contact</div>
                           <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> View Email</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  )
}

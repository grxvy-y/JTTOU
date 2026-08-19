import { useState, useEffect } from 'react'
import jttouLogo from '../assets/JTTOU.svg'

const navLinks = [
  { label: 'Home',     href: '#home' },
  { label: 'Calendar', href: '#calendar' },
  { label: 'Footer',   href: '#footer' },
]

export default function Navbar() {
  const [active, setActive] = useState('Home')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        backgroundColor: scrolled
          ? 'rgba(233, 185, 202, 0.72)'
          : 'rgba(233, 185, 202, 0.50)',
        borderBottom: '1px solid rgba(47, 43, 64, 0.10)',
        transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
        boxShadow: scrolled
          ? '0 2px 24px rgba(47, 43, 64, 0.12)'
          : 'none',
      }}
    >
      <nav
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* ── Logo ── */}
        <a
          href="#home"
          aria-label="JTTOU home"
          style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          onClick={() => setActive('Home')}
        >
          <img
            src={jttouLogo}
            alt="JTTOU"
            style={{ height: '36px', width: 'auto', display: 'block' }}
          />
        </a>

        {/* ── Nav links ── */}
        <ul
          role="list"
          style={{ display: 'flex', alignItems: 'center', gap: '4px', listStyle: 'none', margin: 0, padding: 0 }}
        >
          {navLinks.map(({ label, href }) => {
            const isActive = active === label
            return (
              <li key={label}>
                <a
                  href={href}
                  onClick={() => setActive(label)}
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    padding: '8px 18px',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontFamily: "'ADLaM Display', cursive",
                    fontWeight: 400,
                    textDecoration: 'none',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text)',
                    backgroundColor: isActive ? 'rgba(47, 43, 64, 0.10)' : 'transparent',
                    border: isActive ? '1px solid rgba(47, 43, 64, 0.18)' : '1px solid transparent',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(47, 43, 64, 0.06)'
                      ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-accent)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'
                      ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text)'
                    }
                  }}
                >
                  {label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}

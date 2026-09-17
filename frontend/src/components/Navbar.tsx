import { useState, useEffect } from 'react'
import jttouLogo from '../assets/JTTOU.svg'

const navLinks = [
  { label: 'Home',     href: '#home' },
  { label: 'Calendar', href: '#calendar' },
  { label: 'Footer',   href: '#footer' },
]

export default function Navbar() {
  const [active,    setActive]    = useState('Home')
  const [scrolled,  setScrolled]  = useState(false)
  const [menuOpen,  setMenuOpen]  = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menu on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 640) setMenuOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const bgColor = scrolled || menuOpen
    ? 'rgba(233, 185, 202, 0.85)'
    : 'rgba(233, 185, 202, 0.50)'

  const handleNav = (label: string) => {
    setActive(label)
    setMenuOpen(false)
  }

  return (
    <header
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 50,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        backgroundColor: bgColor,
        borderBottom: '1px solid rgba(47, 43, 64, 0.10)',
        transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
        boxShadow: scrolled ? '0 2px 24px rgba(47, 43, 64, 0.12)' : 'none',
      }}
    >
      {/* ── Top bar ── */}
      <nav
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 20px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <a
          href="#home"
          aria-label="JTTOU home"
          style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          onClick={() => handleNav('Home')}
        >
          <img src={jttouLogo} alt="JTTOU" style={{ height: '32px', width: 'auto', display: 'block' }} />
        </a>

        {/* Desktop links — hidden on mobile via CSS class */}
        <ul className="nav-desktop-links" role="list"
          style={{ display: 'flex', alignItems: 'center', gap: '4px', listStyle: 'none', margin: 0, padding: 0 }}
        >
          {navLinks.map(({ label, href }) => {
            const isActive = active === label
            return (
              <li key={label}>
                <a
                  href={href}
                  onClick={() => handleNav(label)}
                  style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontFamily: "'ADLaM Display', cursive",
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

        {/* Hamburger button — visible only on mobile */}
        <button
          className="nav-hamburger"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
          style={{
            background: 'none',
            border: '1px solid rgba(47,43,64,0.18)',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            color: 'var(--color-accent)',
            display: 'none',           // shown via CSS on mobile
            flexDirection: 'column',
            gap: '4px',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px', height: '40px',
            transition: 'background 0.15s',
          }}
        >
          {/* Animated bars */}
          <span style={{
            display: 'block', width: '18px', height: '2px',
            background: 'var(--color-accent)',
            borderRadius: '2px',
            transform: menuOpen ? 'translateY(6px) rotate(45deg)' : 'none',
            transition: 'transform 0.25s ease',
          }} />
          <span style={{
            display: 'block', width: '18px', height: '2px',
            background: 'var(--color-accent)',
            borderRadius: '2px',
            opacity: menuOpen ? 0 : 1,
            transition: 'opacity 0.2s ease',
          }} />
          <span style={{
            display: 'block', width: '18px', height: '2px',
            background: 'var(--color-accent)',
            borderRadius: '2px',
            transform: menuOpen ? 'translateY(-6px) rotate(-45deg)' : 'none',
            transition: 'transform 0.25s ease',
          }} />
        </button>
      </nav>

      {/* ── Mobile dropdown menu ── */}
      <div
        style={{
          maxHeight: menuOpen ? '240px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
        aria-hidden={!menuOpen}
      >
        <ul
          role="list"
          style={{
            listStyle: 'none', margin: 0,
            padding: '8px 16px 16px',
            display: 'flex', flexDirection: 'column', gap: '4px',
          }}
        >
          {navLinks.map(({ label, href }) => {
            const isActive = active === label
            return (
              <li key={label}>
                <a
                  href={href}
                  onClick={() => handleNav(label)}
                  style={{
                    display: 'block',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontFamily: "'ADLaM Display', cursive",
                    textDecoration: 'none',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text)',
                    backgroundColor: isActive ? 'rgba(47, 43, 64, 0.10)' : 'transparent',
                    border: isActive ? '1px solid rgba(47, 43, 64, 0.15)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {label}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </header>
  )
}

import { useState, useEffect, useRef } from 'react'
import jttouLogo from '../assets/JTTOU.svg'
import { useAuth } from '../context/AuthContext'
import MyAccountModal from './MyAccountModal'

const navLinks = [
  { label: 'Home',     href: '#home' },
  { label: 'Calendar', href: '#calendar' },
  { label: 'Footer',   href: '#footer' },
]

export default function Navbar() {
  const { currentUser, logout } = useAuth()
  const [active, setActive] = useState('Home')
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Profile popup state
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null)

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

  // Cleanup close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  // Timer helpers for 1-second auto-dismissal
  const startCloseTimer = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setIsProfileOpen(false)
      closeTimerRef.current = null
    }, 1000)
  }

  const cancelCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsProfileOpen(prev => {
      const next = !prev
      if (!next) {
        cancelCloseTimer()
      }
      return next
    })
  }

  const handleZoneMouseEnter = () => {
    // Continue to be visible while mouse pointer is within the pop up box / zone
    cancelCloseTimer()
  }

  const handleZoneMouseLeave = () => {
    // If not within the zone for more than 1 second, visibility will be turned off
    startCloseTimer()
  }

  const bgColor = scrolled || menuOpen
    ? 'rgba(233, 185, 202, 0.85)'
    : 'rgba(233, 185, 202, 0.50)'

  const handleNav = (label: string) => {
    setActive(label)
    setMenuOpen(false)
  }

  const roleEmoji = currentUser?.role === 'admin' ? '👑' : currentUser?.role === 'pookie' ? '🩷' : '👤'

  return (
    <>
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
            gap: '16px',
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
          <ul
            className="nav-desktop-links"
            role="list"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              listStyle: 'none',
              margin: '0 auto 0 24px',
              padding: 0,
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
                        ;(e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(47, 43, 64, 0.06)'
                        ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-accent)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        ;(e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'
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

          {/* ── Far Right Controls: User Profile Icon + Mobile Hamburger ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* User Icon Container & Pop Up Zone */}
            {currentUser && (
              <div
                id="navbar-user-zone"
                style={{ position: 'relative' }}
                onMouseEnter={handleZoneMouseEnter}
                onMouseLeave={handleZoneMouseLeave}
              >
                {/* User Icon on far right hand side */}
                <button
                  id="navbar-user-btn"
                  onClick={handleIconClick}
                  aria-label="User profile menu"
                  aria-expanded={isProfileOpen}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: '1px solid rgba(47, 43, 64, 0.15)',
                    background: isProfileOpen ? 'rgba(254, 250, 255, 0.85)' : 'rgba(254, 250, 255, 0.50)',
                    cursor: 'pointer',
                    fontFamily: "'ADLaM Display', cursive",
                    color: 'var(--color-accent)',
                    boxShadow: isProfileOpen ? '0 2px 12px rgba(47, 43, 64, 0.10)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(254, 250, 255, 0.85)'
                  }}
                  onMouseLeave={e => {
                    if (!isProfileOpen) {
                      ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(254, 250, 255, 0.50)'
                    }
                  }}
                >
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{roleEmoji}</span>
                  <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                    {currentUser.role === 'admin'
                      ? 'Admin'
                      : currentUser.role === 'pookie'
                      ? 'Pookie'
                      : currentUser.firstName}
                  </span>
                  <span style={{ fontSize: '0.65rem', opacity: 0.6, transform: isProfileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                    ▼
                  </span>
                </button>

                {/* Pop Up with smooth opening transition */}
                <div
                  id="navbar-profile-popup"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: '230px',
                    borderRadius: '18px',
                    background: 'rgba(254, 250, 255, 0.96)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(47, 43, 64, 0.12)',
                    boxShadow: '0 12px 36px rgba(47, 43, 64, 0.14), 0 2px 8px rgba(47, 43, 64, 0.06)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontFamily: "'ADLaM Display', cursive",
                    zIndex: 60,
                    opacity: isProfileOpen ? 1 : 0,
                    visibility: isProfileOpen ? 'visible' : 'hidden',
                    transform: isProfileOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
                    pointerEvents: isProfileOpen ? 'auto' : 'none',
                    transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.25s ease',
                  }}
                >
                  {/* User info preview */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(47, 43, 64, 0.08)' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(47, 43, 64, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                      }}
                    >
                      {roleEmoji}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-accent)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentUser.firstName} {currentUser.lastName}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text)', opacity: 0.6 }}>
                        @{currentUser.username}
                      </p>
                    </div>
                  </div>

                  {/* Pop up menu text links */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {/* My Account text link */}
                    <button
                      id="profile-my-account-link"
                      onClick={() => {
                        setIsProfileOpen(false)
                        cancelCloseTimer()
                        setIsAccountModalOpen(true)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '9px 12px',
                        background: 'none',
                        border: 'none',
                        borderRadius: '10px',
                        textAlign: 'left',
                        fontSize: '0.84rem',
                        color: 'var(--color-accent)',
                        fontFamily: "'ADLaM Display', cursive",
                        cursor: 'pointer',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                      onMouseEnter={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(47, 43, 64, 0.06)'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = 'none'
                      }}
                    >
                      <span>👤</span>
                      <span>My account</span>
                    </button>

                    {/* Logout text link */}
                    <button
                      id="profile-logout-link"
                      onClick={() => {
                        setIsProfileOpen(false)
                        cancelCloseTimer()
                        logout()
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '9px 12px',
                        background: 'none',
                        border: 'none',
                        borderRadius: '10px',
                        textAlign: 'left',
                        fontSize: '0.84rem',
                        color: '#b05a7a',
                        fontFamily: "'ADLaM Display', cursive",
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(176, 90, 122, 0.10)'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = 'none'
                      }}
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                display: 'none', // shown via CSS on mobile
                flexDirection: 'column',
                gap: '4px',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                transition: 'background 0.15s',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: '18px',
                  height: '2px',
                  background: 'var(--color-accent)',
                  borderRadius: '2px',
                  transform: menuOpen ? 'translateY(6px) rotate(45deg)' : 'none',
                  transition: 'transform 0.25s ease',
                }}
              />
              <span
                style={{
                  display: 'block',
                  width: '18px',
                  height: '2px',
                  background: 'var(--color-accent)',
                  borderRadius: '2px',
                  opacity: menuOpen ? 0 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              />
              <span
                style={{
                  display: 'block',
                  width: '18px',
                  height: '2px',
                  background: 'var(--color-accent)',
                  borderRadius: '2px',
                  transform: menuOpen ? 'translateY(-6px) rotate(-45deg)' : 'none',
                  transition: 'transform 0.25s ease',
                }}
              />
            </button>
          </div>
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
              listStyle: 'none',
              margin: 0,
              padding: '8px 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
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

      {/* My Account Modal */}
      <MyAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </>
  )
}

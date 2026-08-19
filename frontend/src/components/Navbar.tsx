import { useState, useEffect } from 'react'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Calendar', href: '#calendar' },
  { label: 'Footer', href: '#footer' },
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
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-[#0a0a12]/80 backdrop-blur-lg border-b border-white/[0.06] shadow-[0_2px_32px_rgba(0,0,0,0.4)]'
          : 'bg-transparent'
        }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* ── Logo ── */}
        <a
          href="#home"
          className="flex items-center gap-2.5 group select-none"
          aria-label="JTTOU home"
        >
          {/* Icon mark */}
          <span className="relative flex h-8 w-8 shrink-0">
            <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 opacity-80 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative flex h-full w-full items-center justify-center rounded-lg bg-[#12101e] border border-white/10 text-white font-black text-xs tracking-wider">
              JT
            </span>
          </span>

          {/* Wordmark */}
          <span className="font-extrabold text-lg tracking-tight">
            <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              JTTOU
            </span>
          </span>
        </a>

        {/* ── Nav links ── */}
        <ul className="flex items-center gap-1" role="list">
          {navLinks.map(({ label, href }) => {
            const isActive = active === label
            return (
              <li key={label}>
                <a
                  href={href}
                  onClick={() => setActive(label)}
                  className={`
                    relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white'
                    }
                  `}
                >
                  {/* Active pill background */}
                  {isActive && (
                    <span
                      className="absolute inset-0 rounded-lg bg-white/[0.08] border border-white/[0.10]"
                      aria-hidden
                    />
                  )}
                  <span className="relative">{label}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}

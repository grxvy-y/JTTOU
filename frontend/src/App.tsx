import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import FileDropZone from './components/FileDropZone'
import Calendar from './components/Calendar'
import AuthPage from './components/AuthPage'

function AppContent() {
  const { currentUser } = useAuth()

  // Before a user can view both the first and second hero section: have them in a login page
  if (!currentUser) {
    return <AuthPage />
  }

  const roleBadgeText =
    currentUser.role === 'admin'
      ? '👑 Master Admin Mode • Shared Calendar'
      : currentUser.role === 'pookie'
      ? '🩷 Pookie Mode • Synced with Admin'
      : `👤 ${currentUser.firstName}'s Calendar • Previewing Admin's Busy Days`

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        overflowX: 'hidden',
        overflowY: 'hidden',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'ADLaM Display', cursive",
      }}
    >
      {/* Ambient background glows */}
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          top: '-15%',
          left: '-10%',
          width: '55vw',
          height: '55vw',
          borderRadius: '50%',
          background: 'rgba(254, 250, 255, 0.25)',
          filter: 'blur(120px)',
        }}
      />
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '55vw',
          height: '55vw',
          borderRadius: '50%',
          background: 'rgba(250, 241, 232, 0.30)',
          filter: 'blur(120px)',
        }}
      />

      <Navbar />

      {/* Dropbox (First Hero Section) */}
      <main
        id="home"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
          paddingTop: '80px',
          paddingBottom: '40px',
          paddingInline: '24px',
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        <FileDropZone />
      </main>

      {/* Calendar section (Second Hero Section) */}
      <section
        id="calendar"
        style={{
          minHeight: '100vh',
          position: 'relative',
          zIndex: 1,
          padding: '80px 24px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          boxSizing: 'border-box',
        }}
      >
        {/* Section heading */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
              opacity: 0.55,
              margin: 0,
              fontFamily: "'ADLaM Display', cursive",
            }}
          >
            Schedule
          </p>
          <h2
            style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
              fontWeight: 400,
              color: 'var(--color-accent)',
              margin: 0,
              fontFamily: "'ADLaM Display', cursive",
            }}
          >
            Calendar
          </h2>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 14px',
              borderRadius: '999px',
              background: 'rgba(47, 43, 64, 0.08)',
              border: '1px solid rgba(47, 43, 64, 0.12)',
              fontSize: '0.74rem',
              color: 'var(--color-accent)',
              margin: '2px auto 0',
            }}
          >
            {roleBadgeText}
          </div>
        </div>

        <Calendar />
      </section>

      {/* Footer */}
      <footer
        id="footer"
        style={{
          borderTop: '1px solid rgba(47, 43, 64, 0.10)',
          padding: '24px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <p style={{ fontSize: '0.75rem', color: 'var(--color-accent)', opacity: 0.45, margin: 0 }}>
          JTTOU © 2026
        </p>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

import Navbar from './components/Navbar'

function App() {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'ADLaM Display', cursive",
      }}
    >
      {/* Ambient background glows */}
      <div style={{
        pointerEvents: 'none',
        position: 'absolute',
        top: '-15%', left: '-10%',
        width: '55vw', height: '55vw',
        borderRadius: '50%',
        background: 'rgba(254, 250, 255, 0.25)',
        filter: 'blur(120px)',
      }} />
      <div style={{
        pointerEvents: 'none',
        position: 'absolute',
        bottom: '-15%', right: '-10%',
        width: '55vw', height: '55vw',
        borderRadius: '50%',
        background: 'rgba(250, 241, 232, 0.30)',
        filter: 'blur(120px)',
      }} />

      <Navbar />

      {/* ── Main placeholder content ── */}
      <main
        id="home"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          paddingTop: '80px',
          paddingInline: '24px',
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-accent)', opacity: 0.6 }}>
          Shell · Work in Progress
        </p>
        <h1 style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 400, color: 'var(--color-accent)', margin: 0 }}>
          JTTOU
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-text)', maxWidth: '420px', lineHeight: 1.6, opacity: 0.75 }}>
          Frontend shell is up. Start building your pages here.
        </p>
      </main>

      {/* Footer anchor */}
      <div id="calendar" />
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

export default App

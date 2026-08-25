import Navbar from './components/Navbar'
import FileDropZone from './components/FileDropZone'

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

      {/* ── Hero section ── */}
      <main
        id="home"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
          paddingTop: '96px',
          paddingBottom: '60px',
          paddingInline: '24px',
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
        }}
      >
        {/* Hero copy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <p style={{
            fontSize: '0.72rem', letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-accent)', opacity: 0.55, margin: 0,
          }}>
            Roster Upload
          </p>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            fontWeight: 400,
            color: 'var(--color-accent)',
            margin: 0,
            lineHeight: 1.15,
          }}>
            Upload your schedule
          </h1>
          <p style={{
            fontSize: '1rem',
            color: 'var(--color-text)',
            maxWidth: '420px',
            lineHeight: 1.65,
            opacity: 0.7,
            margin: 0,
          }}>
            Drop your roster screenshots or files below — the AI will read them and extract your shifts automatically.
          </p>
        </div>

        {/* Drop zone */}
        <FileDropZone />
      </main>

      {/* ── Calendar section placeholder ── */}
      <section id="calendar" style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
        borderTop: '1px solid rgba(47,43,64,0.08)',
      }}>
        <p style={{ opacity: 0.3, fontSize: '0.9rem', fontFamily: "'ADLaM Display', cursive" }}>
          Calendar coming soon
        </p>
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

export default App

import Navbar from './components/Navbar'
import FileDropZone from './components/FileDropZone'
import Calendar from './components/Calendar'

function App() {
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

      {/* Dropbox */}
      <main
        id="home"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
          paddingTop: '80px',   /* offset for fixed navbar */
          paddingBottom: '40px',
          paddingInline: '24px',
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* Dropbox heading */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <p style={{
            fontSize: '0.72rem', letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-accent)', opacity: 0.55, margin: 0,
          }}>
            JTTOU
          </p>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            fontWeight: 400,
            color: 'var(--color-accent)',
            margin: 0,
            lineHeight: 1.15,
          }}>
            Upload screenshot(s)
          </h1>
          <p style={{
            fontSize: '1rem',
            color: 'var(--color-text)',
            maxWidth: '420px',
            lineHeight: 1.65,
            opacity: 0.7,
            margin: 0,
          }}>
            Drop your schedule screenshots/files here — the AI will read them and extract for pookie 🩷
          </p>
        </div>

        <FileDropZone />
      </main>

      {/* Calendar section */}
      <section
        id="calendar"
        style={{
          minHeight: '100vh',
          position: 'relative',
          zIndex: 1,
          borderTop: '1px solid rgba(47,43,64,0.08)',
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
          <p style={{
            fontSize: '0.72rem', letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-accent)', opacity: 0.55, margin: 0,
            fontFamily: "'ADLaM Display', cursive",
          }}>
            Schedule
          </p>
          <h2 style={{
            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
            fontWeight: 400,
            color: 'var(--color-accent)',
            margin: 0,
            fontFamily: "'ADLaM Display', cursive",
          }}>
            Calendar
          </h2>
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

export default App

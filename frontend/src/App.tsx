import Navbar from './components/Navbar'
import FileDropZone from './components/FileDropZone'
import Calendar from './components/Calendar'

function App() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Background Decorative Glow Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse [animation-duration:6000ms]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-fuchsia-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse [animation-duration:8000ms]"></div>
      <div className="absolute top-[30%] right-[20%] w-[30vw] h-[30vw] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <Navbar />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 w-full flex flex-col gap-12 z-10">
        
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto flex flex-col items-center gap-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 leading-tight">
            Next-Gen Frontend Scaffold
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
        </section>

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

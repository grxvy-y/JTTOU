import Navbar from './components/Navbar'

function App() {
  return (
    <div className="relative min-h-screen bg-[#0a0a12] text-slate-100 flex flex-col overflow-hidden font-sans">

      {/* Ambient background glows */}
      <div className="pointer-events-none absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-violet-600/10 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-fuchsia-600/10 blur-[130px]" />

      <Navbar />

      {/* ── Main placeholder content ── */}
      <main id="home" className="flex-1 flex flex-col items-center justify-center gap-4 pt-16 px-6 z-10">
        <p className="text-slate-500 text-sm tracking-widest uppercase font-semibold">
          Shell · Work in Progress
        </p>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-center bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent leading-tight">
          JTTOU
        </h1>
        <p className="text-slate-400 text-base md:text-lg text-center max-w-md leading-relaxed">
          Frontend shell is up. Start building your pages here.
        </p>
      </main>

      {/* Footer anchor */}
      <div id="footer" />
      <footer id="calendar" className="border-t border-white/[0.06] py-6 text-center z-10">
        <p className="text-xs text-slate-600">JTTOU © 2026</p>
      </footer>

    </div>
  )
}

export default App

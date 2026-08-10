import { useState } from 'react'
import { 
  Zap, 
  Cpu, 
  Layers, 
  Sparkles, 
  ArrowUpRight, 
  Code,
  Play,
  RotateCcw,
  CheckCircle2
} from 'lucide-react'

function App() {
  const [count, setCount] = useState(0)

  const techStack = [
    {
      name: 'React 19',
      description: 'Component-based UI library with modern hook architecture.',
      icon: Cpu,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-950/30',
      borderColor: 'border-cyan-500/30'
    },
    {
      name: 'Tailwind CSS v4',
      description: 'CSS-first design system with lightning-fast performance.',
      icon: Layers,
      color: 'text-teal-400',
      bgColor: 'bg-teal-950/30',
      borderColor: 'border-teal-500/30'
    },
    {
      name: 'Vite 6',
      description: 'Next-generation build tool providing blazing-fast HMR.',
      icon: Zap,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/30',
      borderColor: 'border-amber-500/30'
    },
    {
      name: 'TypeScript',
      description: 'Static type checking for robust and maintainable codebases.',
      icon: CheckCircle2,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-950/30',
      borderColor: 'border-indigo-500/30'
    }
  ]

  const commandSteps = [
    { label: 'Start Dev Server', cmd: 'npm run dev' },
    { label: 'Build Production', cmd: 'npm run build' },
    { label: 'Preview Bundle', cmd: 'npm run preview' }
  ]

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Background Decorative Glow Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[6000ms]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-fuchsia-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]"></div>
      <div className="absolute top-[30%] right-[20%] w-[30vw] h-[30vw] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative bg-slate-950 p-2 rounded-lg text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              JTTOU <span className="text-indigo-400 font-medium text-lg">Frontend</span>
            </span>
          </div>

          <a 
            href="https://github.com/grxvy-y/JTTOU" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all duration-200"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
            <span>GitHub Repository</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 w-full flex flex-col gap-12 z-10">
        
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tailwind CSS v4 & React Scaffolded Successfully</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 leading-tight">
            Next-Gen Frontend Scaffold
          </h1>
          
          <p className="text-slate-400 text-lg md:text-xl leading-relaxed">
            A fully-configured starter kit optimized for developer experience, speed, and premium design system setups.
          </p>
        </section>

        {/* Dynamic Interactive Demo & Commands */}
        <section className="grid grid-cols-1 md:grid-cols-5 gap-6">
          
          {/* Left: Counter Demo */}
          <div className="md:col-span-2 flex flex-col justify-between p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
            
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Interactive State</h3>
                  <p className="text-xs text-slate-400">Verifying HMR & React Reactivity</p>
                </div>
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Play className="w-4 h-4 fill-current" />
                </div>
              </div>

              <div className="text-center py-6">
                <span className="text-7xl font-extrabold text-white tracking-tight drop-shadow-[0_0_12px_rgba(99,102,241,0.2)]">
                  {count}
                </span>
                <p className="text-xs text-slate-500 mt-2">Active state counter value</p>
              </div>
            </div>

            <div className="flex gap-2.5 mt-4">
              <button
                onClick={() => setCount(prev => prev + 1)}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:brightness-110 active:scale-[0.98] transition-all duration-150"
              >
                Increment Count
              </button>
              <button
                onClick={() => setCount(0)}
                aria-label="Reset count"
                className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-700/80 hover:border-slate-600 transition-all duration-150 active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right: Quick Commands */}
          <div className="md:col-span-3 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Code className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Scripts & Commands</h3>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                Run these commands inside the <code className="text-indigo-300 font-mono bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-500/10">frontend</code> directory to develop or build your app:
              </p>

              <div className="flex flex-col gap-3">
                {commandSteps.map((step, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-900 hover:border-slate-800/80 transition-all group/cmd"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500">{step.label}</span>
                      <code className="text-sm font-mono text-indigo-200 mt-0.5">{step.cmd}</code>
                    </div>
                    <button 
                      onClick={() => navigator.clipboard.writeText(step.cmd)}
                      className="text-xs text-indigo-400 opacity-0 group-hover/cmd:opacity-100 hover:text-indigo-300 px-2 py-1 rounded bg-indigo-500/10 transition-all"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <p className="text-[11px] text-slate-500 mt-6 italic">
              Configured using Vite. Hot Module Replacement (HMR) automatically updates UI on save.
            </p>
          </div>

        </section>

        {/* Tech Stack Grid */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-white">Technological Foundations</h3>
            <p className="text-sm text-slate-400">Core technologies packaged inside the template</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {techStack.map((tech, idx) => {
              const Icon = tech.icon
              return (
                <div 
                  key={idx}
                  className={`p-5 rounded-2xl border ${tech.borderColor} ${tech.bgColor} backdrop-blur-sm hover:scale-[1.02] hover:border-indigo-500/20 transition-all duration-300 flex flex-col justify-between`}
                >
                  <div>
                    <div className={`p-2.5 rounded-xl w-fit ${tech.color} bg-slate-950/60 mb-4`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-2">{tech.name}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{tech.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/20 mt-12 py-6 text-center z-10">
        <p className="text-xs text-slate-500">
          Created for JTTOU Project. Open-source under MIT License.
        </p>
      </footer>
    </div>
  )
}

export default App

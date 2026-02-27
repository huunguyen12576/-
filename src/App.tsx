import { ApiKeyGate } from './components/ApiKeyGate';
import { ImageGenerator } from './components/ImageGenerator';
import { Sparkles } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      <ApiKeyGate>
        <div className="max-w-7xl mx-auto p-4 lg:p-8 flex flex-col h-screen">
          <header className="flex items-center justify-between mb-8 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">PixelForge AI</h1>
                <p className="text-xs text-zinc-500 font-medium">Powered by Gemini 3.1 & 2.5</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-xs font-medium text-zinc-400">API Connected</span>
              </div>
            </div>
          </header>

          <main className="flex-1 min-h-0">
            <ImageGenerator />
          </main>
        </div>
      </ApiKeyGate>
    </div>
  );
}

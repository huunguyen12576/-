import { useState, useEffect, ReactNode } from 'react';
import { motion } from 'motion/react';
import { Key, Loader2 } from 'lucide-react';

interface ApiKeyGateProps {
  children: ReactNode;
}

export function ApiKeyGate({ children }: ApiKeyGateProps) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const checkKey = async () => {
    try {
      if (window.aistudio) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        // Fallback for dev environment outside AI Studio if needed
        // But we assume AI Studio environment
        setHasKey(false); 
      }
    } catch (e) {
      console.error("Error checking API key:", e);
      setHasKey(false);
    }
  };

  useEffect(() => {
    checkKey();
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        // Assume success after dialog closes, re-check
        await checkKey();
      }
    } catch (e) {
      console.error("Error selecting API key:", e);
    } finally {
      setLoading(false);
    }
  };

  if (hasKey === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">API Key Required</h1>
          <p className="text-zinc-400 mb-8">
            To generate high-quality images with PixelForge AI, you need to connect your Google Cloud Project API key.
          </p>
          
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
            Connect API Key
          </button>
          
          <p className="mt-6 text-xs text-zinc-500">
            Billing must be enabled on your Google Cloud Project.
            <br />
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-300">
              Learn more about billing
            </a>
          </p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}

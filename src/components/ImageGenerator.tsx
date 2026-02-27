import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Wand2, Download, Image as ImageIcon, Sparkles, Settings2, X } from 'lucide-react';
import { generateImage, editImage, AspectRatio, ImageSize } from '../services/gemini';

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "3:4", label: "Portrait (3:4)" },
  { value: "4:3", label: "Landscape (4:3)" },
  { value: "9:16", label: "Mobile (9:16)" },
  { value: "16:9", label: "Widescreen (16:9)" },
];

const IMAGE_SIZES: { value: ImageSize; label: string }[] = [
  { value: "512px", label: "512px" },
  { value: "1K", label: "1K" },
  { value: "2K", label: "2K" },
  { value: "4K", label: "4K" },
];

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [model, setModel] = useState<"gemini-2.5-flash-image" | "gemini-3.1-flash-image-preview">("gemini-3.1-flash-image-preview");
  const [mode, setMode] = useState<"generate" | "edit">("generate");
  const [editPrompt, setEditPrompt] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError(null);
    try {
      // @ts-ignore - process.env.API_KEY is injected by the platform
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error("API Key not found. Please connect your API key.");
      }

      const result = await generateImage({
        prompt,
        model,
        aspectRatio,
        imageSize: model === "gemini-3.1-flash-image-preview" ? imageSize : undefined,
        apiKey
      });
      setImage(result);
      setMode("generate"); // Reset to generate mode after new image
    } catch (err: any) {
      setError(err.message || "Failed to generate image");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editPrompt || !image) return;
    setLoading(true);
    setError(null);
    try {
      // @ts-ignore
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error("API Key not found");
      }

      // Editing is only supported on 2.5 Flash Image currently (based on prompt "Nano banana powered app")
      // But let's try to use the selected model if it supports it.
      // The instructions say: "To edit images using the model... use gemini-2.5-flash-image".
      // It doesn't explicitly say 3.1 supports editing in the same way, but let's assume 2.5 for editing to be safe.
      
      const result = await editImage({
        prompt: editPrompt,
        image,
        model: "gemini-2.5-flash-image",
        apiKey
      });
      setImage(result);
      setEditPrompt('');
    } catch (err: any) {
      setError(err.message || "Failed to edit image");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = `generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-4rem)]">
      {/* Controls Sidebar */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-96 flex flex-col gap-6 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 overflow-y-auto"
      >
        <div>
          <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-emerald-400" />
            Configuration
          </h2>
          <p className="text-xs text-zinc-500">Customize your generation settings</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Model</label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setModel("gemini-3.1-flash-image-preview")}
                className={`p-3 rounded-xl text-left border transition-all ${
                  model === "gemini-3.1-flash-image-preview"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                    : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                <div className="font-medium">Flash Image 3.1 (Preview)</div>
                <div className="text-xs opacity-70">High quality, 4K support</div>
              </button>
              <button
                onClick={() => setModel("gemini-2.5-flash-image")}
                className={`p-3 rounded-xl text-left border transition-all ${
                  model === "gemini-2.5-flash-image"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                    : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                <div className="font-medium">Flash Image 2.5</div>
                <div className="text-xs opacity-70">Standard quality, faster</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => setAspectRatio(ratio.value)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                    aspectRatio === ratio.value
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {ratio.label.split(' ')[0]}
                  <span className="block text-[10px] opacity-60">{ratio.value}</span>
                </button>
              ))}
            </div>
          </div>

          {model === "gemini-3.1-flash-image-preview" && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Image Size</label>
              <div className="grid grid-cols-4 gap-2">
                {IMAGE_SIZES.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setImageSize(size.value)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                      imageSize === size.value
                        ? "bg-zinc-100 text-zinc-900"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto pt-6 border-t border-zinc-800">
          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt}
            className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            Generate Image
          </button>
        </div>
      </motion.div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col gap-6">
        <motion.div 
          layout
          className="flex-1 bg-zinc-900/30 rounded-2xl border border-zinc-800 flex items-center justify-center relative overflow-hidden group"
        >
          {image ? (
            <>
              <img 
                src={image} 
                alt="Generated" 
                className="max-w-full max-h-full object-contain shadow-2xl"
              />
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={downloadImage}
                  className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setImage(null)}
                  className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-colors"
                  title="Clear"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center p-8">
              <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-10 h-10 text-zinc-600" />
              </div>
              <h3 className="text-lg font-medium text-zinc-300">No image generated yet</h3>
              <p className="text-zinc-500 text-sm mt-2 max-w-xs mx-auto">
                Enter a prompt and click generate to create something amazing.
              </p>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
                <p className="text-emerald-400 font-medium animate-pulse">Creating magic...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10 p-8">
              <div className="max-w-md text-center">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-medium text-red-400 mb-2">Generation Failed</h3>
                <p className="text-zinc-400 text-sm">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="mt-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Edit Mode (Only if image exists) */}
        <AnimatePresence>
          {image && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex gap-4 items-center"
            >
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Ask to edit this image (e.g., 'Add a hat', 'Make it sunset')..."
                  className="w-full bg-transparent border-none text-white placeholder-zinc-500 focus:ring-0 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                />
              </div>
              <button
                onClick={handleEdit}
                disabled={loading || !editPrompt}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Edit Image
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

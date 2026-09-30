import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, Download, RefreshCw, Trash2, Clock, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { PageHeader } from './PageHeader';

interface GeneratedImageItem {
  id: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';
  createdAt: number;
}

interface TextToImageStudioProps {
  user: any;
  apiKey: string;
  onOpenApiSettings: () => void;
  onBackToDashboard: () => void;
  language: Language;
}

export const TextToImageStudio: React.FC<TextToImageStudioProps> = ({
  user,
  apiKey,
  onOpenApiSettings,
  onBackToDashboard,
  language,
}) => {
  const t = translations[language];

  // Views: 'home' | 'new' | 'result'
  const [view, setView] = useState<'home' | 'new' | 'result'>('home');

  // New Image Form State
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16' | '16:9'>('9:16');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Latest Generated Result
  const [latestResult, setLatestResult] = useState<GeneratedImageItem | null>(null);

  // Preview Modal State for Recent Image
  const [previewItem, setPreviewItem] = useState<GeneratedImageItem | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [recentImages, setRecentImages] = useState<GeneratedImageItem[]>(() => {
    try {
      const saved = localStorage.getItem(`mkp_recent_images_${user?.uid || 'guest'}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return [];
  });

  useEffect(() => {
    try {
      const scopedKey = `mkp_recent_images_${user?.uid || 'guest'}`;
      const saved = localStorage.getItem(scopedKey);
      if (saved) {
        setRecentImages(JSON.parse(saved));
      } else {
        setRecentImages([]);
      }
    } catch {
      setRecentImages([]);
    }
  }, [user]);

  const saveRecentImagesToStorage = (items: GeneratedImageItem[]) => {
    try {
      const scopedKey = `mkp_recent_images_${user?.uid || 'guest'}`;
      localStorage.setItem(scopedKey, JSON.stringify(items));
      setRecentImages(items);
    } catch (e) {
      console.error('Failed to save recent images:', e);
    }
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleOpenNew = () => {
    setPrompt('');
    setAspectRatio('9:16');
    setGenerationError(null);
    setView('new');
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setToastMessage(language === 'mm' ? 'ကျေးဇူးပြု၍ ပုံဖန်တီးရန် စာသား (Prompt) ထည့်ပါ။' : 'Please enter a text prompt.');
      return;
    }

    if (!apiKey || !apiKey.trim()) {
      onOpenApiSettings();
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey.trim(),
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          apiKey: apiKey.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.imageUrl) {
        const errorMsg = data.error || 'Failed to generate image.';
        setGenerationError(errorMsg);
        setToastMessage(errorMsg);
        return;
      }

      const newItem: GeneratedImageItem = {
        id: 'img_' + Date.now(),
        imageUrl: data.imageUrl,
        prompt: prompt.trim(),
        aspectRatio,
        createdAt: Date.now(),
      };

      // Save to recent images (newest first)
      const updatedList = [newItem, ...recentImages];
      saveRecentImagesToStorage(updatedList);

      setLatestResult(newItem);
      setView('result');
      setToastMessage('✨ Image generated successfully!');
    } catch (err: any) {
      const errText = err?.message || 'Network error while generating image.';
      setGenerationError(errText);
      setToastMessage(errText);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (item: GeneratedImageItem) => {
    const a = document.createElement('a');
    a.href = item.imageUrl;
    a.download = `text_to_image_${item.aspectRatio.replace(':', '_')}_${item.createdAt}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setToastMessage('📥 Image downloaded successfully.');
  };

  const handleDeleteItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = recentImages.filter((img) => img.id !== id);
    saveRecentImagesToStorage(updated);
    if (previewItem?.id === id) {
      setPreviewItem(null);
    }
    setToastMessage('Deleted image from recent history.');
  };

  // ==========================================
  // VIEW 1: HOME (RECENT IMAGES & NEW BUTTON)
  // ==========================================
  if (view === 'home') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn text-left pb-16">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-zinc-900 border border-orange-500/40 rounded-2xl p-3.5 shadow-2xl flex items-start gap-3">
            <AlertCircle className="w-4.5 h-4.5 text-orange-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-white font-medium">{toastMessage}</div>
            <button onClick={() => setToastMessage(null)} className="text-zinc-500 hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        {/* Page Header */}
        <PageHeader
          title="Text-to-Image"
          onBack={onBackToDashboard}
        />

        {/* New Image Button Card */}
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-zinc-900 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Create New AI Image</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              {language === 'mm' ? 'စာသားဖြင့် AI ပုံများကို မြန်မာ သို့မဟုတ် အင်္ဂလိပ်လို ဖန်တီးရန်။' : 'Generate stunning AI images directly from Myanmar or English prompts.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenNew}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-extrabold rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 text-xs sm:text-sm relative z-30 pointer-events-auto"
          >
            <span className="text-base">+</span>
            <span>New Image</span>
          </button>
        </div>

        {/* Recent Images Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>RECENT IMAGES</span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-zinc-800 text-zinc-400 font-semibold">
                {recentImages.length}
              </span>
            </h3>
          </div>

          {recentImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {recentImages.map((img) => {
                const boxAspect =
                  img.aspectRatio === '9:16'
                    ? 'aspect-[9/16]'
                    : img.aspectRatio === '4:5'
                    ? 'aspect-[4/5]'
                    : img.aspectRatio === '1:1'
                    ? 'aspect-square'
                    : 'aspect-video';

                return (
                  <div
                    key={img.id}
                    onClick={() => setPreviewItem(img)}
                    className="bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] shadow-lg group flex flex-col justify-between"
                  >
                    <div className={`relative w-full bg-black ${boxAspect} overflow-hidden flex items-center justify-center`}>
                      <img
                        src={img.imageUrl}
                        alt={img.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2">
                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-950/80 backdrop-blur-sm border border-zinc-700/60 text-amber-400 font-mono text-[10px] font-bold">
                          {img.aspectRatio}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(img.id, e)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-950/80 backdrop-blur-sm border border-zinc-700/60 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer relative z-30 pointer-events-auto"
                        title="Delete image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-2.5 space-y-1">
                      <p className="text-[11px] text-zinc-300 font-medium line-clamp-1">
                        {img.prompt}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {new Date(img.createdAt).toLocaleDateString()} {new Date(img.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 p-10 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-850 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-bold text-zinc-300">No generated images yet</h4>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Click "+ New Image" above to create your first AI image!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Image Preview Modal */}
        {previewItem && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-4 sm:p-5 space-y-4 shadow-2xl animate-fadeIn text-left">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold font-mono text-xs">
                  {previewItem.aspectRatio}
                </span>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer relative z-30 pointer-events-auto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className={`relative w-full bg-black rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center max-h-[60vh]`}>
                <img
                  src={previewItem.imageUrl}
                  alt={previewItem.prompt}
                  className="max-h-[60vh] object-contain"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs text-zinc-300 font-medium leading-relaxed bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                  {previewItem.prompt}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono text-right">
                  {new Date(previewItem.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => handleDownload(previewItem)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer relative z-30 pointer-events-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: NEW IMAGE FORM
  // ==========================================
  if (view === 'new') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn text-left pb-16">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-zinc-900 border border-orange-500/40 rounded-2xl p-3.5 shadow-2xl flex items-start gap-3">
            <AlertCircle className="w-4.5 h-4.5 text-orange-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-white font-medium">{toastMessage}</div>
            <button onClick={() => setToastMessage(null)} className="text-zinc-500 hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        {/* Header with New Image Button */}
        <div className="flex items-center justify-between relative z-30">
          <button
            type="button"
            onClick={() => setView('home')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer relative z-30 pointer-events-auto active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>New Image</span>
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
          {/* Text Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider block">
              Text Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create..."
              rows={4}
              className="w-full p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-xs sm:text-sm text-zinc-100 outline-none leading-relaxed resize-none"
            />
          </div>

          {/* Aspect Ratio: 2x2 grid on mobile, 4 columns on desktop */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider block">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: '1:1', label: 'Square' },
                { id: '4:5', label: 'Portrait' },
                { id: '9:16', label: 'Portrait' },
                { id: '16:9', label: 'Landscape' },
              ].map((item) => {
                const ratio = item.id as '1:1' | '4:5' | '9:16' | '16:9';
                return (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 relative z-20 pointer-events-auto ${
                      aspectRatio === ratio
                        ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-md'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    <span>{ratio}</span>
                    <span className="text-[10px] font-sans font-normal opacity-80">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {generationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{generationError}</span>
            </div>
          )}

          {/* Generate Button / Loading State */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-extrabold rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 text-sm relative z-30 pointer-events-auto"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>Generating AI Image...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-zinc-950" />
                  <span>Generate Image</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: IMAGE RESULT SCREEN
  // ==========================================
  if (view === 'result' && latestResult) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn text-left pb-16">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-zinc-900 border border-orange-500/40 rounded-2xl p-3.5 shadow-2xl flex items-start gap-3">
            <AlertCircle className="w-4.5 h-4.5 text-orange-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-white font-medium">{toastMessage}</div>
            <button onClick={() => setToastMessage(null)} className="text-zinc-500 hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between relative z-30">
          <button
            type="button"
            onClick={() => setView('home')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer relative z-30 pointer-events-auto active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>New Image</span>
          </button>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
            <span>✨ Generated Successfully</span>
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-extrabold text-white">Generated Image</h2>
            <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-amber-400 font-mono text-xs font-bold">
              {latestResult.aspectRatio}
            </span>
          </div>

          {/* Large Image Preview */}
          <div className="flex justify-center bg-zinc-950 p-3 rounded-2xl border border-zinc-800 overflow-hidden shadow-inner">
            <div className={`relative rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-2xl flex items-center justify-center max-h-[500px]`}>
              <img
                src={latestResult.imageUrl}
                alt={latestResult.prompt}
                className="max-h-[500px] object-contain"
              />
            </div>
          </div>

          {/* Prompt Summary */}
          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 text-xs text-zinc-300 leading-relaxed font-sans">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-mono font-bold">Prompt Used:</p>
            {latestResult.prompt}
          </div>

          {/* Action Buttons: Download & Generate Again */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleDownload(latestResult)}
              className="py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-extrabold rounded-xl text-xs sm:text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 relative z-30 pointer-events-auto"
            >
              <Download className="w-4 h-4 text-zinc-950" />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNew}
              className="py-3 px-4 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-95 relative z-30 pointer-events-auto"
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span>Generate Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

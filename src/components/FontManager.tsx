import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Type,
  Check,
  Trash2,
  Sparkles,
  Info,
  AlertCircle,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { UploadedFont } from '../types';
import { fontRegistry, MYANMAR_SAMPLE_PREVIEW_TEXT } from '../utils/fontRegistry';

interface FontManagerProps {
  selectedFontFamily?: string;
  onSelectFont: (font: UploadedFont | null) => void;
}

export const FontManager: React.FC<FontManagerProps> = ({
  selectedFontFamily,
  onSelectFont,
}) => {
  const [fonts, setFonts] = useState<UploadedFont[]>(() => fontRegistry.getFonts());
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to registry updates across session
  useEffect(() => {
    const unsubscribe = fontRegistry.subscribe(() => {
      setFonts(fontRegistry.getFonts());
    });
    return unsubscribe;
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    let lastLoaded: UploadedFont | null = null;
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const loaded = await fontRegistry.registerFontFile(file);
        lastLoaded = loaded;
      } catch (err: any) {
        errors.push(`${file.name}: ${err?.message || 'Failed to load font'}`);
      }
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join('; '));
    }

    if (lastLoaded) {
      setSuccessMessage(
        `Loaded ${files.length > 1 ? `${files.length} fonts` : `"${lastLoaded.fileName}"`} successfully.`
      );
      // Automatically select the newly uploaded font
      onSelectFont(lastLoaded);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsUploading(false);
  };

  const handleRemoveFont = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const fontToRemove = fonts.find((f) => f.id === id);
    fontRegistry.removeFont(id);
    if (fontToRemove && selectedFontFamily === fontToRemove.fontFamily) {
      onSelectFont(null);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Type className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight uppercase">
                Custom Thumbnail Fonts
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Local FontFace API
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Upload your own Myanmar fonts (.ttf, .otf, .woff, .woff2) to overlay clean typography onto thumbnails.
            </p>
          </div>
        </div>

        {/* Upload Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="font-file-input"
          />
          <label
            htmlFor="font-file-input"
            className={`inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer select-none ${
              isUploading ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            <Upload className="w-4 h-4 text-zinc-950" />
            <span>{isUploading ? 'Loading Font...' : 'Upload Font'}</span>
          </label>
        </div>
      </div>

      {/* Session Storage Notice */}
      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-zinc-300 font-medium">Font available for this session.</p>
          <p className="text-[11px] text-zinc-500">
            Fonts are registered directly into the browser via FontFace API. Fonts are never sent to external servers or AI models.
          </p>
        </div>
      </div>

      {/* Error / Success Feedback */}
      {errorMessage && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Font List & Previews */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-400">
            Available Fonts ({fonts.length + 1})
          </span>
          <span className="text-[11px] text-zinc-500">
            Preview text: <strong className="text-zinc-300">"{MYANMAR_SAMPLE_PREVIEW_TEXT}"</strong>
          </span>
        </div>

        {/* Default System Font Option */}
        <div
          onClick={() => onSelectFont(null)}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            !selectedFontFamily
              ? 'bg-amber-500/5 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Default Myanmar Font</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                Pyidaungsu / System Sans
              </span>
              {!selectedFontFamily && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Active
                </span>
              )}
            </div>
            <p
              className="text-lg font-medium text-amber-400 tracking-wide font-sans mt-1"
              style={{ fontFamily: '"Pyidaungsu", "Padauk", "Myanmar Text", sans-serif' }}
            >
              {MYANMAR_SAMPLE_PREVIEW_TEXT}
            </p>
          </div>

          <div className="self-end sm:self-center">
            {!selectedFontFamily ? (
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Check className="w-3.5 h-3.5" /> Selected
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFont(null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700"
              >
                Use This Font
              </button>
            )}
          </div>
        </div>

        {/* Uploaded Custom Fonts */}
        {fonts.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-zinc-800 text-center space-y-2">
            <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400">
              No custom fonts uploaded yet. Upload a font like <strong>Myanmar3.ttf</strong>, <strong>Padauk.ttf</strong>, or <strong>NotoSansMyanmar.woff2</strong>.
            </p>
            <p className="text-[11px] text-zinc-500">
              Supported formats: .ttf, .otf, .woff, .woff2
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {fonts.map((font) => {
              const isSelected = selectedFontFamily === font.fontFamily;
              return (
                <div
                  key={font.id}
                  onClick={() => onSelectFont(font)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-amber-500/5 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">Font Name:</span>
                      <span className="font-mono text-xs font-semibold text-zinc-200 bg-zinc-800/80 px-2 py-0.5 rounded-lg border border-zinc-700">
                        {font.fileName}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {font.format}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {fontRegistry.formatFileSize(font.fileSize)}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>

                    {/* Myanmar Text Preview using this specific loaded font */}
                    <div className="pt-1">
                      <p
                        className="text-xl font-semibold text-amber-400 tracking-wide"
                        style={{ fontFamily: `"${font.fontFamily}", sans-serif` }}
                      >
                        {MYANMAR_SAMPLE_PREVIEW_TEXT}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isSelected ? (
                      <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <Check className="w-3.5 h-3.5" /> Selected
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFont(font);
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors shadow-sm"
                      >
                        Use This Font
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleRemoveFont(font.id, e)}
                      title="Remove font from session"
                      className="p-1.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors border border-zinc-700 hover:border-rose-500/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

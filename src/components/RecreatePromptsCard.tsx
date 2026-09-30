import React from 'react';
import { RefreshCw, Check, Layers, Ratio, CheckCircle2 } from 'lucide-react';
import { CharacterItem, OutputAspectRatioType } from '../types';
import { Language, translations } from '../utils/i18n';

interface RecreatePromptsCardProps {
  characters: CharacterItem[];
  scenesCount: number;
  currentOutputRatio: OutputAspectRatioType;
  onChangeOutputRatio: (ratio: OutputAspectRatioType) => void;
  onRecreatePrompts: () => void;
  isRecreating: boolean;
  lastRecreatedInfo: {
    timestamp: number;
    count: number;
    ratio: OutputAspectRatioType;
  } | null;
  hasReplacements: boolean;
  language: Language;
}

const OUTPUT_RATIOS: Array<{
  ratio: OutputAspectRatioType;
  label: string;
  sub: string;
}> = [
  { ratio: 'Original', label: 'Original', sub: 'Detected' },
  { ratio: '9:16', label: '9:16', sub: 'Vertical' },
  { ratio: '16:9', label: '16:9', sub: 'Landscape' },
];

const getFruitEmoji = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('orange')) return '🍊';
  if (lower.includes('apple')) return '🍎';
  if (lower.includes('banana')) return '🍌';
  if (lower.includes('pear')) return '🍐';
  if (lower.includes('mango')) return '🥭';
  if (lower.includes('watermelon')) return '🍉';
  if (lower.includes('strawberry')) return '🍓';
  if (lower.includes('pineapple')) return '🍍';
  if (lower.includes('coconut')) return '🥥';
  if (lower.includes('lemon')) return '🍋';
  if (lower.includes('grape')) return '🍇';
  if (lower.includes('peach')) return '🍑';
  if (lower.includes('durian')) return '🍈';
  return '🍎';
};

export const RecreatePromptsCard: React.FC<RecreatePromptsCardProps> = ({
  characters,
  scenesCount,
  currentOutputRatio,
  onChangeOutputRatio,
  onRecreatePrompts,
  isRecreating,
  lastRecreatedInfo,
  hasReplacements,
  language,
}) => {
  const t = translations[language];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {t.recreatePromptsButton}
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-400 leading-normal">
              {t.recreatePromptsDesc}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
          {hasReplacements ? 'Replacements Active' : 'Original Bible'}
        </span>
      </div>

      {/* Current Characters & Affected Scenes (Compact Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            {t.currentCharacters} · {characters.length}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {characters.map((char) => (
              <span
                key={char.id}
                className="px-2.5 py-1 rounded-lg bg-zinc-800/90 border border-zinc-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <span>{getFruitEmoji(char.name)}</span>
                <span>{char.name}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            Target
          </span>
          <div className="text-xs font-semibold text-zinc-200">
            {t.affectedScenes.replace('{count}', String(scenesCount))}
          </div>
          <span className="text-[10px] text-zinc-500">
            Preserves camera, action &amp; dialogue structure
          </span>
        </div>
      </div>

      {/* Output Ratio Selection (3 Options: Original, 9:16, 16:9) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Ratio className="w-3.5 h-3.5 text-amber-400" />
            {t.outputRatio}
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {OUTPUT_RATIOS.map((item) => {
            const isSelected = currentOutputRatio === item.ratio;
            return (
              <button
                key={item.ratio}
                type="button"
                onClick={() => onChangeOutputRatio(item.ratio)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <div className="text-xs sm:text-sm font-bold flex items-center justify-center gap-1">
                  <span>{item.label}</span>
                  {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                  {item.sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Success Notification if recently recreated */}
      {lastRecreatedInfo && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>
              Successfully recreated {lastRecreatedInfo.count} scene prompts ({lastRecreatedInfo.ratio} ratio).
            </span>
          </div>
          <span className="text-[10px] opacity-75 font-mono">
            {new Date(lastRecreatedInfo.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Primary Recreate Button & Compact Helper Text */}
      <div className="space-y-1.5 pt-1">
        <button
          type="button"
          disabled={isRecreating}
          onClick={onRecreatePrompts}
          className="w-full h-11 sm:h-12 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-600 hover:via-orange-700 hover:to-rose-700 text-zinc-950 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isRecreating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{t.recreating}</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>{t.recreatePromptsButton}</span>
            </>
          )}
        </button>
        <p className="text-center text-[11px] text-zinc-500">
          {t.recreateHelperText}
        </p>
      </div>
    </div>
  );
};

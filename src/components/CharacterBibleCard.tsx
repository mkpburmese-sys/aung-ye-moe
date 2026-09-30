import React, { useState } from 'react';
import { BookOpen, Edit3, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { CharacterItem, ProjectMetadata } from '../types';
import { Language, translations } from '../utils/i18n';

interface CharacterBibleCardProps {
  characters: CharacterItem[];
  projectMeta: ProjectMetadata;
  language?: Language;
  onUpdateCharacter: (charId: string, updated: Partial<CharacterItem>) => void;
  onUpdateProjectMeta: (updated: Partial<ProjectMetadata>) => void;
}

export const CharacterBibleCard: React.FC<CharacterBibleCardProps> = ({
  characters,
  projectMeta,
  language = 'mm',
  onUpdateCharacter,
  onUpdateProjectMeta,
}) => {
  const t = translations[language];
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [showBackgroundChars, setShowBackgroundChars] = useState(false);
  const [expandedCharIds, setExpandedCharIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (charId: string) => {
    setExpandedCharIds((prev) => ({
      ...prev,
      [charId]: !prev[charId],
    }));
  };

  const getCharacterEmojiOrIcon = (name: string, type: string) => {
    const lower = `${name} ${type}`.toLowerCase();
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
    if (lower.includes('robot') || lower.includes('bot')) return '🤖';
    if (lower.includes('animal') || lower.includes('cat') || lower.includes('dog') || lower.includes('bear') || lower.includes('bird')) return '🐾';
    if (lower.includes('human') || lower.includes('man') || lower.includes('woman') || lower.includes('boy') || lower.includes('girl') || lower.includes('person') || lower.includes('character a') || lower.includes('character b')) return '👤';
    if (lower.includes('fantasy') || lower.includes('monster') || lower.includes('alien')) return '👾';
    return '🎭';
  };

  const primaryChars = characters.filter((c) => c.importance === 'PRIMARY');
  const secondaryChars = characters.filter((c) => c.importance === 'SECONDARY');
  const backgroundChars = characters.filter((c) => c.importance === 'BACKGROUND');

  const renderCharacterCard = (char: CharacterItem, index: number) => {
    const isEditing = editingCharId === char.id;
    const isExpanded = Boolean(expandedCharIds[char.id]);
    const emojiOrIcon = getCharacterEmojiOrIcon(char.name, char.type);
    const scenesText = t.appearsInScenes.replace('{count}', String(char.scenesCount || 1));

    return (
      <div
        key={char.id}
        className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/30 rounded-2xl p-4 shadow-md transition-all duration-300 relative overflow-hidden"
      >
        {/* Collapsed Header / Accordion Bar */}
        <div
          onClick={() => !isEditing && toggleExpand(char.id)}
          className="flex items-center justify-between gap-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-lg shadow-inner shrink-0">
              {emojiOrIcon}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white leading-snug truncate">
                {char.name}
              </h3>
              <p className="text-xs text-zinc-400 font-medium truncate">
                {scenesText}
                {char.estimatedAge ? ` • ${t.estimatedAgeLabel}: ${char.estimatedAge}` : ''}
              </p>
              {((char.originalName || char.original_name) &&
                (char.originalName || char.original_name) !== char.name) && (
                <span className="text-[11px] text-amber-400 font-medium block truncate">
                  (Replaced from {char.originalName || char.original_name})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingCharId(isEditing ? null : char.id);
                if (!isEditing) {
                  setExpandedCharIds((prev) => ({ ...prev, [char.id]: true }));
                }
              }}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
              title={isEditing ? 'Done' : 'Edit character specs'}
            >
              {isEditing ? <Check className="w-4 h-4 text-emerald-400" /> : <Edit3 className="w-4 h-4" />}
            </button>
            <div className="p-1 text-zinc-400">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Expanded Details / Editor */}
        {isExpanded && (
          <div className="mt-4 pt-3 border-t border-zinc-800/80 animate-fadeIn">
            {isEditing ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-zinc-400 font-medium">Name / Label</label>
                  <input
                    type="text"
                    value={char.name}
                    onChange={(e) => onUpdateCharacter(char.id, { name: e.target.value })}
                    className="w-full mt-1 p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-medium">{t.typeLabel}</label>
                  <input
                    type="text"
                    value={char.type}
                    onChange={(e) => onUpdateCharacter(char.id, { type: e.target.value })}
                    className="w-full mt-1 p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-medium">{t.estimatedAgeLabel}</label>
                  <input
                    type="text"
                    value={char.estimatedAge || ''}
                    onChange={(e) => onUpdateCharacter(char.id, { estimatedAge: e.target.value })}
                    placeholder="e.g. 20-year-old"
                    className="w-full mt-1 p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-medium">{t.visualLabel}</label>
                  <textarea
                    rows={2}
                    value={char.head}
                    onChange={(e) => onUpdateCharacter(char.id, { head: e.target.value })}
                    className="w-full mt-1 p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-medium">{t.clothingLabel}</label>
                  <input
                    type="text"
                    value={char.clothing}
                    onChange={(e) => onUpdateCharacter(char.id, { clothing: e.target.value })}
                    className="w-full mt-1 p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setEditingCharId(null)}
                    className="px-3 py-1.5 bg-amber-500 text-zinc-950 font-bold rounded-lg text-xs"
                  >
                    Save Specifications
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-zinc-500 font-medium uppercase text-[10px]">{t.typeLabel}:</span>
                    <p className="text-zinc-200 font-medium">{char.type || 'Recurring Character'}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-medium uppercase text-[10px]">{t.estimatedAgeLabel}:</span>
                    <p className="text-amber-300 font-medium">{char.estimatedAge || 'Adult'}</p>
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium uppercase text-[10px]">{t.visualLabel}:</span>
                  <p className="text-zinc-300 leading-relaxed">{char.head || char.description || 'Observable recurring appearance'}</p>
                </div>
                {char.clothing && (
                  <div>
                    <span className="text-zinc-500 font-medium uppercase text-[10px]">{t.clothingLabel}:</span>
                    <p className="text-zinc-300">{char.clothing}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const primaryCountText = t.primaryCharactersCount.replace('{count}', String(primaryChars.length));
  const secondaryCountText = t.secondaryCharactersCount.replace('{count}', String(secondaryChars.length));
  const backgroundCountText = t.backgroundCharactersCount.replace('{count}', String(backgroundChars.length));

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {t.characterBibleTitle}
            </h2>
            <p className="text-xs text-zinc-400 hidden sm:block">
              {t.characterBibleSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* PRIMARY CHARACTERS SECTION */}
      {primaryChars.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 pb-1 border-b border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-xs font-bold text-zinc-300 tracking-wider uppercase">
              {primaryCountText}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {primaryChars.map((char, idx) => renderCharacterCard(char, idx))}
          </div>
        </div>
      )}

      {/* SECONDARY CHARACTERS SECTION */}
      {secondaryChars.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center gap-2 pb-1 border-b border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <h3 className="text-xs font-bold text-zinc-300 tracking-wider uppercase">
              {secondaryCountText}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {secondaryChars.map((char, idx) => renderCharacterCard(char, idx))}
          </div>
        </div>
      )}

      {/* BACKGROUND CHARACTERS SECTION (Collapsible) */}
      {backgroundChars.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <button
            onClick={() => setShowBackgroundChars(!showBackgroundChars)}
            className="w-full p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              <span>{backgroundCountText}</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <span>{showBackgroundChars ? t.hideBackgroundChars : t.showBackgroundChars}</span>
              {showBackgroundChars ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showBackgroundChars && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 animate-fadeIn">
              {backgroundChars.map((char, idx) => renderCharacterCard(char, idx))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

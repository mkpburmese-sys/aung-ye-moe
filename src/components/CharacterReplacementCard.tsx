import React, { useState, useEffect } from 'react';
import {
  Shuffle,
  Sparkles,
  Check,
  ArrowRight,
  RefreshCw,
  Settings2,
  Sliders,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  Search,
  User,
  Plus,
  X,
} from 'lucide-react';
import { CharacterItem, OutputAspectRatioType, ReplacementOptions } from '../types';
import {
  CharacterMappingsMap,
  ReplacementMappingItem,
  ReplacementSummary,
} from '../utils/characterReplacementEngine';
import { translateDescriptionToEnglish } from '../utils/characterTranslator';
import { Language, translations } from '../utils/i18n';

interface CharacterReplacementCardProps {
  characters: CharacterItem[];
  characterMappings?: CharacterMappingsMap;
  customCharacters?: CharacterItem[];
  onAddCustomCharacter: (char: CharacterItem) => void;
  hasActiveReplacements: boolean;
  language?: Language;
  apiKey: string;
  onApplyAllReplacements: (
    replacements: Array<{
      characterId?: string;
      originalName: string;
      replacementProfile: ReplacementMappingItem['replacementProfile'];
      options: ReplacementOptions;
    }>,
    selectedOutputRatio: OutputAspectRatioType
  ) => Promise<void>;
  onResetReplacements: () => void;
  isApplying: boolean;
  lastSummary: ReplacementSummary | null;
  outputRatio?: OutputAspectRatioType;
  onChangeOutputRatio?: (ratio: OutputAspectRatioType) => void;
  detectedRatioLabel?: string;
}

const FRUIT_PRESETS = [
  {
    name: 'Pineapple Head',
    fruit_type: 'anthropomorphic pineapple character',
    head: 'golden amber oval pineapple head crowned with vibrant spiky tropical leaves',
    texture: 'geometric diamond-scaled natural pineapple bark texture',
    stem: 'spiky upright green pineapple crown leaves',
    emoji: '🍍',
  },
  {
    name: 'Lemon Head',
    fruit_type: 'anthropomorphic lemon character',
    head: 'bright sunny yellow lemon-shaped head with natural pointed citrus tip',
    texture: 'vibrant porous yellow lemon peel texture with subtle citrus gloss',
    stem: 'tiny green stem knob',
    emoji: '🍋',
  },
  {
    name: 'Apple Head',
    fruit_type: 'anthropomorphic red apple character',
    head: 'glossy red apple spherical head with small brown stem and fresh green leaf',
    texture: 'smooth, natural red apple peel with subtle organic speckles',
    stem: 'small brown stem with a crisp green leaf',
    emoji: '🍎',
  },
  {
    name: 'Pear Head',
    fruit_type: 'anthropomorphic pear character',
    head: 'classic teardrop pear-shaped head with yellow-green skin and top stem',
    texture: 'delicate pear skin texture with natural russeting freckles',
    stem: 'curved slender brown stem',
    emoji: '🍐',
  },
  {
    name: 'Mango Head',
    fruit_type: 'anthropomorphic ripe mango character',
    head: 'kidney-shaped golden yellow mango head with soft orange-red blush',
    texture: 'velvety smooth ripe mango skin',
    stem: 'small sturdy stem notch',
    emoji: '🥭',
  },
  {
    name: 'Watermelon Head',
    fruit_type: 'anthropomorphic watermelon character',
    head: 'round striped green watermelon head with dark and light green patterns',
    texture: 'firm waxy rind with distinct emerald green vertical stripes',
    stem: 'short curly green vine stem',
    emoji: '🍉',
  },
  {
    name: 'Strawberry Head',
    fruit_type: 'anthropomorphic strawberry character',
    head: 'conical bright ruby red strawberry head with green leafy calyx crown',
    texture: 'textured strawberry surface embedded with tiny golden yellow seeds',
    stem: 'star-shaped green leafy crown cap',
    emoji: '🍓',
  },
  {
    name: 'Coconut Head',
    fruit_type: 'anthropomorphic coconut character',
    head: 'round textured brown coconut head with three distinct indentations',
    texture: 'fibrous hairy brown coconut husk texture',
    stem: 'hard top husk ridge',
    emoji: '🥥',
  },
  {
    name: 'Banana Head',
    fruit_type: 'anthropomorphic banana character',
    head: 'curved golden yellow banana head with green tipped stem',
    texture: 'smooth yellow peel with subtle brown ripeness specks',
    stem: 'greenish-brown curved fruit stalk',
    emoji: '🍌',
  },
  {
    name: 'Orange Head',
    fruit_type: 'anthropomorphic orange character',
    head: 'round bright orange citrus head with dimpled porous peel',
    texture: 'vibrant porous orange citrus peel',
    stem: 'brown stem with a solitary green leaf',
    emoji: '🍊',
  },
];

const getDefaultPresetForCharacter = (c: CharacterItem) => {
  const cNameLower = (c.original_name || c.originalName || c.name || '').toLowerCase();
  const candidate =
    FRUIT_PRESETS.find(
      (p) => !cNameLower.includes(p.name.toLowerCase().split(' ')[0])
    ) || FRUIT_PRESETS[0];

  return {
    name: candidate.name,
    fruit_type: candidate.fruit_type,
    head: candidate.head,
    texture: candidate.texture,
    stem: candidate.stem || '',
    custom: false,
    emoji: candidate.emoji,
  };
};

export const CharacterReplacementCard: React.FC<CharacterReplacementCardProps> = ({
  characters,
  characterMappings = {},
  customCharacters = [],
  onAddCustomCharacter,
  hasActiveReplacements,
  language = 'mm',
  apiKey,
  onApplyAllReplacements,
  onResetReplacements,
  isApplying,
  lastSummary,
  outputRatio,
  onChangeOutputRatio,
  detectedRatioLabel,
}) => {
  const t = translations[language];

  const [selectedReplacements, setSelectedReplacements] = useState<
    Record<
      string,
      {
        name: string;
        fruit_type: string;
        head: string;
        texture: string;
        stem: string;
        clothing?: string;
        body?: string;
        custom: boolean;
        emoji?: string;
        originalDescription?: string;
        promptDescription?: string;
      }
    >
  >(() => {
    const initial: any = {};
    characters.forEach((c) => {
      initial[c.id] = getDefaultPresetForCharacter(c);
    });
    return initial;
  });

  useEffect(() => {
    setSelectedReplacements((prev) => {
      let changed = false;
      const next = { ...prev };
      characters.forEach((c) => {
        if (!next[c.id]) {
          next[c.id] = getDefaultPresetForCharacter(c);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [characters]);

  const [options, setOptions] = useState<ReplacementOptions>({
    keep_head: true,
    keep_clothing: true,
    keep_body: true,
  });

  const [activeSettingsCharId, setActiveSettingsCharId] = useState<string | null>(null);
  const [dropdownOpenCharId, setDropdownOpenCharId] = useState<string | null>(null);
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

  // Custom Character Modal State
  const [customModalCharId, setCustomModalCharId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customType, setCustomType] = useState('Human');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [successStatusMessage, setSuccessStatusMessage] = useState<string | null>(null);

  // Track user modifications and applied status for conditional reset button
  const [hasUserMadeChanges, setHasUserMadeChanges] = useState(false);
  const [hasAppliedChanges, setHasAppliedChanges] = useState(false);

  const handleSelectPreset = (charId: string, preset: (typeof FRUIT_PRESETS)[0]) => {
    setSelectedReplacements((prev) => ({
      ...prev,
      [charId]: {
        name: preset.name,
        fruit_type: preset.fruit_type,
        head: preset.head,
        texture: preset.texture,
        stem: preset.stem || '',
        custom: false,
        emoji: preset.emoji,
      },
    }));
    setDropdownOpenCharId(null);
    setHasUserMadeChanges(true);
  };

  const handleSelectCustomChar = (charId: string, customChar: CharacterItem) => {
    setSelectedReplacements((prev) => ({
      ...prev,
      [charId]: {
        name: customChar.name,
        fruit_type: customChar.type,
        head: customChar.promptDescription || customChar.head,
        texture: customChar.promptDescription || customChar.texture,
        clothing: customChar.promptDescription || customChar.clothing,
        body: customChar.promptDescription || customChar.body,
        stem: '',
        custom: true,
        emoji: '👤',
        originalDescription: customChar.originalDescription,
        promptDescription: customChar.promptDescription,
      },
    }));
    setDropdownOpenCharId(null);
    setHasUserMadeChanges(true);
  };

  const handleOpenCustomModal = (charId: string) => {
    setCustomModalCharId(charId);
    setCustomName('');
    setCustomDescription('');
    setCustomType('Human');
    setDropdownOpenCharId(null);
  };

  const handleSaveCustomCharacter = async () => {
    if (!customModalCharId || !customName.trim()) return;

    setIsCreatingCustom(true);
    try {
      const promptDesc = await translateDescriptionToEnglish(customDescription, apiKey);
      const finalPromptDesc = promptDesc || customDescription.trim() || customName.trim();

      const newChar: CharacterItem = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: customName.trim(),
        type: customType.trim() || 'Human',
        estimatedAge: '',
        head: finalPromptDesc,
        texture: finalPromptDesc,
        face: finalPromptDesc,
        body: finalPromptDesc,
        clothing: finalPromptDesc,
        personality: 'Custom user-created character profile',
        description: finalPromptDesc,
        originalDescription: customDescription.trim() || customName.trim(),
        promptDescription: finalPromptDesc,
        importance: 'PRIMARY',
      };

      onAddCustomCharacter(newChar);
      handleSelectCustomChar(customModalCharId, newChar);
      setCustomModalCharId(null);
      setSuccessStatusMessage('✓ Character created');
      setTimeout(() => setSuccessStatusMessage(null), 3500);
    } catch (e) {
      console.error('Error creating custom character:', e);
    } finally {
      setIsCreatingCustom(false);
    }
  };

  const handleApplyAll = async () => {
    const list = characters.map((c) => {
      const rep = selectedReplacements[c.id] || getDefaultPresetForCharacter(c);
      return {
        characterId: c.id,
        originalName: c.originalName || c.original_name || c.name,
        replacementProfile: rep,
        options,
      };
    });
    setHasAppliedChanges(true);
    setHasUserMadeChanges(false);
    await onApplyAllReplacements(list, outputRatio || 'Original');
  };

  const handleReset = () => {
    const initial: any = {};
    characters.forEach((c) => {
      initial[c.id] = getDefaultPresetForCharacter(c);
    });
    setSelectedReplacements(initial);
    setOptions({
      keep_head: true,
      keep_clothing: true,
      keep_body: true,
    });
    setHasUserMadeChanges(false);
    setHasAppliedChanges(false);
    onResetReplacements();
  };

  const isResetVisible = hasUserMadeChanges || hasAppliedChanges || Boolean(hasActiveReplacements);

  return (
    <div className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 relative transition-all duration-300">
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Shuffle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {language === 'mm' ? 'ဇာတ်ကောင် အစားထိုးရန်' : 'Character Replacement'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {successStatusMessage && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-3 py-1.5 rounded-xl animate-fadeIn">
              {successStatusMessage}
            </span>
          )}

          {isResetVisible && (
            <button
              onClick={handleReset}
              disabled={isApplying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs border border-zinc-700 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.resetChanges}</span>
            </button>
          )}

          {characters.length > 0 && (
            <button
              onClick={handleApplyAll}
              disabled={isApplying}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-600 hover:to-orange-700 text-zinc-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isApplying ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-950" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{t.applyChanges}</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Update Summary Notification */}
      {lastSummary && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/70 text-emerald-200 text-xs flex items-start justify-between gap-3 shadow-md animate-fadeIn">
          <div className="space-y-1">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{t.charactersReplacedSuccess}</span>
            </div>
            <p className="text-zinc-200 font-medium">
              {lastSummary.charactersReplacedCount} characters replaced · {lastSummary.affectedSceneNumbers.length} scene prompts updated
            </p>
          </div>
        </div>
      )}

      {/* Preservation Settings Bar */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            {t.preserveOriginal}
          </span>
          <span className="text-[11px] text-zinc-500 hidden md:inline">•</span>
          <span className="text-[11px] text-zinc-400 hidden md:inline">
            Keep character attributes intact during replacements
          </span>
        </div>

        <div className="grid grid-cols-3 sm:flex items-center gap-2 text-xs text-zinc-300">
          <label className="flex items-center justify-center gap-1.5 cursor-pointer select-none bg-zinc-900 py-1.5 px-3 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
            <input
              type="checkbox"
              checked={options.keep_head}
              onChange={(e) => {
                setOptions({ ...options, keep_head: e.target.checked });
                setHasUserMadeChanges(true);
              }}
              className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500 bg-zinc-950"
            />
            <span className="font-semibold text-xs">Head</span>
          </label>

          <label className="flex items-center justify-center gap-1.5 cursor-pointer select-none bg-zinc-900 py-1.5 px-3 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
            <input
              type="checkbox"
              checked={options.keep_clothing}
              onChange={(e) => {
                setOptions({ ...options, keep_clothing: e.target.checked });
                setHasUserMadeChanges(true);
              }}
              className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500 bg-zinc-950"
            />
            <span className="font-semibold text-xs">Clothing</span>
          </label>

          <label className="flex items-center justify-center gap-1.5 cursor-pointer select-none bg-zinc-900 py-1.5 px-3 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
            <input
              type="checkbox"
              checked={options.keep_body}
              onChange={(e) => {
                setOptions({ ...options, keep_body: e.target.checked });
                setHasUserMadeChanges(true);
              }}
              className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500 bg-zinc-950"
            />
            <span className="font-semibold text-xs">Body</span>
          </label>
        </div>
      </div>

      {/* Replacement Rows per Character */}
      <div className="space-y-3">
        {characters.map((char) => {
          const currentRep =
            selectedReplacements[char.id] || getDefaultPresetForCharacter(char);
          const isDropdownOpen = dropdownOpenCharId === char.id;
          const searchQuery = searchQueries[char.id] || '';

          const filteredPresets = FRUIT_PRESETS.filter((p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
          );

          const filteredCustoms = customCharacters.filter((cc) =>
            cc.name.toLowerCase().includes(searchQuery.toLowerCase())
          );

          return (
            <div
              key={char.id}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3 relative"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Original Character Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-base shrink-0">
                    👤
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm truncate">
                        {char.name}
                      </h4>
                      {char.original_name && char.original_name !== char.name && (
                        <span className="text-[10px] text-amber-400 font-medium">
                          (Orig: {char.original_name})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 font-medium">
                      Appears in {char.scenesCount || 1} scenes
                    </p>
                  </div>
                </div>

                {/* Replacement Target Selector & Details */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <button
                      type="button"
                      onClick={() => setDropdownOpenCharId(isDropdownOpen ? null : char.id)}
                      className="w-full px-3 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 rounded-xl text-xs font-semibold text-white flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span>{currentRep.emoji || '👤'}</span>
                        <span className="truncate">{currentRep.name}</span>
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </button>

                    {/* Searchable Dropdown Popup */}
                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 sm:right-auto sm:w-72 mt-1 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-2.5 z-30 space-y-2 animate-fadeIn">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            placeholder={t.searchReplacement}
                            value={searchQuery}
                            onChange={(e) =>
                              setSearchQueries({ ...searchQueries, [char.id]: e.target.value })
                            }
                            className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                            autoFocus
                          />
                        </div>

                        <div className="max-h-52 overflow-y-auto space-y-2">
                          {/* Presets */}
                          <div>
                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              Preset Characters
                            </div>
                            {filteredPresets.map((preset) => (
                              <button
                                key={preset.name}
                                onClick={() => handleSelectPreset(char.id, preset)}
                                className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <span>{preset.emoji}</span>
                                <span className="font-medium">{preset.name}</span>
                              </button>
                            ))}
                          </div>

                          {/* Custom Characters List */}
                          {customCharacters.length > 0 && (
                            <div className="pt-1 border-t border-zinc-900">
                              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                                Custom Characters
                              </div>
                              {filteredCustoms.map((cc) => (
                                <button
                                  key={cc.id}
                                  onClick={() => handleSelectCustomChar(char.id, cc)}
                                  className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs text-amber-200 hover:bg-zinc-900 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <span>👤</span>
                                  <span className="font-semibold">{cc.name}</span>
                                  <span className="text-[10px] text-zinc-500 ml-auto">({cc.type})</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-zinc-950">
                          <button
                            onClick={() => handleOpenCustomModal(char.id)}
                            className="w-full px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Custom Character</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveSettingsCharId(
                        activeSettingsCharId === char.id ? null : char.id
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.details}</span>
                  </button>
                </div>
              </div>

              {/* Detailed Specs (Collapsible) */}
              {activeSettingsCharId === char.id && (
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3 text-xs animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="font-bold text-white text-sm">
                      {currentRep.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {currentRep.custom ? 'Custom Character' : 'Preset'}
                    </span>
                  </div>

                  {currentRep.custom ? (
                    <div className="space-y-2.5 text-zinc-300">
                      <div>
                        <span className="text-zinc-500 font-semibold block">Character Type:</span>
                        <p className="font-medium text-white">{currentRep.fruit_type || 'Human'}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500 font-semibold block">Description:</span>
                        <p className="font-medium text-zinc-200 leading-relaxed bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                          {currentRep.originalDescription || currentRep.promptDescription || currentRep.head}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-zinc-300">
                      <div>
                        <span className="text-zinc-400">Character Type:</span>
                        <p className="text-white font-medium">{currentRep.fruit_type}</p>
                      </div>
                      <div>
                        <span className="text-zinc-400">Head Appearance:</span>
                        <p className="text-white font-medium">{currentRep.head}</p>
                      </div>
                      <div>
                        <span className="text-zinc-400">Skin Texture:</span>
                        <p className="text-white font-medium">{currentRep.texture}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setActiveSettingsCharId(null)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CUSTOM CHARACTER CREATION MODAL */}
      {customModalCharId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>👤</span>
                <span>Custom Character</span>
              </h3>
              <button
                onClick={() => setCustomModalCharId(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold block">Character Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mya Mya, Robot X, Tiger Man"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold block">Character Description (Myanmar or English)</label>
                <textarea
                  rows={4}
                  placeholder="e.g. အသက် ၂၅ နှစ်အရွယ် မြန်မာအမျိုးသားတစ်ယောက်၊ ဆံပင်အနက်ရောင်တိုတို၊ အဖြူရောင်တီရှပ်နဲ့ ဂျင်းဘောင်းဘီ ဝတ်ထားသည်။ (or English description)"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold block">Character Type</label>
                <input
                  type="text"
                  placeholder="e.g. Human, Robot, Animal, Fantasy, Monster"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setCustomModalCharId(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomCharacter}
                disabled={isCreatingCustom}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-zinc-950 font-bold text-xs shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isCreatingCustom && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Use Character</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

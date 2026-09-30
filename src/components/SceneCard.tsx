import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Video,
  Image as ImageIcon,
  Users,
  RefreshCw,
  Sparkles,
  MapPin,
  Activity,
  Smile,
  MessageSquare,
  Camera,
  Edit2,
  Save,
  Clock,
  Layers,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { CharacterItem, DialogueItem, SceneItem } from '../types';
import { copyToClipboard } from '../utils/exportUtils';
import { generateCharacterImage } from '../services/api';
import { Language, translations } from '../utils/i18n';

const getFruitEmoji = (name?: any) => {
  if (typeof name !== 'string') return '🍎';
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

interface SceneCardProps {
  scene: SceneItem;
  totalScenes: number;
  charactersInBible: CharacterItem[];
  apiKey: string;
  aspectRatio: string;
  onUpdateScene: (sceneNumber: number, updated: Partial<SceneItem>) => void;
  onRegenerateScene: (scene: SceneItem) => Promise<void>;
  isRegenerating?: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  onGoToPrevious?: () => void;
  onGoToNext?: () => void;
  language: Language;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  totalScenes,
  charactersInBible,
  apiKey,
  aspectRatio,
  onUpdateScene,
  onRegenerateScene,
  isRegenerating = false,
  isOpen,
  onToggleOpen,
  onGoToPrevious,
  onGoToNext,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'video_prompt' | 'character_image' | 'dialogue'>('overview');
  const [copiedType, setCopiedType] = useState<'video' | 'image' | 'dialogue' | null>(null);

  // Inline editing state
  const [editedVideoPrompt, setEditedVideoPrompt] = useState(scene.video_prompt);
  const [editedImagePrompt, setEditedImagePrompt] = useState(scene.character_image_prompt);

  const t = translations[language];

  useEffect(() => {
    setEditedVideoPrompt(scene.video_prompt);
  }, [scene.video_prompt]);

  useEffect(() => {
    setEditedImagePrompt(scene.character_image_prompt);
  }, [scene.character_image_prompt]);

  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [generatedImgUrl, setGeneratedImgUrl] = useState<string | null>(
    scene.generated_image_url || null
  );
  const [imageGenMessage, setImageGenMessage] = useState<string | null>(null);

  const handleCopy = async (text: string, type: 'video' | 'image' | 'dialogue') => {
    await copyToClipboard(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleGenerateImage = async () => {
    if (!apiKey) {
      setImageGenMessage('Please add your Gemini API key in API Settings first.');
      return;
    }

    setIsGeneratingImg(true);
    setImageGenMessage(null);

    try {
      const result = await generateCharacterImage({
        apiKey,
        prompt: scene.character_image_prompt,
        aspectRatio,
      });

      if (result.success && result.imageUrl) {
        setGeneratedImgUrl(result.imageUrl);
        onUpdateScene(scene.scene_number, { generated_image_url: result.imageUrl });
      } else {
        setImageGenMessage(
          result.message || 'Character Image Generation is not available with current configuration.'
        );
      }
    } catch (err: any) {
      setImageGenMessage('Character Image Generation failed.');
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const sceneNumberFormatted = `Scene ${String(scene.scene_number).padStart(2, '0')}`;
  const timeRange = scene.time || scene.duration || '00:00 – 00:08';
  const timeAndMeta = scene.time ? `${timeRange} • ${scene.time}` : timeRange;
  const charListString = scene.characters && scene.characters.length > 0 ? scene.characters.join(', ') : 'Characters';
  const shortDesc = scene.action || scene.emotion || 'Scene action description...';

  return (
    <div className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/30 rounded-2xl overflow-hidden shadow-xl transition-all duration-300">
      {/* Collapsed Header / Accordion Trigger */}
      <div
        onClick={onToggleOpen}
        className="p-3.5 sm:p-5 bg-zinc-900 hover:bg-zinc-850 cursor-pointer flex items-center justify-between gap-3 border-b border-zinc-800 select-none transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-xs sm:text-sm text-amber-400 font-mono shrink-0 shadow-sm">
            {String(scene.scene_number).padStart(2, '0')}
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                {sceneNumberFormatted}
              </span>
              <span className="text-[11px] sm:text-xs text-zinc-400 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
                {timeAndMeta}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 truncate">
              <strong className="text-zinc-300">{t.characters}:</strong> {charListString}
            </p>
            <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
              {shortDesc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
            ✓
          </span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-3.5 sm:p-6 space-y-5 bg-zinc-950/90 animate-fadeIn">
          {/* Scene Navigation & Counter */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 text-xs">
            <span className="font-mono text-zinc-400">
              {t.sceneCountOf.replace('{current}', String(scene.scene_number)).replace('{total}', String(totalScenes))}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGoToPrevious?.();
                }}
                disabled={!onGoToPrevious}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span className="hidden sm:inline">{t.previousScene}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGoToNext?.();
                }}
                disabled={!onGoToNext}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <span className="hidden sm:inline">{t.nextScene}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Prompt Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-zinc-800 scrollbar-none">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {t.overview}
            </button>

            <button
              onClick={() => setActiveTab('video_prompt')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'video_prompt'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {t.videoPromptTab}
            </button>

            <button
              onClick={() => setActiveTab('character_image')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'character_image'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {t.characterImageTab}
            </button>

            <button
              onClick={() => setActiveTab('dialogue')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'dialogue'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {t.dialogueTab}
            </button>
          </div>

          {/* Tab Content 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t.action}</span>
                  <p className="text-zinc-200 leading-relaxed text-xs">{scene.action || 'N/A'}</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t.characters}</span>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {scene.characters && scene.characters.length > 0 ? (
                      scene.characters.map((charName, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-lg bg-zinc-800 text-amber-300 text-xs font-semibold">
                          {getFruitEmoji(charName)} {charName}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-500">None</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Emotion</span>
                  <p className="text-zinc-200 text-xs">{scene.emotion || 'N/A'}</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t.camera}</span>
                  <p className="text-zinc-200 text-xs">{scene.camera || 'N/A'}</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t.lighting}</span>
                  <p className="text-zinc-200 text-xs">{scene.lighting || 'N/A'}</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t.environment}</span>
                  <p className="text-zinc-200 text-xs">{scene.environment || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Video Prompt */}
          {activeTab === 'video_prompt' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {t.aiVideoPrompt}
                </span>
                <button
                  onClick={() => handleCopy(scene.video_prompt, 'video')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {copiedType === 'video' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'video' ? t.copied : t.copyPrompt}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-200 leading-relaxed select-text shadow-inner">
                {scene.video_prompt}
              </div>
            </div>
          )}

          {/* Tab Content 3: Character Image Prompt */}
          {activeTab === 'character_image' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {t.characterImagePrompt}
                </span>
                <button
                  onClick={() => handleCopy(scene.character_image_prompt, 'image')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {copiedType === 'image' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'image' ? t.copied : t.copyPrompt}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-200 leading-relaxed select-text shadow-inner">
                {scene.character_image_prompt}
              </div>
            </div>
          )}

          {/* Tab Content 4: Dialogue */}
          {activeTab === 'dialogue' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                {t.dialogue}
              </span>
              <div className="space-y-2">
                {scene.dialogue && scene.dialogue.length > 0 ? (
                  scene.dialogue.map((d, i) => {
                    const textContent = d.myanmar || d.original || '';
                    return (
                      <div key={i} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold text-amber-400 block mb-0.5">
                            {d.speaker}:
                          </span>
                          <p className="text-xs sm:text-sm text-zinc-200 font-medium">
                            &quot;{textContent}&quot;
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy(`${d.speaker}: ${textContent}`, 'dialogue')}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0"
                          title={t.copyPrompt}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-zinc-500 italic">No dialogue in this scene.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

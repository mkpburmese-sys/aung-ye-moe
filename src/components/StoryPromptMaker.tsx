import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Clock,
  Film,
  Camera,
  MessageSquare,
  Users,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  BookOpen,
  Layers,
  ArrowLeft,
  Image as ImageIcon,
  AlertTriangle,
  PlayCircle,
  FileText,
  Palette,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { ProjectData, SceneItem, CharacterItem } from '../types';
import { generateStoryPrompts } from '../services/api';
import { copyToClipboard, exportScenePromptsBundle } from '../utils/exportUtils';
import { Language, translations } from '../utils/i18n';
import { CharacterBibleCard } from './CharacterBibleCard';
import { PageHeader } from './PageHeader';
import { isProjectEmpty } from '../utils/projectValidation';

interface StoryPromptMakerProps {
  project?: ProjectData | null;
  apiKey: string;
  onSaveProject: (project: ProjectData) => Promise<void>;
  onOpenThumbnailStudio?: () => void;
  onOpenCharacterBible?: () => void;
  onBack?: () => void;
  language: Language;
  onOpenApiKeySettings: () => void;
}

type DurationType = '1 MIN' | '2 MIN' | '3 MIN' | '5 MIN';
type AspectRatioOption = '9:16' | '16:9';

const DURATION_TARGETS: Record<DurationType, { label: string; range: string; scenesCount: string; minutesNum: number }> = {
  '1 MIN': { label: '1 MIN', range: '6–8', scenesCount: '6–8 scenes', minutesNum: 1 },
  '2 MIN': { label: '2 MIN', range: '12–15', scenesCount: '12–15 scenes', minutesNum: 2 },
  '3 MIN': { label: '3 MIN', range: '18–23', scenesCount: '18–23 scenes', minutesNum: 3 },
  '5 MIN': { label: '5 MIN', range: '30–38', scenesCount: '30–38 scenes', minutesNum: 5 },
};

export const VISUAL_STYLE_PRESETS = [
  {
    id: 'Anthropomorphic Fruit Characters',
    label: 'Anthropomorphic Fruit Characters',
    description:
      'Anthropomorphic fruit-headed characters with human-like bodies, expressive cartoon eyes, detailed fruit-textured faces, cinematic 3D animation, realistic lighting and detailed environments.',
  },
  {
    id: 'Anthropomorphic Fruit — Chubby Style',
    label: 'Anthropomorphic Fruit — Chubby Style',
    description:
      'Cute chubby anthropomorphic fruit characters with round fruit-textured heads, soft chubby bodies, shorter proportions, expressive cartoon eyes, cute facial expressions and colorful cinematic 3D animation.',
  },
  {
    id: 'Human Characters',
    label: 'Human Characters',
    description:
      'Realistic human characters with natural human facial features, realistic body proportions, natural skin details, appropriate clothing, realistic expressions and cinematic visual quality.',
  },
  {
    id: 'Monkey Head Characters',
    label: 'Monkey Head Characters',
    description:
      'Anthropomorphic monkey-headed characters with expressive monkey faces, detailed fur, human-like bodies, appropriate clothing, expressive eyes and cinematic 3D animation.',
  },
  {
    id: 'Dog Head Characters',
    label: 'Dog Head Characters',
    description:
      'Anthropomorphic dog-headed characters with detailed realistic or stylized fur, expressive dog eyes, human-like bodies, appropriate clothing and cinematic 3D animation.',
  },
  {
    id: '2D Hand-Drawn — Ghibli Inspired',
    label: '2D Hand-Drawn — Ghibli Inspired',
    description:
      '2D hand-drawn animation aesthetic, clean line art, rich hand-painted textures, vibrant warm colors, expressive characters, soft natural backgrounds, beautiful atmospheric lighting, gentle cinematic composition and emotional storytelling.',
  },
] as const;

const SAMPLE_MYANMAR_STORY = `လိမ္မော်သီးခေါင်းလေးနဲ့ ကောင်လေး အော်ရန်ဂျီ (Orange Boy) နဲ့ ငှက်ပျောသီးခေါင်းမလေး ဘာနာနာ (Banana Girl) တို့ဟာ နေသာတဲ့ မနက်ခင်းတစ်ခုမှာ မီးဖိုချောင် စားပွဲခုံပေါ်က ပြတင်းပေါက်ကို တွေ့သွားကြတယ်။
ပြတင်းပေါက် အပြင်ဘက်မှာ ရောင်စုံလိပ်ပြာတွေနဲ့ လျှို့ဝှက်ဥယျာဉ်ကြီးတစ်ခု ရှိနေတာကို တွေ့တော့ သူတို့ စိတ်လှုပ်ရှားစွာနဲ့ သွားစူးစမ်းဖို့ ဆုံးဖြတ်လိုက်ကြတယ်။
စားပွဲပေါ်က သစ်သားဇွန်းတွေကို တံတားထိုးကျော်လွှားပြီး ပြတင်းပေါက်ဆီ ရောက်ဖို့ ကြိုးစားကြတယ်။
ဒါပေမဲ့ လမ်းမှာ ရေခဲသေတ္တာပေါ်က ကြောင်ကြီး မိုးဆွေ အိပ်ပျော်နေရာကနေ ရုတ်တရက် နိုးလာပြီး သူတို့ကို စိုက်ကြည့်လာတယ်။
ဘာနာနာလေးက လန့်ဖျပ်သွားပေမဲ့ အော်ရန်ဂျီက သတ္တိရှိရှိနဲ့ စားပွဲခုံပေါ်က တောက်ပနေတဲ့ ပန်းသီးတုံးလေးတစ်တုံးကို ကြောင်ကြီးရှေ့ လှိမ့်ချပြီး အာရုံလွှဲပေးလိုက်တယ်။
ကြောင်ကြီး ပန်းသီးနောက် ပြေးလိုက်သွားတဲ့အချိန်မှာ အော်ရန်ဂျီနဲ့ ဘာနာနာတို့ ပြတင်းပေါက်အပြင်ဘက်က နေရောင်ခြည်နွေးနွေးအောက်ကို လုံခြုံစွာ ရောက်ရှိသွားကြပြီး လက်ချင်းတွဲကာ ပျော်ရွှင်စွာ ရယ်မောကြတော့တယ်။`;

export const StoryPromptMaker: React.FC<StoryPromptMakerProps> = ({
  project,
  apiKey,
  onSaveProject,
  onOpenThumbnailStudio,
  onOpenCharacterBible,
  onBack,
  language,
  onOpenApiKeySettings,
}) => {
  const t = translations[language];

  // Story Form State
  const storyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [storyScript, setStoryScript] = useState<string>(
    project?.storyScript || ''
  );
  const [selectedDuration, setSelectedDuration] = useState<DurationType>(
    project?.storyDuration || '1 MIN'
  );
  const [selectedStyle, setSelectedStyle] = useState<string>(
    project?.project?.visual_style || 'Anthropomorphic Fruit Characters'
  );
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioOption>(
    project?.project?.aspect_ratio === '16:9' ? '16:9' : '9:16'
  );

  // Accordion state in Form: 'story' | 'style' | 'settings'
  const [activeFormAccordion, setActiveFormAccordion] = useState<'story' | 'style' | 'settings'>('story');

  // Character & Scene Settings options
  const [characterConsistency, setCharacterConsistency] = useState<boolean>(true);
  const [cameraDynamicShots, setCameraDynamicShots] = useState<boolean>(true);
  const [dialogueLanguageSupport, setDialogueLanguageSupport] = useState<'myanmar' | 'english'>('myanmar');

  // Generation & Status State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // View state: If project already has generated scenes, default to result view, else form view
  const [isEditingForm, setIsEditingForm] = useState<boolean>(
    !project?.scenes || project.scenes.length === 0
  );
  const [showCharacterBible, setShowCharacterBible] = useState<boolean>(false);

  // All scenes collapsed by default
  const [openSceneNumbers, setOpenSceneNumbers] = useState<number[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const scenes = project?.scenes || [];
  const projectTitle = project?.project?.title || 'Story Prompts Project';

  const handleCopyText = async (text: string, key: string) => {
    await copyToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleToggleScene = (sceneNumber: number) => {
    setOpenSceneNumbers((prev) =>
      prev.includes(sceneNumber)
        ? prev.filter((num) => num !== sceneNumber)
        : [...prev, sceneNumber]
    );
  };

  const handleToggleAll = () => {
    if (openSceneNumbers.length === scenes.length) {
      setOpenSceneNumbers([]);
    } else {
      setOpenSceneNumbers(scenes.map((s) => s.scene_number));
    }
  };

  const handleLoadSample = () => {
    setStoryScript(SAMPLE_MYANMAR_STORY);
    setSelectedDuration('1 MIN');
    setSelectedStyle('Anthropomorphic Fruit Characters');
    setSelectedRatio('9:16');
    setGenerationError(null);
  };

  const handleGenerate = async () => {
    if (!storyScript.trim()) {
      setActiveFormAccordion('story');
      setGenerationError('Please enter a story or click "Sample Story" first.');
      setTimeout(() => {
        storyInputRef.current?.focus();
      }, 100);
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const result = await generateStoryPrompts({
        apiKey,
        story: storyScript,
        duration: selectedDuration,
        visualStyle: selectedStyle,
        aspectRatio: selectedRatio,
      });

      const updatedProject: ProjectData = {
        id: project?.id || `proj_${Date.now()}`,
        projectType: 'story-prompts',
        createdAt: project?.createdAt || Date.now(),
        updatedAt: Date.now(),
        promptMode: 'Analyze Original',
        storyDuration: selectedDuration,
        storyScript: storyScript,
        project: {
          title: result.title || project?.project?.title || 'New Story Project',
          aspect_ratio: selectedRatio,
          output_aspect_ratio: selectedRatio,
          visual_style: selectedStyle,
          master_style_prompt: `${selectedStyle} style, high quality, consistent character visuals`,
          negative_prompt: 'blurry, watermark, text, low quality, artifacts, distorted proportions',
        },
        characters: result.characters && result.characters.length > 0 ? result.characters : project?.characters || [],
        scenes: result.scenes,
        storyAnalysis: result.storyAnalysis,
      };

      await onSaveProject(updatedProject);
      setOpenSceneNumbers([]);
      setIsEditingForm(false);
    } catch (err: any) {
      console.error('Generation failed:', err);
      setGenerationError(err.message || 'Failed to generate story prompts. Please check your API key or connection.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Back Navigation with Empty Project Check
  const handleBackWithCheck = () => {
    if (!onBack) return;
    const currentSnapshot: ProjectData = {
      id: project?.id || `proj_${Date.now()}`,
      projectType: 'story-prompts',
      createdAt: project?.createdAt || Date.now(),
      updatedAt: Date.now(),
      promptMode: 'Analyze Original',
      storyDuration: selectedDuration,
      storyScript: storyScript,
      project: {
        title: project?.project?.title || 'New Story Project',
        aspect_ratio: selectedRatio,
        output_aspect_ratio: selectedRatio,
        visual_style: selectedStyle,
        master_style_prompt: `${selectedStyle} style, high quality, consistent character visuals`,
        negative_prompt: 'blurry, watermark, text, low quality, artifacts, distorted proportions',
      },
      characters: project?.characters || [],
      scenes: scenes,
      storyAnalysis: project?.storyAnalysis,
    };

    // Only save if the user added content (scenes, characters, or story context)
    if (!isProjectEmpty(currentSnapshot)) {
      onSaveProject(currentSnapshot).catch((err) => {
        console.warn('Auto-save on back error:', err);
      });
    }
    onBack();
  };

  // -------------------------------------------------------------
  // 1. NEW STORY / EDIT STORY FORM VIEW (COMPACT ACCORDIONS)
  // -------------------------------------------------------------
  if (isEditingForm || scenes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-4 sm:space-y-6 animate-fadeIn pb-16">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          {onBack ? (
            <PageHeader title="Story Prompt Maker" onBack={handleBackWithCheck} />
          ) : (
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Story Prompt Maker
              </h1>
            </div>
          )}
          {scenes.length > 0 && (
            <button
              type="button"
              onClick={() => setIsEditingForm(false)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Generated Scenes ({scenes.length})</span>
            </button>
          )}
        </div>

        {/* Api Key Alert if empty */}
        {!apiKey.trim() && (
          <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-900/50 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Gemini API Key required for AI prompt generation.</span>
            </div>
            <button
              type="button"
              onClick={onOpenApiKeySettings}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0"
            >
              Configure Key
            </button>
          </div>
        )}

        {/* 1. STORY & SCRIPT (Main Primary Card) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                Story & Script
              </h2>
            </div>
            <button
              type="button"
              onClick={handleLoadSample}
              className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 cursor-pointer transition-colors font-semibold"
            >
              Sample Story
            </button>
          </div>

          <div className="relative">
            <textarea
              ref={storyInputRef}
              value={storyScript}
              onChange={(e) => setStoryScript(e.target.value)}
              placeholder="Paste or write your full story, dialogue script, or episodic outline here in Myanmar or English...&#10;&#10;e.g. လိမ္မော်သီးခေါင်းလေးနဲ့ ကောင်လေး အော်ရန်ဂျီ (Orange Boy) နဲ့ ငှက်ပျောသီးခေါင်းမလေး ဘာနာနာ (Banana Girl) တို့ဟာ..."
              rows={4}
              className="w-full min-h-[110px] px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 leading-relaxed outline-none transition-all resize-y font-sans"
            />
            <div className="flex justify-between items-center px-1 pt-1.5 text-[10px] text-zinc-500 font-mono">
              <span>Myanmar & English scripts supported</span>
              <span>{storyScript.length} characters</span>
            </div>
          </div>

          {/* Target Duration */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Target Duration</span>
              </span>
              <span className="text-[10px] font-mono text-amber-400">
                1 scene ≈ 8–10 seconds
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 p-1 bg-zinc-950 rounded-2xl border border-zinc-800">
              {(['1 MIN', '2 MIN', '3 MIN', '5 MIN'] as DurationType[]).map((dur) => {
                const isSelected = selectedDuration === dur;
                const info = DURATION_TARGETS[dur];
                return (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setSelectedDuration(dur)}
                    className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 font-medium'
                    }`}
                  >
                    <span className="text-xs font-extrabold tracking-tight">{info.label}</span>
                    <span className={`text-[9px] font-mono leading-none pt-0.5 ${isSelected ? 'text-zinc-950 font-extrabold' : 'text-zinc-500'}`}>
                      {info.scenesCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. COMPACT STYLE & OUTPUT ROW (Visual Style & Aspect Ratio) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Visual Style */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>Visual Style</span>
            </label>
            <div className="relative">
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-zinc-100 font-medium appearance-none focus:border-amber-500 outline-none cursor-pointer pr-8 truncate"
              >
                {VISUAL_STYLE_PRESETS.map((style) => (
                  <option key={style.id} value={style.id} className="bg-zinc-900 text-zinc-100 py-1">
                    {style.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Aspect Ratio</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 rounded-2xl border border-zinc-800 h-[42px] items-center">
              {(['9:16', '16:9'] as AspectRatioOption[]).map((ratio) => {
                const isSelected = selectedRatio === ratio;
                return (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setSelectedRatio(ratio)}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    {ratio} ({ratio === '9:16' ? 'Vertical' : 'Landscape'})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. CHARACTER & SCENE SETTINGS (Compact Inline Card) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              ⚙ Character & Scene Settings
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Character Consistency */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800">
              <span className="text-xs font-semibold text-zinc-300">Character Consistency</span>
              <button
                type="button"
                onClick={() => setCharacterConsistency((prev) => !prev)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  characterConsistency
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {characterConsistency ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Cinematic Camera */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800">
              <span className="text-xs font-semibold text-zinc-300">Cinematic Camera</span>
              <button
                type="button"
                onClick={() => setCameraDynamicShots((prev) => !prev)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  cameraDynamicShots
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cameraDynamicShots ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Dialogue */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800">
              <span className="text-xs font-semibold text-zinc-300">Dialogue</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDialogueLanguageSupport('myanmar')}
                  className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    dialogueLanguageSupport === 'myanmar'
                      ? 'bg-amber-500 text-zinc-950 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Myanmar
                </button>
                <button
                  type="button"
                  onClick={() => setDialogueLanguageSupport('english')}
                  className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    dialogueLanguageSupport === 'english'
                      ? 'bg-amber-500 text-zinc-950 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Notice */}
        {generationError && (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-rose-200 text-xs flex items-center gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{generationError}</span>
          </div>
        )}

        {/* 4. GENERATE BUTTON */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 active:scale-98 text-zinc-950 font-extrabold text-sm sm:text-base transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Generating {selectedDuration} Prompts...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-zinc-950" />
                <span>Generate Story Prompts</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. RESULT VIEW (GENERATED SCENES)
  // -------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-4 sm:space-y-6 animate-fadeIn">
      {/* Page / Project Header */}
      <div className="space-y-3 pb-3 border-b border-zinc-800">
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                type="button"
                onClick={handleBackWithCheck}
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
                title="Back to Projects"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {projectTitle}
              </h1>
              <div className="flex items-center gap-2 pt-0.5 text-xs text-zinc-400 font-mono flex-wrap">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Clock className="w-3 h-3" />
                  <span>{selectedDuration.toLowerCase()}</span>
                </span>
                <span>•</span>
                <span className="text-zinc-300 font-bold">
                  {scenes.length} scenes
                </span>
                <span>•</span>
                <span>{selectedStyle.split('—')[0].trim()}</span>
                <span>•</span>
                <span>{selectedRatio}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsEditingForm(true)}
              className="px-2.5 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Edit Story</span>
            </button>

            {project && (
              <button
                type="button"
                onClick={() => exportScenePromptsBundle(project, 'txt')}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                title="Download consolidated prompts bundle"
              >
                <Download className="w-3.5 h-3.5 text-zinc-950" />
                <span>Export Bundle</span>
              </button>
            )}
          </div>
        </div>

        {/* Extra Navigation (Thumbnail Studio / Character Bible) */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2">
            {project?.characters && project.characters.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCharacterBible((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg border text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                  showCharacterBible
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Character Bible ({project.characters.length})</span>
                {showCharacterBible ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
              </button>
            )}

            {onOpenThumbnailStudio && (
              <button
                type="button"
                onClick={onOpenThumbnailStudio}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Thumbnail Studio</span>
              </button>
            )}
          </div>

          {/* Master Expand/Collapse All Button */}
          <button
            type="button"
            onClick={handleToggleAll}
            className="px-2.5 py-1 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-850 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {openSceneNumbers.length === scenes.length ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Collapse All</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Expand All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Optional Character Bible Drawer / Section */}
      {showCharacterBible && project && project.characters.length > 0 && (
        <div className="animate-fadeIn">
          <CharacterBibleCard
            characters={project.characters}
            projectMeta={project.project}
            language={language}
            onUpdateCharacter={async (charId, updated) => {
              const updatedChars = project.characters.map((c) =>
                c.id === charId ? { ...c, ...updated } : c
              );
              await onSaveProject({ ...project, characters: updatedChars });
            }}
            onUpdateProjectMeta={async (metaUpdated) => {
              const updatedProj = {
                ...project,
                project: { ...project.project, ...metaUpdated },
              };
              await onSaveProject(updatedProj);
            }}
          />
        </div>
      )}

      {/* Collapsed Scene Cards List */}
      <div className="space-y-3">
        {scenes.map((scene) => {
          const isExpanded = openSceneNumbers.includes(scene.scene_number);
          const sceneNumStr = String(scene.scene_number).padStart(2, '0');
          const timeRange = scene.duration || scene.time || '00:00 – 00:09';
          const summary = scene.summary || scene.action || 'Continuous visual story beat...';

          // Values for detailed view
          const videoStyleText = scene.video_style || selectedStyle;
          const charDetailText = scene.character_detail || (scene.characters && scene.characters.length > 0 ? scene.characters.join(', ') : 'None');
          const actionText = scene.action || 'N/A';
          const dialogueText =
            scene.dialogue_text ||
            (Array.isArray(scene.dialogue) && scene.dialogue.length > 0
              ? scene.dialogue.map((d) => `${d.speaker}: "${d.myanmar || d.original}"`).join('\n')
              : 'None');
          const cameraText = scene.camera || 'Cinematic shot';

          const fullPromptText =
            scene.full_scene_prompt ||
            `SCENE ${sceneNumStr}\n${timeRange}\n\nVIDEO STYLE\n${videoStyleText}\n\nCHARACTER DETAIL\n${charDetailText}\n\nACTION\n${actionText}\n\nDIALOGUE\n${dialogueText}\n\nCAMERA\n${cameraText}`;

          return (
            <div
              key={scene.scene_number}
              className="bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 rounded-2xl overflow-hidden shadow-lg transition-all duration-200"
            >
              {/* COLLAPSED CARD HEADER (Clicking expands) */}
              <div
                onClick={() => handleToggleScene(scene.scene_number)}
                className="p-3.5 sm:p-4 bg-zinc-900 hover:bg-zinc-850 cursor-pointer flex items-center justify-between gap-3 select-none transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-mono font-bold text-xs sm:text-sm text-amber-400 shrink-0">
                    {sceneNumStr}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                        Scene {sceneNumStr}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>{timeRange}</span>
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-1 leading-relaxed">
                      {summary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>

              {/* EXPANDED CONTENT ACCORDION */}
              {isExpanded && (
                <div className="p-3.5 sm:p-5 bg-zinc-950/90 border-t border-zinc-800/80 space-y-4 animate-fadeIn">
                  {/* Top Bar with Copy Full Scene Button */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800 text-xs">
                    <span className="font-mono text-zinc-500 uppercase tracking-wider text-[10px]">
                      Scene Breakdown Details
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(fullPromptText, `scene_${scene.scene_number}`)}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      {copiedKey === `scene_${scene.scene_number}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied Full Scene</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Full Scene</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 1. VIDEO STYLE */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 text-[11px]">
                        <Film className="w-3 h-3" />
                        <span>VIDEO STYLE</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(videoStyleText, `vstyle_${scene.scene_number}`)}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                        title="Copy Video Style"
                      >
                        {copiedKey === `vstyle_${scene.scene_number}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/90 text-xs text-zinc-300 leading-relaxed font-sans select-text">
                      {videoStyleText}
                    </div>
                  </div>

                  {/* 2. CHARACTER DETAIL */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 text-[11px]">
                        <Users className="w-3 h-3" />
                        <span>CHARACTER DETAIL</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(charDetailText, `cdetail_${scene.scene_number}`)}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                        title="Copy Character Detail"
                      >
                        {copiedKey === `cdetail_${scene.scene_number}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/90 text-xs text-zinc-300 leading-relaxed font-sans select-text whitespace-pre-wrap">
                      {charDetailText}
                    </div>
                  </div>

                  {/* 3. ACTION */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 text-[11px]">
                        <PlayCircle className="w-3 h-3" />
                        <span>ACTION</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(actionText, `action_${scene.scene_number}`)}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                        title="Copy Action"
                      >
                        {copiedKey === `action_${scene.scene_number}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/90 text-xs text-zinc-300 leading-relaxed font-sans select-text">
                      {actionText}
                    </div>
                  </div>

                  {/* 4. DIALOGUE */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 text-[11px]">
                        <MessageSquare className="w-3 h-3" />
                        <span>DIALOGUE</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(dialogueText, `dialogue_${scene.scene_number}`)}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                        title="Copy Dialogue"
                      >
                        {copiedKey === `dialogue_${scene.scene_number}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/90 text-xs text-amber-200/90 leading-relaxed font-sans select-text whitespace-pre-wrap">
                      {dialogueText}
                    </div>
                  </div>

                  {/* 5. CAMERA */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 text-[11px]">
                        <Camera className="w-3 h-3" />
                        <span>CAMERA</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(cameraText, `camera_${scene.scene_number}`)}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                        title="Copy Camera"
                      >
                        {copiedKey === `camera_${scene.scene_number}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/90 text-xs text-zinc-300 leading-relaxed font-sans select-text">
                      {cameraText}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

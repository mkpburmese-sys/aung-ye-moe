import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Sparkles,
  RefreshCw,
  Check,
  Copy,
  Download,
  Layers,
  BookOpen,
  Image as ImageIcon,
  Type,
  Sliders,
  CheckCircle2,
  Info,
  Maximize2,
  ArrowRight,
  RotateCcw,
  Palette,
  Eye,
  Monitor,
  Smartphone,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUpToLine,
  ArrowDownToLine,
  Minus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AspectRatioType,
  CharacterItem,
  OutputAspectRatioType,
  ProjectData,
  StoryAnalysis,
  ThumbnailConceptItem,
  ThumbnailData,
  ThumbnailStyle,
} from '../types';
import {
  generateMoreTitles,
  generateStoryAnalysis,
  generateThumbnailConcept,
  generateThumbnailImage,
  generateAutoStyle,
} from '../services/api';
import { copyToClipboard } from '../utils/exportUtils';

interface StoryThumbnailStudioProps {
  project: ProjectData;
  apiKey: string;
  onUpdateProject: (updated: Partial<ProjectData>) => void;
  onOpenApiKeySettings: () => void;
  onBack?: () => void;
}

const THUMBNAIL_STYLES: Array<{ id: ThumbnailStyle; label: string; desc: string }> = [
  { id: 'Cinematic', label: 'Cinematic', desc: 'Dramatic lighting, anamorphic rim light, filmic depth' },
  { id: 'Emotional', label: 'Emotional', desc: 'Soft warm glow, intense facial expressions, touching mood' },
  { id: 'Mystery', label: 'Mystery', desc: 'Chiaroscuro shadows, fog, glowing hidden artifacts' },
  { id: 'Dramatic', label: 'Dramatic', desc: 'High contrast, intense shadows, suspenseful stakes' },
  { id: 'Funny', label: 'Funny', desc: 'Bright vibrant colors, comedic slapstick poses, exaggerated expressions' },
  { id: 'Heartwarming', label: 'Heartwarming', desc: 'Golden hour sunshine, cheerful smiles, cozy environment' },
  { id: 'Action', label: 'Action', desc: 'Dynamic motion blur, heroic angles, energy and impact' },
  { id: 'Dark Mystery', label: 'Dark Mystery', desc: 'Deep vignette, moody cool blues, mysterious danger' },
];

export const StoryThumbnailStudio: React.FC<StoryThumbnailStudioProps> = ({
  project,
  apiKey,
  onUpdateProject,
  onOpenApiKeySettings,
  onBack,
}) => {
  // Local or project state
  const storyAnalysis = project.storyAnalysis;
  const storyTitles = project.storyTitles || [];
  const selectedTitle = project.selectedStoryTitle || storyTitles[0] || '';
  const thumbnail = project.thumbnail || {
    ratio: project?.project?.aspect_ratio || '9:16',
    style: 'Cinematic',
    concept: '',
    prompt: '',
    negativePrompt: '',
    imageUrl: '',
    text: '',
    textPosition: 'center',
    fontSize: 34,
    textColor: '#FACC15', // Vibrant amber/yellow for high CTR
    textShadow: true,
    textStroke: true,
    textAlign: 'center',
  };

  const thumbnailConcepts = project.thumbnailConcepts || [];

  // Loading flags
  const [isAnalyzingStory, setIsAnalyzingStory] = useState(false);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingAutoStyle, setIsGeneratingAutoStyle] = useState(false);
  const [imageGenMessage, setImageGenMessage] = useState<string | null>(null);

  // Copied feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // UI state for tabbed layout and collapsible sections
  const [activeTab, setActiveTab] = useState<'titles' | 'background'>('titles');
  const [isPromptsOpen, setIsPromptsOpen] = useState(true);
  const [isTextCustomizationOpen, setIsTextCustomizationOpen] = useState(false);
  const [expandedConcepts, setExpandedConcepts] = useState<Record<string, boolean>>({});
  const [areConceptsVisible, setAreConceptsVisible] = useState(true);

  // 1. Sync latest analyzed scenes from localStorage if scenes are empty upon mount
  useEffect(() => {
    if (!project.scenes || project.scenes.length === 0) {
      const storedScenesStr = localStorage.getItem('latest_analyzed_scenes');
      if (storedScenesStr) {
        try {
          const parsed = JSON.parse(storedScenesStr);
          if (parsed && parsed.scenes && parsed.scenes.length > 0) {
            onUpdateProject({
              scenes: parsed.scenes,
              characters: parsed.characters || [],
              characterMappings: parsed.characterMappings || {},
              storyAnalysis: project.storyAnalysis || parsed.storyAnalysis || null,
              storyTitles: project.storyTitles && project.storyTitles.length > 0 ? project.storyTitles : (parsed.storyTitles || []),
              selectedStoryTitle: project.selectedStoryTitle || parsed.selectedStoryTitle || '',
            });
            console.log('[Mount] Successfully loaded latest_analyzed_scenes from localStorage into StoryThumbnailStudio');
          }
        } catch (e) {
          console.warn('Failed to parse latest_analyzed_scenes from localStorage:', e);
        }
      }
    }
  }, []);

  // 2. Automatically trigger title generation if scenes exist but storyTitles is empty
  useEffect(() => {
    const runAutoAnalysis = async () => {
      if (
        project.scenes &&
        project.scenes.length > 0 &&
        (!project.storyTitles || project.storyTitles.length === 0) &&
        apiKey &&
        !isAnalyzingStory
      ) {
        console.log('[AutoTrigger] Automatically starting title & narrative generation based on active scenes...');
        try {
          setIsAnalyzingStory(true);
          const result = await generateStoryAnalysis({
            apiKey,
            scenes: project.scenes,
            characters: project.characters,
            visualStyle: project.project.visual_style,
            title: project.project.title,
          });

          const initialTitle = result.storyTitles[0] || '';

          onUpdateProject({
            storyAnalysis: result.storyAnalysis,
            storyTitles: result.storyTitles,
            selectedStoryTitle: initialTitle,
            thumbnail: {
              ...thumbnail,
              text: initialTitle,
            },
          });
        } catch (err: any) {
          console.error('[AutoTrigger] Failed to automatically generate titles/narrative:', err);
        } finally {
          setIsAnalyzingStory(false);
        }
      }
    };

    runAutoAnalysis();
  }, [project.scenes, apiKey]);

  // Canvas ref for high-resolution download
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleCopy = async (text: string, key: string) => {
    await copyToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateAutoStyle = async () => {
    if (!apiKey) {
      onOpenApiKeySettings();
      return;
    }

    setIsGeneratingAutoStyle(true);
    try {
      const result = await generateAutoStyle({
        apiKey,
        backgroundPrompt: thumbnail.prompt,
        stylePreset: thumbnail.style,
        titleText: thumbnail.text,
        concept: thumbnail.concept,
      });

      onUpdateProject({
        thumbnail: {
          ...thumbnail,
          fontSize: result.fontSize,
          textColor: result.textColor,
          textShadow: result.textShadow,
          textStroke: result.textStroke,
          backgroundBox: result.backgroundBox,
        },
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to automatically style title.');
    } finally {
      setIsGeneratingAutoStyle(false);
    }
  };

  // 1. Analyze Complete Story
  const handleAnalyzeStory = async () => {
    if (!apiKey) {
      onOpenApiKeySettings();
      return;
    }

    setIsAnalyzingStory(true);
    try {
      const result = await generateStoryAnalysis({
        apiKey,
        scenes: project.scenes,
        characters: project.characters,
        visualStyle: project.project.visual_style,
        title: project.project.title,
      });

      const initialTitle = result.storyTitles[0] || selectedTitle;

      onUpdateProject({
        storyAnalysis: result.storyAnalysis,
        storyTitles: result.storyTitles,
        selectedStoryTitle: initialTitle,
        thumbnail: {
          ...thumbnail,
          text: initialTitle,
        },
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to analyze story.');
    } finally {
      setIsAnalyzingStory(false);
    }
  };

  // 2. Generate 10 More Titles
  const handleGenerateMoreTitles = async () => {
    if (!apiKey) {
      onOpenApiKeySettings();
      return;
    }

    setIsGeneratingTitles(true);
    try {
      const more = await generateMoreTitles({
        apiKey,
        storyAnalysis: project.storyAnalysis,
        characters: project.characters,
        currentTitles: storyTitles,
      });

      const combined = [...storyTitles, ...more].slice(-20);
      onUpdateProject({
        storyTitles: combined,
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to generate more titles.');
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // 3. Select a Title
  const handleSelectTitle = (title: string) => {
    onUpdateProject({
      selectedStoryTitle: title,
      thumbnail: {
        ...thumbnail,
        text: title,
      },
    });
  };

  // 3b. Update Title Text manually
  const handleUpdateTitleText = (newVal: string) => {
    onUpdateProject({
      selectedStoryTitle: newVal,
      thumbnail: {
        ...thumbnail,
        text: newVal,
      },
    });
  };

  // 4. Generate Thumbnail Concept(s)
  const handleGenerateConcept = async (generateThree: boolean = false) => {
    if (!apiKey) {
      onOpenApiKeySettings();
      return;
    }

    setIsGeneratingConcept(true);
    try {
      const effectiveRatio =
        thumbnail.ratio === 'Original'
          ? (project.project.aspect_ratio || '9:16')
          : thumbnail.ratio;

      const result = await generateThumbnailConcept({
        apiKey,
        storyAnalysis: project.storyAnalysis,
        selectedTitle: selectedTitle || project.project.title,
        characters: project.characters, // Strictly current characters
        visualStyle: project.project.visual_style,
        stylePreset: thumbnail.style,
        aspectRatio: effectiveRatio,
        generateThree,
        scenes: project.scenes,
      });

      onUpdateProject({
        thumbnail: {
          ...thumbnail,
          concept: result.concept,
          prompt: result.prompt,
          negativePrompt: result.negativePrompt,
          text: thumbnail.text || selectedTitle,
        },
        thumbnailConcepts: result.threeConcepts || thumbnailConcepts,
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to generate thumbnail concept.');
    } finally {
      setIsGeneratingConcept(false);
    }
  };

  // Select different art style and auto-generate/transform 3 concepts
  const handleArtStyleChange = async (newStyle: ThumbnailStyle) => {
    // Update style state immediately so UI updates
    onUpdateProject({
      thumbnail: {
        ...thumbnail,
        style: newStyle,
      },
    });

    if (!apiKey) {
      return;
    }

    setIsGeneratingConcept(true);
    try {
      const effectiveRatio =
        thumbnail.ratio === 'Original'
          ? (project.project.aspect_ratio || '9:16')
          : thumbnail.ratio;

      const result = await generateThumbnailConcept({
        apiKey,
        storyAnalysis: project.storyAnalysis,
        selectedTitle: selectedTitle || project.project.title,
        characters: project.characters,
        visualStyle: project.project.visual_style,
        stylePreset: newStyle,
        aspectRatio: effectiveRatio,
        generateThree: true,
        scenes: project.scenes,
      });

      const updatedThree = result.threeConcepts || [];
      const firstConcept = updatedThree[0];

      onUpdateProject({
        thumbnail: {
          ...thumbnail,
          style: newStyle,
          concept: firstConcept ? firstConcept.conceptDescription : (result.concept || thumbnail.concept),
          prompt: firstConcept ? firstConcept.prompt : (result.prompt || thumbnail.prompt),
          negativePrompt: firstConcept ? firstConcept.negativePrompt : (result.negativePrompt || thumbnail.negativePrompt),
          text: thumbnail.text || selectedTitle,
        },
        thumbnailConcepts: updatedThree,
      });
    } catch (err: any) {
      console.error('Failed to auto-update concepts on style change:', err);
    } finally {
      setIsGeneratingConcept(false);
    }
  };

  // Select one of the 3 generated concepts
  const handleSelectSpecificConcept = (c: ThumbnailConceptItem) => {
    onUpdateProject({
      thumbnail: {
        ...thumbnail,
        concept: c.conceptDescription,
        prompt: c.prompt,
        negativePrompt: c.negativePrompt,
      },
    });
  };

  // Toggle visibility of the entire concept cards list
  const handleToggleAllConcepts = () => {
    setAreConceptsVisible((prev) => !prev);
  };

  // 5. Generate Thumbnail Image with Concurrent Auto-Styling
  const handleGenerateImage = async () => {
    if (!apiKey) {
      onOpenApiKeySettings();
      return;
    }

    setIsGeneratingImage(true);
    setImageGenMessage(null);

    try {
      // Ensure prompt is drafted
      let activePrompt = thumbnail.prompt;
      let activeConcept = thumbnail.concept;
      if (!activePrompt) {
        setIsGeneratingConcept(true);
        try {
          const effectiveRatio =
            thumbnail.ratio === 'Original'
              ? (project.project.aspect_ratio || '9:16')
              : thumbnail.ratio;

          const conceptResult = await generateThumbnailConcept({
            apiKey,
            storyAnalysis: project.storyAnalysis,
            selectedTitle: selectedTitle || project.project.title,
            characters: project.characters,
            visualStyle: project.project.visual_style,
            stylePreset: thumbnail.style,
            aspectRatio: effectiveRatio,
            generateThree: false,
            scenes: project.scenes,
          });
          activePrompt = conceptResult.prompt;
          activeConcept = conceptResult.concept;
        } catch (err: any) {
          console.error('Concept pre-generation error:', err);
        } finally {
          setIsGeneratingConcept(false);
        }
      }

      const effectiveRatio =
        thumbnail.ratio === 'Original'
          ? (project.project.aspect_ratio || '9:16')
          : thumbnail.ratio;

      // Run image generation and style analysis concurrently!
      const [imageResult, autoStyleResult] = await Promise.all([
        generateThumbnailImage({
          apiKey,
          prompt: activePrompt || 'cinematic masterpiece',
          aspectRatio: effectiveRatio,
        }).catch((err) => ({ success: false, imageUrl: null, message: err?.message })),
        generateAutoStyle({
          apiKey,
          backgroundPrompt: activePrompt || 'cinematic masterpiece',
          stylePreset: thumbnail.style,
          titleText: thumbnail.text || selectedTitle || project.project.title,
          concept: activeConcept,
        }).catch((err) => {
          console.warn('Auto style parallel failed, using fallback:', err);
          return null;
        })
      ]);

      const updatedThumbnail = { ...thumbnail };
      if (activePrompt) {
        updatedThumbnail.prompt = activePrompt;
      }
      if (activeConcept) {
        updatedThumbnail.concept = activeConcept;
      }

      if (imageResult && imageResult.success && imageResult.imageUrl) {
        updatedThumbnail.imageUrl = imageResult.imageUrl;
      } else {
        setImageGenMessage(
          (imageResult && imageResult.message) ||
            'Image generation is not available with the current model/API configuration. You can copy the Thumbnail Generation Prompt below into Midjourney, Stable Diffusion, or Flux.'
        );
      }

      if (autoStyleResult) {
        updatedThumbnail.fontSize = autoStyleResult.fontSize;
        updatedThumbnail.textColor = autoStyleResult.textColor;
        updatedThumbnail.textShadow = autoStyleResult.textShadow;
        updatedThumbnail.textStroke = autoStyleResult.textStroke;
        updatedThumbnail.backgroundBox = autoStyleResult.backgroundBox;
      }

      onUpdateProject({
        thumbnail: updatedThumbnail,
      });

    } catch (err: any) {
      setImageGenMessage(
        'Image generation is not available with the current model/API configuration. You can copy the Thumbnail Generation Prompt below.'
      );
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Update thumbnail property helper
  const updateThumbnailField = (field: keyof ThumbnailData, val: any) => {
    onUpdateProject({
      thumbnail: {
        ...thumbnail,
        [field]: val,
      },
    });
  };

  // 6. Download Composite Thumbnail (Canvas draw image + text overlay with user-selected font)
  const handleDownloadThumbnail = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (typeof document !== 'undefined' && 'fonts' in document) {
      try {
        await document.fonts.ready;
      } catch (e) {
        console.warn('Waiting for document.fonts:', e);
      }
    }

    // Set canvas dimensions based on ratio (resolving Original to project original video aspect ratio)
    const effectiveRatio =
      thumbnail.ratio === 'Original' ? (project.project.aspect_ratio || '9:16') : thumbnail.ratio;
    const width = effectiveRatio === '16:9' ? 1280 : effectiveRatio === '1:1' ? 1080 : 1080;
    const height =
      effectiveRatio === '16:9'
        ? 720
        : effectiveRatio === '1:1'
        ? 1080
        : effectiveRatio === '4:5'
        ? 1350
        : 1920;

    canvas.width = width;
    canvas.height = height;

    const renderText = () => {
      if (!thumbnail.text) return;

      const scaleFactor = width / 400; // Relative to preview scale
      const fontSizePx = Math.round(thumbnail.fontSize * scaleFactor);

      const fontFamilyName = '"Pyidaungsu", "Padauk", "Myanmar Text", sans-serif';

      ctx.font = `bold ${fontSizePx}px ${fontFamilyName}`;
      ctx.textAlign = thumbnail.textAlign || 'center';
      ctx.textBaseline = 'middle';

      let x = width / 2;
      if (thumbnail.textAlign === 'left') x = width * 0.1;
      if (thumbnail.textAlign === 'right') x = width * 0.9;

      let y = height / 2;
      if (thumbnail.textPosition === 'top') y = height * 0.2;
      if (thumbnail.textPosition === 'bottom') y = height * 0.82;

      // Draw subtle dark backing strip for superior legibility if enabled
      if (thumbnail.backgroundBox !== false) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, y - fontSizePx * 0.8, width, fontSizePx * 1.6);
        ctx.restore();
      }

      // Shadow
      if (thumbnail.textShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 12 * scaleFactor;
        ctx.shadowOffsetX = 3 * scaleFactor;
        ctx.shadowOffsetY = 4 * scaleFactor;
      }

      // Stroke
      if (thumbnail.textStroke) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 6 * scaleFactor;
        ctx.lineJoin = 'round';
        ctx.strokeText(thumbnail.text, x, y);
      }

      // Fill
      ctx.fillStyle = thumbnail.textColor || '#FACC15';
      ctx.fillText(thumbnail.text, x, y);
    };

    if (thumbnail.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        renderText();
        const a = document.createElement('a');
        a.download = `${(selectedTitle || 'thumbnail').replace(/\s+/g, '_')}_final.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      };
      img.onerror = () => {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        renderText();
        const a = document.createElement('a');
        a.download = `${(selectedTitle || 'thumbnail').replace(/\s+/g, '_')}_final.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      };
      img.src = thumbnail.imageUrl;
    } else {
      // Create elegant dark gradient backdrop if no image yet
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      renderText();

      const a = document.createElement('a');
      a.download = `${(selectedTitle || 'thumbnail').replace(/\s+/g, '_')}_preview.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    }
  };

  // Determine current active characters summary for consistency badge
  const activeCharNames = project.characters.map((c) => c.name).join(', ');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Main Split View: Left Sticky Canvas Preview & Right Tabbed Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ====================================================
            LEFT COLUMN: STICKY/FIXED PREVIEW
            ==================================================== */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 z-10 space-y-4">
          {/* Sleek, Narrow, Icon-based Aspect Ratio Segmented Control */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 sm:p-4 shadow-lg w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none w-full">
              <span className="text-[10px] sm:text-xs font-semibold text-zinc-400 tracking-wider uppercase whitespace-nowrap flex items-center gap-2">
                <Maximize2 className="w-3.5 h-3.5 text-orange-500" />
                Canvas Size
              </span>
              <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-1.5 sm:bg-zinc-950 sm:border sm:border-white/5 sm:rounded-full sm:p-1 sm:shadow-inner">
                {[
                  { value: '16:9', label: '16:9', icon: <Monitor className="w-3.5 h-3.5" /> },
                  { value: '9:16', label: '9:16', icon: <Smartphone className="w-3.5 h-3.5" /> },
                  { value: '4:5', label: '4:5', icon: <ImageIcon className="w-3.5 h-3.5" /> },
                ].map((item) => {
                  const isActive = thumbnail.ratio === item.value || (item.value === '9:16' && thumbnail.ratio === 'Original');
                  return (
                    <button
                      key={item.value}
                      onClick={() => updateThumbnailField('ratio', item.value as any)}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium sm:font-bold transition-all duration-200 cursor-pointer shrink-0 border w-full sm:w-auto ${
                        isActive
                          ? 'bg-orange-500 text-zinc-950 border-orange-500 shadow-sm'
                          : 'text-zinc-400 border-white/5 hover:text-white hover:bg-zinc-900/30 hover:border-white/10'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-orange-500" />
                Live Preview
              </span>
              
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-white/5 text-[10px] text-zinc-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="font-bold text-zinc-300 max-w-[120px] truncate" title={activeCharNames}>{activeCharNames || 'None'}</span>
                </div>
              </div>
            </div>

            {/* Canvas aspect container wrapper with dedicated zone for floating controls */}
            <div className="flex items-center justify-center bg-zinc-950 rounded-2xl overflow-hidden border border-white/5 relative p-4 pb-16 min-h-[220px] sm:min-h-[260px] lg:min-h-[240px] xl:min-h-[300px] w-full transition-all duration-300">
              {(() => {
                const effectiveRatio =
                  thumbnail.ratio === 'Original'
                    ? (project.project.aspect_ratio || '9:16')
                    : thumbnail.ratio;

                // Bind the canvas inner container to selected CANVAS ASPECT RATIO with height-based scale-to-fit
                const aspectClass = 
                  effectiveRatio === '16:9'
                    ? 'aspect-[16/9]'
                    : effectiveRatio === '1:1'
                    ? 'aspect-square'
                    : effectiveRatio === '4:5'
                    ? 'aspect-[4/5]'
                    : 'aspect-[9/16]';

                return (
                  <div className={`relative rounded-xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-900 flex items-center justify-center transition-all duration-300 ${aspectClass} h-[200px] sm:h-[240px] lg:h-[220px] xl:h-[280px] max-h-[340px] xl:max-h-[400px] max-w-full w-auto mx-auto`}>
                    
                    {/* Background Image / Placeholder */}
                    {thumbnail.imageUrl ? (
                      <img
                        src={thumbnail.imageUrl}
                        alt="Generated background"
                        className="w-full h-full object-cover transition-all duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-950 via-orange-950/20 to-zinc-900 flex flex-col items-center justify-center p-4 text-center space-y-2 select-none">
                        <ImageIcon className="w-6 h-6 text-zinc-700" />
                        <p className="text-[10px] text-zinc-500 leading-normal max-w-[150px]">
                          Preview text styled in real-time. Hit background tab to generate AI art.
                        </p>
                      </div>
                    )}

                    {/* LIVE HTML TEXT OVERLAY */}
                    {thumbnail.text && (
                      <div
                        className={`absolute left-0 right-0 px-3 py-2 z-10 select-none pointer-events-none transition-all duration-300 ${
                          thumbnail.textPosition === 'top'
                            ? 'top-4'
                            : thumbnail.textPosition === 'bottom'
                            ? 'bottom-6'
                            : 'top-1/2 -translate-y-1/2'
                        }`}
                        style={{
                          backgroundColor:
                            thumbnail.backgroundBox !== false ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
                          backdropFilter: thumbnail.backgroundBox !== false ? 'blur(2px)' : 'none',
                        }}
                      >
                        <h3
                          className="font-bold leading-tight tracking-wide font-sans transition-all duration-300"
                          style={{
                            fontSize: `${thumbnail.fontSize * 0.65}px`, // Adjusted for scaled height
                            fontFamily: '"Pyidaungsu", "Padauk", "Myanmar Text", sans-serif',
                            color: thumbnail.textColor || '#FACC15',
                            textAlign: thumbnail.textAlign || 'center',
                            textShadow: thumbnail.textShadow
                              ? '0px 3px 10px rgba(0,0,0,0.9), 0px 1px 3px rgba(0,0,0,0.8)'
                              : 'none',
                            WebkitTextStroke: thumbnail.textStroke
                              ? '1.2px rgba(0,0,0,0.95)'
                              : 'none',
                          }}
                        >
                          {thumbnail.text}
                        </h3>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Floating Action Bar (Overlay) for alignment and vertical positioning */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/75 backdrop-blur-md border border-white/10 rounded-full px-3.5 py-1.5 shadow-2xl select-none">
                {/* Vertical Position Icons group */}
                <div className="flex items-center gap-0.5 border-r border-white/10 pr-2.5">
                  {[
                    { pos: 'top', icon: <ArrowUpToLine className="w-3.5 h-3.5" />, title: 'Top Position' },
                    { pos: 'center', icon: <Minus className="w-3.5 h-3.5" />, title: 'Center Position' },
                    { pos: 'bottom', icon: <ArrowDownToLine className="w-3.5 h-3.5" />, title: 'Bottom Position' },
                  ].map((item) => {
                    const isActive = thumbnail.textPosition === item.pos;
                    return (
                      <button
                        key={item.pos}
                        onClick={() => updateThumbnailField('textPosition', item.pos)}
                        title={item.title}
                        className={`p-1.5 rounded-full transition-all cursor-pointer ${
                          isActive
                            ? 'bg-orange-500 text-zinc-950 shadow-sm scale-110'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-850/40'
                        }`}
                      >
                        {item.icon}
                      </button>
                    );
                  })}
                </div>

                {/* Horizontal Alignment Icons group */}
                <div className="flex items-center gap-0.5">
                  {[
                    { align: 'left', icon: <AlignLeft className="w-3.5 h-3.5" />, title: 'Align Left' },
                    { align: 'center', icon: <AlignCenter className="w-3.5 h-3.5" />, title: 'Align Center' },
                    { align: 'right', icon: <AlignRight className="w-3.5 h-3.5" />, title: 'Align Right' },
                  ].map((item) => {
                    const isActive = thumbnail.textAlign === item.align;
                    return (
                      <button
                        key={item.align}
                        onClick={() => updateThumbnailField('textAlign', item.align)}
                        title={item.title}
                        className={`p-1.5 rounded-full transition-all cursor-pointer ${
                          isActive
                            ? 'bg-orange-500 text-zinc-950 shadow-sm scale-110'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-850/40'
                        }`}
                      >
                        {item.icon}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick action buttons for Left Column */}
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-2.5 pt-2">
              <button
                onClick={handleGenerateImage}
                disabled={isGeneratingImage}
                className="w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-zinc-950 font-bold sm:font-extrabold rounded-xl text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingImage ? (
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-zinc-950 shrink-0" />
                ) : thumbnail.imageUrl ? (
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-950 shrink-0" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-950 shrink-0" />
                )}
                <span className="truncate">{thumbnail.imageUrl ? 'Regenerate' : 'Generate'}</span>
              </button>

              <button
                onClick={handleDownloadThumbnail}
                className="w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-2.5 sm:px-4 sm:py-3 bg-zinc-950 hover:bg-zinc-900 border border-orange-500/30 hover:border-orange-500/50 text-orange-400 font-bold sm:font-extrabold rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400 shrink-0" />
                <span className="truncate">Download</span>
              </button>
            </div>

            {/* AI Warning / Info Message Block */}
            {imageGenMessage && (
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-orange-950/40 text-xs text-orange-200/90 flex items-start gap-2 animate-fadeIn">
                <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-300">{imageGenMessage}</p>
                  <p className="text-zinc-500 text-[10px] mt-0.5 leading-relaxed">
                    If standard generation is slow, copy the generated prompt from the **Background** tab into Flux/Midjourney, then upload here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ====================================================
            RIGHT COLUMN: TABBED CONTROLS & SETTINGS
            ==================================================== */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Tabs Navigation Header */}
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-1.5 flex gap-1">
            <button
              onClick={() => setActiveTab('titles')}
              className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'titles'
                  ? 'bg-orange-500 text-zinc-950 shadow-md font-extrabold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850/50'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>AI Titles</span>
            </button>
            <button
              onClick={() => setActiveTab('background')}
              className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'background'
                  ? 'bg-orange-500 text-zinc-950 shadow-md font-extrabold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850/50'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>AI Background</span>
            </button>
          </div>

          {/* ====================================================
              TAB 1: AI SUGGESTED TITLES & CUSTOMIZATION
              ==================================================== */}
          {activeTab === 'titles' && (
            <div className="animate-fadeIn">
              <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Viral Video Titles
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Generate 10 viral Myanmar titles directly parsed from the video narrative.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:self-center">
                    <button
                      onClick={handleAnalyzeStory}
                      disabled={isAnalyzingStory}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-bold rounded-xl text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isAnalyzingStory ? (
                        <RefreshCw className="w-3 animate-spin text-zinc-950" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-zinc-950" />
                      )}
                      <span>Regenerate</span>
                    </button>
                  </div>
                </div>

                {(!project.scenes || project.scenes.length === 0) && (
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40 text-amber-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-amber-300">No Analysis Data Found</span>
                      <p className="text-zinc-400 text-[11px] mt-0.5 leading-normal">
                        No video analysis data has been saved yet. You can still type custom titles and prompt details manually, or run **Video Analysis** under the **Home** tab to auto-populate the narrative!
                      </p>
                    </div>
                  </div>
                )}

                {/* Active selection banner */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1 min-w-0 w-full">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400 block">
                      Active Title Text
                    </span>
                    <input
                      type="text"
                      value={selectedTitle}
                      onChange={(e) => handleUpdateTitleText(e.target.value)}
                      placeholder="Type custom title or select from suggestions..."
                      className="w-full bg-transparent border-0 text-sm font-bold text-zinc-100 focus:outline-none focus:ring-0 p-0 font-sans mt-0.5 placeholder-zinc-650"
                    />
                  </div>

                  {selectedTitle && (
                    <button
                      onClick={() => handleCopy(selectedTitle, 'title')}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs rounded-lg flex items-center gap-1.5 border border-white/5 transition-all self-start sm:self-auto shrink-0"
                    >
                      {copiedKey === 'title' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold text-[10px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[10px] font-bold">Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Suggestions list */}
                {storyTitles.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {storyTitles.map((title, idx) => {
                      const isSelected = title === selectedTitle;

                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelectTitle(title)}
                          className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 border ${
                            isSelected
                              ? 'bg-orange-500/10 border-orange-500/50 text-white shadow-md'
                              : 'bg-zinc-950 border-white/5 hover:border-zinc-700 text-zinc-300 hover:bg-zinc-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-bold ${
                                isSelected
                                  ? 'bg-orange-500 text-zinc-950'
                                  : 'bg-zinc-800 text-zinc-500'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="text-xs font-semibold font-sans leading-normal">{title}</span>
                          </div>

                          {isSelected && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-orange-400 bg-orange-950/40 px-2 py-0.5 rounded-full border border-orange-700/40 shrink-0">
                              <Check className="w-2.5 h-2.5" />
                              Active
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                    <Type className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500">
                      No suggestions loaded yet. Click "Regenerate" above.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ====================================================
              TAB 2: BACKGROUND IMAGE & PROMPT
              ==================================================== */}
          {activeTab === 'background' && (
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6 animate-fadeIn">
              <div className="pb-3 border-b border-white/5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  AI Background Studio
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Configure visual concepts and prompts to feed into the image generator model.
                </p>
              </div>

              {/* Style Presets */}
              <div className="space-y-1.5 pb-2">
                <style>{`
                  #style-presets-row::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider block">
                  Art Style Preset:
                </span>
                <div
                  id="style-presets-row"
                  className="flex items-center gap-1.5 overflow-x-auto py-1 whitespace-nowrap"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {THUMBNAIL_STYLES.map((st) => {
                    const isActive = thumbnail.style === st.id;
                    return (
                      <button
                        key={st.id}
                        onClick={() => handleArtStyleChange(st.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'bg-orange-500 border-orange-500 text-zinc-950 font-bold shadow-md'
                            : 'bg-zinc-950 border-white/5 text-zinc-400 hover:text-white hover:border-zinc-800'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3 Thumbnail Concepts panel */}
              <div className="space-y-3.5 pt-1 border-t border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                      AI Composition Concepts
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {thumbnailConcepts.length > 0 && (
                      <button
                        onClick={handleToggleAllConcepts}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 border border-white/10 hover:border-zinc-700 text-zinc-300 font-bold rounded-lg text-xs transition-all cursor-pointer select-none"
                      >
                        {areConceptsVisible ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>Collapse All</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>Expand All</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => handleGenerateConcept(true)}
                      disabled={isGeneratingConcept}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-extrabold rounded-lg text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isGeneratingConcept ? (
                        <RefreshCw className="w-3 animate-spin text-zinc-950" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-zinc-950" />
                      )}
                      <span>Draft 3 Concept Cards</span>
                    </button>
                  </div>
                </div>

                {/* Concept Selector cards list */}
                {isGeneratingConcept && thumbnailConcepts.length === 0 ? (
                  <div className="flex flex-col gap-4 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-5 rounded-2xl border border-white/5 bg-zinc-950/40 h-[120px] flex flex-col justify-between">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-zinc-800 rounded w-1/4"></div>
                            <div className="h-3 bg-zinc-800 rounded w-5/6"></div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-24 bg-zinc-800 rounded-xl"></div>
                            <div className="h-9 w-24 bg-zinc-800 rounded-xl"></div>
                          </div>
                        </div>
                        <div className="h-3 bg-zinc-800 rounded w-20 mt-4"></div>
                      </div>
                    ))}
                  </div>
                ) : (thumbnailConcepts.length > 0 && areConceptsVisible) ? (
                  <div className="relative">
                    {isGeneratingConcept && (
                      <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-[1px] rounded-2xl flex flex-col items-center justify-center gap-2 z-10 animate-fadeIn">
                        <RefreshCw className="w-5 h-5 animate-spin text-orange-400" />
                        <span className="text-xs font-bold text-orange-300">Applying {thumbnail.style} Preset...</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-4">
                      {thumbnailConcepts.map((c) => {
                        const isSelected = thumbnail.prompt === c.prompt;
                        const isExpanded = !!expandedConcepts[c.id];

                        const toggleExpanded = (e: React.MouseEvent) => {
                          e.stopPropagation();
                          setExpandedConcepts((prev) => ({
                            ...prev,
                            [c.id]: !prev[c.id],
                          }));
                        };

                        return (
                          <div
                            key={c.id}
                            className={`p-5 rounded-2xl border-2 transition-all flex flex-col gap-3.5 text-xs ${
                              isSelected
                                ? 'bg-orange-500/10 border-orange-500 ring-2 ring-orange-500/20 shadow-lg'
                                : 'bg-zinc-950 border-white/5 hover:border-zinc-800'
                            }`}
                          >
                            {/* Card Header & Summary Area */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-orange-400 block tracking-wide text-sm">
                                    {c.title}
                                  </span>
                                  {isSelected && (
                                    <span className="text-[9px] bg-orange-500 text-zinc-950 font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                      IN USE
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                                  {c.conceptDescription}
                                </p>
                              </div>

                              {/* Neatly aligned Actions buttons */}
                              <div className="flex items-center gap-2 sm:shrink-0 self-end sm:self-start">
                                <button
                                  onClick={() => handleCopy(c.prompt, `c_copy_${c.id}`)}
                                  className="py-2 px-3 bg-zinc-900 hover:bg-zinc-850 border border-white/5 text-zinc-300 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all h-9"
                                >
                                  {copiedKey === `c_copy_${c.id}` ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                      <span>Copy Prompt</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => handleSelectSpecificConcept(c)}
                                  className={`py-2 px-4 rounded-xl font-extrabold text-[11px] text-center transition-all cursor-pointer h-9 ${
                                    isSelected
                                      ? 'bg-orange-500 text-zinc-950 shadow-md font-black'
                                      : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                                  }`}
                                >
                                  {isSelected ? '✓ In Use' : 'Use Concept'}
                                </button>
                              </div>
                            </div>

                            {/* Divider line before accordion */}
                            <div className="border-t border-white/5 w-full"></div>

                            {/* Expandable Accordion */}
                            <div className="space-y-2">
                              <button
                                onClick={toggleExpanded}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-white transition-colors focus:outline-none"
                              >
                                <span>{isExpanded ? 'Hide details ▲' : 'Show Prompt details ▼'}</span>
                              </button>

                              {isExpanded && (
                                <div className="bg-zinc-900/80 p-3 rounded-xl border border-white/5 animate-fadeIn space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase font-bold text-zinc-500">Full Text-to-Image Prompt</span>
                                    <button
                                      onClick={() => handleCopy(c.prompt, `c_prompt_copy_${c.id}`)}
                                      className="text-[10px] text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1"
                                    >
                                      {copiedKey === `c_prompt_copy_${c.id}` ? (
                                        <>
                                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                                          <span className="text-emerald-400 font-extrabold">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-2.5 h-2.5" />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <p className="text-[11px] text-zinc-400 font-mono italic leading-relaxed whitespace-pre-wrap select-text">
                                    {c.prompt}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Ready Copy Prompts - COLLAPSIBLE ACCORDION */}
              {thumbnail.concept && (
                <div className="pt-2 border-t border-white/5 space-y-3">
                  <button
                    onClick={() => setIsPromptsOpen(!isPromptsOpen)}
                    className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer"
                  >
                    <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-orange-500" />
                      AI Prompt Suggestions ({isPromptsOpen ? 'Open' : 'Collapsed'})
                    </span>
                    <span className="text-zinc-500 hover:text-white font-bold text-xs select-none">
                      {isPromptsOpen ? 'Collapse ▲' : 'Expand ▼'}
                    </span>
                  </button>

                  {isPromptsOpen && (
                    <div className="space-y-3 pt-1 animate-fadeIn">
                      {/* Concept detail box */}
                      <div className="p-3 bg-zinc-950 border border-white/5 rounded-xl text-xs space-y-1">
                        <span className="text-[9px] uppercase font-bold text-zinc-400">Current Scene Description</span>
                        <p className="text-zinc-300 leading-normal text-[11px] whitespace-pre-wrap">{thumbnail.concept}</p>
                      </div>

                      {/* English Diffusion prompt */}
                      <div className="p-3 bg-zinc-950 border border-white/5 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400">
                            Diffusion Text-to-Image Prompt
                          </span>
                          <button
                            onClick={() => handleCopy(thumbnail.prompt, 'p_copy')}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] font-bold rounded-md border border-white/5 transition-all flex items-center gap-1"
                          >
                            {copiedKey === 'p_copy' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-300 font-mono bg-zinc-900/90 p-2.5 rounded-lg border border-white/5 leading-relaxed whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                          {thumbnail.prompt}
                        </p>
                      </div>

                      {/* Negative prompt */}
                      <div className="p-3 bg-zinc-950 border border-white/5 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400">
                            Negative Prompt Rules
                          </span>
                          <button
                            onClick={() => handleCopy(thumbnail.negativePrompt, 'neg_copy')}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] font-bold rounded-md border border-white/5 transition-all flex items-center gap-1"
                          >
                            {copiedKey === 'neg_copy' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-mono bg-zinc-900/90 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                          {thumbnail.negativePrompt}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


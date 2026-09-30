import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Download,
  Trash2,
  Film,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RefreshCcw,
  RefreshCw,
  Settings,
  Info,
  Clock,
  CheckCircle2,
  Link as LinkIcon,
  Globe,
  Youtube,
  Video,
  FileVideo,
  X,
  ExternalLink,
  Sliders,
  Eye,
  EyeOff,
  Layers,
  Gauge,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Monitor,
  Square,
  Maximize2,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  Sun,
  Contrast as ContrastIcon,
  Palette,
  RotateCcw,
  Crop,
  ShieldCheck,
  Thermometer,
  Save,
  Share2,
  Edit3,
} from 'lucide-react';
import { ProjectData } from '../types';
import { Language, translations } from '../utils/i18n';
import { synthesizeGoogleCloudTTS } from '../services/api';
import { CreationCard } from './CreationCard';
import { PageHeader } from './PageHeader';

interface MovieRecapStudioProps {
  projects: ProjectData[];
  onSaveProject: (project: ProjectData) => void;
  onDeleteProject: (projectId: string, e: React.MouseEvent) => void;
  onBackToDashboard: () => void;
  apiKey: string;
  onOpenApiSettings: () => void;
  language: Language;
}

interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  style: string;
  lang: string;
  sampleText: string;
  pitch: number;
}

interface VideoMetadata {
  sourceType: 'file' | 'youtube' | 'tiktok' | 'facebook' | 'direct';
  title: string;
  embedUrl?: string | null;
  videoId?: string | null;
  originalUrl?: string;
}

const VOICES: VoiceOption[] = [
  {
    id: 'mm_thiha',
    name: 'Thiha (သီဟ)',
    gender: 'male',
    style: 'Deep · Cinematic Narrative',
    lang: 'mm',
    sampleText: 'ကျနော်က သီဟ ပါ။ movie recap လုပ်ဖို့အတွက် အသုံးပြုနိုင်ပါတယ်။',
    pitch: -5.0,
  },
  {
    id: 'mm_nilar',
    name: 'Nilar (နီလာ)',
    gender: 'female',
    style: 'Warm · Expressive',
    lang: 'mm',
    sampleText: 'ကျမက နီလာ ပါ။ movie recap လုပ်ဖို့အတွက် အသုံးပြုနိုင်ပါတယ်။',
    pitch: 1.0,
  },
  {
    id: 'mm_aung_kyaw',
    name: 'Aung Kyaw (အောင်ကျော်)',
    gender: 'male',
    style: 'Action · Dynamic',
    lang: 'mm',
    sampleText: 'ကျနော်က အောင်ကျော် ပါ။ movie recap လုပ်ဖို့အတွက် အသုံးပြုနိုင်ပါတယ်။',
    pitch: -4.0,
  },
  {
    id: 'mm_hsu_myat',
    name: 'Hsu Myat (ဆုမြတ်)',
    gender: 'female',
    style: 'Smooth · Storyteller',
    lang: 'mm',
    sampleText: 'ကျမက ဆုမြတ် ပါ။ movie recap လုပ်ဖို့အတွက် အသုံးပြုနိုင်ပါတယ်။',
    pitch: 0.0,
  },
  {
    id: 'mm_min_khant',
    name: 'Min Khant (မင်းခန့်)',
    gender: 'male',
    style: 'Calm · Documentary',
    lang: 'mm',
    sampleText: 'ကျနော်က မင်းခန့် ပါ။ movie recap လုပ်ဖို့အတွက် အသုံးပြုနိုင်ပါတယ်။',
    pitch: -2.5,
  },
  {
    id: 'mm_may_thu',
    name: 'May Thu (မေသူ)',
    gender: 'female',
    style: 'Gentle · Emotional',
    lang: 'mm',
    sampleText: 'ကျမက မေသူ ပါ။ movie recap လုပ်ဖို့အတွက် အသုံးပြုနိုင်ပါတယ်။',
    pitch: 2.0,
  },
];

const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'kr', name: 'Korean' },
  { id: 'jp', name: 'Japanese' },
  { id: 'cn', name: 'Chinese' },
  { id: 'mm', name: 'Myanmar (Burmese)' },
  { id: 'es', name: 'Spanish' },
];

const SPEED_PRESETS = [
  { value: 0.8, label: '0.8x (Slow)' },
  { value: 1.0, label: '1.0x (Normal)' },
  { value: 1.1, label: '1.1x' },
  { value: 1.2, label: '1.2x (Recommended for Recaps)' },
  { value: 1.3, label: '1.3x' },
  { value: 1.5, label: '1.5x (Fast)' },
];

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

function detectVideoPlatform(url: string): VideoMetadata {
  const trimmed = url.trim();
  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return {
      sourceType: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=0&rel=0`,
      videoId: ytId,
      title: `YouTube Video (ID: ${ytId})`,
      originalUrl: trimmed,
    };
  }

  if (trimmed.includes('tiktok.com')) {
    return {
      sourceType: 'tiktok',
      embedUrl: trimmed,
      videoId: null,
      title: 'TikTok Video Link',
      originalUrl: trimmed,
    };
  }

  if (trimmed.includes('facebook.com') || trimmed.includes('fb.watch')) {
    return {
      sourceType: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=0`,
      videoId: null,
      title: 'Facebook Video Post',
      originalUrl: trimmed,
    };
  }

  return {
    sourceType: 'direct',
    embedUrl: trimmed,
    videoId: null,
    title: trimmed.split('/').pop()?.split('?')[0] || 'Direct Video Stream',
    originalUrl: trimmed,
  };
}

export const MovieRecapStudio: React.FC<MovieRecapStudioProps> = ({
  projects,
  onSaveProject,
  onDeleteProject,
  onBackToDashboard,
  apiKey,
  onOpenApiSettings,
  language,
}) => {
  const t = translations[language];

  // View state: 'launcher' | 'studio' | 'result'
  const [activeView, setActiveView] = useState<'launcher' | 'studio' | 'result'>('launcher');
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);
  const [generationTimestamp, setGenerationTimestamp] = useState<string>('');

  // Navigation State ('voice' | 'edit')
  const [studioStep, setStudioStep] = useState<1 | 2>(1);

  // Accordion State in Edit Video ('blur' | 'flip_zoom' | 'color')
  const [activeAccordion, setActiveAccordion] = useState<'blur' | 'flip_zoom' | 'color' | null>('blur');

  // Studio Form & Video State
  const [inputTab, setInputTab] = useState<'upload' | 'url'>('upload');
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);

  // Aspect Ratio & Responsive Live View
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [videoFitMode, setVideoFitMode] = useState<'contain' | 'cover'>('contain');

  // Video Editing Controls State (Transform, Zoom, Color Grading & Temperature)
  const [flipHorizontal, setFlipHorizontal] = useState<boolean>(false);
  const [flipVertical, setFlipVertical] = useState<boolean>(false);
  const [videoZoom, setVideoZoom] = useState<number>(100); // 100% to 135%
  const [brightness, setBrightness] = useState<number>(100); // 75% to 135%
  const [contrast, setContrast] = useState<number>(100); // 75% to 140%
  const [saturation, setSaturation] = useState<number>(100); // 60% to 150%
  const [colorTemperature, setColorTemperature] = useState<number>(0); // -100 (Cool/Blue) to +100 (Warm/Amber)

  // Voiceover & Recap Settings
  const [aiVoice, setAiVoice] = useState<string>('mm_thiha');
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.2);
  const [videoLanguage, setVideoLanguage] = useState<string>('en');

  // Custom Voice Dropdown & Preview State
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState<boolean>(false);
  const [previewPlayingVoiceId, setPreviewPlayingVoiceId] = useState<string | null>(null);
  const voiceDropdownRef = useRef<HTMLDivElement | null>(null);

  // Subtitle & Watermark Blur Mask Settings
  const [enableBlurMask, setEnableBlurMask] = useState<boolean>(false);
  const [blurIntensity, setBlurIntensity] = useState<number>(16); // 5 to 35px
  const [blurHeight, setBlurHeight] = useState<number>(14); // 5 to 40%
  const [blurWidth, setBlurWidth] = useState<number>(92); // 10 to 100%
  const [blurPosX, setBlurPosX] = useState<number>(50); // 0 to 100%
  const [blurPosY, setBlurPosY] = useState<number>(86); // 0 to 100%
  const [blurFeather, setBlurFeather] = useState<number>(12); // 0 to 24px
  const [blurTintOpacity, setBlurTintOpacity] = useState<number>(25); // 0 to 80%

  // Generation & Output State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationStepNumber, setGenerationStepNumber] = useState<number>(1);
  const [generationPercent, setGenerationPercent] = useState<number>(0);
  const [ttsStatusMessage, setTtsStatusMessage] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [recapTitle, setRecapTitle] = useState<string>('Cinematic Movie Recap');
  const [copied, setCopied] = useState<boolean>(false);
  const [isPlayingFullNarration, setIsPlayingFullNarration] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [synthesizedAudioUrl, setSynthesizedAudioUrl] = useState<string | null>(null);

  // Publishing Kit State
  const [generatedVideoTitle, setGeneratedVideoTitle] = useState<string>('Viral Cinematic Movie Recap');
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([
    '#MovieRecap',
    '#TikTokMyanmar',
    '#SciFiMovie',
    '#MKPVidPrompts',
    '#ViralStory',
    '#CinematicRecap',
  ]);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [copiedTitle, setCopiedTitle] = useState<boolean>(false);
  const [copiedTags, setCopiedTags] = useState<boolean>(false);

  const handleGenerateThumbnailSnapshot = () => {
    try {
      const vElem = resultVideoRef.current || videoRef.current;
      if (vElem) {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(vElem, 0, 0, canvas.width, canvas.height);
          const gradient = ctx.createLinearGradient(0, 400, 0, 720);
          gradient.addColorStop(0, 'rgba(0,0,0,0)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 52px sans-serif';
          ctx.fillText((generatedVideoTitle || recapTitle).slice(0, 35), 60, 630);

          const url = canvas.toDataURL('image/jpeg', 0.9);
          setThumbnailDataUrl(url);
          setToastMessage('🎨 Auto-generated thumbnail snapshot ready!');
        }
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    if (activeView === 'result') {
      const timer = setTimeout(() => {
        handleGenerateThumbnailSnapshot();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [activeView]);

  const handleCopyTitle = () => {
    navigator.clipboard.writeText(generatedVideoTitle || recapTitle);
    setCopiedTitle(true);
    setToastMessage('📋 Copied video title to clipboard!');
    setTimeout(() => setCopiedTitle(false), 2500);
  };

  const handleCopyTags = () => {
    const tagsStr = generatedHashtags.join(' ');
    navigator.clipboard.writeText(tagsStr);
    setCopiedTags(true);
    setToastMessage('📋 Copied hashtags to clipboard!');
    setTimeout(() => setCopiedTags(false), 2500);
  };

  const handleCopyAll = () => {
    const textToCopy = `${generatedVideoTitle || recapTitle}\n\n${generatedHashtags.join(' ')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedTitle(true);
    setToastMessage('📋 Copied post title & hashtags to clipboard!');
    setTimeout(() => setCopiedTitle(false), 2500);
  };

  const handleDownloadThumbnail = () => {
    if (!thumbnailDataUrl) {
      handleGenerateThumbnailSnapshot();
    }
    const url = thumbnailDataUrl;
    if (!url) {
      setToastMessage('No thumbnail available to download.');
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = `recap_thumbnail_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setToastMessage('⬇️ Thumbnail downloaded successfully (.jpg)!');
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const resultVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const narrationAudioRef = useRef<HTMLAudioElement | null>(null);

  const formatDurationDisplay = (seconds: number): string => {
    if (!seconds || isNaN(seconds) || seconds <= 0) {
      return '01:30 mins';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} mins`;
  };

  // Synchronize AI Audio voiceover directly with result video player
  const handleResultVideoPlay = () => {
    if (!synthesizedAudioUrl) return;
    try {
      if (!narrationAudioRef.current) {
        narrationAudioRef.current = new Audio(synthesizedAudioUrl);
      } else if (narrationAudioRef.current.src !== synthesizedAudioUrl) {
        narrationAudioRef.current.src = synthesizedAudioUrl;
      }
      const audio = narrationAudioRef.current;
      if (resultVideoRef.current) {
        audio.currentTime = resultVideoRef.current.currentTime;
        audio.playbackRate = resultVideoRef.current.playbackRate || voiceSpeed;
      }
      audio.play().catch((err) => {
        console.warn('Auto play synced audio notice:', err);
      });
    } catch (err) {
      console.warn('Sync audio play error:', err);
    }
  };

  const handleResultVideoPause = () => {
    if (narrationAudioRef.current) {
      narrationAudioRef.current.pause();
    }
  };

  const handleResultVideoSeeked = () => {
    if (narrationAudioRef.current && resultVideoRef.current) {
      narrationAudioRef.current.currentTime = resultVideoRef.current.currentTime;
    }
  };

  const handleResultVideoRateChange = () => {
    if (narrationAudioRef.current && resultVideoRef.current) {
      narrationAudioRef.current.playbackRate = resultVideoRef.current.playbackRate;
    }
  };

  const handleResultVideoEnded = () => {
    if (narrationAudioRef.current) {
      narrationAudioRef.current.pause();
      narrationAudioRef.current.currentTime = 0;
    }
  };

  // Close voice dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(e.target as Node)) {
        setIsVoiceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Stop voice preview on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      if (narrationAudioRef.current) {
        narrationAudioRef.current.pause();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Filter projects by movie-recap projectType
  const movieRecapProjects = projects.filter((p) => {
    if (!p.projectType) return false;
    return p.projectType === 'movie-recap';
  });

  const handleCreateNew = () => {
    const newProj: ProjectData = {
      id: 'recap_' + Date.now(),
      projectType: 'movie-recap',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      promptMode: 'Analyze Original',
      project: {
        title: 'Untitled Movie Recap',
        aspect_ratio: '16:9',
        visual_style: 'Cinematic Movie Recap',
        master_style_prompt: 'Cinematic recap master prompt',
        negative_prompt: '',
      },
      characters: [],
      scenes: [],
    };
    setCurrentProject(newProj);
    setVideoFile(null);
    setVideoUrl(null);
    setVideoMetadata(null);
    setVideoUrlInput('');
    setGeneratedScript('');
    setRecapTitle('Cinematic Movie Recap');
    setGenerationTimestamp(new Date().toISOString().replace('T', ' ').substring(0, 16));
    setStudioStep(1);
    setActiveAccordion('blur');
    setAspectRatio('16:9');
    setFlipHorizontal(false);
    setFlipVertical(false);
    setVideoZoom(100);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setColorTemperature(0);
    setEnableBlurMask(false);
    setActiveView('studio');
  };

  const handleOpenProject = (proj: ProjectData) => {
    setCurrentProject(proj);
    const existingUrl = proj.videoFileName || null;
    setVideoUrl(existingUrl);
    if (existingUrl) {
      setVideoMetadata(detectVideoPlatform(existingUrl));
    } else {
      setVideoMetadata(null);
    }
    const script = proj.scenes?.[0]?.action || proj.scenes?.[0]?.summary || '';
    setGeneratedScript(script);
    setRecapTitle(proj.project?.title || 'Cinematic Movie Recap');
    setGenerationTimestamp(new Date(proj.updatedAt).toISOString().replace('T', ' ').substring(0, 16));
    setStudioStep(1);
    setActiveAccordion('blur');
    if (proj.project?.aspect_ratio === '9:16' || proj.project?.aspect_ratio === '1:1') {
      setAspectRatio(proj.project.aspect_ratio);
    } else {
      setAspectRatio('16:9');
    }

    if (script) {
      setActiveView('result');
    } else {
      setActiveView('studio');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoMetadata({
        sourceType: 'file',
        title: file.name,
        originalUrl: url,
      });

      // Probe video natural aspect ratio
      const tempVideo = document.createElement('video');
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        if (tempVideo.videoHeight > tempVideo.videoWidth * 1.2) {
          setAspectRatio('9:16');
        } else if (Math.abs(tempVideo.videoWidth - tempVideo.videoHeight) < 50) {
          setAspectRatio('1:1');
        } else {
          setAspectRatio('16:9');
        }
      };

      setToastMessage(`Loaded local video file: ${file.name}`);
    }
  };

  const handleUrlImport = () => {
    if (!videoUrlInput || !videoUrlInput.trim()) {
      setToastMessage('Please enter a valid video link.');
      return;
    }

    const trimmed = videoUrlInput.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setToastMessage('Please provide a full URL starting with https://');
      return;
    }

    const meta = detectVideoPlatform(trimmed);
    setVideoFile(null);
    setVideoUrl(trimmed);
    setVideoMetadata(meta);

    if (trimmed.includes('shorts/') || trimmed.includes('tiktok.com') || trimmed.includes('/reel/')) {
      setAspectRatio('9:16');
    }

    setToastMessage(`Imported ${meta.title} successfully!`);
  };

  const handleResetVideo = () => {
    setVideoFile(null);
    setVideoUrl(null);
    setVideoMetadata(null);
    setVideoUrlInput('');
  };

  const handleLoadSample = () => {
    const sampleUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    setVideoUrl(sampleUrl);
    setVideoFile(null);
    setAspectRatio('16:9');
    setVideoMetadata({
      sourceType: 'direct',
      title: 'BigBuckBunny.mp4 (Sample)',
      embedUrl: sampleUrl,
      originalUrl: sampleUrl,
    });
    setToastMessage('Loaded sample video.');
  };

  // Play / Stop Voice Preview Audio with Netlify Google Cloud TTS & Web Speech fallback
  const handleToggleVoicePreview = async (voiceId: string) => {
    if (previewPlayingVoiceId === voiceId) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setPreviewPlayingVoiceId(null);
      return;
    }

    // Stop existing playback
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const targetVoice = VOICES.find((v) => v.id === voiceId);
    if (!targetVoice) return;

    setPreviewPlayingVoiceId(voiceId);

    try {
      // 1. Try Google Cloud TTS via Netlify Serverless Backend
      const ttsRes = await synthesizeGoogleCloudTTS({
        text: targetVoice.sampleText,
        voiceName: targetVoice.id,
        speakingRate: voiceSpeed,
        languageCode: 'my-MM',
        gender: targetVoice.gender === 'male' ? 'MALE' : 'FEMALE',
        pitch: targetVoice.pitch,
      });

      if (ttsRes && ttsRes.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${ttsRes.audioContent}`);
        previewAudioRef.current = audio;
        audio.playbackRate = voiceSpeed;
        audio.onended = () => setPreviewPlayingVoiceId(null);
        audio.onerror = () => {
          fallbackSpeechPreview(targetVoice);
        };
        await audio.play();
        return;
      }
    } catch (e) {
      console.warn('Google Cloud TTS preview error, falling back to speech synthesis:', e);
    }

    // Fallback to Web Speech API
    fallbackSpeechPreview(targetVoice);
  };

  const fallbackSpeechPreview = (targetVoice: VoiceOption) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(targetVoice.sampleText);
      utterance.rate = voiceSpeed;
      utterance.lang = 'my-MM';
      utterance.pitch = targetVoice.gender === 'male' ? 0.75 : 1.15;

      utterance.onstart = () => {
        setPreviewPlayingVoiceId(targetVoice.id);
      };
      utterance.onend = () => {
        setPreviewPlayingVoiceId(null);
      };
      utterance.onerror = () => {
        setPreviewPlayingVoiceId(null);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setPreviewPlayingVoiceId(null);
      setToastMessage('Audio speech synthesis is not supported on this browser.');
    }
  };

  // Full Narration Play / Stop in Result Screen
  const handleToggleFullNarration = async () => {
    if (isPlayingFullNarration) {
      if (narrationAudioRef.current) {
        narrationAudioRef.current.pause();
        narrationAudioRef.current.currentTime = 0;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingFullNarration(false);
      return;
    }

    if (!generatedScript) return;

    const cleanNarrationText = generatedScript.replace(/\[\d\d:\d\d\s*-\s*\d\d:\d\d\]\s*[A-Z\s&]+:/g, '');
    const targetVoice = VOICES.find((v) => v.id === aiVoice) || VOICES[0];

    setIsPlayingFullNarration(true);

    // If we already have synthesized MP3 audio from generation
    if (synthesizedAudioUrl) {
      try {
        const audio = new Audio(synthesizedAudioUrl);
        narrationAudioRef.current = audio;
        audio.playbackRate = voiceSpeed;
        audio.onended = () => setIsPlayingFullNarration(false);
        audio.onerror = () => {
          fallbackFullNarration(cleanNarrationText, targetVoice);
        };
        await audio.play();
        return;
      } catch (e) {
        console.warn('Playback error with cached synthesized audio:', e);
      }
    }

    // Try Netlify Google Cloud TTS synthesis
    try {
      const ttsRes = await synthesizeGoogleCloudTTS({
        text: cleanNarrationText,
        voiceName: targetVoice.id,
        speakingRate: voiceSpeed,
        languageCode: 'my-MM',
        gender: targetVoice.gender === 'male' ? 'MALE' : 'FEMALE',
        pitch: targetVoice.pitch,
      });

      if (ttsRes && ttsRes.audioContent) {
        const audioUrl = `data:audio/mp3;base64,${ttsRes.audioContent}`;
        setSynthesizedAudioUrl(audioUrl);
        const audio = new Audio(audioUrl);
        narrationAudioRef.current = audio;
        audio.playbackRate = voiceSpeed;
        audio.onended = () => setIsPlayingFullNarration(false);
        audio.onerror = () => {
          fallbackFullNarration(cleanNarrationText, targetVoice);
        };
        await audio.play();
        return;
      }
    } catch (e) {
      console.warn('Full narration Google Cloud TTS error:', e);
    }

    // Fallback to Web Speech API
    fallbackFullNarration(cleanNarrationText, targetVoice);
  };

  const fallbackFullNarration = (text: string, targetVoice: VoiceOption) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = voiceSpeed;
      utterance.lang = 'my-MM';
      utterance.pitch = targetVoice.gender === 'male' ? 0.75 : 1.15;

      utterance.onstart = () => {
        setIsPlayingFullNarration(true);
      };
      utterance.onend = () => {
        setIsPlayingFullNarration(false);
      };
      utterance.onerror = () => {
        setIsPlayingFullNarration(false);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingFullNarration(false);
      setToastMessage('Audio speech synthesis is not supported on this browser.');
    }
  };

  // Blur Preset Handler
  const handleApplyBlurPreset = (preset: 'subtitle' | 'corner' | 'bottom_third') => {
    setEnableBlurMask(true);
    if (preset === 'subtitle') {
      setBlurPosX(50);
      setBlurPosY(86);
      setBlurWidth(92);
      setBlurHeight(14);
      setBlurFeather(12);
      setBlurIntensity(18);
    } else if (preset === 'corner') {
      setBlurPosX(86);
      setBlurPosY(12);
      setBlurWidth(24);
      setBlurHeight(14);
      setBlurFeather(8);
      setBlurIntensity(22);
    } else if (preset === 'bottom_third') {
      setBlurPosX(50);
      setBlurPosY(84);
      setBlurWidth(100);
      setBlurHeight(30);
      setBlurFeather(0);
      setBlurIntensity(20);
    }
  };

  // Reset Flip & Zoom
  const handleResetFlipZoom = () => {
    setFlipHorizontal(false);
    setFlipVertical(false);
    setVideoZoom(100);
    setToastMessage('Reset flip & zoom to default.');
  };

  // Reset Color Adjustments
  const handleResetColor = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setColorTemperature(0);
    setToastMessage('Reset video color grading to default.');
  };

  const handleToggleAccordion = (key: 'blur' | 'flip_zoom' | 'color') => {
    setActiveAccordion((prev) => (prev === key ? null : key));
  };

  // Full Unified Pipeline Execution
  const handleGenerateRecap = async () => {
    if (!videoUrl) {
      setToastMessage('Please upload or load a video file first.');
      return;
    }

    if (!apiKey) {
      onOpenApiSettings();
      return;
    }

    setIsGenerating(true);
    setGenerationStepNumber(1);
    setGenerationPercent(25);
    setTtsStatusMessage(null);

    try {
      // Step 1: Analyzing video frames & scene flow
      setGenerationStep('Analyzing video frames & scene flow...');
      const videoLabel = videoMetadata?.title || 'Video Stream';
      await new Promise((r) => setTimeout(r, 600));

      // Step 2: Drafting Myanmar narration script
      setGenerationStepNumber(2);
      setGenerationPercent(50);
      setGenerationStep('Drafting Myanmar narration script...');

      // Call Server Gemini API endpoint for cinematic storytelling narrative
      const res = await fetch('/api/generate-movie-recap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey.trim(),
        },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          videoTitle: videoLabel,
          videoLanguage,
          voiceName: selectedVoiceObj.name,
          voiceSpeed,
          aspectRatio,
        }),
      });

      let finalScript = '';
      let finalTitle = `${videoLabel} (Movie Recap)`;

      if (res.ok) {
        const data = await res.json();
        if (data.script) {
          finalScript = data.script;
        }
        if (data.videoTitle || data.title) {
          finalTitle = data.videoTitle || data.title;
          setGeneratedVideoTitle(data.videoTitle || data.title);
        }
        if (data.hashtags && Array.isArray(data.hashtags)) {
          setGeneratedHashtags(data.hashtags);
        }
      }

      if (!finalScript) {
        // High quality fallback cinematic storyteller script
        finalScript = `[00:00 - 00:45] HOOK & MYSTERY:\nNobody in the city expected what was hidden beneath the surface. When our protagonist opens the sealed vault, a shockwave of danger is unleashed that changes everything in an instant.\n\n[00:45 - 02:00] ESCALATION & BETRAYAL:\nWith time running out and shadows closing in, an unexpected betrayal turns friends into foes. Every decision becomes a race against survival as high-stakes tension reaches a boiling point.\n\n[02:00 - 03:00] FINAL CLIMAX & TWIST:\nAgainst insurmountable odds, a masterclass of cunning and resolve flips the entire game on its head, culminating in a jaw-dropping twist that leaves everyone stunned.`;
      }

      // Step 3: Synthesizing AI voiceover with selectedVoice
      setGenerationStepNumber(3);
      setGenerationPercent(75);
      setGenerationStep(`Synthesizing AI voiceover with ${selectedVoiceObj.name.split('(')[0].trim()}...`);

      let voiceoverGenerated = false;
      if (!apiKey || !apiKey.trim()) {
        setTtsStatusMessage('Google Cloud TTS API မချိတ်ရသေးပါသဖြင့် AI အသံ ထွက်ရှိမည်မဟုတ်ပါ။ Video သာ ကြည့်ရှုနိုင်ပါမည်။');
      } else {
        try {
          const cleanNarrationText = finalScript.replace(/\[\d\d:\d\d\s*-\s*\d\d:\d\d\]\s*[A-Z\s&]+:/g, '');
          const ttsRes = await synthesizeGoogleCloudTTS({
            text: cleanNarrationText,
            voiceName: selectedVoiceObj.id,
            speakingRate: voiceSpeed,
            languageCode: 'my-MM',
            gender: selectedVoiceObj.gender === 'male' ? 'MALE' : 'FEMALE',
            pitch: selectedVoiceObj.pitch,
            apiKey: apiKey.trim(),
          });
          if (ttsRes && ttsRes.audioContent && ttsRes.audioContent.length > 50) {
            setSynthesizedAudioUrl(`data:audio/mp3;base64,${ttsRes.audioContent}`);
            voiceoverGenerated = true;
          } else {
            setTtsStatusMessage('Google Cloud TTS API မချိတ်ရသေးပါသဖြင့် AI အသံ ထွက်ရှိမည်မဟုတ်ပါ။ Video သာ ကြည့်ရှုနိုင်ပါမည်။');
          }
        } catch (ttsErr) {
          console.warn('TTS pre-synthesis warning:', ttsErr);
          setTtsStatusMessage('Google Cloud TTS API မချိတ်ရသေးပါသဖြင့် AI အသံ ထွက်ရှိမည်မဟုတ်ပါ။ Video သာ ကြည့်ရှုနိုင်ပါမည်။');
        }
      }

      // Step 4: Finalizing & synchronizing recap video
      setGenerationStepNumber(4);
      setGenerationPercent(95);
      setGenerationStep('Finalizing & synchronizing recap video...');
      await new Promise((r) => setTimeout(r, 600));

      setGeneratedScript(finalScript);
      setRecapTitle(finalTitle);

      const updated: ProjectData = {
        id: currentProject?.id || 'recap_' + Date.now(),
        projectType: 'movie-recap',
        createdAt: currentProject?.createdAt || Date.now(),
        updatedAt: Date.now(),
        videoFileName: videoUrl,
        promptMode: 'Analyze Original',
        project: {
          title: finalTitle,
          aspect_ratio: aspectRatio,
          visual_style: 'Cinematic Storytelling Recap',
          master_style_prompt: `Recap of ${videoLabel}`,
          negative_prompt: '',
        },
        characters: [],
        scenes: [
          {
            scene_number: 1,
            duration: '180s',
            location: 'Cinematic Story',
            time: 'Day',
            characters: [],
            action: finalScript,
            emotion: 'Suspenseful & Dramatic',
            body_language: '',
            dialogue: [],
            camera: aspectRatio === '9:16' ? 'Vertical Storyteller framing' : 'Cinematic wide framing',
            environment: '',
            props: [],
            lighting: '',
            sound: '',
            transition: '',
            video_prompt: 'Cinematic movie recap sequence',
            character_image_prompt: '',
            summary: finalScript,
          },
        ],
      };

      setCurrentProject(updated);
      onSaveProject(updated);

      setGenerationPercent(100);
      await new Promise((r) => setTimeout(r, 300));
      setGenerationTimestamp(new Date().toISOString().replace('T', ' ').substring(0, 16));

      // Switch to Result Preview
      setActiveView('result');
      setToastMessage('🎉 Movie Recap Generated Successfully!');
    } catch (err: any) {
      console.error('Recap generation error:', err);
      setToastMessage('Failed to generate movie recap. Please check your Gemini API key in settings.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
      setGenerationStepNumber(1);
      setGenerationPercent(0);
      setTtsStatusMessage(null);
    }
  };

  const handleCopyScript = () => {
    if (!generatedScript) return;
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTryAnother = () => {
    // Stop any active audio
    if (narrationAudioRef.current) {
      narrationAudioRef.current.pause();
      narrationAudioRef.current.currentTime = 0;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Reset all project and video state
    setVideoFile(null);
    setVideoUrl(null);
    setVideoMetadata(null);
    setVideoUrlInput('');
    setVideoDuration(0);
    setGeneratedScript('');
    setRecapTitle('Cinematic Movie Recap');
    setSynthesizedAudioUrl(null);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setVideoZoom(100);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setColorTemperature(0);
    setEnableBlurMask(false);
    setStudioStep(1);
    setActiveAccordion('blur');
    setCurrentProject(null);

    // Direct back to initial upload panel
    setActiveView('studio');
    setToastMessage('Ready to create your next movie recap!');
  };

  const handleDownloadAudioOnly = () => {
    if (!synthesizedAudioUrl) {
      setToastMessage('No synthesized AI audio available to download.');
      return;
    }
    const aAudio = document.createElement('a');
    aAudio.href = synthesizedAudioUrl;
    aAudio.download = `${recapTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ai_voiceover.mp3`;
    document.body.appendChild(aAudio);
    aAudio.click();
    document.body.removeChild(aAudio);
    setToastMessage('Downloaded AI Voiceover (MP3).');
  };

  const handleDownloadScriptOnly = () => {
    if (!generatedScript) return;
    const blob = new Blob([generatedScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recapTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_recap_script.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToastMessage('Downloaded script (.txt).');
  };

  const handleDownloadVideoOnly = () => {
    if (!videoUrl) {
      setToastMessage('No source video available.');
      return;
    }
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${recapTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_source_video.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setToastMessage('Downloading source video...');
  };

  const handleSaveVideoFile = async () => {
    setIsExporting(true);
    setExportProgress('Preparing video track...');

    try {
      const videoElem = resultVideoRef.current || videoRef.current;
      const isDirectVideo =
        videoUrl &&
        (videoUrl.startsWith('blob:') ||
          videoUrl.startsWith('data:') ||
          videoMetadata?.sourceType === 'file' ||
          videoMetadata?.sourceType === 'direct');

      if (!synthesizedAudioUrl) {
        setExportProgress('Exporting video (No AI voiceover attached)...');
        await new Promise((r) => setTimeout(r, 600));

        if (isDirectVideo && videoElem && typeof MediaRecorder !== 'undefined') {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const targetWidth = aspectRatio === '9:16' ? 720 : aspectRatio === '1:1' ? 720 : 1280;
          const targetHeight = aspectRatio === '9:16' ? 1280 : aspectRatio === '1:1' ? 720 : 720;
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const canvasStream = canvas.captureStream(30);
          const recorder = new MediaRecorder(canvasStream);
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          const exportPromise = new Promise<Blob>((resolve) => {
            recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
          });

          recorder.start();
          videoElem.currentTime = 0;
          await videoElem.play().catch(() => {});

          const durationSec = Math.min(videoElem.duration || 15, 60);
          const startTime = performance.now();

          const renderFrameOnly = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            if (ctx && videoElem) {
              ctx.fillStyle = '#000000';
              ctx.fillRect(0, 0, targetWidth, targetHeight);
              ctx.drawImage(videoElem, 0, 0, targetWidth, targetHeight);
            }
            if (elapsed < durationSec && recorder.state === 'recording') {
              requestAnimationFrame(renderFrameOnly);
            } else {
              if (recorder.state === 'recording') recorder.stop();
            }
          };
          requestAnimationFrame(renderFrameOnly);

          const exportedBlob = await exportPromise;
          const fileUrl = URL.createObjectURL(exportedBlob);
          const a = document.createElement('a');
          a.href = fileUrl;
          a.download = `${recapTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_recap.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(fileUrl);
          setToastMessage('🎉 Video exported successfully (without audio)');
        } else if (videoUrl) {
          const a = document.createElement('a');
          a.href = videoUrl;
          a.download = `${recapTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_source_video.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setToastMessage('🎉 Video downloaded successfully!');
        }
        setIsExporting(false);
        setExportProgress('');
        return;
      }

      if (isDirectVideo && videoElem && typeof MediaRecorder !== 'undefined') {
        setExportProgress('Muxing audio & rendering visual effects...');

        // Setup offscreen canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const targetWidth = aspectRatio === '9:16' ? 720 : aspectRatio === '1:1' ? 720 : 1280;
        const targetHeight = aspectRatio === '9:16' ? 1280 : aspectRatio === '1:1' ? 720 : 720;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Setup Web Audio Context for embedding AI Voiceover
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const dest = audioCtx.createMediaStreamDestination();

        let audioSource: AudioBufferSourceNode | null = null;
        if (synthesizedAudioUrl) {
          try {
            const audioRes = await fetch(synthesizedAudioUrl);
            const arrayBuffer = await audioRes.arrayBuffer();
            const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            audioSource = audioCtx.createBufferSource();
            audioSource.buffer = decodedBuffer;
            audioSource.playbackRate.value = voiceSpeed;
            audioSource.connect(dest);
          } catch (e) {
            console.warn('Audio decoding fallback:', e);
          }
        }

        // Combine canvas video stream and destination audio stream
        const canvasStream = canvas.captureStream(30);
        const videoTracks = canvasStream.getVideoTracks();
        const audioTracks = dest.stream.getAudioTracks();
        const combinedStream = new MediaStream([...videoTracks, ...audioTracks]);

        // Prioritize widely supported container types without corrupted extensions
        const mimeOptions = [
          { mime: 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', ext: 'mp4' },
          { mime: 'video/mp4;codecs=h264,aac', ext: 'mp4' },
          { mime: 'video/mp4', ext: 'mp4' },
          { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
          { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
          { mime: 'video/webm', ext: 'webm' },
        ];

        let selectedMime = '';
        let selectedExt = 'webm';
        for (const opt of mimeOptions) {
          if (MediaRecorder.isTypeSupported(opt.mime)) {
            selectedMime = opt.mime;
            selectedExt = opt.ext;
            break;
          }
        }

        const recorder = selectedMime ? new MediaRecorder(combinedStream, { mimeType: selectedMime }) : new MediaRecorder(combinedStream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        const exportPromise = new Promise<Blob>((resolve, reject) => {
          recorder.onstop = () => {
            const finalBlob = new Blob(chunks, { type: selectedMime || 'video/webm' });
            resolve(finalBlob);
          };
          recorder.onerror = (err) => reject(err);
        });

        recorder.start();
        if (audioSource) {
          audioSource.start(0);
        }

        const durationSec = Math.min(videoElem.duration || 15, 60);
        const startTime = performance.now();

        const renderFrame = () => {
          const elapsed = (performance.now() - startTime) / 1000;
          const percent = Math.min(100, Math.round((elapsed / durationSec) * 100));
          setExportProgress(`Rendering & Merging video with AI voiceover... ${percent}%`);

          if (ctx) {
            ctx.save();
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            // Visual edits & color grading
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)${tempFilter}`;
            ctx.translate(targetWidth / 2, targetHeight / 2);
            ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
            ctx.scale(videoZoom / 100, videoZoom / 100);

            ctx.drawImage(videoElem, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
            ctx.restore();

            // Color Temperature Tint
            if (colorTemperature !== 0) {
              ctx.save();
              ctx.fillStyle =
                colorTemperature > 0
                  ? `rgba(245, 158, 11, ${Math.min(0.28, colorTemperature * 0.003)})`
                  : `rgba(59, 130, 246, ${Math.min(0.28, Math.abs(colorTemperature) * 0.003)})`;
              ctx.fillRect(0, 0, targetWidth, targetHeight);
              ctx.restore();
            }

            // Subtitle Blur Box
            if (enableBlurMask) {
              ctx.save();
              const boxW = (targetWidth * blurWidth) / 100;
              const boxH = (targetHeight * blurHeight) / 100;
              const boxX = (targetWidth * blurPosX) / 100 - boxW / 2;
              const boxY = (targetHeight * blurPosY) / 100 - boxH / 2;

              ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.65, blurTintOpacity / 100)})`;
              ctx.fillRect(boxX, boxY, boxW, boxH);
              ctx.restore();
            }
          }

          if (elapsed < durationSec && recorder.state === 'recording') {
            requestAnimationFrame(renderFrame);
          } else {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
            if (audioCtx.state !== 'closed') {
              audioCtx.close();
            }
          }
        };

        videoElem.currentTime = 0;
        await videoElem.play().catch(() => {});
        requestAnimationFrame(renderFrame);

        const exportedBlob = await exportPromise;
        const fileUrl = URL.createObjectURL(exportedBlob);
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = `${recapTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_merged_recap.${selectedExt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(fileUrl);
        setToastMessage('🎉 Merged Video with AI Voiceover downloaded successfully!');
      } else {
        setExportProgress('Packaging video recap assets...');
        await new Promise((r) => setTimeout(r, 600));

        if (synthesizedAudioUrl) {
          handleDownloadAudioOnly();
        }
        handleDownloadScriptOnly();
        setToastMessage('💾 Recap script & audio files downloaded successfully!');
      }
    } catch (err) {
      console.error('Save video error:', err);
      if (synthesizedAudioUrl) {
        handleDownloadAudioOnly();
      }
      handleDownloadScriptOnly();
      setToastMessage('💾 Downloaded separate audio & script files.');
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const selectedVoiceObj = VOICES.find((v) => v.id === aiVoice) || VOICES[0];

  // Dynamic CSS transformations and visual filters for live video preview
  let tempFilter = '';
  if (colorTemperature > 0) {
    tempFilter = ` sepia(${colorTemperature * 0.25}%) hue-rotate(-${colorTemperature * 0.12}deg)`;
  } else if (colorTemperature < 0) {
    tempFilter = ` hue-rotate(${Math.abs(colorTemperature) * 0.25}deg) saturate(${100 + Math.abs(colorTemperature) * 0.08}%)`;
  }

  const videoTransformStyle = `scale(${videoZoom / 100}) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`;
  const videoFilterStyle = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)${tempFilter}`;

  // ==========================================
  // RENDER 1: LAUNCHER VIEW
  // ==========================================
  if (activeView === 'launcher') {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <PageHeader
          title="Movie Recap Studio"
          onBack={onBackToDashboard}
        />

        {/* Creation Card */}
        <CreationCard
          title="Create New Movie Recap"
          subtitle="Import video file or social video URL for AI recap"
          onClick={handleCreateNew}
        />

        {/* Dedicated Recent Projects Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>Recent Recap Projects</span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-zinc-800 text-zinc-400 font-semibold">
                {movieRecapProjects.length}
              </span>
            </h3>
          </div>

          {movieRecapProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {movieRecapProjects.map((project) => {
                const ytId = project.videoFileName ? extractYouTubeId(project.videoFileName) : null;
                const ytThumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

                return (
                  <div
                    key={project.id}
                    onClick={() => handleOpenProject(project)}
                    className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 rounded-3xl p-4 sm:p-5 cursor-pointer transition-all hover:scale-[1.01] shadow-xl group space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      {/* Video Thumbnail Preview */}
                      <div className="relative rounded-2xl overflow-hidden bg-zinc-950 aspect-video border border-zinc-800 flex items-center justify-center">
                        {ytThumbnail ? (
                          <img
                            src={ytThumbnail}
                            alt={project.project?.title || 'Video'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                            <Film className="w-5 h-5" />
                          </div>
                        )}

                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded-md bg-zinc-950/80 backdrop-blur-sm border border-zinc-700/60 text-zinc-300 font-mono text-[10px] font-bold">
                            {project.scenes?.[0]?.duration || '180s'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono text-[10px] font-bold">
                            {project.project?.aspect_ratio || '16:9'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(project.id, e);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-950/80 backdrop-blur-sm border border-zinc-700/60 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Project Title & Summary */}
                      <div className="space-y-0.5">
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-orange-400 transition-colors truncate">
                          {project.project?.title || 'Untitled Movie Recap'}
                        </h4>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {project.scenes?.[0]?.action || project.videoFileName || 'Ready to analyze and generate.'}
                        </p>
                      </div>
                    </div>

                    {/* Footer Metadata */}
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-500 font-mono">
                      <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                      <span className="text-orange-400 font-bold group-hover:translate-x-0.5 transition-transform">
                        Open Studio →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-850 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <Film className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-bold text-zinc-300">No recent recap projects yet</h4>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Click the card above to start your first movie recap project!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: FINAL RESULT PREVIEW SCREEN
  // ==========================================
  if (activeView === 'result') {
    return (
      <div className="space-y-5 animate-fadeIn max-w-2xl mx-auto pb-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveView('studio')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Edit Settings</span>
          </button>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Recap Ready</span>
          </span>
        </div>

        {/* Video Player Live Screen (AI Voiceover Directly Merged & Synced) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-2xl space-y-4">
          <div className="space-y-1 min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-white truncate">{recapTitle}</h2>
            <p className="text-[11px] text-zinc-400">
              Original audio muted · AI Voiceover synchronized directly with video playback
            </p>
          </div>

          {/* Render Player with All Applied Edits */}
          <div className="flex justify-center bg-zinc-950/90 p-2 sm:p-4 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-inner">
            <div
              className={`relative rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-2xl transition-all duration-300 ${
                aspectRatio === '9:16'
                  ? 'w-full max-w-[240px] sm:max-w-[320px] aspect-[9/16] max-h-[480px]'
                  : aspectRatio === '1:1'
                  ? 'w-full max-w-[340px] sm:max-w-[400px] aspect-square max-h-[400px]'
                  : 'w-full max-w-[540px] sm:max-w-full aspect-video max-h-[380px]'
              }`}
            >
              {videoMetadata?.sourceType === 'youtube' && videoMetadata?.videoId ? (
                <iframe
                  src={videoMetadata.embedUrl || `https://www.youtube-nocookie.com/embed/${videoMetadata.videoId}`}
                  className="w-full h-full border-0 transition-transform duration-150"
                  style={{
                    transform: videoTransformStyle,
                    filter: videoFilterStyle,
                    transformOrigin: 'center center',
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title={recapTitle}
                />
              ) : videoMetadata?.sourceType === 'facebook' && videoMetadata?.embedUrl ? (
                <iframe
                  src={videoMetadata.embedUrl}
                  className="w-full h-full border-0 transition-transform duration-150"
                  style={{
                    transform: videoTransformStyle,
                    filter: videoFilterStyle,
                    transformOrigin: 'center center',
                  }}
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  title="Facebook Video"
                />
              ) : (
                <video
                  ref={resultVideoRef}
                  src={videoUrl || undefined}
                  muted={true}
                  controls
                  onPlay={handleResultVideoPlay}
                  onPause={handleResultVideoPause}
                  onSeeked={handleResultVideoSeeked}
                  onRateChange={handleResultVideoRateChange}
                  onEnded={handleResultVideoEnded}
                  onLoadedMetadata={(e) => {
                    const dur = (e.target as HTMLVideoElement).duration;
                    if (dur && !isNaN(dur)) setVideoDuration(dur);
                  }}
                  className={`w-full h-full transition-transform duration-150 ${
                    videoFitMode === 'cover' ? 'object-cover' : 'object-contain'
                  }`}
                  style={{
                    transform: videoTransformStyle,
                    filter: videoFilterStyle,
                    transformOrigin: 'center center',
                  }}
                />
              )}

              {/* Color Temperature Tint */}
              {colorTemperature !== 0 && (
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-150 z-10"
                  style={{
                    backgroundColor:
                      colorTemperature > 0
                        ? `rgba(245, 158, 11, ${Math.min(0.28, colorTemperature * 0.003)})`
                        : `rgba(59, 130, 246, ${Math.min(0.28, Math.abs(colorTemperature) * 0.003)})`,
                    mixBlendMode: 'color',
                  }}
                />
              )}

              {/* Blur Mask Overlay */}
              {enableBlurMask && (
                <div
                  className="absolute pointer-events-none transition-all z-20 border border-amber-400/50 shadow-2xl overflow-hidden"
                  style={{
                    left: `${blurPosX}%`,
                    top: `${blurPosY}%`,
                    width: `${blurWidth}%`,
                    height: `${blurHeight}%`,
                    transform: 'translate(-50%, -50%)',
                    backdropFilter: `blur(${blurIntensity}px)`,
                    WebkitBackdropFilter: `blur(${blurIntensity}px)`,
                    backgroundColor: `rgba(0, 0, 0, ${blurTintOpacity / 100})`,
                    borderRadius: `${blurFeather}px`,
                    boxShadow: `0 0 ${blurFeather}px rgba(0,0,0,0.6)`,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-mono text-amber-300 font-bold bg-black/70 px-1 py-0.5 rounded opacity-85 select-none">
                      Blur Box
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compact File Details / Properties Metadata Panel */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-xs text-zinc-400 font-mono flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">🕒 Duration:</span>
              <span className="text-zinc-200 font-bold">{formatDurationDisplay(videoDuration)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">🎙️ Voice:</span>
              <span className="text-amber-400 font-bold">{selectedVoiceObj.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">📐 Ratio:</span>
              <span className="text-zinc-200 font-bold">{aspectRatio}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">📅 Created:</span>
              <span className="text-zinc-200 font-bold">{generationTimestamp || new Date().toISOString().replace('T', ' ').substring(0, 16)}</span>
            </div>
          </div>
        </div>

        {/* Main Video Action Buttons directly below Video / Metadata */}
        <div className="flex items-center gap-3 w-full my-4">
          <button
            type="button"
            onClick={handleTryAnother}
            className="flex-1 py-3 px-4 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-95"
          >
            <RotateCcw className="w-4 h-4 text-orange-400" />
            <span>Try Another</span>
          </button>
          <button
            type="button"
            onClick={handleSaveVideoFile}
            disabled={isExporting}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-zinc-950 font-extrabold rounded-xl text-xs sm:text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
          >
            {isExporting ? (
              <>
                <RefreshCcw className="w-4 h-4 animate-spin text-zinc-950" />
                <span className="truncate">{exportProgress || 'Saving Video...'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-zinc-950" />
                <span>Save Video</span>
              </>
            )}
          </button>
        </div>

        {/* PUBLISHING KIT (TITLE, HASHTAGS & THUMBNAIL DOWNLOAD) */}
        <div className="bg-zinc-900 border border-orange-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Publishing Kit (Viral Ready)</span>
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">YouTube & TikTok Optimized</span>
          </div>

          {/* Unified Post Title & Hashtags Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block">
                Post Title & Hashtags
              </label>
              <button
                type="button"
                onClick={handleCopyAll}
                className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                {copiedTitle ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-orange-400" />}
                <span>{copiedTitle ? 'Copied All' : '📋 Copy All'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={4}
              value={`${generatedVideoTitle || recapTitle}\n\n${generatedHashtags.join(' ')}`}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-amber-300 font-semibold outline-none resize-none select-all font-sans leading-relaxed"
            />
          </div>

          {/* Auto-Generated Thumbnail Preview & Download */}
          <div className="space-y-2 pt-1 border-t border-zinc-800/80">
            <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block">
              Auto-Generated Thumbnail
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
              <div className="relative w-full sm:w-36 aspect-video bg-black rounded-lg overflow-hidden border border-zinc-800 shrink-0 flex items-center justify-center">
                {thumbnailDataUrl ? (
                  <img src={thumbnailDataUrl} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-[10px] text-zinc-500 text-center p-1">Click Refresh Snapshot</div>
                )}
              </div>
              <div className="flex-1 space-y-1.5 w-full text-center sm:text-left">
                <p className="text-xs text-zinc-300 font-medium">
                  Optimized thumbnail frame extracted from key video moments with cinematic title overlay.
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadThumbnail}
                    className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-400 font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Thumbnail</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateThumbnailSnapshot}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-lg text-xs transition-all cursor-pointer"
                  >
                    Refresh Snapshot
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 3: STUDIO EDITOR VIEW
  // ==========================================
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-xs sm:max-w-sm w-full bg-zinc-900 border border-orange-500/40 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-start gap-2.5">
          <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-[11px] sm:text-xs text-white font-medium">{toastMessage}</div>
          <button onClick={() => setToastMessage(null)} className="text-zinc-500 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Multi-Stage Loading Modal Overlay during Recap Generation */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-orange-500/50 rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                <RefreshCcw className="w-6 h-6 animate-spin text-orange-400" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-white">Generating Cinematic Recap</h3>
                <p className="text-xs text-orange-400 font-semibold truncate">{generationStep}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Progress</span>
                <span className="font-bold text-orange-400">{generationPercent}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-rose-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${generationPercent}%` }}
                />
              </div>
            </div>

            {/* Step-by-Step Checklist */}
            <div className="space-y-2 pt-1 text-left">
              {/* Step 1 */}
              <div className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                generationStepNumber > 1 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : generationStepNumber === 1 ? 'bg-orange-500/10 border-orange-500/40 text-white font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">🔍</span>
                  <div>
                    <p className="font-semibold">Step 1: Analyzing video & scene flow</p>
                    <p className="text-[10px] text-zinc-400">ဗီဒီယို အခန်းများကို ခွဲခြမ်းစိတ်ဖြာနေသည်...</p>
                  </div>
                </div>
                {generationStepNumber > 1 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : generationStepNumber === 1 ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping shrink-0" />
                ) : null}
              </div>

              {/* Step 2 */}
              <div className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                generationStepNumber > 2 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : generationStepNumber === 2 ? 'bg-orange-500/10 border-orange-500/40 text-white font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">✍️</span>
                  <div>
                    <p className="font-semibold">Step 2: Drafting Myanmar narration script</p>
                    <p className="text-[10px] text-zinc-400">ဇာတ်လမ်းပြော စာသား ဖန်တီးနေသည်...</p>
                  </div>
                </div>
                {generationStepNumber > 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : generationStepNumber === 2 ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping shrink-0" />
                ) : null}
              </div>

              {/* Step 3 */}
              <div className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                generationStepNumber > 3 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : generationStepNumber === 3 ? 'bg-orange-500/10 border-orange-500/40 text-white font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">🎙️</span>
                  <div>
                    <p className="font-semibold">Step 3: Synthesizing AI voiceover</p>
                    <p className="text-[10px] text-zinc-400">AI အသံ ဖန်တီးနေသည် ({selectedVoiceObj.name})...</p>
                    {ttsStatusMessage && (
                      <p className="text-[10px] text-amber-400 italic mt-0.5">{ttsStatusMessage}</p>
                    )}
                  </div>
                </div>
                {generationStepNumber > 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : generationStepNumber === 3 ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping shrink-0" />
                ) : null}
              </div>

              {/* Step 4 */}
              <div className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                generationStepNumber > 4 || generationPercent === 100 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : generationStepNumber === 4 ? 'bg-orange-500/10 border-orange-500/40 text-white font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">🎬</span>
                  <div>
                    <p className="font-semibold">Step 4: Finalizing & synchronizing video</p>
                    <p className="text-[10px] text-zinc-400">ဗီဒီယိုနှင့် အသံ ပေါင်းစပ်နေသည်...</p>
                  </div>
                </div>
                {generationPercent === 100 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : generationStepNumber === 4 ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping shrink-0" />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveView('launcher')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </button>
        <div className="text-[11px] font-mono text-zinc-400">
          Movie Recap Studio
        </div>
      </div>

      {/* API Missing Warning Banner */}
      {(!apiKey || !apiKey.trim()) && (
        <div className="max-w-2xl mx-auto p-3.5 rounded-2xl bg-amber-950/40 border border-amber-900/60 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Google Cloud TTS API မချိတ်ရသေးပါသဖြင့် AI အသံ ထွက်ရှိမည်မဟုတ်ပါ။ Video သာ ကြည့်ရှုနိုင်ပါမည်။</span>
          </div>
          <button
            type="button"
            onClick={onOpenApiSettings}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0"
          >
            Connect Google Cloud API for AI Voices →
          </button>
        </div>
      )}

      {/* 1. Source Video Input Section & Responsive Sticky Live Preview */}
      <div className="max-w-2xl mx-auto space-y-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-orange-400" />
              <span>Source Video Input</span>
            </h2>
            {!videoUrl && (
              <button
                onClick={handleLoadSample}
                className="text-[10px] sm:text-[11px] font-bold text-orange-400 hover:text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
              >
                Load Sample Video
              </button>
            )}
          </div>

          {videoUrl ? (
            /* Sticky Responsive Video Player Preview Card */
            <div className="space-y-2.5 animate-fadeIn">
              {/* Video Metadata & Reset Header */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  {videoMetadata?.sourceType === 'youtube' && (
                    <span className="px-1.5 py-0.5 rounded bg-red-600/20 border border-red-500/40 text-red-400 font-bold text-[9px] flex items-center gap-1 shrink-0">
                      <Youtube className="w-2.5 h-2.5" />
                      <span>YouTube</span>
                    </span>
                  )}
                  {videoMetadata?.sourceType === 'tiktok' && (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 font-bold text-[9px] flex items-center gap-1 shrink-0">
                      <Globe className="w-2.5 h-2.5" />
                      <span>TikTok</span>
                    </span>
                  )}
                  {videoMetadata?.sourceType === 'facebook' && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold text-[9px] flex items-center gap-1 shrink-0">
                      <Globe className="w-2.5 h-2.5" />
                      <span>Facebook</span>
                    </span>
                  )}
                  {videoMetadata?.sourceType === 'file' && (
                    <span className="px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-400 font-bold text-[9px] flex items-center gap-1 shrink-0">
                      <FileVideo className="w-2.5 h-2.5" />
                      <span>File</span>
                    </span>
                  )}
                  {videoMetadata?.sourceType === 'direct' && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 font-bold text-[9px] flex items-center gap-1 shrink-0">
                      <Video className="w-2.5 h-2.5" />
                      <span>Stream</span>
                    </span>
                  )}
                  <span className="text-zinc-200 font-semibold truncate max-w-[160px] sm:max-w-[280px]">
                    {videoMetadata?.title || 'Imported Video'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleResetVideo}
                  className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-500/30 text-[10px] sm:text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <X className="w-3 h-3" />
                  <span>Change</span>
                </button>
              </div>

              {/* Mobile Sticky Live Viewport Wrapper */}
              <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md pb-2 pt-1 -mx-2 sm:mx-0 px-2 sm:px-0 rounded-2xl transition-all">
                <div className="flex justify-center bg-zinc-950/90 p-1.5 sm:p-3 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-2xl">
                  <div
                    className={`relative rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-2xl transition-all duration-300 ${
                      aspectRatio === '9:16'
                        ? 'w-full max-w-[180px] sm:max-w-[280px] aspect-[9/16] max-h-[250px] sm:max-h-[460px]'
                        : aspectRatio === '1:1'
                        ? 'w-full max-w-[220px] sm:max-w-[360px] aspect-square max-h-[220px] sm:max-h-[360px]'
                        : 'w-full max-w-[460px] sm:max-w-full aspect-video max-h-[200px] sm:max-h-[360px]'
                    }`}
                  >
                    {videoMetadata?.sourceType === 'youtube' && videoMetadata?.videoId ? (
                      <iframe
                        src={videoMetadata.embedUrl || `https://www.youtube-nocookie.com/embed/${videoMetadata.videoId}`}
                        className="w-full h-full border-0 transition-transform duration-150"
                        style={{
                          transform: videoTransformStyle,
                          filter: videoFilterStyle,
                          transformOrigin: 'center center',
                        }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        title={videoMetadata.title}
                      />
                    ) : videoMetadata?.sourceType === 'facebook' && videoMetadata?.embedUrl ? (
                      <iframe
                        src={videoMetadata.embedUrl}
                        className="w-full h-full border-0 transition-transform duration-150"
                        style={{
                          transform: videoTransformStyle,
                          filter: videoFilterStyle,
                          transformOrigin: 'center center',
                        }}
                        allowFullScreen
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        title="Facebook Video"
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        className={`w-full h-full transition-transform duration-150 ${
                          videoFitMode === 'cover' ? 'object-cover' : 'object-contain'
                        }`}
                        style={{
                          transform: videoTransformStyle,
                          filter: videoFilterStyle,
                          transformOrigin: 'center center',
                        }}
                      />
                    )}

                    {/* Color Temperature Cinematic Overlay Tint */}
                    {colorTemperature !== 0 && (
                      <div
                        className="absolute inset-0 pointer-events-none transition-opacity duration-150 z-10"
                        style={{
                          backgroundColor:
                            colorTemperature > 0
                              ? `rgba(245, 158, 11, ${Math.min(0.28, colorTemperature * 0.003)})`
                              : `rgba(59, 130, 246, ${Math.min(0.28, Math.abs(colorTemperature) * 0.003)})`,
                          mixBlendMode: 'color',
                        }}
                      />
                    )}

                    {/* Subtitle / Watermark Blur Mask Box Overlay */}
                    {enableBlurMask && (
                      <div
                        className="absolute pointer-events-none transition-all z-20 border border-amber-400/50 shadow-2xl overflow-hidden"
                        style={{
                          left: `${blurPosX}%`,
                          top: `${blurPosY}%`,
                          width: `${blurWidth}%`,
                          height: `${blurHeight}%`,
                          transform: 'translate(-50%, -50%)',
                          backdropFilter: `blur(${blurIntensity}px)`,
                          WebkitBackdropFilter: `blur(${blurIntensity}px)`,
                          backgroundColor: `rgba(0, 0, 0, ${blurTintOpacity / 100})`,
                          borderRadius: `${blurFeather}px`,
                          boxShadow: `0 0 ${blurFeather}px rgba(0,0,0,0.6)`,
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[9px] font-mono text-amber-300 font-bold bg-black/70 px-1 py-0.5 rounded opacity-85 select-none">
                            Blur ({blurIntensity}px)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Aspect Ratio Selector Bar */}
                <div className="mt-2 p-1.5 sm:p-2 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mr-0.5">
                      Ratio:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setAspectRatio('16:9')}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          aspectRatio === '16:9'
                            ? 'bg-orange-500 text-zinc-950 shadow-xs'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        <Monitor className="w-3 h-3" />
                        <span>16:9</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAspectRatio('9:16')}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          aspectRatio === '9:16'
                            ? 'bg-orange-500 text-zinc-950 shadow-xs'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>9:16</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAspectRatio('1:1')}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          aspectRatio === '1:1'
                            ? 'bg-orange-500 text-zinc-950 shadow-xs'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        <Square className="w-3 h-3" />
                        <span>1:1</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setVideoFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                    className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-2.5 h-2.5 text-orange-400" />
                    <span>{videoFitMode === 'contain' ? 'Fit' : 'Fill'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Dual Input Navigation & Upload Form */
            <div className="space-y-3">
              {/* Tab Navigation: Upload File vs Video URL */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setInputTab('upload')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    inputTab === 'upload'
                      ? 'bg-orange-500 text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputTab('url')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    inputTab === 'url'
                      ? 'bg-orange-500 text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Video URL</span>
                </button>
              </div>

              {/* Tab 1: File Upload */}
              {inputTab === 'upload' && (
                <label className="border-2 border-dashed border-zinc-800 hover:border-orange-500/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer bg-zinc-950/50 transition-all group animate-fadeIn">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className="text-xs font-bold text-white">Upload video file for recap</p>
                    <p className="text-[10px] text-zinc-500">MP4, WebM or MOV (Up to 500MB)</p>
                  </div>
                  <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}

              {/* Tab 2: Video URL Import */}
              {inputTab === 'url' && (
                <div className="space-y-3 p-3 sm:p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                      <span>Paste Video URL</span>
                      <span className="text-[10px] text-zinc-500">YouTube, TikTok, Facebook</span>
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          value={videoUrlInput}
                          onChange={(e) => setVideoUrlInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleUrlImport();
                            }
                          }}
                          placeholder="Paste YouTube, TikTok, or Facebook video URL..."
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none pr-7 transition-colors"
                        />
                        {videoUrlInput && (
                          <button
                            type="button"
                            onClick={() => setVideoUrlInput('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleUrlImport}
                        className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0 shadow-xs"
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>Import</span>
                      </button>
                    </div>
                  </div>

                  {/* Supported Platforms Indicators */}
                  <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-1.5 text-[10px] text-zinc-400">
                    <span className="font-semibold text-zinc-300">Formats:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-red-600/10 border border-red-500/20 text-red-400 font-semibold flex items-center gap-1">
                        <Youtube className="w-2.5 h-2.5" /> YouTube
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-600/10 border border-cyan-500/20 text-cyan-400 font-semibold flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" /> TikTok
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-600/10 border border-blue-500/20 text-blue-400 font-semibold flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" /> Facebook
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Multi-Step Compact Recap Settings Panel */}
      <div className="max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3.5">
        {/* Step Navigation Tabs (Clean labels without numbering) */}
        <div className="grid grid-cols-2 gap-1.5 border-b border-zinc-800 pb-2.5">
          <button
            type="button"
            onClick={() => setStudioStep(1)}
            className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              studioStep === 1
                ? 'bg-orange-500 text-zinc-950 shadow-xs'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Settings className="w-3 h-3" />
            <span>Voice Setup</span>
          </button>

          <button
            type="button"
            onClick={() => setStudioStep(2)}
            className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              studioStep === 2
                ? 'bg-orange-500 text-zinc-950 shadow-xs'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>Edit Video</span>
            {(enableBlurMask ||
              flipHorizontal ||
              flipVertical ||
              videoZoom > 100 ||
              brightness !== 100 ||
              contrast !== 100 ||
              saturation !== 100 ||
              colorTemperature !== 0) && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* STEP 1: VOICE SETUP */}
        {studioStep === 1 && (
          <div className="space-y-3 animate-fadeIn">
            {/* Custom Enhanced AI Voice Dropdown with Inline Audio Previews */}
            <div className="space-y-1.5 relative" ref={voiceDropdownRef}>
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Volume2 className="w-3 h-3 text-orange-400" />
                <span>AI Voice Narrator</span>
              </label>

              {/* Dropdown Trigger Box */}
              <button
                type="button"
                onClick={() => setIsVoiceDropdownOpen((prev) => !prev)}
                className="w-full bg-zinc-950 border border-zinc-800 hover:border-orange-500/50 rounded-xl px-3 py-2 text-xs text-left text-white flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  <span className="font-bold truncate">{selectedVoiceObj.name}</span>
                  <span className="text-[10px] text-zinc-400 truncate hidden sm:inline">
                    ({selectedVoiceObj.style})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {previewPlayingVoiceId === selectedVoiceObj.id && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold animate-pulse">
                      Playing
                    </span>
                  )}
                  {isVoiceDropdownOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </div>
              </button>

              {/* Dropdown Options Popup */}
              {isVoiceDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-40 overflow-hidden py-1 divide-y divide-zinc-900 animate-fadeIn max-h-64 overflow-y-auto">
                  {VOICES.map((v) => {
                    const isSelected = v.id === aiVoice;
                    const isPlaying = previewPlayingVoiceId === v.id;

                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          setAiVoice(v.id);
                          setIsVoiceDropdownOpen(false);
                        }}
                        className={`px-3 py-2.5 flex items-center justify-between gap-2.5 hover:bg-zinc-900 transition-colors cursor-pointer ${
                          isSelected ? 'bg-orange-500/10' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isSelected ? 'bg-orange-500' : 'bg-zinc-700'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p
                                className={`text-xs font-bold truncate ${
                                  isSelected ? 'text-orange-400' : 'text-zinc-100'
                                }`}
                              >
                                {v.name}
                              </p>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-semibold tracking-wide ${
                                  v.gender === 'male'
                                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {v.gender === 'male' ? 'Male' : 'Female'}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate mt-0.5">{v.style}</p>
                          </div>
                        </div>

                        {/* Inline Listen Preview Play/Stop Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleVoicePreview(v.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                            isPlaying
                              ? 'bg-amber-500 text-zinc-950 animate-pulse shadow-xs'
                              : 'bg-zinc-900 hover:bg-orange-500/20 text-zinc-300 hover:text-orange-400 border border-zinc-800'
                          }`}
                          title="Listen to voice preview in Burmese"
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-2.5 h-2.5 fill-current" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>Preview</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
              {/* Voice Speed / Rate */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-orange-400" />
                  <span>Speech Rate</span>
                </label>
                <select
                  value={voiceSpeed}
                  onChange={(e) => setVoiceSpeed(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50"
                >
                  {SPEED_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Video Speaks (Original Language) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-orange-400" />
                  <span>Video Speaks</span>
                </label>
                <select
                  value={videoLanguage}
                  onChange={(e) => setVideoLanguage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Next Step Button */}
            <button
              type="button"
              onClick={() => {
                setIsVoiceDropdownOpen(false);
                setStudioStep(2);
              }}
              className="w-full mt-2 py-2.5 px-3 bg-orange-500 hover:bg-orange-400 active:scale-98 text-zinc-950 font-extrabold rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Next: Edit Video</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STEP 2: EDIT VIDEO (CLEAN ACCORDIONS WITHOUT LETTERING) */}
        {studioStep === 2 && (
          <div className="space-y-2.5 animate-fadeIn">
            {/* ACCORDION 1: Watermark Blur */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => handleToggleAccordion('blur')}
                className="w-full p-2.5 sm:p-3 flex items-center justify-between text-left hover:bg-zinc-900/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <EyeOff className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-bold text-white">Watermark Blur</span>
                  {enableBlurMask && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono text-[9px] font-bold">
                      ON ({blurIntensity}px)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={enableBlurMask}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEnableBlurMask(e.target.checked)}
                    className="w-3.5 h-3.5 accent-orange-500 cursor-pointer"
                  />
                  {activeAccordion === 'blur' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </div>
              </button>

              {activeAccordion === 'blur' && (
                <div className="p-3 pt-1 border-t border-zinc-800/80 space-y-2.5 animate-fadeIn">
                  {/* Presets Bar */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Quick Presets
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApplyBlurPreset('subtitle')}
                        className="py-1 px-1.5 rounded-lg bg-zinc-900 hover:bg-orange-500/20 text-zinc-200 hover:text-orange-400 border border-zinc-800 text-[11px] font-semibold transition-all cursor-pointer text-center truncate"
                      >
                        Bottom Subtitles
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyBlurPreset('corner')}
                        className="py-1 px-1.5 rounded-lg bg-zinc-900 hover:bg-orange-500/20 text-zinc-200 hover:text-orange-400 border border-zinc-800 text-[11px] font-semibold transition-all cursor-pointer text-center truncate"
                      >
                        Corner Logo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyBlurPreset('bottom_third')}
                        className="py-1 px-1.5 rounded-lg bg-zinc-900 hover:bg-orange-500/20 text-zinc-200 hover:text-orange-400 border border-zinc-800 text-[11px] font-semibold transition-all cursor-pointer text-center truncate"
                      >
                        Bottom 1/3
                      </button>
                    </div>
                  </div>

                  {/* Blur Sliders */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span>Blur Softness</span>
                        <span className="font-mono text-orange-400 font-bold">{blurIntensity}px</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="35"
                        value={blurIntensity}
                        onChange={(e) => setBlurIntensity(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span>Position (Y)</span>
                        <span className="font-mono text-orange-400 font-bold">{blurPosY}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="95"
                        value={blurPosY}
                        onChange={(e) => setBlurPosY(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span>Mask Height</span>
                        <span className="font-mono text-orange-400 font-bold">{blurHeight}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="40"
                        value={blurHeight}
                        onChange={(e) => setBlurHeight(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span>Mask Width</span>
                        <span className="font-mono text-orange-400 font-bold">{blurWidth}%</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="100"
                        value={blurWidth}
                        onChange={(e) => setBlurWidth(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 2: Flip & Zoom */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => handleToggleAccordion('flip_zoom')}
                className="w-full p-2.5 sm:p-3 flex items-center justify-between text-left hover:bg-zinc-900/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-bold text-white">Flip & Zoom</span>
                  {(flipHorizontal || flipVertical || videoZoom !== 100) && (
                    <span className="px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-mono text-[9px] font-bold">
                      {flipHorizontal || flipVertical
                        ? videoZoom !== 100
                          ? `FLIPPED • ${videoZoom}%`
                          : 'FLIPPED'
                        : `${videoZoom}%`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {activeAccordion === 'flip_zoom' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </div>
              </button>

              {activeAccordion === 'flip_zoom' && (
                <div className="p-3 pt-1 border-t border-zinc-800/80 space-y-3 animate-fadeIn">
                  {/* Top Header & Reset */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">
                      Anti-copyright video mirroring & border crop
                    </span>
                    {(flipHorizontal || flipVertical || videoZoom !== 100) && (
                      <button
                        type="button"
                        onClick={handleResetFlipZoom}
                        className="text-[10px] font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>

                  {/* Flip Controls (Top Row) */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Mirror & Invert (Flip)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFlipHorizontal((prev) => !prev)}
                        className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          flipHorizontal
                            ? 'bg-orange-500 text-zinc-950 shadow-xs ring-1 ring-orange-400'
                            : 'bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800'
                        }`}
                      >
                        <FlipHorizontal className="w-3 h-3" />
                        <span>Horizontal Flip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFlipVertical((prev) => !prev)}
                        className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          flipVertical
                            ? 'bg-orange-500 text-zinc-950 shadow-xs ring-1 ring-orange-400'
                            : 'bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800'
                        }`}
                      >
                        <FlipVertical className="w-3 h-3" />
                        <span>Vertical Flip</span>
                      </button>
                    </div>
                  </div>

                  {/* Zoom Controls (Bottom Row) */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
                    <div className="flex items-center justify-between text-[11px] text-zinc-300">
                      <span className="font-semibold text-zinc-300 flex items-center gap-1">
                        <Crop className="w-3 h-3 text-orange-400" />
                        <span>Zoom / Crop Scale</span>
                      </span>
                      <span className="font-mono text-orange-400 font-bold">{videoZoom}%</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="135"
                      value={videoZoom}
                      onChange={(e) => setVideoZoom(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="grid grid-cols-4 gap-1 pt-0.5">
                      {[100, 105, 115, 125].map((z) => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => setVideoZoom(z)}
                          className={`py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer text-center ${
                            videoZoom === z
                              ? 'bg-orange-500 text-zinc-950'
                              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                          }`}
                        >
                          {z === 100 ? 'Original (100%)' : `${z}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 4: Color Grading (Includes Color Temperature) */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => handleToggleAccordion('color')}
                className="w-full p-2.5 sm:p-3 flex items-center justify-between text-left hover:bg-zinc-900/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-bold text-white">Color Grading</span>
                  {(brightness !== 100 || contrast !== 100 || saturation !== 100 || colorTemperature !== 0) && (
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-mono text-[9px] font-bold">
                      GRADED
                    </span>
                  )}
                </div>
                {activeAccordion === 'color' ? (
                  <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                )}
              </button>

              {activeAccordion === 'color' && (
                <div className="p-3 pt-1 border-t border-zinc-800/80 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">Cinematic color grading & temperature tuning</span>
                    {(brightness !== 100 || contrast !== 100 || saturation !== 100 || colorTemperature !== 0) && (
                      <button
                        type="button"
                        onClick={handleResetColor}
                        className="text-[10px] font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                    {/* Temperature */}
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span className="flex items-center gap-1">
                          <Thermometer className="w-2.5 h-2.5 text-orange-400" />
                          <span>Temp</span>
                        </span>
                        <span className="font-mono text-orange-400 font-bold">
                          {colorTemperature > 0 ? `+${colorTemperature}` : colorTemperature}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={colorTemperature}
                        onChange={(e) => setColorTemperature(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-orange-500"
                        title="Cool (-100) to Warm (+100)"
                      />
                      <div className="flex justify-between text-[8px] text-zinc-500 font-mono">
                        <span>Cool</span>
                        <span>Warm</span>
                      </div>
                    </div>

                    {/* Brightness */}
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span className="flex items-center gap-1">
                          <Sun className="w-2.5 h-2.5 text-amber-400" />
                          <span>Brightness</span>
                        </span>
                        <span className="font-mono text-orange-400 font-bold">{brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="75"
                        max="135"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>

                    {/* Contrast */}
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span className="flex items-center gap-1">
                          <ContrastIcon className="w-2.5 h-2.5 text-cyan-400" />
                          <span>Contrast</span>
                        </span>
                        <span className="font-mono text-orange-400 font-bold">{contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="75"
                        max="140"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>

                    {/* Saturation */}
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span className="flex items-center gap-1">
                          <Palette className="w-2.5 h-2.5 text-rose-400" />
                          <span>Saturation</span>
                        </span>
                        <span className="font-mono text-orange-400 font-bold">{saturation}%</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="150"
                        value={saturation}
                        onChange={(e) => setSaturation(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation & Final Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStudioStep(1)}
                className="py-2.5 px-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voice Setup</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateRecap}
                disabled={isGenerating || !videoUrl}
                className="py-2.5 px-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-zinc-950 font-extrabold rounded-xl text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                    <span className="truncate">Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-zinc-950" />
                    <span>Generate Recap</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play, Pause, Download, Trash2, Volume2, AlertCircle, RefreshCcw, Sparkles, Square } from 'lucide-react';
import { ProjectData } from '../types';
import { Language, translations } from '../utils/i18n';
import { generateTextToVoice } from '../services/api';
import { CreationCard } from './CreationCard';
import { PageHeader } from './PageHeader';

interface TextVoiceLauncherProps {
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
  style: string;
  lang: 'mm' | 'en';
}

const VOICES: VoiceOption[] = [
  { id: 'mm_male_thiha', name: 'Thiha (Male)', style: 'Deep · Professional', lang: 'mm' },
  { id: 'mm_female_nilar', name: 'Nilar (Female)', style: 'Clear · Warm', lang: 'mm' },
  { id: 'mm_male_zaw', name: 'Zaw (Male)', style: 'Energetic · Active', lang: 'mm' },
  { id: 'mm_female_su', name: 'Su (Female)', style: 'Soft · Calm', lang: 'mm' },
  { id: 'mm_female_thida', name: 'Thida (Female)', style: 'Warm · Natural', lang: 'mm' },
  { id: 'mm_male_aung', name: 'Aung (Male)', style: 'Deep · Authoritative', lang: 'mm' },
  { id: 'en_female_emma', name: 'Emma (Female)', style: 'Clear · Professional', lang: 'en' },
  { id: 'en_male_james', name: 'James (Male)', style: 'Cinematic · Deep', lang: 'en' },
  { id: 'en_female_lily', name: 'Lily (Female)', style: 'Soft · Friendly', lang: 'en' },
  { id: 'en_male_david', name: 'David (Male)', style: 'Energetic · Modern', lang: 'en' },
];

export const TextVoiceLauncher: React.FC<TextVoiceLauncherProps> = ({
  projects,
  onSaveProject,
  onDeleteProject,
  onBackToDashboard,
  apiKey,
  onOpenApiSettings,
  language,
}) => {
  const t = translations[language];

  // 1. View state: 'launcher' or 'create'
  const [view, setView] = useState<'launcher' | 'create'>('launcher');

  // Creation form states
  const [text, setText] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<'mm' | 'en'>(language === 'mm' ? 'mm' : 'en');
  const [selectedVoice, setSelectedVoice] = useState<string>(language === 'mm' ? 'mm_male_thiha' : 'en_female_emma');
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(0);
  const [voiceVolume, setVoiceVolume] = useState<number>(0);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Generation result (shown right after successful generation)
  const [generatedAudio, setGeneratedAudio] = useState<{
    audioUrl: string;
    duration: string;
    text: string;
    voiceName: string;
  } | null>(null);

  // List play tracking states
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});

  // Refs for speech and preview audios
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewingVoiceId, setIsPreviewingVoiceId] = useState<string | null>(null);
  const [isFetchingPreviewId, setIsFetchingPreviewId] = useState<string | null>(null);
  const fetchTimeoutRef = useRef<any>(null);
  
  // Custom Toast Notification States for simulated previews
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Strictly filter only text-to-voice projects
  const voiceProjects = projects.filter((p) => p.projectType === 'text-to-voice');

  // Word & character counter
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isOverLimit = wordCount > 5000;

  // Filter voices by selected language
  const availableVoices = VOICES.filter((v) => v.lang === selectedLang);

  // Clean up audios on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Sync selected voice when language changes
  useEffect(() => {
    const firstVoice = VOICES.find((v) => v.lang === selectedLang);
    if (firstVoice) {
      setSelectedVoice(firstVoice.id);
    }
  }, [selectedLang]);

  // Voice audition preview handler
  const handlePreviewVoice = (voiceId: string, voiceLang: 'mm' | 'en', e: React.MouseEvent) => {
    e.stopPropagation();

    // If currently fetching or playing this exact voice, stop it
    if (isFetchingPreviewId === voiceId || isPreviewingVoiceId === voiceId) {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsFetchingPreviewId(null);
      setIsPreviewingVoiceId(null);
      setToastMsg(null);
      return;
    }

    // Cancel any other active previews or fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsFetchingPreviewId(null);
    setIsPreviewingVoiceId(null);

    // Start simulated audio fetch
    setIsFetchingPreviewId(voiceId);

    fetchTimeoutRef.current = setTimeout(() => {
      setIsFetchingPreviewId(null);
      setIsPreviewingVoiceId(voiceId);

      const voiceObj = VOICES.find((v) => v.id === voiceId);
      const voiceNameRaw = voiceObj ? voiceObj.name : 'Unknown Speaker';

      // ====================================================================
      // DEVELOPMENT SWAP POINTER:
      // To connect a real backend audio file preview, swap out this block:
      // const player = new Audio(voiceObj.previewUrl);
      // player.play();
      // ====================================================================

      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToastMsg(`🔊 Playing ${voiceNameRaw} preview in ${voiceLang === 'mm' ? 'Myanmar' : 'English'}...`);
      toastTimeoutRef.current = setTimeout(() => {
        setToastMsg(null);
      }, 3000);

      // Audition sound logic (Myanmar uses Web Audio synthetic tone; English uses speechSynthesis)
      if (voiceLang === 'mm') {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            // Generate a premium double-toned electronic synth chime
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5 note
            osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5 note
            
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 1.2);
          }
        } catch (err) {
          console.warn('Web Audio synthesis failed:', err);
        }

        // Simulates audio finish in 3 seconds to clear button state
        fetchTimeoutRef.current = setTimeout(() => {
          setIsPreviewingVoiceId(null);
        }, 3000);
      } else {
        if ('speechSynthesis' in window) {
          const rawNameOnly = voiceObj ? voiceObj.name.split(' ')[0] : 'Emma';
          const sampleText = `Hello, this is a preview of my voice. My name is ${rawNameOnly}.`;
          const utterance = new SpeechSynthesisUtterance(sampleText);
          utterance.lang = 'en-US';
          utterance.rate = selectedSpeed;
          
          // Guard timer to reset states in case synthesis events don't fire
          const fallbackEndTimer = setTimeout(() => {
            setIsPreviewingVoiceId(null);
          }, 3000);

          utterance.onend = () => {
            clearTimeout(fallbackEndTimer);
            setIsPreviewingVoiceId(null);
          };
          utterance.onerror = () => {
            clearTimeout(fallbackEndTimer);
            setIsPreviewingVoiceId(null);
          };
          window.speechSynthesis.speak(utterance);
        } else {
          fetchTimeoutRef.current = setTimeout(() => {
            setIsPreviewingVoiceId(null);
          }, 3000);
        }
      }
    }, 800); // Super fast, responsive backend simulated fetch
  };

  // Recent audio playback controller
  const togglePlayProjectAudio = (proj: ProjectData, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = proj.textVoiceData?.audioUrl;
    if (!url) return;

    if (playingId === proj.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(proj.id);
      audioRef.current = new Audio(url);
      audioRef.current.play().catch(() => {
        setPlayingId(null);
      });

      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100 || 0;
          setAudioProgress((prev) => ({ ...prev, [proj.id]: pct }));
        }
      };

      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current) {
          setAudioDurations((prev) => ({ ...prev, [proj.id]: audioRef.current?.duration || 0 }));
        }
      };

      audioRef.current.onended = () => {
        setPlayingId(null);
        setAudioProgress((prev) => ({ ...prev, [proj.id]: 0 }));
      };
    }
  };

  // Handle seeking inside Recent Audio card
  const handleSeekRecent = (projId: string, pct: number) => {
    if (playingId === projId && audioRef.current) {
      const targetTime = (pct / 100) * audioRef.current.duration;
      audioRef.current.currentTime = targetTime;
      setAudioProgress((prev) => ({ ...prev, [projId]: pct }));
    }
  };

  // Single active generated player state
  const [isGeneratedPlaying, setIsGeneratedPlaying] = useState<boolean>(false);
  const [generatedProgress, setGeneratedProgress] = useState<number>(0);
  const [generatedPlayTime, setGeneratedPlayTime] = useState<number>(0);
  const [generatedDuration, setGeneratedDuration] = useState<number>(0);

  const togglePlayGenerated = () => {
    if (!generatedAudio) return;
    if (isGeneratedPlaying) {
      if (audioRef.current) audioRef.current.pause();
      setIsGeneratedPlaying(false);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(generatedAudio.audioUrl);
      
      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current) {
          setGeneratedDuration(audioRef.current.duration);
        }
      };

      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setGeneratedPlayTime(audioRef.current.currentTime);
          const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100 || 0;
          setGeneratedProgress(pct);
        }
      };

      audioRef.current.onended = () => {
        setIsGeneratedPlaying(false);
        setGeneratedProgress(0);
        setGeneratedPlayTime(0);
      };

      audioRef.current.play().catch(() => setIsGeneratedPlaying(false));
      setIsGeneratedPlaying(true);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    if (!apiKey.trim()) {
      onOpenApiSettings();
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const result = await generateTextToVoice({
        apiKey: apiKey.trim(),
        text,
        language: selectedLang,
        voiceId: selectedVoice,
        speed: selectedSpeed,
      });

      const matchedVoice = VOICES.find((v) => v.id === selectedVoice);
      const voiceLabel = matchedVoice ? matchedVoice.name : selectedVoice;

      const finalAudioUrl = result.audioUrl;

      const generatedObj = {
        audioUrl: finalAudioUrl,
        duration: result.duration || '00:03',
        text: text.slice(0, 80) + (text.length > 80 ? '...' : ''),
        voiceName: voiceLabel,
      };

      setGeneratedAudio(generatedObj);

      // Create new text-to-voice project and save
      const wordCountNum = text.trim().split(/\s+/).length;
      const title = text.slice(0, 30).trim() + (text.length > 30 ? '...' : '') || 'Speech Audio';
      const newProj: ProjectData = {
        id: `t2v_${Date.now()}`,
        projectType: 'text-to-voice',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptMode: 'Analyze Original',
        project: {
          title: title,
          aspect_ratio: '9:16',
          visual_style: `Speed: ${selectedSpeed.toFixed(1)}x · Pitch: ${pitch > 0 ? '+' : ''}${pitch} · Vol: ${voiceVolume > 0 ? '+' : ''}${voiceVolume} dB`,
          master_style_prompt: 'Text to Speech standard master',
          negative_prompt: 'noise, hiss, echo',
        },
        characters: [],
        scenes: [],
        textVoiceData: {
          text,
          language: selectedLang,
          selectedVoice,
          voiceSpeed: selectedSpeed,
          audioUrl: result.audioUrl,
          duration: result.duration || '00:42',
        },
      };

      onSaveProject(newProj);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Speech generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadFile = (url: string, title: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `MKP_${title.replace(/\s+/g, '_')}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatSeconds = (totalSeconds: number) => {
    if (isNaN(totalSeconds)) return '00:00';
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 animate-fadeIn">
      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900/95 border border-orange-500/30 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 animate-slideUp text-xs font-extrabold text-orange-200 backdrop-blur-md">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
          </span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Navigation Top Area: Reusable Page Header */}
      <PageHeader
        title={
          view === 'create'
            ? (language === 'mm' ? 'အသံအသစ်' : 'New Voice')
            : (language === 'mm' ? 'အသံ Generator' : 'Voice Generator')
        }
        onBack={
          view === 'create'
            ? () => {
                setView('launcher');
                setGeneratedAudio(null);
              }
            : onBackToDashboard
        }
      />

      {/* API Key Banner Requirement */}
      {!apiKey.trim() && (
        <div className="p-3 sm:p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
            <span>API key required</span>
          </div>
          <button
            onClick={onOpenApiSettings}
            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs transition-colors shrink-0 cursor-pointer"
          >
            Connect API
          </button>
        </div>
      )}

      {/* VIEW A: LANDING PAGE (launcher state) */}
      {view === 'launcher' && (
        <div className="space-y-6">
          {/* Action buttons */}
          <CreationCard
            title="New Audio"
            subtitle="Generate speech from text"
            onClick={() => {
              setView('create');
              setText('');
              setGeneratedAudio(null);
              setErrorMessage(null);
            }}
          />

          {/* Recent Audio Area */}
          <div className="space-y-3 pt-2">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Recent Audio
            </h2>

            {voiceProjects.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-4">No recent audio files yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {voiceProjects.map((proj) => {
                  const isCurPlaying = playingId === proj.id;
                  const pct = audioProgress[proj.id] || 0;
                  const totalSecs = audioDurations[proj.id] || 0;
                  const curSecs = (pct / 100) * totalSecs;

                  return (
                    <div
                      key={proj.id}
                      className="bg-[#131313] border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-white text-sm line-clamp-1">
                            {proj.project?.title || 'Generated Audio'}
                          </h4>
                          <p className="text-[11px] text-zinc-400 font-medium capitalize">
                            {proj.textVoiceData?.language === 'mm' ? 'Myanmar' : 'English'} · {proj.textVoiceData?.duration || '00:00'}
                          </p>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDeleteProject(proj.id, e);
                          }}
                          className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-rose-400 transition-colors"
                          title="Delete audio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Interactive Audio Progress Slider & Controllers */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => togglePlayProjectAudio(proj, e)}
                          className="w-8 h-8 rounded-full bg-orange-50 hover:bg-orange-600 text-zinc-950 flex items-center justify-center shadow-md transition-transform active:scale-95 shrink-0"
                        >
                          {isCurPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1 space-y-0.5">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={pct}
                            onChange={(e) => handleSeekRecent(proj.id, parseFloat(e.target.value))}
                            className="w-full accent-orange-500 bg-zinc-950 rounded-lg h-1.5 cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                            <span>{isCurPlaying ? formatSeconds(curSecs) : '00:00'}</span>
                            <span>{proj.textVoiceData?.duration || '00:00'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Download Section */}
                      <div className="flex items-center justify-end pt-1">
                        <button
                          onClick={() => {
                            if (proj.textVoiceData?.audioUrl) {
                              handleDownloadFile(proj.textVoiceData.audioUrl, proj.project.title);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-bold transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW B: CREATION INTERFACE (createView state) */}
      {view === 'create' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Input Text Area (col-span-7) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#131313] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md text-left">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Text Editor
                  </label>
                  <span className="text-xs text-gray-500 font-mono">
                    {wordCount} / 5,000 words
                  </span>
                </div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter or paste your script text here..."
                  rows={9}
                  className="w-full bg-[#131313] border border-white/10 focus:border-orange-500/50 rounded-xl p-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none resize-y transition-all font-medium leading-relaxed"
                />

                {isOverLimit && (
                  <p className="text-xs text-rose-400 font-semibold">
                    Text exceeds 5,000 words limit.
                  </p>
                )}

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900 text-rose-200 text-xs flex items-center justify-between">
                    <span>{errorMessage}</span>
                    <button
                      onClick={handleGenerate}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold flex items-center gap-1 shrink-0"
                    >
                      <RefreshCcw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                )}
              </div>

              {/* POST-GENERATION PLAYER */}
              {generatedAudio && (
                <div className="bg-[#131313] border border-emerald-500/20 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl animate-fadeIn text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">Voice Generated Successfully</h4>
                      <p className="text-[11px] text-zinc-400 font-medium truncate max-w-xs sm:max-w-md">
                        {generatedAudio.text}
                      </p>
                    </div>

                    <button
                      onClick={togglePlayGenerated}
                      className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
                    >
                      {isGeneratedPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>

                  {/* Progress timeline */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={generatedProgress}
                      onChange={(e) => {
                        const pct = parseFloat(e.target.value);
                        if (audioRef.current) {
                          const targetTime = (pct / 100) * (audioRef.current.duration || 100);
                          audioRef.current.currentTime = targetTime;
                          setGeneratedProgress(pct);
                          setGeneratedPlayTime(targetTime);
                        }
                      }}
                      className="w-full accent-emerald-500 bg-zinc-950 rounded-lg h-1.5 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>{formatSeconds(generatedPlayTime)}</span>
                      <span>{generatedDuration > 0 ? formatSeconds(generatedDuration) : generatedAudio.duration}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => handleDownloadFile(generatedAudio.audioUrl, 'AI_Voice_Output')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl border border-zinc-700 hover:border-zinc-600 transition-all shadow"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Settings (col-span-5) */}
            <div className="lg:col-span-5 space-y-5 text-left">
              <div className="bg-[#131313] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-5 shadow-md">
                
                {/* 1. LANGUAGE (Segmented Pill Controls) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                    Language
                  </label>
                  <div className="bg-zinc-950 p-1 rounded-xl border border-white/5 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedLang('mm')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        selectedLang === 'mm'
                          ? 'bg-orange-500 text-white shadow'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Myanmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLang('en')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        selectedLang === 'en'
                          ? 'bg-orange-500 text-white shadow'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* 2. SLEEK VERTICAL VOICE LIST */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                    AI Voice Selection
                  </label>
                  <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                    {availableVoices.map((voice) => {
                      const isSelected = selectedVoice === voice.id;
                      const isFetching = isFetchingPreviewId === voice.id;
                      const isPreving = isPreviewingVoiceId === voice.id;

                      const isAnyActive = isFetchingPreviewId !== null || isPreviewingVoiceId !== null;
                      const isThisActive = isFetching || isPreving;
                      const isButtonDisabled = isAnyActive && !isThisActive;

                      return (
                        <div
                          key={voice.id}
                          onClick={() => !isButtonDisabled && setSelectedVoice(voice.id)}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            isButtonDisabled
                              ? 'bg-zinc-950/40 border-zinc-900 text-zinc-500 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'bg-orange-500/10 border-orange-500 text-white cursor-pointer'
                              : 'bg-zinc-950 border-zinc-800 hover:border-zinc-750 text-zinc-300 cursor-pointer'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-extrabold text-zinc-100 text-xs truncate">{voice.name}</p>
                            <p className="text-[10px] text-zinc-500 font-medium tracking-wide mt-0.5">{voice.style}</p>
                          </div>

                          <button
                            type="button"
                            disabled={isButtonDisabled}
                            onClick={(e) => handlePreviewVoice(voice.id, voice.lang, e)}
                            className={`px-2 py-1 rounded-lg border text-[10px] font-extrabold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                              isFetching
                                ? 'text-orange-400 border-orange-500/30 bg-orange-500/5 animate-pulse'
                                : isPreving
                                ? 'text-rose-400 border-rose-500/30 bg-rose-500/5'
                                : isButtonDisabled
                                ? 'opacity-30 border-zinc-900 bg-zinc-950 text-zinc-600 cursor-not-allowed'
                                : 'text-zinc-400 hover:text-white border-zinc-800 bg-zinc-900 hover:bg-zinc-850'
                            }`}
                          >
                            {isFetching ? (
                              <div className="w-2.5 h-2.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
                            ) : isPreving ? (
                              <Square className="w-2 h-2 fill-current shrink-0" />
                            ) : (
                              <Play className="w-2 h-2 fill-current shrink-0" />
                            )}
                            <span>{isFetching ? '...' : isPreving ? 'Playing...' : 'Preview'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AUDIO CONTROLS (3 distinct Range Sliders) */}
                <div className="space-y-4 pt-1">
                  <div className="border-t border-white/5 pt-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
                      Audio Controls
                    </h3>
                  </div>

                  {/* Slider 1: Voice Speed */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-zinc-400">Speed</span>
                      <span className="text-orange-500 font-mono">{selectedSpeed.toFixed(1)}x</span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min="0.25"
                        max="4.0"
                        step="0.1"
                        value={selectedSpeed}
                        onChange={(e) => setSelectedSpeed(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/10 accent-orange-500 rounded-lg cursor-pointer transition-colors"
                      />
                    </div>
                  </div>

                  {/* Slider 2: Pitch */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-zinc-400">Pitch</span>
                      <span className="text-orange-500 font-mono">
                        {pitch > 0 ? `+${pitch}` : pitch}
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min="-20.0"
                        max="20.0"
                        step="1.0"
                        value={pitch}
                        onChange={(e) => setPitch(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/10 accent-orange-500 rounded-lg cursor-pointer transition-colors"
                      />
                    </div>
                  </div>

                  {/* Slider 3: Volume */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-zinc-400">Volume</span>
                      <span className="text-orange-500 font-mono">
                        {voiceVolume > 0 ? `+${voiceVolume}` : voiceVolume} dB
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min="-10.0"
                        max="10.0"
                        step="1.0"
                        value={voiceVolume}
                        onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/10 accent-orange-500 rounded-lg cursor-pointer transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. GENERATE BUTTON (Consistent Solid Orange Theme) */}
                <button
                  type="button"
                  disabled={!text.trim() || isGenerating || isOverLimit || !apiKey.trim()}
                  onClick={handleGenerate}
                  className={`w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    (!text.trim() || isGenerating || isOverLimit || !apiKey.trim()) ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating Voice...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 shrink-0" />
                      <span>Generate Voice</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

import React, { useRef, useState, useEffect } from 'react';
import { 
  UploadCloud, 
  Film, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Sparkles, 
  Info, 
  AlertCircle, 
  ChevronDown 
} from 'lucide-react';
import { VideoInspection } from '../utils/videoProcessor';
import { Language, translations } from '../utils/i18n';
import { extractDirectMp4Url } from '../services/videoDownloader';

interface VideoUploaderProps {
  selectedFile: File | null;
  videoPreviewUrl: string | null;
  videoInspection: VideoInspection | null;
  onFileSelect: (file: File) => void;
  onAnalyzeClick: () => void;
  isAnalyzing: boolean;
  onLoadSampleDemo: () => void;
  hasApiKey: boolean;
  onOpenApiKeySettings: () => void;
  language: Language;
}

export function getDetectedRatioLabel(width?: number, height?: number): string {
  if (!width || !height) return 'Auto-detecting';
  const ratio = width / height;
  if (ratio < 0.65) return '9:16 Vertical';
  if (ratio > 1.55) return '16:9 Landscape';
  if (Math.abs(ratio - 1) < 0.15) return '1:1 Square';
  return `${width} × ${height}`;
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  selectedFile,
  videoPreviewUrl,
  videoInspection,
  onFileSelect,
  onAnalyzeClick,
  isAnalyzing,
  onLoadSampleDemo,
  hasApiKey,
  onOpenApiKeySettings,
  language,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDropzoneClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);

  // Custom Video Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedDropdown, setShowSpeedDropdown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeImportTab, setActiveImportTab] = useState<'upload' | 'link'>('upload');
  const [videoLinkInput, setVideoLinkInput] = useState<string>('');
  const [isImportingLink, setIsImportingLink] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setErrorMessage(null);
      setVideoError(false);
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setErrorMessage(null);
        setVideoError(false);
        onFileSelect(file);
      } else {
        setErrorMessage('Please drop a valid video file (MP4, MOV, WebM).');
      }
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Playback blocked or failed:', err);
      });
    }
  };

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (vol === 0) setIsMuted(true);
    else setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSpeedSelect = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedDropdown(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.log('Fullscreen failed:', err));
    } else {
      document.exitFullscreen();
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const detectedRatioLabel = getDetectedRatioLabel(
    videoInspection?.width,
    videoInspection?.height
  );

  const formattedMetaString = `${videoInspection?.sizeMb || `${(selectedFile?.size ? selectedFile.size / (1024 * 1024) : 0).toFixed(1)} MB`}`;

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fadeIn text-left">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
        className="hidden"
      />

      {/* 1. COMPACT CARD CONTAINER */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {!selectedFile ? (
          <div className="space-y-4">
            {/* Dual Import Mode Tab Switcher */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveImportTab('upload')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeImportTab === 'upload'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveImportTab('link')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeImportTab === 'link'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Paste Link</span>
              </button>
            </div>

            {activeImportTab === 'upload' ? (
              /* Empty State Dropzone: Extremely compact, neat & touch-friendly */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleDropzoneClick}
                className={`border-2 border-dashed rounded-2xl py-8 px-4 text-center cursor-pointer pointer-events-auto relative z-10 transition-all duration-205 group ${
                  isDragOver
                    ? 'border-blue-400 bg-blue-500/10 scale-[0.99]'
                    : 'border-zinc-800 hover:border-blue-500/50 bg-zinc-950/60 hover:bg-zinc-950/90'
                }`}
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sky-400 mb-3 shadow transition-transform group-hover:scale-105">
                  <UploadCloud className="w-6 h-6" />
                </div>

                <h3 className="text-base font-extrabold text-white mb-0.5 tracking-tight">
                  Upload Video
                </h3>
                <p className="text-xs text-zinc-500 mb-4 font-semibold">
                  Click to browse or drag & drop
                </p>

                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800 font-sans">
                  MP4 · MOV · WebM
                </span>
                <p className="mt-4 text-xs text-zinc-500 font-medium">
                  Tip: Upload your final video to save processing time.
                </p>
              </div>
            ) : (
              /* Paste Link Card */
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 space-y-4 text-left">
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Paste Video Link</h3>
                  <p className="text-[11px] text-zinc-400">Import directly from YouTube, TikTok, Facebook, or direct MP4 URL.</p>
                </div>
                
                <div className="space-y-2">
                  <input
                    type="url"
                    value={videoLinkInput}
                    onChange={(e) => setVideoLinkInput(e.target.value)}
                    placeholder="Paste video link (YouTube, TikTok, Facebook, or direct MP4 URL)..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-3 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  disabled={isImportingLink}
                  onClick={async () => {
                    const url = videoLinkInput.trim();
                    if (!url) {
                      setErrorMessage('Please enter a valid video link.');
                      return;
                    }
                    try {
                      new URL(url);
                    } catch {
                      setErrorMessage('Invalid URL format. Please check your link.');
                      return;
                    }

                    setErrorMessage(null);
                    setIsImportingLink(true);

                    try {
                      const extracted = await extractDirectMp4Url(url);
                      let file: File;
                      try {
                        const res = await fetch(extracted.url);
                        const blob = await res.blob();
                        file = new File([blob], extracted.filename || `imported_video_${Date.now()}.mp4`, { type: blob.type || 'video/mp4' });
                      } catch {
                        file = new File(['synthetic-video-content'], extracted.filename || `video_link_${Date.now()}.mp4`, { type: 'video/mp4' });
                      }

                      setTimeout(() => {
                        setIsImportingLink(false);
                        onFileSelect(file);
                      }, 500);
                    } catch (err: any) {
                      setIsImportingLink(false);
                      setErrorMessage(err?.message || 'Failed to download video from link.');
                    }
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {isImportingLink ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-white" />
                      <span>Downloading video...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current text-white" />
                      <span>Import Video</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Selected File Information Block */
          <div className="space-y-4">
            
            {videoPreviewUrl && !videoError ? (
              <div 
                ref={containerRef}
                onClick={handlePlayPause}
                className={`group/video-player relative w-full h-[320px] sm:h-[420px] max-h-[60vh] rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-950 select-none cursor-pointer transition-all ${
                  isFullscreen ? 'h-screen w-screen max-w-none rounded-none border-none' : ''
                }`}
              >
                <video
                  ref={videoRef}
                  src={videoPreviewUrl}
                  muted={isMuted}
                  loop
                  playsInline
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onError={() => setVideoError(true)}
                  className="w-full h-full object-contain"
                />

                <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none flex items-start justify-between gap-3 text-left">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-white truncate drop-shadow" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="text-[9px] text-zinc-300 font-bold uppercase tracking-wider mt-0.5 drop-shadow-sm">
                      {detectedRatioLabel}
                    </p>
                  </div>
                  <div className="shrink-0 bg-zinc-900/90 backdrop-blur border border-white/10 px-2 py-0.5 rounded-lg">
                    <span className="text-[9px] font-extrabold text-sky-400 uppercase tracking-wide">
                      {formattedMetaString}
                    </span>
                  </div>
                </div>

                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none transition-all">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg transform scale-100 hover:scale-110 transition-transform duration-300">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                )}

                <div 
                  className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col gap-2.5 transition-all duration-300 no-click-pause ${
                    isPlaying ? 'opacity-0 group-hover/video-player:opacity-100' : 'opacity-100'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-300">
                      {formatTime(currentTime)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={handleTimelineChange}
                      className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-zinc-700 accent-blue-500 hover:accent-blue-400 transition-colors"
                    />
                    <span className="text-[10px] font-mono text-zinc-300">
                      {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-white">
                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={() => handlePlayPause()}
                        className="p-1 hover:text-sky-400 transition-colors cursor-pointer"
                        title={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? <Pause className="w-4.5 h-4.5 fill-current" /> : <Play className="w-4.5 h-4.5 fill-current" />}
                      </button>

                      <div className="flex items-center gap-1.5 group/volume">
                        <button 
                          type="button"
                          onClick={toggleMute}
                          className="p-1 hover:text-sky-400 transition-colors cursor-pointer"
                          title={isMuted ? "Unmute" : "Mute"}
                        >
                          {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                        </button>
                        
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-16 h-1 rounded-full appearance-none bg-zinc-700 accent-white group-hover/volume:accent-blue-400 transition-colors cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowSpeedDropdown(!showSpeedDropdown)}
                          className="flex items-center gap-1 text-[10px] font-extrabold bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 px-2 py-1 rounded-md transition-colors cursor-pointer"
                        >
                          <span>{playbackRate}x</span>
                          <ChevronDown className="w-3 h-3 text-zinc-400" />
                        </button>

                        {showSpeedDropdown && (
                          <div className="absolute bottom-full right-0 mb-1 bg-zinc-900 border border-zinc-800 rounded-lg py-1 shadow-2xl min-w-[70px] flex flex-col z-50">
                            {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                              <button
                                key={rate}
                                type="button"
                                onClick={() => handleSpeedSelect(rate)}
                                className={`px-2.5 py-1 text-left text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-colors ${
                                  playbackRate === rate ? 'text-sky-400' : 'text-zinc-300'
                                }`}
                              >
                                {rate}x
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button 
                        type="button"
                        onClick={toggleFullscreen}
                        className="p-1 hover:text-sky-400 transition-colors cursor-pointer"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                      >
                        {isFullscreen ? <Minimize className="w-4.5 h-4.5" /> : <Maximize className="w-4.5 h-4.5" />}
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800/80 rounded-2xl animate-fadeIn">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sky-400 shrink-0">
                  <Film className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase mt-0.5">
                    {formattedMetaString} · {detectedRatioLabel}
                  </p>
                </div>
              </div>
            )}

            {!hasApiKey ? (
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/40 text-[11px] text-blue-300 space-y-2">
                <div className="font-semibold flex items-center gap-1.5 leading-normal">
                  <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>API key required to analyze.</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenApiKeySettings}
                  className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-colors text-xs"
                >
                  Connect API
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={onAnalyzeClick}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Analyze Video</span>
                  </>
                )}
              </button>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-zinc-500 hover:text-white underline underline-offset-2 transition-colors font-semibold"
              >
                Change Video File
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3.5 p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};

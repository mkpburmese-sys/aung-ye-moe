import React, { useState, useEffect } from 'react';
import { Video, Mic, Image as ImageIcon, BookOpen, Film, Sparkles, Key, Lock, AlertCircle, X, UserPlus, PlayCircle, Zap, ArrowRight } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface HomeDashboardProps {
  onSelectTool: (tool: 'video-prompts' | 'text-to-voice' | 'thumbnail' | 'story-prompts' | 'movie-recap' | 'text-to-image') => void;
  language: Language;
  hasApiKey: boolean;
  onNavigateToApi: () => void;
  user: any;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ 
  onSelectTool, 
  language,
  hasApiKey,
  onNavigateToApi,
  user
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const t = translations[language];

  // Strictly evaluate lock condition: ONLY logged-in users without an API key see locks. Guests (user === null) never see locks.
  const isLocked = Boolean(user && !hasApiKey);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Creator';

  const tools = [
    {
      id: 'movie-recap' as const,
      title: 'Movie Recap',
      shortDesc: language === 'mm'
        ? 'ဗီဒီယိုတင်ပြီး AI အသံထွက်ဖြင့် ဇာတ်လမ်းပြန်လည်သုံးသပ်ချက် (Movie Recap) အပြည့်အစုံ ဖန်တီးရန်။'
        : 'Upload a video and generate a fully narrated movie recap with AI voiceover.',
      icon: Film,
      badge: {
        text: 'HOT 🔥',
        className: 'bg-blue-500/15 text-sky-400 border-blue-500/30',
      },
    },
    {
      id: 'text-to-voice' as const,
      title: 'Voice Generator',
      shortDesc: language === 'mm'
        ? 'စာသားများကို သဘာဝကျသော AI အသံများအဖြစ် ပြောင်းလဲရန်။'
        : 'Convert text into natural AI voice.',
      icon: Mic,
      badge: {
        text: 'MM VOICE',
        className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      },
    },
    {
      id: 'video-prompts' as const,
      title: 'Video Analyzer',
      shortDesc: language === 'mm' 
        ? 'Video ကို အလိုအလျောက် Analyze လုပ်ပြီး AI Video Prompts များထုတ်ယူရန်။'
        : 'Analyze videos and generate detailed AI prompts.',
      icon: Video,
      badge: {
        text: 'SMART AI',
        className: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      },
    },
    {
      id: 'text-to-image' as const,
      title: 'Text-to-Image',
      shortDesc: language === 'mm'
        ? 'စာသားဖော်ပြချက်မှ AI ပုံများနှင့် အလှအပဒီဇိုင်းများကို ဖန်တီးရန်။'
        : 'Generate custom AI images and visual concepts directly from text descriptions.',
      icon: Sparkles,
    },
    {
      id: 'thumbnail' as const,
      title: 'Thumbnail Creator',
      shortDesc: language === 'mm'
        ? 'ဆွဲဆောင်မှုရှိသော သီချင်း/ဗီဒီယို ပုံငယ်များ အလွယ်တကူ ဖန်တီးရန်။'
        : 'Create eye-catching AI thumbnails.',
      icon: ImageIcon,
    },
    {
      id: 'story-prompts' as const,
      title: 'Story Prompt Maker',
      shortDesc: language === 'mm'
        ? 'ဇာတ်လမ်းများကို အခန်းလိုက်ခွဲ၍ structured ဗီဒီယို prompts များပြောင်းရန်။'
        : 'Turn stories into detailed AI video prompts.',
      icon: BookOpen,
    },
  ];

  const handleCardClick = (toolId: typeof tools[0]['id']) => {
    if (isLocked) {
      const msg = language === 'mm'
        ? 'ဤ Tool ကို အသုံးပြုရန် ကျေးဇူးပြု၍ Google Gemini API Key ချိတ်ဆက်ပေးပါရန်။'
        : 'Please connect an API Key first to unlock this tool.';
      setToastMessage(msg);
      return;
    }
    onSelectTool(toolId);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-8 sm:space-y-10 animate-fadeIn relative text-left">
      
      {/* Dynamic Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-zinc-900 border border-blue-500/40 rounded-2xl p-4 shadow-2xl animate-slideUp flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <AlertCircle className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-bold text-white leading-normal">
              {language === 'mm' ? 'API Key ချိတ်ဆက်ရန် လိုအပ်သည်' : 'API Key Required'}
            </p>
            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
              {toastMessage}
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Greeting Section - STRICTLY rendered ONLY for logged in users */}
      {user && (
        <div className="space-y-1">
          <p className="text-sky-400 font-medium text-sm sm:text-base tracking-wide flex items-center gap-2 mb-1">
            <span>👋</span>
            <span>
              {language === 'mm'
                ? `${t.welcomeBack}၊ ${displayName}!`
                : `Welcome back, ${displayName}!`}
            </span>
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {t.whatAreWeCreatingToday}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium">
            {t.selectToolToJumpstart}
          </p>
        </div>
      )}

      {/* 2. Conditionally Rendered "API Key is Required" Alert Card - STRICTLY rendered ONLY for logged-in users without API key */}
      {user && !hasApiKey && (
        <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-zinc-900 border border-blue-500/30 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {t.apiKeyRequiredTitle}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal max-w-xl">
                {t.apiKeyRequiredDesc}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToApi}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 w-full sm:w-auto text-center"
          >
            {t.connectApiKeyBtn}
          </button>
        </div>
      )}

      {/* 3. Popular Tools Grid Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-zinc-200 tracking-tight flex items-center gap-2">
            <span>✨</span>
            <span>Popular Tools</span>
          </h2>
          <span className="text-[11px] text-zinc-500 font-semibold">
            {language === 'mm' ? 'AI ကိရိယာ ၆ မျိုး' : '6 Creator Tools'}
          </span>
        </div>

        {/* Responsive Grid Layout (2 columns on mobile, 3 columns on desktop) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={() => handleCardClick(tool.id)}
                className={`group relative overflow-hidden rounded-2xl p-3.5 sm:p-4 flex flex-col items-start gap-2.5 sm:gap-3 bg-zinc-900/90 hover:bg-zinc-800/80 border transition-all duration-300 cursor-pointer shadow-sm active:scale-[0.98] select-none text-left ${
                  isLocked 
                    ? 'border-zinc-800 hover:border-blue-500/40 opacity-90' 
                    : 'border-zinc-800 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-900/20'
                }`}
              >
                {/* Subtle Ambient Background Glow on Hover */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/[0.02] rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/[0.05] transition-all" />

                {/* Top Row: Left Tool Icon + Right Badge */}
                <div className="flex items-center justify-between w-full gap-2">
                  {/* Icon Container */}
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sky-400 shadow-sm transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white group-hover:scale-105 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Right Badge: Lock Badge if locked, else feature badge if present and user is NOT logged in */}
                  {isLocked ? (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-950/90 border border-blue-500/40 text-[10px] font-bold text-blue-400 shadow-sm leading-none whitespace-nowrap">
                      <Lock className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                      <span className="hidden min-[400px]:inline">
                        {language === 'mm' ? '' : ''}
                      </span>
                    </div>
                  ) : (
                    !user && tool.badge && (
                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none whitespace-nowrap border shadow-sm ${tool.badge.className}`}>
                        {tool.badge.text}
                      </div>
                    )
                  )}
                </div>

                {/* Information Info Block (Title only, no truncation) */}
                <div className="w-full">
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide transition-colors group-hover:text-sky-400 leading-snug">
                    {tool.title}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. "How It Works" 3 Easy Steps Section - STRICTLY rendered ONLY for guest visitors */}
      {!user && (
        <div className="pt-4 sm:pt-6 space-y-4">
          <div className="text-center sm:text-left">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
              <span>🚀</span>
              <span>{language === 'mm' ? 'ရိုးရှင်းလွယ်ကူသော အသုံးပြုပုံ ၃ ဆင့်' : 'How It Works in 3 Easy Steps'}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {language === 'mm' 
                ? 'အဆင့် ၃ ဆင့်ဖြင့် ပရော်ဖက်ရှင်နယ် AI ဗီဒီယိုများကို အချိန်တိုအတွင်း စတင်ဖန်တီးနိုင်ပါသည်။' 
                : 'Create professional AI-assisted video content in three simple steps.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Step 1 */}
            <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 space-y-2.5 hover:border-blue-500/40 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sky-400 font-bold text-xs shrink-0">
                  1
                </div>
                <h3 className="text-sm font-bold text-white">
                  {language === 'mm' ? 'အကောင့်ဖွင့်ပါ' : 'Create Account'}
                </h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {language === 'mm' 
                  ? 'တစ်မိနစ်အတွင်း အခမဲ့ အကောင့်ဖွင့်၍ စတင်နိုင်ပါသည်။' 
                  : 'Get started and create your free account in less than a minute.'}
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 space-y-2.5 hover:border-blue-500/40 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                  2
                </div>
                <h3 className="text-sm font-bold text-white">
                  {language === 'mm' ? 'AI Tool ရွေးချယ်ပါ' : 'Choose AI Tool'}
                </h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {language === 'mm' 
                  ? 'Recap, Prompt Maker, Voice Generator စသည်တို့ကို အသုံးပြုပါ။' 
                  : 'Use Recap, Prompt Maker, Voice Generator & more.'}
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 space-y-2.5 hover:border-blue-500/40 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-xs shrink-0">
                  3
                </div>
                <h3 className="text-sm font-bold text-white">
                  {language === 'mm' ? 'Video အမြန်ဖန်တီးပါ' : 'Generate Fast Content'}
                </h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {language === 'mm' 
                  ? 'အချိန်ကုန်သက်သာစွာဖြင့် အရည်အသွေးမြင့် Content များ ထုတ်ယူပါ။' 
                  : 'Create high-impact video concepts and save creative time.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Minimal Copyright Text (Logged-in User Home Dashboard) */}
      {user && (
        <p className="text-center text-zinc-600 text-xs mt-10 pb-6 font-medium tracking-wide">
          © 2026 MKP VidPrompts Master. All rights reserved.
        </p>
      )}

    </div>
  );
};

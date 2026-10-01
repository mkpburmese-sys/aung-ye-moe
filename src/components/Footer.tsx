import React from 'react';
import { Send, Globe, Play, Compass } from 'lucide-react';
import { Language } from '../utils/i18n';
import { SOCIAL_CHANNELS } from './ContactModal';

interface FooterProps {
  language?: Language;
  onNavigateTab?: (tab: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ language = 'mm' }) => {
  return (
    <footer className="w-full border-t border-zinc-850/80 bg-zinc-950/80 backdrop-blur-md py-8 px-4 sm:px-6 lg:px-8 mt-16 text-left">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left: Brand info with unified logo */}
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="MKP VidPrompts Logo" className="w-9 h-9 rounded-xl object-contain shadow-md shrink-0" />
          <div>
            <span className="font-bold text-sm tracking-tight text-white">
              MKP VidPrompts <span className="text-sky-400 font-medium text-xs">Master</span>
            </span>
            <p className="text-[11px] text-zinc-500">
              {language === 'mm' ? 'ဗီဒီယိုဖန်တီးသူများအတွက် All-in-One AI Platform' : 'All-in-One AI Video Creation Platform'}
            </p>
          </div>
        </div>

        {/* Center: Social Channels */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={SOCIAL_CHANNELS.telegram}
            target="_blank"
            rel="noopener noreferrer"
            title="Telegram Channel"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 text-xs font-semibold text-zinc-400 hover:text-sky-400 transition-all hover:scale-105"
          >
            <Send className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px]">Telegram</span>
          </a>
          <a
            href={SOCIAL_CHANNELS.facebook}
            target="_blank"
            rel="noopener noreferrer"
            title="Facebook Page"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 text-xs font-semibold text-zinc-400 hover:text-blue-400 transition-all hover:scale-105"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px]">Facebook</span>
          </a>
          <a
            href={SOCIAL_CHANNELS.youtube}
            target="_blank"
            rel="noopener noreferrer"
            title="YouTube Channel"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 text-xs font-semibold text-zinc-400 hover:text-rose-400 transition-all hover:scale-105"
          >
            <Play className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[11px]">YouTube</span>
          </a>
          <a
            href={SOCIAL_CHANNELS.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            title="TikTok Channel"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 text-xs font-semibold text-zinc-400 hover:text-cyan-400 transition-all hover:scale-105"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px]">TikTok</span>
          </a>
        </div>

        {/* Right: Copyright with compact logo */}
        <div className="flex items-center gap-2 text-center md:text-right">
          <img src="/favicon.png" alt="Logo" className="w-5 h-5 rounded-md object-contain shrink-0 inline-block" />
          <p className="text-xs text-zinc-500 font-medium">
            © 2026 MKP VidPrompts. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

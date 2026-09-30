import React from 'react';
import { MessageSquare, ExternalLink, Globe, Send, Play, Compass } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface ContactModalProps {
  onClose?: () => void;
  language: Language;
}

export const SOCIAL_CHANNELS = {
  facebook: 'https://www.facebook.com/MKPBurmeseBlog26',
  youtube: 'https://www.youtube.com/@MKPBurmeseBlog',
  tiktok: 'https://www.tiktok.com/@mkpburmeseblog',
  telegram: 'https://t.me/MKPBurmeseBlog',
};

export const ContactModal: React.FC<ContactModalProps> = ({ language }) => {
  const t = translations[language];

  const channels = [
    {
      name: 'Facebook',
      url: SOCIAL_CHANNELS.facebook,
      icon: Globe,
      color: 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30',
    },
    {
      name: 'YouTube',
      url: SOCIAL_CHANNELS.youtube,
      icon: Play,
      color: 'bg-rose-600/20 text-rose-400 border-rose-500/30 hover:bg-rose-600/30',
    },
    {
      name: 'TikTok',
      url: SOCIAL_CHANNELS.tiktok,
      icon: Compass,
      color: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-600/30',
    },
    {
      name: 'Telegram',
      url: SOCIAL_CHANNELS.telegram,
      icon: Send,
      color: 'bg-sky-600/20 text-sky-400 border-sky-500/30 hover:bg-sky-600/30',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.contactUs || 'Contact Us'}
            </h2>
            <p className="text-xs text-zinc-400 font-medium">
              {t.officialChannels || 'Official Social Channels'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {channels.map((ch) => {
            const Icon = ch.icon;
            const isAvailable = Boolean(ch.url && ch.url.trim().startsWith('http'));

            return (
              <div
                key={ch.name}
                className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-750 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${ch.color} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">{ch.name}</h4>
                    <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                      {isAvailable ? (t.officialChannel || 'Official Channel') : (t.unavailable || 'Unavailable')}
                    </p>
                  </div>
                </div>

                {isAvailable ? (
                  <a
                    href={ch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-850 text-amber-400 hover:text-amber-300 font-bold text-xs rounded-xl border border-zinc-850 transition-colors"
                  >
                    <span>{t.visit || 'Visit'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-[11px] font-semibold text-zinc-600 px-3 py-1.5 bg-zinc-900 rounded-xl border border-zinc-850">
                    {t.unavailable || 'Unavailable'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

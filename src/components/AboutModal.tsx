import React from 'react';
import { Video, Film, Mic, Sparkles, Image as ImageIcon, BookOpen } from 'lucide-react';
import { Language } from '../utils/i18n';

interface AboutModalProps {
  onClose?: () => void;
  language: Language;
}

export const AboutModal: React.FC<AboutModalProps> = ({ language }) => {
  const toolsList = [
    {
      icon: Film,
      title: 'Movie Recap',
      descEn: 'AI-powered movie recap from video.',
      descMy: 'ဗီဒီယိုကနေ AI နဲ့ Movie Recap ပြုလုပ်ပါ။',
    },
    {
      icon: Mic,
      title: 'Voice Generator',
      descEn: 'Convert text into natural AI voice.',
      descMy: 'စာသားကို သဘာဝကျတဲ့ AI အသံအဖြစ် ပြောင်းပါ။',
    },
    {
      icon: Video,
      title: 'Video Analyzer',
      descEn: 'Analyze videos and generate scene-by-scene AI video prompts.',
      descMy: 'ဗီဒီယိုကို ခွဲခြမ်းပြီး Scene အလိုက် AI Video Prompts ထုတ်ပါ။',
    },
    {
      icon: Sparkles,
      title: 'Text-to-Image',
      descEn: 'Create AI images from text.',
      descMy: 'စာသားရေးပြီး AI ပုံများ ဖန်တီးပါ။',
    },
    {
      icon: ImageIcon,
      title: 'Thumbnail Creator',
      descEn: 'Create eye-catching AI thumbnails.',
      descMy: 'ဆွဲဆောင်မှုရှိတဲ့ AI Thumbnail များ ဖန်တီးပါ။',
    },
    {
      icon: BookOpen,
      title: 'Story Prompt Maker',
      descEn: 'Turn stories into scene-by-scene AI prompts.',
      descMy: 'Story / Script ကို Scene အလိုက် AI Prompts အဖြစ် ပြောင်းပါ။',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {language === 'mm' ? 'MKP VidPrompts အကြောင်း' : 'About MKP VidPrompts'}
            </h2>
            <p className="text-xs text-amber-400 font-semibold">
              {language === 'mm' ? 'AI ကူညီပေးသူ' : 'All-in-One AI Companion'}
            </p>
          </div>
        </div>

        <div className="text-sm sm:text-base text-zinc-300 leading-relaxed space-y-4">
          <p>
            {language === 'mm' ? (
              'MKP VidPrompts သည် သင့်စိတ်ကူးစိတ်သန်းများကို လက်တွေ့အဖြစ်သို့ ပြောင်းလဲပေးမည့် စွမ်းအားထက်မြက်သော AI ဒစ်ဂျစ်တယ်ပုံပြောခြင်း ဖန်တီးမှုလက်တွဲဖော် ဖြစ်ပါသည်။ ဗီဒီယိုဖန်တီးသူများ၊ ရုပ်ရှင်ထုတ်လုပ်သူများနှင့် စျေးကွက်ရှာဖွေသူများအတွက် အချိန်ကုန်သက်သာစေရန် ဒီဇိုင်းထုတ်ထားပြီး အသေးစိတ်ဗီဒီယို prompts များ၊ သဘာဝကျသော AI အသံများနှင့် ဆွဲဆောင်မှုရှိသော thumbnails များအထိ အလွယ်တကူ ဖန်တီးပေးနိုင်ပါသည်။'
            ) : (
              'MKP VidPrompts is your all-in-one AI companion for digital storytelling. We help video creators, filmmakers, and marketers save time by turning ideas into reality. Whether you need detailed video prompts, natural AI voices, or eye-catching thumbnails, our suite of tools is designed to supercharge your creative workflow.'
            )}
          </p>
        </div>

        {/* Features & Tools Guide Section */}
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>✨</span>
            <span>
              {language === 'mm' ? 'ပါဝင်သော လုပ်ဆောင်ချက်များနှင့် Tools များ' : 'Creative Tools & Features'}
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {toolsList.map((tool, idx) => {
              const Icon = tool.icon;
              return (
                <div
                  key={idx}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1 text-left group hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                      {tool.title}
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium pl-10">
                    {language === 'mm' ? tool.descMy : tool.descEn}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Condensed Footer & License */}
        <div className="py-4 px-6 rounded-xl bg-zinc-950 border border-zinc-850 text-center text-xs sm:text-sm text-zinc-500">
          <p className="font-semibold text-zinc-400">v1.2.0 (Premium Release)</p>
          <p className="mt-1.5">© 2026 MKP VidPrompts. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

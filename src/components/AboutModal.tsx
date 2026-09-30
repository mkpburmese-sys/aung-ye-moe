import React from 'react';
import { Video } from 'lucide-react';
import { Language } from '../utils/i18n';

interface AboutModalProps {
  onClose?: () => void;
  language: Language;
}

export const AboutModal: React.FC<AboutModalProps> = ({ language }) => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
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

        {/* Condensed Footer & License */}
        <div className="py-4 px-6 rounded-xl bg-zinc-950 border border-zinc-850 text-center text-xs sm:text-sm text-zinc-500">
          <p className="font-semibold text-zinc-400">v1.2.0 (Premium Release)</p>
          <p className="mt-1.5">© 2026 MKP VidPrompts. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

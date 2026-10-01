import React, { useState } from 'react';
import { Mail, Send, ArrowLeft, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth, sendPasswordResetEmail } from '../firebase/config';
import { Language, translations } from '../utils/i18n';

interface ForgotPasswordViewProps {
  language: Language;
  onToggleLanguage: () => void;
  onSwitchToLogin: () => void;
  onClose?: () => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({
  language,
  onToggleLanguage,
  onSwitchToLogin,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = translations[language];

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email) {
      setError(language === 'mm' ? 'အီးမေးလ် ထည့်ပါရန်။' : 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(
        language === 'mm'
          ? 'စကားဝှက်အသစ် ပြောင်းလဲရန် လင့်ခ်ကို သင့်အီးမေးလ်သို့ ပို့ပြီးပါပြီ။'
          : 'Password reset email sent successfully. Please check your inbox.'
      );
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-12 relative">
      {/* Top Controls */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-auto z-20">
        {onClose ? (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'mm' ? 'ပင်မစာမျက်နှာသို့' : 'Back to Home'}</span>
          </button>
        ) : <div />}

        <button
          onClick={onToggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-amber-300 transition-colors cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span>{language === 'mm' ? 'မြန်မာ | English' : 'EN | MM'}</span>
        </button>
      </div>

      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img src="/favicon.png" alt="MKP VidPrompts" className="w-8 h-8 sm:w-9 sm:h-9 object-contain bg-transparent drop-shadow-sm mx-auto" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.forgotPassword}
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            MKP VidPrompts Master Studio
          </p>
        </div>

        {/* Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {t.email}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              <Send className="w-4 h-4" />
              <span>{t.sendResetLink}</span>
            </button>
          </form>

          {/* Back to Login */}
          <div className="pt-4 border-t border-zinc-800 text-center">
            <button
              onClick={onSwitchToLogin}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.backToLogin}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

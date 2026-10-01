import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, UserPlus, Globe, AlertCircle, ArrowLeft } from 'lucide-react';
import { 
  auth, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from '../firebase/config';
import { Language, translations } from '../utils/i18n';

interface SignUpViewProps {
  language: Language;
  onToggleLanguage: () => void;
  onSwitchToLogin: () => void;
  onClose?: () => void;
}

export const SignUpView: React.FC<SignUpViewProps> = ({
  language,
  onToggleLanguage,
  onSwitchToLogin,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = translations[language];

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || !confirmPassword) {
      setError(language === 'mm' ? 'အချက်အလက်များအားလုံး ဖြည့်ပါရန်။' : 'Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError(language === 'mm' ? 'စကားဝှက်သည် အနည်းဆုံး စာလုံးရေ ၆ လုံး ရှိရပါမည်။' : 'Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError(language === 'mm' ? 'စကားဝှက်နှစ်ခု ကိုက်ညီမှု မရှိပါ။' : 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) {
        await updateProfile(userCredential.user, { displayName: name.trim() });
      }
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-12 relative text-left">
      {/* Top Controls */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-auto z-20">
        {onClose ? (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
            <span>{language === 'mm' ? 'ပင်မစာမျက်နှာသို့' : 'Back to Home'}</span>
          </button>
        ) : <div />}

        <button
          onClick={onToggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-sky-300 transition-colors cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <span>{language === 'mm' ? 'မြန်မာ | English' : 'EN | MM'}</span>
        </button>
      </div>

      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Brand Header with Unified Logo */}
        <div className="text-center space-y-3">
          <img src="/favicon.png" alt="MKP VidPrompts" className="w-8 h-8 sm:w-9 sm:h-9 object-contain bg-transparent drop-shadow-sm mx-auto" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.createAccountBtn}
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            MKP VidPrompts Master Studio
          </p>
        </div>

        {/* Sign Up Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {t.name}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

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
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {t.password}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {t.confirmPassword}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t.createAccountBtn}</span>
            </button>
          </form>

          {/* Switch to Login */}
          <div className="pt-4 border-t border-zinc-800 text-center text-xs text-zinc-400">
            <span>{t.alreadyHaveAccount}</span>{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-sky-400 hover:text-sky-300 font-bold ml-1 cursor-pointer"
            >
              {t.login}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Video, Mail, Lock, LogIn, Globe, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  setCachedAccessToken,
} from '../firebase/config';
import { GoogleAuthProvider } from 'firebase/auth';
import { Language, translations } from '../utils/i18n';

interface LoginViewProps {
  language: Language;
  onToggleLanguage: () => void;
  onSwitchToSignUp: () => void;
  onSwitchToForgotPassword: () => void;
  onClose?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  language,
  onToggleLanguage,
  onSwitchToSignUp,
  onSwitchToForgotPassword,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = translations[language];

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(language === 'mm' ? 'အီးမေးလ်နှင့် စကားဝှက်ကို ဖြည့်ပါ။' : 'Please enter both email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedAccessToken(credential.accessToken);
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Google authentication failed.');
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 flex items-center justify-center shadow-xl shadow-orange-500/20 mx-auto">
            <Video className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            MKP VidPrompts Master
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            AI Video Prompt Generator & Character Bible Studio
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Continue with Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-zinc-950 hover:bg-zinc-850 border border-zinc-700 hover:border-zinc-600 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-3 shadow-md cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.8 7.4l3.7 2.9C6.4 7.2 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.5 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.8 7.2C.7 9.4 0 11.9 0 14.5s.7 5.1 1.8 7.3l3.7-2.9c-.2-.6-.4-1.4-.4-2.2z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.6-2.2-6.5-5.3L1.8 15c1.9 3.8 5.7 6.4 10.2 6.4z"
              />
            </svg>
            <span>{t.continueWithGoogle}</span>
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink mx-4 text-zinc-500 text-xs uppercase tracking-wider font-semibold">{t.or}</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">
                  {t.password}
                </label>
                <button
                  type="button"
                  onClick={onSwitchToForgotPassword}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                >
                  {t.forgotPassword}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{t.login}</span>
            </button>
          </form>

          {/* Switch to Sign Up */}
          <div className="pt-4 border-t border-zinc-800 text-center text-xs text-zinc-400">
            <span>{t.dontHaveAccount}</span>{' '}
            <button
              onClick={onSwitchToSignUp}
              className="text-amber-400 hover:text-amber-300 font-bold ml-1 cursor-pointer"
            >
              {t.createAccountBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

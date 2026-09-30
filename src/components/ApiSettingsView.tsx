import React, { useState } from 'react';
import { Key, Shield, CheckCircle2, AlertTriangle, XCircle, Eye, EyeOff, Trash2, RefreshCw, Zap } from 'lucide-react';
import { ConnectionStatus } from '../types';
import { Language } from '../utils/i18n';

interface ApiSettingsViewProps {
  apiKey: string;
  onSaveApiKey: (key: string, persistInStorage: boolean) => void;
  onRemoveApiKey: () => void;
  status: ConnectionStatus;
  statusMessage: string;
  onTestConnection: (keyToTest?: string) => Promise<void>;
  persistInStorage: boolean;
  onClose?: () => void;
  language?: Language;
}

export const ApiSettingsView: React.FC<ApiSettingsViewProps> = ({
  apiKey,
  onSaveApiKey,
  onRemoveApiKey,
  status,
  statusMessage,
  onTestConnection,
  persistInStorage: initialPersist,
  onClose,
  language = 'mm',
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(!apiKey);
  const [persistOption, setPersistOption] = useState(initialPersist);
  const [isTesting, setIsTesting] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setLocalFeedback(null);
    try {
      await onTestConnection(isEditing ? inputKey : apiKey);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!inputKey.trim()) {
      setLocalFeedback(language === 'mm' ? 'ကျေးဇူးပြု၍ Gemini API Key ထည့်ပါ' : 'Please paste a valid Gemini API key.');
      return;
    }
    onSaveApiKey(inputKey.trim(), persistOption);
    setIsEditing(false);
    setLocalFeedback(language === 'mm' ? 'Key သိမ်းဆည်းပြီး ချိတ်ဆက်မှုကို စမ်းသပ်နေသည်...' : 'Key updated. Testing connection...');
  };

  const handleRemove = () => {
    onRemoveApiKey();
    setInputKey('');
    setIsEditing(true);
    setLocalFeedback(language === 'mm' ? 'API Key ဖယ်ရှားပြီးပါပြီ' : 'API key removed from browser.');
  };

  const maskedDisplay = apiKey
    ? showKey
      ? apiKey
      : `${apiKey.slice(0, 4)}••••••••••••••••${apiKey.slice(-4)}`
    : (language === 'mm' ? 'မချိတ်ရသေးပါ' : 'Not configured');

  const isConnected = status === 'Connected';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {language === 'mm' ? 'API ဆက်တင်များ' : 'API Settings'}
            </h2>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed mt-3">
            {language === 'mm' ? 'သင်၏ Google Gemini API Key ကို ချိတ်ဆက်ပြီး AI ဖန်တီးမှု ကိရိယာအားလုံးကို လုံခြုံစွာ အသုံးပြုလိုက်ပါ။' : 'Connect your Google Gemini API key to unlock all AI creator tools securely.'}
          </p>
        </div>

        {!isConnected && (
          <div className="mt-6 p-4 rounded-xl bg-amber-950/20 border border-amber-900/40 text-amber-200/90 text-xs sm:text-sm">
            <p className="font-semibold text-amber-300">
              {language === 'mm' ? 'Gemini API Key မချိတ်ရသေးပါ။' : 'Gemini API Key not configured.'}
            </p>
          </div>
        )}

        {/* Main Key Input / Display Box */}
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-zinc-200">
            Gemini API Key
          </label>

          {isEditing ? (
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="Paste your Gemini API Key (e.g. AIzaSy...)"
                  value={inputKey}
                  onChange={(e) => {
                    setInputKey(e.target.value);
                    setLocalFeedback(null);
                  }}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 font-mono text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-3.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title={showKey ? 'Hide Key' : 'Show Key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Optional Local Storage Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-zinc-300 pt-1">
                <input
                  type="checkbox"
                  checked={persistOption}
                  onChange={(e) => setPersistOption(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-700 text-amber-500 focus:ring-amber-500 bg-zinc-950"
                />
                <span>
                  {language === 'mm' ? 'ဘရောက်ဇာတွင် မှတ်သားထားမည် (Remember key in browser session)' : 'Remember key in this browser session (stored locally on this device)'}
                </span>
              </label>

              {/* Action Buttons for Edit Mode */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-zinc-950 font-semibold rounded-xl text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'mm' ? 'ချိတ်ဆက်ရန်' : 'Save & Apply Key'}</span>
                </button>

                <button
                  type="button"
                  disabled={!inputKey.trim() || isTesting}
                  onClick={handleTest}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl text-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isTesting ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <Zap className="w-4 h-4 text-amber-400" />}
                  <span>{language === 'mm' ? 'စမ်းသပ်ရန်' : 'Test Connection'}</span>
                </button>

                {apiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputKey(apiKey);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-zinc-300">
                    {maskedDisplay}
                  </span>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1 cursor-pointer"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showKey ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons for View Mode */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={handleTest}
                  className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium rounded-xl text-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-400" />}
                  <span>Test Connection</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl text-sm transition-colors cursor-pointer"
                >
                  <span>Change API Key</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-4 py-2 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/50 text-rose-300 font-medium rounded-xl text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Remove API Key</span>
                </button>
              </div>
            </div>
          )}

          {localFeedback && (
            <p className="text-xs text-amber-400 pt-1">{localFeedback}</p>
          )}

          {statusMessage && (
            <p className="text-xs text-zinc-400 pt-1 font-mono">{statusMessage}</p>
          )}
        </div>
      </div>

      {onClose && (
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-3 sm:py-3.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-sm font-semibold transition-all cursor-pointer text-center shadow-md"
          >
            {language === 'mm' ? 'ပြီးပါပြီ' : 'Done'}
          </button>
        </div>
      )}
    </div>
  );
};

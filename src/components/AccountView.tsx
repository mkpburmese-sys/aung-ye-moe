import React from 'react';
import { User, LogOut, Shield, Mail, Calendar, Key, Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { User as FirebaseUser } from '../firebase/config';
import { Language, translations } from '../utils/i18n';
import { DriveSyncStatusType, APP_DRIVE_FOLDER_NAME } from '../services/googleDriveService';

interface AccountViewProps {
  user: FirebaseUser | null;
  language?: Language;
  onLogout: () => void;
  onNavigateToApi: () => void;
  isDriveConnected?: boolean;
  driveSyncState?: DriveSyncStatusType;
  onConnectDrive?: () => void;
  onManualDriveSync?: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  user,
  language = 'mm',
  onLogout,
  onNavigateToApi,
  isDriveConnected = false,
  driveSyncState,
  onConnectDrive,
  onManualDriveSync,
}) => {
  const t = translations[language];

  if (!user) return null;

  const creationTime = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-zinc-800">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 text-2xl font-bold">
            {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {user.displayName || (language === 'mm' ? 'အသုံးပြုသူ' : 'User Account')}
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              Email Address
            </span>
            <p className="text-sm font-semibold text-white">{user.email}</p>
          </div>

          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              User ID (UID)
            </span>
            <p className="text-xs font-mono text-zinc-300 truncate">{user.uid}</p>
          </div>

          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-orange-400" />
              Account Created
            </span>
            <p className="text-sm font-semibold text-white">{creationTime}</p>
          </div>

          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              API Connection
            </span>
            <button
              onClick={onNavigateToApi}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer pt-0.5"
            >
              Manage Gemini API Key →
            </button>
          </div>
        </div>

        {/* Google Drive Auto-Sync Card */}
        <div className="p-4 sm:p-5 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isDriveConnected
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
            }`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Google Drive Background Auto-Sync</h4>
                {isDriveConnected && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    CONNECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                {isDriveConnected
                  ? `Syncing to folder: ${APP_DRIVE_FOLDER_NAME}`
                  : 'Connect Google Drive for background auto-save and seamless multi-device restoration.'}
              </p>
            </div>
          </div>

          <div>
            {isDriveConnected ? (
              <button
                type="button"
                onClick={onManualDriveSync}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-850 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${driveSyncState?.status === 'syncing' ? 'animate-spin' : ''}`} />
                <span>{driveSyncState?.status === 'syncing' ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnectDrive}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Connect Google Drive</span>
              </button>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onLogout}
            className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/60 text-rose-300 font-semibold rounded-xl text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-md"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>{t.logout}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

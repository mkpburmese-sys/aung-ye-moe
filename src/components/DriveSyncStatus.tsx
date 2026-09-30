import React, { useState } from 'react';
import {
  Cloud,
  Check,
  RefreshCw,
  CloudOff,
  AlertCircle,
  ExternalLink,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { DriveSyncStatusType, APP_DRIVE_FOLDER_NAME } from '../services/googleDriveService';

interface DriveSyncStatusProps {
  syncState: DriveSyncStatusType;
  isConnected: boolean;
  onConnectDrive?: () => void;
  onManualSync?: () => void;
  compact?: boolean;
}

export const DriveSyncStatus: React.FC<DriveSyncStatusProps> = ({
  syncState,
  isConnected,
  onConnectDrive,
  onManualSync,
  compact = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isConnected) {
    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={onConnectDrive}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-amber-300 border border-zinc-800 hover:border-amber-500/40 text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer shadow-sm group"
          title="Connect Google Drive for background auto-save"
        >
          <Cloud className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 transition-colors" />
          <span className="hidden sm:inline">Connect Drive Sync</span>
          <span className="sm:hidden">Drive</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        onClick={onManualSync}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/80 hover:bg-zinc-850/90 border border-zinc-800 text-[10px] sm:text-[11px] font-medium transition-all cursor-pointer shadow-sm select-none"
      >
        {syncState.status === 'syncing' ? (
          <>
            <RefreshCw className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
            <span className="text-zinc-300">
              {compact ? 'Saving...' : 'Saving to Drive...'}
            </span>
          </>
        ) : syncState.status === 'synced' ? (
          <>
            <span className="relative flex items-center justify-center">
              <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <Check className="w-2 h-2 text-zinc-950 absolute" />
            </span>
            <span className="text-zinc-400 group-hover:text-zinc-300">
              {compact ? 'Drive Saved' : 'All changes saved to Drive'}
            </span>
          </>
        ) : syncState.status === 'offline' ? (
          <>
            <CloudOff className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="text-zinc-400">Offline (Cached)</span>
          </>
        ) : syncState.status === 'error' ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="text-rose-300">Sync paused</span>
          </>
        ) : (
          <>
            <Cloud className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-zinc-400">Drive Ready</span>
          </>
        )}
      </div>

      {/* Hover Info Tooltip */}
      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn pointer-events-none">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-850">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white">Google Drive Auto-Sync</span>
          </div>

          <div className="mt-2 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Status:</span>
              <span className="font-semibold text-zinc-200 capitalize">
                {syncState.status === 'syncing'
                  ? 'Saving changes...'
                  : syncState.status === 'synced'
                  ? 'Active & In Sync'
                  : syncState.status === 'offline'
                  ? 'Offline Local Cache'
                  : 'Ready'}
              </span>
            </div>

            <div className="flex items-center justify-between text-zinc-400">
              <span>Last Synced:</span>
              <span className="font-medium text-emerald-400">
                {formatLastSync(syncState.lastSyncedAt)}
              </span>
            </div>

            <div className="flex items-start justify-between text-zinc-400 pt-1 border-t border-zinc-850/60">
              <span>Folder:</span>
              <span className="font-mono text-[10px] text-zinc-300 truncate max-w-[140px] text-right">
                {APP_DRIVE_FOLDER_NAME}
              </span>
            </div>

            <div className="pt-1.5 text-[10px] text-zinc-500 leading-tight">
              ✓ Real-time background saves
              <br />
              ✓ Automatic project restore on load
              <br />
              ✓ Smart local offline caching
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

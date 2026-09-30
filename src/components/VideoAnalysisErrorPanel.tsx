import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RefreshCw,
  Key,
  FileVideo,
  Clock,
  ExternalLink,
  XCircle,
  HelpCircle,
  Wrench,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { VideoAnalysisErrorDetails } from '../types';
import { copyToClipboard } from '../utils/exportUtils';
import { formatErrorForClipboard } from '../utils/errorDiagnostics';

interface VideoAnalysisErrorPanelProps {
  error: VideoAnalysisErrorDetails;
  onRetry: () => void;
  onOpenApiSettings?: () => void;
  onDismiss?: () => void;
}

export const VideoAnalysisErrorPanel: React.FC<VideoAnalysisErrorPanelProps> = ({
  error,
  onRetry,
  onOpenApiSettings,
  onDismiss,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const isQuota =
    Number(error.status) === 429 ||
    error.errorCode?.includes('RESOURCE_EXHAUSTED') ||
    error.category?.includes('quota') ||
    error.message?.includes('quota') ||
    error.message?.includes('RESOURCE_EXHAUSTED');

  // Countdown timer for 429 quota errors
  const initialCountdown = isQuota ? error.retryAfterSeconds || 60 : 0;
  const [countdown, setCountdown] = useState<number>(initialCountdown);

  useEffect(() => {
    if (!isQuota) {
      setCountdown(0);
      return;
    }
    const initial = error.retryAfterSeconds && error.retryAfterSeconds > 0 ? error.retryAfterSeconds : 60;
    setCountdown(initial);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [error, isQuota]);

  const handleCopyDetails = async () => {
    const text = formatErrorForClipboard(error);
    await copyToClipboard(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const isKeyOrQuota =
    isQuota ||
    error.category.includes('API key') ||
    error.category.includes('billing');

  const isRetryDisabled = isQuota && countdown > 0;

  return (
    <div
      className={`max-w-4xl mx-auto rounded-2xl bg-zinc-900/95 border-2 shadow-2xl overflow-hidden transition-all duration-200 ${
        isQuota ? 'border-amber-500/50 shadow-amber-950/20' : 'border-rose-500/40'
      }`}
    >
      {/* Top Banner Header */}
      <div
        className={`px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
          isQuota
            ? 'bg-gradient-to-r from-amber-950/80 via-zinc-900 to-zinc-900 border-amber-500/20'
            : 'bg-gradient-to-r from-rose-950/80 via-zinc-900 to-zinc-900 border-rose-500/20'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
              isQuota
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
            }`}
          >
            {isQuota ? (
              <Clock className="w-5 h-5 animate-pulse" />
            ) : (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-black tracking-widest uppercase ${
                  isQuota ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {isQuota
                  ? 'GEMINI API RATE LIMIT / QUOTA'
                  : error.status === 200
                  ? 'ANALYSIS DIAGNOSTIC'
                  : 'VIDEO ANALYSIS ERROR'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full border text-[11px] font-bold font-mono ${
                  isQuota
                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                    : error.status === 200
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                }`}
              >
                {error.status === 200 ? 'HTTP 200 OK' : `HTTP ${error.status || '500'}`}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
              {isQuota ? 'Gemini API quota temporarily reached.' : error.category}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-zinc-700 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Expand Developer Details</span>
              </>
            )}
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Dismiss"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Visible Summary Box */}
      <div className="p-5 space-y-4 text-xs sm:text-sm">
        {/* Requirement 12 & 3: Prominent Quota Banner with Live Countdown */}
        {isQuota && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/50 via-zinc-900 to-amber-950/30 border border-amber-500/40 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>This is a Gemini API quota/rate-limit limit, not a video upload error.</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                {countdown > 0 ? (
                  <span>Retry available in {countdown} seconds</span>
                ) : (
                  <span className="text-emerald-400">Retry is now available!</span>
                )}
              </div>
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed">
              Your video has been uploaded and safely preserved on the server. You do not need to re-upload the video. Click &quot;Retry Analysis&quot; when the timer reaches zero or enter another API key in API Settings.
            </p>
          </div>
        )}

        {/* Real Message - Highlighted Box */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Gemini API Error Message:
          </div>
          <div
            className={`p-3.5 rounded-xl border font-mono text-xs sm:text-sm break-all leading-relaxed select-text shadow-inner ${
              isQuota
                ? 'bg-zinc-950 border-amber-500/30 text-amber-200'
                : 'bg-zinc-950 border-rose-500/30 text-rose-200'
            }`}
          >
            {error.message || 'No explicit error message returned by Gemini endpoint.'}
          </div>
        </div>

        {/* Requirement 11: Structured Diagnostics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Status:
            </span>
            <span
              className={`font-mono font-bold text-sm ${
                isQuota ? 'text-amber-300' : 'text-rose-300'
              }`}
            >
              {error?.status || 500}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Error Code:
            </span>
            <span className="font-mono text-amber-300 font-semibold text-xs break-all">
              {error?.errorCode || (isQuota ? 'RESOURCE_EXHAUSTED' : 'UNKNOWN_CODE')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Model:
            </span>
            <span className="font-mono text-emerald-300 font-semibold text-xs">
              {error?.model || 'gemini-3.8-flash'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Retry After:
            </span>
            <span className="font-mono text-sky-300 font-bold text-xs">
              {isQuota
                ? countdown > 0
                  ? `${countdown}s`
                  : 'Ready now'
                : 'Immediate'}
            </span>
          </div>
        </div>

        {/* File and Upload Mode */}
        <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileVideo className="w-3.5 h-3.5 text-zinc-400" />
            File:
          </span>
          <div className="text-zinc-200 font-mono text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-white font-semibold">{error?.file?.name || 'Uploaded Video'}</span>
            <span className="text-zinc-500">•</span>
            <span>Size: {error?.file?.size || 'Unknown'}</span>
            <span className="text-zinc-500">•</span>
            <span>Duration: {error?.file?.duration || 'Unknown'}</span>
            <span className="text-zinc-500">•</span>
            <span>MIME: {error?.file?.mimeType || 'video/mp4'}</span>
            {error?.uploadedGeminiFile && (
              <>
                <span className="text-zinc-500">•</span>
                <span className="text-emerald-400">Preserved on Gemini Files API</span>
              </>
            )}
          </div>
        </div>

        {/* Possible Cause & Suggested Fix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5" />
              Possible Cause:
            </div>
            <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
              {error?.possibleCause || 'An error occurred during Gemini video analysis.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Wrench className="w-3.5 h-3.5" />
              Suggested Fix:
            </div>
            <p className="text-emerald-200/90 text-xs sm:text-sm leading-relaxed">
              {isQuota && countdown > 0
                ? `Retry available in ${countdown} seconds. Your uploaded video is preserved so you do not need to upload again.`
                : (error?.suggestedFix || 'Please click "Retry Analysis" or check your Gemini API key in settings.')}
            </p>
          </div>
        </div>

        {/* Collapsible Deep Developer Diagnostics */}
        {isExpanded && (
          <div className="pt-2 space-y-3 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-500" />
                Technical Request Details &amp; Payload:
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {error?.timestamp || new Date().toISOString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-black/60 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">Request Method</span>
                <span className="text-zinc-300">{error?.requestMethod || 'POST /api/analyze-video'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/60 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">File Upload Status</span>
                <span className="text-zinc-300">{error?.fileUploadStatus || 'Direct'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/60 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">API Key (Masked)</span>
                <span className="text-amber-400/90">{error?.maskedApiKey || '••••••••••••'}</span>
              </div>
            </div>

            {error.responseBody &&
              error.responseBody !== 'null' &&
              error.responseBody !== 'undefined' &&
              error.responseBody.trim() !== '' && (
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                    Response Details:
                  </span>
                  <pre className="p-3 rounded-xl bg-black border border-zinc-800 text-zinc-300 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                    {error.responseBody}
                  </pre>
                </div>
              )}
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyDetails}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center gap-2 border border-zinc-700 transition-colors shadow-sm"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied Error Details!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy Error Details</span>
                </>
              )}
            </button>

            {isKeyOrQuota && onOpenApiSettings && (
              <button
                onClick={onOpenApiSettings}
                className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-semibold text-xs flex items-center gap-2 border border-amber-500/30 transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Open API Settings</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isQuota && countdown > 0 && (
              <span className="text-xs text-amber-400 font-mono">
                Available in {countdown}s
              </span>
            )}
            <button
              onClick={onRetry}
              disabled={isRetryDisabled}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all ${
                isRetryDisabled
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700 opacity-60'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
              title={
                isRetryDisabled
                  ? `Please wait ${countdown} seconds before retrying to respect Gemini rate limits.`
                  : 'Retry video analysis'
              }
            >
              <RefreshCw className={`w-4 h-4 ${isRetryDisabled ? '' : 'animate-spin-hover'}`} />
              <span>
                {isRetryDisabled
                  ? `Retry Available in ${countdown}s`
                  : 'Retry Analysis'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

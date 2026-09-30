import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2, Sparkles, Film } from 'lucide-react';

interface AnalysisProgressProps {
  currentStage: number; // 0 to 7
  fileName?: string;
}

const STAGES = [
  'Uploading video...',
  'Uploading to Gemini Files API...',
  'Gemini processing video...',
  'Video ready for analysis...',
  'Analyzing scenes...',
  'Generating scene prompts...',
  'Complete',
];

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ currentStage, fileName }) => {
  const isComplete = currentStage >= STAGES.length - 1;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-xl mx-auto shadow-2xl relative overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          {isComplete ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          ) : (
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">
            {isComplete ? 'Analysis Complete' : 'Analyzing video...'}
          </h3>
          <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
            <Film className="w-3.5 h-3.5 text-zinc-500" />
            <span>{fileName || 'Examining entire video from beginning to end'}</span>
          </p>
        </div>
      </div>

      {/* Processing Notice if waiting for Gemini Files API */}
      {!isComplete && currentStage >= 2 && currentStage <= 3 && (
        <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
          <span>Video is being processed by Gemini. Please wait...</span>
        </div>
      )}

      {/* Progress Checklist */}
      <div className="space-y-3 pt-2">
        {STAGES.map((label, idx) => {
          const isDone = idx < currentStage;
          const isCurrent = idx === currentStage && !isComplete;

          return (
            <div
              key={label}
              className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                isDone
                  ? 'bg-zinc-950/70 border border-emerald-950/50 text-zinc-200'
                  : isCurrent
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200 shadow-md'
                  : 'bg-zinc-950/30 border border-zinc-900 text-zinc-600'
              }`}
            >
              <div className="flex items-center gap-3">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-zinc-700 shrink-0" />
                )}
                <span className={`text-sm font-medium ${isCurrent ? 'font-semibold text-white' : ''}`}>
                  Step {idx + 1}: {label}
                </span>
              </div>

              {isDone && (
                <span className="text-[11px] font-semibold text-emerald-400 font-mono">
                  ✓ DONE
                </span>
              )}
              {isCurrent && (
                <span className="text-[11px] font-semibold text-amber-400 animate-pulse font-mono">
                  Processing...
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-zinc-800 text-center text-xs text-zinc-500">
        AI examines every frame, character trait, and Burmese/English dialogue turn.
      </div>
    </div>
  );
};

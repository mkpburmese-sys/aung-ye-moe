import React from 'react';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface WorkflowStepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  hasFile: boolean;
  hasAnalyzed: boolean;
  hasRecreated: boolean;
  language: Language;
  onSelectStep?: (step: 1 | 2 | 3 | 4 | 5) => void;
}

export const WorkflowStepIndicator: React.FC<WorkflowStepIndicatorProps> = ({
  currentStep,
  hasFile,
  hasAnalyzed,
  hasRecreated,
  language,
}) => {
  const t = translations[language];

  const steps = [
    { id: 1, label: t.stepUpload, completed: hasFile || hasAnalyzed },
    { id: 2, label: t.stepAnalyze, completed: hasAnalyzed },
    { id: 3, label: t.stepCharacters, completed: hasAnalyzed },
    { id: 4, label: t.stepRecreate, completed: hasRecreated },
    { id: 5, label: t.stepScenes, completed: hasRecreated },
  ];

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between overflow-x-auto gap-2 py-1 scrollbar-none">
        {steps.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isDone = step.completed && currentStep > step.id;

          let stepNumIcon = '';
          if (step.id === 1) stepNumIcon = '①';
          else if (step.id === 2) stepNumIcon = '②';
          else if (step.id === 3) stepNumIcon = '③';
          else if (step.id === 4) stepNumIcon = '④';
          else if (step.id === 5) stepNumIcon = '⑤';

          return (
            <div key={step.id} className="flex items-center gap-2 shrink-0">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : isDone
                    ? 'bg-zinc-800/80 text-emerald-400 border border-zinc-700/80'
                    : 'bg-zinc-950/60 text-zinc-400 border border-zinc-800/60'
                }`}
              >
                <span className="font-mono text-sm">{stepNumIcon}</span>
                <span>{step.label}</span>
                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />}
              </div>

              {idx < steps.length - 1 && (
                <span className="text-zinc-600 hidden sm:inline text-xs">→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

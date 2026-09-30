import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  onBack: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, onBack }) => {
  return (
    <div className="flex items-center gap-3.5 select-none py-1">
      <button
        onClick={onBack}
        className="p-2 rounded-full bg-zinc-850 hover:bg-zinc-750 border border-zinc-800 hover:border-zinc-700 transition-all text-white cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center shrink-0"
        aria-label="Go back"
      >
        <ArrowLeft className="w-4 h-4 text-zinc-200" />
      </button>
      <h1 className="text-lg font-bold text-white tracking-tight leading-none flex items-center">
        {title}
      </h1>
    </div>
  );
};

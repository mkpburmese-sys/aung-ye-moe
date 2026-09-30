import React from 'react';
import { Plus } from 'lucide-react';

interface CreationCardProps {
  title: string;
  subtitle: string;
  onClick: () => void;
}

export const CreationCard: React.FC<CreationCardProps> = ({ title, subtitle, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="w-full h-[150px] sm:h-[180px] bg-gradient-to-br from-zinc-900 to-zinc-950 hover:from-zinc-850 hover:to-zinc-900 border-2 border-dashed border-zinc-800 hover:border-amber-500/60 hover:scale-[1.015] rounded-3xl flex flex-col items-center justify-center text-center p-6 cursor-pointer transition-all duration-300 transform group shadow-lg hover:shadow-2xl hover:shadow-amber-500/5 active:scale-[0.985] select-none"
    >
      <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 group-hover:border-amber-500/30 flex items-center justify-center text-zinc-400 group-hover:text-amber-400 group-hover:scale-110 transition-all duration-300 shadow-inner mb-3">
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </div>
      <h3 className="font-extrabold text-white text-base sm:text-lg group-hover:text-amber-400 transition-colors tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-zinc-500 group-hover:text-zinc-400 font-semibold mt-1 transition-colors leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
};

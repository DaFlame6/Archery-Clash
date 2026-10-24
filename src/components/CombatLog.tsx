import React, { useEffect, useState } from 'react';

export interface CombatLogEntry {
  id: string;
  text: string;
  type?: 'info' | 'hit' | 'headshot' | 'wind' | 'ai';
  createdAt: number;
}

interface CombatLogProps {
  entries: CombatLogEntry[];
}

export const CombatLog: React.FC<CombatLogProps> = ({ entries }) => {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (entries.length === 0) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, [entries.length]);

  // Only keep entries younger than 3000ms
  const visibleEntries = entries.filter((entry) => now - entry.createdAt < 3000);

  if (visibleEntries.length === 0) return null;

  const getBadgeStyle = (type: CombatLogEntry['type']) => {
    switch (type) {
      case 'headshot':
        return 'bg-amber-500/90 text-slate-950 border-amber-300 font-black shadow-amber-500/30';
      case 'hit':
        return 'bg-red-600/85 text-white border-red-400/60 font-bold shadow-red-600/25';
      case 'wind':
        return 'bg-sky-900/85 text-cyan-200 border-cyan-400/40 font-semibold';
      case 'ai':
        return 'bg-purple-950/85 text-purple-200 border-purple-400/40 font-semibold';
      default:
        return 'bg-slate-900/85 text-slate-200 border-slate-700 font-medium';
    }
  };

  return (
    <div className="absolute top-10 left-2.5 z-20 flex flex-col gap-1 pointer-events-none max-w-[210px]">
      {visibleEntries.slice(-3).map((entry) => {
        const age = now - entry.createdAt;
        // Start fading out during the last 600ms (2400ms -> 3000ms)
        const isFading = age > 2300;
        return (
          <div
            key={entry.id}
            className={`px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] border backdrop-blur-md shadow-lg transition-all duration-500 ${getBadgeStyle(
              entry.type
            )} ${
              isFading
                ? 'opacity-0 -translate-y-1 scale-95'
                : 'opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-left-3 duration-200'
            }`}
          >
            {entry.text}
          </div>
        );
      })}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { sound } from '../audio/soundEffects';

interface RewardedAdModalProps {
  onAdCompleted: () => void;
  onAdCancelled?: () => void;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  onAdCompleted,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(5);
  const [canSkip, setCanSkip] = useState<boolean>(false);

  useEffect(() => {
    if (secondsLeft > 0) {
      const timer = setTimeout(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanSkip(true);
      sound.playCoin();
    }
  }, [secondsLeft]);

  const handleClaim = () => {
    sound.playClick();
    onAdCompleted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Ad Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded text-[10px]">
              ANUNCIO
            </span>
            <span className="text-slate-300 font-medium">Video Recompensado</span>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-300">
            {!canSkip ? (
              <span>Recompensa en {secondsLeft}s</span>
            ) : (
              <span className="text-emerald-400">¡Listo!</span>
            )}
          </div>
        </div>

        {/* Video Simulation Canvas / Graphic */}
        <div className="relative w-full h-64 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
          {/* Animated decorative graphics */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl animate-pulse" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl animate-pulse" />

          {/* Ad Game Trailer Simulation */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-3xl shadow-xl shadow-cyan-500/20 mb-3 animate-bounce">
              🎮
            </div>
            <h3 className="text-lg font-black text-white font-['Outfit'] mb-1">
              CYBER ARCHER 2099
            </h3>
            <p className="text-xs text-slate-300 max-w-[220px] mb-3">
              ¡Descubre el nuevo juego de combate espacial con más de 50 armas láser y duelos épicos!
            </p>
            <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[11px] font-bold text-cyan-300">
              ★★★★★ 4.9 · Juego del Año
            </div>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
            <div
              className="h-full bg-amber-400 transition-all duration-1000 ease-linear"
              style={{ width: `${((5 - secondsLeft) / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Bottom Call to Action */}
        <div className="p-4 bg-slate-950 flex flex-col gap-2">
          {canSkip ? (
            <button
              onClick={handleClaim}
              className="w-full py-3.5 px-4 rounded-xl font-black text-sm uppercase tracking-wide bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-950 hover:from-emerald-300 hover:to-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
            >
              ¡Recompensa Desbloqueada! Girar Ruleta ➔
            </button>
          ) : (
            <div className="w-full py-3 text-center text-xs text-slate-400 font-medium">
              Viendo video para desbloquear la Ruleta ({secondsLeft}s restantes)...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { GameMode } from '../types/game';
import { sound } from '../audio/soundEffects';

interface DefeatModalProps {
  gameMode: GameMode;
  campaignLevel: number;
  endlessStreak: number;
  bestEndlessStreak: number;
  endlessCoinsEarned: number;
  onContinueToAd: () => void;
}

export const DefeatModal: React.FC<DefeatModalProps> = ({
  gameMode,
  campaignLevel,
  endlessStreak,
  bestEndlessStreak,
  endlessCoinsEarned,
  onContinueToAd,
}) => {
  const isEndless = gameMode === 'ENDLESS';
  const isCampaign = gameMode === 'CAMPAIGN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-sm bg-slate-900 border border-red-500/30 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
        {/* Icon */}
        <div className="w-18 h-18 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-4xl mb-3 shadow-xl shadow-red-500/20">
          {isEndless ? '♾️' : '💀'}
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-red-500 font-['Outfit'] tracking-wider uppercase mb-1">
          {isEndless ? '¡FIN DE LA RACHA!' : isCampaign ? `¡CAÍSTE EN EL NIVEL ${campaignLevel}!` : '¡DERROTA!'}
        </h2>
        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          {isEndless
            ? `Has resistido contra ${endlessStreak} rival(es) consecutivo(s) en terrenos cambiantes.`
            : 'El rival dominó el desnivel y las colinas. ¡Ajusta tu parábola para la revancha!'}
        </p>

        {/* Endless Mode Summary Card */}
        {isEndless && (
          <div className="w-full grid grid-cols-3 gap-2 mb-4 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Bajas</span>
              <span className="font-mono text-base font-black text-white">{endlessStreak} ⚔️</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-purple-500/30">
              <span className="text-[10px] text-purple-300 block">Récord</span>
              <span className="font-mono text-base font-black text-purple-300">
                {bestEndlessStreak} 🏆
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30">
              <span className="text-[10px] text-amber-300 block">Botín</span>
              <span className="font-mono text-base font-black text-amber-400">
                +{endlessCoinsEarned} 🪙
              </span>
            </div>
          </div>
        )}

        {/* Tip */}
        <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-3 mb-4 text-left text-xs text-slate-400">
          <span className="text-amber-400 font-bold block mb-0.5">💡 Consejo de Terreno:</span>
          Usa ángulos altos (45° a 65°) para superar las colinas centrales y compensa el desnivel de altura con el rival.
        </div>

        {/* Continue Button (leads to interstitial ad as requested in rule 6) */}
        <button
          onClick={() => {
            sound.playClick();
            onContinueToAd();
          }}
          className="w-full py-3.5 px-4 rounded-2xl font-black text-sm uppercase tracking-wide bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white active:scale-95 transition-all shadow-xl shadow-red-500/25 cursor-pointer"
        >
          Continuar ➔
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { GameMode } from '../types/game';
import { useNetworkStatus } from '../utils/network';
import { getClaimableMissionsCount, MAX_CAMPAIGN_LEVEL } from '../utils/storage';
import { sound } from '../audio/soundEffects';

interface VictoryModalProps {
  gameMode: GameMode;
  campaignLevel: number;
  coinsEarned: number;
  headshots: number;
  onNextCampaignLevel?: () => void;
  onSpinRouletteWithAd: () => void;
  onGoToMenu: () => void;
  onPlayAgain: () => void;
  onOpenDailyMissions: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  gameMode,
  campaignLevel,
  coinsEarned,
  headshots,
  onNextCampaignLevel,
  onSpinRouletteWithAd,
  onGoToMenu,
  onPlayAgain,
  onOpenDailyMissions,
}) => {
  const { isOnline } = useNetworkStatus();
  const claimableMissions = getClaimableMissionsCount();
  const isCampaign = gameMode === 'CAMPAIGN';
  const hasNextLevel = isCampaign && campaignLevel < MAX_CAMPAIGN_LEVEL;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none animate-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-sm max-h-[95dvh] bg-slate-900 border border-amber-500/30 rounded-3xl p-5 text-center shadow-2xl flex flex-col items-center overflow-y-auto">
        {/* Victory Ribbon & Trophy */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/30 mb-2 animate-bounce">
          {isCampaign ? '🏰' : '🏆'}
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-amber-400 font-['Outfit'] tracking-wider uppercase mb-0.5">
          {isCampaign ? `¡Nivel ${campaignLevel} Superado!` : '¡VICTORIA!'}
        </h2>
        <p className="text-xs text-slate-300 mb-3">
          {isCampaign
            ? campaignLevel < MAX_CAMPAIGN_LEVEL
              ? `Has superado las colinas del Nivel ${campaignLevel}. ¡El Nivel ${campaignLevel + 1} está desbloqueado!`
              : '¡Hazaña legendaria! Has completado los 20 niveles de la Campaña.'
            : 'Has dominado el desnivel del terreno con puntería impecable.'}
        </p>

        {/* Automatic Coin Reward Badge */}
        <div className="w-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/40 rounded-2xl p-3 mb-2.5 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide block">
              {isCampaign ? `Premio Nivel ${campaignLevel} Superado` : 'Recompensa de Victoria'}
            </span>
            <span className="text-xs text-slate-400">Añadidas a tu cuenta</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-slate-950 font-black text-base rounded-xl shadow">
            <span>+{coinsEarned}</span>
            <span>🪙</span>
          </div>
        </div>

        {/* Daily Missions Claim Alert if any mission completed */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenDailyMissions();
          }}
          className={`w-full mb-2.5 px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
            claimableMissions > 0
              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800 text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span>🎯</span>
            <span>
              {claimableMissions > 0
                ? `¡${claimableMissions} Misión(es) lista(s) para reclamar!`
                : 'Ver progreso de Misiones Diarias'}
            </span>
          </span>
          <span className="text-amber-400 font-black">Abrir →</span>
        </button>

        {/* Battle Stats breakdown */}
        <div className="w-full grid grid-cols-2 gap-2 text-xs text-slate-300 mb-3">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Headshots</span>
            <span className="font-mono text-sm font-bold text-amber-400 tabular-nums">
              {headshots} 🎯
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Modo</span>
            <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
              {isCampaign ? `Campaña Nv.${campaignLevel}` : 'Duelo Rápido'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2">
          {/* Next Level CTA in Campaign Mode */}
          {hasNextLevel && onNextCampaignLevel && (
            <button
              onClick={() => {
                sound.playClick();
                onNextCampaignLevel();
              }}
              className="w-full py-3.5 px-4 rounded-2xl font-black text-sm uppercase tracking-wide bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 active:scale-95 transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>⏭️</span>
              <span>Siguiente Nivel (Nivel {campaignLevel + 1})</span>
            </button>
          )}

          {/* Roulette Video Ad Call-to-Action */}
          {isOnline ? (
            <button
              onClick={() => {
                sound.playClick();
                onSpinRouletteWithAd();
              }}
              className="w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wide bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 active:scale-95 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🎰</span>
              <span>Girar Ruleta (Ver Video)</span>
            </button>
          ) : (
            <div className="w-full flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-left">
              <button
                disabled
                className="w-full py-2 px-3 rounded-xl font-bold text-xs uppercase bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              >
                🎰 Ruleta Deshabilitada (Offline)
              </button>
              <div className="flex items-center gap-1.5 text-[10px] text-rose-400 font-medium">
                <span>⚠️</span>
                <span>Se requiere conexión a internet para ver el anuncio y girar la ruleta.</span>
              </div>
            </div>
          )}

          {/* Secondary buttons */}
          <div className="grid grid-cols-2 gap-2 mt-0.5">
            <button
              onClick={() => {
                sound.playClick();
                onPlayAgain();
              }}
              className="py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all border border-slate-700 cursor-pointer"
            >
              🔄 {isCampaign ? `Repetir Nv.${campaignLevel}` : 'Jugar Otra Vez'}
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onGoToMenu();
              }}
              className="py-2.5 px-3 rounded-xl font-bold text-xs text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-900 active:scale-95 transition-all border border-slate-800 cursor-pointer"
            >
              🏠 Ir al Menú
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

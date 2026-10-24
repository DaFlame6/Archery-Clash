import React, { useState, useEffect } from 'react';
import {
  getDailyMissions,
  claimDailyMissionReward,
  claimDailyBonusChest,
  getCoins,
} from '../utils/storage';
import { DailyMissionsState } from '../types/game';
import { sound } from '../audio/soundEffects';

interface DailyMissionsModalProps {
  onClose: () => void;
  onCoinsChanged: (newCoins: number) => void;
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({
  onClose,
  onCoinsChanged,
}) => {
  const [missionsState, setMissionsState] = useState<DailyMissionsState>(() => getDailyMissions());
  const [coins, setCoins] = useState<number>(() => getCoins());
  const [claimBanner, setClaimBanner] = useState<string | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  // Calculate countdown until local midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setTimeUntilReset(`${hours}h ${minutes}m`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClaimMission = (missionId: string, title: string) => {
    const result = claimDailyMissionReward(missionId);
    if (result.success) {
      sound.playCoin();
      setMissionsState({ ...result.state });
      setCoins(result.newBalance);
      onCoinsChanged(result.newBalance);
      setClaimBanner(`¡Reclamaste +${result.rewardCoins} 🪙 por "${title}"!`);
      setTimeout(() => setClaimBanner(null), 3000);
    }
  };

  const handleClaimBonusChest = () => {
    const result = claimDailyBonusChest();
    if (result.success) {
      sound.playVictory();
      setMissionsState({ ...result.state });
      setCoins(result.newBalance);
      onCoinsChanged(result.newBalance);
      setClaimBanner(`🎉 ¡Cofre Diario Reclamado! +${result.rewardCoins} 🪙 extra`);
      setTimeout(() => setClaimBanner(null), 3500);
    }
  };

  const completedCount = missionsState.missions.filter((m) => m.progress >= m.target).length;
  const totalCount = missionsState.missions.length;
  const allCompleted = completedCount === totalCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-[420px] max-h-[90vh] bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h2 className="text-xl font-black font-['Outfit'] tracking-wide uppercase text-white">
                Misiones Diarias
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
              <span>⏳ Reinicio en: <strong className="text-amber-400 font-mono">{timeUntilReset}</strong></span>
              <span>·</span>
              <span>Progreso: <strong className="text-emerald-400 font-mono">{completedCount}/{totalCount}</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 font-mono font-black text-xs flex items-center gap-1">
              <span>🪙</span>
              <span>{coins}</span>
            </div>
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center font-bold text-sm active:scale-95 transition-all cursor-pointer"
              title="Cerrar misiones"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Claimed Reward Notification Toast */}
        {claimBanner && (
          <div className="mx-4 mt-3 px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-bold text-center shadow-lg animate-in fade-in zoom-in-95">
            {claimBanner}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {/* Grand Daily Bonus Chest Card */}
          <div
            className={`relative rounded-2xl p-4 border transition-all ${
              allCompleted && !missionsState.bonusChestClaimed
                ? 'bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 border-amber-400 shadow-lg shadow-amber-500/15'
                : 'bg-slate-950/70 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${
                    allCompleted
                      ? 'bg-amber-400/20 border-amber-400 animate-bounce'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                >
                  🎁
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-['Outfit']">
                      Cofre de Maestría Diaria
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Completa las 4 misiones de hoy para ganar un bono extra.
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                {missionsState.bonusChestClaimed ? (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                    ✓ Reclamado
                  </span>
                ) : allCompleted ? (
                  <button
                    onClick={handleClaimBonusChest}
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-xs uppercase tracking-wide shadow-md active:scale-95 transition-all cursor-pointer animate-pulse"
                  >
                    Reclamar +{missionsState.bonusChestReward} 🪙
                  </button>
                ) : (
                  <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold text-xs">
                    +{missionsState.bonusChestReward} 🪙
                  </div>
                )}
              </div>
            </div>

            {/* Overall Chest Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                <span>Misiones completadas hoy</span>
                <span className="font-mono text-amber-300">
                  {completedCount} / {totalCount}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Individual Daily Mission Cards */}
          <div className="space-y-2.5">
            {missionsState.missions.map((mission) => {
              const isCompleted = mission.progress >= mission.target;
              const isClaimable = isCompleted && !mission.claimed;
              const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));

              return (
                <div
                  key={mission.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isClaimable
                      ? 'bg-emerald-950/35 border-emerald-500/60 shadow-md shadow-emerald-500/10'
                      : mission.claimed
                      ? 'bg-slate-950/40 border-slate-800/70 opacity-75'
                      : 'bg-slate-800/55 border-slate-700/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${
                          isCompleted
                            ? 'bg-emerald-500/20 border-emerald-500/40'
                            : 'bg-slate-900 border-slate-700'
                        }`}
                      >
                        {mission.icon}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">
                          {mission.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                          {mission.description}
                        </p>
                      </div>
                    </div>

                    {/* Action / Reward Badge */}
                    <div className="shrink-0">
                      {mission.claimed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 text-[11px] font-bold">
                          ✓ +{mission.rewardCoins} 🪙
                        </span>
                      ) : isClaimable ? (
                        <button
                          onClick={() => handleClaimMission(mission.id, mission.title)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wide shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer animate-bounce"
                        >
                          ¡Reclamar +{mission.rewardCoins} 🪙!
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs">
                          +{mission.rewardCoins} 🪙
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                      <span className={isCompleted ? 'text-emerald-400' : 'text-slate-400'}>
                        {mission.claimed
                          ? 'Misión completada y reclamada'
                          : isCompleted
                          ? '¡Lista para reclamar!'
                          : 'En progreso'}
                      </span>
                      <span className="font-mono tabular-nums text-slate-200">
                        {mission.progress} / {mission.target}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCompleted
                            ? 'bg-emerald-400'
                            : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Las misiones se guardan 100% offline</span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
};

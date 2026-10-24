import React, { useState, useEffect } from 'react';
import { GameMode } from '../types/game';
import { SKINS_DATABASE, RARITY_CONFIG, getSkinIcon, getArrowTypeMeta } from '../utils/skins';
import {
  getStats,
  getDailyMissions,
  getClaimableMissionsCount,
  getCampaignLevelReward,
  MAX_CAMPAIGN_LEVEL,
} from '../utils/storage';
import { sound } from '../audio/soundEffects';

// Mandatory global mode state variable ('levels' by default)
export let currentSelectedMode: 'levels' | 'endless' | 'quick' = 'levels';

declare global {
  interface Window {
    currentSelectedMode?: 'levels' | 'endless' | 'quick';
  }
}

interface MainMenuProps {
  equippedSkin: string;
  coins: number;
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  selectedLevel: number;
  highestUnlockedLevel: number;
  onSelectLevel: (level: number) => void;
  bestEndlessStreak: number;
  onStartGame: () => void;
  onOpenShop: () => void;
  onOpenDailyMissions: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  equippedSkin,
  coins,
  selectedMode,
  onSelectMode,
  selectedLevel,
  highestUnlockedLevel,
  onSelectLevel,
  bestEndlessStreak,
  onStartGame,
  onOpenShop,
  onOpenDailyMissions,
}) => {
  const [isLevelMapOpen, setIsLevelMapOpen] = useState<boolean>(false);

  useEffect(() => {
    const mapped =
      selectedMode === 'CAMPAIGN' ? 'levels' : selectedMode === 'ENDLESS' ? 'endless' : 'quick';
    currentSelectedMode = mapped;
    window.currentSelectedMode = mapped;
  }, [selectedMode]);

  const currentSkin = SKINS_DATABASE.find((s) => s.id === equippedSkin) || SKINS_DATABASE[0];
  const stats = getStats();
  const dailyState = getDailyMissions();
  const claimableCount = getClaimableMissionsCount();
  const completedMissions = dailyState.missions.filter((m) => m.progress >= m.target).length;
  const rarityInfo = RARITY_CONFIG[currentSkin.rarity];
  const arrowMeta = getArrowTypeMeta(currentSkin.visual.arrowType);
  const icon = getSkinIcon(currentSkin.id);
  const levelReward = getCampaignLevelReward(selectedLevel);

  const activeLevelNumber =
    selectedLevel || Number(localStorage.getItem('archery_level') || 1);

  const getLevelDifficultyLabel = (lvl: number) => {
    if (lvl <= 5) return 'Colina Baja · Viento Suave · Distancia Corta';
    if (lvl <= 10) return '1-2 Colinas · Viento Medio · Distancia Media';
    if (lvl <= 15) return '2 Cumbres Altas · Viento Fuerte · Gran Distancia';
    return 'Cordillera Extrema · Viento Máximo · IA Letal';
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between px-3 py-1.5 sm:p-3.5 select-none text-white overflow-hidden">
      {/* 1. Compact Hero Title & Branding */}
      <div className="flex flex-col items-center text-center shrink-0">
        <div className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">
          Terreno Dinámico con Colinas · 32 Campeones
        </div>
        <h1 className="text-xl sm:text-2xl font-black font-['Outfit'] tracking-tight text-white uppercase drop-shadow-md leading-none">
          ARCHERY <span className="text-amber-400">CLASH</span>
        </h1>
      </div>

      {/* 2. Center Character Showcase Card + Armory/Missions Buttons Row */}
      <div className="relative bg-gradient-to-b from-slate-900 via-slate-800/95 to-slate-900 border border-slate-700/80 rounded-2xl p-2 sm:p-2.5 shadow-xl flex flex-col items-center text-center overflow-hidden shrink-0">
        {/* Glow backdrop */}
        <div
          className="absolute -top-10 w-36 h-36 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: currentSkin.visual.secondaryColor }}
        />

        <div className="flex items-center gap-2 w-full justify-between px-1">
          {/* Character Icon / Avatar */}
          <div className="flex items-center gap-2.5 text-left min-w-0">
            <div
              className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-lg border-2 shrink-0"
              style={{
                backgroundColor: `${currentSkin.visual.primaryColor}30`,
                borderColor: currentSkin.visual.primaryColor,
                boxShadow: `0 0 16px ${currentSkin.visual.secondaryColor}40`,
              }}
            >
              {icon}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${rarityInfo.badgeColor} ${rarityInfo.textColor} ${rarityInfo.borderColor}`}
                >
                  {rarityInfo.label}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-700 font-bold truncate">
                  {arrowMeta.label}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white font-['Outfit'] leading-tight truncate">
                {currentSkin.name}
              </h2>
              <span className="text-[10px] text-amber-300 font-semibold block truncate">
                {currentSkin.weapon}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Row: Armory & Daily Missions */}
        <div className="grid grid-cols-2 gap-2 w-full mt-2">
          <button
            onClick={() => {
              sound.playClick();
              onOpenShop();
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors flex items-center justify-center gap-1.5 active:scale-95 shadow cursor-pointer"
          >
            <span>🛡️ Armería</span>
            <span className="text-amber-400 font-mono font-bold">({coins} 🪙)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenDailyMissions();
            }}
            className={`relative px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow cursor-pointer ${
              claimableCount > 0
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
            }`}
          >
            <span>🎯 Misiones</span>
            <span className="font-mono text-amber-300">
              ({completedMissions}/{dailyState.missions.length})
            </span>
            {claimableCount > 0 && (
              <span className="-top-1.5 -right-1.5 absolute px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-[9px] uppercase shadow animate-bounce">
                ¡+{claimableCount}!
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 3. Compact Daily Missions Quick Tracker Card */}
      <div
        onClick={() => {
          sound.playClick();
          onOpenDailyMissions();
        }}
        className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-2 text-xs transition-all cursor-pointer shrink-0"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-amber-400 uppercase text-[10px] font-black tracking-wider font-['Outfit'] flex items-center gap-1">
            🎯 Misiones Diarias (Hasta +435 🪙 hoy)
          </span>
          <span className="text-[10px] font-bold text-emerald-400 hover:underline">
            {claimableCount > 0 ? `¡Reclamar (${claimableCount})! →` : 'Ver todas →'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {dailyState.missions.slice(0, 2).map((m) => {
            const done = m.progress >= m.target;
            return (
              <div
                key={m.id}
                className="p-1.5 rounded-xl bg-slate-950/70 border border-slate-800/90 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-slate-200 truncate">
                    {m.icon} {m.title}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0">
                    +{m.rewardCoins}🪙
                  </span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full ${
                      done ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Mode-specific info & Campaign Level Map Trigger */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2 flex flex-col gap-1.5 shrink-0 shadow-lg">
        {selectedMode === 'CAMPAIGN' && (
          <div className="flex items-center justify-between gap-1.5 bg-slate-950/90 border border-blue-500/35 rounded-xl px-2 py-1.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  sound.playClick();
                  onSelectLevel(Math.max(1, selectedLevel - 1));
                }}
                disabled={selectedLevel <= 1}
                className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center border transition-all ${
                  selectedLevel > 1
                    ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600 cursor-pointer active:scale-95'
                    : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                }`}
                title="Nivel anterior"
              >
                ◀
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  onSelectLevel(Math.min(highestUnlockedLevel, selectedLevel + 1));
                }}
                disabled={selectedLevel >= highestUnlockedLevel}
                className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center border transition-all ${
                  selectedLevel < highestUnlockedLevel
                    ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600 cursor-pointer active:scale-95'
                    : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                }`}
                title="Siguiente nivel desbloqueado"
              >
                ▶
              </button>
            </div>

            <div className="flex flex-col items-center text-center min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-blue-300 font-['Outfit'] uppercase">
                  Nivel {activeLevelNumber} / {MAX_CAMPAIGN_LEVEL}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[9px] font-bold">
                  +{levelReward} 🪙
                </span>
              </div>
              <span className="text-[9px] text-slate-400 truncate max-w-full">
                {getLevelDifficultyLabel(activeLevelNumber)}
              </span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setIsLevelMapOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400 text-blue-200 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer shadow"
            >
              <span>🗺️</span>
              <span>Fases</span>
            </button>
          </div>
        )}

        {selectedMode === 'ENDLESS' && (
          <div className="flex items-center justify-between bg-purple-950/35 border border-purple-500/35 rounded-xl px-3 py-1.5 text-[11px]">
            <div>
              <span className="font-bold text-purple-200 block">
                🔥 Supervivencia (+25 HP por rival vencido)
              </span>
              <span className="text-[10px] text-slate-400">
                La vida se conserva entre rondas con colinas dinámicas
              </span>
            </div>
            <div className="text-right shrink-0 pl-2">
              <span className="text-[9px] uppercase text-amber-300 font-black block">
                Mejor Racha: {bestEndlessStreak} Rivales
              </span>
              <span className="font-mono font-bold text-[10px] text-purple-300">
                🏆 Récord Local
              </span>
            </div>
          </div>
        )}

        {selectedMode === 'QUICK_DUEL' && (
          <div className="flex items-center justify-between bg-emerald-950/25 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-[11px]">
            <div>
              <span className="font-bold text-emerald-200 block">
                ⚡ Duelo Rápido 1v1 con Colinas Procedurales
              </span>
              <span className="text-[10px] text-slate-400">
                Alturas y colinas aleatorias en cada partida
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold shrink-0">
              +25 🪙
            </span>
          </div>
        )}
      </div>

      {/* 5. Mandatory Mode Selector DOM Block + Main Yellow CTA Button + Quick Stats Bar */}
      <div className="flex flex-col shrink-0">
        {/* EXACT MANDATORY DOM BLOCK (#game-mode-selector) */}
        <div
          id="game-mode-selector"
          style={{ display: 'flex', gap: '8px', marginBottom: '10px', width: '100%' }}
        >
          <button
            id="mode-levels-btn"
            className={`mode-tab-btn ${selectedMode === 'CAMPAIGN' ? 'active' : ''}`}
            onClick={() => {
              sound.playClick();
              currentSelectedMode = 'levels';
              window.currentSelectedMode = 'levels';
              onSelectMode('CAMPAIGN');
            }}
            style={
              selectedMode === 'CAMPAIGN'
                ? {
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: '10px',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    border: '2px solid #60a5fa',
                    cursor: 'pointer',
                  }
                : {
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: '10px',
                    background: '#1e293b',
                    color: '#94a3b8',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    border: '2px solid #334155',
                    cursor: 'pointer',
                  }
            }
          >
            🏹 Niveles ({activeLevelNumber})
          </button>

          <button
            id="mode-endless-btn"
            className={`mode-tab-btn ${selectedMode === 'ENDLESS' ? 'active' : ''}`}
            onClick={() => {
              sound.playClick();
              currentSelectedMode = 'endless';
              window.currentSelectedMode = 'endless';
              onSelectMode('ENDLESS');
            }}
            style={
              selectedMode === 'ENDLESS'
                ? {
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: '10px',
                    background: '#6d28d9',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    border: '2px solid #a78bfa',
                    cursor: 'pointer',
                  }
                : {
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: '10px',
                    background: '#1e293b',
                    color: '#94a3b8',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    border: '2px solid #334155',
                    cursor: 'pointer',
                  }
            }
          >
            ♾️ Infinito
          </button>

          <button
            id="mode-quick-btn"
            className={`mode-tab-btn ${selectedMode === 'QUICK_DUEL' ? 'active' : ''}`}
            onClick={() => {
              sound.playClick();
              currentSelectedMode = 'quick';
              window.currentSelectedMode = 'quick';
              onSelectMode('QUICK_DUEL');
            }}
            style={
              selectedMode === 'QUICK_DUEL'
                ? {
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: '10px',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    border: '2px solid #60a5fa',
                    cursor: 'pointer',
                  }
                : {
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: '10px',
                    background: '#1e293b',
                    color: '#94a3b8',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    border: '2px solid #334155',
                    cursor: 'pointer',
                  }
            }
          >
            ⚔️ Rápido
          </button>
        </div>

        {/* MAIN YELLOW ACTION BUTTON (#btn-entrar-duelo) */}
        <button
          id="btn-entrar-duelo"
          onClick={() => {
            sound.playClick();
            onStartGame();
          }}
          className="w-full py-2.5 sm:py-3 px-5 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 active:scale-95 transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>
            {selectedMode === 'CAMPAIGN'
              ? `¡JUGAR NIVEL ${activeLevelNumber}!`
              : selectedMode === 'ENDLESS'
              ? '¡SOBREVIVIR EN MODO INFINITO!'
              : '¡ENTRAR AL DUELO!'}
          </span>
        </button>

        {/* Quick Stats bar */}
        <div className="flex items-center justify-around py-1 px-2 mt-1.5 bg-slate-950/60 border border-slate-800/70 rounded-xl text-[10px] sm:text-[11px] text-slate-400">
          <span>
            Campaña: <strong className="text-amber-400 font-mono">Nv.{highestUnlockedLevel}/20</strong>
          </span>
          <span>
            Mejor Racha: <strong className="text-purple-400 font-mono">{bestEndlessStreak} Rivales</strong>
          </span>
          <span>
            Victorias: <strong className="text-emerald-400 font-mono">{stats.victories}</strong>
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL DE MAPA DE FASES (Listado / Grid de Niveles 1 al 20)           */}
      {/* ==================================================================== */}
      {isLevelMapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90dvh] bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-4 shadow-2xl flex flex-col justify-between overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                  Modo Campaña · Progresión Balística
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white font-['Outfit'] uppercase">
                  🗺️ Mapa de Fases (1 al 20)
                </h3>
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  setIsLevelMapOpen(false);
                }}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center border border-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Progress Banner */}
            <div className="my-2.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs shrink-0">
              <span className="text-slate-300 font-semibold">
                Fases Desbloqueadas:{' '}
                <strong className="text-amber-400 font-mono">
                  {highestUnlockedLevel} / {MAX_CAMPAIGN_LEVEL}
                </strong>
              </span>
              <span className="text-emerald-400 font-mono font-bold text-[11px]">
                Premio: +50 🪙 / Nivel
              </span>
            </div>

            {/* 20 Levels Grid (4 columns x 5 rows) with Stars & Locks */}
            <div className="grid grid-cols-4 gap-2 overflow-y-auto py-1 pr-1 flex-1 min-h-0">
              {Array.from({ length: MAX_CAMPAIGN_LEVEL }, (_, idx) => {
                const lvl = idx + 1;
                const isUnlocked = lvl <= highestUnlockedLevel;
                const isCompleted = lvl < highestUnlockedLevel;
                const isSelected = lvl === selectedLevel;

                return (
                  <button
                    key={lvl}
                    disabled={!isUnlocked}
                    onClick={() => {
                      if (!isUnlocked) return;
                      sound.playClick();
                      currentSelectedMode = 'levels';
                      window.currentSelectedMode = 'levels';
                      onSelectMode('CAMPAIGN');
                      onSelectLevel(lvl);
                    }}
                    className={`relative p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${
                      !isUnlocked
                        ? 'bg-slate-950/60 border-slate-800/80 text-slate-600 cursor-not-allowed opacity-70'
                        : isSelected
                        ? 'bg-gradient-to-b from-blue-500/40 to-blue-600/20 border-blue-400 text-white shadow-lg shadow-blue-500/25 scale-[1.03] cursor-pointer'
                        : isCompleted
                        ? 'bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-400 text-emerald-200 cursor-pointer'
                        : 'bg-slate-800/90 border-amber-500/50 hover:border-amber-400 text-amber-200 cursor-pointer'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      Fase
                    </span>
                    <span className="text-base font-black font-mono leading-none">{lvl}</span>
                    <span className="text-[10px] mt-0.5 leading-none">
                      {!isUnlocked ? '🔒' : isCompleted ? '⭐⭐⭐' : '⭐'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Level Preview & Launch CTA */}
            <div className="pt-3 mt-2 border-t border-slate-800 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between text-xs px-1">
                <div>
                  <span className="font-black text-amber-300 uppercase">
                    Nivel {selectedLevel} Seleccionado
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {getLevelDifficultyLabel(selectedLevel)}
                  </span>
                </div>
                <span className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold">
                  +50 🪙
                </span>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  setIsLevelMapOpen(false);
                  currentSelectedMode = 'levels';
                  window.currentSelectedMode = 'levels';
                  onSelectMode('CAMPAIGN');
                  onStartGame();
                }}
                className="w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 active:scale-95 transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🏹</span>
                <span>¡JUGAR NIVEL {selectedLevel}!</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

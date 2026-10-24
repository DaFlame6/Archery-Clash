import React, { useState } from 'react';
import { Volume2, VolumeX, Music, Wifi, WifiOff } from 'lucide-react';
import { sound } from '../audio/soundEffects';

interface TopBarProps {
  coins: number;
  isMuted: boolean;
  onToggleMute: () => void;
  isOnline: boolean;
  simulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  onOpenShop: () => void;
  onOpenDailyMissions: () => void;
  claimableMissionsCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  coins,
  isMuted,
  onToggleMute,
  isOnline,
  simulatedOffline,
  onToggleSimulatedOffline,
  onOpenShop,
  onOpenDailyMissions,
  claimableMissionsCount,
}) => {
  const [isMusicOn, setIsMusicOn] = useState<boolean>(() => sound.getMusicEnabled());

  const handleToggleMusic = () => {
    sound.playClick();
    const enabled = sound.toggleMusic();
    setIsMusicOn(enabled);
  };

  return (
    <header className="w-full shrink-0 flex items-center justify-between gap-1.5 px-3 py-1.5 sm:py-2 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white z-40 select-none">
      {/* Zone 1: Brand wordmark */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-sm sm:text-base font-black tracking-tight text-white font-['Outfit'] whitespace-nowrap">
          ARCHERY <span className="text-amber-400">CLASH</span>
        </span>
      </div>

      {/* Zone 2: Offline status toggle, Background Music toggle & Sound mute toggle */}
      <div className="flex items-center gap-1">
        {/* Simulated offline toggle button so user can test offline roulette warning */}
        <button
          onClick={onToggleSimulatedOffline}
          className={`min-h-[30px] px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
            simulatedOffline || !isOnline
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
          }`}
          title="Alternar simulación de internet offline/online"
        >
          {simulatedOffline || !isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Offline</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Online</span>
            </>
          )}
        </button>

        {/* Background Music toggle */}
        <button
          onClick={handleToggleMusic}
          className={`min-h-[34px] min-w-[34px] flex items-center justify-center p-1.5 rounded-xl border transition-colors cursor-pointer ${
            !isMuted && isMusicOn
              ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-500 border-slate-700'
          }`}
          title={isMusicOn ? 'Silenciar música de fondo' : 'Activar música de fondo'}
        >
          <Music className="w-4 h-4" />
        </button>

        {/* Master Audio & Shooting SFX Mute toggle */}
        <button
          onClick={() => {
            sound.playClick();
            onToggleMute();
          }}
          className="min-h-[34px] min-w-[34px] flex items-center justify-center p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          title={isMuted ? 'Activar efectos y sonido' : 'Silenciar todo el sonido'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* Zone 3: Daily Missions shortcut & Coins/Shop button */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => {
            sound.playClick();
            onOpenDailyMissions();
          }}
          className="relative min-h-[34px] flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition-all cursor-pointer"
          title="Misiones Diarias"
        >
          <span>🎯</span>
          <span className="hidden xs:inline text-[11px]">Misiones</span>
          {claimableMissionsCount > 0 && (
            <span className=" -top-1.5 -right-1.5 absolute min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow animate-bounce">
              {claimableMissionsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onOpenShop();
          }}
          className="min-h-[34px] flex items-center gap-1.5 px-2.5 py-1 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all whitespace-nowrap cursor-pointer"
        >
          <span>🪙</span>
          <span className="font-mono tabular-nums">{coins}</span>
          <span className="text-[10px] bg-slate-950/10 px-1 py-0.5 rounded font-bold">Tienda</span>
        </button>
      </div>
    </header>
  );
};


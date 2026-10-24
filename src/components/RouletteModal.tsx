import React, { useState, useRef, useEffect } from 'react';
import { sound } from '../audio/soundEffects';
import { addCoins, unlockRandomLegendSkin } from '../utils/storage';
import { getSkinIcon } from '../utils/skins';
import { RoulettePrizeType, Skin } from '../types/game';

interface RouletteModalProps {
  baseCoinsWon: number;
  onClose: () => void;
  onSkinUnlocked?: () => void;
}

// 8 sectors layout mapping to probabilities
interface WheelSector {
  type: RoulettePrizeType;
  label: string;
  icon: string;
  color: string;
  sublabel: string;
}

const SECTORS: WheelSector[] = [
  { type: 'x2', label: 'x2', sublabel: '50 🪙', icon: '⚡', color: '#2563eb' },
  { type: 'x5', label: 'x5', sublabel: '125 🪙', icon: '🔥', color: '#7c3aed' },
  { type: 'x2', label: 'x2', sublabel: '50 🪙', icon: '⚡', color: '#1d4ed8' },
  { type: 'legend_skin', label: 'LEYENDA', sublabel: '¡Skin!', icon: '👑', color: '#d97706' },
  { type: 'x2', label: 'x2', sublabel: '50 🪙', icon: '⚡', color: '#2563eb' },
  { type: 'x5', label: 'x5', sublabel: '125 🪙', icon: '🔥', color: '#6d28d9' },
  { type: 'x2', label: 'x2', sublabel: '50 🪙', icon: '⚡', color: '#1e40af' },
  { type: 'x10', label: 'x10', sublabel: '250 🪙', icon: '💎', color: '#059669' },
];

export const RouletteModal: React.FC<RouletteModalProps> = ({
  baseCoinsWon,
  onClose,
  onSkinUnlocked,
}) => {
  const [spinning, setSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [wonPrize, setWonPrize] = useState<{
    type: RoulettePrizeType;
    label: string;
    description: string;
    coinsAwarded: number;
    unlockedSkin?: Skin;
  } | null>(null);

  const currentRotationRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Exact probabilities: x2 (60%), x5 (30%), x10 (5%), legend_skin (5%)
  const rollPrizeType = (): RoulettePrizeType => {
    const r = Math.random();
    if (r < 0.60) return 'x2';
    if (r < 0.90) return 'x5';
    if (r < 0.95) return 'x10';
    return 'legend_skin';
  };

  // Draw the colorful wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 320;
    const center = size / 2;
    const radius = center - 12;
    const totalSectors = SECTORS.length;
    const arc = (Math.PI * 2) / totalSectors;

    ctx.clearRect(0, 0, size, size);

    // Save and rotate according to current rotation
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((rotation * Math.PI) / 180);

    // Outer rim
    ctx.beginPath();
    ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Draw sectors
    SECTORS.forEach((sec, idx) => {
      const startAngle = idx * arc;
      const endAngle = startAngle + arc;

      // Sector slice
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = sec.color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();

      // Sector text & icon
      ctx.save();
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';

      // Icon & Label
      ctx.font = 'bold 18px "Outfit", sans-serif';
      ctx.fillText(`${sec.icon} ${sec.label}`, radius - 20, 6);

      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText(sec.sublabel, radius - 22, 22);

      ctx.restore();
    });

    // Center hub
    const hubGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 24);
    hubGrad.addColorStop(0, '#fef08a');
    hubGrad.addColorStop(0.5, '#f59e0b');
    hubGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = hubGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }, [rotation]);

  // Spin the wheel
  const handleSpin = () => {
    if (spinning || wonPrize) return;
    setSpinning(true);

    const prizeType = rollPrizeType();

    // Find candidate sectors that match this prize type
    const matchingIndices: number[] = [];
    SECTORS.forEach((s, idx) => {
      if (s.type === prizeType) matchingIndices.push(idx);
    });

    // Pick one of the matching sectors randomly
    const targetSectorIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];

    const sectorArcDeg = 360 / SECTORS.length;
    const sectorCenterDeg = targetSectorIndex * sectorArcDeg + sectorArcDeg / 2;
    // Pointer is at 270 deg (top)
    const normalizedTargetDeg = (270 - sectorCenterDeg + 360) % 360;

    const fullSpins = 6;
    const finalAngle = currentRotationRef.current + fullSpins * 360 + normalizedTargetDeg;

    const startTime = performance.now();
    const duration = 4500;
    const startAngle = currentRotationRef.current;
    let lastTickAngle = startAngle;

    const animateSpin = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Ease out cubic deceleration
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + (finalAngle - startAngle) * ease;

      // Play tick sound every ~30 deg passing
      if (Math.abs(currentAngle - lastTickAngle) >= 30) {
        sound.playRouletteTick(500 + Math.random() * 200);
        lastTickAngle = currentAngle;
      }

      setRotation(currentAngle);
      currentRotationRef.current = currentAngle;

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        // Finished spinning!
        setSpinning(false);
        sound.playVictory();

        let extraCoins = 0;
        let desc = '';
        let unlockedLegendSkin: Skin | undefined;

        if (prizeType === 'x2') {
          extraCoins = baseCoinsWon * 2 - baseCoinsWon; // +25 coins
          addCoins(extraCoins);
          desc = `¡Multiplicador x2! Ganaste +${extraCoins} monedas adicionales (Total: 50 🪙).`;
        } else if (prizeType === 'x5') {
          extraCoins = baseCoinsWon * 5 - baseCoinsWon; // +100 coins
          addCoins(extraCoins);
          desc = `¡Multiplicador x5! Ganaste +${extraCoins} monedas adicionales (Total: 125 🪙).`;
        } else if (prizeType === 'x10') {
          extraCoins = baseCoinsWon * 10 - baseCoinsWon; // +225 coins
          addCoins(extraCoins);
          desc = `¡JACKPOT x10! Ganaste +${extraCoins} monedas adicionales (Total: 250 🪙).`;
        } else if (prizeType === 'legend_skin') {
          const res = unlockRandomLegendSkin();
          if (res) {
            unlockedLegendSkin = res.skin;
            if (res.isNew) {
              desc = `¡DESBLOQUEO LEYENDA! Has obtenido a "${res.skin.name}" (${res.skin.weapon}).`;
            } else {
              extraCoins = 3000;
              addCoins(extraCoins);
              desc = `¡Ya poseías todas las skins Leyenda! Has recibido un premio mayor de +3000 🪙 monedas.`;
            }
          }
          if (onSkinUnlocked) onSkinUnlocked();
        }

        setWonPrize({
          type: prizeType,
          label: SECTORS[targetSectorIndex].label,
          description: desc,
          coinsAwarded: extraCoins,
          unlockedSkin: unlockedLegendSkin,
        });
      }
    };

    requestAnimationFrame(animateSpin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm max-h-[95dvh] bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 text-center shadow-2xl flex flex-col items-center overflow-y-auto">
        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-amber-400 font-['Outfit'] uppercase tracking-wider mb-0.5">
          Ruleta de la Fortuna
        </h2>
        <p className="text-xs text-slate-400 mb-2">
          ¡Gira para multiplicar tus monedas o ganar una Skin Leyenda exclusiva!
        </p>

        {/* Wheel Container */}
        <div className="relative my-1.5 flex items-center justify-center">
          {/* Top Marker Pointer Arrow */}
          <div className="absolute -top-3 z-20 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />

          {/* Canvas Wheel */}
          <canvas
            ref={canvasRef}
            width={320}
            height={320}
            className="w-60 h-60 sm:w-72 sm:h-72 drop-shadow-2xl"
          />
        </div>

        {/* Probabilities Information Bar */}
        <div className="w-full flex items-center justify-between text-[11px] text-slate-400 py-2 px-3 bg-slate-950/70 rounded-xl border border-slate-800/80 my-2">
          <span>x2 (60%)</span>
          <span>x5 (30%)</span>
          <span className="text-emerald-400">x10 (5%)</span>
          <span className="text-amber-400 font-bold">👑 Leyenda (5%)</span>
        </div>

        {/* Action Controls or Reward Announcement */}
        {!wonPrize ? (
          <div className="w-full flex flex-col gap-2 mt-2">
            <button
              onClick={handleSpin}
              disabled={spinning}
              className={`w-full py-3.5 px-6 rounded-2xl font-black text-base text-slate-950 uppercase tracking-wide transition-all ${
                spinning
                  ? 'bg-amber-600/50 cursor-not-allowed text-slate-400'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer'
              }`}
            >
              {spinning ? 'Girando ruleta...' : '¡Girar Ruleta Ahora!'}
            </button>
            <button
              onClick={onClose}
              disabled={spinning}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 py-1 transition-colors"
            >
              Cerrar y Reclamar Premio Base
            </button>
          </div>
        ) : (
          <div className="w-full mt-2 flex flex-col items-center gap-2.5 animate-in zoom-in-95 duration-200">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl w-full text-center">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                ¡Premio Conseguido!
              </span>
              {wonPrize.unlockedSkin && (
                <div className="flex items-center justify-center gap-2 my-1">
                  <span className="text-3xl">{getSkinIcon(wonPrize.unlockedSkin.id)}</span>
                  <span className="font-bold text-white text-sm font-['Outfit']">
                    {wonPrize.unlockedSkin.name}
                  </span>
                </div>
              )}
              <p className="text-xs font-semibold text-slate-200">
                {wonPrize.description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 px-6 rounded-2xl font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-wider text-xs cursor-pointer"
            >
              ¡Reclamar Recompensa y Continuar!
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

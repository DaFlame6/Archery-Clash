import React, { useState, useEffect } from 'react';
import { sound } from '../audio/soundEffects';

interface InterstitialAdModalProps {
  onClose: () => void;
  reason?: 'defeat' | 'exit';
}

export const InterstitialAdModal: React.FC<InterstitialAdModalProps> = ({
  onClose,
  reason = 'exit',
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(5);
  const [canClose, setCanClose] = useState<boolean>(false);
  const [tapScore, setTapScore] = useState<number>(0);

  useEffect(() => {
    if (secondsLeft > 0) {
      const timer = setTimeout(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanClose(true);
    }
  }, [secondsLeft]);

  const handleClose = () => {
    if (!canClose) return;
    sound.playClick();
    onClose();
  };

  const handleTapTarget = () => {
    setTapScore((prev) => prev + 1);
    sound.playCoin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md select-none">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top bar with 5-second countdown and 'X' close button */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Anuncio {reason === 'defeat' ? 'de Partida' : ''}
            </span>
            <span className="text-xs text-slate-400">Patrocinado</span>
          </div>

          {/* Close button with 5s countdown */}
          <button
            onClick={handleClose}
            disabled={!canClose}
            className={`min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              canClose
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-white border border-red-500/40 active:scale-95 cursor-pointer shadow-lg'
                : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
            title={canClose ? 'Cerrar anuncio' : `Cerrar disponible en ${secondsLeft}s`}
          >
            <span className="text-sm font-black">✕</span>
            {canClose ? <span>Cerrar</span> : <span>{secondsLeft}s</span>}
          </button>
        </div>

        {/* Ad Body: Interactive Mini-Demo */}
        <div className="relative p-6 flex flex-col items-center text-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl mb-3 shadow-lg">
            🎯
          </div>

          <h3 className="text-xl font-black text-white font-['Outfit'] mb-1">
            TIRO AL BLANCO 3D
          </h3>
          <p className="text-xs text-slate-400 max-w-[260px] mb-4">
            ¡Prueba este mini-juego interactivo mientras termina el anuncio!
          </p>

          {/* Mini Playable Target */}
          <div
            onClick={handleTapTarget}
            className="w-36 h-36 rounded-full bg-gradient-to-tr from-rose-600 via-amber-500 to-rose-500 flex flex-col items-center justify-center cursor-pointer shadow-xl shadow-rose-600/30 border-4 border-white/20 active:scale-90 transition-transform mb-3"
          >
            <span className="text-2xl font-black text-white font-['Outfit']">
              ¡TÓCAME!
            </span>
            <span className="text-[11px] font-bold text-amber-200">
              Puntos: {tapScore}
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            {canClose
              ? '✅ Puedes cerrar el anuncio con la X arriba a la derecha.'
              : `El botón de cierre se habilitará en ${secondsLeft} segundos...`}
          </span>

          {/* 5-second progress indicator */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-4">
            <div
              className="h-full bg-amber-400 transition-all duration-1000 ease-linear"
              style={{ width: `${((5 - secondsLeft) / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
          <span>Juego 100% Gratuito</span>
          {canClose && (
            <button
              onClick={handleClose}
              className="text-amber-400 hover:text-amber-300 font-bold underline"
            >
              Volver al Menú
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

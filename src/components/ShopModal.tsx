import React, { useState } from 'react';
import { SkinRarity } from '../types/game';
import { SKINS_DATABASE, RARITY_CONFIG, getSkinIcon, getArrowTypeMeta } from '../utils/skins';
import {
  getCoins,
  getUnlockedSkins,
  getEquippedSkin,
  setEquippedSkin,
  spendCoins,
  unlockSkin,
} from '../utils/storage';
import { sound } from '../audio/soundEffects';

interface ShopModalProps {
  onClose: () => void;
  onSkinChanged: (skinId: string) => void;
}

const RARITY_ORDER: SkinRarity[] = ['Común', 'Raro', 'Épico', 'Leyenda'];

export const ShopModal: React.FC<ShopModalProps> = ({ onClose, onSkinChanged }) => {
  const [coins, setCoins] = useState<number>(getCoins());
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(getUnlockedSkins());
  const [equippedSkin, setEquipped] = useState<string>(getEquippedSkin());
  const [activeTab, setActiveTab] = useState<SkinRarity>(() => {
    const eq = SKINS_DATABASE.find((s) => s.id === getEquippedSkin());
    return eq ? eq.rarity : 'Común';
  });
  const [selectedSkinId, setSelectedSkinId] = useState<string>(equippedSkin);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const selectedSkin = SKINS_DATABASE.find((s) => s.id === selectedSkinId) || SKINS_DATABASE[0];

  const handleEquip = (skinId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sound.playClick();
    setEquippedSkin(skinId);
    setEquipped(skinId);
    setSelectedSkinId(skinId);
    onSkinChanged(skinId);
    const skin = SKINS_DATABASE.find((s) => s.id === skinId);
    setFeedbackMsg(`¡Has equipado a ${skin?.name || skinId}!`);
  };

  const handleBuy = (skinId: string, price: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedSkinId(skinId);

    if (coins < price) {
      sound.playMiss();
      setFeedbackMsg(`Saldo insuficiente. Te faltan ${price - coins} 🪙 para comprar esta skin.`);
      return;
    }

    const success = spendCoins(price);
    if (success) {
      sound.playCoin();
      unlockSkin(skinId);
      const updatedUnlocked = getUnlockedSkins();
      const updatedCoins = getCoins();
      setUnlockedSkins(updatedUnlocked);
      setCoins(updatedCoins);
      setEquippedSkin(skinId);
      setEquipped(skinId);
      onSkinChanged(skinId);
      const skin = SKINS_DATABASE.find((s) => s.id === skinId);
      setFeedbackMsg(`¡Compra exitosa! Has desbloqueado y equipado a ${skin?.name || skinId}.`);
    }
  };

  // Distinct rarity badge styling:
  // Común: Gris / Blanco plateado
  // Raro: Azul eléctrico
  // Épico: Morado brillante
  // Leyenda: Dorado / Naranja fuego
  const getRarityPillClasses = (rarity: SkinRarity) => {
    switch (rarity) {
      case 'Común':
        return 'bg-gradient-to-r from-slate-400/25 to-slate-200/20 text-slate-100 border-slate-300/60';
      case 'Raro':
        return 'bg-gradient-to-r from-blue-600/35 to-cyan-500/30 text-sky-300 border-sky-400';
      case 'Épico':
        return 'bg-gradient-to-r from-purple-600/40 to-fuchsia-600/35 text-purple-200 border-purple-400';
      case 'Leyenda':
        return 'bg-gradient-to-r from-amber-500/40 via-orange-500/35 to-yellow-500/40 text-amber-300 border-amber-400';
    }
  };

  const tabSkins = SKINS_DATABASE.filter((s) => s.rarity === activeTab);
  const selectedArrowMeta = getArrowTypeMeta(selectedSkin.visual.arrowType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[95dvh] bg-slate-900 border border-slate-800 rounded-3xl p-3.5 sm:p-5 shadow-2xl flex flex-col overflow-hidden">
        {/* Header with coins and close button */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-base sm:text-xl font-black text-white font-['Outfit'] uppercase tracking-wider">
              Armería · Archery Clash
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-400">
              Catálogo oficial de 32 skins (Común: 300 · Raro: 750 · Épico: 1500 · Leyenda: 3000)
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/40 rounded-xl shadow-sm">
              <span className="text-sm">🪙</span>
              <span className="font-mono font-black text-amber-300 text-xs sm:text-sm tabular-nums">{coins}</span>
            </div>
            <button
              onClick={onClose}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Cerrar tienda"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 4 Rarity Filter Tabs with fixed prices */}
        <div className="grid grid-cols-4 gap-1.5 my-2 p-1 bg-slate-950/90 rounded-2xl border border-slate-800 shrink-0">
          {RARITY_ORDER.map((rarity) => {
            const config = RARITY_CONFIG[rarity];
            const isActive = activeTab === rarity;
            const skinsInRarity = SKINS_DATABASE.filter((s) => s.rarity === rarity);
            const countUnlocked = skinsInRarity.filter((s) => unlockedSkins.includes(s.id)).length;

            return (
              <button
                key={rarity}
                onClick={() => {
                  sound.playClick();
                  setActiveTab(rarity);
                  const firstInTab = skinsInRarity[0];
                  if (!skinsInRarity.some((s) => s.id === selectedSkinId) && firstInTab) {
                    setSelectedSkinId(firstInTab.id);
                  }
                }}
                className={`py-1.5 px-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex flex-col items-center gap-0.5 cursor-pointer border ${
                  isActive
                    ? `${getRarityPillClasses(rarity)} shadow-lg`
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span className="text-[11px] sm:text-xs">{config.label}</span>
                <span className="text-[9px] sm:text-[10px] font-mono opacity-90">
                  {config.price} 🪙 · {countUnlocked}/8
                </span>
              </button>
            );
          })}
        </div>

        {/* Skins Grid for Active Tab (8 skins) */}
        <div className="flex-1 overflow-y-auto pr-1 my-1 min-h-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {tabSkins.map((skin) => {
              const isUnlocked = unlockedSkins.includes(skin.id);
              const isCurrentEquipped = equippedSkin === skin.id;
              const isSelected = selectedSkinId === skin.id;
              const canAfford = coins >= skin.price;
              const icon = getSkinIcon(skin.id);

              return (
                <div
                  key={skin.id}
                  onClick={() => {
                    setSelectedSkinId(skin.id);
                    sound.playClick();
                  }}
                  className={`relative flex flex-col items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/95 border-amber-400 shadow-lg ring-1 ring-amber-400/30'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Rarity Badge */}
                  <div className="w-full flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getRarityPillClasses(
                        skin.rarity
                      )}`}
                    >
                      {skin.rarity}
                    </span>

                    {isCurrentEquipped && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black">
                        EN USO
                      </span>
                    )}
                  </div>

                  {/* Character Avatar Box with visual colors */}
                  <div
                    className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-2xl my-1 shadow-inner border-2 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: `${skin.visual.primaryColor}35`,
                      borderColor: skin.visual.primaryColor,
                      boxShadow: `inset 0 0 10px ${skin.visual.secondaryColor}55`,
                    }}
                  >
                    {icon}
                    {/* Mini color dots */}
                    <div className="absolute -bottom-1 flex items-center gap-0.5 bg-slate-950/90 px-1 py-0.5 rounded-full border border-slate-700">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: skin.visual.primaryColor }}
                      />
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: skin.visual.secondaryColor }}
                      />
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: skin.visual.bowColor }}
                      />
                    </div>
                  </div>

                  {/* Name & Weapon */}
                  <div className="w-full text-center my-1">
                    <span className="font-bold text-[11px] text-white font-['Outfit'] block truncate">
                      {skin.name}
                    </span>
                    <span className="text-[9px] text-slate-400 block truncate">
                      {skin.weapon}
                    </span>
                  </div>

                  {/* Card Action Button: Equip / Equipped / Buy with fixed price */}
                  <div className="w-full mt-1">
                    {isUnlocked ? (
                      isCurrentEquipped ? (
                        <button
                          disabled
                          className="w-full py-1.5 px-2 rounded-xl font-black text-[10px] uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                        >
                          ✓ Equipada
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleEquip(skin.id, e)}
                          className="w-full py-1.5 px-2 rounded-xl font-black text-[10px] uppercase bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95 transition-all cursor-pointer shadow"
                        >
                          Equipar
                        </button>
                      )
                    ) : (
                      <button
                        onClick={(e) => handleBuy(skin.id, skin.price, e)}
                        disabled={!canAfford}
                        className={`w-full py-1.5 px-2 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-1 ${
                          canAfford
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-95 cursor-pointer shadow-md shadow-amber-500/15'
                            : 'bg-slate-800/90 text-slate-400 border border-slate-700/80 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span>{canAfford ? 'Comprar' : '🔒'}</span>
                        <span className="font-mono tabular-nums">{skin.price} 🪙</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Skin Detailed Spotlight Footer */}
        <div className="p-2.5 sm:p-3 bg-slate-950/95 rounded-2xl border border-slate-800 mt-1.5 flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border-2"
                style={{
                  backgroundColor: `${selectedSkin.visual.primaryColor}30`,
                  borderColor: selectedSkin.visual.primaryColor,
                }}
              >
                {getSkinIcon(selectedSkin.id)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-black text-white font-['Outfit'] truncate">
                    {selectedSkin.name}
                  </h3>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border shrink-0 ${getRarityPillClasses(
                      selectedSkin.rarity
                    )}`}
                  >
                    {selectedSkin.rarity} · {selectedSkin.price} 🪙
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-amber-300 font-medium block truncate">
                  Arma: {selectedSkin.weapon}
                </span>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${selectedArrowMeta.colorClass}`}
            >
              {selectedArrowMeta.label}
            </span>
          </div>

          <p className="text-[10px] sm:text-[11px] text-slate-300 leading-snug line-clamp-2">
            {selectedSkin.description}
          </p>

          {selectedSkin.rarity === 'Leyenda' && !unlockedSkins.includes(selectedSkin.id) && (
            <div className="text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 flex items-center justify-between">
              <span>👑 Skin de categoría Leyenda</span>
              <span className="font-bold">3000 🪙 o 5% Gratis en Ruleta</span>
            </div>
          )}

          {feedbackMsg && (
            <div className="text-[11px] font-bold text-center text-amber-300 animate-in fade-in">
              {feedbackMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { GameMode, GameScreen } from './types/game';
import {
  getCoins,
  addCoins,
  getEquippedSkin,
  recordGameResult,
  getClaimableMissionsCount,
  getHighestUnlockedLevel,
  unlockCampaignLevel,
  getCampaignLevelReward,
  getBestEndlessStreak,
  MAX_CAMPAIGN_LEVEL,
} from './utils/storage';
import { useNetworkStatus } from './utils/network';
import { sound } from './audio/soundEffects';
import { TopBar } from './components/TopBar';
import { MainMenu } from './components/MainMenu';
import { GameCanvas } from './components/GameCanvas';
import { VictoryModal } from './components/VictoryModal';
import { DefeatModal } from './components/DefeatModal';
import { RouletteModal } from './components/RouletteModal';
import { ShopModal } from './components/ShopModal';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { RewardedAdModal } from './components/RewardedAdModal';
import { InterstitialAdModal } from './components/InterstitialAdModal';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('MENU');
  const [coins, setCoins] = useState<number>(getCoins());
  const [equippedSkin, setEquippedSkinState] = useState<string>(getEquippedSkin());
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [isDailyMissionsOpen, setIsDailyMissionsOpen] = useState<boolean>(false);
  const [claimableMissionsCount, setClaimableMissionsCount] = useState<number>(() =>
    getClaimableMissionsCount()
  );

  // Progression & Game Mode states (Campaign Levels 1-20, Endless Survival, Quick Duel)
  const [gameMode, setGameMode] = useState<GameMode>('CAMPAIGN');
  const [highestUnlockedLevel, setHighestUnlockedLevel] = useState<number>(() =>
    getHighestUnlockedLevel()
  );
  const [campaignLevel, setCampaignLevel] = useState<number>(() => getHighestUnlockedLevel());
  const [bestEndlessStreak, setBestEndlessStreak] = useState<number>(() => getBestEndlessStreak());
  const [lastCoinsEarned, setLastCoinsEarned] = useState<number>(50);
  const [endlessDefeatSummary, setEndlessDefeatSummary] = useState<
    | {
        streak: number;
        bestStreak: number;
        coinsEarned: number;
      }
    | undefined
  >(undefined);

  const [headshotsInMatch, setHeadshotsInMatch] = useState<number>(0);
  const [interstitialReason, setInterstitialReason] = useState<'defeat' | 'exit'>('exit');
  const [matchKey, setMatchKey] = useState<number>(0);

  const { isOnline, simulated, toggleSimulatedOffline } = useNetworkStatus();

  // Sync coins, progression and daily missions count from storage
  const refreshCoinsAndMissions = () => {
    setCoins(getCoins());
    setClaimableMissionsCount(getClaimableMissionsCount());
    setHighestUnlockedLevel(getHighestUnlockedLevel());
    setBestEndlessStreak(getBestEndlessStreak());
  };

  useEffect(() => {
    setCoins(getCoins());
    setEquippedSkinState(getEquippedSkin());
    setClaimableMissionsCount(getClaimableMissionsCount());
    const unlocked = getHighestUnlockedLevel();
    setHighestUnlockedLevel(unlocked);
    setCampaignLevel(unlocked);
    setBestEndlessStreak(getBestEndlessStreak());
  }, []);

  useEffect(() => {
    sound.setMusicMode(screen === 'PLAYING' ? 'combat' : 'menu');
  }, [screen]);

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleStartGame = () => {
    sound.startBackgroundMusic('combat');
    setHeadshotsInMatch(0);
    setEndlessDefeatSummary(undefined);
    setMatchKey((prev) => prev + 1);
    setScreen('PLAYING');
  };

  // Called when player defeats the AI in Campaign or Quick Duel
  const handleVictory = (headshots: number) => {
    sound.stopFlechaVolando();
    sound.playVictoria();
    setHeadshotsInMatch(headshots);

    const reward = gameMode === 'CAMPAIGN' ? getCampaignLevelReward(campaignLevel) : 25;
    setLastCoinsEarned(reward);

    if (gameMode === 'CAMPAIGN') {
      const nextLevelToUnlock = Math.min(MAX_CAMPAIGN_LEVEL, campaignLevel + 1);
      const updatedHighest = unlockCampaignLevel(nextLevelToUnlock);
      setHighestUnlockedLevel(updatedHighest);
    }

    const updated = addCoins(reward);
    setCoins(updated);
    recordGameResult(true, headshots, reward);
    setClaimableMissionsCount(getClaimableMissionsCount());
    setScreen('VICTORY');
  };

  // Advance directly to the next Campaign Level from the Victory screen
  const handleNextCampaignLevel = () => {
    const nextLvl = Math.min(MAX_CAMPAIGN_LEVEL, campaignLevel + 1);
    setCampaignLevel(nextLvl);
    setHeadshotsInMatch(0);
    setMatchKey((prev) => prev + 1);
    setScreen('PLAYING');
  };

  // Called when player is defeated by AI (after declining or exhausting Second Chance / Revive)
  const handleDefeat = (endlessSummary?: { streak: number; coinsEarned: number }) => {
    sound.stopFlechaVolando();
    sound.playDerrota();
    const updatedBest = getBestEndlessStreak();
    setBestEndlessStreak(updatedBest);

    if (gameMode === 'ENDLESS' && endlessSummary) {
      setEndlessDefeatSummary({
        streak: endlessSummary.streak,
        bestStreak: updatedBest,
        coinsEarned: endlessSummary.coinsEarned,
      });
    } else {
      setEndlessDefeatSummary(undefined);
    }

    recordGameResult(false, headshotsInMatch, 0);
    setClaimableMissionsCount(getClaimableMissionsCount());
    setScreen('DEFEAT');
  };

  // Called when player abandons/exits active match
  const handleExitMatch = () => {
    sound.stopFlechaVolando();
    refreshCoinsAndMissions();
    setInterstitialReason('exit');
    setScreen('INTERSTITIAL_AD');
  };

  // Transition from defeat screen to interstitial ad
  const handleDefeatToAd = () => {
    setInterstitialReason('defeat');
    setScreen('INTERSTITIAL_AD');
  };

  // Transition from victory to rewarded ad then roulette
  const handleSpinRouletteWithAd = () => {
    setScreen('REWARDED_AD');
  };

  // Rewarded ad completed -> open roulette wheel
  const handleRewardedAdCompleted = () => {
    setScreen('ROULETTE');
  };

  // Close roulette and return to menu
  const handleCloseRoulette = () => {
    refreshCoinsAndMissions();
    setScreen('MENU');
  };

  // Close interstitial ad and return to menu
  const handleCloseInterstitialAd = () => {
    refreshCoinsAndMissions();
    setScreen('MENU');
  };

  return (
    <div className="relative h-screen h-[100dvh] w-full overflow-hidden bg-slate-950 flex flex-col items-center justify-center p-0 sm:p-3 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background visual atmosphere */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-700 via-slate-900 to-black" />

      {/* Vertical Mobile Frame Container (Bowmasters Mobile Vertical Experience) */}
      <main className="relative w-full max-w-[440px] h-full sm:h-[min(860px,96dvh)] bg-slate-900 sm:rounded-[32px] sm:border-4 sm:border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col justify-between overflow-hidden">
        {/* Top bar with audio, online indicator, daily missions, coins & shop shortcut */}
        <TopBar
          coins={coins}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isOnline={isOnline}
          simulatedOffline={simulated}
          onToggleSimulatedOffline={toggleSimulatedOffline}
          onOpenShop={() => setIsShopOpen(true)}
          onOpenDailyMissions={() => setIsDailyMissionsOpen(true)}
          claimableMissionsCount={claimableMissionsCount}
        />

        {/* Dynamic Screen View */}
        <div className="relative flex-1 w-full min-h-0 overflow-hidden flex flex-col justify-between">
          {screen === 'MENU' && (
            <MainMenu
              equippedSkin={equippedSkin}
              coins={coins}
              selectedMode={gameMode}
              onSelectMode={setGameMode}
              selectedLevel={campaignLevel}
              highestUnlockedLevel={highestUnlockedLevel}
              onSelectLevel={setCampaignLevel}
              bestEndlessStreak={bestEndlessStreak}
              onStartGame={handleStartGame}
              onOpenShop={() => setIsShopOpen(true)}
              onOpenDailyMissions={() => setIsDailyMissionsOpen(true)}
            />
          )}

          {screen === 'PLAYING' && (
            <GameCanvas
              key={matchKey}
              playerSkin={equippedSkin}
              gameMode={gameMode}
              campaignLevel={campaignLevel}
              onVictory={handleVictory}
              onDefeat={handleDefeat}
              onExitMatch={handleExitMatch}
              onCoinsChanged={(updatedCoins) => setCoins(updatedCoins)}
            />
          )}

          {/* Victory Modal */}
          {screen === 'VICTORY' && (
            <VictoryModal
              gameMode={gameMode}
              campaignLevel={campaignLevel}
              coinsEarned={lastCoinsEarned}
              headshots={headshotsInMatch}
              onNextCampaignLevel={handleNextCampaignLevel}
              onSpinRouletteWithAd={handleSpinRouletteWithAd}
              onGoToMenu={() => {
                refreshCoinsAndMissions();
                setScreen('MENU');
              }}
              onPlayAgain={handleStartGame}
              onOpenDailyMissions={() => setIsDailyMissionsOpen(true)}
            />
          )}

          {/* Defeat Modal */}
          {screen === 'DEFEAT' && (
            <DefeatModal
              gameMode={gameMode}
              campaignLevel={campaignLevel}
              endlessStreak={endlessDefeatSummary?.streak ?? 0}
              bestEndlessStreak={endlessDefeatSummary?.bestStreak ?? bestEndlessStreak}
              endlessCoinsEarned={endlessDefeatSummary?.coinsEarned ?? 0}
              onContinueToAd={handleDefeatToAd}
            />
          )}

          {/* Rewarded Ad Simulator Modal before Roulette */}
          {screen === 'REWARDED_AD' && (
            <RewardedAdModal onAdCompleted={handleRewardedAdCompleted} />
          )}

          {/* Reward Roulette Modal */}
          {screen === 'ROULETTE' && (
            <RouletteModal
              baseCoinsWon={lastCoinsEarned}
              onClose={handleCloseRoulette}
              onSkinUnlocked={() => {
                refreshCoinsAndMissions();
                setEquippedSkinState(getEquippedSkin());
              }}
            />
          )}

          {/* Interstitial Ad Modal (5s timer + 'X' close button) */}
          {screen === 'INTERSTITIAL_AD' && (
            <InterstitialAdModal
              reason={interstitialReason}
              onClose={handleCloseInterstitialAd}
            />
          )}

          {/* Skins Shop Modal */}
          {isShopOpen && (
            <ShopModal
              onClose={() => {
                setIsShopOpen(false);
                refreshCoinsAndMissions();
              }}
              onSkinChanged={(newSkin) => {
                setEquippedSkinState(newSkin);
                refreshCoinsAndMissions();
              }}
            />
          )}

          {/* Daily Missions Modal */}
          {isDailyMissionsOpen && (
            <DailyMissionsModal
              onClose={() => {
                setIsDailyMissionsOpen(false);
                refreshCoinsAndMissions();
              }}
              onCoinsChanged={(newCoins) => {
                setCoins(newCoins);
                setClaimableMissionsCount(getClaimableMissionsCount());
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

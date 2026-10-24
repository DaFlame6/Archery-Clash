import { LEGEND_SKIN_IDS, SKINS_DATABASE, getSkinById } from './skins';
import { Skin, DailyMission, DailyMissionsState, DailyMissionMetric } from '../types/game';

const COINS_KEY = 'archery_clash_coins';
const SKINS_KEY = 'archery_clash_skins';
const EQUIPPED_KEY = 'archery_clash_equipped_skin';
const STATS_KEY = 'archery_clash_stats';
const DAILY_MISSIONS_KEY = 'archery_clash_daily_missions';

const DEFAULT_INITIAL_SKIN = 'com_01';

// Legacy ID migration map
const LEGACY_ID_MAP: Record<string, string> = {
  recluta_milicia: 'com_01',
  rastreador_pradera: 'com_02',
  vigia_pantano: 'com_03',
  escolta_caravana: 'com_04',
  guardabosques_novato: 'com_05',
  tirador_chatarra: 'com_06',
  marinero_arponero: 'com_07',
  cazador_ciervos: 'com_08',
  forajido_robledal: 'rar_01',
  tiradora_arena: 'rar_02',
  mercenario_acero: 'rar_03',
  agente_tactico_urbano: 'rar_04',
  infiltrado_sombras: 'rar_05',
  arquera_taiga: 'rar_06',
  explorador_mohicano: 'rar_07',
  tirador_steampunk: 'rar_08',
  justiciero_nocturno: 'epi_01',
  ronin_viento: 'epi_02',
  vanguardia_silvana: 'epi_03',
  guerrera_valquiria: 'epi_04',
  cazador_primitivo: 'epi_05',
  centurion_legion: 'epi_06',
  francotirador_cibernetico: 'epi_07',
  caballero_orden_solar: 'epi_08',
  arquero_averno: 'ley_01',
  monarca_abismo_glacial: 'ley_02',
  avatar_fenix: 'ley_03',
  espectro_cripta: 'ley_04',
  cazador_vacio_cosmico: 'ley_05',
  titan_mecanico_primordial: 'ley_06',
  angel_juicio: 'ley_07',
  cronotirador_multiverso: 'ley_08',
  archer: 'com_01',
  robot: 'epi_07',
};

function normalizeSkinId(id: string): string {
  if (SKINS_DATABASE.some((s) => s.id === id)) return id;
  if (LEGACY_ID_MAP[id]) return LEGACY_ID_MAP[id];
  return DEFAULT_INITIAL_SKIN;
}

export interface GameStats {
  gamesPlayed: number;
  victories: number;
  defeats: number;
  headshots: number;
  totalCoinsEarned: number;
}

export function getCoins(): number {
  let val = localStorage.getItem(COINS_KEY);
  if (!val) {
    const oldVal = localStorage.getItem('bowmaster_coins');
    if (oldVal) {
      val = oldVal;
      localStorage.setItem(COINS_KEY, oldVal);
    }
  }
  if (!val) {
    localStorage.setItem(COINS_KEY, '100');
    return 100;
  }
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 100 : parsed;
}

export function addCoins(amount: number): number {
  const current = getCoins();
  const next = Math.max(0, current + amount);
  localStorage.setItem(COINS_KEY, String(next));
  return next;
}

export function spendCoins(amount: number): boolean {
  const current = getCoins();
  if (current >= amount) {
    localStorage.setItem(COINS_KEY, String(current - amount));
    return true;
  }
  return false;
}

export function getUnlockedSkins(): string[] {
  const val = localStorage.getItem(SKINS_KEY);
  if (!val) {
    const initial: string[] = [DEFAULT_INITIAL_SKIN];
    localStorage.setItem(SKINS_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const normalized = Array.from(new Set(parsed.map((item: string) => normalizeSkinId(item))));
      if (!normalized.includes(DEFAULT_INITIAL_SKIN)) {
        normalized.unshift(DEFAULT_INITIAL_SKIN);
      }
      localStorage.setItem(SKINS_KEY, JSON.stringify(normalized));
      return normalized;
    }
    return [DEFAULT_INITIAL_SKIN];
  } catch {
    return [DEFAULT_INITIAL_SKIN];
  }
}

export function unlockSkin(skinId: string): boolean {
  const unlocked = getUnlockedSkins();
  const normalized = normalizeSkinId(skinId);
  if (!unlocked.includes(normalized)) {
    unlocked.push(normalized);
    localStorage.setItem(SKINS_KEY, JSON.stringify(unlocked));
    return true;
  }
  return false;
}

export function unlockRandomLegendSkin(): { skin: Skin; isNew: boolean } | null {
  const unlocked = getUnlockedSkins();
  const lockedLegends = LEGEND_SKIN_IDS.filter((id) => !unlocked.includes(id));

  if (lockedLegends.length > 0) {
    const chosenId = lockedLegends[Math.floor(Math.random() * lockedLegends.length)];
    unlockSkin(chosenId);
    return { skin: getSkinById(chosenId), isNew: true };
  } else {
    const randomLegend = getSkinById(LEGEND_SKIN_IDS[Math.floor(Math.random() * LEGEND_SKIN_IDS.length)]);
    return { skin: randomLegend, isNew: false };
  }
}

export function getEquippedSkin(): string {
  const val = localStorage.getItem(EQUIPPED_KEY);
  if (val) {
    const normalized = normalizeSkinId(val);
    if (SKINS_DATABASE.some((s) => s.id === normalized)) {
      return normalized;
    }
  }
  return DEFAULT_INITIAL_SKIN;
}

export function setEquippedSkin(skinId: string) {
  localStorage.setItem(EQUIPPED_KEY, normalizeSkinId(skinId));
}

export function getStats(): GameStats {
  const defaultStats: GameStats = {
    gamesPlayed: 0,
    victories: 0,
    defeats: 0,
    headshots: 0,
    totalCoinsEarned: 0,
  };
  const val = localStorage.getItem(STATS_KEY);
  if (!val) return defaultStats;
  try {
    return { ...defaultStats, ...JSON.parse(val) };
  } catch {
    return defaultStats;
  }
}

export function recordGameResult(victory: boolean, headshotsInGame: number, coinsEarned: number) {
  const stats = getStats();
  stats.gamesPlayed += 1;
  if (victory) {
    stats.victories += 1;
  } else {
    stats.defeats += 1;
  }
  stats.headshots += headshotsInGame;
  stats.totalCoinsEarned += coinsEarned;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));

  // Update Daily Missions for matches played and victories
  incrementMissionProgress('matches', 1);
  if (victory) {
    incrementMissionProgress('wins', 1);
  }
}

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createFreshDailyMissions(dateKey: string): DailyMissionsState {
  const defaultMissions: DailyMission[] = [
    {
      id: 'daily_win_3',
      title: 'Ganar 3 partidas',
      description: 'Derrota a 3 rivales de la IA en duelos balísticos.',
      icon: '🏆',
      metric: 'wins',
      target: 3,
      progress: 0,
      rewardCoins: 75,
      claimed: false,
    },
    {
      id: 'daily_headshots_5',
      title: 'Lograr 5 Headshots',
      description: 'Acierta 5 tiros letales a la cabeza (-50 HP).',
      icon: '🎯',
      metric: 'headshots',
      target: 5,
      progress: 0,
      rewardCoins: 100,
      claimed: false,
    },
    {
      id: 'daily_bodyshots_6',
      title: 'Impactar 6 tiros al cuerpo',
      description: 'Conecta 6 disparos certeros en el torso enemigo (-25 HP).',
      icon: '🏹',
      metric: 'bodyshots',
      target: 6,
      progress: 0,
      rewardCoins: 60,
      claimed: false,
    },
    {
      id: 'daily_matches_3',
      title: 'Completar 3 duelos',
      description: 'Participa y termina 3 partidas en cualquier escenario.',
      icon: '⚔️',
      metric: 'matches',
      target: 3,
      progress: 0,
      rewardCoins: 50,
      claimed: false,
    },
  ];

  return {
    dateKey,
    missions: defaultMissions,
    bonusChestClaimed: false,
    bonusChestReward: 150,
  };
}

export function getDailyMissions(): DailyMissionsState {
  const todayKey = getTodayDateKey();
  const raw = localStorage.getItem(DAILY_MISSIONS_KEY);

  if (!raw) {
    const fresh = createFreshDailyMissions(todayKey);
    localStorage.setItem(DAILY_MISSIONS_KEY, JSON.stringify(fresh));
    return fresh;
  }

  try {
    const parsed: DailyMissionsState = JSON.parse(raw);
    if (!parsed || parsed.dateKey !== todayKey || !Array.isArray(parsed.missions)) {
      const fresh = createFreshDailyMissions(todayKey);
      localStorage.setItem(DAILY_MISSIONS_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return parsed;
  } catch {
    const fresh = createFreshDailyMissions(todayKey);
    localStorage.setItem(DAILY_MISSIONS_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

export function incrementMissionProgress(metric: DailyMissionMetric, amount = 1): DailyMissionsState {
  const state = getDailyMissions();
  let updated = false;

  state.missions = state.missions.map((m) => {
    if (m.metric === metric && m.progress < m.target) {
      updated = true;
      return {
        ...m,
        progress: Math.min(m.target, m.progress + amount),
      };
    }
    return m;
  });

  if (updated) {
    localStorage.setItem(DAILY_MISSIONS_KEY, JSON.stringify(state));
  }
  return state;
}

export function claimDailyMissionReward(missionId: string): {
  success: boolean;
  rewardCoins: number;
  newBalance: number;
  state: DailyMissionsState;
} {
  const state = getDailyMissions();
  const mission = state.missions.find((m) => m.id === missionId);

  if (!mission || mission.claimed || mission.progress < mission.target) {
    return {
      success: false,
      rewardCoins: 0,
      newBalance: getCoins(),
      state,
    };
  }

  mission.claimed = true;
  localStorage.setItem(DAILY_MISSIONS_KEY, JSON.stringify(state));

  const newBalance = addCoins(mission.rewardCoins);
  const stats = getStats();
  stats.totalCoinsEarned += mission.rewardCoins;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));

  return {
    success: true,
    rewardCoins: mission.rewardCoins,
    newBalance,
    state,
  };
}

export function claimDailyBonusChest(): {
  success: boolean;
  rewardCoins: number;
  newBalance: number;
  state: DailyMissionsState;
} {
  const state = getDailyMissions();
  const allCompleted = state.missions.every((m) => m.progress >= m.target);

  if (!allCompleted || state.bonusChestClaimed) {
    return {
      success: false,
      rewardCoins: 0,
      newBalance: getCoins(),
      state,
    };
  }

  state.bonusChestClaimed = true;
  localStorage.setItem(DAILY_MISSIONS_KEY, JSON.stringify(state));

  const newBalance = addCoins(state.bonusChestReward);
  const stats = getStats();
  stats.totalCoinsEarned += state.bonusChestReward;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));

  return {
    success: true,
    rewardCoins: state.bonusChestReward,
    newBalance,
    state,
  };
}

export function getClaimableMissionsCount(): number {
  const state = getDailyMissions();
  const missionClaims = state.missions.filter((m) => m.progress >= m.target && !m.claimed).length;
  const allCompleted = state.missions.every((m) => m.progress >= m.target);
  const chestClaim = allCompleted && !state.bonusChestClaimed ? 1 : 0;
  return missionClaims + chestClaim;
}

// ============================================================================
// CAMPAIGN (LEVELS 1 TO 20) & ENDLESS SURVIVAL STORAGE
// ============================================================================
const CAMPAIGN_LEVEL_KEY = 'archery_level';
const CAMPAIGN_HIGHEST_LEVEL_KEY = 'archery_current_level';
const LEGACY_CAMPAIGN_KEY = 'archery_clash_campaign_highest_level';
const ENDLESS_BEST_STREAK_KEY = 'archery_clash_endless_best_streak';
export const MAX_CAMPAIGN_LEVEL = 20;

export function getHighestUnlockedLevel(): number {
  let raw =
    localStorage.getItem(CAMPAIGN_LEVEL_KEY) ||
    localStorage.getItem(CAMPAIGN_HIGHEST_LEVEL_KEY) ||
    localStorage.getItem(LEGACY_CAMPAIGN_KEY);

  if (!raw) {
    localStorage.setItem(CAMPAIGN_LEVEL_KEY, '1');
    localStorage.setItem(CAMPAIGN_HIGHEST_LEVEL_KEY, '1');
    return 1;
  }
  const parsed = parseInt(raw, 10);
  const valid = isNaN(parsed) || parsed < 1 ? 1 : Math.min(MAX_CAMPAIGN_LEVEL, parsed);
  localStorage.setItem(CAMPAIGN_LEVEL_KEY, String(valid));
  localStorage.setItem(CAMPAIGN_HIGHEST_LEVEL_KEY, String(valid));
  return valid;
}

export function unlockCampaignLevel(level: number): number {
  const currentHighest = getHighestUnlockedLevel();
  const clamped = Math.max(1, Math.min(MAX_CAMPAIGN_LEVEL, level));
  if (clamped > currentHighest) {
    localStorage.setItem(CAMPAIGN_LEVEL_KEY, String(clamped));
    localStorage.setItem(CAMPAIGN_HIGHEST_LEVEL_KEY, String(clamped));
    return clamped;
  }
  return currentHighest;
}

// Campaign level victory awards +50 coins
export function getCampaignLevelReward(_level?: number): number {
  return 50;
}

export function getBestEndlessStreak(): number {
  const raw = localStorage.getItem(ENDLESS_BEST_STREAK_KEY);
  if (!raw) return 0;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

export function updateBestEndlessStreak(streak: number): { best: number; isNewRecord: boolean } {
  const currentBest = getBestEndlessStreak();
  if (streak > currentBest) {
    localStorage.setItem(ENDLESS_BEST_STREAK_KEY, String(streak));
    return { best: streak, isNewRecord: true };
  }
  return { best: currentBest, isNewRecord: false };
}



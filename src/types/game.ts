export type SkinRarity = 'Común' | 'Raro' | 'Épico' | 'Leyenda';

export type ArrowType =
  | 'wood_standard'
  | 'moss_arrow'
  | 'scrap_bolt'
  | 'harpoon'
  | 'leaf_trail'
  | 'tactical_carbon'
  | 'iron_tip'
  | 'laser_red'
  | 'shadow_trail'
  | 'frost_light'
  | 'feather_arrow'
  | 'spark_arrow'
  | 'emp_shock'
  | 'wind_slice'
  | 'crystal_light'
  | 'golden_feather'
  | 'bone_spear'
  | 'fire_arrow'
  | 'plasma_bolt'
  | 'solar_flare'
  | 'inferno_beam'
  | 'absolute_zero'
  | 'phoenix_burst'
  | 'soul_drain'
  | 'void_laser'
  | 'kinetic_core'
  | 'divine_ray'
  | 'temporal_warp';

export interface SkinVisual {
  primaryColor: string;
  secondaryColor: string;
  bowColor: string;
  arrowType: ArrowType;
}

export interface Skin {
  id: string;
  name: string;
  rarity: SkinRarity;
  price: number;
  weapon: string;
  description: string;
  visual: SkinVisual;
}

export type GameScreen =
  | 'MENU'
  | 'PLAYING'
  | 'VICTORY'
  | 'DEFEAT'
  | 'ROULETTE'
  | 'SHOP'
  | 'INTERSTITIAL_AD'
  | 'REWARDED_AD';

export type Turn = 'PLAYER' | 'ENEMY' | 'ANIMATING';

export interface DamagePopup {
  id: string;
  x: number;
  y: number;
  damage: number;
  isHeadshot: boolean;
  createdAt: number;
  opacity: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'spark' | 'smoke' | 'star' | 'flame' | 'frost' | 'rune' | 'ring';
  rotation?: number;
  spin?: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  arrowType: ArrowType;
  angle: number;
  active: boolean;
  shooter: 'player' | 'enemy';
  primaryColor: string;
  secondaryColor: string;
  bowColor: string;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

export interface CharacterState {
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  skinId: string;
  isHit: boolean;
  hitTime: number;
  hitType: 'head' | 'body' | null;
  armAngle: number;
}

export type RoulettePrizeType = 'x2' | 'x5' | 'x10' | 'legend_skin';

export interface RoulettePrize {
  type: RoulettePrizeType;
  label: string;
  multiplier?: number;
  probability: number;
  color: string;
  description: string;
  icon: string;
}

export type DailyMissionMetric = 'wins' | 'headshots' | 'matches' | 'bodyshots';

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  icon: string;
  metric: DailyMissionMetric;
  target: number;
  progress: number;
  rewardCoins: number;
  claimed: boolean;
}

export interface DailyMissionsState {
  dateKey: string; // YYYY-MM-DD
  missions: DailyMission[];
  bonusChestClaimed: boolean;
  bonusChestReward: number;
}

export type GameMode = 'CAMPAIGN' | 'ENDLESS' | 'QUICK_DUEL';

export type ArcherElevationZone = 'HIGH_PEAK' | 'MID_SLOPE' | 'DEEP_VALLEY';

export interface TerrainHill {
  centerX: number;
  width: number;
  peakY: number;
}

export interface StuckArrow {
  x: number;
  y: number;
  angle: number;
  color: string;
}



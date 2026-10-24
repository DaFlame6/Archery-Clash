import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Projectile,
  Particle,
  DamagePopup,
  CharacterState,
  GameMode,
  TerrainHill,
  StuckArrow,
  ArcherElevationZone,
} from '../types/game';
import {
  getSkinById,
  SKINS_DATABASE,
  getSkinIcon,
  getSkinHatStyle,
  getArrowTypeMeta,
} from '../utils/skins';
import { sound } from '../audio/soundEffects';
import {
  incrementMissionProgress,
  getCoins,
  spendCoins,
  addCoins,
  getBestEndlessStreak,
  updateBestEndlessStreak,
} from '../utils/storage';
import { useNetworkStatus } from '../utils/network';
import { CombatLog, CombatLogEntry } from './CombatLog';

interface GameCanvasProps {
  playerSkin: string;
  gameMode: GameMode;
  campaignLevel: number;
  onVictory: (headshots: number) => void;
  onDefeat: (endlessSummary?: { streak: number; coinsEarned: number }) => void;
  onExitMatch: () => void;
  onCoinsChanged?: (newCoins: number) => void;
}

type MapId = 'mystic_forest' | 'rocky_canyon' | 'snowy_ruins';

interface MapConfig {
  id: MapId;
  name: string;
  icon: string;
  dustColor: string;
  dustSecondary: string;
}

const MAPS: MapConfig[] = [
  {
    id: 'mystic_forest',
    name: 'Bosque Místico',
    icon: '🌲',
    dustColor: '#10b981',
    dustSecondary: '#064e3b',
  },
  {
    id: 'rocky_canyon',
    name: 'Cañón Rocoso',
    icon: '🏜️',
    dustColor: '#d97706',
    dustSecondary: '#9a3412',
  },
  {
    id: 'snowy_ruins',
    name: 'Ruinas en la Nieve',
    icon: '❄️',
    dustColor: '#f1f5f9',
    dustSecondary: '#94a3b8',
  },
];

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  angle: number;
  spin: number;
  color: string;
}

interface GeneratedTerrainData {
  playerX: number;
  playerGroundY: number;
  playerZone: ArcherElevationZone;
  enemyX: number;
  enemyGroundY: number;
  enemyZone: ArcherElevationZone;
  centralHills: TerrainHill[];
  heights: number[]; // Precomputed ground Y for each x in 0..WORLD_WIDTH
  maxCentralPeakY: number; // Highest obstacle (smallest Y) between archers
}

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 600;
const GRAVITY = 420; // px/s^2
const WIND_ACCEL_FACTOR = 36; // px/s^2 per m/s of wind
const FIXED_DT = 1 / 60;
const REVIVE_COST_COINS = 200;

function pickRandomZone(): { zone: ArcherElevationZone; groundY: number; label: string } {
  const r = Math.random();
  if (r < 0.34) {
    // High hilltop peak
    return {
      zone: 'HIGH_PEAK',
      groundY: Math.round(295 + Math.random() * 50), // y = 295..345
      label: 'Cima Alta',
    };
  }
  if (r < 0.68) {
    // Mid mountain slope
    return {
      zone: 'MID_SLOPE',
      groundY: Math.round(375 + Math.random() * 50), // y = 375..425
      label: 'Ladera Media',
    };
  }
  // Deep valley / hollow
  return {
    zone: 'DEEP_VALLEY',
    groundY: Math.round(455 + Math.random() * 50), // y = 455..505
    label: 'Hondonada',
  };
}

// Procedural Terrain & Central Obstacle Hills Generator
function generateProceduralTerrain(
  gameMode: GameMode,
  campaignLevel: number,
  endlessWave: number
): GeneratedTerrainData {
  const difficultyFactor =
    gameMode === 'CAMPAIGN'
      ? (campaignLevel - 1) / 19 // 0.0 (Lv 1) -> 1.0 (Lv 20)
      : gameMode === 'ENDLESS'
      ? Math.min(1, endlessWave / 12)
      : 0.35;

  // Distance between player and AI scales with level/wave
  const playerX = Math.round(165 + (1 - difficultyFactor) * 55 + (Math.random() - 0.5) * 30); // ~160..235
  const enemyX = Math.round(1240 + difficultyFactor * 195 + (Math.random() - 0.5) * 30); // ~1225..1450

  const pPick = pickRandomZone();
  const ePick = pickRandomZone();
  const playerGroundY = pPick.groundY;
  const enemyGroundY = ePick.groundY;

  // Number of intermediate hills (1 or 2 central hills acting as physical obstacles)
  const numHills =
    gameMode === 'CAMPAIGN' && campaignLevel <= 3
      ? 1
      : Math.random() < 0.45 + difficultyFactor * 0.45
      ? 2
      : 1;

  const span = enemyX - playerX;
  const avgShooterY = (playerGroundY + enemyGroundY) * 0.5;
  // Obstacle height scales with difficulty so player must use high parabolic arcs
  const minObstacleProminence = 65 + difficultyFactor * 75; // how high the hill rises above the valley/shooters
  const centralHills: TerrainHill[] = [];

  if (numHills === 1) {
    const centerX = Math.round(playerX + span * (0.44 + Math.random() * 0.12));
    const width = Math.round(145 + Math.random() * 55);
    const rawPeakY = Math.min(playerGroundY, enemyGroundY) - (30 + difficultyFactor * 65 + Math.random() * 35);
    const peakY = Math.round(Math.max(215, Math.min(390, rawPeakY)));
    centralHills.push({ centerX, width, peakY });
  } else {
    const c1 = Math.round(playerX + span * (0.33 + (Math.random() - 0.5) * 0.06));
    const c2 = Math.round(playerX + span * (0.67 + (Math.random() - 0.5) * 0.06));
    const w1 = Math.round(115 + Math.random() * 40);
    const w2 = Math.round(115 + Math.random() * 40);
    const p1 = Math.round(
      Math.max(220, Math.min(400, avgShooterY - minObstacleProminence + (Math.random() - 0.5) * 40))
    );
    const p2 = Math.round(
      Math.max(220, Math.min(400, avgShooterY - minObstacleProminence + (Math.random() - 0.5) * 40))
    );
    centralHills.push({ centerX: c1, width: w1, peakY: p1 });
    centralHills.push({ centerX: c2, width: w2, peakY: p2 });
  }

  // Build continuous heightmap across x = 0..WORLD_WIDTH
  const heights: number[] = new Array(WORLD_WIDTH + 1);
  const valleyFloorY = 525;

  for (let x = 0; x <= WORLD_WIDTH; x++) {
    // Base interpolation between left and right ends with a deep central valley
    let baseY = valleyFloorY;

    // Left archer hill / plateau influence around playerX
    const distP = Math.abs(x - playerX);
    const plateauRadius = 38;
    const slopeRadius = 155;
    let pInfluence = 0;
    if (x <= playerX) {
      // Smoothly extend left border near playerGroundY
      const edgeT = Math.min(1, distP / 180);
      pInfluence = 1 - edgeT * 0.18;
    } else if (distP <= plateauRadius) {
      pInfluence = 1;
    } else if (distP < plateauRadius + slopeRadius) {
      const t = (distP - plateauRadius) / slopeRadius;
      pInfluence = 0.5 * (1 + Math.cos(Math.PI * t));
    }

    // Right archer hill / plateau influence around enemyX
    const distE = Math.abs(x - enemyX);
    let eInfluence = 0;
    if (x >= enemyX) {
      const edgeT = Math.min(1, distE / 180);
      eInfluence = 1 - edgeT * 0.18;
    } else if (distE <= plateauRadius) {
      eInfluence = 1;
    } else if (distE < plateauRadius + slopeRadius) {
      const t = (distE - plateauRadius) / slopeRadius;
      eInfluence = 0.5 * (1 + Math.cos(Math.PI * t));
    }

    const pY = valleyFloorY - (valleyFloorY - playerGroundY) * pInfluence;
    const eY = valleyFloorY - (valleyFloorY - enemyGroundY) * eInfluence;
    baseY = Math.min(pY, eY);

    // Apply 1 or 2 intermediate obstacle hills
    for (const hill of centralHills) {
      const dH = Math.abs(x - hill.centerX);
      if (dH < hill.width) {
        const t = dH / hill.width;
        const bell = 0.5 * (1 + Math.cos(Math.PI * t));
        const hillY = valleyFloorY - (valleyFloorY - hill.peakY) * bell;
        baseY = Math.min(baseY, hillY);
      }
    }

    // Flat standing pad right under player and enemy so boots rest cleanly
    if (Math.abs(x - playerX) <= 28) {
      baseY = playerGroundY;
    } else if (Math.abs(x - enemyX) <= 28) {
      baseY = enemyGroundY;
    }

    heights[x] = Math.round(Math.max(190, Math.min(560, baseY)));
  }

  let maxCentralPeakY = 600;
  for (const h of centralHills) {
    if (h.peakY < maxCentralPeakY) maxCentralPeakY = h.peakY;
  }

  return {
    playerX,
    playerGroundY,
    playerZone: pPick.zone,
    enemyX,
    enemyGroundY,
    enemyZone: ePick.zone,
    centralHills,
    heights,
    maxCentralPeakY,
  };
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  playerSkin,
  gameMode,
  campaignLevel,
  onVictory,
  onDefeat,
  onExitMatch,
  onCoinsChanged,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isOnline } = useNetworkStatus();

  // Pick one of the 3 maps at random when match starts
  const [currentMap, setCurrentMap] = useState<MapConfig>(() => {
    return MAPS[Math.floor(Math.random() * MAPS.length)];
  });

  // Endless mode state
  const [endlessStreak, setEndlessStreak] = useState<number>(0);
  const endlessStreakRef = useRef<number>(0);
  const [bestEndlessStreak, setBestEndlessStreak] = useState<number>(() => getBestEndlessStreak());
  const [endlessCoinsEarned, setEndlessCoinsEarned] = useState<number>(0);
  const endlessCoinsRef = useRef<number>(0);

  // Generate initial procedural terrain with intermediate hills and random archer elevations
  const [terrain, setTerrain] = useState<GeneratedTerrainData>(() =>
    generateProceduralTerrain(gameMode, campaignLevel, 0)
  );
  const terrainRef = useRef<GeneratedTerrainData>(terrain);

  // Helper to roll wind scaled by Campaign Level / Endless Wave
  const rollScaledWind = useCallback(
    (waveOrLevel: number) => {
      const maxWind =
        gameMode === 'CAMPAIGN'
          ? 1.2 + ((campaignLevel - 1) / 19) * 2.6 // ±1.2 m/s at Lv1 up to ±3.8 m/s at Lv20
          : gameMode === 'ENDLESS'
          ? Math.min(3.8, 1.8 + waveOrLevel * 0.2)
          : 3.0;
      return Number(((Math.random() * 2 - 1) * maxWind).toFixed(1));
    },
    [campaignLevel, gameMode]
  );

  const [wind, setWind] = useState<number>(() => rollScaledWind(0));
  const windRef = useRef<number>(wind);
  useEffect(() => {
    windRef.current = wind;
    sound.setAmbientWindIntensity(wind);
  }, [wind]);

  // CombatLog entries state (each auto-fades after 3 seconds)
  const [combatLogs, setCombatLogs] = useState<CombatLogEntry[]>([]);

  const pushCombatLog = useCallback((text: string, type: CombatLogEntry['type'] = 'info') => {
    const now = Date.now();
    setCombatLogs((prev) => [
      ...prev.filter((item) => now - item.createdAt < 3000),
      {
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        text,
        type,
        createdAt: now,
      },
    ]);
  }, []);

  // Second Chance / Revive System States (allowed once per duel/round)
  const [showReviveModal, setShowReviveModal] = useState<boolean>(false);
  const [reviveTimeLeft, setReviveTimeLeft] = useState<number>(5);
  const [isWatchingReviveAd, setIsWatchingReviveAd] = useState<boolean>(false);
  const [reviveAdTimeLeft, setReviveAdTimeLeft] = useState<number>(3);
  const [hasUsedRevive, setHasUsedRevive] = useState<boolean>(false);
  const hasUsedReviveRef = useRef<boolean>(false);
  const [currentCoins, setCurrentCoins] = useState<number>(() => getCoins());
  const reviveShieldUntilRef = useRef<number>(0);

  // 10-second turn timer for player
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(10);

  // Dragging state for aiming
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [aimAngle, setAimAngle] = useState<number>(48);
  const [aimPower, setAimPower] = useState<number>(78);
  const [currentTurn, setCurrentTurn] = useState<'player' | 'enemy' | 'animating'>('player');
  const [roundBanner, setRoundBanner] = useState<string>(
    '¡Tu Turno! Supera las colinas centrales con tu parábola'
  );
  const shakeIntensityRef = useRef<number>(0);

  // Player & Enemy positions derived from procedural terrain (target.y = groundY at feet)
  const playerPos = useRef({
    x: terrain.playerX,
    y: terrain.playerGroundY,
  });
  const enemyPos = useRef({
    x: terrain.enemyX,
    y: terrain.enemyGroundY,
  });

  // Dynamic Camera Pan / Follow state
  const cameraRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
  }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  const impactCameraFocusRef = useRef<{
    active: boolean;
    x: number;
    y: number;
    until: number;
  }>({
    active: false,
    x: 0,
    y: 0,
    until: 0,
  });

  const activeCameraTurnRef = useRef<'player' | 'enemy'>('player');

  // Health states
  const [playerHealth, setPlayerHealth] = useState<number>(100);
  const playerHealthRef = useRef<number>(100);
  const [enemyHp, setEnemyHp] = useState<number>(100);
  const enemyHpRef = useRef<number>(100);
  const [playerBarHitFlash, setPlayerBarHitFlash] = useState<boolean>(false);
  const [enemyBarHitFlash, setEnemyBarHitFlash] = useState<boolean>(false);
  const [isAiDrawing, setIsAiDrawing] = useState<boolean>(false);

  // Pick a random rival skin
  const pickRandomRivalSkin = useCallback(() => {
    const candidates = SKINS_DATABASE.filter((s) => s.rarity !== 'Común');
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    return chosen ? chosen.id : 'epi_06';
  }, []);

  const [rivalSkinId, setRivalSkinId] = useState<string>(() => pickRandomRivalSkin());

  const playerState = useRef<CharacterState>({
    hp: 100,
    maxHp: 100,
    x: terrain.playerX,
    y: terrain.playerGroundY,
    skinId: playerSkin,
    isHit: false,
    hitTime: 0,
    hitType: null,
    armAngle: 48,
  });

  const enemyState = useRef<CharacterState>({
    hp: 100,
    maxHp: 100,
    x: terrain.enemyX,
    y: terrain.enemyGroundY,
    skinId: rivalSkinId,
    isHit: false,
    hitTime: 0,
    hitType: null,
    armAngle: 132,
  });

  const headshotsScored = useRef<number>(0);
  const matchEndedRef = useRef<boolean>(false);

  // Active projectile, stuck arrows on hills, particles, ambient particles and popups
  const activeProjectile = useRef<Projectile | null>(null);
  const stuckArrows = useRef<StuckArrow[]>([]);
  const particles = useRef<Particle[]>([]);
  const ambientParticles = useRef<AmbientParticle[]>([]);
  const popups = useRef<DamagePopup[]>([]);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // Humanized AI memory for progressive calibration, human error and adjustments
  const aiMemory = useRef<{
    shotsFired: number;
    lastShotHit: boolean;
    lastErrorSign: number;
    lastImpactX: number | null;
    lastDeltaX: number | null; // (impactX - player.x)
    hitCentralHillLastTurn: boolean;
    aimingForHeadThisTurn: boolean;
  }>({
    shotsFired: 0,
    lastShotHit: false,
    lastErrorSign: 1,
    lastImpactX: null,
    lastDeltaX: null,
    hitCentralHillLastTurn: false,
    aimingForHeadThisTurn: false,
  });

  // Initial combat log entry on match start
  useEffect(() => {
    const dy = terrainRef.current.playerGroundY - terrainRef.current.enemyGroundY;
    const elevText =
      Math.abs(dy) < 18
        ? 'Altura similar'
        : dy > 0
        ? `Rival en terreno elevado (+${Math.abs(dy)}m)`
        : `Ventaja de altura (+${Math.abs(dy)}m)`;
    pushCombatLog(
      `${currentMap.name} · ${terrainRef.current.centralHills.length} colina(s) · ${elevText}`,
      'info'
    );
  }, [currentMap.name, pushCombatLog]);

  useEffect(() => {
    playerState.current.skinId = playerSkin;
  }, [playerSkin]);

  // Stop flying arrow whoosh on unmount
  useEffect(() => {
    return () => {
      sound.stopFlechaVolando();
    };
  }, []);

  // Initialize ambient particles across the 1600px wide world
  useEffect(() => {
    const list: AmbientParticle[] = [];
    const count = currentMap.id === 'snowy_ruins' ? 70 : 50;
    for (let i = 0; i < count; i++) {
      let color = '#ffffff';
      if (currentMap.id === 'mystic_forest') {
        color = i % 2 === 0 ? '#6ee7b7' : '#c084fc';
      } else if (currentMap.id === 'rocky_canyon') {
        color = i % 2 === 0 ? '#fde68a' : '#fdba74';
      } else {
        color = i % 3 === 0 ? '#bae6fd' : '#ffffff';
      }
      list.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        vx: (Math.random() - 0.5) * 0.8,
        vy:
          currentMap.id === 'rocky_canyon'
            ? (Math.random() - 0.5) * 0.4
            : 0.5 + Math.random() * 1.1,
        size:
          currentMap.id === 'mystic_forest'
            ? 2.5 + Math.random() * 2.5
            : 1.5 + Math.random() * 2.5,
        alpha: 0.35 + Math.random() * 0.5,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.04,
        color,
      });
    }
    ambientParticles.current = list;
  }, [currentMap.id]);

  // Spawn visual impact particles
  const spawnParticles = (
    x: number,
    y: number,
    color: string,
    count: number,
    shape: Particle['shape'] = 'spark'
  ) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed =
        shape === 'smoke'
          ? 1.0 + Math.random() * 3.2
          : shape === 'spark'
          ? 2.8 + Math.random() * 7.5
          : 2.0 + Math.random() * 5.5;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (shape === 'smoke' ? 1.2 : 1.8),
        color,
        size:
          shape === 'smoke'
            ? 5 + Math.random() * 7
            : shape === 'star'
            ? 3.5 + Math.random() * 4.5
            : 2.2 + Math.random() * 3.8,
        life: 1,
        maxLife:
          shape === 'smoke'
            ? 32 + Math.random() * 20
            : shape === 'spark'
            ? 22 + Math.random() * 18
            : 24 + Math.random() * 16,
        shape,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.22,
      });
    }
  };

  // Spawn sparks + dust cloud + shockwave ring when an arrow impacts a hill or ground
  const spawnTerrainDustCloud = (x: number, y: number, arrowColor = '#facc15') => {
    // 1. Expanding impact shockwave ring on the hill surface
    particles.current.push({
      x,
      y: y - 2,
      vx: 0,
      vy: 0,
      color: '#fde047',
      size: 6,
      life: 1,
      maxLife: 18,
      shape: 'ring',
    });

    // 2. High-velocity metallic/stone sparks (chispas) spraying upward and bouncing off the hill
    const sparkPalette = ['#fef08a', '#facc15', '#fb923c', '#ffffff', arrowColor];
    for (let i = 0; i < 28; i++) {
      const spreadAngle = -Math.PI * 0.08 - Math.random() * Math.PI * 0.84;
      const speed = 3.2 + Math.random() * 7.8;
      particles.current.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y - 3,
        vx: Math.cos(spreadAngle) * speed,
        vy: Math.sin(spreadAngle) * speed - 1.2,
        color: sparkPalette[i % sparkPalette.length],
        size: 2.4 + Math.random() * 3.2,
        life: 1,
        maxLife: 20 + Math.random() * 18,
        shape: 'spark',
      });
    }

    // 3. Biome-colored dust & smoke clouds billowing from the hill impact
    for (let i = 0; i < 20; i++) {
      const spreadAngle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      const speed = 1.2 + Math.random() * 4.2;
      particles.current.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y - 2,
        vx: Math.cos(spreadAngle) * speed,
        vy: Math.sin(spreadAngle) * speed - 0.6,
        color: i % 2 === 0 ? currentMap.dustColor : currentMap.dustSecondary,
        size: 6 + Math.random() * 8,
        life: 1,
        maxLife: 30 + Math.random() * 18,
        shape: 'smoke',
      });
    }
  };

  // Spawn smoke puffs + vibrant colored particles + sparks when an arrow hits a character
  const spawnCharacterImpactEffects = (
    x: number,
    y: number,
    targetChar: CharacterState,
    arrowColor: string,
    isHeadshot: boolean
  ) => {
    const skin = getSkinById(targetChar.skinId);
    const { primaryColor, secondaryColor } = skin.visual;

    // 1. Expanding shockwave ring(s) for visceral combat punch
    particles.current.push({
      x,
      y,
      vx: 0,
      vy: 0,
      color: isHeadshot ? '#facc15' : primaryColor,
      size: isHeadshot ? 10 : 7,
      life: 1,
      maxLife: isHeadshot ? 22 : 17,
      shape: 'ring',
    });
    if (isHeadshot) {
      particles.current.push({
        x,
        y,
        vx: 0,
        vy: 0,
        color: '#ef4444',
        size: 5,
        life: 1,
        maxLife: 18,
        shape: 'ring',
      });
    }

    // 2. Billowing smoke & colored vapor puffs around the character impact point
    const smokeColors = [
      '#e2e8f0',
      '#94a3b8',
      primaryColor,
      secondaryColor,
      arrowColor,
    ];
    const smokeCount = isHeadshot ? 22 : 16;
    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.1 + Math.random() * 3.6;
      particles.current.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.1,
        color: smokeColors[i % smokeColors.length],
        size: 6 + Math.random() * 8,
        life: 1,
        maxLife: 28 + Math.random() * 20,
        shape: 'smoke',
      });
    }

    // 3. Vibrant colored orbs & directional sparks in character + elemental + crimson/gold palette
    const colorPalette = isHeadshot
      ? ['#facc15', '#f59e0b', '#ef4444', '#ffffff', primaryColor, arrowColor]
      : [primaryColor, secondaryColor, arrowColor, '#ef4444', '#fb7185', '#fde047'];
    const burstCount = isHeadshot ? 34 : 24;
    for (let i = 0; i < burstCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.6 + Math.random() * (isHeadshot ? 8.2 : 6.4);
      const shape: Particle['shape'] =
        i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'spark' : 'star';
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.8,
        color: colorPalette[i % colorPalette.length],
        size: shape === 'star' ? 4 + Math.random() * 4 : 2.8 + Math.random() * 3.8,
        life: 1,
        maxLife: 22 + Math.random() * 18,
        shape,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.25,
      });
    }
  };

  // Add floating damage popup
  const addDamagePopup = (x: number, y: number, damage: number, isHeadshot: boolean) => {
    popups.current.push({
      id: Math.random().toString(),
      x,
      y: y - 24,
      damage,
      isHeadshot,
      createdAt: Date.now(),
      opacity: 1,
    });
  };

  // Query procedural terrain height at any X coordinate
  const getGroundYAtX = useCallback((x: number): number => {
    const idx = Math.max(0, Math.min(WORLD_WIDTH, Math.round(x)));
    return terrainRef.current.heights[idx] ?? 520;
  }, []);

  // ============================================================================
  // STRICT CARTESIAN HITBOX DETECTION (HEADBOX TOP 25% vs BODYBOX BOTTOM 75%)
  // No circular radii (Math.hypot) — exclusively Cartesian X & Y intervals on arrow tip
  // ============================================================================
  const CHARACTER_HEIGHT = 108;

  const checkArrowCollision = (
    proj: Projectile,
    target: CharacterState
  ): { hit: boolean; isHeadshot: boolean; impactX: number; impactY: number } => {
    const characterHeight = CHARACTER_HEIGHT;

    // 1. Exact Zone Definitions (without shared circular radii):
    // - ALTURA CABEZA (headArea): Top 25% of characterHeight, X margin +/- 12px
    const yMinCabeza = target.y - characterHeight;
    const yMaxCabeza = target.y - characterHeight * 0.75;

    // - ALTURA CUERPO/TORSO (bodyArea): Bottom 75% of characterHeight, X margin +/- 16px
    const yMinCuerpo = target.y - characterHeight * 0.75;
    const yMaxCuerpo = target.y;

    // Exact arrow tip coordinates (arrow.tipX, arrow.tipY)
    const rad = (proj.angle * Math.PI) / 180;
    const arrowTipX = proj.x + Math.cos(rad) * 14;
    const arrowTipY = proj.y + Math.sin(rad) * 14;

    // 2. Strict Evaluation of Arrow Tip (Priority 1: HEADSHOT, Priority 2: TIRO AL CUERPO)
    // CONDICIÓN HEADSHOT:
    if (
      arrowTipY >= yMinCabeza &&
      arrowTipY < yMaxCabeza &&
      Math.abs(arrowTipX - target.x) <= 12
    ) {
      return {
        hit: true,
        isHeadshot: true,
        impactX: arrowTipX,
        impactY: arrowTipY,
      };
    }

    // CONDICIÓN TIRO AL CUERPO:
    if (
      arrowTipY >= yMinCuerpo &&
      arrowTipY <= yMaxCuerpo &&
      Math.abs(arrowTipX - target.x) <= 16
    ) {
      return {
        hit: true,
        isHeadshot: false,
        impactX: arrowTipX,
        impactY: arrowTipY,
      };
    }

    return { hit: false, isHeadshot: false, impactX: arrowTipX, impactY: arrowTipY };
  };

  // Launch projectile with direct velocity vector (vx, vy) in px/s & contextual audio
  const launchProjectileVector = useCallback(
    (
      startX: number,
      startY: number,
      vx: number,
      vy: number,
      shooter: 'player' | 'enemy'
    ) => {
      const isPlayer = shooter === 'player';
      const skin = getSkinById(isPlayer ? playerState.current.skinId : enemyState.current.skinId);
      const angleDeg = (Math.atan2(vy, vx) * 180) / Math.PI;

      const energyTypes = [
        'laser_red',
        'emp_shock',
        'plasma_bolt',
        'solar_flare',
        'inferno_beam',
        'void_laser',
        'kinetic_core',
        'divine_ray',
        'temporal_warp',
      ];
      const isEnergyShot = energyTypes.includes(skin.visual.arrowType);

      impactCameraFocusRef.current.active = false;

      activeProjectile.current = {
        x: startX,
        y: startY,
        vx,
        vy,
        radius: isEnergyShot ? 6 : 4,
        arrowType: skin.visual.arrowType,
        angle: angleDeg,
        active: true,
        shooter,
        primaryColor: skin.visual.primaryColor,
        secondaryColor: skin.visual.secondaryColor,
        bowColor: skin.visual.bowColor,
        trail: [],
      };

      const arrowMeta = getArrowTypeMeta(skin.visual.arrowType);
      const launchSpeed = Math.hypot(vx, vy);
      const estimatedPower = Math.min(100, Math.max(20, Math.round(((launchSpeed - 370) / 600) * 100)));
      sound.playDisparo(isEnergyShot, estimatedPower);
      sound.startFlechaVolando(isEnergyShot);

      if (isEnergyShot) {
        spawnParticles(startX, startY, arrowMeta.trailHex, 12, 'spark');
      } else {
        spawnParticles(startX, startY, arrowMeta.trailHex, 8, 'smoke');
      }

      setCurrentTurn('animating');
    },
    []
  );

  // Launch player projectile from angle & power percentage
  const fireProjectile = useCallback(
    (
      startX: number,
      startY: number,
      angleDeg: number,
      powerPercent: number,
      shooter: 'player' | 'enemy'
    ) => {
      const rad = (angleDeg * Math.PI) / 180;
      const speed = 370 + (powerPercent / 100) * 600; // up to 970 px/s to clear tall hills and elevation gaps
      const vx = Math.cos(rad) * speed;
      const vy = -Math.sin(rad) * speed;
      launchProjectileVector(startX, startY, vx, vy, shooter);
    },
    [launchProjectileVector]
  );

  // HUMANIZED ENEMY AI AIMING WITH PROGRESSIVE TURN-BY-TURN CALIBRATION:
  // - Turn 1: Intentional noticeable error (±6° to ±9° angle deviation or ±15% power), landing on nearby slope or passing close overhead
  // - Turn 2: If Turn 1 missed, corrects trajectory by cutting the error margin in half (±3° to ±4°)
  // - Turn 3+: Calibrated shot aimed at the torso/body (±1° to ±1.5° margin -> -25 HP)
  // - AI Headshots: NEVER on Turns 1 or 2; from Turn 3+ only a 15% - 20% probability (18%) of hitting the head (-50 HP)
  const executeAiTurn = useCallback(() => {
    if (matchEndedRef.current) return;
    setCurrentTurn('animating');
    activeCameraTurnRef.current = 'enemy';

    const mem = aiMemory.current;
    const turnNumber = mem.shotsFired + 1;

    // Headshots strictly forbidden on Turns 1 and 2; only 18% (15%-20%) probability from Turn 3+
    const aimingForHead = turnNumber >= 3 && Math.random() < 0.18;
    mem.aimingForHeadThisTurn = aimingForHead;

    // Target Y offset relative to player.y (ground base):
    // Body center is at player.y - 45 (strictly inside bodyArea [player.y - 81, player.y])
    // Head center is at player.y - 95 (strictly inside headArea [player.y - 108, player.y - 81))
    let targetYOffset = -45;
    let angleDeviationDeg = 0;
    let powerMultiplier = 1.0;
    let horizontalCalibrationOffset = 0;

    if (turnNumber === 1) {
      // Turn 1: Noticeable intentional error (±6° to ±9° angular deviation or ±15% power)
      const errorSign = Math.random() < 0.55 ? -1 : 1; // -1 = falls short on slope, +1 = passes overhead
      mem.lastErrorSign = errorSign;

      const usePowerError = Math.random() < 0.4;
      if (usePowerError) {
        // ±13% to ±15% power deviation
        powerMultiplier = 1 + errorSign * (0.13 + Math.random() * 0.025);
        angleDeviationDeg = errorSign * (2.5 + Math.random() * 1.5);
      } else {
        // ±6° to ±9° angular deviation
        angleDeviationDeg = errorSign * (6.0 + Math.random() * 3.0);
        powerMultiplier = 1 + errorSign * (0.05 + Math.random() * 0.03);
      }
      targetYOffset = -45;

      pushCombatLog('Rival IA (Turno 1): Tantando distancia y viento...', 'ai');
      setRoundBanner('🎯 Rival IA: Estimando parábola inicial...');
    } else if (turnNumber === 2) {
      // Turn 2: Cut previous error margin in half (±3° to ±4° angular deviation)
      const corrSign = mem.lastShotHit ? (Math.random() < 0.5 ? -1 : 1) : -mem.lastErrorSign;
      mem.lastErrorSign = corrSign;

      if (!mem.lastShotHit) {
        angleDeviationDeg = corrSign * (3.0 + Math.random() * 1.0); // ±3° to ±4°
        powerMultiplier = 1 + corrSign * (0.04 + Math.random() * 0.02);
        pushCombatLog('Rival IA (Turno 2): Corrigiendo trayectoria a la mitad de error...', 'ai');
        setRoundBanner('🎯 Rival IA: Corrigiendo ángulo tras el primer tiro...');
      } else {
        angleDeviationDeg = corrSign * (2.0 + Math.random() * 1.0);
        powerMultiplier = 1.0;
        pushCombatLog('Rival IA (Turno 2): Ajustando puntería al torso...', 'ai');
        setRoundBanner('🎯 Rival IA: Ajustando puntería al cuerpo...');
      }
      targetYOffset = -45;
    } else {
      // Turn 3+: Calibrated shot (±1° to ±1.5° margin) aimed at torso (-25 HP), or 15%-20% chance of Headshot (-50 HP)
      const fineSign = Math.random() < 0.5 ? -1 : 1;
      if (aimingForHead) {
        targetYOffset = -95; // Headbox center (-50 HP)
        angleDeviationDeg = fineSign * (0.3 + Math.random() * 0.4);
        horizontalCalibrationOffset = (Math.random() - 0.5) * 6;
        pushCombatLog('⚠️ ¡Rival IA apunta a la cabeza!', 'ai');
        setRoundBanner('⚠️ Rival IA: ¡Disparo calibrado a la cabeza!');
      } else {
        targetYOffset = -45 + (Math.random() - 0.5) * 10; // Bodybox torso (-25 HP)
        angleDeviationDeg = fineSign * (1.0 + Math.random() * 0.5); // ±1° to ±1.5° margin
        horizontalCalibrationOffset = (Math.random() - 0.5) * 10;
        pushCombatLog('Rival IA: Tiro calibrado al torso (-25 HP)', 'ai');
        setRoundBanner('🎯 Rival IA: Disparo calibrado al cuerpo...');
      }
    }

    setIsAiDrawing(true);

    setTimeout(() => {
      if (matchEndedRef.current) return;

      const player = {
        x: playerState.current.x,
        y: playerState.current.y,
      };
      const ai = {
        x: enemyState.current.x - 29,
        y: enemyState.current.y - 68,
      };

      const targetX = player.x + horizontalCalibrationOffset;
      const targetY = player.y + targetYOffset;

      // Compute flight time `t` that clears the highest central obstacle hill between AI and Player
      const highestObstacleY = terrainRef.current.maxCentralPeakY;
      const avgY = 0.5 * (ai.y + targetY);
      const desiredApexY = Math.min(avgY - 150, highestObstacleY - 55);
      const requiredHeightRise = Math.max(150, avgY - desiredApexY);
      const minFlightTime = Math.sqrt((8 * requiredHeightRise) / GRAVITY);

      const hillClearanceBoost = mem.hitCentralHillLastTurn ? 0.18 : 0;
      // On Turn 3+, incorporate the ±1° to ±1.5° loft variation directly into the flight arc time so horizontal calibration hits the torso
      const turn3LoftDelta = turnNumber >= 3 ? (angleDeviationDeg * 0.018) : 0;
      const t = Math.max(
        1.8,
        Math.min(2.45, minFlightTime + hillClearanceBoost + turn3LoftDelta)
      );

      const g = GRAVITY;
      const wind = windRef.current * WIND_ACCEL_FACTOR;

      // Exact ballistic vector accounting for elevation difference dy = (targetY - ai.y) and wind
      let vx = (targetX - ai.x) / t - 0.5 * wind * t;
      let vy = (targetY - ai.y - 0.5 * g * (t * t)) / t;

      // On Turn 1 and Turn 2, apply the angular deviation (±6°..9° on Turn 1, ±3°..4° on Turn 2) and power multiplier directly to the launch vector
      if (turnNumber <= 2) {
        const baseSpeed = Math.hypot(vx, vy);
        // Elevation angle in degrees above leftward horizontal (-X axis)
        const baseElevDeg = (Math.atan2(-vy, -vx) * 180) / Math.PI;
        const perturbedElevDeg = Math.max(22, Math.min(76, baseElevDeg + angleDeviationDeg));
        const perturbedRad = (perturbedElevDeg * Math.PI) / 180;
        const perturbedSpeed = baseSpeed * powerMultiplier;

        vx = -Math.cos(perturbedRad) * perturbedSpeed;
        vy = -Math.sin(perturbedRad) * perturbedSpeed;
      }

      const visualAngle = (Math.atan2(-vy, vx) * 180) / Math.PI;
      enemyState.current.armAngle = visualAngle;
      mem.shotsFired = turnNumber;
      sound.playBowPull(0.7);

      setTimeout(() => {
        if (matchEndedRef.current) return;
        setIsAiDrawing(false);
        launchProjectileVector(ai.x, ai.y, vx, vy, 'enemy');
        setRoundBanner('¡El rival disparó sobre las colinas!');
      }, 480);
    }, 620);
  }, [launchProjectileVector, pushCombatLog]);

  // 10-second Player Turn Countdown Timer (paused when Revive Modal is open)
  useEffect(() => {
    if (currentTurn !== 'player' || matchEndedRef.current || showReviveModal) return;

    const interval = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsAiming(false);
          dragStartPos.current = null;
          sound.playMiss();
          setRoundBanner('⏰ ¡Tiempo agotado (10s)! Perdiste tu turno');
          pushCombatLog('¡Tiempo agotado! Turno perdido', 'info');
          executeAiTurn();
          return 10;
        }
        if (prev <= 4) {
          sound.playClick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTurn, executeAiTurn, pushCombatLog, showReviveModal]);

  // ============================================================================
  // SECOND CHANCE / REVIVE COUNTDOWN & MECHANICS
  // ============================================================================
  const triggerFinalDefeat = useCallback(() => {
    setShowReviveModal(false);
    setIsWatchingReviveAd(false);
    matchEndedRef.current = true;
    sound.playDerrota();
    setRoundBanner('¡DERROTA! Has caído en combate');
    setTimeout(() => {
      if (gameMode === 'ENDLESS') {
        onDefeat({
          streak: endlessStreakRef.current,
          coinsEarned: endlessCoinsRef.current,
        });
      } else {
        onDefeat();
      }
    }, 900);
  }, [gameMode, onDefeat]);

  // 5-second countdown timer on the Revive Modal (paused while watching the 2.5s ad)
  useEffect(() => {
    if (!showReviveModal || isWatchingReviveAd) return;

    const timer = setInterval(() => {
      setReviveTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerFinalDefeat();
          return 0;
        }
        sound.playClick();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showReviveModal, isWatchingReviveAd, triggerFinalDefeat]);

  // Complete Revive: restores 50 HP, keeps map/progress/streak intact, grants player turn + shield aura
  const completePlayerRevive = useCallback(
    (methodLabel: string) => {
      setShowReviveModal(false);
      setIsWatchingReviveAd(false);
      setHasUsedRevive(true);
      hasUsedReviveRef.current = true;
      matchEndedRef.current = false;

      // Restore 50% HP (50 HP)
      const revivedHp = 50;
      playerHealthRef.current = revivedHp;
      playerState.current.hp = revivedHp;
      playerState.current.isHit = false;
      setPlayerHealth(revivedHp);

      // Activate golden/cyan immunity shield visual effect for 4.5 seconds
      reviveShieldUntilRef.current = Date.now() + 4500;
      sound.playVictoria();
      spawnParticles(playerState.current.x, playerState.current.y - 55, '#38bdf8', 26, 'star');
      spawnParticles(playerState.current.x, playerState.current.y - 55, '#facc15', 22, 'spark');

      // Grant immediate turn to the player
      activeCameraTurnRef.current = 'player';
      impactCameraFocusRef.current.active = false;
      setTurnTimeLeft(10);
      setCurrentTurn('player');
      pushCombatLog(`🛡️ ¡Has revivido con 50 HP (${methodLabel})! Tu turno`, 'headshot');
      setRoundBanner('🛡️ ¡Segunda Oportunidad Activa (50 HP)! Tu Turno');
    },
    [pushCombatLog]
  );

  // Option A: Revive by watching a 2.5s simulated Rewarded Ad
  const handleReviveWithAd = () => {
    if (!isOnline || isWatchingReviveAd) return;
    sound.playClick();
    setIsWatchingReviveAd(true);
    setReviveAdTimeLeft(3);

    let remaining = 3;
    const adInterval = setInterval(() => {
      remaining -= 1;
      setReviveAdTimeLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(adInterval);
        completePlayerRevive('Anuncio');
      }
    }, 850); // ~2.55 seconds total
  };

  // Option B: Revive by paying 200 Coins
  const handleReviveWithCoins = () => {
    const balance = getCoins();
    if (balance < REVIVE_COST_COINS) {
      sound.playMiss();
      return;
    }
    const spent = spendCoins(REVIVE_COST_COINS);
    if (spent) {
      sound.playCoin();
      const updatedCoins = getCoins();
      setCurrentCoins(updatedCoins);
      if (onCoinsChanged) onCoinsChanged(updatedCoins);
      completePlayerRevive(`-${REVIVE_COST_COINS} 🪙`);
    }
  };

  // Advance to the next rival wave in Endless Mode (+20 HP heal, new procedural terrain, new rival skin, progressive coins)
  const advanceEndlessWave = useCallback(() => {
    const nextStreak = endlessStreakRef.current + 1;
    endlessStreakRef.current = nextStreak;
    setEndlessStreak(nextStreak);

    const recordRes = updateBestEndlessStreak(nextStreak);
    setBestEndlessStreak(recordRes.best);

    // Progressive coin reward for each consecutive elimination
    const waveReward = 20 + nextStreak * 5;
    const newTotalBalance = addCoins(waveReward);
    setCurrentCoins(newTotalBalance);
    if (onCoinsChanged) onCoinsChanged(newTotalBalance);

    endlessCoinsRef.current += waveReward;
    setEndlessCoinsEarned(endlessCoinsRef.current);

    // Heal player +25 HP (up to 100 HP) in Endless Mode
    const healedHp = Math.min(100, playerHealthRef.current + 25);
    playerHealthRef.current = healedHp;
    playerState.current.hp = healedHp;
    setPlayerHealth(healedHp);

    // Reconfigure procedural terrain, hills, and archer heights
    const nextMap = MAPS[Math.floor(Math.random() * MAPS.length)];
    setCurrentMap(nextMap);

    const nextTerrain = generateProceduralTerrain('ENDLESS', campaignLevel, nextStreak);
    terrainRef.current = nextTerrain;
    setTerrain(nextTerrain);
    stuckArrows.current = [];

    // Update Player & new Enemy positions and reset Revive availability for the new wave
    playerPos.current = { x: nextTerrain.playerX, y: nextTerrain.playerGroundY };
    enemyPos.current = { x: nextTerrain.enemyX, y: nextTerrain.enemyGroundY };

    playerState.current.x = nextTerrain.playerX;
    playerState.current.y = nextTerrain.playerGroundY;
    playerState.current.isHit = false;

    const nextRivalSkin = pickRandomRivalSkin();
    setRivalSkinId(nextRivalSkin);
    enemyHpRef.current = 100;
    setEnemyHp(100);
    enemyState.current = {
      hp: 100,
      maxHp: 100,
      x: nextTerrain.enemyX,
      y: nextTerrain.enemyGroundY,
      skinId: nextRivalSkin,
      isHit: false,
      hitTime: 0,
      hitType: null,
      armAngle: 135,
    };

    aiMemory.current = {
      shotsFired: 0,
      lastShotHit: false,
      lastErrorSign: 1,
      lastImpactX: null,
      lastDeltaX: null,
      hitCentralHillLastTurn: false,
      aimingForHeadThisTurn: false,
    };

    // Allow 1 revive per rival wave in Endless Mode
    setHasUsedRevive(false);
    hasUsedReviveRef.current = false;

    const nextWind = rollScaledWind(nextStreak);
    windRef.current = nextWind;
    setWind(nextWind);

    activeCameraTurnRef.current = 'player';
    impactCameraFocusRef.current.active = false;
    setTurnTimeLeft(10);
    setCurrentTurn('player');

    pushCombatLog(
      `🔥 ¡Baja #${nextStreak}! +${waveReward} 🪙 y +25 HP · Nuevo rival en ${nextMap.name}`,
      'headshot'
    );
    setRoundBanner(`♾️ Oleada #${nextStreak + 1} · ¡Terreno Reconfigurado! Tu Turno`);
  }, [campaignLevel, onCoinsChanged, pickRandomRivalSkin, pushCombatLog, rollScaledWind]);

  const randomizeWindForNextTurn = useCallback(() => {
    const delta = (Math.random() - 0.5) * 2.2;
    const nextWind = Math.max(-3.8, Math.min(3.8, Number((windRef.current + delta).toFixed(1))));
    windRef.current = nextWind;
    setWind(nextWind);
    if (Math.abs(nextWind) >= 2.0) {
      pushCombatLog(`¡Viento fuerte! (${nextWind > 0 ? '+' : ''}${nextWind} m/s)`, 'wind');
    }
  }, [pushCombatLog]);

  // Handle projectile landing / impact:
  // - Checks if arrow hit character or stuck into an intermediate hill
  // - Triggers Second Chance / Revive Modal when player HP drops to 0 (if not yet used)
  const handleProjectileImpact = useCallback(
    (
      hit: boolean,
      isHeadshot: boolean,
      target: 'player' | 'enemy' | 'none',
      impactX: number,
      impactY: number
    ) => {
      shakeIntensityRef.current = isHeadshot ? 12 : hit ? 7 : 3;
      const lastShooter = activeProjectile.current?.shooter;
      const lastAngle = activeProjectile.current?.angle ?? 0;
      const lastBowColor = activeProjectile.current?.bowColor ?? '#78350f';
      const lastArrowType = activeProjectile.current?.arrowType ?? 'wood_standard';
      const lastArrowColor =
        getArrowTypeMeta(lastArrowType).trailHex ||
        activeProjectile.current?.secondaryColor ||
        '#facc15';

      sound.stopFlechaVolando();

      if (activeProjectile.current) {
        activeProjectile.current.active = false;
      }
      activeProjectile.current = null;

      // Save impact data for humanized AI memory
      if (lastShooter === 'enemy') {
        aiMemory.current.lastShotHit = hit;
        aiMemory.current.lastImpactX = impactX;
        aiMemory.current.lastDeltaX = impactX - playerState.current.x;
        // Check if AI arrow collided against a central obstacle hill before reaching the player
        const hitObstacleHill =
          !hit &&
          impactX > playerState.current.x + 90 &&
          impactX < enemyState.current.x - 90;
        aiMemory.current.hitCentralHillLastTurn = hitObstacleHill;
      }

      // Focus camera on the impact zone for 1 full second (1000ms)
      impactCameraFocusRef.current = {
        active: true,
        x: Math.max(0, Math.min(WORLD_WIDTH, impactX)),
        y: Math.max(0, Math.min(WORLD_HEIGHT, impactY)),
        until: Date.now() + 1000,
      };

      if (hit) {
        const damage = isHeadshot ? 50 : 25;
        sound.playImpactoEnEnemigo(isHeadshot);

        if (target === 'enemy') {
          spawnCharacterImpactEffects(
            impactX,
            impactY,
            enemyState.current,
            lastArrowColor,
            isHeadshot
          );
          if (isHeadshot) {
            headshotsScored.current += 1;
            incrementMissionProgress('headshots', 1);
            pushCombatLog('¡HEADSHOT! -50 HP', 'headshot');
          } else {
            // Strictly body hit: never increment headshotsScored or headshots mission
            incrementMissionProgress('bodyshots', 1);
            pushCombatLog('¡IMPACTO AL CUERPO! -25 HP', 'hit');
          }

          enemyState.current.isHit = true;
          enemyState.current.hitTime = Date.now();
          enemyState.current.hitType = isHeadshot ? 'head' : 'body';
          setEnemyBarHitFlash(true);
          setTimeout(() => setEnemyBarHitFlash(false), 450);

          const nextEnemyHp = Math.max(0, enemyHpRef.current - damage);
          enemyHpRef.current = nextEnemyHp;
          enemyState.current.hp = nextEnemyHp;
          setEnemyHp(nextEnemyHp);
          addDamagePopup(impactX, impactY, damage, isHeadshot);

          if (nextEnemyHp <= 0) {
            sound.playVictoria();
            if (gameMode === 'ENDLESS') {
              // Endless Mode: heal +25 HP, award progressive coins, and spawn next rival wave!
              setRoundBanner('🔥 ¡Rival Abatido! +25 HP · Generando nuevo terreno...');
              setTimeout(() => {
                if (!matchEndedRef.current) {
                  advanceEndlessWave();
                }
              }, 1250);
              return;
            } else {
              matchEndedRef.current = true;
              setRoundBanner(
                gameMode === 'CAMPAIGN'
                  ? `¡Nivel ${campaignLevel} Superado!`
                  : '¡VICTORIA! Rival Derrotado'
              );
              setTimeout(() => {
                onVictory(headshotsScored.current);
              }, 1200);
              return;
            }
          }
        } else if (target === 'player') {
          spawnCharacterImpactEffects(
            impactX,
            impactY,
            playerState.current,
            lastArrowColor,
            isHeadshot
          );
          if (isHeadshot) {
            pushCombatLog('¡HEADSHOT! -50 HP (Rival)', 'headshot');
          } else {
            pushCombatLog('¡IMPACTO AL CUERPO! -25 HP (Rival)', 'hit');
          }

          playerState.current.isHit = true;
          playerState.current.hitTime = Date.now();
          playerState.current.hitType = isHeadshot ? 'head' : 'body';
          setPlayerBarHitFlash(true);
          setTimeout(() => setPlayerBarHitFlash(false), 450);

          const nextPlayerHealth = Math.max(0, playerHealthRef.current - damage);
          playerHealthRef.current = nextPlayerHealth;
          playerState.current.hp = nextPlayerHealth;
          setPlayerHealth(nextPlayerHealth);
          addDamagePopup(impactX, impactY, damage, isHeadshot);

          // MANDATORY CONSOLE LOG CONFIRMATION
          console.log('Impacto IA confirmado en jugador. Vida restante:', nextPlayerHealth);

          if (nextPlayerHealth <= 0) {
            // Check if player can use their 1-time Second Chance / Revive
            if (!hasUsedReviveRef.current) {
              setRoundBanner('⚠️ ¡Has caído a 0 HP! ¿Deseas revivir?');
              setTimeout(() => {
                setCurrentCoins(getCoins());
                setReviveTimeLeft(5);
                setShowReviveModal(true);
              }, 850);
              return;
            } else {
              triggerFinalDefeat();
              return;
            }
          }
        }
      } else {
        // Arrow hit terrain or central obstacle hill -> spawn sparks + dust & stick arrow into hill!
        sound.playImpactoEnTierra();
        spawnTerrainDustCloud(impactX, impactY, lastArrowColor);
        addDamagePopup(impactX, impactY, 0, false);

        stuckArrows.current.push({
          x: impactX,
          y: impactY,
          angle: lastAngle,
          color: lastBowColor,
        });
        if (stuckArrows.current.length > 18) {
          stuckArrows.current.shift();
        }

        const hitCentralHill = terrainRef.current.centralHills.some(
          (h) => Math.abs(impactX - h.centerX) < h.width * 0.85
        );
        if (hitCentralHill) {
          pushCombatLog('⛰️ ¡Flecha clavada en la colina intermedia!', 'info');
        } else {
          pushCombatLog('Impacto contra la tierra', 'info');
        }
      }

      // Wait 1 full second (1000ms) focusing on the impact zone before panning camera to the next shooter
      setTimeout(() => {
        impactCameraFocusRef.current.active = false;
        if (matchEndedRef.current) return;
        if (lastShooter === 'player') {
          executeAiTurn();
        } else {
          activeCameraTurnRef.current = 'player';
          randomizeWindForNextTurn();
          setTurnTimeLeft(10);
          setCurrentTurn('player');
          setRoundBanner('¡Tu Turno! Arrastra y suelta antes de 10s');
        }
      }, 1000);
    },
    [
      advanceEndlessWave,
      campaignLevel,
      executeAiTurn,
      gameMode,
      onVictory,
      pushCombatLog,
      randomizeWindForNextTurn,
      triggerFinalDefeat,
    ]
  );

  // Pointer controls for aiming
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (currentTurn !== 'player' || matchEndedRef.current || showReviveModal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = VIEW_WIDTH / rect.width;
    const scaleY = VIEW_HEIGHT / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    dragStartPos.current = { x, y };
    setIsAiming(true);
    activeCameraTurnRef.current = 'player';
    sound.playBowPull(0.2);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAiming || !dragStartPos.current || currentTurn !== 'player') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = VIEW_WIDTH / rect.width;
    const scaleY = VIEW_HEIGHT / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const dx = dragStartPos.current.x - x;
    const dy = dragStartPos.current.y - y;
    const dist = Math.hypot(dx, dy);

    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < -25) angle = -25;
    if (angle > 85) angle = 85;

    const maxDrag = 140;
    const power = Math.min(100, Math.max(15, Math.round((dist / maxDrag) * 100)));

    if (Math.abs(power - aimPower) >= 6) {
      sound.playBowPull(power / 100);
    }

    setAimAngle(Math.round(angle));
    setAimPower(power);
    playerState.current.armAngle = angle;
  };

  const handlePointerUp = () => {
    if (!isAiming) return;
    setIsAiming(false);

    if (aimPower >= 15 && currentTurn === 'player' && !matchEndedRef.current && !showReviveModal) {
      const startX = playerPos.current.x + 29;
      const startY = playerPos.current.y - 68;
      fireProjectile(startX, startY, aimAngle, aimPower, 'player');
    }

    dragStartPos.current = null;
  };

  // Render procedural terrain curve, central obstacle hills, strata layers, and stuck arrows
  const drawProceduralHillsAndTerrain = (
    ctx: CanvasRenderingContext2D,
    cliffBaseColor: string,
    cliffMidColor: string,
    topTurfColor: string,
    mistColor: string
  ) => {
    const heights = terrainRef.current.heights;

    // 1. Soft Valley Mist in low hollows
    const mistGrad = ctx.createLinearGradient(0, 440, 0, WORLD_HEIGHT);
    mistGrad.addColorStop(0, 'rgba(0,0,0,0)');
    mistGrad.addColorStop(1, mistColor);
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, 440, WORLD_WIDTH, 160);

    // 2. Deep Base Rock Polygon following procedural heightmap
    ctx.fillStyle = cliffBaseColor;
    ctx.beginPath();
    ctx.moveTo(0, WORLD_HEIGHT);
    for (let x = 0; x <= WORLD_WIDTH; x += 6) {
      ctx.lineTo(x, heights[x]);
    }
    ctx.lineTo(WORLD_WIDTH, heights[WORLD_WIDTH]);
    ctx.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // 3. Mid Rock Strata Layer (offset slightly below surface for 3D comic depth)
    ctx.fillStyle = cliffMidColor;
    ctx.beginPath();
    ctx.moveTo(0, WORLD_HEIGHT);
    for (let x = 0; x <= WORLD_WIDTH; x += 8) {
      const strataOffset = 18 + Math.sin(x * 0.025) * 6;
      ctx.lineTo(x, heights[x] + strataOffset);
    }
    ctx.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // 4. Top Turf / Ochre / Snow Crust Ribbon along the procedural hills
    ctx.fillStyle = topTurfColor;
    ctx.beginPath();
    ctx.moveTo(0, heights[0]);
    for (let x = 4; x <= WORLD_WIDTH; x += 4) {
      ctx.lineTo(x, heights[x]);
    }
    for (let x = WORLD_WIDTH; x >= 0; x -= 8) {
      const crustThickness = 12 + Math.cos(x * 0.04) * 3;
      ctx.lineTo(x, heights[x] + crustThickness);
    }
    ctx.closePath();
    ctx.fill();

    // Crisp comic outline on top surface
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, heights[0]);
    for (let x = 4; x <= WORLD_WIDTH; x += 4) {
      ctx.lineTo(x, heights[x]);
    }
    ctx.stroke();

    // 5. Draw Stuck Arrows embedded in intermediate hills & ground
    stuckArrows.current.forEach((sa) => {
      ctx.save();
      ctx.translate(sa.x, sa.y);
      ctx.rotate((sa.angle * Math.PI) / 180);
      ctx.strokeStyle = sa.color;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(-13, -4);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-13, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  };

  // Draw the 3 distinct map scenarios with procedural hills
  const drawMapScenario = (ctx: CanvasRenderingContext2D, mapId: MapId) => {
    if (mapId === 'mystic_forest') {
      const skyGrad = ctx.createLinearGradient(0, -180, 0, WORLD_HEIGHT);
      skyGrad.addColorStop(0, '#070412');
      skyGrad.addColorStop(0.35, '#1e1b4b');
      skyGrad.addColorStop(0.7, '#3b0764');
      skyGrad.addColorStop(1, '#4c1d95');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(-100, -240, WORLD_WIDTH + 200, WORLD_HEIGHT + 280);

      const moonGrad = ctx.createRadialGradient(1080, 110, 14, 1080, 110, 130);
      moonGrad.addColorStop(0, 'rgba(243, 232, 255, 0.95)');
      moonGrad.addColorStop(0.35, 'rgba(192, 132, 252, 0.45)');
      moonGrad.addColorStop(1, 'rgba(192, 132, 252, 0)');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(1080, 110, 130, 0, Math.PI * 2);
      ctx.fill();

      // Distant mountain range
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(0, 490);
      ctx.lineTo(160, 320);
      ctx.lineTo(360, 440);
      ctx.lineTo(580, 280);
      ctx.lineTo(810, 430);
      ctx.lineTo(1040, 275);
      ctx.lineTo(1280, 430);
      ctx.lineTo(1460, 325);
      ctx.lineTo(WORLD_WIDTH, 440);
      ctx.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
      ctx.lineTo(0, WORLD_HEIGHT);
      ctx.closePath();
      ctx.fill();

      drawProceduralHillsAndTerrain(
        ctx,
        '#022c22',
        '#064e3b',
        '#059669',
        'rgba(16, 185, 129, 0.25)'
      );
    } else if (mapId === 'rocky_canyon') {
      const skyGrad = ctx.createLinearGradient(0, -180, 0, WORLD_HEIGHT);
      skyGrad.addColorStop(0, '#450a0a');
      skyGrad.addColorStop(0.3, '#9a3412');
      skyGrad.addColorStop(0.65, '#ea580c');
      skyGrad.addColorStop(0.9, '#f59e0b');
      skyGrad.addColorStop(1, '#fde047');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(-100, -240, WORLD_WIDTH + 200, WORLD_HEIGHT + 280);

      const sunGrad = ctx.createRadialGradient(800, 290, 24, 800, 290, 180);
      sunGrad.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
      sunGrad.addColorStop(0.4, 'rgba(251, 146, 60, 0.5)');
      sunGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(800, 290, 180, 0, Math.PI * 2);
      ctx.fill();

      // Distant canyon mesas
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.moveTo(0, 480);
      ctx.lineTo(80, 330);
      ctx.lineTo(220, 330);
      ctx.lineTo(270, 440);
      ctx.lineTo(480, 295);
      ctx.lineTo(640, 295);
      ctx.lineTo(710, 460);
      ctx.lineTo(960, 290);
      ctx.lineTo(1140, 290);
      ctx.lineTo(1210, 435);
      ctx.lineTo(1390, 340);
      ctx.lineTo(WORLD_WIDTH, 440);
      ctx.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
      ctx.lineTo(0, WORLD_HEIGHT);
      ctx.closePath();
      ctx.fill();

      drawProceduralHillsAndTerrain(
        ctx,
        '#431407',
        '#7c2d12',
        '#d97706',
        'rgba(245, 158, 11, 0.22)'
      );
    } else {
      const skyGrad = ctx.createLinearGradient(0, -180, 0, WORLD_HEIGHT);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.4, '#1e293b');
      skyGrad.addColorStop(0.75, '#475569');
      skyGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(-100, -240, WORLD_WIDTH + 200, WORLD_HEIGHT + 280);

      // Snowy alpine peaks
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(0, 480);
      ctx.lineTo(150, 280);
      ctx.lineTo(350, 430);
      ctx.lineTo(590, 235);
      ctx.lineTo(820, 420);
      ctx.lineTo(1060, 245);
      ctx.lineTo(1290, 425);
      ctx.lineTo(1470, 285);
      ctx.lineTo(WORLD_WIDTH, 430);
      ctx.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
      ctx.lineTo(0, WORLD_HEIGHT);
      ctx.closePath();
      ctx.fill();

      drawProceduralHillsAndTerrain(
        ctx,
        '#334155',
        '#64748b',
        '#f8fafc',
        'rgba(186, 230, 253, 0.28)'
      );
    }
  };

  // Draw mini world radar with terrain profile & central hills at top of canvas
  const drawWorldMinimapHud = (ctx: CanvasRenderingContext2D) => {
    const barW = 200;
    const barH = 18;
    const barX = (VIEW_WIDTH - barW) / 2;
    const barY = 10;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 7);
    ctx.fill();
    ctx.stroke();

    // Mini terrain silhouette inside radar
    const heights = terrainRef.current.heights;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.beginPath();
    ctx.moveTo(barX + 2, barY + barH - 2);
    for (let i = 0; i <= 40; i++) {
      const wx = Math.round((i / 40) * WORLD_WIDTH);
      const wy = heights[wx] ?? 500;
      const mx = barX + 2 + (i / 40) * (barW - 4);
      const my = barY + 3 + ((wy - 200) / 360) * (barH - 5);
      ctx.lineTo(mx, Math.max(barY + 2, Math.min(barY + barH - 2, my)));
    }
    ctx.lineTo(barX + barW - 2, barY + barH - 2);
    ctx.closePath();
    ctx.fill();

    // Current camera viewport window indicator
    const camWinX = barX + (cameraRef.current.x / WORLD_WIDTH) * barW;
    const camWinW = (VIEW_WIDTH / WORLD_WIDTH) * barW;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(camWinX, barY + 1, camWinW, barH - 2, 5);
    ctx.fill();
    ctx.stroke();

    // Player dot (green)
    const pDotX = barX + (playerState.current.x / WORLD_WIDTH) * barW;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(pDotX, barY + barH / 2, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Rival AI dot (red)
    const eDotX = barX + (enemyState.current.x / WORLD_WIDTH) * barW;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(eDotX, barY + barH / 2, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Active projectile dot (yellow)
    if (activeProjectile.current && activeProjectile.current.active) {
      const projDotX = Math.max(
        barX + 3,
        Math.min(barX + barW - 3, barX + (activeProjectile.current.x / WORLD_WIDTH) * barW)
      );
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(projDotX, barY + barH / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Main 60fps render loop with Dynamic Camera Pan / Follow & Procedural Terrain Collision
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      let projectileToDraw: Projectile | null = null;

      if (activeProjectile.current && activeProjectile.current.active) {
        const p = activeProjectile.current;
        p.trail.push({ x: p.x, y: p.y, alpha: 1 });
        if (p.trail.length > 18) p.trail.shift();

        const subSteps = 10;
        const subDt = FIXED_DT / subSteps;
        const windAccel = windRef.current * WIND_ACCEL_FACTOR;
        let impactHandled = false;

        for (let s = 0; s < subSteps; s++) {
          p.x += p.vx * subDt + 0.5 * windAccel * subDt * subDt;
          p.y += p.vy * subDt + 0.5 * GRAVITY * subDt * subDt;
          p.vx += windAccel * subDt;
          p.vy += GRAVITY * subDt;
          p.angle = (Math.atan2(p.vy, p.vx) * 180) / Math.PI;

          // Check strict Cartesian Headbox (top 25%, +/-12px) & Bodybox (bottom 75%, +/-16px) FIRST
          const targetChar = p.shooter === 'player' ? enemyState.current : playerState.current;
          const targetRole = p.shooter === 'player' ? 'enemy' : 'player';
          const col = checkArrowCollision(p, targetChar);

          if (col.hit) {
            // AI never scores a Headshot on Turns 1 or 2, and on Turn 3+ only when its 15%-20% headshot roll succeeded
            const finalIsHeadshot =
              p.shooter === 'enemy'
                ? aiMemory.current.shotsFired >= 3 &&
                  aiMemory.current.aimingForHeadThisTurn &&
                  col.isHeadshot
                : col.isHeadshot;
            projectileToDraw = { ...p, trail: [...p.trail] };
            handleProjectileImpact(true, finalIsHeadshot, targetRole, col.impactX, col.impactY);
            impactHandled = true;
            break;
          }

          // Check collision against procedural terrain & central obstacle hills
          const groundY = getGroundYAtX(p.x);
          if (p.y >= groundY || p.x > WORLD_WIDTH + 80 || p.x < -80) {
            const clampedX = Math.max(20, Math.min(p.x, WORLD_WIDTH - 20));
            projectileToDraw = { ...p, trail: [...p.trail] };
            handleProjectileImpact(false, false, 'none', clampedX, Math.min(p.y, groundY));
            impactHandled = true;
            break;
          }
        }

        if (!impactHandled && activeProjectile.current) {
          projectileToDraw = activeProjectile.current;
        }
      }

      // Update Camera Pan / Follow Target & Smooth Interpolation
      const now = Date.now();
      const cam = cameraRef.current;

      if (activeProjectile.current && activeProjectile.current.active) {
        const proj = activeProjectile.current;
        cam.targetX = Math.max(
          0,
          Math.min(WORLD_WIDTH - VIEW_WIDTH, proj.x - VIEW_WIDTH * 0.5)
        );
        cam.targetY = Math.max(-200, Math.min(0, proj.y - VIEW_HEIGHT * 0.45));
        cam.x += (cam.targetX - cam.x) * 0.22;
        cam.y += (cam.targetY - cam.y) * 0.18;
      } else if (
        impactCameraFocusRef.current.active &&
        now < impactCameraFocusRef.current.until
      ) {
        cam.targetX = Math.max(
          0,
          Math.min(
            WORLD_WIDTH - VIEW_WIDTH,
            impactCameraFocusRef.current.x - VIEW_WIDTH * 0.5
          )
        );
        cam.targetY = Math.max(
          -120,
          Math.min(0, impactCameraFocusRef.current.y - VIEW_HEIGHT * 0.65)
        );
        cam.x += (cam.targetX - cam.x) * 0.18;
        cam.y += (cam.targetY - cam.y) * 0.15;
      } else {
        if (activeCameraTurnRef.current === 'enemy') {
          cam.targetX = Math.max(
            0,
            Math.min(WORLD_WIDTH - VIEW_WIDTH, enemyState.current.x - VIEW_WIDTH * 0.68)
          );
          cam.targetY = Math.max(
            -110,
            Math.min(0, enemyState.current.y - 35 - VIEW_HEIGHT * 0.65)
          );
        } else {
          cam.targetX = Math.max(
            0,
            Math.min(WORLD_WIDTH - VIEW_WIDTH, playerState.current.x - VIEW_WIDTH * 0.32)
          );
          cam.targetY = Math.max(
            -110,
            Math.min(0, playerState.current.y - 35 - VIEW_HEIGHT * 0.65)
          );
        }
        cam.x += (cam.targetX - cam.x) * 0.1;
        cam.y += (cam.targetY - cam.y) * 0.12;
      }

      let shakeX = 0;
      let shakeY = 0;
      if (shakeIntensityRef.current > 0) {
        shakeX = (Math.random() - 0.5) * shakeIntensityRef.current;
        shakeY = (Math.random() - 0.5) * shakeIntensityRef.current;
        shakeIntensityRef.current = Math.max(0, shakeIntensityRef.current - 0.5);
      }

      ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      ctx.save();
      ctx.translate(-cam.x + shakeX, -cam.y + shakeY);

      // 1. Draw Selected Map Scenario + Procedural Hills
      drawMapScenario(ctx, currentMap.id);

      // 2. Ambient Biome Particles
      ambientParticles.current.forEach((ap) => {
        const windPush = windRef.current * (currentMap.id === 'rocky_canyon' ? 0.65 : 0.35);
        ap.x += ap.vx + windPush;
        ap.y += ap.vy;
        ap.angle += ap.spin;

        if (ap.x > WORLD_WIDTH + 10) ap.x = -10;
        if (ap.x < -10) ap.x = WORLD_WIDTH + 10;
        if (ap.y > WORLD_HEIGHT + 10) ap.y = -10;
        if (ap.y < -10) ap.y = WORLD_HEIGHT + 10;

        ctx.save();
        ctx.globalAlpha = ap.alpha;
        ctx.fillStyle = ap.color;
        ctx.translate(ap.x, ap.y);
        ctx.rotate(ap.angle);

        if (currentMap.id === 'mystic_forest') {
          ctx.beginPath();
          ctx.ellipse(0, 0, ap.size * 1.4, ap.size * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, ap.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // 3. Draw Stylized Comic/Bowmasters Characters at their dynamic procedural elevations
      drawDynamicCharacter(ctx, playerState.current, true, isAiming, aimAngle);
      drawDynamicCharacter(
        ctx,
        enemyState.current,
        false,
        isAiDrawing,
        enemyState.current.armAngle
      );

      // 3a. Hitboxes are 100% invisible on Canvas (only internal mathematical collision active)

      // 3b. Draw Revive Immunity Shield Aura around Player if recently revived
      if (now < reviveShieldUntilRef.current) {
        const shieldAlpha = Math.min(1, (reviveShieldUntilRef.current - now) / 1200);
        const pulse = 1 + Math.sin(now * 0.012) * 0.06;
        ctx.save();
        ctx.translate(playerState.current.x, playerState.current.y - 53);
        ctx.scale(pulse, pulse);
        const shieldGrad = ctx.createRadialGradient(0, 0, 12, 0, 0, 56);
        shieldGrad.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
        shieldGrad.addColorStop(0.7, `rgba(56, 189, 248, ${0.32 * shieldAlpha})`);
        shieldGrad.addColorStop(1, `rgba(250, 204, 21, ${0.65 * shieldAlpha})`);
        ctx.fillStyle = shieldGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 42, 62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.85 * shieldAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // 4. Clean Aiming Line & Parabolic Trajectory Preview (stops if preview hits a central hill)
      if (isAiming && currentTurn === 'player') {
        const playerSkinInfo = getSkinById(playerState.current.skinId);
        const arrowMeta = getArrowTypeMeta(playerSkinInfo.visual.arrowType);
        const startX = playerPos.current.x + 29;
        const startY = playerPos.current.y - 68;
        const rad = (aimAngle * Math.PI) / 180;
        const speed = 370 + (aimPower / 100) * 600;
        const windAccel = windRef.current * WIND_ACCEL_FACTOR;

        const points: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
        let testX = startX;
        let testY = startY;
        let testVx = Math.cos(rad) * speed;
        let testVy = -Math.sin(rad) * speed;
        const previewDt = FIXED_DT * 2;

        for (let step = 0; step < 34; step++) {
          testX += testVx * previewDt + 0.5 * windAccel * previewDt * previewDt;
          testY += testVy * previewDt + 0.5 * GRAVITY * previewDt * previewDt;
          testVx += windAccel * previewDt;
          testVy += GRAVITY * previewDt;
          points.push({ x: testX, y: testY });
          if (testY >= getGroundYAtX(testX)) break;
        }

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        points.forEach((pt, idx) => {
          if (idx === 0 || idx % 2 !== 0) return;
          const fade = Math.max(0.1, 1 - idx / points.length);
          ctx.globalAlpha = fade;
          ctx.fillStyle = arrowMeta.trailHex || '#fbbf24';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(2, 4.5 - idx * 0.09), 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = arrowMeta.trailHex || '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(startX, startY, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 5. Draw Active Projectile & Trail
      if (projectileToDraw) {
        const arrowMeta = getArrowTypeMeta(projectileToDraw.arrowType);
        projectileToDraw.trail.forEach((t, idx) => {
          t.alpha *= 0.86;
          ctx.save();
          ctx.globalAlpha = t.alpha * 0.75;
          ctx.fillStyle = arrowMeta.trailHex || projectileToDraw.secondaryColor;
          ctx.beginPath();
          ctx.arc(
            t.x,
            t.y,
            (projectileToDraw.radius * (idx + 1)) / projectileToDraw.trail.length,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.restore();
        });
        drawCustomProjectile(ctx, projectileToDraw);
      }

      // 6. Update and Draw Impact Particles (Sparks, Smoke Puffs, Colored Orbs, Starbursts & Shockwave Rings)
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const pt = particles.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;

        if (pt.shape === 'smoke') {
          pt.vx *= 0.94;
          pt.vy *= 0.93;
          pt.vy -= 0.03; // gentle upward thermal drift
          pt.size += 0.22;
        } else if (pt.shape === 'ring') {
          pt.size += 2.3;
        } else {
          pt.vx *= 0.985;
          pt.vy += 0.22; // gravity on sparks, stars & colored droplets
          // Bounce sparks lightly off hill terrain surface
          if (pt.shape === 'spark') {
            const gY = getGroundYAtX(pt.x);
            if (pt.y >= gY && pt.vy > 0) {
              pt.y = gY - 1;
              pt.vy = -pt.vy * 0.45;
              pt.vx *= 0.75;
            }
          }
        }

        if (pt.rotation !== undefined && pt.spin !== undefined) {
          pt.rotation += pt.spin;
        }
        pt.life++;

        const alpha = Math.max(0, 1 - pt.life / pt.maxLife);
        ctx.save();

        if (pt.shape === 'ring') {
          ctx.globalAlpha = alpha * 0.85;
          ctx.strokeStyle = pt.color;
          ctx.lineWidth = Math.max(1, 3.5 * alpha);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.stroke();
        } else if (pt.shape === 'smoke') {
          ctx.globalAlpha = alpha * 0.55;
          const smokeGrad = ctx.createRadialGradient(
            pt.x,
            pt.y,
            pt.size * 0.1,
            pt.x,
            pt.y,
            pt.size
          );
          smokeGrad.addColorStop(0, pt.color);
          smokeGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
          ctx.fillStyle = smokeGrad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (pt.shape === 'spark') {
          ctx.globalAlpha = alpha;
          const velAngle = Math.atan2(pt.vy, pt.vx);
          const streakLen = Math.max(5, Math.hypot(pt.vx, pt.vy) * 2.1);
          ctx.translate(pt.x, pt.y);
          ctx.rotate(velAngle);

          // Outer colored spark streak
          ctx.strokeStyle = pt.color;
          ctx.lineWidth = pt.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-streakLen, 0);
          ctx.lineTo(streakLen * 0.35, 0);
          ctx.stroke();

          // Bright white-hot spark core
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1, pt.size * 0.45);
          ctx.beginPath();
          ctx.moveTo(-streakLen * 0.3, 0);
          ctx.lineTo(streakLen * 0.35, 0);
          ctx.stroke();
        } else if (pt.shape === 'star') {
          ctx.globalAlpha = alpha;
          ctx.translate(pt.x, pt.y);
          ctx.rotate(pt.rotation ?? 0);
          ctx.fillStyle = pt.color;
          const rOuter = pt.size * 1.45;
          const rInner = pt.size * 0.45;
          ctx.beginPath();
          for (let s = 0; s < 8; s++) {
            const r = s % 2 === 0 ? rOuter : rInner;
            const a = (s * Math.PI) / 4;
            if (s === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          // Glowing colored particle orb ('circle' / default)
          ctx.globalAlpha = alpha;
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = alpha * 0.65;
          ctx.beginPath();
          ctx.arc(pt.x - pt.size * 0.25, pt.y - pt.size * 0.25, pt.size * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        if (pt.life >= pt.maxLife) {
          particles.current.splice(i, 1);
        }
      }

      // 7. Update and Draw Damage Popups
      for (let i = popups.current.length - 1; i >= 0; i--) {
        const pop = popups.current[i];
        pop.y -= 1.1;
        pop.opacity -= 0.018;

        ctx.save();
        ctx.textAlign = 'center';

        if (pop.damage === 0) {
          ctx.fillStyle = `rgba(226, 232, 240, ${Math.max(0, pop.opacity)})`;
          ctx.strokeStyle = `rgba(15, 23, 42, ${Math.max(0, pop.opacity)})`;
          ctx.lineWidth = 3;
          ctx.font = 'bold 19px "Outfit", sans-serif';
          ctx.strokeText('¡COLINA!', pop.x, pop.y);
          ctx.fillText('¡COLINA!', pop.x, pop.y);
        } else if (pop.isHeadshot) {
          ctx.fillStyle = `rgba(245, 158, 11, ${Math.max(0, pop.opacity)})`;
          ctx.strokeStyle = `rgba(0, 0, 0, ${Math.max(0, pop.opacity)})`;
          ctx.lineWidth = 4;
          ctx.font = '900 24px "Outfit", sans-serif';
          ctx.strokeText(`¡HEADSHOT! -50 HP`, pop.x, pop.y);
          ctx.fillText(`¡HEADSHOT! -50 HP`, pop.x, pop.y);
        } else {
          ctx.fillStyle = `rgba(239, 68, 68, ${Math.max(0, pop.opacity)})`;
          ctx.strokeStyle = `rgba(0, 0, 0, ${Math.max(0, pop.opacity)})`;
          ctx.lineWidth = 3;
          ctx.font = '800 20px "Outfit", sans-serif';
          ctx.strokeText(`¡IMPACTO AL CUERPO! -25 HP`, pop.x, pop.y);
          ctx.fillText(`¡IMPACTO AL CUERPO! -25 HP`, pop.x, pop.y);
        }
        ctx.restore();

        if (pop.opacity <= 0) {
          popups.current.splice(i, 1);
        }
      }

      ctx.restore();

      // Draw 1600px world radar minimap with procedural hills profile
      drawWorldMinimapHud(ctx);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    aimAngle,
    aimPower,
    isAiming,
    isAiDrawing,
    currentTurn,
    currentMap,
    getGroundYAtX,
    handleProjectileImpact,
  ]);

  // Render projectile according to its distinct arrowType
  const drawCustomProjectile = (ctx: CanvasRenderingContext2D, p: Projectile) => {
    const arrowMeta = getArrowTypeMeta(p.arrowType);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.angle * Math.PI) / 180);

    switch (p.arrowType) {
      case 'laser_red':
      case 'plasma_bolt':
      case 'emp_shock':
      case 'kinetic_core': {
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(0.45, arrowMeta.trailHex);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-14, -4, 28, 8, 4);
        ctx.fill();
        break;
      }
      case 'fire_arrow':
      case 'inferno_beam':
      case 'phoenix_burst':
      case 'solar_flare': {
        const fireGrad = ctx.createRadialGradient(4, 0, 2, 0, 0, 18);
        fireGrad.addColorStop(0, '#fef08a');
        fireGrad.addColorStop(0.5, arrowMeta.trailHex);
        fireGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = p.bowColor || '#18181b';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(12, 0);
        ctx.stroke();

        ctx.fillStyle = arrowMeta.trailHex;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(8, -6);
        ctx.lineTo(10, 0);
        ctx.lineTo(8, 6);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'frost_light':
      case 'absolute_zero':
      case 'crystal_light':
      case 'wind_slice': {
        ctx.strokeStyle = arrowMeta.trailHex;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(14, 0);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(6, -6);
        ctx.lineTo(8, 0);
        ctx.lineTo(6, 6);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'divine_ray':
      case 'golden_feather': {
        const lightGlow = ctx.createRadialGradient(0, 0, 3, 0, 0, 20);
        lightGlow.addColorStop(0, '#ffffff');
        lightGlow.addColorStop(0.5, '#fef08a');
        lightGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = lightGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(16, 0);
        ctx.stroke();
        break;
      }
      case 'void_laser':
      case 'soul_drain':
      case 'shadow_trail':
      case 'temporal_warp': {
        const voidGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 17);
        voidGlow.addColorStop(0, '#ffffff');
        voidGlow.addColorStop(0.45, arrowMeta.trailHex);
        voidGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = voidGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.primaryColor;
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = arrowMeta.trailHex;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }
      default: {
        ctx.strokeStyle = p.bowColor || '#78350f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(12, 0);
        ctx.stroke();

        ctx.fillStyle = p.secondaryColor || '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(8, -5);
        ctx.lineTo(10, 0);
        ctx.lineTo(8, 5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = arrowMeta.trailHex || p.primaryColor;
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(-12, -5);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-12, 5);
        ctx.closePath();
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  };

  // Stylized Comic / Bowmasters Character Renderer
  const drawDynamicCharacter = (
    ctx: CanvasRenderingContext2D,
    char: CharacterState,
    isPlayer: boolean,
    isDrawingBow: boolean,
    armAngleDeg: number
  ) => {
    const skin = getSkinById(char.skinId);
    const { primaryColor, secondaryColor, bowColor, arrowType } = skin.visual;
    const arrowMeta = getArrowTypeMeta(arrowType);
    const hatStyle = getSkinHatStyle(skin.id);

    ctx.save();
    ctx.translate(char.x, char.y);

    const hitElapsed = Date.now() - char.hitTime;
    const isHitActive = char.isHit && hitElapsed < 520;
    if (isHitActive) {
      const progress = 1 - hitElapsed / 520;
      const knockback = (isPlayer ? -10 : 10) * progress;
      const shake = (Math.random() - 0.5) * 8 * progress;
      ctx.translate(knockback + shake, 0);
      ctx.rotate((isPlayer ? -0.18 : 0.18) * progress);
    }

    if (!isPlayer) {
      ctx.scale(-1, 1);
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 26, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Flowing Comic Cape
    ctx.fillStyle = secondaryColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-11, -77);
    ctx.quadraticCurveTo(-29, -48, -26, -15);
    ctx.lineTo(-14, -20);
    ctx.quadraticCurveTo(-15, -48, -6, -74);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Angled Quiver on back
    ctx.save();
    ctx.translate(-13, -67);
    ctx.rotate(-0.3);
    ctx.fillStyle = bowColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-5, -16, 10, 32, 3);
    ctx.fill();
    ctx.stroke();
    for (let a = -2.5; a <= 2.5; a += 2.5) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(a, -16);
      ctx.lineTo(a - 1, -25);
      ctx.stroke();
      ctx.fillStyle = arrowMeta.trailHex;
      ctx.beginPath();
      ctx.arc(a - 1, -25, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4. Articulated Archer Legs
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-7, -38);
    ctx.lineTo(-13, -20);
    ctx.lineTo(-15, -3);
    ctx.stroke();

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6.2;
    ctx.beginPath();
    ctx.moveTo(-7, -38);
    ctx.lineTo(-13, -20);
    ctx.lineTo(-15, -3);
    ctx.stroke();

    ctx.fillStyle = secondaryColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(-13, -20, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(-20, -8, 13, 10, 3);
    ctx.fill();
    ctx.stroke();

    // Front Leg
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 10.5;
    ctx.beginPath();
    ctx.moveTo(7, -38);
    ctx.lineTo(14, -20);
    ctx.lineTo(11, -3);
    ctx.stroke();

    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(7, -38);
    ctx.lineTo(14, -20);
    ctx.lineTo(11, -3);
    ctx.stroke();

    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.arc(14, -20, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(6, -8, 14, 10, 3);
    ctx.fill();
    ctx.stroke();

    // 5. Pelvis / Hip & Defined V-Torso
    ctx.fillStyle = secondaryColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -39);
    ctx.lineTo(12, -39);
    ctx.lineTo(15, -30);
    ctx.lineTo(-15, -30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHitActive ? '#ef4444' : primaryColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-17, -78);
    ctx.lineTo(17, -78);
    ctx.lineTo(12, -38);
    ctx.lineTo(-12, -38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-11, -63);
    ctx.quadraticCurveTo(0, -59, 11, -63);
    ctx.stroke();

    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-13, -76);
    ctx.lineTo(10, -41);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-13, -43, 26, 6);
    ctx.fillStyle = secondaryColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-4.5, -44, 9, 8, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = arrowMeta.trailHex;
    ctx.beginPath();
    ctx.arc(0, -61, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.ellipse(-15, -75, 7, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 6. Proportioned Comic Head & Expressive Face
    ctx.fillStyle = '#e6b89c';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.8;
    ctx.fillRect(-4.5, -85, 9, 8);
    ctx.strokeRect(-4.5, -85, 9, 8);

    ctx.fillStyle = isHitActive ? '#fca5a5' : skin.id === 'ley_04' ? '#1e293b' : '#fed7aa';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.arc(1, -96, 13.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (isHitActive) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(4, -99);
      ctx.lineTo(9, -94);
      ctx.moveTo(9, -99);
      ctx.lineTo(4, -94);
      ctx.stroke();
    } else if (skin.id === 'ley_04') {
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.arc(6.5, -96, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(6.5, -96, 3.4, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(7.3, -96, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(2.5, -100.5);
      ctx.lineTo(10, -98.5);
      ctx.stroke();
    }

    // Headwear
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f172a';
    switch (hatStyle) {
      case 'helmet': {
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(1, -98, 15, Math.PI * 0.95, Math.PI * 2.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = secondaryColor;
        ctx.fillRect(-13.5, -100, 29, 4.5);
        ctx.strokeRect(-13.5, -100, 29, 4.5);

        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.moveTo(-8, -112);
        ctx.quadraticCurveTo(0, -121, 11, -110);
        ctx.lineTo(1, -110);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'crown': {
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.moveTo(-11, -105);
        ctx.lineTo(-9, -116);
        ctx.lineTo(-3, -108);
        ctx.lineTo(1, -119);
        ctx.lineTo(5, -108);
        ctx.lineTo(11, -116);
        ctx.lineTo(12, -105);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'halo': {
        ctx.fillStyle = secondaryColor;
        ctx.fillRect(-11, -99, 24, 5);
        ctx.strokeRect(-11, -99, 24, 5);

        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(1, -117, 14, 4.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'horns': {
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(1, -99, 14.5, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.moveTo(-6, -108);
        ctx.quadraticCurveTo(-20, -120, -16, -104);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(6, -108);
        ctx.quadraticCurveTo(20, -120, 16, -104);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'wings': {
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.moveTo(-4, -106);
        ctx.quadraticCurveTo(-20, -118, -17, -100);
        ctx.lineTo(-4, -101);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'visor': {
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(1, -98, 14.5, Math.PI * 0.85, Math.PI * 2.1);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.roundRect(-2, -100, 15.5, 6.5, 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'ninja': {
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(1, -98, 14.5, Math.PI * 0.85, Math.PI * 2.05);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.roundRect(-10, -94, 22, 10, 3);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'taiga': {
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(0, -97, 15, Math.PI * 0.65, Math.PI * 2.1);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(2, -97, 14, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
        break;
      }
      case 'punk': {
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.moveTo(-8, -107);
        ctx.lineTo(-4, -120);
        ctx.lineTo(6, -118);
        ctx.lineTo(8, -106);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'none': {
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.arc(0, -99, 14, Math.PI * 0.9, Math.PI * 2.05);
        ctx.fill();
        ctx.stroke();
        break;
      }
      default: {
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.moveTo(-14, -94);
        ctx.quadraticCurveTo(-16, -112, 2, -111);
        ctx.quadraticCurveTo(13, -110, 14, -100);
        ctx.quadraticCurveTo(2, -104, -10, -88);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.moveTo(-6, -108);
        ctx.quadraticCurveTo(-18, -120, -14, -104);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
    }

    // 7. Articulated Dual Arms & Extended Bow
    ctx.save();
    ctx.translate(5, -68);
    const displayAngle = isPlayer ? armAngleDeg : 180 - armAngleDeg;
    const angleRad = (displayAngle * Math.PI) / 180;
    ctx.rotate(-angleRad);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(14, 0.5);
    ctx.lineTo(28, 0);
    ctx.stroke();

    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 5.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(14, 0.5);
    ctx.lineTo(23, 0);
    ctx.stroke();

    ctx.fillStyle = secondaryColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(15, -4.2, 10, 8.4, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(28, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sculpted Recurve Bow
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(21, -33);
    ctx.quadraticCurveTo(38, -17, 29, 0);
    ctx.quadraticCurveTo(38, 17, 21, 33);
    ctx.stroke();

    ctx.strokeStyle = bowColor;
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(21, -33);
    ctx.quadraticCurveTo(38, -17, 29, 0);
    ctx.quadraticCurveTo(38, 17, 21, 33);
    ctx.stroke();

    ctx.fillStyle = secondaryColor;
    ctx.fillRect(26.5, -5.5, 5.5, 11);
    ctx.beginPath();
    ctx.arc(21, -33, 3.2, 0, Math.PI * 2);
    ctx.arc(21, 33, 3.2, 0, Math.PI * 2);
    ctx.fill();

    const stringPullX = isDrawingBow ? -6 : 20;
    ctx.strokeStyle = arrowMeta.trailHex || '#e2e8f0';
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(21, -33);
    ctx.lineTo(stringPullX, 0);
    ctx.lineTo(21, 33);
    ctx.stroke();

    const arrowTailX = isDrawingBow ? -6 : 15;
    const arrowTipX = arrowTailX + 29;
    ctx.strokeStyle = bowColor;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(arrowTailX, 0);
    ctx.lineTo(arrowTipX, 0);
    ctx.stroke();

    ctx.fillStyle = arrowMeta.trailHex;
    ctx.beginPath();
    ctx.moveTo(arrowTipX + 5.5, 0);
    ctx.lineTo(arrowTipX - 2, -4.2);
    ctx.lineTo(arrowTipX - 2, 4.2);
    ctx.closePath();
    ctx.fill();

    const elbowX = isDrawingBow ? -18 : 7;
    const elbowY = isDrawingBow ? -8 : 10;
    const handX = isDrawingBow ? -6 : 18;
    const handY = isDrawingBow ? 0 : 4;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(-4, -1);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 5.2;
    ctx.beginPath();
    ctx.moveTo(-4, -1);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    ctx.fillStyle = '#fed7aa';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(handX, handY, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.ellipse(0, -2, 6, 4.2, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    if (isHitActive) {
      const hitCenterY = char.hitType === 'head' ? -96 : -54;
      ctx.save();
      ctx.translate(0, hitCenterY);
      ctx.strokeStyle = char.hitType === 'head' ? '#fbbf24' : '#ef4444';
      ctx.lineWidth = 2.5;
      for (let r = 0; r < 8; r++) {
        const rayAngle = (r * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(rayAngle) * 10, Math.sin(rayAngle) * 10);
        ctx.lineTo(Math.cos(rayAngle) * 24, Math.sin(rayAngle) * 24);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  };

  const currentSkinInfo = getSkinById(playerState.current.skinId);
  const rivalSkinInfo = getSkinById(enemyState.current.skinId);
  const canAffordRevive = currentCoins >= REVIVE_COST_COINS;

  return (
    <div className="relative w-full h-full flex flex-col justify-between select-none overflow-hidden bg-slate-950">
      {/* 1. Compact Fixed Top Combat HUD */}
      <div className="w-full shrink-0 z-20 flex flex-col gap-1 px-2.5 pt-1.5 pb-1 bg-slate-950/95 border-b border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          {/* Player Health Bar */}
          <div
            className={`flex-1 min-w-0 transition-transform duration-150 ${
              playerBarHitFlash ? 'scale-105' : ''
            }`}
          >
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold mb-0.5">
              <span className="text-emerald-400 flex items-center gap-1 truncate">
                {getSkinIcon(currentSkinInfo.id)} {currentSkinInfo.name}
              </span>
              <span
                className={`font-mono tabular-nums shrink-0 transition-colors ${
                  playerBarHitFlash ? 'text-red-400 font-black' : 'text-slate-300'
                }`}
              >
                {playerHealth} HP
              </span>
            </div>
            <div
              className={`w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border transition-colors ${
                playerBarHitFlash ? 'border-red-500 bg-red-950/60' : 'border-slate-700'
              }`}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  playerBarHitFlash
                    ? 'bg-red-400'
                    : playerHealth > 50
                    ? 'bg-emerald-500'
                    : playerHealth > 25
                    ? 'bg-amber-500'
                    : 'bg-red-500 animate-pulse'
                }`}
                style={{ width: `${playerHealth}%` }}
              />
            </div>
          </div>

          {/* Center Turn & 10s Timer Indicator */}
          <div className="flex flex-col items-center shrink-0">
            <div
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                currentTurn === 'player'
                  ? turnTimeLeft <= 3
                    ? 'bg-red-500/25 text-red-300 border-red-500 animate-pulse'
                    : 'bg-slate-800 text-amber-400 border-amber-500/30'
                  : 'bg-slate-800 text-sky-400 border-sky-500/30'
              }`}
            >
              {currentTurn === 'player' ? (
                <>
                  <span>⏱️ {turnTimeLeft}s</span>
                  <span>·</span>
                  <span>Tu Turno</span>
                </>
              ) : (
                <span>🎥 Cámara IA</span>
              )}
            </div>
          </div>

          {/* Enemy Health Bar */}
          <div
            className={`flex-1 min-w-0 text-right transition-transform duration-150 ${
              enemyBarHitFlash ? 'scale-105' : ''
            }`}
          >
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold mb-0.5">
              <span
                className={`font-mono tabular-nums shrink-0 transition-colors ${
                  enemyBarHitFlash ? 'text-amber-300 font-black' : 'text-slate-300'
                }`}
              >
                {enemyHp} HP
              </span>
              <span className="text-red-400 flex items-center gap-1 truncate">
                {getSkinIcon(rivalSkinInfo.id)} {rivalSkinInfo.name}
              </span>
            </div>
            <div
              className={`w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border flex justify-end transition-colors ${
                enemyBarHitFlash ? 'border-amber-400 bg-amber-950/60' : 'border-slate-700'
              }`}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  enemyBarHitFlash
                    ? 'bg-amber-300'
                    : enemyHp > 50
                    ? 'bg-red-500'
                    : enemyHp > 25
                    ? 'bg-amber-500'
                    : 'bg-red-700 animate-pulse'
                }`}
                style={{ width: `${enemyHp}%` }}
              />
            </div>
          </div>
        </div>

        {/* Second Compact Row: Mode/Level/Streak + Wind + Exit */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-semibold flex items-center gap-1 truncate">
            {gameMode === 'CAMPAIGN' && (
              <span className="text-amber-400 font-black">🏰 Nv.{campaignLevel} ·</span>
            )}
            {gameMode === 'ENDLESS' && (
              <span className="text-purple-300 font-black">
                ♾️ Bajas: {endlessStreak} (Récord: {bestEndlessStreak}) ·
              </span>
            )}
            <span>{currentMap.icon}</span>
            <span className="truncate">{currentMap.name}</span>
          </div>

          <div className="px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700/80 text-[10px] font-bold flex items-center gap-1 shadow shrink-0">
            <span className="text-cyan-400">💨 Viento:</span>
            <span className="font-mono tabular-nums text-white">
              {wind > 0 ? `+${wind}` : wind} m/s
            </span>
            <span className="text-amber-400 font-black">
              {Math.abs(wind) < 0.2 ? '• Calma' : wind > 0 ? '➡️' : '⬅️'}
            </span>
          </div>

          <button
            onClick={() => {
              sound.stopFlechaVolando();
              onExitMatch();
            }}
            className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-red-950/80 text-slate-300 hover:text-red-200 border border-slate-700 text-[10px] font-bold active:scale-95 transition-all cursor-pointer shrink-0"
            title="Abandonar duelo"
          >
            ✕ Salir
          </button>
        </div>
      </div>

      {/* 2. Adaptive Middle Canvas Container with Dynamic Camera Follow */}
      <div className="relative flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden bg-slate-950">
        {/* CombatLog Overlay */}
        <CombatLog entries={combatLogs} />

        {/* Floating Dynamic Aim Telemetry & Round Banner */}
        <div className="absolute top-8 left-0 right-0 z-10 flex flex-col items-center pointer-events-none px-3">
          <div className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[11px] text-slate-200 font-medium border border-white/10 shadow-lg">
            {roundBanner}
          </div>

          {isAiming && currentTurn === 'player' && (
            <div className="mt-1.5 flex items-center gap-3 px-3 py-1 rounded-xl bg-slate-900/95 text-white border border-amber-500/40 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <span className="text-amber-400">ÁNGULO:</span>
                <span className="font-mono text-xs tabular-nums">{aimAngle}°</span>
              </div>
              <div className="h-3 w-px bg-slate-700" />
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <span className="text-cyan-400">FUERZA:</span>
                <span className="font-mono text-xs tabular-nums">{aimPower}%</span>
              </div>
            </div>
          )}
        </div>

        <canvas
          ref={canvasRef}
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full object-contain touch-none cursor-crosshair"
          style={{ imageRendering: 'auto' }}
        />

        {/* ==================================================================== */}
        {/* SECOND CHANCE / REVIVE MODAL (5-Second Countdown + Ad / 200 Coins)   */}
        {/* ==================================================================== */}
        {showReviveModal && (
          <div className="absolute inset-0 z-40 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            {isWatchingReviveAd ? (
              /* Simulated 2.5s Rewarded Ad Overlay */
              <div className="w-full max-w-xs bg-slate-900 border-2 border-amber-400 rounded-3xl p-5 text-center shadow-2xl flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-3xl animate-pulse">
                  🎬
                </div>
                <h3 className="text-lg font-black text-white font-['Outfit'] uppercase">
                  Reproduciendo Anuncio...
                </h3>
                <p className="text-xs text-slate-300">
                  Restaurando <strong className="text-emerald-400">50 HP</strong> y activando escudo de inmunidad en{' '}
                  <strong className="text-amber-400 font-mono">{reviveAdTimeLeft}s</strong>
                </p>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
                    style={{ width: `${((3 - reviveAdTimeLeft) / 3) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              /* Main 5-Second "¿Deseas revivir?" Prompt */
              <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 text-center shadow-2xl flex flex-col items-center">
                {/* 5-second countdown ring */}
                <div className="relative w-16 h-16 rounded-full bg-amber-500/15 border-2 border-amber-400 flex flex-col items-center justify-center mb-2 shadow-lg shadow-amber-500/20">
                  <span className="font-mono text-2xl font-black text-amber-300 tabular-nums leading-none">
                    {reviveTimeLeft}s
                  </span>
                  <span className="text-[9px] font-bold uppercase text-amber-400/90">Tiempo</span>
                </div>

                <h2 className="text-2xl font-black text-white font-['Outfit'] uppercase tracking-wide">
                  ¿Deseas Revivir?
                </h2>
                <p className="text-xs text-slate-300 mt-0.5 mb-3">
                  Recupera <strong className="text-emerald-400">50 HP</strong>, obtén el turno con escudo y conserva tu{' '}
                  {gameMode === 'CAMPAIGN'
                    ? `progreso en el Nivel ${campaignLevel}`
                    : gameMode === 'ENDLESS'
                    ? `racha de ${endlessStreak} baja(s)`
                    : 'duelo actual'}
                  .
                </p>

                <div className="w-full flex flex-col gap-2">
                  {/* Option A: Revive with Simulated Ad */}
                  <button
                    onClick={handleReviveWithAd}
                    disabled={!isOnline}
                    className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                      isOnline
                        ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 active:scale-95 shadow-lg shadow-emerald-500/25 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <span>🎬</span>
                    <span>{isOnline ? 'Revivir con Anuncio (Gratis)' : 'Anuncio No Disponible (Offline)'}</span>
                  </button>

                  {/* Option B: Pay 200 Coins */}
                  <button
                    onClick={handleReviveWithCoins}
                    disabled={!canAffordRevive}
                    className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between transition-all border ${
                      canAffordRevive
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer'
                        : 'bg-red-950/60 text-red-300 border-red-500/50 cursor-not-allowed opacity-85'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>🪙</span>
                      <span>Pagar {REVIVE_COST_COINS} Monedas</span>
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-black/20">
                      {canAffordRevive
                        ? `Saldo: ${currentCoins} 🪙`
                        : `Faltan ${REVIVE_COST_COINS - currentCoins} 🪙`}
                    </span>
                  </button>

                  {/* Option C: Surrender */}
                  <button
                    onClick={() => {
                      sound.playClick();
                      triggerFinalDefeat();
                    }}
                    className="w-full py-2 px-4 mt-1 rounded-xl font-bold text-xs text-slate-400 hover:text-white bg-slate-950/80 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                  >
                    🏳️ Rendirse
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Compact Fixed Bottom Info Bar */}
      <div className="w-full shrink-0 z-10 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-300 bg-slate-950/95 px-3 py-1.5 border-t border-slate-800/80 gap-2">
        <span className="truncate">
          ⛰️ <strong className="text-amber-300">{terrain.centralHills.length} Colina(s)</strong> ·{' '}
          {hasUsedRevive ? 'Revivir usado' : '1 Revivir disp.'}
        </span>

        <span className="text-amber-400 font-bold shrink-0">
          Cabeza: -50 · Cuerpo: -25
        </span>
      </div>
    </div>
  );
};

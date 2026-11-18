export type GameScreen = 'TITLE_MENU' | 'PLAYING' | 'DEATH_CAM' | 'RESULTS' | 'REPORT';

export type TitleTab =
  | 'play'
  | 'locker'
  | 'shop'
  | 'stats'
  | 'settings'
  | 'controls'
  | 'changelog'
  | 'account';

export type LockerCategory = 'skin' | 'pickaxe' | 'backbling' | 'glider' | 'music';

export type RarityTier = 0 | 1 | 2 | 3 | 4 | 5; // 0 Common .. 5 Mythic

export interface CosmeticItem {
  id: string;
  category: LockerCategory;
  name: string;
  rarity: number; // 0..3
  price: number;
  color: string;
  secondary?: string;
  description: string;
  image?: string;
}

export type AmmoType = 'light' | 'shells' | 'medium' | 'heavy';

export interface WeaponDef {
  id: number;
  name: string;
  damage: number;
  fireRate: number;
  bulletSpeed: number;
  spread: number;
  pellets: number;
  range: number;
  color: string;
  melee?: boolean;
  sniper?: boolean;
  mag?: number;
  reloadTime?: number;
  ammoType?: AmmoType;
  throwable?: boolean;
  usable?: boolean;
  useTime?: number;
}

export interface Player {
  id: number;
  x: number;
  y: number;
  a: number;
  hp: number;
  sh: number;
  w: number;
  cd: number;
  bot: boolean;
  name: string;
  col: string; // glider color
  skinId: string;
  pickaxeId: string;
  backblingId: string;
  k: number;
  alive: boolean;
  tx: number;
  ty: number;
  tt: number;
  vx: number;
  vy: number;
  st: number;
  gn: number;
  pc: number;
  hd: number;
  fl: string; // solid 1-color flesh
  inv: number[];
  invRarity: RarityTier[];
  sl: number;
  c: Record<number, number>;
  am: Record<number, number>;
  ra?: Record<AmmoType, number>;
  rl: number;
  rt: number;
  rw: number;
  hl?: number;
  ht?: number;
  hw?: number;
  sk: number;
  hitFlash: number;
  recoil: number;
  dm: number;
  pts: number;
  pt2: number;
  rank: number;
  td: number;
  by: Player | null;
  fin: boolean;
  inPlane: boolean;
  dropTime: number;
  dropMax: number;
  planeJumpAt: number;
  emote: string | null;
  emoteTimer: number;
  // AI & movement helpers
  mx?: number;
  my?: number;
  px?: number;
  py?: number;
  pvx?: number;
  pvy?: number;
  sx?: number;
  sy?: number;
  sck?: number;
  lt?: Player | null;
  zs?: number;
  st2?: number;
  ss?: number;
  lb?: LootItem | null;
  lbt?: number;
  targetChest?: Chest | null;
  kvx?: number;
  kvy?: number;
  m8?: number;
  m4?: number;
  m2?: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  l: number;
  o: Player;
  d: number;
  c: string;
  px: number;
  py: number;
}

export interface LootItem {
  id: number;
  x: number;
  y: number;
  t: 'w' | 'h' | 's' | 'a';
  w: number;
  r: RarityTier;
  n?: number;
  air?: number;
  ammoType?: AmmoType;
  mag?: number;
}

export interface Obstacle {
  x: number;
  y: number;
  r: number;
  kind: 'tree' | 'rock' | 'crate' | 'barrel';
  hp: number;
  mh: number;
  hitFlash: number;
}

export interface Chest {
  id: number;
  x: number;
  y: number;
  opened: boolean;
  golden: boolean;
}

export interface POI {
  name: string;
  x: number;
  y: number;
}

export interface RoadSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
}

export interface BuildingFloor {
  x: number;
  y: number;
  w: number;
  h: number;
  roofColor: string;
  roofAlpha: number;
  poiName?: string;
}

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BuildingDoor {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  horizontal: boolean;
  open: boolean;
  openDir?: 1 | -1;
  openProgress?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  l: number;
  ml: number;
  c: string;
  size: number;
  t?: string;
}

export interface Shockwave {
  x: number;
  y: number;
  r: number;
  mr: number;
  l: number;
  ml: number;
  c: string;
}

export interface Grenade {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z?: number;
  vz?: number;
  l: number;
  ml: number;
  o: Player;
  kind?: 'frag' | 'impulse' | 'reverse';
}

export interface DropPlane {
  active: boolean;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  x: number;
  y: number;
  a: number;
  progress: number;
}

export interface StormState {
  x: number;
  y: number;
  r: number;
  i: number;
  t: number;
  set: boolean;
  fx: number;
  fy: number;
  fr: number;
  tx: number;
  ty: number;
}

export interface FeedItem {
  id: number;
  text: string;
  t: number;
  accent?: string;
}

export interface UserStats {
  g: number;
  w: number;
  k: number;
  d: number;
  b: number;
  dm: number;
}

export interface UserProfile {
  tagId: string;
  coins: number;
  xp: number;
  hype: number;
  eq: number;
  sk: number[];
  ownedCosmetics: string[];
  equipped: {
    skin: string;
    pickaxe: string;
    backbling: string;
    glider: string;
    music: string;
  };
  s: UserStats;
}

export interface GameSettings {
  shake: number;
  num: number;
  part: number;
  snd: number;
  vol: number;
  lobbyMusic: number;
}

export interface Keybinds {
  up: string;
  down: string;
  left: string;
  right: string;
  sprint: string;
  pick: string;
  reload: string;
  map: string;
  emote: string;
  s1: string;
  s2: string;
  s3: string;
  s4: string;
  s5: string;
  s6: string;
}

export interface ReportRecord {
  who: string;
  why: string;
  at: number;
}

export interface GameDB {
  users: Record<string, { h: string; u: UserProfile }>;
  cur: string | null;
  mode: number;
  set: GameSettings;
  kb: Keybinds;
  rep: ReportRecord[];
}

export interface LevelInfo {
  l: number;
  x: number;
  n: number;
}

export interface RankInfo {
  i: number;
  n: string;
  c: string;
  p: number;
}

export interface ArenaResult {
  pt: number;
  h0: number;
  h1: number;
  r0: RankInfo;
  r1: RankInfo;
}

export interface MatchResult {
  title: 'VICTORY' | 'ELIMINATED';
  pl: number;
  dm: number;
  sv: number;
  xp: number;
  co: number;
  b4: LevelInfo;
  af: LevelInfo;
  killer: string | null;
  killerWeapon?: string | null;
  k: number;
  ar: ArenaResult | null;
  winnerName?: string;
}

export interface DeathCamState {
  playing: boolean;
  time: number;
  duration: number;
  killerName: string | null;
  killerWeapon: string | null;
  victimName: string;
}

export interface HudSnapshot {
  aliveCount: number;
  kills: number;
  points: number;
  isArena: boolean;
  hp: number;
  sh: number;
  st: number;
  inv: number[];
  invRarity: RarityTier[];
  selectedSlot: number;
  heldWeapon: number;
  heldRarity: RarityTier;
  ammo: Record<number, number>;
  reserveAmmo: Record<AmmoType, number>;
  counts: Record<number, number>;
  grenades: number;
  reloadProgress: number;
  healProgress: number;
  healRemaining: number;
  healWeaponId: number;
  inPlane: boolean;
  parachuting: boolean;
  stormPhase: number;
  stormTimer: number;
  stormShrinking: boolean;
  stormFinal: boolean;
  inStorm: boolean;
  nearbyAction: {
    label: string;
    weaponId?: number;
    rarity?: RarityTier;
    isChest?: boolean;
    isDoor?: boolean;
  } | null;
  feed: { id: number; text: string; alpha: number; accent?: string }[];
  spectatingName: string | null;
  eliminatedBy: string | null;
  playerAlive: boolean;
  onlineStatus?: {
    connected: boolean;
    phase: 'COUNTDOWN' | 'PLANE' | 'ACTIVE';
    countdown: number;
    humanCount: number;
  } | null;
  minimap: {
    x: number;
    y: number;
    stormX: number;
    stormY: number;
    stormR: number;
    nextStormX: number;
    nextStormY: number;
    nextStormR: number;
    hasNextStorm: boolean;
    buildings: BuildingFloor[];
    roads: RoadSegment[];
    pois: POI[];
    airdrops: { x: number; y: number }[];
    plane: { active: boolean; x: number; y: number; sx: number; sy: number; ex: number; ey: number };
  };
}

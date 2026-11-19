import type { AmmoType, CosmeticItem, Keybinds, POI, RarityTier, WeaponDef } from './types';

export const MAP_SIZE = 7200;
export const MAP_CENTER = 3600;
export const ISLAND_MARGIN = 300;
export const PLAYER_RADIUS = 15;
export const TOTAL_PLAYERS = 100;
export const SPAWN_COUNTDOWN_SEC = 30;
export const SPAWN_SKIP_TO_SEC = 3;
export const SPAWN_ISLAND = {
  cx: -1650,
  cy: 3600,
  w: 1800,
  h: 1600,
  x: -2550,
  y: 2800,
};
export const VER = '1.13.0';
export const SEASON_1_LAUNCH_AT = Date.UTC(2027, 0, 1, 0, 0, 0); // Jan 1, 2027 UTC
export const NAME_CHANGE_GEM_COST = 1000;

export interface GemPack {
  id: string;
  name: string;
  gems: number;
  bonus?: string;
  priceLabel: string;
  accent: string;
}

export const GEM_PACKS: GemPack[] = [
  { id: 'gem_500', name: 'Starter Pouch', gems: 500, priceLabel: '$0.99', accent: '#38bdf8' },
  { id: 'gem_1200', name: 'Storm Bundle', gems: 1200, bonus: '+20% Bonus', priceLabel: '$1.99', accent: '#818cf8' },
  { id: 'gem_3000', name: 'Champion Chest', gems: 3000, bonus: '+50% Bonus', priceLabel: '$4.99', accent: '#c084fc' },
  { id: 'gem_7500', name: 'Mythic Vault', gems: 7500, bonus: 'Best Value', priceLabel: '$9.99', accent: '#fbbf24' },
];

export const AMMO_INFO: Record<
  AmmoType,
  { name: string; short: string; color: string; max: number; packAmount: number; starterBonus: number }
> = {
  light: { name: 'Light Ammo', short: 'LGT', color: '#facc15', max: 240, packAmount: 24, starterBonus: 24 },
  shells: { name: 'Shells', short: 'SHL', color: '#fb923c', max: 60, packAmount: 8, starterBonus: 8 },
  medium: { name: 'Medium Ammo', short: 'MED', color: '#60a5fa', max: 210, packAmount: 24, starterBonus: 24 },
  heavy: { name: 'Heavy Ammo', short: 'HVY', color: '#c084fc', max: 48, packAmount: 6, starterBonus: 6 },
};

export const AMMO_TYPES: AmmoType[] = ['light', 'shells', 'medium', 'heavy'];

export const RARITY_TIERS: Record<
  RarityTier,
  { name: string; color: string; bg: string; dmgMult: number }
> = {
  0: { name: 'Common', color: '#9ca3af', bg: 'rgba(156,163,175,0.22)', dmgMult: 1.0 },
  1: { name: 'Uncommon', color: '#4ade80', bg: 'rgba(74,222,128,0.24)', dmgMult: 1.12 },
  2: { name: 'Rare', color: '#60a5fa', bg: 'rgba(96,165,250,0.26)', dmgMult: 1.24 },
  3: { name: 'Epic', color: '#c084fc', bg: 'rgba(192,132,252,0.28)', dmgMult: 1.38 },
  4: { name: 'Legendary', color: '#fbbf24', bg: 'rgba(251,191,36,0.30)', dmgMult: 1.54 },
  5: { name: 'Mythic', color: '#fb7185', bg: 'rgba(251,113,133,0.34)', dmgMult: 1.72 },
};

export const WP: WeaponDef[] = [
  { id: 0, name: 'Fists', damage: 14, fireRate: 0.32, bulletSpeed: 0, spread: 0, pellets: 0, range: 36, color: '#e0b890', melee: true },
  { id: 1, name: 'Pistol', damage: 14, fireRate: 0.34, bulletSpeed: 820, spread: 0.035, pellets: 1, range: 520, color: '#d0d0d0', mag: 12, reloadTime: 1.1, ammoType: 'light' },
  { id: 2, name: 'SMG', damage: 8.5, fireRate: 0.085, bulletSpeed: 880, spread: 0.11, pellets: 1, range: 440, color: '#4dd0ff', mag: 30, reloadTime: 1.5, ammoType: 'light' },
  { id: 3, name: 'Shotgun', damage: 9.5, fireRate: 0.78, bulletSpeed: 760, spread: 0.24, pellets: 6, range: 310, color: '#ffb340', mag: 6, reloadTime: 2.0, ammoType: 'shells' },
  { id: 4, name: 'AR', damage: 21, fireRate: 0.32, bulletSpeed: 1120, spread: 0.025, pellets: 1, range: 840, color: '#c77dff', mag: 24, reloadTime: 1.9, ammoType: 'medium' },
  { id: 5, name: 'Bolt Sniper', damage: 64, fireRate: 1.15, bulletSpeed: 1850, spread: 0, pellets: 1, range: 1450, color: '#fbbf24', sniper: true, mag: 5, reloadTime: 2.3, ammoType: 'heavy' },
  { id: 6, name: 'Grenade', damage: 0, fireRate: 0.55, bulletSpeed: 0, spread: 0, pellets: 0, range: 0, color: '#7bd66f', throwable: true },
  { id: 7, name: 'Medkit', damage: 0, fireRate: 0.4, bulletSpeed: 0, spread: 0, pellets: 0, range: 0, color: '#ff5c6c', usable: true, useTime: 5.0 },
  { id: 8, name: 'Shield Potion', damage: 0, fireRate: 0.4, bulletSpeed: 0, spread: 0, pellets: 0, range: 0, color: '#38bdf8', usable: true, useTime: 5.0 },
  { id: 9, name: 'Rail Sniper', damage: 78, fireRate: 1.05, bulletSpeed: 2100, spread: 0, pellets: 1, range: 1650, color: '#38bdf8', sniper: true, mag: 4, reloadTime: 2.4, ammoType: 'heavy' },
  { id: 10, name: 'Impulse Grenade', damage: 0, fireRate: 0.45, bulletSpeed: 0, spread: 0, pellets: 0, range: 0, color: '#38bdf8', throwable: true },
  { id: 11, name: 'Reverse Impulse', damage: 0, fireRate: 0.45, bulletSpeed: 0, spread: 0, pellets: 0, range: 0, color: '#c084fc', throwable: true },
  { id: 12, name: 'Mini Shield', damage: 0, fireRate: 0.35, bulletSpeed: 0, spread: 0, pellets: 0, range: 0, color: '#7dd3fc', usable: true, useTime: 1.0 },
];

export const ROOF_COLORS = ['#7c4a32', '#475569', '#8b5e3c', '#3b526b', '#6d4c41'];

export const isGun = (w: number): boolean => (w >= 1 && w <= 5) || w === 9;
export const isStackable = (w: number): boolean => (w >= 6 && w <= 8) || w >= 10;
export const isSniper = (w: number): boolean => w === 5 || w === 9;

// 10 Fortnite-adjacent named POIs across the 7200 x 7200 island
export const POIS: POI[] = [
  { name: 'Peaceful Pines', x: 1650, y: 1550 },
  { name: 'Bounty Basin', x: 3500, y: 1450 },
  { name: 'Driftwood Docks', x: 5400, y: 1400 },
  { name: 'Tumbled Towers', x: 2050, y: 3450 },
  { name: 'Gritty Garages', x: 3700, y: 3550 },
  { name: 'Bargain Block', x: 5600, y: 3400 },
  { name: 'Briny Brook', x: 3550, y: 4950 },
  { name: 'Griddle Grove', x: 1550, y: 5450 },
  { name: 'Feral Farms', x: 3750, y: 6050 },
  { name: 'Sunset Sands', x: 5650, y: 5550 },
];

export const EMOTES = ['GG!', '👋', '🔥', '💀', '🎯', '⚡'];

export const BOT_NAMES = [
  'Blaze', 'Nova', 'Kix', 'Zed', 'Moxie', 'Rook', 'Echo', 'Fang',
  'Juno', 'Pixel', 'Orbit', 'Vex', 'Tango', 'Haze', 'Ziggy', 'Drift',
  'Midas', 'Lynx', 'Brite', 'Raptor', 'Omega', 'Peely', 'Aura', 'Apex',
  'Cipher', 'Volt', 'Koda', 'Nyx', 'Pyro', 'Frost', 'Bolt', 'Sable',
  'Atlas', 'Titan', 'Rift', 'Kestrel', 'Viper', 'Onyx', 'Spark', 'Glitch',
  'Cobalt', 'Fury', 'Rogue', 'Prism', 'Dusk', 'Stryker', 'Breeze', 'Cinder',
  'Jett', 'Raven', 'Quake', 'Rex', 'Ace', 'Loki', 'Zenith', 'Gale',
  'Surge', 'Phantom', 'Crag', 'Flare', 'Hawk', 'Turbo', 'Zero', 'Wraith',
  'Specter', 'Maverick', 'Valor', 'Blitz', 'Orion', 'Pulse', 'Zane', 'Talon',
  'Skye', 'Cobra', 'Vortex', 'Aegis', 'Kaos', 'Draco', 'Ember', 'Nero',
  'Flux', 'Tundra', 'Bane', 'Siren', 'Arrow', 'Spike', 'Dash', 'Flash',
  'Astra', 'Scout', 'Shadow', 'Storm', 'Comet', 'Dagger', 'Knight', 'Rebel',
  'Prowler', 'Sonic', 'Shogun', 'Tempest',
];

export const OUTFIT_COLORS = [
  '#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0',
  '#b388ff', '#ff9f1c', '#f15bb5', '#90be6d',
];

export const SKIN_TONES = [
  '#f1c9a5', '#e0ac82', '#c68a5e', '#8d5a3b', '#f6d7bd', '#a9714a',
];

export const STORM_RADII = [5000, 3200, 1950, 1100, 520, 90];

export const DEFAULT_KEYBINDS: Keybinds = {
  up: 'w',
  down: 's',
  left: 'a',
  right: 'd',
  sprint: 'shift',
  pick: 'e',
  reload: 'r',
  map: 'm',
  emote: 'b',
  s1: '1',
  s2: '2',
  s3: '3',
  s4: '4',
  s5: '5',
  s6: '6',
};

export const KEYBIND_LABELS: [keyof Keybinds, string][] = [
  ['up', 'Move up'],
  ['down', 'Move down'],
  ['left', 'Move left'],
  ['right', 'Move right'],
  ['sprint', 'Sprint'],
  ['pick', 'Loot / Open chest / Door'],
  ['reload', 'Reload'],
  ['map', 'Toggle map'],
  ['emote', 'Quick emote'],
  ['s1', 'Slot 1 (Melee)'],
  ['s2', 'Slot 2'],
  ['s3', 'Slot 3'],
  ['s4', 'Slot 4'],
  ['s5', 'Slot 5'],
  ['s6', 'Slot 6'],
];

export const COSMETIC_CATALOG: CosmeticItem[] = [
  // Skins (Different Outfit & Hat styles of the island survivor)
  {
    id: 'skin_classic',
    category: 'skin',
    name: 'Classic Survivor',
    rarity: 0,
    price: 0,
    color: '#e0ac82',
    description: 'Default solid flesh-tone island survivor.',
  },
  {
    id: 'skin_ranger',
    category: 'skin',
    name: 'Tactical Cap',
    rarity: 1,
    price: 150,
    color: '#e0ac82',
    secondary: '#556b2f',
    description: 'Olive tactical vest paired with a field ranger cap.',
  },
  {
    id: 'skin_medic',
    category: 'skin',
    name: 'Field Medic',
    rarity: 1,
    price: 165,
    color: '#e0ac82',
    secondary: '#f8fafc',
    description: 'White trauma vest and combat medic cap with crimson cross.',
  },
  {
    id: 'skin_beanie',
    category: 'skin',
    name: 'Winter Runner',
    rarity: 1,
    price: 180,
    color: '#e0ac82',
    secondary: '#dc2626',
    description: 'Crimson puffer jacket with a striped knit pom-pom beanie.',
  },
  {
    id: 'skin_sheriff',
    category: 'skin',
    name: 'Canyon Sheriff',
    rarity: 2,
    price: 220,
    color: '#e0ac82',
    secondary: '#8b5a2b',
    description: 'Leather sheriff vest, red bandana, and wide-brim cowboy hat.',
  },
  {
    id: 'skin_knight',
    category: 'skin',
    name: 'Storm Knight',
    rarity: 3,
    price: 300,
    color: '#e0ac82',
    secondary: '#2563eb',
    description: 'Blue steel shoulder pauldrons and crested knight helmet.',
  },
  {
    id: 'skin_cyber',
    category: 'skin',
    name: 'Neon Striker',
    rarity: 3,
    price: 340,
    color: '#e0ac82',
    secondary: '#06b6d4',
    description: 'Stealth tech suit with a glowing cyan cyber visor helmet.',
  },

  // Pickaxes (Classic curved regular pickaxes held sideways in Slot 1)
  {
    id: 'pick_fists',
    category: 'pickaxe',
    name: 'Bare Fists',
    rarity: 0,
    price: 0,
    color: '#e0ac82',
    description: 'Classic bare-handed melee strikes.',
  },
  {
    id: 'pick_timber',
    category: 'pickaxe',
    name: 'Classic Pickaxe',
    rarity: 1,
    price: 120,
    color: '#94a3b8',
    secondary: '#7c4a26',
    description: 'Traditional hardwood handle and forged steel miner pickaxe.',
  },
  {
    id: 'pick_tactical',
    category: 'pickaxe',
    name: 'Iron Trench Pick',
    rarity: 1,
    price: 150,
    color: '#cbd5e1',
    secondary: '#334155',
    description: 'Reinforced gunmetal tactical harvesting pickaxe.',
  },
  {
    id: 'pick_plasma',
    category: 'pickaxe',
    name: 'Plasma Pickaxe',
    rarity: 2,
    price: 210,
    color: '#38bdf8',
    secondary: '#0f172a',
    description: 'Carbon-shafted regular pickaxe with ionized cyan tips.',
  },
  {
    id: 'pick_emerald',
    category: 'pickaxe',
    name: 'Emerald Striker',
    rarity: 2,
    price: 230,
    color: '#10b981',
    secondary: '#1e293b',
    description: 'Tempered jade-alloy harvesting pickaxe with dark grip.',
  },
  {
    id: 'pick_crimson',
    category: 'pickaxe',
    name: 'Crimson Reaper',
    rarity: 2,
    price: 260,
    color: '#e8365d',
    secondary: '#1f2937',
    description: 'Obsidian handle and glowing crimson forged pickaxe head.',
  },
  {
    id: 'pick_golden',
    category: 'pickaxe',
    name: 'Midas Harvester',
    rarity: 3,
    price: 360,
    color: '#fbbf24',
    secondary: '#5c3d1e',
    description: 'Walnut grip and solid 24-karat gold curved battle pickaxe.',
  },

  // Back Blings (Rendered behind player in-game!)
  {
    id: 'bb_none',
    category: 'backbling',
    name: 'No Back Bling',
    rarity: 0,
    price: 0,
    color: '#64748b',
    description: 'Run light with no backpack equipped.',
  },
  {
    id: 'bb_jetpack',
    category: 'backbling',
    name: 'Amber Core Pack',
    rarity: 3,
    price: 280,
    color: '#475569',
    secondary: '#fbbf24',
    description: 'Armored tactical jetpack with glowing amber core.',
  },
  {
    id: 'bb_satchel',
    category: 'backbling',
    name: 'Field Satchel',
    rarity: 1,
    price: 140,
    color: '#7c4a26',
    secondary: '#d6b384',
    description: 'Rugged explorer leather supply pack.',
  },
  {
    id: 'bb_shield',
    category: 'backbling',
    name: 'Aegis Buckler',
    rarity: 2,
    price: 220,
    color: '#1e3a8a',
    secondary: '#38bdf8',
    description: 'Neon-trimmed defensive energy back shield.',
  },

  // Gliders (Rendered overhead when skydiving!)
  {
    id: 'gl_classic',
    category: 'glider',
    name: 'Cobalt Wing',
    rarity: 0,
    price: 0,
    color: '#4cc9f0',
    description: 'Standard skydiving delta glider.',
  },
  {
    id: 'gl_crimson',
    category: 'glider',
    name: 'Crimson Sovereign',
    rarity: 3,
    price: 300,
    color: '#e8365d',
    secondary: '#fbbf24',
    description: 'Crimson and gold swept delta wing.',
  },
  {
    id: 'gl_emerald',
    category: 'glider',
    name: 'Emerald Hawk',
    rarity: 1,
    price: 150,
    color: '#2ed8a3',
    description: 'Lightweight forest recon glider.',
  },
  {
    id: 'gl_void',
    category: 'glider',
    name: 'Stormrider Wing',
    rarity: 2,
    price: 240,
    color: '#a855f7',
    description: 'Violet stealth canopy built for high-altitude drops.',
  },
  {
    id: 'gl_gold',
    category: 'glider',
    name: 'Victory Crown',
    rarity: 3,
    price: 400,
    color: '#fbbf24',
    description: 'Prestigious golden champion glider.',
  },

  // Lobby Music Tracks
  {
    id: 'mus_off',
    category: 'music',
    name: 'Off (Silent)',
    rarity: 0,
    price: 0,
    color: '#64748b',
    description: 'Quiet lobby with no background music.',
  },
  {
    id: 'mus_skydrop',
    category: 'music',
    name: 'Sky Drop Synth',
    rarity: 1,
    price: 0,
    color: '#38bdf8',
    description: 'Upbeat battle royale electronic lobby anthem (Free!).',
  },
  {
    id: 'mus_stormfront',
    category: 'music',
    name: 'Stormfront Groove',
    rarity: 2,
    price: 120,
    color: '#c084fc',
    description: 'Driving synthwave bassline for Arena queues.',
  },
  {
    id: 'mus_victory',
    category: 'music',
    name: 'Sunset Island',
    rarity: 3,
    price: 180,
    color: '#fbbf24',
    description: 'Warm chill chords after a Victory Royale.',
  },
];

export const SKINS = [
  { n: 'Moss', c: '#6b8f5a', r: 0 },
  { n: 'Slate', c: '#6f7f95', r: 0 },
  { n: 'Sand', c: '#c9b27c', r: 0 },
  { n: 'Rust', c: '#b5603a', r: 0 },
  { n: 'Ocean', c: '#1e88e5', r: 1 },
  { n: 'Magenta', c: '#d81b9a', r: 1 },
  { n: 'Mint', c: '#2ed8a3', r: 1 },
  { n: 'Ember', c: '#ff5a1f', r: 2 },
  { n: 'Void', c: '#4b2a8f', r: 2 },
  { n: 'Golden Hour', c: '#ffc93c', r: 3 },
];

export const RARITY_NAMES = ['Common', 'Rare', 'Epic', 'Legendary'];
export const RARITY_COLORS = ['#9aa3b2', '#4d8dff', '#b06bff', '#ffc93c'];
export const RARITY_WEIGHTS = [60, 28, 10, 2];

export const ARENA_RANKS: [string, number, string][] = [
  ['Bronze', 0, '#b07a4a'],
  ['Silver', 200, '#c0c8d4'],
  ['Gold', 450, '#ffc93c'],
  ['Platinum', 800, '#5fd6c8'],
  ['Diamond', 1250, '#6aa8ff'],
  ['Elite', 1800, '#b06bff'],
  ['Champion', 2500, '#ff6b6b'],
  ['Unreal', 3400, '#ff3df0'],
];

export const REPORT_REASONS = [
  'Cheating (aimbot, speed hacks)',
  'Teaming with enemies',
  'Exploiting a bug',
  'Offensive name',
  'Other',
];

export const CHANGELOG: { v: string; title: string; d: string; n: string[] }[] = [
  {
    v: '1.13.0',
    title: 'Mystery Battle Pass Page & Updates Fix',
    d: 'Nov 19, 2026',
    n: [
      'Added the secretive Season 1 Battle Pass tab featuring blacked-out shadow reward silhouettes and a "Something is coming" teaser',
      'Fixed the Version Updates page overflowing over the top menu bar by making the release list scrollable and adding Back / Esc return controls',
    ],
  },
  {
    v: '1.12.1',
    title: 'Clean Lobby Sprite Stage',
    d: 'Nov 19, 2026',
    n: [
      'Removed the green pad beneath the character sprite in the Play lobby and Locker preview',
    ],
  },
  {
    v: '1.12.0',
    title: 'Zombs-Style UI Overhaul & Minimap Skull Counter',
    d: 'Nov 19, 2026',
    n: [
      'Moved the in-game KILLS counter directly underneath the top-right minimap with a custom skull sprite next to the kill count',
      'Redesigned the main menu lobby with a painted turf character stage, dark-outlined arcade panels, beveled mode tabs, and a green PLAY button',
      'Redesigned the Death & Victory screen with a bold crimson/gold header banner, divided scoreboard with skull kill icon, and beveled Play Again controls',
      'Updated Drop Zones header count dynamically to show 100 Players',
    ],
  },
  {
    v: '1.11.0',
    title: '100-Player BR, Spawn Houses & Shadows',
    d: 'Nov 19, 2026',
    n: [
      'Upgraded Solo, Arena, and Online BR lobbies to 100-player Battle Royale matches with 100 unique bot names and balanced placement rewards',
      'Expanded Spawn Island offshore to 1800 x 1600 with 5 small furnished houses, practice chests, trees, crates, and central walkways',
      'Added gradual bot spawning during the Spawn Island countdown so bots trickle in smoothly without initial frame spikes',
      'Added directional ground shadows across buildings, pitched roofs, trees, chests, crates, rocks, ground loot, players, and the Spawn Island dock',
    ],
  },
  {
    v: '1.10.0',
    title: 'Spawn Island & 30s Pre-Match Warmup',
    d: 'Nov 19, 2026',
    n: [
      'Added an offshore Spawn Island staging area with a tarmac helipad, wooden dock, practice crates, and weapon racks',
      'Added a 30-second pre-match countdown before Drop Plane takeoff across Solo, Arena, and Online BR',
      'Added a Skip to 3s countdown button on the Spawn Island HUD to fast-forward the warm-up timer',
    ],
  },
  {
    v: '1.9.1',
    title: 'Season 1 Launch Date Set for Jan 1',
    d: 'Nov 19, 2026',
    n: [
      'Updated the Official Season 1 Public Launch countdown to January 1, 2027',
    ],
  },
  {
    v: '1.9.0',
    title: 'Coin Sprites & Shop Aspect Fix',
    d: 'Nov 19, 2026',
    n: [
      'Added gold Coin currency sprites across the header wallet, Item Shop, Locker, Crate, and Account views',
      'Fixed stretched Item Shop and Locker cosmetic canvases with dynamic 1:1 aspect-ratio scaling',
    ],
  },
  {
    v: '1.8.0',
    title: 'Gems Currency & Username Pricing',
    d: 'Nov 19, 2026',
    n: [
      'Added Gems as a second currency tracked across local profiles and Google Cloud accounts',
      'Added a Buy Gems section in the Item Shop with 4 gem tiers ($0.99 to $9.99)',
      'Updated Account username changes so your first rename is Free and subsequent renames cost 1,000 Gems',
    ],
  },
  {
    v: '1.7.0',
    title: 'Menu Pedestal & Pickaxe Outline Polish',
    d: 'Nov 19, 2026',
    n: [
      'Removed the glider canopy from the main menu and Locker character showcase pedestals',
      'Fixed pickaxe outline joins and recentered the showcase sprite so nothing clips inside the frame',
    ],
  },
  {
    v: '1.6.0',
    title: 'Clean Lobby, Sprite Previews & Season 1 Countdown',
    d: 'Nov 19, 2026',
    n: [
      'Redesigned zero-scroll lobby navigation with categorized Locker and Item Shop views',
      'Replaced Shop and Locker illustrations with live in-game canvas sprite previews',
      'Added live 30-day Official Season 1 public release countdown in the Play lobby',
      'Restored dedicated Updates version history tab alongside Preferences and Controls',
    ],
  },
  {
    v: '1.5.0',
    title: 'Healing Timers & Mini Shields',
    d: 'Nov 19, 2026',
    n: [
      'Added Mini Shield potion (1.0s use time, restores +25 Shield up to 50 max)',
      'Medkits and full Shield Potions now require a 5.0s channel to complete',
      'Cancelable healing channels with movement speed penalty, synced across Solo & Online BR',
    ],
  },
  {
    v: '1.4.0',
    title: 'Ammo System, Throwable Physics & Directional Doors',
    d: 'Nov 19, 2026',
    n: [
      'Added 4-type reserve ammo pools (Light, Shells, Medium, Heavy), loot packs, and HUD reserve counters',
      'Doors now swing open away from the direction the player is facing',
      'Upgraded Grenade, Impulse, and Reverse Impulse 3D arc physics with wall bounces and stronger push/pull',
    ],
  },
  {
    v: '1.3.0',
    title: 'Sideways Pickaxes, Skins & Gun Audio',
    d: 'Nov 19, 2026',
    n: [
      'Redesigned regular curved pickaxes held sideways in Slot 1 across gameplay and previews',
      'Added new Skins and Pickaxe variants to the Item Shop and Locker',
      'Upgraded WebAudio lobby music synthesis and added distinct gunshot sound effects per weapon',
    ],
  },
  {
    v: '1.2.0',
    title: 'Death Cam, Online Performance & Island Refresh',
    d: 'Nov 18, 2026',
    n: [
      'Added automatic 3-second Death Cam instant replay capturing final moments upon elimination',
      'Optimized Online BR state replication and snapshot interpolation to eliminate match lag',
      'Made building doors openable and closable and replaced map POIs with original island names',
    ],
  },
  {
    v: '1.1.0',
    title: 'Expanded Island, Smart Bots & Locker',
    d: 'Nov 18, 2026',
    n: [
      'Expanded 7200 x 7200 island with 24 players and 10 named locations across the map',
      'Buildings feature roofs that smoothly fade out when you walk inside and reappear outside',
      'Smarter player-like bots with door pathfinding, velocity leading, range-based weapon swaps, and healing',
      'Dedicated Locker tab for Skins, Pickaxes, Back Blings, Gliders, and Lobby Music tracks',
    ],
  },
  {
    v: '1.0.0',
    title: 'Initial Launch',
    d: 'Nov 18, 2026',
    n: [
      'Drop Plane & Glider skydiving, Weapon Rarity Tiers, Golden Chests, and Bolt & Rail Snipers',
      '6-slot bottom-right hotbar, bottom-left Shield + Health bars, and Casual & Arena modes',
    ],
  },
];

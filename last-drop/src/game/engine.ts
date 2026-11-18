import { playSfx, SfxKey } from './audio';
import {
  AMMO_INFO,
  AMMO_TYPES,
  BOT_NAMES,
  COSMETIC_CATALOG,
  EMOTES,
  ISLAND_MARGIN,
  isGun,
  isSniper,
  isStackable,
  MAP_CENTER,
  MAP_SIZE,
  OUTFIT_COLORS,
  PLAYER_RADIUS,
  POIS,
  RARITY_TIERS,
  ROOF_COLORS,
  SKIN_TONES,
  STORM_RADII,
  TOTAL_PLAYERS,
  WP,
} from './constants';
import { getLevelInfo, getRankInfo } from './storage';
import {
  AmmoType,
  BuildingDoor,
  BuildingFloor,
  Bullet,
  Chest,
  DeathCamState,
  DropPlane,
  FeedItem,
  GameSettings,
  Grenade,
  HudSnapshot,
  Keybinds,
  LootItem,
  MatchResult,
  Obstacle,
  Particle,
  Player,
  RarityTier,
  RoadSegment,
  Shockwave,
  StormState,
  UserProfile,
  Wall,
} from './types';

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const hyp = Math.hypot;

function createEmptyReserve(): Record<AmmoType, number> {
  return { light: 0, shells: 0, medium: 0, heavy: 0 };
}

function computeDoorOpenDir(d: BuildingDoor, p: { x: number; y: number; a: number }): 1 | -1 {
  const dcx = d.x + d.w / 2;
  const dcy = d.y + d.h / 2;
  if (d.horizontal) {
    const sin = Math.sin(p.a);
    if (Math.abs(sin) > 0.12) return sin > 0 ? 1 : -1;
    return p.y <= dcy ? 1 : -1;
  }
  const cos = Math.cos(p.a);
  if (Math.abs(cos) > 0.12) return cos > 0 ? 1 : -1;
  return p.x <= dcx ? 1 : -1;
}

function rollRarity(boost = 0): RarityTier {
  const q = Math.random() + boost;
  if (q > 1.25) return 5;
  if (q > 0.96) return 4;
  if (q > 0.84) return 3;
  if (q > 0.64) return 2;
  if (q > 0.36) return 1;
  return 0;
}

interface DeathCamFrame {
  t: number;
  camX: number;
  camY: number;
  zoom: number;
  meId: number | null;
  players: Player[];
  bullets: Bullet[];
  loot: LootItem[];
  chests: Chest[];
  obstacles: Obstacle[];
  grenades: Grenade[];
  shockwaves: Shockwave[];
  particles: Particle[];
  storm: StormState;
  plane: DropPlane;
  roofAlphas: number[];
  doorsOpen: number[];
}

export interface RenderScene {
  isDeathCam: boolean;
  camX: number;
  camY: number;
  zoom: number;
  elapsed: number;
  me: Player | null;
  players: Player[];
  bullets: Bullet[];
  loot: LootItem[];
  chests: Chest[];
  obstacles: Obstacle[];
  grenades: Grenade[];
  shockwaves: Shockwave[];
  particles: Particle[];
  storm: StormState;
  plane: DropPlane;
  floors: BuildingFloor[];
  walls: Wall[];
  doors: BuildingDoor[];
  roads: RoadSegment[];
  shake: number;
  hitmarker: number;
  paused: boolean;
  ambient: boolean;
  mouseX: number;
  mouseY: number;
}

export interface EngineCallbacks {
  onMatchFinish: (result: MatchResult, hasDeathCam: boolean) => void;
  onAllEliminated: (winnerName: string) => void;
  onHudUpdate: (hud: HudSnapshot) => void;
  onDeathCamUpdate?: (state: DeathCamState | null) => void;
  onDeathCamFinish?: () => void;
  getSettings: () => GameSettings;
  getKeybinds: () => Keybinds;
  getProfile: () => UserProfile;
  saveProfileUpdate: (fn: (profile: UserProfile) => void) => void;
}

export class GameEngine {
  public players: Player[] = [];
  public me: Player | null = null;
  public bullets: Bullet[] = [];
  public loot: LootItem[] = [];
  public chests: Chest[] = [];
  public obstacles: Obstacle[] = [];
  public floors: BuildingFloor[] = [];
  public walls: Wall[] = [];
  public doors: BuildingDoor[] = [];
  public roads: RoadSegment[] = [];
  public particles: Particle[] = [];
  public shockwaves: Shockwave[] = [];
  public grenades: Grenade[] = [];
  public feed: FeedItem[] = [];
  public plane: DropPlane = {
    active: false,
    sx: 0,
    sy: 0,
    ex: 0,
    ey: 0,
    x: 0,
    y: 0,
    a: 0,
    progress: 0,
  };
  public storm: StormState = {
    x: MAP_CENTER,
    y: MAP_CENTER,
    r: STORM_RADII[0],
    i: 0,
    t: 0,
    set: false,
    fx: 0,
    fy: 0,
    fr: 0,
    tx: MAP_CENTER,
    ty: MAP_CENTER,
  };

  public ambient = true;
  public online = false;
  public onlineStatus: HudSnapshot['onlineStatus'] = null;
  public paused = false;
  public over = false;
  public elapsed = 0;
  public kills = 0;
  public shake = 0;
  public hitstop = 0;
  public hitmarker = 0;
  public cameraZoom = 1;
  public isArena = false;

  public keys: Record<string, boolean> = {};
  public mouseX = 640;
  public mouseY = 360;
  public mouseDown = false;
  public viewW = 1280;
  public viewH = 720;

  private nextId = 1;
  private stormTick = 0;
  private nextAir = 35;
  private hudAcc = 0;
  private inputAcc = 0;
  private ambientAngle = 0;
  private callbacks: EngineCallbacks;
  private resultCache: MatchResult | null = null;
  private emoteIdx = 0;
  private ws: WebSocket | null = null;
  private myOnlineId: number | null = null;

  public deathCamPlaying = false;
  private deathCamBuffer: DeathCamFrame[] = [];
  private deathCamClip: DeathCamFrame[] = [];
  private deathCamAcc = 0;
  private deathCamElapsed = 0;
  private deathCamTime = 0;
  private deathCamDuration = 3.0;
  private deathCamHudAcc = 0;
  private deathCamKiller: string | null = null;
  private deathCamKillerWeapon: string | null = null;
  private deathCamVictim = 'You';

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
    this.initAmbientWorld();
  }

  public initAmbientWorld() {
    this.disconnectOnline();
    this.resetDeathCam();
    this.ambient = true;
    this.online = false;
    this.onlineStatus = null;
    this.paused = false;
    this.over = false;
    this.elapsed = 0;
    this.kills = 0;
    this.shake = 0;
    this.hitstop = 0;
    this.hitmarker = 0;
    this.cameraZoom = 1;
    this.resultCache = null;
    this.plane.active = false;

    this.generateWorld();

    this.players = [];
    for (let i = 0; i < TOTAL_PLAYERS; i++) {
      const bot = this.createPlayer(BOT_NAMES[i % BOT_NAMES.length], true, i, false);
      const a = rnd(0, Math.PI * 2);
      const d = rnd(350, 2600);
      bot.x = MAP_CENTER + Math.cos(a) * d;
      bot.y = MAP_CENTER + Math.sin(a) * d;
      this.players.push(bot);
    }
    this.me = null;
    this.ambientAngle = Math.random() * Math.PI * 2;
  }

  public disconnectOnline() {
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }
    this.online = false;
    this.onlineStatus = null;
    this.myOnlineId = null;
  }

  public startOnlineMatch(playerName: string) {
    this.disconnectOnline();
    this.resetDeathCam();
    this.ambient = false;
    this.online = true;
    this.paused = false;
    this.over = false;
    this.isArena = false;
    this.elapsed = 0;
    this.kills = 0;
    this.shake = 0;
    this.hitstop = 0;
    this.hitmarker = 0;
    this.cameraZoom = 1;
    this.resultCache = null;
    this.keys = {};
    this.mouseDown = false;
    this.players = [];
    this.bullets = [];
    this.loot = [];
    this.chests = [];
    this.obstacles = [];
    this.floors = [];
    this.walls = [];
    this.doors = [];
    this.roads = [];
    this.particles = [];
    this.shockwaves = [];
    this.grenades = [];
    this.feed = [];
    this.plane.active = false;
    this.onlineStatus = {
      connected: false,
      phase: 'COUNTDOWN',
      countdown: 4,
      humanCount: 1,
    };

    const profile = this.callbacks.getProfile();
    const eq = profile.equipped;
    const skinItem = COSMETIC_CATALOG.find((c) => c.id === eq?.skin);
    const gliderItem = COSMETIC_CATALOG.find((c) => c.id === eq?.glider);
    const mePlaceholder = this.createPlayer(playerName || 'You', false, 3, true);
    if (skinItem) mePlaceholder.fl = skinItem.color;
    if (gliderItem) mePlaceholder.col = gliderItem.color;
    mePlaceholder.skinId = eq?.skin || 'skin_classic';
    mePlaceholder.pickaxeId = eq?.pickaxe || 'pick_fists';
    mePlaceholder.backblingId = eq?.backbling || 'bb_none';
    this.me = mePlaceholder;
    this.players = [mePlaceholder];

    const configuredWsUrl = (import.meta as { env?: Record<string, string> }).env?.VITE_WS_URL;
    const wsUrl =
      configuredWsUrl && configuredWsUrl.trim().length > 0
        ? configuredWsUrl.trim()
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      if (this.ws !== ws) return;
      if (this.onlineStatus) {
        this.onlineStatus = { ...this.onlineStatus, connected: true };
      }
      ws.send(
        JSON.stringify({
          type: 'join',
          name: playerName || 'You',
          skinId: mePlaceholder.skinId,
          pickaxeId: mePlaceholder.pickaxeId,
          backblingId: mePlaceholder.backblingId,
          gliderColor: mePlaceholder.col,
          skinTone: mePlaceholder.fl,
        })
      );
      this.emitHud();
    };

    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      this.handleOnlineMessage(msg);
    };

    ws.onclose = () => {
      if (this.ws !== ws) return;
      if (this.onlineStatus) {
        this.onlineStatus = { ...this.onlineStatus, connected: false };
      }
      this.pushFeed('Disconnected from online match server', '#ff5c6c');
      this.emitHud();
    };

    this.mouseX = this.viewW / 2 + 120;
    this.mouseY = this.viewH / 2;
    this.emitHud();
  }

  public startMatch(playerName: string, arenaMode: boolean) {
    this.disconnectOnline();
    this.resetDeathCam();
    this.ambient = false;
    this.online = false;
    this.onlineStatus = null;
    this.paused = false;
    this.over = false;
    this.isArena = arenaMode;
    this.elapsed = 0;
    this.kills = 0;
    this.stormTick = 0;
    this.nextAir = 35;
    this.shake = 0;
    this.hitstop = 0;
    this.hitmarker = 0;
    this.cameraZoom = 1;
    this.resultCache = null;
    this.keys = {};
    this.mouseDown = false;

    this.generateWorld();

    // Randomize Drop Plane flight path across the 7200 x 7200 island
    const angle = rnd(0, Math.PI * 2);
    const dist = 3350;
    const perpOffset = rnd(-800, 800);
    const px = -Math.sin(angle) * perpOffset;
    const py = Math.cos(angle) * perpOffset;
    const sx = MAP_CENTER - Math.cos(angle) * dist + px;
    const sy = MAP_CENTER - Math.sin(angle) * dist + py;
    const ex = MAP_CENTER + Math.cos(angle) * dist + px;
    const ey = MAP_CENTER + Math.sin(angle) * dist + py;

    this.plane = {
      active: true,
      sx,
      sy,
      ex,
      ey,
      x: sx,
      y: sy,
      a: Math.atan2(ey - sy, ex - sx),
      progress: 0,
    };

    const profile = this.callbacks.getProfile();
    const eq = profile.equipped;
    const skinItem = COSMETIC_CATALOG.find((c) => c.id === eq?.skin);
    const gliderItem = COSMETIC_CATALOG.find((c) => c.id === eq?.glider);

    this.players = [];
    const me = this.createPlayer(playerName || 'You', false, 3, true);
    if (skinItem) me.fl = skinItem.color;
    if (gliderItem) me.col = gliderItem.color;
    me.skinId = eq?.skin || 'skin_classic';
    me.pickaxeId = eq?.pickaxe || 'pick_fists';
    me.backblingId = eq?.backbling || 'bb_none';
    me.x = sx;
    me.y = sy;
    this.me = me;
    this.players.push(me);

    for (let i = 0; i < TOTAL_PLAYERS - 1; i++) {
      const bot = this.createPlayer(BOT_NAMES[i % BOT_NAMES.length], true, i, true);
      bot.x = sx;
      bot.y = sy;
      bot.planeJumpAt = rnd(0.1, 0.9);
      this.players.push(bot);
    }

    this.mouseX = this.viewW / 2 + 120;
    this.mouseY = this.viewH / 2;
    this.sfx('go');
    this.emitHud();
  }

  public jumpFromPlane() {
    const me = this.me;
    if (!me || !me.alive || !me.inPlane || this.paused) return;
    if (this.online) {
      if (this.onlineStatus?.phase === 'COUNTDOWN') return;
      this.sendWs({ type: 'jump' });
      this.sfx('jump');
      return;
    }
    me.inPlane = false;
    me.dropTime = 1.6;
    me.dropMax = 1.6;
    me.x = this.plane.x;
    me.y = this.plane.y;
    this.sfx('jump');
    this.emitHud();
  }

  public triggerEmote() {
    const me = this.me;
    if (!me || !me.alive || me.inPlane || this.paused) return;
    const emote = EMOTES[this.emoteIdx % EMOTES.length];
    this.emoteIdx++;
    if (this.online) {
      this.sendWs({ type: 'emote', emote });
      this.sfx('ui');
      return;
    }
    me.emote = emote;
    me.emoteTimer = 2.2;
    this.sfx('ui');
  }

  private generateWorld() {
    this.bullets = [];
    this.loot = [];
    this.chests = [];
    this.obstacles = [];
    this.floors = [];
    this.walls = [];
    this.doors = [];
    this.roads = [];
    this.particles = [];
    this.shockwaves = [];
    this.grenades = [];
    this.feed = [];

    // Road network connecting the 10 island POIs
    this.roads = [
      { x1: 1650, y1: 1550, x2: 3500, y2: 1450, w: 72 }, // Peaceful Pines -> Bounty Basin
      { x1: 3500, y1: 1450, x2: 5400, y2: 1400, w: 72 }, // Bounty Basin -> Driftwood Docks
      { x1: 1650, y1: 1550, x2: 2050, y2: 3450, w: 76 }, // Peaceful Pines -> Tumbled Towers
      { x1: 2050, y1: 3450, x2: 3700, y2: 3550, w: 76 }, // Tumbled Towers -> Gritty Garages
      { x1: 3700, y1: 3550, x2: 5600, y2: 3400, w: 76 }, // Gritty Garages -> Bargain Block
      { x1: 3500, y1: 1450, x2: 3700, y2: 3550, w: 72 }, // Bounty Basin -> Gritty Garages
      { x1: 3700, y1: 3550, x2: 3550, y2: 4950, w: 74 }, // Gritty Garages -> Briny Brook
      { x1: 2050, y1: 3450, x2: 1550, y2: 5450, w: 70 }, // Tumbled Towers -> Griddle Grove
      { x1: 1550, y1: 5450, x2: 3550, y2: 4950, w: 70 }, // Griddle Grove -> Briny Brook
      { x1: 3550, y1: 4950, x2: 3750, y2: 6050, w: 68 }, // Briny Brook -> Feral Farms
      { x1: 3550, y1: 4950, x2: 5650, y2: 5550, w: 72 }, // Briny Brook -> Sunset Sands
      { x1: 5600, y1: 3400, x2: 5650, y2: 5550, w: 72 }, // Bargain Block -> Sunset Sands
    ];

    const minLand = ISLAND_MARGIN + 100;
    const maxLand = MAP_SIZE - ISLAND_MARGIN - 100;

    // 520 Trees, rocks, crates, and explosive barrels across the larger 7200 x 7200 map
    for (let i = 0; i < 520; i++) {
      const q = Math.random();
      const kind: Obstacle['kind'] =
        q < 0.56 ? 'tree' : q < 0.84 ? 'rock' : q < 0.94 ? 'crate' : 'barrel';
      const mh = kind === 'tree' ? 65 : kind === 'rock' ? 115 : kind === 'crate' ? 40 : 35;
      const r =
        kind === 'tree'
          ? rnd(25, 46)
          : kind === 'rock'
            ? rnd(18, 35)
            : kind === 'crate'
              ? 18
              : 14;
      this.obstacles.push({
        x: rnd(minLand, maxLand),
        y: rnd(minLand, maxLand),
        r,
        kind,
        hp: mh,
        mh,
        hitFlash: 0,
      });
    }

    // 540 Ground loot spawns across the island (weapons, meds, throwables & ammo packs)
    for (let i = 0; i < 540; i++) {
      const q = Math.random();
      let w: number;
      if (q < 0.52) {
        w =
          Math.random() < 0.13
            ? 5
            : 1 + Math.floor(Math.random() ** 1.5 * 4);
      } else if (q < 0.7) {
        const gRoll = Math.random();
        w = gRoll < 0.4 ? 6 : gRoll < 0.72 ? 10 : 11;
      } else if (q < 0.81) {
        w = 7;
      } else if (q < 0.90) {
        w = 8;
      } else {
        w = 12;
      }
      this.loot.push({
        id: this.nextId++,
        x: rnd(minLand, maxLand),
        y: rnd(minLand, maxLand),
        t: 'w',
        w,
        r: isStackable(w) ? 0 : rollRarity(0),
        n: w === 12 ? 2 : undefined,
      });
    }

    // 190 Ground Ammo Packs across the island
    for (let i = 0; i < 190; i++) {
      const aType = AMMO_TYPES[Math.floor(Math.random() * AMMO_TYPES.length)];
      this.loot.push({
        id: this.nextId++,
        x: rnd(minLand, maxLand),
        y: rnd(minLand, maxLand),
        t: 'a',
        w: 0,
        r: 0,
        ammoType: aType,
        n: AMMO_INFO[aType].packAmount,
      });
    }

    this.buildStructures();

    this.storm = {
      x: MAP_CENTER,
      y: MAP_CENTER,
      r: STORM_RADII[0],
      i: 0,
      t: 0,
      set: false,
      fx: 0,
      fy: 0,
      fr: 0,
      tx: MAP_CENTER,
      ty: MAP_CENTER,
    };
  }

  private buildStructures() {
    const t = 24;
    const gp = 82;

    const placeBuilding = (
      x: number,
      y: number,
      w: number,
      h: number,
      goldenChance: number,
      poiName?: string
    ) => {
      const doorSide = Math.floor(Math.random() * 4);
      const roofColor = ROOF_COLORS[Math.floor(Math.random() * ROOF_COLORS.length)];
      this.floors.push({ x, y, w, h, roofColor, roofAlpha: 1, poiName });

      const addWall = (wx: number, wy: number, ww: number, wh: number) =>
        this.walls.push({ x: wx, y: wy, w: ww, h: wh });

      const horiz = (yy: number, hasDoor: boolean) => {
        if (hasDoor) {
          const o = rnd(26, w - gp - 26);
          addWall(x, yy, o, t);
          addWall(x + o + gp, yy, w - o - gp, t);
          this.doors.push({
            id: this.nextId++,
            x: x + o,
            y: yy,
            w: gp,
            h: t,
            horizontal: true,
            open: false,
            openProgress: 0,
          });
        } else {
          addWall(x, yy, w, t);
        }
      };

      const vert = (xx: number, hasDoor: boolean) => {
        if (hasDoor) {
          const o = rnd(26, h - gp - 26);
          addWall(xx, y + t, t, o - t);
          addWall(xx, y + o + gp, t, h - o - gp - t);
          this.doors.push({
            id: this.nextId++,
            x: xx,
            y: y + o,
            w: t,
            h: gp,
            horizontal: false,
            open: false,
            openProgress: 0,
          });
        } else {
          addWall(xx, y + t, t, h - 2 * t);
        }
      };

      horiz(y, doorSide === 0);
      horiz(y + h - t, doorSide === 1);
      vert(x, doorSide === 2);
      vert(x + w - t, doorSide === 3);

      // 1-2 Chests inside building
      this.chests.push({
        id: this.nextId++,
        x: x + w * rnd(0.3, 0.7),
        y: y + h * rnd(0.3, 0.7),
        opened: false,
        golden: Math.random() < goldenChance,
      });

      // Interior loot items
      for (let k = 0; k < 4; k++) {
        const q = Math.random();
        const wi =
          q < 0.54
            ? Math.random() < 0.18
              ? 5
              : 2 + Math.floor(Math.random() * 3)
            : q < 0.68
              ? Math.random() < 0.5
                ? 10
                : 11
              : q < 0.80
                ? 7
                : q < 0.90
                  ? 8
                  : 12;
        this.loot.push({
          id: this.nextId++,
          x: x + t + 32 + Math.random() * (w - 2 * t - 64),
          y: y + t + 32 + Math.random() * (h - 2 * t - 64),
          t: 'w',
          w: wi,
          r: isStackable(wi) ? 0 : rollRarity(0.14),
          n: wi === 12 ? 2 : undefined,
        });
      }
    };

    // Place 4 buildings around each of the 10 island POIs (5 at Tumbled Towers & Bargain Block)
    for (const poi of POIS) {
      const count = poi.name === 'Tumbled Towers' || poi.name === 'Bargain Block' ? 5 : 4;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + rnd(-0.25, 0.25);
        const rad = rnd(170, 340);
        const w = rnd(240, 340);
        const h = rnd(200, 280);
        const bx = Math.max(
          420,
          Math.min(MAP_SIZE - 420 - w, poi.x + Math.cos(ang) * rad - w / 2)
        );
        const by = Math.max(
          420,
          Math.min(MAP_SIZE - 420 - h, poi.y + Math.sin(ang) * rad - h / 2)
        );
        if (
          !this.floors.some(
            (f) =>
              bx < f.x + f.w + 50 &&
              bx + w + 50 > f.x &&
              by < f.y + f.h + 50 &&
              by + h + 50 > f.y
          )
        ) {
          placeBuilding(bx, by, w, h, 0.58, poi.name);
        }
      }
    }

    // Scattered rural cabins & compounds across the island
    for (let n = 0; n < 18; n++) {
      const w = rnd(220, 300);
      const h = rnd(190, 250);
      const bx = rnd(450, MAP_SIZE - 450 - w);
      const by = rnd(450, MAP_SIZE - 450 - h);
      if (
        !this.floors.some(
          (f) =>
            bx < f.x + f.w + 60 &&
            bx + w + 60 > f.x &&
            by < f.y + f.h + 60 &&
            by + h + 60 > f.y
        )
      ) {
        placeBuilding(bx, by, w, h, 0.35);
      }
    }

    // Clear obstacles overlapping buildings
    this.obstacles = this.obstacles.filter(
      (o) =>
        !this.floors.some(
          (f) =>
            o.x > f.x - 65 &&
            o.x < f.x + f.w + 65 &&
            o.y > f.y - 65 &&
            o.y < f.y + f.h + 65
        )
    );
  }

  private createPlayer(name: string, bot: boolean, idx: number, startInPlane: boolean): Player {
    const skins = ['skin_classic', 'skin_classic', 'skin_ranger', 'skin_medic', 'skin_sheriff', 'skin_beanie', 'skin_knight', 'skin_cyber'];
    const pickaxes = ['pick_fists', 'pick_timber', 'pick_tactical', 'pick_plasma', 'pick_emerald', 'pick_crimson', 'pick_golden'];
    const backblings = ['bb_none', 'bb_none', 'bb_jetpack', 'bb_satchel', 'bb_shield'];
    return {
      id: this.nextId++,
      x: MAP_CENTER,
      y: MAP_CENTER,
      a: 0,
      hp: 100,
      sh: 0,
      w: 0,
      cd: 0,
      bot,
      name,
      col: OUTFIT_COLORS[idx % OUTFIT_COLORS.length],
      skinId: bot ? skins[idx % skins.length] : 'skin_classic',
      pickaxeId: bot ? pickaxes[idx % pickaxes.length] : 'pick_fists',
      backblingId: bot ? backblings[idx % backblings.length] : 'bb_none',
      k: 0,
      alive: true,
      tx: 0,
      ty: 0,
      tt: 0,
      vx: 0,
      vy: 0,
      st: 100,
      gn: 0,
      pc: 0,
      hd: 0,
      fl: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)],
      inv: [0, -1, -1, -1, -1, -1],
      invRarity: [0, 0, 0, 0, 0, 0],
      sl: 0,
      c: {},
      am: {},
      ra: createEmptyReserve(),
      rl: 0,
      rt: 0,
      rw: 0,
      hl: 0,
      ht: 0,
      hw: 0,
      sk: 0.65 + Math.random() * 0.35, // smarter higher baseline bot skill
      hitFlash: 0,
      recoil: 0,
      dm: 0,
      pts: 0,
      pt2: 0,
      rank: TOTAL_PLAYERS,
      td: 0,
      by: null,
      fin: false,
      inPlane: startInPlane,
      dropTime: 0,
      dropMax: 1.6,
      planeJumpAt: 0.5,
      emote: null,
      emoteTimer: 0,
    };
  }

  public clearInputs() {
    this.keys = {};
    this.mouseDown = false;
  }

  public setViewport(w: number, h: number) {
    this.viewW = w;
    this.viewH = h;
  }

  public getCameraTarget(): { x: number; y: number; name: string; activePlayer: Player | null } {
    if (this.ambient) {
      const aliveBots = this.players.filter((p) => p.alive && !p.inPlane);
      if (aliveBots.length > 0) {
        const focus = aliveBots[0];
        return {
          x: focus.x + Math.cos(this.ambientAngle) * 140,
          y: focus.y + Math.sin(this.ambientAngle * 0.7) * 100,
          name: focus.name,
          activePlayer: null,
        };
      }
      return { x: MAP_CENTER, y: MAP_CENTER, name: '', activePlayer: null };
    }
    const me = this.me;
    if (!me) return { x: MAP_CENTER, y: MAP_CENTER, name: '', activePlayer: null };
    if (me.alive) {
      if (me.inPlane) return { x: this.plane.x, y: this.plane.y, name: me.name, activePlayer: null };
      return { x: me.x, y: me.y, name: me.name, activePlayer: me };
    }
    let t = me.by;
    let guard = 0;
    while (t && !t.alive && guard++ < 25) {
      t = t.by;
    }
    const target = t && t.alive ? t : this.players.find((q) => q.alive) || me;
    return { x: target.x, y: target.y, name: target.name, activePlayer: target };
  }

  public getNearbyAction(): {
    type: 'chest' | 'loot' | 'door';
    chest?: Chest;
    item?: LootItem;
    door?: import('./types').BuildingDoor;
    index?: number;
    swap?: boolean;
  } | null {
    const me = this.me;
    if (!me || !me.alive || me.inPlane || me.dropTime > 0) return null;

    let bestChest: Chest | null = null;
    let bestChestDist = 64;
    for (const c of this.chests) {
      if (c.opened) continue;
      const d = hyp(c.x - me.x, c.y - me.y);
      if (d < bestChestDist) {
        bestChestDist = d;
        bestChest = c;
      }
    }

    let bestIdx = -1;
    let bestDist = 48;
    for (let i = 0; i < this.loot.length; i++) {
      const l = this.loot[i];
      const d = hyp(l.x - me.x, l.y - me.y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    let bestDoor: import('./types').BuildingDoor | null = null;
    let bestDoorDist = 72;
    for (const d of this.doors) {
      const cx = d.x + d.w / 2;
      const cy = d.y + d.h / 2;
      const dist = hyp(cx - me.x, cy - me.y);
      if (dist < bestDoorDist) {
        bestDoorDist = dist;
        bestDoor = d;
      }
    }

    if (
      bestDoor &&
      (!bestChest || bestDoorDist < bestChestDist) &&
      (bestIdx < 0 || bestDoorDist < bestDist)
    ) {
      return { type: 'door', door: bestDoor };
    }

    if (bestChest) {
      return { type: 'chest', chest: bestChest };
    }

    if (bestIdx < 0) return null;
    const item = this.loot[bestIdx];
    const hasEmpty = me.inv.includes(-1);
    const swap =
      item.t === 'w' &&
      !hasEmpty &&
      !(isStackable(item.w) && me.inv.includes(item.w)) &&
      me.sl > 0 &&
      isGun(me.w) &&
      isGun(item.w) &&
      !me.inv.includes(item.w);

    return { type: 'loot', item, index: bestIdx, swap };
  }

  public selectSlot(i: number) {
    const me = this.me;
    if (!me || !me.alive || me.inPlane || me.dropTime > 0 || this.paused) return;
    if (i >= 0 && i < 6 && me.inv[i] >= 0) {
      if (this.online) {
        this.sendWs({ type: 'selectSlot', slot: i });
        this.sfx('ui');
        return;
      }
      me.sl = i;
      me.w = me.inv[i];
      if (me.hl && me.w !== me.hw) {
        me.hl = 0;
        me.ht = 0;
        me.hw = 0;
      }
      this.sfx('ui');
      this.emitHud();
    }
  }

  public cycleSlot(dir: 1 | -1) {
    const me = this.me;
    if (!me || !me.alive || me.inPlane || me.dropTime > 0 || this.paused) return;
    let i = me.sl;
    for (let n = 0; n < 6; n++) {
      i = (i + (dir > 0 ? 1 : 5)) % 6;
      if (me.inv[i] >= 0) {
        this.selectSlot(i);
        break;
      }
    }
  }

  public swapSlots(fromIdx: number, toIdx: number) {
    const me = this.me;
    if (!me || !me.alive || me.inPlane || me.dropTime > 0) return;
    if (fromIdx <= 0 || toIdx <= 0 || fromIdx === toIdx || fromIdx >= 6 || toIdx >= 6) return;
    if (me.inv[fromIdx] < 0) return;
    if (this.online) {
      this.sendWs({ type: 'swapSlots', from: fromIdx, to: toIdx });
      this.sfx('ui');
      return;
    }

    [me.inv[fromIdx], me.inv[toIdx]] = [me.inv[toIdx], me.inv[fromIdx]];
    [me.invRarity[fromIdx], me.invRarity[toIdx]] = [
      me.invRarity[toIdx],
      me.invRarity[fromIdx],
    ];

    if (me.sl === fromIdx) me.sl = toIdx;
    else if (me.sl === toIdx) me.sl = fromIdx;

    me.w = me.inv[me.sl];
    this.sfx('ui');
    this.emitHud();
  }

  public dropSlot(slotIdx: number) {
    const me = this.me;
    if (!me || !me.alive || me.inPlane || me.dropTime > 0) return;
    if (slotIdx <= 0 || slotIdx >= 6) return;
    const wi = me.inv[slotIdx];
    if (wi < 0) return;
    if (this.online) {
      this.sendWs({ type: 'dropSlot', slot: slotIdx });
      this.sfx('pick');
      return;
    }

    const rarity = me.invRarity[slotIdx] || 0;
    const n = isStackable(wi) ? this.countItem(me, wi) : 1;
    const mag = WP[wi]?.mag !== undefined ? (me.am[wi] ?? WP[wi].mag) : undefined;
    me.inv[slotIdx] = -1;
    me.invRarity[slotIdx] = 0;
    if (isStackable(wi)) this.setItemCount(me, wi, 0);

    this.loot.push({
      id: this.nextId++,
      x: me.x + rnd(-22, 22),
      y: me.y + rnd(-22, 22),
      t: 'w',
      w: wi,
      r: rarity,
      n,
      mag,
    });

    if (me.sl === slotIdx) {
      me.sl = 0;
      me.w = 0;
      me.hl = 0;
      me.ht = 0;
      me.hw = 0;
    }
    this.sfx('pick');
    this.emitHud();
  }

  public pickUpNearest() {
    const me = this.me;
    if (!me || !me.alive || me.inPlane || me.dropTime > 0 || this.paused) return;
    const action = this.getNearbyAction();
    if (!action) return;
    if (this.online) {
      this.sendWs({ type: 'pick' });
      if (action.type === 'door' && action.door) {
        this.sfx(action.door.open ? 'doorClose' : 'doorOpen');
      } else {
        this.sfx(action.type === 'chest' ? 'chest' : 'pick');
      }
      return;
    }

    if (action.type === 'door' && action.door) {
      action.door.open = !action.door.open;
      if (action.door.open) {
        action.door.openDir = computeDoorOpenDir(action.door, me);
      }
      this.sfx(action.door.open ? 'doorOpen' : 'doorClose');
      this.emitHud();
      return;
    }

    if (action.type === 'chest' && action.chest) {
      this.openChest(action.chest, me);
      this.emitHud();
      return;
    }

    const item = action.item;
    const index = action.index;
    if (!item || index === undefined) return;

    if (item.t === 'a') {
      if (this.pickupAmmoPack(me, item)) {
        this.loot.splice(index, 1);
      } else {
        return;
      }
    } else if (item.t === 'w') {
      if (this.pickupWeaponOrItem(me, item)) {
        this.loot.splice(index, 1);
      } else if (
        me.sl > 0 &&
        isGun(me.w) &&
        isGun(item.w) &&
        !me.inv.includes(item.w)
      ) {
        const oldW = me.inv[me.sl];
        const oldR = me.invRarity[me.sl] || 0;
        const oldMag = WP[oldW]?.mag !== undefined ? (me.am[oldW] ?? WP[oldW].mag) : undefined;
        me.inv[me.sl] = item.w;
        me.invRarity[me.sl] = item.r;
        me.w = item.w;
        this.initGunAmmoOnPickup(me, item);
        this.loot[index] = {
          id: this.nextId++,
          x: me.x,
          y: me.y,
          t: 'w',
          w: oldW,
          r: oldR,
          mag: oldMag,
        };
      } else {
        return;
      }
    } else if (item.t === 'h') {
      if (me.hp >= 100) return;
      me.hp = Math.min(100, me.hp + 30);
      this.loot.splice(index, 1);
    } else {
      if (me.sh >= 100) return;
      me.sh = Math.min(100, me.sh + 30);
      this.loot.splice(index, 1);
    }
    this.sfx('pick');
    this.emitHud();
  }

  private openChest(chest: Chest, opener: Player) {
    if (chest.opened) return;
    chest.opened = true;
    this.spawnParticles(chest.x, chest.y, chest.golden ? '#fbbf24' : '#c08457', 16);
    this.shockwaves.push({
      x: chest.x,
      y: chest.y,
      r: 8,
      mr: 48,
      l: 0.24,
      ml: 0.24,
      c: chest.golden ? '#fbbf24' : '#e0a96d',
    });
    if (opener === this.me) {
      this.sfx('chest');
    } else {
      this.sfxAt('chest', chest.x, chest.y);
    }

    const boost = chest.golden ? 0.36 : 0.14;
    const weaponPick = chest.golden
      ? Math.random() < 0.24
        ? 9
        : 2 + Math.floor(Math.random() * 4)
      : Math.random() < 0.18
        ? 5
        : 1 + Math.floor(Math.random() * 4);
    const utilRoll = Math.random();
    const utilWeapon =
      utilRoll < 0.30
        ? 7
        : utilRoll < 0.52
          ? 8
          : utilRoll < 0.76
            ? 12
            : utilRoll < 0.88
              ? 10
              : 11;
    const itemsToDrop: { t: 'w' | 'a'; w: number; r: RarityTier; ammoType?: AmmoType; n?: number }[] = [
      { t: 'w', w: weaponPick, r: rollRarity(boost) },
      { t: 'w', w: utilWeapon, r: 0, n: utilWeapon === 12 ? (chest.golden ? 3 : 2) : undefined },
    ];
    const wAmmoType = WP[weaponPick]?.ammoType;
    if (wAmmoType) {
      const packAmt = Math.round(AMMO_INFO[wAmmoType].packAmount * (chest.golden ? 1.5 : 1));
      itemsToDrop.push({ t: 'a', w: 0, r: 0, ammoType: wAmmoType, n: packAmt });
    }
    if (chest.golden || Math.random() < 0.5) {
      const r2 = Math.random();
      const bw = r2 < 0.28 ? 6 : r2 < 0.50 ? 8 : r2 < 0.74 ? 12 : r2 < 0.87 ? 10 : 11;
      itemsToDrop.push({ t: 'w', w: bw, r: 0, n: bw === 12 ? 2 : undefined });
    }

    itemsToDrop.forEach((entry, idx) => {
      const ang = (idx / itemsToDrop.length) * Math.PI * 2 + rnd(-0.3, 0.3);
      this.loot.push({
        id: this.nextId++,
        x: chest.x + Math.cos(ang) * 28,
        y: chest.y + Math.sin(ang) * 28,
        t: entry.t,
        w: entry.w,
        r: entry.r,
        ammoType: entry.ammoType,
        n: entry.n,
      });
    });
  }

  public triggerReload() {
    const me = this.me;
    if (!me || !me.alive || me.inPlane || me.dropTime > 0 || this.paused) return;
    if (this.online) {
      const w = WP[me.w];
      if (!w?.mag || !w.ammoType || me.rl > 0) return;
      if ((me.am[me.w] ?? 0) >= w.mag || (me.ra?.[w.ammoType] || 0) <= 0) return;
      this.sendWs({ type: 'reload' });
      this.sfx('reload');
      return;
    }
    this.startReload(me);
  }

  private startReload(p: Player) {
    const w = WP[p.w];
    if (!w.mag || p.rl > 0) return;
    const current = p.am[p.w] ?? w.mag;
    if (current >= w.mag) return;
    if (w.ammoType) {
      const reserve = p.ra?.[w.ammoType] || 0;
      if (reserve <= 0) return;
    }
    p.rl = p.rt = w.reloadTime || 1.5;
    p.rw = p.w;
    if (p === this.me) {
      this.sfx('reload');
    }
  }

  public step(rawDt: number) {
    if (this.paused) return;
    const dt = Math.min(rawDt, 0.05);

    if (this.deathCamPlaying) {
      this.stepDeathCam(dt);
      return;
    }

    if (this.ambient) {
      this.ambientAngle += dt * 0.25;
      this.updateSimulation(dt);
      const alive = this.players.filter((p) => p.alive).length;
      if (alive <= 2) {
        this.initAmbientWorld();
      }
      return;
    }

    if (this.online) {
      this.stepOnlineClient(dt);
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }

    this.updateSimulation(dt);

    // Smooth camera FOV zoom-out when holding a Sniper or skydiving
    const me = this.me;
    const targetZoom =
      !this.ambient && me && me.alive
        ? me.inPlane || me.dropTime > 0
          ? 0.84
          : isSniper(me.w)
            ? 0.72
            : 1.0
        : 1.0;
    this.cameraZoom += (targetZoom - this.cameraZoom) * Math.min(1, dt * 6.5);

    // Record 3-second Death Cam ring buffer while player is alive
    if (me && me.alive && !me.fin) {
      this.deathCamElapsed += dt;
      this.deathCamAcc += dt;
      if (this.deathCamAcc >= 0.033) {
        this.deathCamAcc = 0;
        this.captureDeathCamFrame(me);
      }
    }

    this.hudAcc += dt;
    if (this.hudAcc >= 0.055) {
      this.hudAcc = 0;
      this.emitHud();
    }
  }

  private updateSimulation(dt: number) {
    this.elapsed += dt;

    // Update building roof fade based on active player/spectated player inside building
    const camInfo = this.getCameraTarget();
    const camPlayer = camInfo.activePlayer;
    for (const f of this.floors) {
      const inside =
        camPlayer !== null &&
        camPlayer.dropTime <= 0 &&
        !camPlayer.inPlane &&
        camPlayer.x >= f.x &&
        camPlayer.x <= f.x + f.w &&
        camPlayer.y >= f.y &&
        camPlayer.y <= f.y + f.h;
      const targetAlpha = inside ? 0 : 1;
      f.roofAlpha += (targetAlpha - f.roofAlpha) * Math.min(1, dt * 10);
    }

    for (const d of this.doors) {
      const target = d.open ? (d.openDir ?? (d.horizontal ? -1 : 1)) : 0;
      const cur = d.openProgress ?? target;
      d.openProgress = cur + (target - cur) * Math.min(1, dt * 14);
    }

    // Update Drop Plane flight
    if (this.plane.active) {
      this.plane.progress += dt / 16.5;
      const p = Math.min(1, this.plane.progress);
      this.plane.x = this.plane.sx + (this.plane.ex - this.plane.sx) * p;
      this.plane.y = this.plane.sy + (this.plane.ey - this.plane.sy) * p;

      for (const pl of this.players) {
        if (!pl.alive || !pl.inPlane) continue;
        pl.x = this.plane.x;
        pl.y = this.plane.y;
        if (pl.bot && p >= pl.planeJumpAt) {
          pl.inPlane = false;
          pl.dropTime = 1.6;
          pl.dropMax = 1.6;
          // Bots pick nearest POI to plane position so they land at real towns!
          let bestPoi = POIS[Math.floor(Math.random() * POIS.length)];
          let bestD = 1e9;
          for (const poi of POIS) {
            const d = hyp(poi.x - this.plane.x, poi.y - this.plane.y);
            if (d < bestD && Math.random() < 0.75) {
              bestD = d;
              bestPoi = poi;
            }
          }
          pl.tx = bestPoi.x + rnd(-260, 260);
          pl.ty = bestPoi.y + rnd(-260, 260);
        }
      }

      if (this.plane.progress >= 1) {
        this.plane.active = false;
        for (const pl of this.players) {
          if (pl.alive && pl.inPlane) {
            pl.inPlane = false;
            pl.dropTime = 1.6;
            pl.dropMax = 1.6;
          }
        }
      }
    }

    this.updateStorm(dt);
    this.stormTick += dt;
    const tick = this.stormTick >= 1;
    if (tick) this.stormTick -= 1;

    this.shake = Math.max(0, this.shake - dt);
    this.hitmarker = Math.max(0, this.hitmarker - dt);
    this.nextAir -= dt;

    if (this.nextAir <= 0) {
      this.nextAir = 42;
      const a = rnd(0, Math.PI * 2);
      const d = rnd(0, this.storm.r * 0.65);
      this.loot.push({
        id: this.nextId++,
        x: this.storm.x + Math.cos(a) * d,
        y: this.storm.y + Math.sin(a) * d,
        t: 'w',
        w: Math.random() < 0.65 ? 9 : 5,
        r: Math.random() < 0.45 ? 5 : 4,
        air: 1,
      });
      this.pushFeed('Supply Drop landed inside the safe zone', '#ffd24d');
      if (!this.ambient) this.sfx('air');
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.94;
      q.vy *= 0.94;
      q.l -= dt;
      if (q.l <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.l -= dt;
      s.r = s.mr * (1 - s.l / s.ml);
      if (s.l <= 0) this.shockwaves.splice(i, 1);
    }

    for (const o of this.obstacles) {
      if (o.hitFlash > 0) o.hitFlash = Math.max(0, o.hitFlash - dt);
    }

    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      this.stepGrenadePhysics(g, dt);
      g.l -= dt;
      if (g.l <= 0) {
        if (g.kind === 'impulse') {
          this.impulseAt(g.x, g.y, 225, 1);
        } else if (g.kind === 'reverse') {
          this.impulseAt(g.x, g.y, 250, -1);
        } else {
          this.explodeAt(g.x, g.y, 110, 68, g.o);
        }
        this.grenades.splice(i, 1);
      }
    }

    const kb = this.callbacks.getKeybinds();

    for (const p of this.players) {
      if (!p.alive) continue;

      if (p.emoteTimer > 0) {
        p.emoteTimer -= dt;
        if (p.emoteTimer <= 0) p.emote = null;
      }

      if (p.inPlane) continue;

      if (p.dropTime > 0) {
        p.dropTime = Math.max(0, p.dropTime - dt);
        let vx = 0;
        let vy = 0;
        if (p.bot) {
          vx = p.tx - p.x;
          vy = p.ty - p.y;
          p.a = Math.atan2(vy, vx);
        } else {
          vx =
            (this.keys[kb.right] || this.keys.arrowright ? 1 : 0) -
            (this.keys[kb.left] || this.keys.arrowleft ? 1 : 0);
          vy =
            (this.keys[kb.down] || this.keys.arrowdown ? 1 : 0) -
            (this.keys[kb.up] || this.keys.arrowup ? 1 : 0);
          p.a = Math.atan2(this.mouseY - this.viewH / 2, this.mouseX - this.viewW / 2);
        }
        if (vx || vy) {
          const l = hyp(vx, vy);
          p.x += (vx / l) * 380 * dt;
          p.y += (vy / l) * 380 * dt;
        }
        p.x = Math.max(ISLAND_MARGIN, Math.min(MAP_SIZE - ISLAND_MARGIN, p.x));
        p.y = Math.max(ISLAND_MARGIN, Math.min(MAP_SIZE - ISLAND_MARGIN, p.y));
        continue;
      }

      if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt);
      if (p.recoil > 0) p.recoil = Math.max(0, p.recoil - dt * 8);

      let vx = 0;
      let vy = 0;

      if (p.bot) {
        this.runBotAI(p, dt);
        const l0 = hyp(p.vx, p.vy) || 1;
        const tx = p.vx / l0;
        const ty = p.vy / l0;
        const k = Math.min(1, dt * 9);
        p.mx = (p.mx || 0) + (tx - (p.mx || 0)) * k;
        p.my = (p.my || 0) + (ty - (p.my || 0)) * k;
        const mv = p.vx || p.vy;
        vx = mv ? p.mx : 0;
        vy = mv ? p.my : 0;
      } else {
        vx =
          (this.keys[kb.right] || this.keys.arrowright ? 1 : 0) -
          (this.keys[kb.left] || this.keys.arrowleft ? 1 : 0);
        vy =
          (this.keys[kb.down] || this.keys.arrowdown ? 1 : 0) -
          (this.keys[kb.up] || this.keys.arrowup ? 1 : 0);
        p.a = Math.atan2(this.mouseY - this.viewH / 2, this.mouseX - this.viewW / 2);
        if (this.mouseDown) this.shoot(p);
      }

      let sp = p.bot ? 215 : 245;
      const inWater =
        p.x < ISLAND_MARGIN ||
        p.x > MAP_SIZE - ISLAND_MARGIN ||
        p.y < ISLAND_MARGIN ||
        p.y > MAP_SIZE - ISLAND_MARGIN;
      if (inWater) sp *= 0.65;

      const isHealing = (p.hl ?? 0) > 0;
      if (isHealing) sp *= 0.55;

      if (!p.bot) {
        if (!isHealing && this.keys[kb.sprint] && (vx || vy) && p.st > 0) {
          sp *= 1.42;
          p.st = Math.max(0, p.st - 34 * dt);
        } else {
          p.st = Math.min(100, p.st + 18 * dt);
        }
      }

      if (vx || vy) {
        const l = hyp(vx, vy);
        p.x += (vx / l) * sp * dt;
        p.y += (vy / l) * sp * dt;
      }

      if (p.kvx || p.kvy) {
        const kDist = hyp(p.kvx || 0, p.kvy || 0) * dt;
        const kSteps = Math.max(1, Math.ceil(kDist / 10));
        for (let ks = 0; ks < kSteps; ks++) {
          p.x += ((p.kvx || 0) * dt) / kSteps;
          p.y += ((p.kvy || 0) * dt) / kSteps;
          this.resolveWalls(p, PLAYER_RADIUS);
        }
        const damp = Math.pow(0.04, dt);
        p.kvx = Math.abs(p.kvx || 0) < 8 ? 0 : (p.kvx || 0) * damp;
        p.kvy = Math.abs(p.kvy || 0) < 8 ? 0 : (p.kvy || 0) * damp;
      }

      p.x = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE - PLAYER_RADIUS, p.x));
      p.y = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE - PLAYER_RADIUS, p.y));
      p.cd -= dt;
      p.pc -= dt;

      if ((p.hl ?? 0) > 0) {
        p.hl = (p.hl || 0) - dt;
        if (p.w !== p.hw || this.countItem(p, p.hw || 0) < 1) {
          p.hl = 0;
          p.ht = 0;
          p.hw = 0;
        } else if ((p.hl || 0) <= 0) {
          const completedItem = p.hw || p.w;
          p.hl = 0;
          p.ht = 0;
          p.hw = 0;
          this.useConsumable(p, completedItem);
        }
      }

      if (p.rl > 0) {
        p.rl -= dt;
        if (p.w !== p.rw) {
          p.rl = 0;
        } else if (p.rl <= 0) {
          const wDef = WP[p.w];
          const magCap = wDef.mag || 0;
          const curMag = p.am[p.w] ?? 0;
          if (wDef.ammoType && p.ra) {
            const avail = p.ra[wDef.ammoType] || 0;
            const take = Math.min(magCap - curMag, avail);
            p.am[p.w] = curMag + take;
            p.ra[wDef.ammoType] = Math.max(0, avail - take);
          } else {
            p.am[p.w] = magCap;
          }
        }
      } else if (WP[p.w].mag && p.am[p.w] === 0) {
        this.startReload(p);
      }

      p.pvx = (p.x - (p.px ?? p.x)) / dt;
      p.pvy = (p.y - (p.py ?? p.y)) / dt;
      p.px = p.x;
      p.py = p.y;

      for (const q of this.players) {
        if (q !== p && q.alive && !q.inPlane && q.dropTime <= 0) {
          const d = hyp(p.x - q.x, p.y - q.y);
          if (d > 0 && d < 30) {
            const k = (30 - d) / 2;
            p.x += ((p.x - q.x) / d) * k;
            p.y += ((p.y - q.y) / d) * k;
          }
        }
      }

      for (const o of this.obstacles) {
        const colR = o.kind === 'tree' ? o.r * 0.45 : o.r;
        const d = hyp(p.x - o.x, p.y - o.y);
        const m = colR + PLAYER_RADIUS;
        if (d < m && d > 0) {
          p.x = o.x + ((p.x - o.x) / d) * m;
          p.y = o.y + ((p.y - o.y) / d) * m;
        }
      }

      this.resolveWalls(p, PLAYER_RADIUS);

      // Auto-collect Ammo Packs when walking right over them
      for (let i = this.loot.length - 1; i >= 0; i--) {
        const l = this.loot[i];
        if (l.t !== 'a' || hyp(p.x - l.x, p.y - l.y) > 30) continue;
        if (this.pickupAmmoPack(p, l)) {
          if (p === this.me) this.sfx('pick');
          this.loot.splice(i, 1);
        }
      }

      if (p.bot) {
        for (const d of this.doors) {
          if (d.open) continue;
          const dcx = d.x + d.w / 2;
          const dcy = d.y + d.h / 2;
          if (hyp(p.x - dcx, p.y - dcy) < 56) {
            d.open = true;
            d.openDir = computeDoorOpenDir(d, p);
            this.sfxAt('doorOpen', dcx, dcy);
          }
        }
        for (const c of this.chests) {
          if (!c.opened && hyp(p.x - c.x, p.y - c.y) < 42) {
            this.openChest(c, p);
            if (p.targetChest === c) p.targetChest = null;
          }
        }

        for (let i = this.loot.length - 1; i >= 0; i--) {
          const l = this.loot[i];
          if (hyp(p.x - l.x, p.y - l.y) > 30) continue;
          if (l.t === 'a') {
            if (this.pickupAmmoPack(p, l)) this.loot.splice(i, 1);
          } else if (l.t === 'w') {
            if (this.pickupWeaponOrItem(p, l)) this.loot.splice(i, 1);
          } else if (l.t === 'h') {
            if (p.hp < 100) {
              p.hp = Math.min(100, p.hp + 30);
              this.loot.splice(i, 1);
            }
          } else if (p.sh < 100) {
            p.sh = Math.min(100, p.sh + 30);
            this.loot.splice(i, 1);
          }
        }

        // Unstuck steering recovery around building walls
        p.sck = (p.sck || 0) + dt;
        if (p.sck > 0.65) {
          if ((vx || vy) && hyp(p.x - (p.sx ?? p.x), p.y - (p.sy ?? p.y)) < 14) {
            p.tt = rnd(0.8, 1.8);
            p.lb = null;
            p.targetChest = null;
            const escapeAng = Math.atan2(vy, vx) + (Math.random() < 0.5 ? 1.57 : -1.57);
            p.tx = p.x + Math.cos(escapeAng) * 260;
            p.ty = p.y + Math.sin(escapeAng) * 260;
          }
          p.sx = p.x;
          p.sy = p.y;
          p.sck = 0;
        }
      }

      if (tick && hyp(p.x - this.storm.x, p.y - this.storm.y) > this.storm.r) {
        this.damagePlayer(p, 2 + this.storm.i * 1.5, null);
      }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.px = b.x;
      b.py = b.y;
      b.l -= dt;
      let dead = b.l <= 0;
      const steps = Math.max(1, Math.ceil((hyp(b.vx, b.vy) * dt) / 10));
      for (let s = 0; s < steps && !dead; s++) {
        b.x += (b.vx * dt) / steps;
        b.y += (b.vy * dt) / steps;
        dead = this.checkBulletHit(b);
      }
      if (dead) this.bullets.splice(i, 1);
    }

    for (const f of this.feed) f.t -= dt;
    this.feed = this.feed.filter((f) => f.t > 0);

    if (this.ambient) return;

    const alivePlayers = this.players.filter((q) => q.alive);
    const al = alivePlayers.length;
    const me = this.me;

    if (me && this.isArena && me.alive && !me.inPlane) {
      me.pt2 += dt;
      if (me.pt2 >= 30) {
        me.pt2 -= 30;
        me.pts++;
        this.spawnParticles(me.x, me.y - 10, '#ffd24d', 0, '+1 PT');
      }
      for (const [n, val] of [
        [12, 1],
        [8, 2],
        [4, 3],
        [2, 4],
      ] as const) {
        const key = (`m${n}`) as 'm8' | 'm4' | 'm2';
        if (al <= n && !me[key]) {
          me[key] = 1;
          me.pts += val;
          this.pushFeed(`Top ${n}: +${val} Arena points`, '#ffd24d');
        }
      }
    }

    if (me && !me.fin) {
      if (!me.alive) {
        this.finishMatch('ELIMINATED');
      } else if (al <= 1) {
        this.finishMatch('VICTORY');
      }
    } else if (me && me.fin && al <= 1 && !this.over) {
      this.over = true;
      const winner = alivePlayers[0]?.name || 'Unknown';
      if (this.resultCache) {
        this.resultCache.winnerName = winner;
      }
      this.callbacks.onAllEliminated(winner);
    }
  }

  private stepGrenadePhysics(g: Grenade, dt: number) {
    const gr = 6.5;

    // 2.5D vertical arc + gravity + ground bounce
    g.vz = (g.vz ?? 0) - 620 * dt;
    g.z = (g.z ?? 0) + g.vz * dt;
    if (g.z <= 0) {
      g.z = 0;
      if (Math.abs(g.vz) > 55) {
        g.vz = -g.vz * 0.44;
        g.vx *= 0.88;
        g.vy *= 0.88;
        this.sfxAt('bounce', g.x, g.y);
      } else {
        g.vz = 0;
        const rollDrag = Math.pow(0.06, dt);
        g.vx *= rollDrag;
        g.vy *= rollDrag;
      }
    } else {
      const airDrag = Math.pow(0.55, dt);
      g.vx *= airDrag;
      g.vy *= airDrag;
    }

    const stepDist = hyp(g.vx, g.vy) * dt;
    const steps = Math.max(1, Math.ceil(stepDist / 6));
    const bounceRestitution = 0.56;

    const bounceRect = (rx: number, ry: number, rw: number, rh: number) => {
      const nx = Math.max(rx, Math.min(g.x, rx + rw));
      const ny = Math.max(ry, Math.min(g.y, ry + rh));
      let dx = g.x - nx;
      let dy = g.y - ny;
      let d = hyp(dx, dy);

      if (d === 0 && g.x >= rx && g.x <= rx + rw && g.y >= ry && g.y <= ry + rh) {
        const leftPen = g.x - rx;
        const rightPen = rx + rw - g.x;
        const topPen = g.y - ry;
        const botPen = ry + rh - g.y;
        const minPen = Math.min(leftPen, rightPen, topPen, botPen);
        if (minPen === leftPen) { dx = -1; dy = 0; g.x = rx - gr; }
        else if (minPen === rightPen) { dx = 1; dy = 0; g.x = rx + rw + gr; }
        else if (minPen === topPen) { dx = 0; dy = -1; g.y = ry - gr; }
        else { dx = 0; dy = 1; g.y = ry + rh + gr; }
        d = 1;
      } else if (d < gr && d > 0) {
        dx /= d;
        dy /= d;
        g.x = nx + dx * (gr + 0.4);
        g.y = ny + dy * (gr + 0.4);
      } else {
        return;
      }

      const vn = g.vx * dx + g.vy * dy;
      if (vn < 0) {
        g.vx -= (1 + bounceRestitution) * vn * dx;
        g.vy -= (1 + bounceRestitution) * vn * dy;
        if (Math.abs(vn) > 75) {
          this.sfxAt('bounce', g.x, g.y);
          this.spawnParticles(g.x, g.y, '#cbd5e1', 2);
        }
      }
    };

    for (let s = 0; s < steps; s++) {
      g.x += (g.vx * dt) / steps;
      g.y += (g.vy * dt) / steps;

      for (const w of this.walls) {
        bounceRect(w.x, w.y, w.w, w.h);
      }
      for (const d of this.doors) {
        if (!d.open) {
          bounceRect(d.x, d.y, d.w, d.h);
        }
      }
      for (const o of this.obstacles) {
        const colR = o.kind === 'tree' ? o.r * 0.45 : o.r;
        const dx = g.x - o.x;
        const dy = g.y - o.y;
        const d = hyp(dx, dy);
        const minD = colR + gr;
        if (d < minD && d > 0) {
          const ux = dx / d;
          const uy = dy / d;
          g.x = o.x + ux * (minD + 0.4);
          g.y = o.y + uy * (minD + 0.4);
          const vn = g.vx * ux + g.vy * uy;
          if (vn < 0) {
            g.vx -= (1 + 0.52) * vn * ux;
            g.vy -= (1 + 0.52) * vn * uy;
          }
        }
      }
      g.x = Math.max(gr, Math.min(MAP_SIZE - gr, g.x));
      g.y = Math.max(gr, Math.min(MAP_SIZE - gr, g.y));
    }
  }

  private impulseAt(x: number, y: number, radius: number, dir: 1 | -1) {
    const color = dir === 1 ? '#38bdf8' : '#c084fc';
    this.spawnParticles(x, y, color, 28);
    this.shockwaves.push({
      x,
      y,
      r: dir === 1 ? 8 : radius,
      mr: radius,
      l: 0.34,
      ml: 0.34,
      c: color,
    });
    this.sfxAt(dir === 1 ? 'impulse' : 'reverse', x, y);

    const cam = this.getCameraTarget();
    if (hyp(x - cam.x, y - cam.y) < 620) {
      this.shake = Math.max(this.shake, 0.36);
    }

    for (const p of this.players) {
      if (!p.alive || p.inPlane || p.dropTime > 0) continue;
      const dx = p.x - x;
      const dy = p.y - y;
      const d = hyp(dx, dy);
      if (d > radius) continue;
      const falloff = Math.max(0.45, 1 - d / (radius * 1.12));
      const ang = d < 4 ? p.a : Math.atan2(dy, dx);
      if (dir === 1) {
        const force = 1580 * falloff;
        p.kvx = (p.kvx || 0) + Math.cos(ang) * force;
        p.kvy = (p.kvy || 0) + Math.sin(ang) * force;
      } else {
        const force = d < 10 ? 0 : Math.min(d * 8.5, 1620 * Math.max(0.5, 1 - d / (radius * 1.2)));
        p.kvx = (p.kvx || 0) - Math.cos(ang) * force;
        p.kvy = (p.kvy || 0) - Math.sin(ang) * force;
      }
    }
  }

  private explodeAt(x: number, y: number, radius: number, maxDmg: number, attacker: Player | null) {
    this.spawnParticles(x, y, '#ffb340', 26);
    this.shockwaves.push({
      x,
      y,
      r: 8,
      mr: radius,
      l: 0.28,
      ml: 0.28,
      c: '#ffb340',
    });
    this.sfxAt('boom', x, y);

    for (let k = this.obstacles.length - 1; k >= 0; k--) {
      if (hyp(this.obstacles[k].x - x, this.obstacles[k].y - y) < radius) {
        this.damageObstacle(k, 80, attacker);
      }
    }

    const cam = this.getCameraTarget();
    if (hyp(x - cam.x, y - cam.y) < 550) {
      this.shake = Math.max(this.shake, 0.36);
      if (this.me && hyp(x - this.me.x, y - this.me.y) < 200) {
        this.hitstop = Math.max(this.hitstop, 0.035);
      }
    }

    for (const p of this.players) {
      if (p.alive && !p.inPlane && p.dropTime <= 0) {
        const d = hyp(p.x - x, p.y - y);
        if (d < radius) {
          this.damagePlayer(p, maxDmg * (1 - d / (radius * 1.35)), attacker);
        }
      }
    }
  }

  private updateStorm(dt: number) {
    const s = this.storm;
    s.t += dt;
    if (s.i >= STORM_RADII.length - 1) return;

    if (!s.set) {
      s.set = true;
      s.fx = s.x;
      s.fy = s.y;
      s.fr = s.r;
      const a = rnd(0, Math.PI * 2);
      const d = rnd(0, Math.max(0, s.r - STORM_RADII[s.i + 1]));
      s.tx = s.x + Math.cos(a) * d;
      s.ty = s.y + Math.sin(a) * d;
    }

    if (s.t >= 20 && s.t < 40) {
      const k = (s.t - 20) / 20;
      s.x = s.fx + (s.tx - s.fx) * k;
      s.y = s.fy + (s.ty - s.fy) * k;
      s.r = s.fr + (STORM_RADII[s.i + 1] - s.fr) * k;
    } else if (s.t >= 40) {
      s.i++;
      s.t = 0;
      s.set = false;
      s.r = STORM_RADII[s.i];
      s.x = s.tx;
      s.y = s.ty;
    }
  }

  private resolveWalls(p: { x: number; y: number }, r: number) {
    const pushOutRect = (rx: number, ry: number, rw: number, rh: number) => {
      const nx = Math.max(rx, Math.min(p.x, rx + rw));
      const ny = Math.max(ry, Math.min(p.y, ry + rh));
      const dx = p.x - nx;
      const dy = p.y - ny;
      const d = hyp(dx, dy);
      if (d < r) {
        if (d > 0) {
          p.x += (dx / d) * (r - d);
          p.y += (dy / d) * (r - d);
        } else {
          p.y = ry - r;
        }
      }
    };

    for (const w of this.walls) {
      pushOutRect(w.x, w.y, w.w, w.h);
    }
    for (const d of this.doors) {
      if (!d.open) {
        pushOutRect(d.x, d.y, d.w, d.h);
      }
    }
  }

  private checkBulletHit(b: Bullet): boolean {
    for (let k = 0; k < this.obstacles.length; k++) {
      const o = this.obstacles[k];
      const hitR = o.kind === 'tree' ? o.r * 0.48 : o.r;
      if (hyp(b.x - o.x, b.y - o.y) < hitR) {
        this.damageObstacle(k, b.d, b.o);
        if (b.o === this.me) this.hitmarker = 0.1;
        return true;
      }
    }

    for (const w of this.walls) {
      if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
        this.spawnParticles(b.x, b.y, '#c5cad3', 3);
        return true;
      }
    }

    for (const d of this.doors) {
      if (!d.open && b.x > d.x && b.x < d.x + d.w && b.y > d.y && b.y < d.y + d.h) {
        this.spawnParticles(b.x, b.y, '#c98e4b', 4);
        return true;
      }
    }

    for (const p of this.players) {
      if (
        p.alive &&
        !p.inPlane &&
        p.dropTime <= 0 &&
        p !== b.o &&
        hyp(b.x - p.x, b.y - p.y) < PLAYER_RADIUS + 1
      ) {
        this.damagePlayer(p, b.d, b.o);
        return true;
      }
    }
    return false;
  }

  private damageObstacle(idx: number, dmg: number, attacker: Player | null) {
    const o = this.obstacles[idx];
    if (!o) return;
    o.hp -= dmg;
    o.hitFlash = 0.07;
    const chipColor =
      o.kind === 'tree'
        ? '#2b6a3c'
        : o.kind === 'crate'
          ? '#c08457'
          : o.kind === 'barrel'
            ? '#ef4444'
            : '#8a9099';
    this.spawnParticles(o.x, o.y, chipColor, 4);
    if (o.hp <= 0) {
      this.obstacles.splice(idx, 1);
      this.spawnParticles(o.x, o.y, chipColor, 12);
      if (o.kind === 'barrel') {
        this.explodeAt(o.x, o.y, 115, 70, attacker);
      } else if (o.kind === 'crate') {
        const dropW =
          Math.random() < 0.62
            ? 1 + Math.floor(Math.random() * 4)
            : Math.random() < 0.30
              ? 7
              : Math.random() < 0.55
                ? 8
                : Math.random() < 0.80
                  ? 12
                  : 10;
        this.loot.push({
          id: this.nextId++,
          x: o.x,
          y: o.y,
          t: 'w',
          w: dropW,
          r: isStackable(dropW) ? 0 : rollRarity(0.1),
          n: dropW === 12 ? 2 : undefined,
        });
        const crateAmmo = WP[dropW]?.ammoType;
        if (crateAmmo) {
          this.loot.push({
            id: this.nextId++,
            x: o.x + rnd(-16, 16),
            y: o.y + rnd(-16, 16),
            t: 'a',
            w: 0,
            r: 0,
            ammoType: crateAmmo,
            n: AMMO_INFO[crateAmmo].packAmount,
          });
        }
      }
    }
  }

  private damagePlayer(p: Player, amount: number, attacker: Player | null) {
    if (!p.alive || p.inPlane || p.dropTime > 0) return;
    let d = amount;
    if (attacker && attacker !== p) {
      attacker.dm += d;
      if (attacker === this.me) {
        this.hitmarker = 0.16;
      }
    }

    if (p.sh > 0) {
      const absorbed = Math.min(p.sh, d);
      p.sh -= absorbed;
      d -= absorbed;
    }

    p.hp -= d;
    p.hitFlash = 0.08;
    this.spawnParticles(p.x, p.y, p.col, 6, Math.round(amount).toString());

    if (p === this.me) {
      this.shake = Math.max(this.shake, 0.28);
      this.sfx('hurt');
    } else {
      this.sfxAt('hit', p.x, p.y);
    }

    if (p.hp <= 0) {
      p.alive = false;
      p.by = attacker;
      p.td = this.elapsed;
      p.rank = this.players.filter((q) => q.alive).length + 1;

      this.shockwaves.push({
        x: p.x,
        y: p.y,
        r: 6,
        mr: 42,
        l: 0.22,
        ml: 0.22,
        c: p.col,
      });

      if (attacker === this.me) {
        this.sfx('kill');
        this.hitstop = Math.max(this.hitstop, 0.04);
        this.shake = Math.max(this.shake, 0.22);
      } else {
        this.sfxAt('die', p.x, p.y);
      }

      if (attacker) {
        attacker.k++;
        if (attacker === this.me) {
          this.kills++;
          if (this.isArena) {
            this.me.pts += 3;
            this.spawnParticles(this.me.x, this.me.y - 12, '#ffd24d', 0, '+3 PTS');
          }
        }
      }

      p.inv.forEach((wi, idx) => {
        if (wi > 0) {
          this.loot.push({
            id: this.nextId++,
            x: p.x + rnd(-26, 26),
            y: p.y + rnd(-26, 26),
            t: 'w',
            w: wi,
            r: p.invRarity[idx] || 0,
            n: isStackable(wi) ? this.countItem(p, wi) || 1 : 1,
            mag: WP[wi]?.mag !== undefined ? (p.am[wi] ?? WP[wi].mag) : undefined,
          });
        }
      });

      if (p.ra) {
        for (const aType of AMMO_TYPES) {
          const amt = p.ra[aType] || 0;
          if (amt > 0) {
            this.loot.push({
              id: this.nextId++,
              x: p.x + rnd(-26, 26),
              y: p.y + rnd(-26, 26),
              t: 'a',
              w: 0,
              r: 0,
              ammoType: aType,
              n: amt,
            });
          }
        }
      }

      const who = attacker ? attacker.name : 'The storm';
      this.pushFeed(`${who} eliminated ${p.name}`, attacker === this.me ? '#ff7a18' : undefined);
    }
  }

  private getThrowPower(): number {
    const dist = hyp(this.mouseX - this.viewW / 2, this.mouseY - this.viewH / 2);
    return Math.max(0.22, Math.min(1, (dist - 36) / 310));
  }

  private shoot(p: Player, throwPowerOverride?: number) {
    if (p.cd > 0 || p.inPlane || p.dropTime > 0) return;
    const w = WP[p.w];
    const r: RarityTier = p.invRarity[p.sl] || 0;
    const dmg = w.damage * RARITY_TIERS[r].dmgMult;

    if (w.mag) {
      if (p.rl > 0) return;
      if (p.am[p.w] === undefined) p.am[p.w] = w.mag;
      if (p.am[p.w] <= 0) {
        const reserve = w.ammoType && p.ra ? p.ra[w.ammoType] || 0 : 0;
        if (reserve > 0) {
          this.startReload(p);
        } else {
          p.cd = 0.26;
          if (p === this.me) this.sfx('empty');
        }
        return;
      }
      p.am[p.w]--;
    }

    if (w.usable) {
      this.startHeal(p);
      return;
    }

    p.cd = w.fireRate;
    p.recoil = w.melee ? 0 : 1;
    this.sfxAt((`g${p.w}`) as SfxKey, p.x, p.y);

    if (w.throwable) {
      const count = this.countItem(p, p.w);
      if (count < 1) return;
      this.setItemCount(p, p.w, count - 1);
      const kind: Grenade['kind'] =
        p.w === 10 ? 'impulse' : p.w === 11 ? 'reverse' : 'frag';
      const fuse = kind === 'frag' ? 1.35 : 0.78;
      const power = throwPowerOverride ?? (p === this.me ? this.getThrowPower() : 0.65);
      const maxSpd = kind === 'frag' ? 620 : 710;
      const spd = 190 + (maxSpd - 190) * power;
      const pos = { x: p.x + Math.cos(p.a) * 12, y: p.y + Math.sin(p.a) * 12 };
      this.resolveWalls(pos, 7);
      this.grenades.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(p.a) * spd,
        vy: Math.sin(p.a) * spd,
        z: 14,
        vz: 150 + spd * 0.22,
        l: fuse,
        ml: fuse,
        o: p,
        kind,
      });
      if (this.countItem(p, p.w) < 1) {
        p.inv[p.sl] = -1;
        p.invRarity[p.sl] = 0;
        p.sl = 0;
        p.w = 0;
      }
      return;
    }

    if (w.melee) {
      p.pc = 0.2;
      p.hd ^= 1;
      for (const q of this.players) {
        if (q !== p && q.alive && !q.inPlane && q.dropTime <= 0) {
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          if (hyp(dx, dy) < w.range + PLAYER_RADIUS && Math.cos(Math.atan2(dy, dx) - p.a) > 0.5) {
            this.damagePlayer(q, dmg, p);
          }
        }
      }
      for (let k = this.obstacles.length - 1; k >= 0; k--) {
        const o = this.obstacles[k];
        const colR = o.kind === 'tree' ? o.r * 0.45 : o.r;
        const dx = o.x - p.x;
        const dy = o.y - p.y;
        if (hyp(dx, dy) - colR < w.range && Math.cos(Math.atan2(dy, dx) - p.a) > 0.4) {
          this.damageObstacle(k, dmg, p);
          break;
        }
      }
      return;
    }

    const mx = p.x + Math.cos(p.a) * 24;
    const my = p.y + Math.sin(p.a) * 24;
    const bulletColor = r >= 1 ? RARITY_TIERS[r].color : w.color;
    this.spawnParticles(mx, my, bulletColor, 3);
    if (p === this.me && (p.w === 3 || p.w === 5 || p.w === 9)) {
      this.shake = Math.max(this.shake, isSniper(p.w) ? 0.24 : 0.14);
    }

    for (let i = 0; i < w.pellets; i++) {
      const a = p.a + rnd(-w.spread, w.spread) * (p.bot ? 1.35 : 1);
      const bx = p.x + Math.cos(a) * 18;
      const by = p.y + Math.sin(a) * 18;
      this.bullets.push({
        x: bx,
        y: by,
        px: bx,
        py: by,
        vx: Math.cos(a) * w.bulletSpeed,
        vy: Math.sin(a) * w.bulletSpeed,
        l: w.range / w.bulletSpeed,
        o: p,
        d: dmg,
        c: bulletColor,
      });
    }
  }

  private countItem(p: Player, w: number) {
    return w === 6 ? p.gn : p.c[w] || 0;
  }

  private setItemCount(p: Player, w: number, v: number) {
    if (w === 6) p.gn = v;
    else p.c[w] = v;
  }

  private canBotPickup(b: Player, l: LootItem): boolean {
    const idx = b.inv.indexOf(l.w);
    if (idx >= 0) {
      if (isStackable(l.w)) return true;
      return l.r > (b.invRarity[idx] || 0);
    }
    if (b.inv.includes(-1)) return true;
    const minScore = Math.min(...b.inv.slice(1).map((w) => (isGun(w) ? WP[w].damage : 0)));
    return isGun(l.w) && WP[l.w].damage > minScore;
  }

  private startHeal(p: Player) {
    if ((p.hl ?? 0) > 0) return;
    const wId = p.w;
    const wDef = WP[wId];
    if (!wDef?.usable || this.countItem(p, wId) < 1) return;

    if (wId === 7 && p.hp >= 100) return;
    if (wId === 8 && p.sh >= 100) return;
    if (wId === 12 && p.sh >= 50) {
      p.cd = 0.35;
      if (p === this.me) {
        this.sfx('empty');
        if (p.sh < 100) {
          this.spawnParticles(p.x, p.y - 10, '#7dd3fc', 0, 'MAX 50 SHD');
        }
      }
      return;
    }

    p.rl = 0;
    p.rt = 0;
    p.hl = p.ht = wDef.useTime || 5.0;
    p.hw = wId;
    p.cd = 0.15;
    if (p === this.me) {
      this.sfx('healStart');
    }
  }

  private useConsumable(p: Player, w: number) {
    if (this.countItem(p, w) < 1) return;
    if (w === 7) {
      if (p.hp >= 100) return;
      p.hp = 100;
    } else if (w === 12) {
      if (p.sh >= 50) return;
      p.sh = Math.min(50, p.sh + 25);
    } else {
      if (p.sh >= 100) return;
      p.sh = Math.min(100, p.sh + 50);
    }
    this.setItemCount(p, w, this.countItem(p, w) - 1);
    this.spawnParticles(
      p.x,
      p.y,
      w === 7 ? '#ff5c6c' : w === 12 ? '#7dd3fc' : '#38bdf8',
      12
    );
    if (p === this.me) this.sfx('healDone');
    if (this.countItem(p, w) < 1) {
      const k = p.inv.indexOf(w);
      if (k >= 0) {
        p.inv[k] = -1;
        p.invRarity[k] = 0;
      }
      if (p.w === w) {
        p.sl = 0;
        p.w = 0;
      }
    }
  }

  private pickupAmmoPack(p: Player, l: LootItem): boolean {
    const aType = l.ammoType || 'medium';
    if (!p.ra) p.ra = createEmptyReserve();
    const maxCap = AMMO_INFO[aType].max;
    if (p.ra[aType] >= maxCap) return false;
    const add = l.n || AMMO_INFO[aType].packAmount;
    p.ra[aType] = Math.min(maxCap, p.ra[aType] + add);
    return true;
  }

  private initGunAmmoOnPickup(p: Player, l: LootItem) {
    const wDef = WP[l.w];
    if (!wDef?.mag) return;
    if (!p.ra) p.ra = createEmptyReserve();
    if (l.mag !== undefined) {
      p.am[l.w] = Math.max(p.am[l.w] || 0, l.mag);
    } else {
      if (p.am[l.w] === undefined || p.am[l.w] === 0) {
        p.am[l.w] = wDef.mag;
      }
      if (wDef.ammoType) {
        p.ra[wDef.ammoType] = Math.min(
          AMMO_INFO[wDef.ammoType].max,
          (p.ra[wDef.ammoType] || 0) + AMMO_INFO[wDef.ammoType].starterBonus
        );
      }
    }
  }

  private pickupWeaponOrItem(p: Player, l: LootItem): boolean {
    const stackable = isStackable(l.w);
    const existingIdx = p.inv.indexOf(l.w);

    if (stackable && existingIdx >= 0) {
      this.setItemCount(p, l.w, this.countItem(p, l.w) + (l.n || 1));
      return true;
    }

    if (existingIdx >= 0) {
      if (l.r > (p.invRarity[existingIdx] || 0)) {
        p.invRarity[existingIdx] = l.r;
        this.initGunAmmoOnPickup(p, l);
        if (p.bot || p.sl === existingIdx) {
          p.sl = existingIdx;
          p.w = l.w;
        }
        return true;
      }
      return false;
    }

    let empty = p.inv.indexOf(-1);
    if (empty < 0) {
      if (!p.bot || stackable) return false;
      let minIdx = 1;
      for (let i = 2; i < 6; i++) {
        const s1 = (isGun(p.inv[i]) ? WP[p.inv[i]].damage : 0) + (p.invRarity[i] || 0) * 5;
        const s2 =
          (isGun(p.inv[minIdx]) ? WP[p.inv[minIdx]].damage : 0) +
          (p.invRarity[minIdx] || 0) * 5;
        if (s1 < s2) minIdx = i;
      }
      const newScore = (isGun(l.w) ? WP[l.w].damage : 0) + l.r * 5;
      const oldScore =
        (isGun(p.inv[minIdx]) ? WP[p.inv[minIdx]].damage : 0) +
        (p.invRarity[minIdx] || 0) * 5;
      if (oldScore >= newScore) return false;
      empty = minIdx;
    }

    p.inv[empty] = l.w;
    p.invRarity[empty] = l.r;
    if (stackable) {
      this.setItemCount(p, l.w, l.n || 1);
      return true;
    }
    this.initGunAmmoOnPickup(p, l);
    if (p.bot || p.w === 0 || (isGun(l.w) && (!isGun(p.w) || WP[l.w].damage > WP[p.w].damage))) {
      p.sl = empty;
      p.w = l.w;
    }
    return true;
  }

  private hasLineOfSight(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
    const n = Math.ceil(hyp(b.x - a.x, b.y - a.y) / 14);
    for (let i = 1; i < n; i++) {
      const x = a.x + ((b.x - a.x) * i) / n;
      const y = a.y + ((b.y - a.y) * i) / n;
      for (const o of this.obstacles) {
        const r = o.kind === 'tree' ? o.r * 0.45 : o.r;
        if (hyp(x - o.x, y - o.y) < r) return false;
      }
      for (const w of this.walls) {
        if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return false;
      }
      for (const d of this.doors) {
        if (!d.open && x > d.x && x < d.x + d.w && y > d.y && y < d.y + d.h) return false;
      }
    }
    return true;
  }

  private chooseBotWeaponForDistance(b: Player, dist: number) {
    let bestSlot = b.sl;
    let bestScore = -1;
    for (let i = 0; i < 6; i++) {
      const wId = b.inv[i];
      if (wId < 0 || !isGun(wId)) continue;
      const mag = b.am[wId] ?? WP[wId].mag ?? 1;
      const res = WP[wId].ammoType && b.ra ? b.ra[WP[wId].ammoType] || 0 : 0;
      if (mag + res <= 0) continue;
      const loadedBonus = mag > 0 ? 50 : 20;
      let rangeFitness = 10;
      if (dist < 210) {
        rangeFitness = wId === 3 ? 40 : wId === 2 ? 34 : wId === 4 ? 22 : wId === 1 ? 18 : 8;
      } else if (dist < 520) {
        rangeFitness = wId === 4 ? 40 : wId === 2 ? 28 : isSniper(wId) ? 26 : wId === 1 ? 18 : 10;
      } else {
        rangeFitness = isSniper(wId) ? 45 : wId === 4 ? 30 : 8;
      }
      const score = loadedBonus + rangeFitness + (b.invRarity[i] || 0) * 4;
      if (score > bestScore) {
        bestScore = score;
        bestSlot = i;
      }
    }
    if (bestScore < 0 && isGun(b.w)) {
      b.sl = 0;
      b.w = 0;
      return;
    }
    if (bestSlot !== b.sl && b.inv[bestSlot] >= 0) {
      b.sl = bestSlot;
      b.w = b.inv[bestSlot];
    }
  }

  private runBotAI(b: Player, dt: number) {
    let tg: Player | null = null;
    let bd = 1e9;
    for (const q of this.players) {
      if (q === b || !q.alive || q.inPlane || q.dropTime > 0) continue;
      const d = hyp(q.x - b.x, q.y - b.y);
      if (d < bd) {
        bd = d;
        tg = q;
      }
    }

    b.vx = 0;
    b.vy = 0;
    b.tt -= dt;
    b.rt -= dt;

    if (b.lt !== tg) {
      b.lt = tg;
      b.rt = 0.22 + Math.random() * 0.3;
    }

    const nx = this.storm.set && this.storm.t > 10 && this.storm.i < STORM_RADII.length - 1;
    const zx = nx ? this.storm.tx : this.storm.x;
    const zy = nx ? this.storm.ty : this.storm.y;
    const zr = nx ? STORM_RADII[this.storm.i + 1] : this.storm.r;
    const sd = hyp(b.x - zx, b.y - zy);
    const hurt = b.hp + b.sh < 65;
    const sight = tg !== null && bd < 750 && this.hasLineOfSight(b, tg);

    // If bot is currently channeling a Medkit or Shield, stay defensive unless enemy rushes close
    if ((b.hl ?? 0) > 0) {
      if (sight && bd < 165) {
        b.hl = 0;
        b.ht = 0;
        b.hw = 0;
        this.chooseBotWeaponForDistance(b, bd);
      } else {
        if (sd > zr - 110) {
          b.vx = zx - b.x;
          b.vy = zy - b.y;
        } else if (tg && bd < 420) {
          b.vx = b.x - tg.x;
          b.vy = b.y - tg.y;
        }
        return;
      }
    }

    // Proactive healing (Medkit 5s, Mini Shield 1s, Shield Potion 5s) when safe or out of close range
    if (b.cd <= 0 && (!sight || bd > 220)) {
      const tryEquipAndHeal = (itemId: number): boolean => {
        if (this.countItem(b, itemId) < 1) return false;
        const slot = b.inv.indexOf(itemId);
        if (slot < 0) return false;
        b.sl = slot;
        b.w = itemId;
        this.startHeal(b);
        return (b.hl ?? 0) > 0;
      };
      if (b.hp < 75 && tryEquipAndHeal(7)) return;
      if (b.sh < 50 && tryEquipAndHeal(12)) return;
      if (b.sh < 80 && tryEquipAndHeal(8)) return;
    }

    const needStormMove = sd > zr - 110 ? (b.zs = 1) : sd < zr - 210 ? (b.zs = 0) : b.zs;
    if (needStormMove) {
      b.vx = zx - b.x;
      b.vy = zy - b.y;
      b.a = Math.atan2(b.vy, b.vx);
    } else if (
      hurt &&
      tg &&
      bd < 360 &&
      !this.loot.some((l) => l.w >= 7 && hyp(l.x - b.x, l.y - b.y) < 300)
    ) {
      // Tactical retreat when low HP
      b.vx = b.x - tg.x;
      b.vy = b.y - tg.y;
      b.a = Math.atan2(-b.vy, -b.vx);
    } else if (
      tg &&
      bd < 680 &&
      sight &&
      (b.inv.some((w) => isGun(w)) ||
        !this.loot.some((l) => isGun(l.w) && hyp(l.x - b.x, l.y - b.y) < 420))
    ) {
      // Pick ideal weapon for current range
      this.chooseBotWeaponForDistance(b, bd);

      // Lead moving target based on bullet speed and bot skill
      const bulletSpd = WP[b.w].bulletSpeed || 900;
      const tFlight = bd / bulletSpd;
      const lead = 0.55 + 0.35 * b.sk;
      const aimX = tg.x + (tg.pvx || 0) * tFlight * lead;
      const aimY = tg.y + (tg.pvy || 0) * tFlight * lead;
      const targetAngle =
        Math.atan2(aimY - b.y, aimX - b.x) +
        Math.sin(this.elapsed * 2.5 + b.x / 40) * 0.1 * (1.2 - b.sk);
      const diff = Math.atan2(Math.sin(targetAngle - b.a), Math.cos(targetAngle - b.a));
      b.a += diff * Math.min(1, dt * 8.5);

      const idealDist = isSniper(b.w) ? 460 : b.w === 3 ? 130 : 270;
      const f = WP[b.w].melee
        ? 1
        : b.rl > 0
          ? -0.8
          : bd > idealDist + 60
            ? 1
            : bd < idealDist - 60
              ? -0.75
              : 0;

      if (this.elapsed > (b.st2 || 0)) {
        b.st2 = this.elapsed + rnd(0.9, 2.0);
        b.ss = Math.random() < 0.5 ? 1 : -1;
      }
      const s = b.ss || 1;
      b.vx = Math.cos(targetAngle) * f - Math.sin(targetAngle) * s * 0.85;
      b.vy = Math.sin(targetAngle) * f + Math.cos(targetAngle) * s * 0.85;

      const aimDiff = Math.atan2(
        Math.sin(Math.atan2(aimY - b.y, aimX - b.x) - b.a),
        Math.cos(Math.atan2(aimY - b.y, aimX - b.x) - b.a)
      );
      if (
        b.rt <= 0 &&
        Math.abs(aimDiff) < 0.24 &&
        bd < WP[b.w].range + 20 &&
        Math.random() < 0.82
      ) {
        this.shoot(b);
      }

      if (b.gn > 0 && b.rt <= 0 && bd > 130 && bd < 340 && Math.random() < 0.008) {
        b.gn--;
        if (b.gn < 1) {
          const gi = b.inv.indexOf(6);
          if (gi >= 0) {
            b.inv[gi] = -1;
            b.invRarity[gi] = 0;
          }
        }
        const botThrowSpd = Math.min(600, Math.max(240, bd * 1.35));
        const bPos = { x: b.x + Math.cos(b.a) * 12, y: b.y + Math.sin(b.a) * 12 };
        this.resolveWalls(bPos, 7);
        this.grenades.push({
          x: bPos.x,
          y: bPos.y,
          vx: Math.cos(b.a) * botThrowSpd,
          vy: Math.sin(b.a) * botThrowSpd,
          z: 14,
          vz: 145 + botThrowSpd * 0.2,
          l: Math.min(1.25, bd / 360),
          ml: Math.min(1.25, bd / 360),
          o: b,
          kind: 'frag',
        });
      }
    } else {
      // Look for nearby unopened chests or valuable ground loot
      let bestChest: Chest | null = null;
      let chestDist = 420;
      if (!b.inv.some((w) => isGun(w)) || Math.random() < 0.4) {
        for (const c of this.chests) {
          if (c.opened) continue;
          const d = hyp(c.x - b.x, c.y - b.y);
          if (d < chestDist && this.hasLineOfSight(b, c)) {
            chestDist = d;
            bestChest = c;
          }
        }
      }

      let best: LootItem | null = null;
      let bestScore = 520;
      if (!bestChest) {
        if (b.lb && this.elapsed < (b.lbt || 0) && this.loot.includes(b.lb)) {
          best = b.lb;
        } else {
          for (const l of this.loot) {
            const d = hyp(l.x - b.x, l.y - b.y);
            const weight =
              l.w === 7
                ? b.hp < 75
                  ? 0.45
                  : 1.9
                : l.w === 8
                  ? b.sh < 75
                    ? 0.5
                    : 1.9
                  : l.w === 12
                    ? b.sh < 50
                      ? 0.45
                      : 2.2
                    : isGun(l.w)
                      ? 0.6
                      : 2.5;
            const dd = d * weight;
            if (dd < bestScore && this.canBotPickup(b, l)) {
              bestScore = dd;
              best = l;
            }
          }
        }
      }

      if (bestChest) {
        b.tx = bestChest.x;
        b.ty = bestChest.y;
      } else if (best) {
        if (best !== b.lb) {
          b.lb = best;
          b.lbt = this.elapsed + 0.8;
        }
        b.tx = best.x;
        b.ty = best.y;
      } else if (b.tt <= 0 || hyp(b.tx - b.x, b.ty - b.y) < 35) {
        b.tt = rnd(3, 6.5);
        // Move toward a POI inside the safe zone!
        const safePois = POIS.filter(
          (poi) => hyp(poi.x - this.storm.x, poi.y - this.storm.y) < this.storm.r * 0.8
        );
        if (safePois.length > 0 && Math.random() < 0.65) {
          const poi = safePois[Math.floor(Math.random() * safePois.length)];
          b.tx = poi.x + rnd(-220, 220);
          b.ty = poi.y + rnd(-220, 220);
        } else {
          const a = rnd(0, Math.PI * 2);
          const d = rnd(0, Math.max(80, this.storm.r - 200));
          b.tx = this.storm.x + Math.cos(a) * d;
          b.ty = this.storm.y + Math.sin(a) * d;
        }
      }

      b.vx = b.tx - b.x;
      b.vy = b.ty - b.y;
      b.a = Math.atan2(b.vy, b.vx);
    }
  }

  private finishMatch(title: 'VICTORY' | 'ELIMINATED') {
    const me = this.me;
    if (!me) return;
    me.fin = true;

    const profile = this.callbacks.getProfile();
    const pl = me.alive ? 1 : me.rank;
    const ss = Math.round(me.alive ? this.elapsed : me.td);
    const dm = Math.round(me.dm);
    const b4 = getLevelInfo(profile.xp || 0);
    const xp = Math.round(
      this.kills * 30 + dm / 10 + ss / 6 + (TOTAL_PLAYERS + 1 - pl) * 4 + (pl === 1 ? 150 : 0)
    );
    const co = this.kills * 15 + (pl === 1 ? 100 : Math.max(0, TOTAL_PLAYERS - pl) * 3);

    let ar: MatchResult['ar'] = null;
    if (this.isArena) {
      if (title === 'VICTORY') me.pts += 5;
      const h0 = profile.hype || 0;
      const pt = me.pts | 0;
      const h1 = Math.max(0, h0 + pt * 10 - 30);
      ar = {
        pt,
        h0,
        h1,
        r0: getRankInfo(h0),
        r1: getRankInfo(h1),
      };
    }

    this.callbacks.saveProfileUpdate((u) => {
      u.xp = (u.xp || 0) + xp;
      u.coins += co;
      u.s.g++;
      u.s.k += this.kills;
      if (pl === 1) u.s.w++;
      else u.s.d++;
      u.s.b = u.s.b ? Math.min(u.s.b, pl) : pl;
      u.s.dm = (u.s.dm || 0) + dm;
      if (ar) u.hype = ar.h1;
    });

    const updatedProfile = this.callbacks.getProfile();
    const killerWeapon = me.by ? (WP[me.by.w]?.name || null) : 'Storm';
    const result: MatchResult = {
      title,
      pl,
      dm,
      sv: ss,
      xp,
      co,
      b4,
      af: getLevelInfo(updatedProfile.xp || 0),
      killer: me.by ? me.by.name : null,
      killerWeapon,
      k: this.kills,
      ar,
    };

    if (title === 'VICTORY') {
      this.over = true;
    }
    this.resultCache = result;
    this.sfx(title === 'VICTORY' ? 'win' : 'lose');

    let hasDeathCam = false;
    if (title === 'ELIMINATED') {
      hasDeathCam = this.finalizeDeathCamClip(result.killer, killerWeapon, me);
      if (hasDeathCam) {
        this.startDeathCamPlayback();
      }
    }

    this.emitHud();
    this.callbacks.onMatchFinish(result, hasDeathCam);
  }

  private spawnParticles(x: number, y: number, c: string, n: number, text?: string) {
    const settings = this.callbacks.getSettings();
    if (settings.part && this.particles.length < 280) {
      for (let i = 0; i < n; i++) {
        const a = rnd(0, Math.PI * 2);
        const s = rnd(45, 175);
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          l: 0.45,
          ml: 0.45,
          c,
          size: rnd(2.5, 4.5),
        });
      }
    }
    if (text && settings.num && !this.ambient) {
      this.particles.push({
        x,
        y: y - 20,
        vx: rnd(-12, 12),
        vy: -44,
        l: 0.8,
        ml: 0.8,
        c: '#fff',
        size: 14,
        t: text,
      });
    }
  }

  private pushFeed(text: string, accent?: string) {
    this.feed.unshift({ id: this.nextId++, text, t: 4.5, accent });
    if (this.feed.length > 5) this.feed.length = 5;
  }

  private sfx(key: SfxKey) {
    if (this.ambient) return;
    playSfx(key, this.callbacks.getSettings());
  }

  private sfxAt(key: SfxKey, x: number, y: number) {
    if (this.ambient) return;
    const cam = this.getCameraTarget();
    playSfx(key, this.callbacks.getSettings(), hyp(x - cam.x, y - cam.y));
  }

  public emitHud() {
    const me = this.me;
    if (!me) return;

    const cam = this.getCameraTarget();
    const nearby = this.getNearbyAction();
    const aliveCount = this.players.filter((q) => q.alive).length;
    const inStorm =
      me.alive &&
      !me.inPlane &&
      hyp(me.x - this.storm.x, me.y - this.storm.y) > this.storm.r;

    const nextStorm =
      this.storm.set && this.storm.i < STORM_RADII.length - 1
        ? {
            hasNextStorm: true,
            nextStormX: this.storm.tx,
            nextStormY: this.storm.ty,
            nextStormR: STORM_RADII[this.storm.i + 1],
          }
        : {
            hasNextStorm: false,
            nextStormX: this.storm.x,
            nextStormY: this.storm.y,
            nextStormR: this.storm.r,
          };

    let nearbyAction: HudSnapshot['nearbyAction'] = null;
    if (nearby?.type === 'door' && nearby.door) {
      nearbyAction = {
        label: nearby.door.open ? 'Close Door' : 'Open Door',
        isDoor: true,
      };
    } else if (nearby?.type === 'chest' && nearby.chest) {
      nearbyAction = {
        label: nearby.chest.golden ? 'Open Golden Chest' : 'Open Supply Chest',
        isChest: true,
      };
    } else if (nearby?.type === 'loot' && nearby.item) {
      const item = nearby.item;
      const baseName =
        item.t === 'a'
          ? `${AMMO_INFO[item.ammoType || 'medium'].name} (+${item.n || AMMO_INFO[item.ammoType || 'medium'].packAmount})`
          : item.t === 'w'
            ? `${WP[item.w].name}${isStackable(item.w) && (item.n ?? 1) > 1 ? ` x${item.n}` : ''}`
            : item.t === 'h'
              ? 'Medkit'
              : 'Shield Potion';
      const rName = item.t === 'w' && isGun(item.w) && item.r > 0 ? `${RARITY_TIERS[item.r].name} ` : '';
      nearbyAction = {
        label: item.t === 'a' ? `Pick up ${baseName}` : `${nearby.swap ? 'Swap for' : 'Pick up'} ${rName}${baseName}`,
        weaponId: item.w,
        rarity: item.r,
      };
    }

    this.callbacks.onHudUpdate({
      aliveCount,
      kills: this.kills,
      points: me.pts | 0,
      isArena: this.isArena,
      hp: Math.max(0, Math.round(me.hp)),
      sh: Math.max(0, Math.round(me.sh)),
      st: Math.round(me.st),
      inv: [...me.inv],
      invRarity: [...me.invRarity],
      selectedSlot: me.sl,
      heldWeapon: me.w,
      heldRarity: me.invRarity[me.sl] || 0,
      ammo: { ...me.am },
      reserveAmmo: me.ra ? { ...me.ra } : createEmptyReserve(),
      counts: { ...me.c },
      grenades: me.gn,
      reloadProgress: me.rl > 0 && me.rt > 0 ? 1 - me.rl / me.rt : 0,
      healProgress: (me.hl ?? 0) > 0 && (me.ht ?? 0) > 0 ? 1 - (me.hl || 0) / (me.ht || 1) : 0,
      healRemaining: Math.max(0, me.hl || 0),
      healWeaponId: me.hw || 0,
      inPlane: me.inPlane,
      parachuting: me.dropTime > 0,
      stormPhase: this.storm.i,
      stormTimer: Math.max(0, Math.ceil(20 - this.storm.t)),
      stormShrinking: this.storm.t >= 20 && this.storm.i < STORM_RADII.length - 1,
      stormFinal: this.storm.i >= STORM_RADII.length - 1,
      inStorm,
      nearbyAction,
      feed: this.feed.map((f) => ({
        id: f.id,
        text: f.text,
        alpha: Math.min(1, f.t),
        accent: f.accent,
      })),
      spectatingName: !me.alive ? cam.name : null,
      eliminatedBy: !me.alive ? (me.by ? me.by.name : null) : null,
      playerAlive: me.alive,
      onlineStatus: this.online ? this.onlineStatus : null,
      minimap: {
        x: cam.x,
        y: cam.y,
        stormX: this.storm.x,
        stormY: this.storm.y,
        stormR: this.storm.r,
        ...nextStorm,
        buildings: this.floors,
        roads: this.roads,
        pois: POIS,
        airdrops: this.loot.filter((l) => l.air).map((l) => ({ x: l.x, y: l.y })),
        plane: {
          active: this.plane.active,
          x: this.plane.x,
          y: this.plane.y,
          sx: this.plane.sx,
          sy: this.plane.sy,
          ex: this.plane.ex,
          ey: this.plane.ey,
        },
      },
    });
  }

  private sendWs(data: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private stepOnlineClient(dt: number) {
    this.shake = Math.max(0, this.shake - dt);
    this.hitmarker = Math.max(0, this.hitmarker - dt);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.94;
      q.vy *= 0.94;
      q.l -= dt;
      if (q.l <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.l -= dt;
      s.r = s.mr * (1 - s.l / s.ml);
      if (s.l <= 0) this.shockwaves.splice(i, 1);
    }

    // Smoothly fade building roofs locally for the camera player
    const camPlayer = this.getCameraTarget().activePlayer;
    for (const f of this.floors) {
      const inside =
        camPlayer !== null &&
        camPlayer.dropTime <= 0 &&
        !camPlayer.inPlane &&
        camPlayer.x >= f.x &&
        camPlayer.x <= f.x + f.w &&
        camPlayer.y >= f.y &&
        camPlayer.y <= f.y + f.h;
      const targetAlpha = inside ? 0 : 1;
      f.roofAlpha += (targetAlpha - f.roofAlpha) * Math.min(1, dt * 10);
    }

    for (const d of this.doors) {
      const target = d.open ? (d.openDir ?? (d.horizontal ? -1 : 1)) : 0;
      const cur = d.openProgress ?? target;
      d.openProgress = cur + (target - cur) * Math.min(1, dt * 14);
    }

    // Send input state to authoritative server at 30Hz
    this.inputAcc += dt;
    if (this.inputAcc >= 0.033) {
      this.inputAcc = 0;
      const kb = this.callbacks.getKeybinds();
      const angle = Math.atan2(this.mouseY - this.viewH / 2, this.mouseX - this.viewW / 2);
      this.sendWs({
        type: 'input',
        keys: {
          up: Boolean(this.keys[kb.up] || this.keys.arrowup),
          down: Boolean(this.keys[kb.down] || this.keys.arrowdown),
          left: Boolean(this.keys[kb.left] || this.keys.arrowleft),
          right: Boolean(this.keys[kb.right] || this.keys.arrowright),
          sprint: Boolean(this.keys[kb.sprint]),
        },
        angle,
        mouseDown: this.mouseDown,
        throwPower: this.getThrowPower(),
      });
    }

    const me = this.me;
    const targetZoom =
      me && me.alive
        ? me.inPlane || me.dropTime > 0
          ? 0.84
          : isSniper(me.w)
            ? 0.72
            : 1.0
        : 1.0;
    this.cameraZoom += (targetZoom - this.cameraZoom) * Math.min(1, dt * 6.5);

    this.hudAcc += dt;
    if (this.hudAcc >= 0.055) {
      this.hudAcc = 0;
      this.emitHud();
    }
  }

  private handleOnlineMessage(msg: Record<string, unknown>) {
    if (msg.type === 'init') {
      this.myOnlineId = Number(msg.myId);
      this.floors = (msg.floors as BuildingFloor[]) || [];
      this.walls = (msg.walls as Wall[]) || [];
      this.doors = (msg.doors as BuildingDoor[]) || [];
      this.roads = (msg.roads as RoadSegment[]) || [];
      this.sfx('go');
      return;
    }

    if (msg.type === 'allEliminated') {
      this.over = true;
      const winner = String(msg.winnerName || 'Unknown');
      if (this.resultCache) this.resultCache.winnerName = winner;
      this.callbacks.onAllEliminated(winner);
      return;
    }

    if (msg.type === 'matchResult') {
      const srv = msg.result as {
        title: 'VICTORY' | 'ELIMINATED';
        pl: number;
        dm: number;
        sv: number;
        k: number;
        killer: string | null;
        killerWeapon?: string | null;
        winnerName?: string;
      };
      if (!srv) return;
      const profile = this.callbacks.getProfile();
      const b4 = getLevelInfo(profile.xp || 0);
      const xp = Math.round(
        srv.k * 30 + srv.dm / 10 + srv.sv / 6 + (TOTAL_PLAYERS + 1 - srv.pl) * 4 + (srv.pl === 1 ? 150 : 0)
      );
      const co = srv.k * 15 + (srv.pl === 1 ? 100 : Math.max(0, TOTAL_PLAYERS - srv.pl) * 3);

      this.callbacks.saveProfileUpdate((u) => {
        u.xp = (u.xp || 0) + xp;
        u.coins += co;
        u.s.g++;
        u.s.k += srv.k;
        if (srv.pl === 1) u.s.w++;
        else u.s.d++;
        u.s.b = u.s.b ? Math.min(u.s.b, srv.pl) : srv.pl;
        u.s.dm = (u.s.dm || 0) + srv.dm;
      });

      const updatedProfile = this.callbacks.getProfile();
      const result: MatchResult = {
        title: srv.title,
        pl: srv.pl,
        dm: srv.dm,
        sv: srv.sv,
        xp,
        co,
        b4,
        af: getLevelInfo(updatedProfile.xp || 0),
        killer: srv.killer,
        killerWeapon: srv.killerWeapon || null,
        k: srv.k,
        ar: null,
        winnerName: srv.winnerName,
      };
      if (srv.title === 'VICTORY') this.over = true;
      this.resultCache = result;
      this.sfx(srv.title === 'VICTORY' ? 'win' : 'lose');

      let hasDeathCam = false;
      if (srv.title === 'ELIMINATED') {
        hasDeathCam = this.finalizeDeathCamClip(
          srv.killer,
          srv.killerWeapon || null,
          this.me
        );
        if (hasDeathCam) {
          this.startDeathCamPlayback();
        }
      }

      this.emitHud();
      this.callbacks.onMatchFinish(result, hasDeathCam);
      return;
    }

    if (msg.type !== 'state') return;

    this.onlineStatus = {
      connected: true,
      phase: (msg.phase as 'COUNTDOWN' | 'PLANE' | 'ACTIVE') || 'ACTIVE',
      countdown: Number(msg.countdown || 0),
      humanCount: Number(msg.humanCount || 1),
    };
    this.elapsed = Number(msg.elapsed || 0);
    if (msg.plane) this.plane = msg.plane as DropPlane;
    if (msg.storm) this.storm = msg.storm as StormState;
    if (Array.isArray(msg.loot)) this.loot = msg.loot as LootItem[];
    if (Array.isArray(msg.chests)) this.chests = msg.chests as Chest[];
    if (Array.isArray(msg.obstacles)) this.obstacles = msg.obstacles as Obstacle[];
    if (Array.isArray(msg.feed)) this.feed = msg.feed as FeedItem[];
    if (Array.isArray(msg.doorsOpen)) {
      const flags = msg.doorsOpen as number[];
      for (let i = 0; i < this.doors.length && i < flags.length; i++) {
        const v = flags[i];
        this.doors[i].open = v !== 0;
        if (v !== 0) {
          this.doors[i].openDir = v > 0 ? 1 : -1;
        }
      }
    }

    const srvPlayers = (msg.players as Array<Record<string, unknown>>) || [];
    const byId = new Map<number, Player>();
    const mappedPlayers: Player[] = srvPlayers.map((sp) => {
      const p: Player = {
        id: Number(sp.id),
        x: Number(sp.x),
        y: Number(sp.y),
        a: Number(sp.a),
        hp: Number(sp.hp),
        sh: Number(sp.sh),
        w: Number(sp.w),
        cd: 0,
        bot: Boolean(sp.bot),
        name: String(sp.name || ''),
        col: String(sp.col || '#4cc9f0'),
        skinId: String(sp.skinId || 'skin_classic'),
        pickaxeId: String(sp.pickaxeId || 'pick_fists'),
        backblingId: String(sp.backblingId || 'bb_none'),
        k: Number(sp.k || 0),
        alive: Boolean(sp.alive),
        tx: 0,
        ty: 0,
        tt: 0,
        vx: 0,
        vy: 0,
        st: Number(sp.st ?? 100),
        gn: Number(sp.gn || 0),
        pc: Number(sp.pc || 0),
        hd: Number(sp.hd || 0),
        fl: String(sp.fl || '#e0ac82'),
        inv: (sp.inv as number[]) || [0, -1, -1, -1, -1, -1],
        invRarity: (sp.invRarity as RarityTier[]) || [0, 0, 0, 0, 0, 0],
        sl: Number(sp.sl || 0),
        c: (sp.c as Record<number, number>) || {},
        am: (sp.am as Record<number, number>) || {},
        ra: (sp.ra as Record<AmmoType, number>) || createEmptyReserve(),
        rl: Number(sp.rl || 0),
        rt: Number(sp.rt || 0),
        rw: Number(sp.rw || 0),
        hl: Number(sp.hl || 0),
        ht: Number(sp.ht || 0),
        hw: Number(sp.hw || 0),
        sk: 0.8,
        hitFlash: Number(sp.hitFlash || 0),
        recoil: Number(sp.recoil || 0),
        dm: Number(sp.dm || 0),
        pts: 0,
        pt2: 0,
        rank: Number(sp.rank || TOTAL_PLAYERS),
        td: 0,
        by: null,
        fin: false,
        inPlane: Boolean(sp.inPlane),
        dropTime: Number(sp.dropTime || 0),
        dropMax: Number(sp.dropMax || 1.6),
        planeJumpAt: 0.5,
        emote: (sp.emote as string | null) || null,
        emoteTimer: 0,
      };
      byId.set(p.id, p);
      return p;
    });

    for (let i = 0; i < srvPlayers.length; i++) {
      const byPid = srvPlayers[i].byId;
      if (typeof byPid === 'number') {
        mappedPlayers[i].by = byId.get(byPid) || null;
      }
    }

    this.players = mappedPlayers;
    if (this.myOnlineId !== null) {
      const me = byId.get(this.myOnlineId) || null;
      if (me) {
        this.me = me;
        this.kills = me.k;
      }
    }

    const srvBullets = (msg.bullets as Array<Record<string, unknown>>) || [];
    this.bullets = srvBullets.map((sb) => ({
      x: Number(sb.x),
      y: Number(sb.y),
      px: Number(sb.px),
      py: Number(sb.py),
      vx: Number(sb.vx),
      vy: Number(sb.vy),
      l: Number(sb.l),
      c: String(sb.c || '#fff'),
      o: byId.get(Number(sb.ownerId)) || mappedPlayers[0],
      d: Number(sb.d || 0),
    }));

    const srvGrenades = (msg.grenades as Array<Record<string, unknown>>) || [];
    this.grenades = srvGrenades.map((sg) => ({
      x: Number(sg.x),
      y: Number(sg.y),
      vx: Number(sg.vx),
      vy: Number(sg.vy),
      z: Number(sg.z || 0),
      vz: Number(sg.vz || 0),
      l: Number(sg.l),
      ml: Number(sg.ml || 1),
      o: mappedPlayers[0],
      kind: (sg.kind as Grenade['kind']) || 'frag',
    }));

    const events = (msg.events as Array<Record<string, unknown>>) || [];
    for (const ev of events) {
      const t = String(ev.type);
      const ex = Number(ev.x || 0);
      const ey = Number(ev.y || 0);
      if (t === 'boom') {
        this.spawnParticles(ex, ey, '#ffb340', 24);
        this.shockwaves.push({ x: ex, y: ey, r: 8, mr: Number(ev.r || 110), l: 0.28, ml: 0.28, c: '#ffb340' });
        this.sfxAt('boom', ex, ey);
      } else if (t === 'impulse' || t === 'reverse') {
        const col = t === 'impulse' ? '#38bdf8' : '#c084fc';
        this.spawnParticles(ex, ey, col, 28);
        this.shockwaves.push({
          x: ex,
          y: ey,
          r: t === 'impulse' ? 8 : Number(ev.r || 250),
          mr: Number(ev.r || 225),
          l: 0.34,
          ml: 0.34,
          c: col,
        });
        this.sfxAt(t === 'impulse' ? 'impulse' : 'reverse', ex, ey);
      } else if (t === 'chest') {
        this.spawnParticles(ex, ey, String(ev.c || '#fbbf24'), 16);
        this.shockwaves.push({ x: ex, y: ey, r: 8, mr: 48, l: 0.24, ml: 0.24, c: String(ev.c || '#fbbf24') });
        this.sfxAt('chest', ex, ey);
      } else if (t === 'airdrop') {
        this.sfx('air');
      } else if (t === 'shot') {
        this.sfxAt((`g${Number(ev.w || 1)}`) as SfxKey, ex, ey);
      } else if (t === 'dmg') {
        this.spawnParticles(ex, ey, String(ev.c || '#fff'), 5, ev.text ? String(ev.text) : undefined);
        if (this.myOnlineId && Number(ev.targetId) === this.myOnlineId) {
          this.shake = Math.max(this.shake, 0.24);
          this.sfx('hurt');
        } else if (this.myOnlineId && Number(ev.attackerId) === this.myOnlineId) {
          this.hitmarker = 0.16;
          this.sfxAt('hit', ex, ey);
        }
      } else if (t === 'kill') {
        this.shockwaves.push({ x: ex, y: ey, r: 6, mr: 42, l: 0.22, ml: 0.22, c: String(ev.c || '#fff') });
        if (this.myOnlineId && Number(ev.attackerId) === this.myOnlineId) {
          this.sfx('kill');
          this.shake = Math.max(this.shake, 0.22);
        } else {
          this.sfxAt('die', ex, ey);
        }
      } else if (t === 'door') {
        this.sfxAt(ev.open ? 'doorOpen' : 'doorClose', ex, ey);
      } else if (t === 'bounce') {
        this.sfxAt('bounce', ex, ey);
      } else if (t === 'empty' && this.myOnlineId && Number(ev.attackerId) === this.myOnlineId) {
        this.sfx('empty');
      } else if (t === 'healStart' && this.myOnlineId && Number(ev.attackerId) === this.myOnlineId) {
        this.sfx('healStart');
      } else if (t === 'healDone') {
        this.spawnParticles(ex, ey, String(ev.c || '#38bdf8'), 12);
        if (this.myOnlineId && Number(ev.attackerId) === this.myOnlineId) {
          this.sfx('healDone');
        }
      } else if (t === 'healCap' && this.myOnlineId && Number(ev.attackerId) === this.myOnlineId) {
        this.sfx('empty');
        this.spawnParticles(ex, ey - 10, '#7dd3fc', 0, 'MAX 50 SHD');
      }
    }

    if (this.me && this.me.alive && !this.me.fin && this.onlineStatus?.phase !== 'COUNTDOWN') {
      this.deathCamElapsed = this.elapsed;
      this.captureDeathCamFrame(this.me);
    }

    this.emitHud();
  }

  public hasDeathCam(): boolean {
    return this.deathCamClip.length >= 2;
  }

  public startDeathCamPlayback() {
    if (this.deathCamClip.length < 2) return;
    this.clearInputs();
    this.deathCamPlaying = true;
    this.deathCamTime = 0;
    this.deathCamHudAcc = 0;
    this.callbacks.onDeathCamUpdate?.(this.getDeathCamState());
  }

  public skipDeathCam() {
    if (!this.deathCamPlaying) return;
    this.deathCamPlaying = false;
    this.callbacks.onDeathCamUpdate?.(null);
    this.callbacks.onDeathCamFinish?.();
  }

  public getDeathCamState(): DeathCamState {
    return {
      playing: this.deathCamPlaying,
      time: Math.min(this.deathCamTime, this.deathCamDuration),
      duration: this.deathCamDuration,
      killerName: this.deathCamKiller,
      killerWeapon: this.deathCamKillerWeapon,
      victimName: this.deathCamVictim,
    };
  }

  private resetDeathCam() {
    this.deathCamPlaying = false;
    this.deathCamBuffer = [];
    this.deathCamClip = [];
    this.deathCamAcc = 0;
    this.deathCamElapsed = 0;
    this.deathCamTime = 0;
    this.deathCamDuration = 3.0;
    this.deathCamKiller = null;
    this.deathCamKillerWeapon = null;
    this.deathCamVictim = 'You';
    this.callbacks.onDeathCamUpdate?.(null);
  }

  private captureDeathCamFrame(focus: Player) {
    const cx = focus.inPlane ? this.plane.x : focus.x;
    const cy = focus.inPlane ? this.plane.y : focus.y;
    const radius = 1550;
    const inRange = (x: number, y: number) =>
      Math.abs(x - cx) < radius && Math.abs(y - cy) < radius;

    const frame: DeathCamFrame = {
      t: this.deathCamElapsed,
      camX: cx,
      camY: cy,
      zoom: this.cameraZoom || 1,
      meId: focus.id,
      players: this.players
        .filter((p) => p.alive && inRange(p.x, p.y))
        .map((p) => ({
          ...p,
          inv: [...p.inv],
          invRarity: [...p.invRarity],
          am: { ...p.am },
          c: { ...p.c },
          by: null,
        })),
      bullets: this.bullets
        .filter((b) => inRange(b.x, b.y))
        .map((b) => ({ ...b })),
      loot: this.loot
        .filter((l) => inRange(l.x, l.y))
        .map((l) => ({ ...l })),
      chests: this.chests
        .filter((c) => inRange(c.x, c.y))
        .map((c) => ({ ...c })),
      obstacles: this.obstacles
        .filter((o) => inRange(o.x, o.y))
        .map((o) => ({ ...o })),
      grenades: this.grenades
        .filter((g) => inRange(g.x, g.y))
        .map((g) => ({ ...g })),
      shockwaves: this.shockwaves
        .filter((s) => inRange(s.x, s.y))
        .map((s) => ({ ...s })),
      particles: this.particles
        .filter((q) => inRange(q.x, q.y))
        .map((q) => ({ ...q })),
      storm: { ...this.storm },
      plane: { ...this.plane },
      roofAlphas: this.floors.map((f) => f.roofAlpha),
      doorsOpen: this.doors.map((d) => (d.open ? (d.openDir ?? (d.horizontal ? -1 : 1)) : 0)),
    };

    this.deathCamBuffer.push(frame);
    const cutoff = this.deathCamElapsed - 3.1;
    while (this.deathCamBuffer.length > 0 && this.deathCamBuffer[0].t < cutoff) {
      this.deathCamBuffer.shift();
    }
    if (this.deathCamBuffer.length > 130) {
      this.deathCamBuffer.shift();
    }
  }

  private finalizeDeathCamClip(
    killerName: string | null,
    killerWeapon: string | null,
    victim: Player | null
  ): boolean {
    if (victim) {
      this.deathCamVictim = victim.name;
      this.deathCamElapsed += 0.033;
      this.captureDeathCamFrame(victim);
    }
    if (this.deathCamBuffer.length < 2) return false;

    const latestT = this.deathCamBuffer[this.deathCamBuffer.length - 1].t;
    const minT = latestT - 3.0;
    const trimmed = this.deathCamBuffer.filter((f) => f.t >= minT);
    this.deathCamClip = trimmed.length >= 2 ? trimmed : [...this.deathCamBuffer];
    const span =
      this.deathCamClip[this.deathCamClip.length - 1].t - this.deathCamClip[0].t;
    this.deathCamDuration = Math.max(0.5, Math.min(3.0, span));
    this.deathCamKiller = killerName;
    this.deathCamKillerWeapon = killerWeapon;
    return true;
  }

  private stepDeathCam(dt: number) {
    this.deathCamTime += dt;
    this.deathCamHudAcc += dt;
    if (this.deathCamHudAcc >= 0.05) {
      this.deathCamHudAcc = 0;
      this.callbacks.onDeathCamUpdate?.(this.getDeathCamState());
    }
    if (this.deathCamTime >= this.deathCamDuration + 0.45) {
      this.deathCamPlaying = false;
      this.callbacks.onDeathCamUpdate?.(null);
      this.callbacks.onDeathCamFinish?.();
    }
  }

  public getRenderScene(): RenderScene {
    if (this.deathCamPlaying && this.deathCamClip.length >= 2) {
      const clip = this.deathCamClip;
      const startT = clip[0].t;
      const clampedOffset = Math.min(this.deathCamTime, this.deathCamDuration);
      const targetT = startT + clampedOffset;

      let idx = 0;
      while (idx < clip.length - 2 && clip[idx + 1].t < targetT) {
        idx++;
      }
      const f0 = clip[idx];
      const f1 = clip[Math.min(clip.length - 1, idx + 1)];
      const span = f1.t - f0.t;
      const alpha = span > 0.0001 ? Math.max(0, Math.min(1, (targetT - f0.t) / span)) : 0;

      const f1ById = new Map<number, Player>();
      for (const p of f1.players) f1ById.set(p.id, p);

      const players: Player[] = f0.players.map((p0) => {
        const p1 = f1ById.get(p0.id);
        if (!p1) return p0;
        const da = Math.atan2(Math.sin(p1.a - p0.a), Math.cos(p1.a - p0.a));
        return {
          ...p0,
          x: p0.x + (p1.x - p0.x) * alpha,
          y: p0.y + (p1.y - p0.y) * alpha,
          a: p0.a + da * alpha,
        };
      });

      const bullets: Bullet[] = f0.bullets.map((b) => ({
        ...b,
        x: b.x + b.vx * (span * alpha),
        y: b.y + b.vy * (span * alpha),
      }));

      const floors: BuildingFloor[] = this.floors.map((f, i) => {
        const a0 = f0.roofAlphas[i] ?? 1;
        const a1 = f1.roofAlphas[i] ?? a0;
        return { ...f, roofAlpha: a0 + (a1 - a0) * alpha };
      });

      const doors: BuildingDoor[] = this.doors.map((d, i) => {
        const v = f0.doorsOpen?.[i] ?? (d.open ? (d.openDir ?? (d.horizontal ? -1 : 1)) : 0);
        const isOpen = v !== 0;
        const dir: 1 | -1 = v >= 0 ? 1 : -1;
        return { ...d, open: isOpen, openDir: dir, openProgress: isOpen ? dir : 0 };
      });

      const meSnap = players.find((p) => p.id === f0.meId) || null;

      return {
        isDeathCam: true,
        camX: f0.camX + (f1.camX - f0.camX) * alpha,
        camY: f0.camY + (f1.camY - f0.camY) * alpha,
        zoom: f0.zoom + (f1.zoom - f0.zoom) * alpha,
        elapsed: targetT,
        me: meSnap,
        players,
        bullets,
        loot: f0.loot,
        chests: f0.chests,
        obstacles: f0.obstacles,
        grenades: f0.grenades,
        shockwaves: f0.shockwaves,
        particles: f0.particles,
        storm: f0.storm,
        plane: f0.plane,
        floors,
        walls: this.walls,
        doors,
        roads: this.roads,
        shake: 0,
        hitmarker: 0,
        paused: this.paused,
        ambient: false,
        mouseX: this.mouseX,
        mouseY: this.mouseY,
      };
    }

    const cam = this.getCameraTarget();
    return {
      isDeathCam: false,
      camX: cam.x,
      camY: cam.y,
      zoom: this.cameraZoom || 1,
      elapsed: this.elapsed,
      me: this.me,
      players: this.players,
      bullets: this.bullets,
      loot: this.loot,
      chests: this.chests,
      obstacles: this.obstacles,
      grenades: this.grenades,
      shockwaves: this.shockwaves,
      particles: this.particles,
      storm: this.storm,
      plane: this.plane,
      floors: this.floors,
      walls: this.walls,
      doors: this.doors,
      roads: this.roads,
      shake: this.shake,
      hitmarker: this.hitmarker,
      paused: this.paused,
      ambient: this.ambient,
      mouseX: this.mouseX,
      mouseY: this.mouseY,
    };
  }
}

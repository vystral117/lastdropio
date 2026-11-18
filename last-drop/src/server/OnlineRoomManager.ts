import type { WebSocket } from 'ws';
import {
  AMMO_INFO,
  AMMO_TYPES,
  BOT_NAMES,
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
} from '../game/constants.ts';
import type {
  AmmoType,
  BuildingDoor,
  BuildingFloor,
  Bullet,
  Chest,
  DropPlane,
  FeedItem,
  Grenade,
  LootItem,
  Obstacle,
  Player,
  RarityTier,
  RoadSegment,
  StormState,
  Wall,
} from '../game/types.ts';

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

export interface ClientInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  angle: number;
  mouseDown: boolean;
  throwPower: number;
}

export interface JoinPayload {
  name?: string;
  skinId?: string;
  pickaxeId?: string;
  backblingId?: string;
  gliderColor?: string;
  skinTone?: string;
}

export interface RoomEventPacket {
  type: 'boom' | 'impulse' | 'reverse' | 'chest' | 'airdrop' | 'shot' | 'hurt' | 'hit' | 'kill' | 'die' | 'dmg' | 'door' | 'bounce' | 'empty';
  x: number;
  y: number;
  c?: string;
  w?: number;
  r?: number;
  text?: string;
  targetId?: number;
  attackerId?: number;
  open?: boolean;
}

interface HumanSession {
  ws: WebSocket;
  playerId: number;
  roomId: string;
  input: ClientInputState;
}

interface OnlineRoom {
  id: string;
  phase: 'COUNTDOWN' | 'PLANE' | 'ACTIVE' | 'ENDED';
  countdown: number;
  elapsed: number;
  nextId: number;
  stormTick: number;
  nextAir: number;
  players: Player[];
  bullets: Bullet[];
  loot: LootItem[];
  chests: Chest[];
  obstacles: Obstacle[];
  floors: BuildingFloor[];
  walls: Wall[];
  doors: BuildingDoor[];
  roads: RoadSegment[];
  grenades: Grenade[];
  feed: FeedItem[];
  plane: DropPlane;
  storm: StormState;
  events: RoomEventPacket[];
  humans: Map<number, HumanSession>;
  broadcastAcc: number;
  pendingResults: Array<{ player: Player; title: 'VICTORY' | 'ELIMINATED'; winnerName?: string }>;
}

export class OnlineRoomManager {
  private rooms: Map<string, OnlineRoom> = new Map();
  private sessions: Map<WebSocket, HumanSession> = new Map();
  private roomSeq = 1;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private lastTickMs = Date.now();

  public start() {
    if (this.tickTimer) return;
    this.lastTickMs = Date.now();
    this.tickTimer = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTickMs) / 1000));
      this.lastTickMs = now;
      this.stepAll(dt);
    }, 33);
  }

  public stop() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  public getStats() {
    let onlinePlayers = 0;
    let activeRooms = 0;
    let waitingRooms = 0;
    for (const room of this.rooms.values()) {
      onlinePlayers += room.humans.size;
      if (room.phase === 'COUNTDOWN') waitingRooms++;
      else if (room.phase === 'PLANE' || room.phase === 'ACTIVE') activeRooms++;
    }
    return { onlinePlayers, activeRooms, waitingRooms };
  }

  public handleJoin(ws: WebSocket, payload: JoinPayload) {
    // Clean up if socket already had a session
    if (this.sessions.has(ws)) {
      this.handleDisconnect(ws);
    }

    let room: OnlineRoom | null = null;
    for (const r of this.rooms.values()) {
      if ((r.phase === 'COUNTDOWN' || r.phase === 'PLANE') && r.humans.size < TOTAL_PLAYERS) {
        room = r;
        break;
      }
    }
    if (!room) {
      room = this.createRoom();
    }

    const cleanName = String(payload.name || 'Survivor')
      .trim()
      .replace(/[<>&"']/g, '')
      .slice(0, 16) || 'Survivor';

    let p: Player;
    if (room.phase === 'PLANE') {
      // Replace one bot still in plane or alive so total stays 24
      const botIdx = room.players.findIndex((pl) => pl.bot && pl.alive);
      p = this.createPlayer(room, cleanName, false, room.humans.size, true);
      p.x = room.plane.x;
      p.y = room.plane.y;
      if (botIdx >= 0) {
        room.players.splice(botIdx, 1, p);
      } else {
        room.players.push(p);
      }
    } else {
      p = this.createPlayer(room, cleanName, false, room.humans.size, true);
      p.x = room.plane.sx;
      p.y = room.plane.sy;
      room.players.push(p);
    }

    if (payload.skinTone) p.fl = payload.skinTone;
    if (payload.gliderColor) p.col = payload.gliderColor;
    if (payload.skinId) p.skinId = payload.skinId;
    if (payload.pickaxeId) p.pickaxeId = payload.pickaxeId;
    if (payload.backblingId) p.backblingId = payload.backblingId;

    const session: HumanSession = {
      ws,
      playerId: p.id,
      roomId: room.id,
      input: {
        up: false,
        down: false,
        left: false,
        right: false,
        sprint: false,
        angle: 0,
        mouseDown: false,
        throwPower: 0.65,
      },
    };
    room.humans.set(p.id, session);
    this.sessions.set(ws, session);

    this.pushFeed(room, `${p.name} joined the drop`, '#38bdf8');
    this.sendInit(room, session);
    this.broadcastState(room);
  }

  public handleMessage(ws: WebSocket, raw: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'join') {
      this.handleJoin(ws, msg as JoinPayload);
      return;
    }

    const session = this.sessions.get(ws);
    if (!session) return;
    const room = this.rooms.get(session.roomId);
    if (!room) return;
    const me = room.players.find((pl) => pl.id === session.playerId);
    if (!me) return;

    if (msg.type === 'input') {
      const k = (msg.keys as Record<string, boolean>) || {};
      session.input.up = Boolean(k.up);
      session.input.down = Boolean(k.down);
      session.input.left = Boolean(k.left);
      session.input.right = Boolean(k.right);
      session.input.sprint = Boolean(k.sprint);
      if (typeof msg.angle === 'number' && Number.isFinite(msg.angle)) {
        session.input.angle = msg.angle;
      }
      session.input.mouseDown = Boolean(msg.mouseDown);
      if (typeof msg.throwPower === 'number' && Number.isFinite(msg.throwPower)) {
        session.input.throwPower = Math.max(0.22, Math.min(1, msg.throwPower));
      }
      return;
    }

    if (msg.type === 'emote') {
      if (!me.alive || me.inPlane || room.phase === 'COUNTDOWN') return;
      me.emote = String(msg.emote || 'GG!').slice(0, 8);
      me.emoteTimer = 2.2;
      return;
    }

    if (room.phase === 'COUNTDOWN') return;

    if (msg.type === 'jump') {
      if (!me.alive || !me.inPlane) return;
      me.inPlane = false;
      me.dropTime = 1.6;
      me.dropMax = 1.6;
      me.x = room.plane.x;
      me.y = room.plane.y;
      return;
    }

    if (!me.alive || me.inPlane || me.dropTime > 0) return;

    if (msg.type === 'selectSlot') {
      const i = Number(msg.slot);
      if (Number.isInteger(i) && i >= 0 && i < 6 && me.inv[i] >= 0) {
        me.sl = i;
        me.w = me.inv[i];
      }
    } else if (msg.type === 'swapSlots') {
      const fromIdx = Number(msg.from);
      const toIdx = Number(msg.to);
      if (
        fromIdx > 0 &&
        toIdx > 0 &&
        fromIdx !== toIdx &&
        fromIdx < 6 &&
        toIdx < 6 &&
        me.inv[fromIdx] >= 0
      ) {
        [me.inv[fromIdx], me.inv[toIdx]] = [me.inv[toIdx], me.inv[fromIdx]];
        [me.invRarity[fromIdx], me.invRarity[toIdx]] = [
          me.invRarity[toIdx],
          me.invRarity[fromIdx],
        ];
        if (me.sl === fromIdx) me.sl = toIdx;
        else if (me.sl === toIdx) me.sl = fromIdx;
        me.w = me.inv[me.sl];
      }
    } else if (msg.type === 'dropSlot') {
      const slotIdx = Number(msg.slot);
      if (slotIdx > 0 && slotIdx < 6 && me.inv[slotIdx] >= 0) {
        const wi = me.inv[slotIdx];
        const rarity = me.invRarity[slotIdx] || 0;
        const n = isStackable(wi) ? this.countItem(me, wi) : 1;
        const mag = WP[wi]?.mag !== undefined ? (me.am[wi] ?? WP[wi].mag) : undefined;
        me.inv[slotIdx] = -1;
        me.invRarity[slotIdx] = 0;
        if (isStackable(wi)) this.setItemCount(me, wi, 0);
        room.loot.push({
          id: room.nextId++,
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
        }
      }
    } else if (msg.type === 'pick') {
      this.pickUpNearest(room, me);
    } else if (msg.type === 'reload') {
      this.startReload(me);
    }
  }

  public handleDisconnect(ws: WebSocket) {
    const session = this.sessions.get(ws);
    if (!session) return;
    this.sessions.delete(ws);

    const room = this.rooms.get(session.roomId);
    if (!room) return;
    room.humans.delete(session.playerId);

    const p = room.players.find((pl) => pl.id === session.playerId);
    if (p) {
      if (room.phase === 'COUNTDOWN') {
        room.players = room.players.filter((pl) => pl.id !== p.id);
      } else if (p.alive) {
        // Convert disconnected player into a bot or eliminate cleanly
        p.bot = true;
        p.name = `${p.name} (Bot)`;
        if (p.inPlane) p.planeJumpAt = Math.min(0.95, Math.max(room.plane.progress + 0.08, 0.25));
      }
    }

    if (room.humans.size === 0) {
      this.rooms.delete(room.id);
    }
  }

  private createRoom(): OnlineRoom {
    const id = `room_${this.roomSeq++}`;
    const angle = rnd(0, Math.PI * 2);
    const dist = 3350;
    const perpOffset = rnd(-800, 800);
    const px = -Math.sin(angle) * perpOffset;
    const py = Math.cos(angle) * perpOffset;
    const sx = MAP_CENTER - Math.cos(angle) * dist + px;
    const sy = MAP_CENTER - Math.sin(angle) * dist + py;
    const ex = MAP_CENTER + Math.cos(angle) * dist + px;
    const ey = MAP_CENTER + Math.sin(angle) * dist + py;

    const room: OnlineRoom = {
      id,
      phase: 'COUNTDOWN',
      countdown: 4.0,
      elapsed: 0,
      nextId: 1,
      stormTick: 0,
      nextAir: 35,
      players: [],
      bullets: [],
      loot: [],
      chests: [],
      obstacles: [],
      floors: [],
      walls: [],
      doors: [],
      roads: [],
      grenades: [],
      feed: [],
      plane: {
        active: false,
        sx,
        sy,
        ex,
        ey,
        x: sx,
        y: sy,
        a: Math.atan2(ey - sy, ex - sx),
        progress: 0,
      },
      storm: {
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
      },
      events: [],
      humans: new Map(),
      broadcastAcc: 0,
      pendingResults: [],
    };

    this.generateWorld(room);
    this.rooms.set(id, room);
    return room;
  }

  private generateWorld(room: OnlineRoom) {
    room.roads = [
      { x1: 1650, y1: 1550, x2: 3500, y2: 1450, w: 72 },
      { x1: 3500, y1: 1450, x2: 5400, y2: 1400, w: 72 },
      { x1: 1650, y1: 1550, x2: 2050, y2: 3450, w: 76 },
      { x1: 2050, y1: 3450, x2: 3700, y2: 3550, w: 76 },
      { x1: 3700, y1: 3550, x2: 5600, y2: 3400, w: 76 },
      { x1: 3500, y1: 1450, x2: 3700, y2: 3550, w: 72 },
      { x1: 3700, y1: 3550, x2: 3550, y2: 4950, w: 74 },
      { x1: 2050, y1: 3450, x2: 1550, y2: 5450, w: 70 },
      { x1: 1550, y1: 5450, x2: 3550, y2: 4950, w: 70 },
      { x1: 3550, y1: 4950, x2: 3750, y2: 6050, w: 68 },
      { x1: 3550, y1: 4950, x2: 5650, y2: 5550, w: 72 },
      { x1: 5600, y1: 3400, x2: 5650, y2: 5550, w: 72 },
    ];

    const minLand = ISLAND_MARGIN + 100;
    const maxLand = MAP_SIZE - ISLAND_MARGIN - 100;

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
      room.obstacles.push({
        x: rnd(minLand, maxLand),
        y: rnd(minLand, maxLand),
        r,
        kind,
        hp: mh,
        mh,
        hitFlash: 0,
      });
    }

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
      } else if (q < 0.85) {
        w = 7;
      } else {
        w = 8;
      }
      room.loot.push({
        id: room.nextId++,
        x: rnd(minLand, maxLand),
        y: rnd(minLand, maxLand),
        t: 'w',
        w,
        r: isStackable(w) ? 0 : rollRarity(0),
      });
    }

    for (let i = 0; i < 190; i++) {
      const aType = AMMO_TYPES[Math.floor(Math.random() * AMMO_TYPES.length)];
      room.loot.push({
        id: room.nextId++,
        x: rnd(minLand, maxLand),
        y: rnd(minLand, maxLand),
        t: 'a',
        w: 0,
        r: 0,
        ammoType: aType,
        n: AMMO_INFO[aType].packAmount,
      });
    }

    this.buildStructures(room);
  }

  private buildStructures(room: OnlineRoom) {
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
      room.floors.push({ x, y, w, h, roofColor, roofAlpha: 1, poiName });

      const addWall = (wx: number, wy: number, ww: number, wh: number) =>
        room.walls.push({ x: wx, y: wy, w: ww, h: wh });

      const horiz = (yy: number, hasDoor: boolean) => {
        if (hasDoor) {
          const o = rnd(26, w - gp - 26);
          addWall(x, yy, o, t);
          addWall(x + o + gp, yy, w - o - gp, t);
          room.doors.push({
            id: room.nextId++,
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
          room.doors.push({
            id: room.nextId++,
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

      room.chests.push({
        id: room.nextId++,
        x: x + w * rnd(0.3, 0.7),
        y: y + h * rnd(0.3, 0.7),
        opened: false,
        golden: Math.random() < goldenChance,
      });

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
              : q < 0.84
                ? 7
                : 8;
        room.loot.push({
          id: room.nextId++,
          x: x + t + 32 + Math.random() * (w - 2 * t - 64),
          y: y + t + 32 + Math.random() * (h - 2 * t - 64),
          t: 'w',
          w: wi,
          r: isStackable(wi) ? 0 : rollRarity(0.14),
        });
      }
    };

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
          !room.floors.some(
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

    for (let n = 0; n < 18; n++) {
      const w = rnd(220, 300);
      const h = rnd(190, 250);
      const bx = rnd(450, MAP_SIZE - 450 - w);
      const by = rnd(450, MAP_SIZE - 450 - h);
      if (
        !room.floors.some(
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

    room.obstacles = room.obstacles.filter(
      (o) =>
        !room.floors.some(
          (f) =>
            o.x > f.x - 65 &&
            o.x < f.x + f.w + 65 &&
            o.y > f.y - 65 &&
            o.y < f.y + f.h + 65
        )
    );
  }

  private createPlayer(
    room: OnlineRoom,
    name: string,
    bot: boolean,
    idx: number,
    startInPlane: boolean
  ): Player {
    const skins = ['skin_classic', 'skin_classic', 'skin_ranger', 'skin_medic', 'skin_sheriff', 'skin_beanie', 'skin_knight', 'skin_cyber'];
    const pickaxes = ['pick_fists', 'pick_timber', 'pick_tactical', 'pick_plasma', 'pick_emerald', 'pick_crimson', 'pick_golden'];
    const backblings = ['bb_none', 'bb_none', 'bb_jetpack', 'bb_satchel', 'bb_shield'];
    return {
      id: room.nextId++,
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
      sk: 0.65 + Math.random() * 0.35,
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
      kvx: 0,
      kvy: 0,
    };
  }

  private stepAll(dt: number) {
    for (const room of this.rooms.values()) {
      this.stepRoom(room, dt);
    }
  }

  private stepRoom(room: OnlineRoom, dt: number) {
    if (room.humans.size === 0) {
      this.rooms.delete(room.id);
      return;
    }

    if (room.phase === 'COUNTDOWN') {
      room.countdown -= dt;
      if (room.countdown <= 0) {
        room.phase = 'PLANE';
        room.plane.active = true;
        // Backfill bots up to TOTAL_PLAYERS
        const needed = Math.max(0, TOTAL_PLAYERS - room.players.length);
        for (let i = 0; i < needed; i++) {
          const bot = this.createPlayer(room, BOT_NAMES[i % BOT_NAMES.length], true, i, true);
          bot.x = room.plane.sx;
          bot.y = room.plane.sy;
          bot.planeJumpAt = rnd(0.1, 0.9);
          room.players.push(bot);
        }
        this.pushFeed(room, 'Drop Plane airborne — Press Space to jump!', '#38bdf8');
      }
      room.broadcastAcc += dt;
      if (room.broadcastAcc >= 0.05) {
        room.broadcastAcc = 0;
        this.broadcastState(room);
      }
      return;
    }

    if (room.phase === 'ENDED') {
      return;
    }

    room.elapsed += dt;

    if (room.plane.active) {
      room.plane.progress += dt / 16.5;
      const p = Math.min(1, room.plane.progress);
      room.plane.x = room.plane.sx + (room.plane.ex - room.plane.sx) * p;
      room.plane.y = room.plane.sy + (room.plane.ey - room.plane.sy) * p;

      for (const pl of room.players) {
        if (!pl.alive || !pl.inPlane) continue;
        pl.x = room.plane.x;
        pl.y = room.plane.y;
        if (pl.bot && p >= pl.planeJumpAt) {
          pl.inPlane = false;
          pl.dropTime = 1.6;
          pl.dropMax = 1.6;
          let bestPoi = POIS[Math.floor(Math.random() * POIS.length)];
          let bestD = 1e9;
          for (const poi of POIS) {
            const d = hyp(poi.x - room.plane.x, poi.y - room.plane.y);
            if (d < bestD && Math.random() < 0.75) {
              bestD = d;
              bestPoi = poi;
            }
          }
          pl.tx = bestPoi.x + rnd(-260, 260);
          pl.ty = bestPoi.y + rnd(-260, 260);
        }
      }

      if (room.plane.progress >= 1) {
        room.plane.active = false;
        room.phase = 'ACTIVE';
        for (const pl of room.players) {
          if (pl.alive && pl.inPlane) {
            pl.inPlane = false;
            pl.dropTime = 1.6;
            pl.dropMax = 1.6;
          }
        }
      }
    }

    this.updateStorm(room, dt);
    room.stormTick += dt;
    const tick = room.stormTick >= 1;
    if (tick) room.stormTick -= 1;

    room.nextAir -= dt;
    if (room.nextAir <= 0) {
      room.nextAir = 42;
      const a = rnd(0, Math.PI * 2);
      const d = rnd(0, room.storm.r * 0.65);
      const ax = room.storm.x + Math.cos(a) * d;
      const ay = room.storm.y + Math.sin(a) * d;
      room.loot.push({
        id: room.nextId++,
        x: ax,
        y: ay,
        t: 'w',
        w: Math.random() < 0.65 ? 9 : 5,
        r: Math.random() < 0.45 ? 5 : 4,
        air: 1,
      });
      this.pushFeed(room, 'Supply Drop landed inside the safe zone', '#ffd24d');
      room.events.push({ type: 'airdrop', x: ax, y: ay });
    }

    for (const o of room.obstacles) {
      if (o.hitFlash > 0) o.hitFlash = Math.max(0, o.hitFlash - dt);
    }

    for (let i = room.grenades.length - 1; i >= 0; i--) {
      const g = room.grenades[i];
      this.stepGrenadePhysics(room, g, dt);
      g.l -= dt;
      if (g.l <= 0) {
        if (g.kind === 'impulse') {
          this.impulseAt(room, g.x, g.y, 225, 1);
        } else if (g.kind === 'reverse') {
          this.impulseAt(room, g.x, g.y, 250, -1);
        } else {
          this.explodeAt(room, g.x, g.y, 110, 68, g.o);
        }
        room.grenades.splice(i, 1);
      }
    }

    for (const p of room.players) {
      if (!p.alive) continue;

      if (p.emoteTimer > 0) {
        p.emoteTimer -= dt;
        if (p.emoteTimer <= 0) p.emote = null;
      }

      if (p.inPlane) continue;

      const sess = !p.bot ? room.humans.get(p.id) : undefined;

      if (p.dropTime > 0) {
        p.dropTime = Math.max(0, p.dropTime - dt);
        let vx = 0;
        let vy = 0;
        if (p.bot) {
          vx = p.tx - p.x;
          vy = p.ty - p.y;
          p.a = Math.atan2(vy, vx);
        } else if (sess) {
          vx = (sess.input.right ? 1 : 0) - (sess.input.left ? 1 : 0);
          vy = (sess.input.down ? 1 : 0) - (sess.input.up ? 1 : 0);
          p.a = sess.input.angle;
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
        this.runBotAI(room, p, dt);
        const l0 = hyp(p.vx, p.vy) || 1;
        const tx = p.vx / l0;
        const ty = p.vy / l0;
        const k = Math.min(1, dt * 9);
        p.mx = (p.mx || 0) + (tx - (p.mx || 0)) * k;
        p.my = (p.my || 0) + (ty - (p.my || 0)) * k;
        const mv = p.vx || p.vy;
        vx = mv ? p.mx : 0;
        vy = mv ? p.my : 0;
      } else if (sess) {
        vx = (sess.input.right ? 1 : 0) - (sess.input.left ? 1 : 0);
        vy = (sess.input.down ? 1 : 0) - (sess.input.up ? 1 : 0);
        p.a = sess.input.angle;
        if (sess.input.mouseDown) this.shoot(room, p, sess.input.throwPower);
      }

      let sp = p.bot ? 215 : 245;
      const inWater =
        p.x < ISLAND_MARGIN ||
        p.x > MAP_SIZE - ISLAND_MARGIN ||
        p.y < ISLAND_MARGIN ||
        p.y > MAP_SIZE - ISLAND_MARGIN;
      if (inWater) sp *= 0.65;

      if (!p.bot && sess) {
        if (sess.input.sprint && (vx || vy) && p.st > 0) {
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
          this.resolveWalls(room, p, PLAYER_RADIUS);
        }
        const damp = Math.pow(0.04, dt);
        p.kvx = Math.abs(p.kvx || 0) < 8 ? 0 : (p.kvx || 0) * damp;
        p.kvy = Math.abs(p.kvy || 0) < 8 ? 0 : (p.kvy || 0) * damp;
      }

      p.x = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE - PLAYER_RADIUS, p.x));
      p.y = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE - PLAYER_RADIUS, p.y));
      p.cd -= dt;
      p.pc -= dt;

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

      for (const q of room.players) {
        if (q !== p && q.alive && !q.inPlane && q.dropTime <= 0) {
          const d = hyp(p.x - q.x, p.y - q.y);
          if (d > 0 && d < 30) {
            const k = (30 - d) / 2;
            p.x += ((p.x - q.x) / d) * k;
            p.y += ((p.y - q.y) / d) * k;
          }
        }
      }

      for (const o of room.obstacles) {
        const colR = o.kind === 'tree' ? o.r * 0.45 : o.r;
        const d = hyp(p.x - o.x, p.y - o.y);
        const m = colR + PLAYER_RADIUS;
        if (d < m && d > 0) {
          p.x = o.x + ((p.x - o.x) / d) * m;
          p.y = o.y + ((p.y - o.y) / d) * m;
        }
      }

      this.resolveWalls(room, p, PLAYER_RADIUS);

      for (let i = room.loot.length - 1; i >= 0; i--) {
        const l = room.loot[i];
        if (l.t !== 'a' || hyp(p.x - l.x, p.y - l.y) > 30) continue;
        if (this.pickupAmmoPack(p, l)) {
          room.loot.splice(i, 1);
        }
      }

      if (p.bot) {
        for (const d of room.doors) {
          if (d.open) continue;
          const dcx = d.x + d.w / 2;
          const dcy = d.y + d.h / 2;
          if (hyp(p.x - dcx, p.y - dcy) < 56) {
            d.open = true;
            d.openDir = computeDoorOpenDir(d, p);
            room.events.push({ type: 'door', x: dcx, y: dcy, open: true });
          }
        }
        for (const c of room.chests) {
          if (!c.opened && hyp(p.x - c.x, p.y - c.y) < 42) {
            this.openChest(room, c, p);
            if (p.targetChest === c) p.targetChest = null;
          }
        }

        for (let i = room.loot.length - 1; i >= 0; i--) {
          const l = room.loot[i];
          if (hyp(p.x - l.x, p.y - l.y) > 30) continue;
          if (l.t === 'a') {
            if (this.pickupAmmoPack(p, l)) room.loot.splice(i, 1);
          } else if (l.t === 'w') {
            if (this.pickupWeaponOrItem(p, l)) room.loot.splice(i, 1);
          } else if (l.t === 'h') {
            if (p.hp < 100) {
              p.hp = Math.min(100, p.hp + 30);
              room.loot.splice(i, 1);
            }
          } else if (p.sh < 100) {
            p.sh = Math.min(100, p.sh + 30);
            room.loot.splice(i, 1);
          }
        }

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

      if (tick && hyp(p.x - room.storm.x, p.y - room.storm.y) > room.storm.r) {
        this.damagePlayer(room, p, 2 + room.storm.i * 1.5, null);
      }
    }

    for (let i = room.bullets.length - 1; i >= 0; i--) {
      const b = room.bullets[i];
      b.px = b.x;
      b.py = b.y;
      b.l -= dt;
      let dead = b.l <= 0;
      const steps = Math.max(1, Math.ceil((hyp(b.vx, b.vy) * dt) / 10));
      for (let s = 0; s < steps && !dead; s++) {
        b.x += (b.vx * dt) / steps;
        b.y += (b.vy * dt) / steps;
        dead = this.checkBulletHit(room, b);
      }
      if (dead) room.bullets.splice(i, 1);
    }

    for (const f of room.feed) f.t -= dt;
    room.feed = room.feed.filter((f) => f.t > 0);

    // Check match victory / human eliminations
    const alivePlayers = room.players.filter((q) => q.alive);
    if (alivePlayers.length <= 1 && room.players.length >= 2) {
      const winner = alivePlayers[0];
      if (winner && !winner.bot && !winner.fin) {
        winner.fin = true;
        room.pendingResults.push({ player: winner, title: 'VICTORY', winnerName: winner.name });
      }
      for (const sess of room.humans.values()) {
        this.sendToSession(sess, {
          type: 'allEliminated',
          winnerName: winner?.name || 'Unknown',
        });
      }
      room.phase = 'ENDED';
    }

    room.broadcastAcc += dt;
    if (room.broadcastAcc >= 0.05 || room.pendingResults.length > 0) {
      room.broadcastAcc = 0;
      this.broadcastState(room);
    }

    if (room.pendingResults.length > 0) {
      const toSend = room.pendingResults.splice(0);
      for (const item of toSend) {
        this.sendMatchResult(room, item.player, item.title, item.winnerName);
      }
    }
  }

  private pickUpNearest(room: OnlineRoom, me: Player) {
    let bestChest: Chest | null = null;
    let bestChestDist = 64;
    for (const c of room.chests) {
      if (c.opened) continue;
      const d = hyp(c.x - me.x, c.y - me.y);
      if (d < bestChestDist) {
        bestChestDist = d;
        bestChest = c;
      }
    }

    let bestIdx = -1;
    let bestDist = 48;
    for (let i = 0; i < room.loot.length; i++) {
      const l = room.loot[i];
      const d = hyp(l.x - me.x, l.y - me.y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    let bestDoor: BuildingDoor | null = null;
    let bestDoorDist = 72;
    for (const d of room.doors) {
      const dcx = d.x + d.w / 2;
      const dcy = d.y + d.h / 2;
      const dist = hyp(dcx - me.x, dcy - me.y);
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
      bestDoor.open = !bestDoor.open;
      if (bestDoor.open) {
        bestDoor.openDir = computeDoorOpenDir(bestDoor, me);
      }
      room.events.push({
        type: 'door',
        x: bestDoor.x + bestDoor.w / 2,
        y: bestDoor.y + bestDoor.h / 2,
        open: bestDoor.open,
      });
      return;
    }

    if (bestChest) {
      this.openChest(room, bestChest, me);
      return;
    }

    if (bestIdx < 0) return;

    const item = room.loot[bestIdx];
    if (item.t === 'a') {
      if (this.pickupAmmoPack(me, item)) {
        room.loot.splice(bestIdx, 1);
      }
    } else if (item.t === 'w') {
      if (this.pickupWeaponOrItem(me, item)) {
        room.loot.splice(bestIdx, 1);
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
        room.loot[bestIdx] = {
          id: room.nextId++,
          x: me.x,
          y: me.y,
          t: 'w',
          w: oldW,
          r: oldR,
          mag: oldMag,
        };
      }
    } else if (item.t === 'h') {
      if (me.hp >= 100) return;
      me.hp = Math.min(100, me.hp + 30);
      room.loot.splice(bestIdx, 1);
    } else {
      if (me.sh >= 100) return;
      me.sh = Math.min(100, me.sh + 30);
      room.loot.splice(bestIdx, 1);
    }
  }

  private openChest(room: OnlineRoom, chest: Chest, _opener: Player) {
    if (chest.opened) return;
    chest.opened = true;
    room.events.push({
      type: 'chest',
      x: chest.x,
      y: chest.y,
      c: chest.golden ? '#fbbf24' : '#c08457',
    });

    const boost = chest.golden ? 0.36 : 0.14;
    const weaponPick = chest.golden
      ? Math.random() < 0.24
        ? 9
        : 2 + Math.floor(Math.random() * 4)
      : Math.random() < 0.18
        ? 5
        : 1 + Math.floor(Math.random() * 4);
    const utilRoll = Math.random();
    const utilWeapon = utilRoll < 0.36 ? 7 : utilRoll < 0.68 ? 8 : utilRoll < 0.84 ? 10 : 11;
    const itemsToDrop: { t: 'w' | 'a'; w: number; r: RarityTier; ammoType?: AmmoType; n?: number }[] = [
      { t: 'w', w: weaponPick, r: rollRarity(boost) },
      { t: 'w', w: utilWeapon, r: 0 },
    ];
    const wAmmoType = WP[weaponPick]?.ammoType;
    if (wAmmoType) {
      const packAmt = Math.round(AMMO_INFO[wAmmoType].packAmount * (chest.golden ? 1.5 : 1));
      itemsToDrop.push({ t: 'a', w: 0, r: 0, ammoType: wAmmoType, n: packAmt });
    }
    if (chest.golden || Math.random() < 0.5) {
      const r2 = Math.random();
      itemsToDrop.push({ t: 'w', w: r2 < 0.34 ? 6 : r2 < 0.64 ? 8 : r2 < 0.82 ? 10 : 11, r: 0 });
    }

    itemsToDrop.forEach((entry, idx) => {
      const ang = (idx / itemsToDrop.length) * Math.PI * 2 + rnd(-0.3, 0.3);
      room.loot.push({
        id: room.nextId++,
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
  }

  private stepGrenadePhysics(room: OnlineRoom, g: Grenade, dt: number) {
    const gr = 6.5;

    g.vz = (g.vz ?? 0) - 620 * dt;
    g.z = (g.z ?? 0) + g.vz * dt;
    if (g.z <= 0) {
      g.z = 0;
      if (Math.abs(g.vz) > 55) {
        g.vz = -g.vz * 0.44;
        g.vx *= 0.88;
        g.vy *= 0.88;
        room.events.push({ type: 'bounce', x: g.x, y: g.y });
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
          room.events.push({ type: 'bounce', x: g.x, y: g.y });
        }
      }
    };

    for (let s = 0; s < steps; s++) {
      g.x += (g.vx * dt) / steps;
      g.y += (g.vy * dt) / steps;

      for (const w of room.walls) {
        bounceRect(w.x, w.y, w.w, w.h);
      }
      for (const d of room.doors) {
        if (!d.open) {
          bounceRect(d.x, d.y, d.w, d.h);
        }
      }
      for (const o of room.obstacles) {
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

  private impulseAt(room: OnlineRoom, x: number, y: number, radius: number, dir: 1 | -1) {
    room.events.push({
      type: dir === 1 ? 'impulse' : 'reverse',
      x,
      y,
      r: radius,
      c: dir === 1 ? '#38bdf8' : '#c084fc',
    });

    for (const p of room.players) {
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

  private explodeAt(
    room: OnlineRoom,
    x: number,
    y: number,
    radius: number,
    maxDmg: number,
    attacker: Player | null
  ) {
    room.events.push({ type: 'boom', x, y, r: radius, c: '#ffb340' });

    for (let k = room.obstacles.length - 1; k >= 0; k--) {
      if (hyp(room.obstacles[k].x - x, room.obstacles[k].y - y) < radius) {
        this.damageObstacle(room, k, 80, attacker);
      }
    }

    for (const p of room.players) {
      if (p.alive && !p.inPlane && p.dropTime <= 0) {
        const d = hyp(p.x - x, p.y - y);
        if (d < radius) {
          this.damagePlayer(room, p, maxDmg * (1 - d / (radius * 1.35)), attacker);
        }
      }
    }
  }

  private updateStorm(room: OnlineRoom, dt: number) {
    const s = room.storm;
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

  private resolveWalls(room: OnlineRoom, p: { x: number; y: number }, r: number) {
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

    for (const w of room.walls) {
      pushOutRect(w.x, w.y, w.w, w.h);
    }
    for (const d of room.doors) {
      if (!d.open) {
        pushOutRect(d.x, d.y, d.w, d.h);
      }
    }
  }

  private checkBulletHit(room: OnlineRoom, b: Bullet): boolean {
    for (let k = 0; k < room.obstacles.length; k++) {
      const o = room.obstacles[k];
      const hitR = o.kind === 'tree' ? o.r * 0.48 : o.r;
      if (hyp(b.x - o.x, b.y - o.y) < hitR) {
        this.damageObstacle(room, k, b.d, b.o);
        return true;
      }
    }

    for (const w of room.walls) {
      if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
        return true;
      }
    }

    for (const d of room.doors) {
      if (!d.open && b.x > d.x && b.x < d.x + d.w && b.y > d.y && b.y < d.y + d.h) {
        return true;
      }
    }

    for (const p of room.players) {
      if (
        p.alive &&
        !p.inPlane &&
        p.dropTime <= 0 &&
        p !== b.o &&
        hyp(b.x - p.x, b.y - p.y) < PLAYER_RADIUS + 1
      ) {
        this.damagePlayer(room, p, b.d, b.o);
        return true;
      }
    }
    return false;
  }

  private damageObstacle(room: OnlineRoom, idx: number, dmg: number, attacker: Player | null) {
    const o = room.obstacles[idx];
    if (!o) return;
    o.hp -= dmg;
    o.hitFlash = 0.07;
    if (o.hp <= 0) {
      room.obstacles.splice(idx, 1);
      if (o.kind === 'barrel') {
        this.explodeAt(room, o.x, o.y, 115, 70, attacker);
      } else if (o.kind === 'crate') {
        const dropW =
          Math.random() < 0.65
            ? 1 + Math.floor(Math.random() * 4)
            : Math.random() < 0.4
              ? 7
              : Math.random() < 0.7
                ? 8
                : 10;
        room.loot.push({
          id: room.nextId++,
          x: o.x,
          y: o.y,
          t: 'w',
          w: dropW,
          r: isStackable(dropW) ? 0 : rollRarity(0.1),
        });
        const crateAmmo = WP[dropW]?.ammoType;
        if (crateAmmo) {
          room.loot.push({
            id: room.nextId++,
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

  private damagePlayer(
    room: OnlineRoom,
    p: Player,
    amount: number,
    attacker: Player | null
  ) {
    if (!p.alive || p.inPlane || p.dropTime > 0) return;
    let d = amount;
    if (attacker && attacker !== p) {
      attacker.dm += d;
    }

    if (p.sh > 0) {
      const absorbed = Math.min(p.sh, d);
      p.sh -= absorbed;
      d -= absorbed;
    }

    p.hp -= d;
    p.hitFlash = 0.08;
    room.events.push({
      type: 'dmg',
      x: p.x,
      y: p.y,
      c: p.col,
      text: Math.round(amount).toString(),
      targetId: p.id,
      attackerId: attacker?.id,
    });

    if (p.hp <= 0) {
      p.alive = false;
      p.by = attacker;
      p.td = room.elapsed;
      p.rank = room.players.filter((q) => q.alive).length + 1;

      room.events.push({
        type: 'kill',
        x: p.x,
        y: p.y,
        c: p.col,
        targetId: p.id,
        attackerId: attacker?.id,
      });

      if (attacker) {
        attacker.k++;
      }

      p.inv.forEach((wi, idx) => {
        if (wi > 0) {
          room.loot.push({
            id: room.nextId++,
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
            room.loot.push({
              id: room.nextId++,
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
      this.pushFeed(room, `${who} eliminated ${p.name}`);

      if (!p.bot && !p.fin) {
        p.fin = true;
        room.pendingResults.push({ player: p, title: 'ELIMINATED' });
      }
    }
  }

  private shoot(room: OnlineRoom, p: Player, throwPowerOverride?: number) {
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
          if (!p.bot) room.events.push({ type: 'empty', x: p.x, y: p.y, attackerId: p.id });
        }
        return;
      }
      p.am[p.w]--;
    }

    p.cd = w.fireRate;
    p.recoil = w.melee ? 0 : 1;
    room.events.push({ type: 'shot', x: p.x, y: p.y, w: p.w, attackerId: p.id });

    if (w.usable) {
      this.useConsumable(p, p.w);
      return;
    }

    if (w.throwable) {
      const count = this.countItem(p, p.w);
      if (count < 1) return;
      this.setItemCount(p, p.w, count - 1);
      const kind: Grenade['kind'] =
        p.w === 10 ? 'impulse' : p.w === 11 ? 'reverse' : 'frag';
      const fuse = kind === 'frag' ? 1.35 : 0.78;
      const power = throwPowerOverride ?? 0.65;
      const maxSpd = kind === 'frag' ? 620 : 710;
      const spd = 190 + (maxSpd - 190) * power;
      const pos = { x: p.x + Math.cos(p.a) * 12, y: p.y + Math.sin(p.a) * 12 };
      this.resolveWalls(room, pos, 7);
      room.grenades.push({
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
      for (const q of room.players) {
        if (q !== p && q.alive && !q.inPlane && q.dropTime <= 0) {
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          if (hyp(dx, dy) < w.range + PLAYER_RADIUS && Math.cos(Math.atan2(dy, dx) - p.a) > 0.5) {
            this.damagePlayer(room, q, dmg, p);
          }
        }
      }
      for (let k = room.obstacles.length - 1; k >= 0; k--) {
        const o = room.obstacles[k];
        const colR = o.kind === 'tree' ? o.r * 0.45 : o.r;
        const dx = o.x - p.x;
        const dy = o.y - p.y;
        if (hyp(dx, dy) - colR < w.range && Math.cos(Math.atan2(dy, dx) - p.a) > 0.4) {
          this.damageObstacle(room, k, dmg, p);
          break;
        }
      }
      return;
    }

    const bulletColor = r >= 1 ? RARITY_TIERS[r].color : w.color;
    for (let i = 0; i < w.pellets; i++) {
      const a = p.a + rnd(-w.spread, w.spread) * (p.bot ? 1.35 : 1);
      const bx = p.x + Math.cos(a) * 18;
      const by = p.y + Math.sin(a) * 18;
      room.bullets.push({
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

  private useConsumable(p: Player, w: number) {
    if (this.countItem(p, w) < 1) return;
    if (w === 7) {
      if (p.hp >= 100) return;
      p.hp = Math.min(100, p.hp + 45);
    } else {
      if (p.sh >= 100) return;
      p.sh = Math.min(100, p.sh + 45);
    }
    this.setItemCount(p, w, this.countItem(p, w) - 1);
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

  private hasLineOfSight(room: OnlineRoom, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
    const n = Math.ceil(hyp(b.x - a.x, b.y - a.y) / 14);
    for (let i = 1; i < n; i++) {
      const x = a.x + ((b.x - a.x) * i) / n;
      const y = a.y + ((b.y - a.y) * i) / n;
      for (const o of room.obstacles) {
        const r = o.kind === 'tree' ? o.r * 0.45 : o.r;
        if (hyp(x - o.x, y - o.y) < r) return false;
      }
      for (const w of room.walls) {
        if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return false;
      }
      for (const d of room.doors) {
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

  private runBotAI(room: OnlineRoom, b: Player, dt: number) {
    let tg: Player | null = null;
    let bd = 1e9;
    for (const q of room.players) {
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

    const nx = room.storm.set && room.storm.t > 10 && room.storm.i < STORM_RADII.length - 1;
    const zx = nx ? room.storm.tx : room.storm.x;
    const zy = nx ? room.storm.ty : room.storm.y;
    const zr = nx ? STORM_RADII[room.storm.i + 1] : room.storm.r;
    const sd = hyp(b.x - zx, b.y - zy);
    const hurt = b.hp + b.sh < 65;
    const sight = tg !== null && bd < 750 && this.hasLineOfSight(room, b, tg);

    if (b.cd <= 0 && (!sight || bd > 220)) {
      if (b.hp < 80 && this.countItem(b, 7) > 0) {
        this.useConsumable(b, 7);
        b.cd = 0.9;
        return;
      }
      if (b.sh < 80 && this.countItem(b, 8) > 0) {
        this.useConsumable(b, 8);
        b.cd = 0.9;
        return;
      }
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
      !room.loot.some((l) => l.w >= 7 && l.w <= 8 && hyp(l.x - b.x, l.y - b.y) < 300)
    ) {
      b.vx = b.x - tg.x;
      b.vy = b.y - tg.y;
      b.a = Math.atan2(-b.vy, -b.vx);
    } else if (
      tg &&
      bd < 680 &&
      sight &&
      (b.inv.some((w) => isGun(w)) ||
        !room.loot.some((l) => isGun(l.w) && hyp(l.x - b.x, l.y - b.y) < 420))
    ) {
      this.chooseBotWeaponForDistance(b, bd);

      const bulletSpd = WP[b.w].bulletSpeed || 900;
      const tFlight = bd / bulletSpd;
      const lead = 0.55 + 0.35 * b.sk;
      const aimX = tg.x + (tg.pvx || 0) * tFlight * lead;
      const aimY = tg.y + (tg.pvy || 0) * tFlight * lead;
      const targetAngle =
        Math.atan2(aimY - b.y, aimX - b.x) +
        Math.sin(room.elapsed * 2.5 + b.x / 40) * 0.1 * (1.2 - b.sk);
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

      if (room.elapsed > (b.st2 || 0)) {
        b.st2 = room.elapsed + rnd(0.9, 2.0);
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
        this.shoot(room, b);
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
        this.resolveWalls(room, bPos, 7);
        room.grenades.push({
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
      let bestChest: Chest | null = null;
      let chestDist = 420;
      if (!b.inv.some((w) => isGun(w)) || Math.random() < 0.4) {
        for (const c of room.chests) {
          if (c.opened) continue;
          const d = hyp(c.x - b.x, c.y - b.y);
          if (d < chestDist && this.hasLineOfSight(room, b, c)) {
            chestDist = d;
            bestChest = c;
          }
        }
      }

      let best: LootItem | null = null;
      let bestScore = 520;
      if (!bestChest) {
        if (b.lb && room.elapsed < (b.lbt || 0) && room.loot.includes(b.lb)) {
          best = b.lb;
        } else {
          for (const l of room.loot) {
            const d = hyp(l.x - b.x, l.y - b.y);
            const weight =
              l.w === 7
                ? b.hp < 75
                  ? 0.45
                  : 1.9
                : l.w === 8
                  ? b.sh < 70
                    ? 0.5
                    : 1.9
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
          b.lbt = room.elapsed + 0.8;
        }
        b.tx = best.x;
        b.ty = best.y;
      } else if (b.tt <= 0 || hyp(b.tx - b.x, b.ty - b.y) < 35) {
        b.tt = rnd(3, 6.5);
        const safePois = POIS.filter(
          (poi) => hyp(poi.x - room.storm.x, poi.y - room.storm.y) < room.storm.r * 0.8
        );
        if (safePois.length > 0 && Math.random() < 0.65) {
          const poi = safePois[Math.floor(Math.random() * safePois.length)];
          b.tx = poi.x + rnd(-220, 220);
          b.ty = poi.y + rnd(-220, 220);
        } else {
          const a = rnd(0, Math.PI * 2);
          const d = rnd(0, Math.max(80, room.storm.r - 200));
          b.tx = room.storm.x + Math.cos(a) * d;
          b.ty = room.storm.y + Math.sin(a) * d;
        }
      }

      b.vx = b.tx - b.x;
      b.vy = b.ty - b.y;
      b.a = Math.atan2(b.vy, b.vx);
    }
  }

  private pushFeed(room: OnlineRoom, text: string, accent?: string) {
    room.feed.unshift({ id: room.nextId++, text, t: 4.5, accent });
    if (room.feed.length > 5) room.feed.length = 5;
  }

  private sendInit(room: OnlineRoom, sess: HumanSession) {
    this.sendToSession(sess, {
      type: 'init',
      myId: sess.playerId,
      roomId: room.id,
      floors: room.floors,
      walls: room.walls,
      doors: room.doors,
      roads: room.roads,
    });
  }

  private sendMatchResult(
    room: OnlineRoom,
    p: Player,
    title: 'VICTORY' | 'ELIMINATED',
    winnerName?: string
  ) {
    const sess = room.humans.get(p.id);
    if (!sess) return;
    const pl = p.alive ? 1 : p.rank;
    const sv = Math.round(p.alive ? room.elapsed : p.td);
    const dm = Math.round(p.dm);
    const killerWeapon =
      p.by && WP[p.by.w] ? WP[p.by.w].name : p.by ? null : 'Storm';
    this.sendToSession(sess, {
      type: 'matchResult',
      result: {
        title,
        pl,
        dm,
        sv,
        k: p.k,
        killer: p.by ? p.by.name : null,
        killerWeapon,
        winnerName,
      },
    });
  }

  private broadcastState(room: OnlineRoom) {
    if (room.humans.size === 0) return;

    const serializedPlayers = room.players.map((p) => ({
      id: p.id,
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
      a: Math.round(p.a * 1000) / 1000,
      hp: Math.round(p.hp * 10) / 10,
      sh: Math.round(p.sh * 10) / 10,
      w: p.w,
      bot: p.bot,
      name: p.name,
      col: p.col,
      skinId: p.skinId,
      pickaxeId: p.pickaxeId,
      backblingId: p.backblingId,
      k: p.k,
      alive: p.alive,
      st: Math.round(p.st),
      gn: p.gn,
      pc: Math.round(p.pc * 100) / 100,
      hd: p.hd,
      fl: p.fl,
      inv: p.inv,
      invRarity: p.invRarity,
      sl: p.sl,
      c: p.c,
      am: p.am,
      ra: p.ra,
      rl: Math.round(p.rl * 100) / 100,
      rt: Math.round(p.rt * 100) / 100,
      rw: p.rw,
      hitFlash: Math.round(p.hitFlash * 100) / 100,
      recoil: Math.round(p.recoil * 100) / 100,
      dm: Math.round(p.dm),
      rank: p.rank,
      byId: p.by ? p.by.id : null,
      byName: p.by ? p.by.name : null,
      inPlane: p.inPlane,
      dropTime: Math.round(p.dropTime * 100) / 100,
      dropMax: p.dropMax,
      emote: p.emote,
    }));

    const payload = JSON.stringify({
      type: 'state',
      phase: room.phase === 'ENDED' ? 'ACTIVE' : room.phase,
      countdown: Math.max(0, Math.ceil(room.countdown)),
      humanCount: room.humans.size,
      elapsed: room.elapsed,
      plane: room.plane,
      storm: room.storm,
      players: serializedPlayers,
      bullets: room.bullets.map((b) => ({
        x: Math.round(b.x),
        y: Math.round(b.y),
        px: Math.round(b.px),
        py: Math.round(b.py),
        vx: Math.round(b.vx),
        vy: Math.round(b.vy),
        l: b.l,
        c: b.c,
        ownerId: b.o.id,
        d: b.d,
      })),
      loot: room.loot,
      chests: room.chests,
      obstacles: room.obstacles,
      grenades: room.grenades.map((g) => ({
        x: Math.round(g.x),
        y: Math.round(g.y),
        vx: Math.round(g.vx),
        vy: Math.round(g.vy),
        z: Math.round((g.z || 0) * 10) / 10,
        vz: Math.round(g.vz || 0),
        l: g.l,
        ml: g.ml,
        kind: g.kind || 'frag',
      })),
      feed: room.feed,
      events: room.events,
      doorsOpen: room.doors.map((d) => (d.open ? (d.openDir ?? (d.horizontal ? -1 : 1)) : 0)),
    });

    room.events = [];

    for (const sess of room.humans.values()) {
      if (sess.ws.readyState === 1) {
        sess.ws.send(payload);
      }
    }
  }

  private sendToSession(sess: HumanSession, data: unknown) {
    if (sess.ws.readyState === 1) {
      sess.ws.send(JSON.stringify(data));
    }
  }
}

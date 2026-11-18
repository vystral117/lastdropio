import { ARENA_RANKS, DEFAULT_KEYBINDS } from './constants';
import { GameDB, LevelInfo, RankInfo, UserProfile } from './types';

const STORAGE_KEY = 'ld2';

const DEFAULT_OWNED = [
  'skin_classic',
  'pick_fists',
  'bb_none',
  'gl_classic',
  'mus_off',
  'mus_skydrop',
];

const DEFAULT_EQUIPPED = {
  skin: 'skin_classic',
  pickaxe: 'pick_fists',
  backbling: 'bb_none',
  glider: 'gl_classic',
  music: 'mus_skydrop',
};

export function generateRandomTagId(taken?: Set<string>): string {
  for (let i = 0; i < 40; i++) {
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const tag = `#${code}`;
    if (!taken || !taken.has(tag)) return tag;
  }
  return `#${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

export function createEmptyProfile(takenTags?: Set<string>): UserProfile {
  return {
    tagId: generateRandomTagId(takenTags),
    coins: 250,
    xp: 0,
    hype: 0,
    eq: -1,
    sk: [],
    ownedCosmetics: [...DEFAULT_OWNED],
    equipped: { ...DEFAULT_EQUIPPED },
    s: { g: 0, w: 0, k: 0, d: 0, b: 0, dm: 0 },
  };
}

export function loadDB(): GameDB {
  let raw: Partial<GameDB> | null = null;
  try {
    const str = localStorage.getItem(STORAGE_KEY);
    if (str) raw = JSON.parse(str) as Partial<GameDB>;
  } catch {
    raw = null;
  }

  return {
    users: raw?.users ?? {},
    cur: raw?.cur ?? null,
    mode: raw?.mode ?? 0,
    set: {
      shake: 1,
      num: 1,
      part: 1,
      snd: 1,
      vol: 0.7,
      lobbyMusic: 1,
      ...(raw?.set ?? {}),
    },
    kb: {
      ...DEFAULT_KEYBINDS,
      ...(raw?.kb ?? {}),
    },
    rep: raw?.rep ?? [],
  };
}

export function saveDB(db: GameDB): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Ignore storage quota errors
  }
}

export function getActiveProfile(db: GameDB, guestProfile: UserProfile): UserProfile {
  if (db.cur && db.users[db.cur]) {
    const u = db.users[db.cur].u;
    if (!u.tagId || !/^#[0-9]{4}$/.test(u.tagId)) {
      const taken = new Set(
        Object.values(db.users)
          .map((entry) => entry.u.tagId)
          .filter(Boolean)
      );
      u.tagId = generateRandomTagId(taken);
    }
    if (!u.sk) u.sk = [];
    if (u.eq === undefined) u.eq = -1;
    if (u.xp === undefined) u.xp = 0;
    if (u.hype === undefined) u.hype = 0;
    if (!u.ownedCosmetics) u.ownedCosmetics = [...DEFAULT_OWNED];
    if (!u.equipped) u.equipped = { ...DEFAULT_EQUIPPED };
    if (!u.s) u.s = { g: 0, w: 0, k: 0, d: 0, b: 0, dm: 0 };
    return u;
  }
  if (!guestProfile.tagId || !/^#[0-9]{4}$/.test(guestProfile.tagId)) {
    guestProfile.tagId = generateRandomTagId();
  }
  return guestProfile;
}

export function getLevelInfo(totalXp: number): LevelInfo {
  let l = 1;
  let n = 100;
  let x = Math.max(0, totalXp);
  while (x >= n) {
    x -= n;
    l++;
    n = 100 + (l - 1) * 25;
  }
  return { l, x, n };
}

export function getRankInfo(hype: number): RankInfo {
  let i = 0;
  while (i < 7 && hype >= ARENA_RANKS[i + 1][1]) {
    i++;
  }
  const lo = ARENA_RANKS[i][1];
  const hi = i < 7 ? ARENA_RANKS[i + 1][1] : lo + 1000;
  return {
    i,
    n: ARENA_RANKS[i][0],
    c: ARENA_RANKS[i][2],
    p: Math.min(100, Math.max(0, ((hype - lo) / (hi - lo)) * 100)),
  };
}

export async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

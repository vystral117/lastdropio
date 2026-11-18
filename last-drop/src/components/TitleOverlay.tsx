import React, { useEffect, useState } from 'react';
import {
  CHANGELOG,
  COSMETIC_CATALOG,
  KEYBIND_LABELS,
  POIS,
  RARITY_COLORS,
  RARITY_NAMES,
  RARITY_TIERS,
  RARITY_WEIGHTS,
  SKINS,
  VER,
  WP,
} from '../game/constants';
import { getLevelInfo, getRankInfo } from '../game/storage';
import {
  CosmeticItem,
  GameDB,
  Keybinds,
  LockerCategory,
  RarityTier,
  TitleTab,
  UserProfile,
} from '../game/types';
import { CosmeticVisual } from './CosmeticVisual';
import { LastDropLogo, PlayerAvatar, WeaponIcon } from './WeaponIcon';

interface TitleOverlayProps {
  db: GameDB;
  profile: UserProfile;
  playerName: string;
  tab: TitleTab;
  listeningKey: keyof Keybinds | null;
  crateReward: string | null;
  shopNotice: string | null;
  googleUser: { uid: string; email: string | null; displayName: string | null } | null;
  authLoading: boolean;
  authErrorMsg: string | null;
  onSetTab: (t: TitleTab) => void;
  onSetMode: (mode: number) => void;
  onPlay: () => void;
  onUiClick: () => void;
  onOpenCrate: () => void;
  onEquipSkin: (skinIdx: number) => void;
  onBuyCosmetic: (item: CosmeticItem) => void;
  onEquipCosmetic: (category: LockerCategory, itemId: string) => void;
  onToggleSetting: (key: 'shake' | 'num' | 'part' | 'snd' | 'lobbyMusic') => void;
  onVolumeChange: (vol: number) => void;
  onStartRebind: (key: keyof Keybinds) => void;
  onResetKeybinds: () => void;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onUpdateDisplayName: (name: string) => void;
  onAuth: (name: string, pass: string) => Promise<string | null>;
  onSignOut: () => void;
}

const LOCKER_CATEGORIES: { id: LockerCategory; label: string }[] = [
  { id: 'skin', label: 'Skins' },
  { id: 'pickaxe', label: 'Pickaxes' },
  { id: 'backbling', label: 'Back Blings' },
  { id: 'glider', label: 'Gliders' },
  { id: 'music', label: 'Lobby Music' },
];

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 12.3s.6 3.3 1.6 5.3l3.7-2.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.9C3.5 21 7.4 24 12 24z"
      />
    </svg>
  );
}

export function TitleOverlay({
  db,
  profile,
  playerName,
  tab,
  listeningKey,
  crateReward,
  shopNotice,
  googleUser,
  authLoading,
  authErrorMsg,
  onSetTab,
  onSetMode,
  onPlay,
  onUiClick,
  onOpenCrate,
  onEquipSkin,
  onBuyCosmetic,
  onEquipCosmetic,
  onToggleSetting,
  onVolumeChange,
  onStartRebind,
  onResetKeybinds,
  onGoogleSignIn,
  onGoogleSignOut,
  onUpdateDisplayName,
  onAuth,
  onSignOut,
}: TitleOverlayProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [lockerCat, setLockerCat] = useState<LockerCategory>('skin');
  const [shopFilter, setShopFilter] = useState<'all' | LockerCategory>('all');
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);

  useEffect(() => {
    if (tab !== 'play') return;
    let cancelled = false;
    const loadStatus = async () => {
      try {
        const res = await fetch('/api/online-status');
        if (!res.ok) return;
        const data = (await res.json()) as { onlinePlayers?: number };
        if (!cancelled && typeof data.onlinePlayers === 'number') {
          setOnlinePlayers(data.onlinePlayers);
        }
      } catch {
        // Ignore when running static-only without backend
      }
    };
    void loadStatus();
    const timer = setInterval(loadStatus, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tab]);

  const levelInfo = getLevelInfo(profile.xp || 0);
  const rankInfo = getRankInfo(profile.hype || 0);
  const stats = profile.s;
  const xpPct = Math.min(100, Math.round((levelInfo.x / levelInfo.n) * 100));

  const eq = profile.equipped;
  const equippedSkin = COSMETIC_CATALOG.find((c) => c.id === eq.skin);
  const equippedGlider = COSMETIC_CATALOG.find((c) => c.id === eq.glider);
  const equippedMusic = COSMETIC_CATALOG.find((c) => c.id === eq.music);

  // Legacy crate glider color fallback if user opened a crate glider & equipped profile.eq >= 0
  const gliderColor =
    profile.eq >= 0 && SKINS[profile.eq]
      ? SKINS[profile.eq].c
      : equippedGlider?.color || '#4cc9f0';
  const skinColor = equippedSkin?.color || '#e0ac82';

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onUiClick();
    const err = await onAuth(username, password);
    if (err) {
      setAuthError(err);
    } else {
      setAuthError('');
      setUsername('');
      setPassword('');
      onSetTab('play');
    }
  };

  const navTab = (id: TitleTab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        onUiClick();
        onSetTab(id);
      }}
      className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
        tab === id
          ? 'bg-[#2563eb] text-white border border-[#60a5fa]/70 shadow-[0_2px_12px_rgba(37,99,235,0.45)]'
          : 'bg-[#0b1733]/75 text-[#cbd5e1] border border-white/10 hover:text-white hover:bg-[#173064]'
      }`}
    >
      {label}
    </button>
  );

  const ownedSet = new Set(profile.ownedCosmetics || []);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between bg-[#091530]/72 overflow-y-auto ld-scroll">
      {/* ZombsRoyale-Style Top Navigation Bar */}
      <header className="w-full bg-[#0d1f44]/95 border-b-2 border-[#264c96] px-4 lg:px-8 py-2.5 shadow-lg">
        <div className="mx-auto max-w-[1280px] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <LastDropLogo className="w-32 h-auto text-white shrink-0" />
            <nav className="flex items-center gap-1.5 flex-wrap" aria-label="Lobby navigation">
              {navTab('play', 'Play')}
              {navTab('locker', 'Locker')}
              {navTab('shop', 'Shop')}
              {navTab('stats', 'Stats')}
              {navTab('settings', 'Settings')}
              {navTab('controls', 'Controls')}
              {navTab('changelog', 'Updates')}
              {navTab('account', googleUser || db.cur ? 'Account' : 'Log in')}
            </nav>
          </div>

          <div className="flex items-center gap-2.5 text-xs font-mono-num">
            <div className="bg-[#08132b] border border-[#2a52a0] rounded-lg px-3 py-1.5 flex items-center gap-2">
              <span className="font-bold text-white">{playerName}</span>
              <span className="text-[#38bdf8] font-bold">{profile.tagId}</span>
              <span className="text-[#64748b]" aria-hidden="true">·</span>
              <span className="text-[#ffd24d] font-bold">{profile.coins} Coins</span>
              <span className="text-[#64748b]" aria-hidden="true">·</span>
              <span className="text-[#93c5fd]">v{VER}</span>
            </div>
            {!googleUser ? (
              <button
                type="button"
                disabled={authLoading}
                onClick={() => {
                  onUiClick();
                  onGoogleSignIn();
                }}
                className="bg-white hover:bg-[#f1f5f9] text-[#0f172a] font-sans font-bold rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <GoogleIcon />
                <span>{authLoading ? 'Signing in...' : 'Google Login'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onUiClick();
                  onSetTab('account');
                }}
                className="bg-[#08132b] border border-[#22c55e]/60 hover:border-[#22c55e] rounded-lg px-2.5 py-1.5 text-[#86efac] font-sans font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                Cloud Saved
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onUiClick();
                onToggleSetting('snd');
              }}
              className="bg-[#08132b] border border-[#2a52a0] hover:border-[#60a5fa] rounded-lg px-2.5 py-1.5 text-white font-semibold cursor-pointer transition-colors"
            >
              {db.set.snd ? 'Audio: On' : 'Muted'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 flex items-center justify-center p-4 lg:p-6">
        {tab === 'play' && (
          <div className="w-full max-w-[1260px] grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left Panel: Mode Selector, Rank & Career Summary (ZombsRoyale style) */}
            <section className="lg:col-span-4 bg-[#0d1e42]/92 border-2 border-[#254992] rounded-2xl p-5 shadow-2xl flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#93c5fd]">
                      Game Mode
                    </span>
                    {onlinePlayers !== null && (
                      <span className="text-[11px] font-mono-num text-[#4ade80] font-semibold">
                        {onlinePlayers} Online
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#071229] rounded-xl border border-[#224182]">
                    <button
                      type="button"
                      onClick={() => {
                        onUiClick();
                        onSetMode(0);
                      }}
                      className={`py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                        (db.mode | 0) === 0
                          ? 'bg-[#2563eb] text-white shadow'
                          : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      Solo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUiClick();
                        onSetMode(1);
                      }}
                      className={`py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                        (db.mode | 0) === 1
                          ? 'bg-[#b45309] text-[#fef08a] border border-[#fbbf24]/50 shadow'
                          : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      Arena
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUiClick();
                        onSetMode(2);
                      }}
                      className={`py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                        (db.mode | 0) === 2
                          ? 'bg-[#0ea5e9] text-white border border-[#7dd3fc]/50 shadow'
                          : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      Online BR
                    </button>
                  </div>
                </div>

                {/* Arena Rank Card */}
                <div className="bg-[#08132b] border border-[#224182] rounded-xl p-3.5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[#93c5fd] font-semibold">Arena Division</span>
                    <span className="font-bold" style={{ color: rankInfo.c }}>
                      {rankInfo.n} · {profile.hype || 0} Hype
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[#38bdf8]"
                      style={{ width: `${Math.round(rankInfo.p)}%` }}
                    />
                  </div>
                </div>

                {/* Quick Career Totals */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    [stats.w, 'Wins'],
                    [stats.k, 'Kills'],
                    [(stats.k / Math.max(1, stats.d)).toFixed(1), 'K/D'],
                    [stats.b ? `#${stats.b}` : '-', 'Best'],
                  ].map(([v, l]) => (
                    <div
                      key={l}
                      className="bg-[#08132b] border border-[#224182] rounded-xl py-2.5 px-1"
                    >
                      <div className="font-mono-num text-base font-bold text-white">{v}</div>
                      <div className="text-[11px] text-[#93c5fd]">{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Loadout / Locker Shortcuts */}
              <div className="bg-[#08132b] border border-[#224182] rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-[#93c5fd] font-bold">
                    Equipped Loadout
                  </div>
                  <div className="text-xs text-white font-semibold truncate mt-0.5">
                    {equippedSkin?.name || 'Classic'} · {equippedMusic?.name || 'Sky Drop Synth'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUiClick();
                    onSetTab('locker');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#1d4ed8] hover:bg-[#2563eb] text-xs font-bold text-white shrink-0 cursor-pointer transition-colors"
                >
                  Locker
                </button>
              </div>
            </section>

            {/* Center Stage: ZombsRoyale Character Showcase Pedestal + PLAY CTA */}
            <section className="lg:col-span-4 bg-[#0f234c]/92 border-2 border-[#3b82f6]/55 rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-between text-center gap-4">
              <div className="w-full">
                <div className="text-2xl font-display font-black uppercase tracking-wider text-white">
                  {playerName}{' '}
                  <span className="text-[#38bdf8] font-mono-num text-lg">{profile.tagId}</span>
                </div>
                <div className="text-xs font-mono-num text-[#93c5fd] mt-0.5">
                  Level {levelInfo.l} · {levelInfo.x} / {levelInfo.n} XP · 24-Player Island
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-[#071229] border border-[#224182] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#38bdf8] to-[#22c55e]"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
              </div>

              {/* Glowing Pedestal Character Showcase */}
              <div className="relative flex flex-col items-center justify-center py-2">
                <div
                  className="w-44 h-44 rounded-full border-4 border-[#3b82f6]/60 flex items-center justify-center shadow-[0_0_48px_rgba(59,130,246,0.35)]"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 42%, rgba(56,189,248,0.28), rgba(11,23,51,0.94) 72%)',
                  }}
                >
                  <PlayerAvatar
                    gliderColor={gliderColor}
                    skinColor={skinColor}
                    skinId={eq.skin}
                    backblingId={eq.backbling}
                    pickaxeId={eq.pickaxe}
                    size={132}
                  />
                </div>
                <div className="mt-2 text-xs text-[#cbd5e1] font-medium">
                  {(db.mode | 0) === 2
                    ? 'Online Multiplayer Queue Ready'
                    : (db.mode | 0) === 1
                      ? 'Arena Ranked Queue Ready'
                      : 'Solo Battle Royale Ready'}
                </div>
              </div>

              {/* Prominent ZombsRoyale-inspired Green/Gold Play Button */}
              <div className="w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUiClick();
                    onPlay();
                  }}
                  className="w-full py-4 rounded-xl bg-gradient-to-b from-[#22c55e] to-[#15803d] hover:brightness-110 active:scale-[0.99] border-2 border-[#86efac]/60 text-white font-display font-black italic text-4xl tracking-widest shadow-[0_8px_28px_rgba(34,197,94,0.45)] transition-all cursor-pointer"
                >
                  PLAY
                </button>
                <div className="text-[11px] text-[#93c5fd]">
                  Press Enter or Space to drop from the plane
                </div>
              </div>
            </section>

            {/* Right Panel: Named Locations & Arsenal Preview */}
            <section className="lg:col-span-4 bg-[#0d1e42]/92 border-2 border-[#254992] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[500px]">
              <div className="flex items-center justify-between border-b border-[#224182] pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Island Named Locations
                </h2>
                <span className="text-[11px] font-mono-num text-[#93c5fd]">
                  7200 × 7200
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {POIS.map((poi) => (
                  <div
                    key={poi.name}
                    className="bg-[#08132b] border border-[#224182] rounded-lg px-2.5 py-2 font-semibold text-[#e2e8f0] truncate"
                  >
                    {poi.name}
                  </div>
                ))}
              </div>

              <div className="border-t border-[#224182] pt-3 flex-1 overflow-y-auto ld-scroll pr-1">
                <div className="text-xs font-bold uppercase tracking-wider text-[#93c5fd] mb-2">
                  Featured Weapons
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {WP.filter((w) => w.id > 0 && !w.usable).map((w) => (
                    <div
                      key={w.id}
                      className="bg-[#08132b] border border-[#224182] rounded-lg p-2 flex items-center gap-2"
                    >
                      <WeaponIcon weaponId={w.id} className="w-9 h-6 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate" style={{ color: w.color }}>
                          {w.name}
                        </div>
                        <div className="text-[10px] font-mono-num text-[#94a3b8]">
                          {w.id === 10
                            ? 'Push Blast'
                            : w.id === 11
                              ? 'Pull Vortex'
                              : w.throwable
                                ? '68 Blast'
                                : w.sniper
                                  ? 'Wide FOV'
                                  : `${w.damage * Math.max(1, w.pellets)} DMG`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Dedicated LOCKER Tab (Skins, Pickaxes, Back Blings, Gliders, Lobby Music) */}
        {tab === 'locker' && (
          <section className="w-full max-w-[1160px] bg-[#0d1e42]/95 border-2 border-[#254992] rounded-2xl p-6 shadow-2xl flex flex-col gap-5 max-h-[600px]">
            <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[#224182] pb-3">
              <div>
                <h1 className="text-2xl font-display font-black uppercase tracking-wider text-white">
                  Locker
                </h1>
                <p className="text-xs text-[#93c5fd]">
                  Equip your Skins, Pickaxes, Back Blings, Gliders, and Lobby Music
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {LOCKER_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onUiClick();
                      setLockerCat(cat.id);
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      lockerCat === cat.id
                        ? 'bg-[#2563eb] text-white'
                        : 'bg-[#08132b] text-[#cbd5e1] border border-[#224182] hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden flex-1">
              {/* Live Character Loadout Preview */}
              <div className="lg:col-span-4 bg-[#08132b] border border-[#224182] rounded-xl p-4 flex flex-col items-center justify-center text-center gap-3">
                <div
                  className="w-40 h-40 rounded-full border-2 border-[#3b82f6]/50 flex items-center justify-center"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 42%, rgba(56,189,248,0.22), rgba(7,18,41,0.96) 74%)',
                  }}
                >
                  <PlayerAvatar
                    gliderColor={gliderColor}
                    skinColor={skinColor}
                    skinId={eq.skin}
                    backblingId={eq.backbling}
                    pickaxeId={eq.pickaxe}
                    size={120}
                  />
                </div>
                <div className="text-xs text-[#cbd5e1] space-y-1 w-full text-left border-t border-[#224182] pt-3">
                  <div>
                    <span className="text-[#93c5fd]">Skin:</span>{' '}
                    <span className="font-bold text-white">{equippedSkin?.name || 'Classic Survivor'}</span>
                  </div>
                  <div>
                    <span className="text-[#93c5fd]">Pickaxe:</span>{' '}
                    <span className="font-bold text-white">
                      {COSMETIC_CATALOG.find((c) => c.id === eq.pickaxe)?.name || 'Bare Fists'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#93c5fd]">Back Bling:</span>{' '}
                    <span className="font-bold text-white">
                      {COSMETIC_CATALOG.find((c) => c.id === eq.backbling)?.name || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#93c5fd]">Glider:</span>{' '}
                    <span className="font-bold text-white">
                      {profile.eq >= 0 && SKINS[profile.eq]
                        ? `${SKINS[profile.eq].n} (Crate)`
                        : equippedGlider?.name || 'Cobalt Wing'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#93c5fd]">Lobby Music:</span>{' '}
                    <span className="font-bold text-white">
                      {db.set.lobbyMusic ? equippedMusic?.name || 'Sky Drop Synth' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Owned Items Grid */}
              <div className="lg:col-span-8 overflow-y-auto ld-scroll pr-1 flex flex-col gap-3">
                {lockerCat === 'music' && (
                  <div className="bg-[#08132b] border border-[#224182] rounded-xl p-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-white">Lobby Music Playback</div>
                      <div className="text-xs text-[#93c5fd]">
                        Toggle background music while browsing the lobby and locker
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onUiClick();
                        onToggleSetting('lobbyMusic');
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        db.set.lobbyMusic
                          ? 'bg-[#22c55e] text-white'
                          : 'bg-white/10 text-[#cbd5e1]'
                      }`}
                    >
                      {db.set.lobbyMusic ? 'Music: On' : 'Music: Off'}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {COSMETIC_CATALOG.filter((item) => item.category === lockerCat).map((item) => {
                    const isOwned = ownedSet.has(item.id) || item.price === 0;
                    const isEquipped =
                      lockerCat === 'glider'
                        ? profile.eq < 0 && eq.glider === item.id
                        : eq[lockerCat] === item.id;

                    return (
                      <div
                        key={item.id}
                        style={{
                          borderColor: isEquipped
                            ? '#38bdf8'
                            : RARITY_COLORS[item.rarity] || '#254992',
                        }}
                        className={`bg-[#08132b] border-2 rounded-xl p-3 flex flex-col gap-2.5 ${
                          !isOwned ? 'opacity-65' : ''
                        }`}
                      >
                        <CosmeticVisual key={item.id} item={item} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-white truncate">
                              {item.name}
                            </span>
                            <span
                              className="text-[10px] font-bold uppercase"
                              style={{ color: RARITY_COLORS[item.rarity] }}
                            >
                              {RARITY_NAMES[item.rarity]}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#94a3b8] mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        </div>

                        {isOwned ? (
                          <button
                            type="button"
                            onClick={() => {
                              onUiClick();
                              if (lockerCat === 'glider') {
                                onEquipSkin(-1);
                              }
                              onEquipCosmetic(lockerCat, item.id);
                            }}
                            className={`w-full py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                              isEquipped
                                ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/60'
                                : 'bg-[#2563eb] hover:bg-[#3b82f6] text-white'
                            }`}
                          >
                            {isEquipped ? 'Equipped' : 'Equip'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onUiClick();
                              onSetTab('shop');
                              setShopFilter(lockerCat);
                            }}
                            className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-[#ffd24d] cursor-pointer transition-colors"
                          >
                            Unlock in Shop ({item.price})
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Bonus Crate Gliders unlocked via 150-coin Crate */}
                  {lockerCat === 'glider' &&
                    (profile.sk || []).map((skinIdx) => {
                      const skin = SKINS[skinIdx];
                      if (!skin) return null;
                      const equipped = profile.eq === skinIdx;
                      return (
                        <div
                          key={`crate_${skinIdx}`}
                          style={{ borderColor: equipped ? '#38bdf8' : RARITY_COLORS[skin.r] }}
                          className="bg-[#08132b] border-2 rounded-xl p-3 flex flex-col gap-2.5"
                        >
                          <div
                            className="w-full h-28 rounded-lg border border-white/10 flex items-center justify-center"
                            style={{
                              background: `radial-gradient(circle, ${skin.c}44, #071229 75%)`,
                            }}
                          >
                            <PlayerAvatar gliderColor={skin.c} skinColor={skinColor} size={64} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-white truncate">
                                {skin.n} Glider
                              </span>
                              <span
                                className="text-[10px] font-bold uppercase"
                                style={{ color: RARITY_COLORS[skin.r] }}
                              >
                                {RARITY_NAMES[skin.r]}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#94a3b8] mt-0.5">
                              Crate-unlocked delta glider color.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onUiClick();
                              onEquipSkin(skinIdx);
                            }}
                            className={`w-full py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                              equipped
                                ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/60'
                                : 'bg-[#2563eb] hover:bg-[#3b82f6] text-white'
                            }`}
                          >
                            {equipped ? 'Equipped' : 'Equip'}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Dedicated ITEM SHOP Tab with actual artwork for Skins, Pickaxes, Back Blings, Gliders & Music */}
        {tab === 'shop' && (
          <section className="w-full max-w-[1160px] bg-[#0d1e42]/95 border-2 border-[#254992] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[600px]">
            <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[#224182] pb-3">
              <div>
                <h1 className="text-2xl font-display font-black uppercase tracking-wider text-white">
                  Item Shop
                </h1>
                <p className="text-xs text-[#93c5fd]">
                  Skins, Pickaxes, Back Blings, Gliders, and Lobby Music · Balance:{' '}
                  <span className="text-[#ffd24d] font-bold font-mono-num">
                    {profile.coins} coins
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    onUiClick();
                    setShopFilter('all');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    shopFilter === 'all'
                      ? 'bg-[#2563eb] text-white'
                      : 'bg-[#08132b] text-[#cbd5e1] border border-[#224182]'
                  }`}
                >
                  All
                </button>
                {LOCKER_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onUiClick();
                      setShopFilter(cat.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      shopFilter === cat.id
                        ? 'bg-[#2563eb] text-white'
                        : 'bg-[#08132b] text-[#cbd5e1] border border-[#224182]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {shopNotice && (
              <div className="bg-[#08132b] border border-[#38bdf8]/50 rounded-xl px-4 py-2.5 text-xs font-semibold text-white">
                {shopNotice}
              </div>
            )}

            <div className="overflow-y-auto ld-scroll pr-1 flex-1 flex flex-col gap-4">
              {/* Featured Crate Row */}
              <div className="bg-[#08132b] border border-[#224182] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-white">Mystery Glider Crate</div>
                  <div className="text-xs text-[#93c5fd] mt-0.5">
                    {RARITY_NAMES.map((n, i) => `${n} ${RARITY_WEIGHTS[i]}%`).join(' · ')}
                  </div>
                  {crateReward && (
                    <div
                      className="mt-2 text-xs font-semibold"
                      dangerouslySetInnerHTML={{ __html: crateReward }}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUiClick();
                    onOpenCrate();
                  }}
                  className="px-5 py-2.5 rounded-lg bg-[#e8365d] hover:bg-[#f0476c] text-xs font-bold text-white shrink-0 cursor-pointer transition-colors"
                >
                  Open Crate (150 Coins)
                </button>
              </div>

              {/* Shop Cosmetic Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {COSMETIC_CATALOG.filter(
                  (item) =>
                    item.price > 0 &&
                    (shopFilter === 'all' || item.category === shopFilter)
                ).map((item) => {
                  const isOwned = ownedSet.has(item.id);
                  const isEquipped =
                    item.category === 'glider'
                      ? profile.eq < 0 && eq.glider === item.id
                      : eq[item.category] === item.id;
                  const canAfford = profile.coins >= item.price;

                  return (
                    <div
                      key={item.id}
                      style={{ borderColor: RARITY_COLORS[item.rarity] || '#254992' }}
                      className="bg-[#08132b] border-2 rounded-xl p-3 flex flex-col gap-2.5"
                    >
                      <CosmeticVisual key={item.id} item={item} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-white truncate">
                            {item.name}
                          </span>
                          <span
                            className="text-[10px] font-bold uppercase shrink-0"
                            style={{ color: RARITY_COLORS[item.rarity] }}
                          >
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#94a3b8] mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      {isOwned ? (
                        <button
                          type="button"
                          onClick={() => {
                            onUiClick();
                            if (item.category === 'glider') onEquipSkin(-1);
                            onEquipCosmetic(item.category, item.id);
                          }}
                          className={`w-full py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                            isEquipped
                              ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/60'
                              : 'bg-[#2563eb] hover:bg-[#3b82f6] text-white'
                          }`}
                        >
                          {isEquipped ? 'Equipped (Owned)' : 'Equip'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onUiClick();
                            onBuyCosmetic(item);
                          }}
                          className={`w-full py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                            canAfford
                              ? 'bg-[#22c55e] hover:bg-[#16a34a] text-white'
                              : 'bg-white/10 text-[#94a3b8] hover:bg-white/15'
                          }`}
                        >
                          Buy · {item.price} Coins
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* STATS Tab */}
        {tab === 'stats' && (
          <section className="w-full max-w-[900px] bg-[#0d1e42]/95 border-2 border-[#254992] rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <h1 className="text-2xl font-display font-black uppercase tracking-wider text-white border-b border-[#224182] pb-2">
              Career Stats
            </h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                [stats.g, 'Matches'],
                [stats.w, 'Wins'],
                [stats.g ? `${Math.round((stats.w / stats.g) * 100)}%` : '0%', 'Win rate'],
                [stats.k, 'Kills'],
                [(stats.k / Math.max(1, stats.d)).toFixed(2), 'K/D'],
                [stats.b ? `#${stats.b}` : '-', 'Best place'],
                [profile.coins, 'Coins'],
                [stats.dm || 0, 'Damage'],
                [rankInfo.n, 'Arena rank'],
                [profile.hype || 0, 'Hype'],
              ].map(([val, label]) => (
                <div
                  key={label}
                  className="bg-[#08132b] border border-[#224182] rounded-xl p-3.5"
                >
                  <div className="font-mono-num text-xl font-bold text-white">{val}</div>
                  <div className="text-xs text-[#93c5fd] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {!db.cur && (
              <div className="text-xs text-[#93c5fd] bg-[#08132b] border border-[#224182] rounded-xl p-3">
                Log in on the Account tab to save your stats, coins, and locker cosmetics in this browser.
              </div>
            )}
          </section>
        )}

        {/* SETTINGS Tab */}
        {tab === 'settings' && (
          <section className="w-full max-w-[680px] bg-[#0d1e42]/95 border-2 border-[#254992] rounded-2xl p-6 shadow-2xl flex flex-col gap-3">
            <h1 className="text-2xl font-display font-black uppercase tracking-wider text-white border-b border-[#224182] pb-2">
              Settings
            </h1>
            <div className="flex flex-col divide-y divide-[#224182]">
              {(
                [
                  ['shake', 'Screen shake'],
                  ['num', 'Damage numbers'],
                  ['part', 'Hit particles'],
                  ['snd', 'Sound effects'],
                  ['lobbyMusic', 'Lobby music'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between py-3 text-sm text-[#e2e8f0] cursor-pointer"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(db.set[key])}
                    onChange={() => {
                      onUiClick();
                      onToggleSetting(key);
                    }}
                    className="w-4 h-4 accent-[#22c55e] cursor-pointer"
                  />
                </label>
              ))}

              <label className="flex items-center justify-between py-3 text-sm text-[#e2e8f0]">
                <span>Master volume</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={db.set.vol}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-40 accent-[#22c55e] cursor-pointer"
                />
              </label>
            </div>
          </section>
        )}

        {/* CONTROLS Tab */}
        {tab === 'controls' && (
          <section className="w-full max-w-[680px] bg-[#0d1e42]/95 border-2 border-[#254992] rounded-2xl p-6 shadow-2xl flex flex-col gap-3 max-h-[580px]">
            <h1 className="text-2xl font-display font-black uppercase tracking-wider text-white border-b border-[#224182] pb-2">
              Controls & Keybinds
            </h1>
            <div className="overflow-y-auto ld-scroll pr-1 divide-y divide-[#224182]">
              {KEYBIND_LABELS.map(([action, label]) => {
                const isListening = listeningKey === action;
                return (
                  <div
                    key={action}
                    className="flex items-center justify-between py-2 text-sm text-[#e2e8f0]"
                  >
                    <span>{label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        onUiClick();
                        onStartRebind(action);
                      }}
                      className={`w-28 py-1.5 rounded-lg border text-xs font-mono-num font-bold uppercase cursor-pointer transition-colors ${
                        isListening
                          ? 'border-[#38bdf8] bg-[#2563eb]/35 text-white'
                          : 'border-[#254992] bg-[#08132b] text-[#e2e8f0] hover:border-[#60a5fa]'
                      }`}
                    >
                      {isListening ? 'Press key...' : db.kb[action] || ''}
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                onUiClick();
                onResetKeybinds();
              }}
              className="mt-1 py-2.5 rounded-xl border border-[#254992] bg-[#08132b] hover:border-[#60a5fa] text-xs font-semibold text-[#e2e8f0] cursor-pointer"
            >
              Reset defaults
            </button>
          </section>
        )}

        {/* UPDATES / CHANGELOG Tab */}
        {tab === 'changelog' && (
          <section className="w-full max-w-[780px] bg-[#0d1e42]/95 border-2 border-[#254992] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[580px] overflow-y-auto ld-scroll">
            <h1 className="text-2xl font-display font-black uppercase tracking-wider text-white border-b border-[#224182] pb-2">
              Patch Notes & Weapon Tiers
            </h1>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {([0, 1, 2, 3, 4, 5] as RarityTier[]).map((tier) => (
                <div
                  key={tier}
                  className="bg-[#08132b] border border-[#224182] rounded-lg px-3 py-2 flex items-center justify-between text-xs"
                >
                  <span className="font-bold" style={{ color: RARITY_TIERS[tier].color }}>
                    {RARITY_TIERS[tier].name}
                  </span>
                  <span className="font-mono-num text-[#94a3b8]">
                    +{Math.round((RARITY_TIERS[tier].dmgMult - 1) * 100)}%
                  </span>
                </div>
              ))}
            </div>

            {CHANGELOG.map((entry) => (
              <div key={entry.v} className="bg-[#08132b] border border-[#224182] rounded-xl p-4">
                <div className="text-sm font-bold text-white">
                  v{entry.v}
                  {entry.d && (
                    <span className="text-xs font-normal text-[#93c5fd] ml-2">{entry.d}</span>
                  )}
                </div>
                <ul className="mt-2 pl-4 list-disc text-xs text-[#cbd5e1] space-y-1">
                  {entry.n.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {/* ACCOUNT Tab */}
        {tab === 'account' && (
          <section className="w-full max-w-[580px] bg-[#0d1e42]/95 border-2 border-[#254992] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[590px] overflow-y-auto ld-scroll">
            <div className="flex items-center justify-between border-b border-[#224182] pb-2">
              <h1 className="text-2xl font-display font-black uppercase tracking-wider text-white">
                Account & Cloud Save
              </h1>
              <span className="font-mono-num text-sm font-bold text-[#38bdf8]">
                ID {profile.tagId}
              </span>
            </div>

            {/* Primary Google Login Section */}
            <div className="bg-[#08132b] border border-[#224182] rounded-xl p-4 flex flex-col gap-3">
              {googleUser ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-[#86efac] font-semibold">
                        Connected with Google · Progress Synced
                      </div>
                      <div className="text-base font-bold text-white truncate mt-0.5">
                        {playerName}{' '}
                        <span className="text-[#38bdf8] font-mono-num">{profile.tagId}</span>
                      </div>
                      {googleUser.email && (
                        <div className="text-xs text-[#93c5fd] truncate">{googleUser.email}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onUiClick();
                        onGoogleSignOut();
                      }}
                      className="px-3.5 py-2 rounded-lg border border-[#254992] hover:border-[#60a5fa] text-xs font-semibold text-white cursor-pointer shrink-0"
                    >
                      Sign out
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newDisplayName.trim()) return;
                      onUiClick();
                      onUpdateDisplayName(newDisplayName);
                      setNewDisplayName('');
                    }}
                    className="flex gap-2 pt-2 border-t border-[#224182]"
                  >
                    <input
                      type="text"
                      maxLength={16}
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder="Change display name..."
                      className="flex-1 px-3 py-2 rounded-lg border border-[#254992] bg-[#0d1e42] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#2563eb] hover:bg-[#3b82f6] text-xs font-bold text-white cursor-pointer"
                    >
                      Save Name
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-sm font-bold text-white">
                      Save Progress with Google
                    </div>
                    <p className="text-xs text-[#93c5fd] mt-0.5">
                      Sign in with Google to save your coins, stats, skins, and unique{' '}
                      <span className="font-mono-num text-[#38bdf8]">{profile.tagId}</span> account ID to the cloud.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => {
                      onUiClick();
                      onGoogleSignIn();
                    }}
                    className="w-full py-3 rounded-xl bg-white hover:bg-[#f1f5f9] text-[#0f172a] text-sm font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-colors disabled:opacity-60"
                  >
                    <GoogleIcon />
                    <span>{authLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                  </button>
                </>
              )}

              {authErrorMsg && (
                <div className="text-xs text-[#ff5c6c] font-medium">{authErrorMsg}</div>
              )}
            </div>

            {/* Optional Local Browser Profile Switcher (when offline / guest) */}
            {!googleUser && (
              <div className="border-t border-[#224182] pt-3 flex flex-col gap-3">
                {db.cur && (
                  <div className="bg-[#08132b] border border-[#224182] rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-[#93c5fd]">Local Browser Profile</div>
                      <div className="text-sm font-bold text-white">
                        {db.cur} <span className="text-[#38bdf8] font-mono-num">{profile.tagId}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onUiClick();
                        onSignOut();
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#254992] hover:border-[#60a5fa] text-xs font-semibold text-white cursor-pointer"
                    >
                      Sign out
                    </button>
                  </div>
                )}

                <p className="text-xs text-[#93c5fd]">
                  Or create an offline browser-only profile (each new account gets a random #XXXX ID):
                </p>

                <form onSubmit={handleAuthSubmit} className="flex flex-col gap-2.5">
                  <input
                    type="text"
                    maxLength={12}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Player name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#254992] bg-[#08132b] text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8]"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 4 chars)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#254992] bg-[#08132b] text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8]"
                  />
                  {authError && (
                    <div className="text-xs text-[#ff5c6c] font-medium">{authError}</div>
                  )}
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#3b82f6] text-sm font-bold text-white cursor-pointer transition-colors"
                  >
                    {db.cur ? 'Switch local profile' : 'Create or log in locally'}
                  </button>
                </form>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Bottom Hint Bar */}
      <footer className="pb-3 px-4 text-xs text-[#cbd5e1] tracking-wide text-center drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
        Space Drop · WASD Move · Mouse Aim/Fire · E Open Chest / Loot · R Reload · M Map · B Emote · 1–6 Slots
      </footer>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import {
  CHANGELOG,
  COSMETIC_CATALOG,
  GEM_PACKS,
  GemPack,
  KEYBIND_LABELS,
  NAME_CHANGE_GEM_COST,
  POIS,
  RARITY_COLORS,
  RARITY_NAMES,
  RARITY_TIERS,
  RARITY_WEIGHTS,
  SEASON_1_LAUNCH_AT,
  SKINS,
  TOTAL_PLAYERS,
  VER,
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
import {
  CosmeticVisual,
  CrateGliderVisual,
  LoadoutSpriteShowcase,
} from './CosmeticVisual';
import { CoinSprite, GemSprite, LastDropLogo } from './WeaponIcon';

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
  onSelectGemPack: (pack: GemPack) => void;
  onUpdateDisplayName: (name: string) => { ok: boolean; message: string };
  onAuth: (name: string, pass: string) => Promise<string | null>;
  onSignOut: () => void;
}

const LOCKER_CATEGORIES: { id: LockerCategory; label: string }[] = [
  { id: 'skin', label: 'Skins' },
  { id: 'pickaxe', label: 'Pickaxes' },
  { id: 'backbling', label: 'Back Blings' },
  { id: 'glider', label: 'Gliders' },
  { id: 'music', label: 'Music' },
];

type ShopCategoryTab = LockerCategory | 'crate' | 'gems';
type SettingsSubTab = 'general' | 'controls';

function formatCountdown(msRemaining: number) {
  const totalSec = Math.max(0, Math.floor(msRemaining / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    days: pad(days),
    hours: pad(hours),
    mins: pad(mins),
    secs: pad(secs),
    isLive: totalSec === 0,
  };
}

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

function GemPackArt({ pack, index }: { pack: GemPack; index: number }) {
  const count = index === 0 ? 1 : index === 1 ? 2 : index === 2 ? 3 : 4;
  const offsets =
    count === 1
      ? [[84, 48, 1.15]]
      : count === 2
        ? [[68, 50, 0.95], [100, 46, 1.05]]
        : count === 3
          ? [[56, 52, 0.85], [84, 44, 1.1], [112, 52, 0.85]]
          : [[48, 54, 0.8], [72, 46, 1], [96, 46, 1], [120, 54, 0.8]];

  return (
    <div className="relative w-full h-24 rounded-lg overflow-hidden border-2 border-[#090e17] bg-[#10192b] flex items-center justify-center">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: pack.accent }}
        aria-hidden="true"
      />
      <svg viewBox="0 0 168 96" className="w-full h-full" aria-hidden="true">
        {offsets.map(([cx, cy, s], idx) => (
          <g key={idx} transform={`translate(${cx}, ${cy}) scale(${s})`}>
            <polygon
              points="-10,-16 10,-16 18,-4 0,18 -18,-4"
              fill={pack.accent}
              stroke="#090e17"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <polygon points="-10,-16 10,-16 6,-4 -6,-4" fill="#ffffff" fillOpacity="0.34" />
            <polygon points="-18,-4 -6,-4 0,18" fill="#090e17" fillOpacity="0.18" />
            <polygon points="18,-4 6,-4 0,18" fill="#090e17" fillOpacity="0.32" />
          </g>
        ))}
      </svg>
    </div>
  );
}

function ShadowRewardSprite({
  kind,
}: {
  kind: 'outfit' | 'pickaxe' | 'backbling' | 'glider' | 'mythic';
}) {
  return (
    <svg viewBox="0 0 96 96" className="w-24 h-24 select-none" aria-hidden="true">
      {kind === 'outfit' && (
        <g>
          {/* Hooded survivor top-down silhouette */}
          <ellipse cx="48" cy="52" rx="22" ry="18" fill="#04060b" stroke="#1e293b" strokeWidth="2" />
          <circle cx="48" cy="48" r="17" fill="#04060b" stroke="#1e293b" strokeWidth="2" />
          <circle cx="62" cy="39" r="6" fill="#04060b" stroke="#1e293b" strokeWidth="1.8" />
          <circle cx="62" cy="57" r="6" fill="#04060b" stroke="#1e293b" strokeWidth="1.8" />
          <path d="M35 39 L48 27 L61 39 Z" fill="#04060b" stroke="#1e293b" strokeWidth="1.8" />
        </g>
      )}
      {kind === 'pickaxe' && (
        <g transform="translate(48, 48) rotate(-32)">
          <rect x="-4" y="-28" width="8" height="58" rx="3" fill="#04060b" stroke="#1e293b" strokeWidth="2" />
          <path
            d="M-24 -16 Q0 -30 24 -16 Q14 -10 0 -12 Q-14 -10 -24 -16 Z"
            fill="#04060b"
            stroke="#1e293b"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <rect x="-7" y="-22" width="14" height="9" rx="2" fill="#04060b" stroke="#1e293b" strokeWidth="1.8" />
        </g>
      )}
      {kind === 'backbling' && (
        <g>
          {/* Redacted winged jetpack silhouette */}
          <path
            d="M48 36 L14 24 L22 52 L42 54 Z"
            fill="#04060b"
            stroke="#1e293b"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M48 36 L82 24 L74 52 L54 54 Z"
            fill="#04060b"
            stroke="#1e293b"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <rect x="36" y="28" width="24" height="36" rx="6" fill="#04060b" stroke="#1e293b" strokeWidth="2" />
          <rect x="39" y="64" width="6" height="8" rx="2" fill="#04060b" stroke="#1e293b" strokeWidth="1.5" />
          <rect x="51" y="64" width="6" height="8" rx="2" fill="#04060b" stroke="#1e293b" strokeWidth="1.5" />
        </g>
      )}
      {kind === 'glider' && (
        <g>
          <path
            d="M10 56 L48 22 L86 56 L66 66 L48 52 L30 66 Z"
            fill="#04060b"
            stroke="#1e293b"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M48 22 L48 64" stroke="#1e293b" strokeWidth="1.8" />
        </g>
      )}
      {kind === 'mythic' && (
        <g>
          {/* Tier 100 Crowned Shadow Skin silhouette */}
          <path
            d="M26 30 L34 16 L48 26 L62 16 L70 30 Z"
            fill="#04060b"
            stroke="#334155"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <ellipse cx="48" cy="56" rx="24" ry="18" fill="#04060b" stroke="#334155" strokeWidth="2" />
          <circle cx="48" cy="48" r="18" fill="#04060b" stroke="#334155" strokeWidth="2" />
          <circle cx="64" cy="40" r="6" fill="#04060b" stroke="#334155" strokeWidth="1.8" />
          <circle cx="64" cy="58" r="6" fill="#04060b" stroke="#334155" strokeWidth="1.8" />
        </g>
      )}
    </svg>
  );
}

const FRAME_PANEL =
  'bg-[#182338] border-[3px] border-[#090e17] shadow-[0_6px_0_#090e17] rounded-xl overflow-hidden';

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
  onSelectGemPack,
  onUpdateDisplayName,
  onAuth,
  onSignOut,
}: TitleOverlayProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [nameFeedback, setNameFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [lockerCat, setLockerCat] = useState<LockerCategory>('skin');
  const [shopCat, setShopCat] = useState<ShopCategoryTab>('skin');
  const [settingsSub, setSettingsSub] = useState<SettingsSubTab>('general');
  const [selectedVersion, setSelectedVersion] = useState<string>(CHANGELOG[0]?.v || VER);
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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
        // Ignore when backend online status isn't running
      }
    };
    void loadStatus();
    const timer = setInterval(loadStatus, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tab]);

  const countdown = formatCountdown(SEASON_1_LAUNCH_AT - nowMs);
  const levelInfo = getLevelInfo(profile.xp || 0);
  const rankInfo = getRankInfo(profile.hype || 0);
  const stats = profile.s;
  const xpPct = Math.min(100, Math.round((levelInfo.x / levelInfo.n) * 100));

  const eq = profile.equipped;
  const equippedSkin = COSMETIC_CATALOG.find((c) => c.id === eq.skin);
  const equippedPickaxe = COSMETIC_CATALOG.find((c) => c.id === eq.pickaxe);
  const equippedBackBling = COSMETIC_CATALOG.find((c) => c.id === eq.backbling);
  const equippedGlider = COSMETIC_CATALOG.find((c) => c.id === eq.glider);
  const equippedMusic = COSMETIC_CATALOG.find((c) => c.id === eq.music);

  const gliderColor =
    profile.eq >= 0 && SKINS[profile.eq]
      ? SKINS[profile.eq].c
      : equippedGlider?.color || '#4cc9f0';
  const skinColor = equippedSkin?.color || '#e0ac82';
  const ownedSet = new Set(profile.ownedCosmetics || []);

  const activeNavTab: TitleTab = tab === 'controls' ? 'settings' : tab;

  const effectiveSettingsSub: SettingsSubTab =
    tab === 'controls' ? 'controls' : settingsSub;

  const activeChangelogEntry =
    CHANGELOG.find((entry) => entry.v === selectedVersion) || CHANGELOG[0];

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

  const navLink = (id: TitleTab, label: string) => {
    const active = activeNavTab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => {
          onUiClick();
          if (id === 'settings') setSettingsSub('general');
          onSetTab(id);
        }}
        className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider whitespace-nowrap shrink-0 cursor-pointer transition-all ${
          active
            ? 'bg-[#2563eb] text-white border-2 border-[#090e17] shadow-[0_3px_0_#090e17]'
            : 'text-[#cbd5e1] border-2 border-transparent hover:text-white hover:bg-[#1e2c46]'
        }`}
      >
        {label}
      </button>
    );
  };

  const shopItems =
    shopCat === 'crate' || shopCat === 'gems'
      ? []
      : COSMETIC_CATALOG.filter((item) => item.price > 0 && item.category === shopCat);

  const lockerItems = COSMETIC_CATALOG.filter((item) => item.category === lockerCat);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between bg-[#0b1322]/45 overflow-hidden">
      {/* Zombs Royale Style Top Bar */}
      <header className="relative z-20 w-full bg-[#141e30] border-b-[3px] border-[#090e17] px-4 lg:px-7 py-2 shrink-0">
        <div className="mx-auto max-w-[1240px] flex items-center justify-between gap-4">
          {/* Zone 1: Game Brand */}
          <LastDropLogo className="w-28 h-auto text-white shrink-0" />

          {/* Zone 2: Arcade Navigation Tabs */}
          <nav className="flex items-center gap-1 lg:gap-1.5 overflow-x-auto" aria-label="Lobby navigation">
            {navLink('play', 'Play')}
            {navLink('battlepass', 'Battle Pass')}
            {navLink('locker', 'Locker')}
            {navLink('shop', 'Shop')}
            {navLink('stats', 'Stats')}
            {navLink('changelog', 'Updates')}
            {navLink('settings', 'Settings')}
          </nav>

          {/* Zone 3: Wallet, Account & Sound */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden md:flex items-center gap-2 bg-[#0f1726] border-2 border-[#090e17] rounded-lg px-2.5 py-1 text-xs font-mono-num">
              <span className="inline-flex items-center gap-1 text-[#ffd24d] font-bold">
                <CoinSprite className="w-4 h-4" />
                {profile.coins.toLocaleString()}
              </span>
              <span className="w-0.5 h-3.5 bg-[#090e17]" aria-hidden="true" />
              <span className="inline-flex items-center gap-1 text-[#e879f9] font-bold">
                <GemSprite className="w-4 h-4" />
                {(profile.gems || 0).toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onUiClick();
                onSetTab('account');
              }}
              className={`px-3 py-1.5 rounded-lg border-2 border-[#090e17] shadow-[0_3px_0_#090e17] active:translate-y-0.5 text-xs font-extrabold whitespace-nowrap shrink-0 cursor-pointer transition-all ${
                tab === 'account'
                  ? 'bg-[#2563eb] text-white'
                  : googleUser
                    ? 'bg-[#166534] text-[#bbf7d0] hover:bg-[#15803d]'
                    : 'bg-[#24324a] text-white hover:bg-[#2f4263]'
              }`}
            >
              {googleUser ? 'Cloud Account' : db.cur ? 'Profile' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={() => {
                onUiClick();
                onToggleSetting('snd');
              }}
              className="px-3 py-1.5 rounded-lg bg-[#24324a] hover:bg-[#2f4263] border-2 border-[#090e17] shadow-[0_3px_0_#090e17] active:translate-y-0.5 text-xs font-extrabold text-white whitespace-nowrap shrink-0 cursor-pointer transition-all"
            >
              {db.set.snd ? 'Sound On' : 'Muted'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Stage (Scroll-safe so header & footer are never blocked) */}
      <main className="relative z-10 flex-1 min-h-0 overflow-y-auto ld-scroll px-4 lg:px-8 py-3 flex justify-center">
        {tab === 'play' && (
          <div className="my-auto w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Left Column: Season 1 Countdown, Level & Career Snapshot */}
            <section className={`lg:col-span-3 ${FRAME_PANEL} flex flex-col`}>
              <div className="bg-[#f59e0b] border-b-[3px] border-[#090e17] px-4 py-2 text-center">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#090e17]">
                  {countdown.isLive ? 'Season 1 Live Now' : 'Season 1 · Jan 1, 2027'}
                </div>
                <div className="font-mono-num text-lg font-black text-[#090e17] leading-tight">
                  {countdown.days}d : {countdown.hours}h : {countdown.mins}m : {countdown.secs}s
                </div>
              </div>

              <div className="p-4 flex flex-col gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-white">Level {levelInfo.l}</span>
                    <span className="font-mono-num text-[#7dd3fc]">
                      {levelInfo.x}/{levelInfo.n} XP
                    </span>
                  </div>
                  <div className="h-3 rounded-md bg-[#0d1422] border-2 border-[#090e17] overflow-hidden">
                    <div className="h-full bg-[#27c24c]" style={{ width: `${xpPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-[#94a3b8]">Arena Rank</span>
                    <span className="font-mono-num" style={{ color: rankInfo.c }}>
                      {rankInfo.n} · {profile.hype || 0}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-md bg-[#0d1422] border-2 border-[#090e17] overflow-hidden">
                    <div
                      className="h-full bg-[#38bdf8]"
                      style={{ width: `${Math.round(rankInfo.p)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 bg-[#101827] border-t-2 border-[#090e17] divide-x-2 divide-y-2 divide-[#090e17] text-center">
                {[
                  [stats.w, 'Wins'],
                  [stats.k, 'Kills'],
                  [(stats.k / Math.max(1, stats.d)).toFixed(1), 'K/D'],
                  [stats.b ? `#${stats.b}` : '-', 'Best'],
                ].map(([v, l]) => (
                  <div key={l} className="py-2.5 px-2">
                    <div className="font-mono-num text-base font-black text-white">{v}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                      {l}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Center Stage: Open Zombs Royale Character Pedestal + Mode Selector + PLAY */}
            <section className="lg:col-span-5 flex flex-col items-center justify-center gap-3.5 text-center">
              {/* Survivor Loadout Sprite */}
              <div className="relative flex flex-col items-center">
                <LoadoutSpriteShowcase
                  gliderColor={gliderColor}
                  skinColor={skinColor}
                  skinId={eq.skin}
                  backblingId={eq.backbling}
                  pickaxeId={eq.pickaxe}
                  size={168}
                />

                <div className="mt-1 px-4 py-1 rounded-lg bg-[#141e30] border-2 border-[#090e17] shadow-[0_3px_0_#090e17] inline-flex items-baseline gap-2">
                  <span className="font-display font-black uppercase text-xl tracking-wide text-white">
                    {playerName}
                  </span>
                  <span className="font-mono-num text-xs font-bold text-[#38bdf8]">
                    {profile.tagId}
                  </span>
                </div>
              </div>

              {/* Chunky Mode Selector + Play CTA Slab */}
              <div className="w-full max-w-[380px] flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1 text-xs font-bold">
                  <span className="text-[#cbd5e1] uppercase tracking-wider">Game Mode</span>
                  {onlinePlayers !== null && (
                    <span className="font-mono-num text-[#4ade80]">
                      {onlinePlayers} players online
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 0, label: 'Solo', activeBg: 'bg-[#2563eb]', activeText: 'text-white' },
                    { id: 1, label: 'Arena', activeBg: 'bg-[#d97706]', activeText: 'text-white' },
                    { id: 2, label: 'Online BR', activeBg: 'bg-[#0284c7]', activeText: 'text-white' },
                  ].map((m) => {
                    const isSelected = (db.mode | 0) === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onUiClick();
                          onSetMode(m.id);
                        }}
                        className={`py-2.5 px-2 rounded-lg border-2 border-[#090e17] text-xs font-extrabold uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all ${
                          isSelected
                            ? `${m.activeBg} ${m.activeText} shadow-[0_3px_0_#090e17] -translate-y-0.5`
                            : 'bg-[#182338] text-[#cbd5e1] hover:bg-[#22314d] shadow-[0_3px_0_#090e17]'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onUiClick();
                    onPlay();
                  }}
                  className="w-full py-3.5 rounded-xl bg-[#27c24c] hover:bg-[#32d659] border-[3px] border-[#090e17] shadow-[0_6px_0_#157a2e] active:translate-y-0.5 active:shadow-[0_3px_0_#157a2e] text-white font-display font-black italic text-4xl tracking-widest drop-shadow-[0_2px_0_#090e17] transition-all cursor-pointer"
                >
                  PLAY
                </button>
              </div>
            </section>

            {/* Right Column: Loadout & 100-Player Island Zones */}
            <section className={`lg:col-span-4 ${FRAME_PANEL} flex flex-col`}>
              <div className="bg-[#141e30] border-b-2 border-[#090e17] px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Loadout
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onUiClick();
                    onSetTab('locker');
                  }}
                  className="px-2.5 py-1 rounded bg-[#2563eb] hover:bg-[#3b82f6] border border-[#090e17] text-[11px] font-bold text-white cursor-pointer"
                >
                  Customize
                </button>
              </div>

              <div className="p-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <div className="truncate">
                  <span className="text-[#94a3b8]">Skin: </span>
                  <strong className="text-white">{equippedSkin?.name || 'Classic'}</strong>
                </div>
                <div className="truncate">
                  <span className="text-[#94a3b8]">Pickaxe: </span>
                  <strong className="text-white">{equippedPickaxe?.name || 'Bare Fists'}</strong>
                </div>
                <div className="truncate">
                  <span className="text-[#94a3b8]">Back: </span>
                  <strong className="text-white">{equippedBackBling?.name || 'None'}</strong>
                </div>
                <div className="truncate">
                  <span className="text-[#94a3b8]">Glider: </span>
                  <strong className="text-white">
                    {profile.eq >= 0 && SKINS[profile.eq]
                      ? SKINS[profile.eq].n
                      : equippedGlider?.name || 'Cobalt Wing'}
                  </strong>
                </div>
                <div className="col-span-2 truncate pt-1 border-t border-[#090e17]">
                  <span className="text-[#94a3b8]">Music: </span>
                  <strong className="text-white">
                    {db.set.lobbyMusic ? equippedMusic?.name || 'Sky Drop Synth' : 'Off'}
                  </strong>
                </div>
              </div>

              <div className="bg-[#101827] border-t-2 border-[#090e17] px-4 py-3">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-extrabold uppercase tracking-wider text-[#cbd5e1]">
                    Drop Zones
                  </span>
                  <span className="font-mono-num font-bold text-[#fbbf24]">
                    {TOTAL_PLAYERS} Players
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#e2e8f0]">
                  {POIS.map((poi) => (
                    <div key={poi.name} className="truncate font-medium">
                      · {poi.name}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* SECRETIVE BATTLE PASS Tab */}
        {tab === 'battlepass' && (
          <section className={`my-auto w-full max-w-[1060px] ${FRAME_PANEL} flex flex-col`}>
            <div className="bg-[#141e30] border-b-[3px] border-[#090e17] px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-baseline gap-3">
                <h1 className="text-2xl font-display font-black italic uppercase tracking-wider text-white">
                  Battle Pass
                </h1>
                <span className="text-xs font-mono-num font-bold text-[#94a3b8]">
                  Season 1 · Classified
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono-num text-xs font-bold text-[#fbbf24]">
                  {countdown.isLive
                    ? 'Unlocking...'
                    : `${countdown.days}d : ${countdown.hours}h : ${countdown.mins}m : ${countdown.secs}s`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onUiClick();
                    onSetTab('play');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#24324a] hover:bg-[#31456b] border-2 border-[#090e17] shadow-[0_2px_0_#090e17] text-xs font-extrabold text-white whitespace-nowrap cursor-pointer"
                >
                  Back
                </button>
              </div>
            </div>

            <div className="p-6 bg-[#0b101b] flex flex-col items-center gap-6 text-center">
              <div className="flex flex-col items-center gap-1.5 max-w-lg">
                <h2 className="font-display font-black italic uppercase text-4xl sm:text-5xl tracking-widest text-white drop-shadow-[0_3px_0_#000000]">
                  SOMETHING IS COMING
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-[#64748b]">
                  Season 1 Battle Pass rewards remain sealed until January 1, 2027.
                </p>
              </div>

              <div className="w-full grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                {(
                  [
                    { tier: 'Tier 1', kind: 'outfit' },
                    { tier: 'Tier 25', kind: 'pickaxe' },
                    { tier: 'Tier 50', kind: 'backbling' },
                    { tier: 'Tier 75', kind: 'glider' },
                    { tier: 'Tier 100', kind: 'mythic' },
                  ] as const
                ).map((slot) => (
                  <div
                    key={slot.tier}
                    className="bg-[#0e1524] border-2 border-[#04060b] rounded-xl p-3.5 flex flex-col items-center gap-2"
                  >
                    <div className="w-full flex items-center justify-between text-[11px] font-mono-num font-bold text-[#475569]">
                      <span>{slot.tier}</span>
                      <span>LOCKED</span>
                    </div>
                    <div className="w-full h-28 rounded-lg bg-[#090d16] border-2 border-[#04060b] flex items-center justify-center">
                      <ShadowRewardSprite kind={slot.kind} />
                    </div>
                    <div className="text-sm font-display font-black tracking-widest text-[#334155]">
                      ???
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs font-mono-num uppercase tracking-[0.25em] text-[#475569]">
                Something is coming
              </div>
            </div>
          </section>
        )}

        {/* LOCKER Tab */}
        {tab === 'locker' && (
          <section className={`my-auto w-full max-w-[1160px] ${FRAME_PANEL} flex flex-col`}>
            <div className="bg-[#141e30] border-b-[3px] border-[#090e17] px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
              <h1 className="text-2xl font-display font-black italic uppercase tracking-wider text-white">
                Locker
              </h1>
              <div className="flex items-center gap-1.5 flex-wrap">
                {LOCKER_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onUiClick();
                      setLockerCat(cat.id);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg border-2 border-[#090e17] text-xs font-extrabold whitespace-nowrap cursor-pointer transition-colors ${
                      lockerCat === cat.id
                        ? 'bg-[#2563eb] text-white shadow-[0_2px_0_#090e17]'
                        : 'bg-[#202d47] text-[#cbd5e1] hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              {/* Live Loadout Preview */}
              <div className="lg:col-span-3 bg-[#101827] border-2 border-[#090e17] rounded-xl p-4 flex flex-col items-center text-center gap-2.5">
                <LoadoutSpriteShowcase
                  gliderColor={gliderColor}
                  skinColor={skinColor}
                  skinId={eq.skin}
                  backblingId={eq.backbling}
                  pickaxeId={eq.pickaxe}
                  size={136}
                />
                <div className="text-xs text-[#cbd5e1] w-full text-left space-y-1 pt-2 border-t-2 border-[#090e17]">
                  <div className="truncate"><span className="text-[#94a3b8]">Skin:</span> <strong className="text-white">{equippedSkin?.name}</strong></div>
                  <div className="truncate"><span className="text-[#94a3b8]">Pickaxe:</span> <strong className="text-white">{equippedPickaxe?.name}</strong></div>
                  <div className="truncate"><span className="text-[#94a3b8]">Back:</span> <strong className="text-white">{equippedBackBling?.name}</strong></div>
                  <div className="truncate">
                    <span className="text-[#94a3b8]">Glider:</span>{' '}
                    <strong className="text-white">
                      {profile.eq >= 0 && SKINS[profile.eq] ? SKINS[profile.eq].n : equippedGlider?.name}
                    </strong>
                  </div>
                </div>
                {lockerCat === 'music' && (
                  <button
                    type="button"
                    onClick={() => {
                      onUiClick();
                      onToggleSetting('lobbyMusic');
                    }}
                    className={`w-full py-2 rounded-lg border-2 border-[#090e17] shadow-[0_3px_0_#090e17] text-xs font-extrabold cursor-pointer transition-colors ${
                      db.set.lobbyMusic ? 'bg-[#27c24c] text-white' : 'bg-[#24324a] text-[#cbd5e1]'
                    }`}
                  >
                    {db.set.lobbyMusic ? 'Lobby Music: On' : 'Lobby Music: Off'}
                  </button>
                )}
              </div>

              <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {lockerItems.map((item) => {
                  const isOwned = ownedSet.has(item.id) || item.price === 0;
                  const isEquipped =
                    lockerCat === 'glider'
                      ? profile.eq < 0 && eq.glider === item.id
                      : eq[lockerCat] === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`bg-[#101827] border-2 border-[#090e17] rounded-xl p-2.5 flex flex-col gap-2 ${
                        !isOwned ? 'opacity-70' : ''
                      }`}
                    >
                      <CosmeticVisual item={item} heightClass="h-20" />
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{item.name}</span>
                        <span
                          className="text-[10px] font-bold shrink-0"
                          style={{ color: RARITY_COLORS[item.rarity] }}
                        >
                          {RARITY_NAMES[item.rarity]}
                        </span>
                      </div>

                      {isOwned ? (
                        <button
                          type="button"
                          onClick={() => {
                            onUiClick();
                            if (lockerCat === 'glider') onEquipSkin(-1);
                            onEquipCosmetic(lockerCat, item.id);
                          }}
                          className={`w-full py-1.5 rounded-lg border-2 border-[#090e17] text-xs font-extrabold cursor-pointer transition-colors ${
                            isEquipped
                              ? 'bg-[#38bdf8] text-[#090e17]'
                              : 'bg-[#2563eb] hover:bg-[#3b82f6] text-white shadow-[0_2px_0_#090e17]'
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
                            setShopCat(lockerCat);
                          }}
                          className="w-full py-1.5 rounded-lg border-2 border-[#090e17] bg-[#24324a] hover:bg-[#31456b] text-xs font-extrabold text-[#ffd24d] inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>Shop</span>
                          <CoinSprite className="w-3.5 h-3.5" />
                          <span>{item.price}</span>
                        </button>
                      )}
                    </div>
                  );
                })}

                {lockerCat === 'glider' &&
                  (profile.sk || []).map((skinIdx) => {
                    const skin = SKINS[skinIdx];
                    if (!skin) return null;
                    const equipped = profile.eq === skinIdx;
                    return (
                      <div
                        key={`crate_${skinIdx}`}
                        className="bg-[#101827] border-2 border-[#090e17] rounded-xl p-2.5 flex flex-col gap-2"
                      >
                        <CrateGliderVisual color={skin.c} heightClass="h-20" />
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-bold text-white truncate">
                            {skin.n}
                          </span>
                          <span
                            className="text-[10px] font-bold shrink-0"
                            style={{ color: RARITY_COLORS[skin.r] }}
                          >
                            {RARITY_NAMES[skin.r]}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onUiClick();
                            onEquipSkin(skinIdx);
                          }}
                          className={`w-full py-1.5 rounded-lg border-2 border-[#090e17] text-xs font-extrabold cursor-pointer transition-colors ${
                            equipped
                              ? 'bg-[#38bdf8] text-[#090e17]'
                              : 'bg-[#2563eb] hover:bg-[#3b82f6] text-white shadow-[0_2px_0_#090e17]'
                          }`}
                        >
                          {equipped ? 'Equipped' : 'Equip'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>
        )}

        {/* ITEM SHOP Tab */}
        {tab === 'shop' && (
          <section className={`my-auto w-full max-w-[1160px] ${FRAME_PANEL} flex flex-col`}>
            <div className="bg-[#141e30] border-b-[3px] border-[#090e17] px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 flex-wrap">
                <h1 className="text-2xl font-display font-black italic uppercase tracking-wider text-white">
                  Item Shop
                </h1>
                <span className="inline-flex items-center gap-1 text-xs font-mono-num text-[#ffd24d] font-bold">
                  <CoinSprite className="w-4 h-4" />
                  {profile.coins.toLocaleString()} Coins
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-mono-num text-[#e879f9] font-bold">
                  <GemSprite className="w-4 h-4" />
                  {(profile.gems || 0).toLocaleString()} Gems
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {LOCKER_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onUiClick();
                      setShopCat(cat.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg border-2 border-[#090e17] text-xs font-extrabold whitespace-nowrap cursor-pointer transition-colors ${
                      shopCat === cat.id
                        ? 'bg-[#2563eb] text-white shadow-[0_2px_0_#090e17]'
                        : 'bg-[#202d47] text-[#cbd5e1] hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    onUiClick();
                    setShopCat('crate');
                  }}
                  className={`px-3 py-1.5 rounded-lg border-2 border-[#090e17] text-xs font-extrabold whitespace-nowrap cursor-pointer transition-colors ${
                    shopCat === 'crate'
                      ? 'bg-[#dc2626] text-white shadow-[0_2px_0_#090e17]'
                      : 'bg-[#202d47] text-[#fda4af] hover:text-white'
                  }`}
                >
                  Glider Crate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUiClick();
                    setShopCat('gems');
                  }}
                  className={`px-3 py-1.5 rounded-lg border-2 border-[#090e17] text-xs font-extrabold whitespace-nowrap cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
                    shopCat === 'gems'
                      ? 'bg-[#9333ea] text-white shadow-[0_2px_0_#090e17]'
                      : 'bg-[#202d47] text-[#e879f9] hover:text-white'
                  }`}
                >
                  <GemSprite className="w-3.5 h-3.5" />
                  <span>Buy Gems</span>
                </button>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-3.5">
              {shopNotice && (
                <div className="bg-[#101827] border-2 border-[#38bdf8] rounded-lg px-4 py-2 text-xs font-bold text-white">
                  {shopNotice}
                </div>
              )}

              {shopCat === 'gems' ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#cbd5e1]">
                    <span>
                      Gems are used for username renames after your first free change and upcoming Season 1 drops.
                    </span>
                    <span className="text-[#94a3b8] shrink-0 font-semibold">Checkout coming soon</span>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {GEM_PACKS.map((pack, idx) => (
                      <div
                        key={pack.id}
                        className="bg-[#101827] border-2 border-[#090e17] rounded-xl p-3 flex flex-col gap-2.5"
                      >
                        <GemPackArt pack={pack} index={idx} />
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-white truncate">
                            {pack.name}
                          </span>
                          {pack.bonus && (
                            <span
                              className="text-[10px] font-extrabold shrink-0"
                              style={{ color: pack.accent }}
                            >
                              {pack.bonus}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-mono-num font-bold text-[#e879f9]">
                          <GemSprite className="w-4 h-4" />
                          <span>{pack.gems.toLocaleString()} Gems</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onUiClick();
                            onSelectGemPack(pack);
                          }}
                          className="w-full py-2 rounded-lg bg-[#9333ea] hover:bg-[#a855f7] border-2 border-[#090e17] shadow-[0_3px_0_#090e17] text-xs font-extrabold font-mono-num text-white cursor-pointer transition-colors"
                        >
                          Buy · {pack.priceLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : shopCat === 'crate' ? (
                <div className="bg-[#101827] border-2 border-[#090e17] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex flex-col gap-2">
                    <div className="text-xl font-display font-black italic uppercase tracking-wide text-white">
                      Mystery Glider Crate
                    </div>
                    <div className="text-xs text-[#93c5fd]">
                      Roll a random delta glider wing ·{' '}
                      {RARITY_NAMES.map((n, i) => `${n} ${RARITY_WEIGHTS[i]}%`).join(' · ')}
                    </div>
                    {crateReward && (
                      <div
                        className="mt-1 text-sm font-semibold"
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
                    className="px-6 py-3 rounded-lg bg-[#dc2626] hover:bg-[#ef4444] border-2 border-[#090e17] shadow-[0_4px_0_#090e17] text-sm font-extrabold text-white whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Open Crate ·</span>
                    <CoinSprite className="w-4 h-4" />
                    <span>150</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {shopItems.map((item) => {
                    const isOwned = ownedSet.has(item.id);
                    const isEquipped =
                      item.category === 'glider'
                        ? profile.eq < 0 && eq.glider === item.id
                        : eq[item.category] === item.id;
                    const canAfford = profile.coins >= item.price;

                    return (
                      <div
                        key={item.id}
                        className="bg-[#101827] border-2 border-[#090e17] rounded-xl p-3 flex flex-col gap-2.5"
                      >
                        <CosmeticVisual item={item} heightClass="h-24" />
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-white truncate">
                            {item.name}
                          </span>
                          <span
                            className="text-[10px] font-bold shrink-0"
                            style={{ color: RARITY_COLORS[item.rarity] }}
                          >
                            {RARITY_NAMES[item.rarity]}
                          </span>
                        </div>

                        {isOwned ? (
                          <button
                            type="button"
                            onClick={() => {
                              onUiClick();
                              if (item.category === 'glider') onEquipSkin(-1);
                              onEquipCosmetic(item.category, item.id);
                            }}
                            className={`w-full py-2 rounded-lg border-2 border-[#090e17] text-xs font-extrabold cursor-pointer transition-colors ${
                              isEquipped
                                ? 'bg-[#38bdf8] text-[#090e17]'
                                : 'bg-[#2563eb] hover:bg-[#3b82f6] text-white shadow-[0_2px_0_#090e17]'
                            }`}
                          >
                            {isEquipped ? 'Equipped' : 'Equip'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onUiClick();
                              onBuyCosmetic(item);
                            }}
                            className={`w-full py-2 rounded-lg border-2 border-[#090e17] text-xs font-extrabold font-mono-num inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                              canAfford
                                ? 'bg-[#27c24c] hover:bg-[#32d659] text-white shadow-[0_3px_0_#157a2e]'
                                : 'bg-[#24324a] text-[#94a3b8] hover:bg-[#2d3e5c]'
                            }`}
                          >
                            <span>Buy ·</span>
                            <CoinSprite className="w-4 h-4" />
                            <span>{item.price}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* STATS Tab */}
        {tab === 'stats' && (
          <section className={`my-auto w-full max-w-[900px] ${FRAME_PANEL} flex flex-col`}>
            <div className="bg-[#141e30] border-b-[3px] border-[#090e17] px-6 py-3 flex items-center justify-between">
              <h1 className="text-2xl font-display font-black italic uppercase tracking-wider text-white">
                Career Stats
              </h1>
              <span className="text-xs font-mono-num font-bold text-[#7dd3fc]">
                {playerName} {profile.tagId}
              </span>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-5 bg-[#101827] divide-x-2 divide-y-2 divide-[#090e17] text-center">
              {[
                [stats.g, 'Matches'],
                [stats.w, 'Wins'],
                [stats.g ? `${Math.round((stats.w / stats.g) * 100)}%` : '0%', 'Win Rate'],
                [stats.k, 'Kills'],
                [(stats.k / Math.max(1, stats.d)).toFixed(2), 'K/D'],
                [stats.b ? `#${stats.b}` : '-', 'Best Place'],
                [profile.coins, 'Coins'],
                [stats.dm || 0, 'Damage'],
                [rankInfo.n, 'Arena Rank'],
                [profile.hype || 0, 'Hype'],
              ].map(([val, label]) => (
                <div key={label} className="p-4">
                  <div className="font-mono-num text-xl font-black text-white">{val}</div>
                  <div className="text-xs font-bold text-[#94a3b8] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* UPDATES / VERSION LIST Tab */}
        {tab === 'changelog' && activeChangelogEntry && (
          <section className={`my-auto w-full max-w-[1040px] ${FRAME_PANEL} flex flex-col`}>
            <div className="bg-[#141e30] border-b-[3px] border-[#090e17] px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <h1 className="text-2xl font-display font-black italic uppercase tracking-wider text-white">
                  Version Updates
                </h1>
                <span className="text-xs font-mono-num text-[#38bdf8] font-bold">
                  Current v{VER}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#94a3b8] hidden sm:inline">
                  {CHANGELOG.length} releases
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onUiClick();
                    onSetTab('play');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#24324a] hover:bg-[#31456b] border-2 border-[#090e17] shadow-[0_2px_0_#090e17] text-xs font-extrabold text-white whitespace-nowrap cursor-pointer"
                >
                  Back
                </button>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-5 flex flex-col gap-1 max-h-[360px] overflow-y-auto ld-scroll pr-1">
                {CHANGELOG.map((entry, idx) => {
                  const selected = entry.v === activeChangelogEntry.v;
                  return (
                    <button
                      key={entry.v}
                      type="button"
                      onClick={() => {
                        onUiClick();
                        setSelectedVersion(entry.v);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg border-2 transition-colors cursor-pointer shrink-0 flex items-center justify-between gap-2 ${
                        selected
                          ? 'bg-[#2563eb] border-[#090e17] text-white'
                          : 'bg-[#101827] border-[#090e17] text-[#cbd5e1] hover:bg-[#1c2942] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`font-mono-num text-xs font-bold shrink-0 ${
                            selected ? 'text-[#fef08a]' : 'text-[#38bdf8]'
                          }`}
                        >
                          v{entry.v}
                        </span>
                        <span className="text-xs font-semibold truncate">
                          {entry.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono-num shrink-0">
                        {idx === 0 ? (
                          <span className="font-bold uppercase tracking-wider text-[#4ade80]">
                            Latest
                          </span>
                        ) : (
                          entry.d
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="lg:col-span-7 flex flex-col justify-between gap-3">
                <div className="bg-[#101827] border-2 border-[#090e17] rounded-xl p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-3 pb-3 border-b-2 border-[#090e17]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-num text-sm font-black text-[#38bdf8]">
                          v{activeChangelogEntry.v}
                        </span>
                        <span className="text-base font-bold text-white">
                          {activeChangelogEntry.title}
                        </span>
                      </div>
                      <span className="text-xs font-mono-num text-[#93c5fd] shrink-0">
                        {activeChangelogEntry.d}
                      </span>
                    </div>

                    <ul className="mt-3.5 pl-5 list-disc text-sm text-[#e2e8f0] space-y-2 leading-relaxed">
                      {activeChangelogEntry.n.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t-2 border-[#090e17]">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#94a3b8] mb-2">
                      Weapon Rarity Damage Scaling
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {([0, 1, 2, 3, 4, 5] as RarityTier[]).map((tier) => (
                        <div
                          key={tier}
                          className="bg-[#182338] border border-[#090e17] rounded-lg px-2 py-1.5 flex items-center justify-between text-xs"
                        >
                          <span className="font-bold" style={{ color: RARITY_TIERS[tier].color }}>
                            {RARITY_TIERS[tier].name}
                          </span>
                          <span className="font-mono-num text-[#cbd5e1]">
                            +{Math.round((RARITY_TIERS[tier].dmgMult - 1) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SETTINGS Tab */}
        {(tab === 'settings' || tab === 'controls') && (
          <section className={`my-auto w-full max-w-[820px] ${FRAME_PANEL} flex flex-col`}>
            <div className="bg-[#141e30] border-b-[3px] border-[#090e17] px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
              <h1 className="text-2xl font-display font-black italic uppercase tracking-wider text-white">
                Settings
              </h1>
              <div className="flex items-center gap-1.5">
                {(
                  [
                    ['general', 'Preferences'],
                    ['controls', 'Controls'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      onUiClick();
                      setSettingsSub(id);
                      if (tab !== 'settings') onSetTab('settings');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg border-2 border-[#090e17] text-xs font-extrabold whitespace-nowrap cursor-pointer transition-colors ${
                      effectiveSettingsSub === id
                        ? 'bg-[#2563eb] text-white shadow-[0_2px_0_#090e17]'
                        : 'bg-[#202d47] text-[#cbd5e1] hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              {effectiveSettingsSub === 'general' && (
                <div className="flex flex-col divide-y-2 divide-[#090e17] bg-[#101827] border-2 border-[#090e17] rounded-xl px-4">
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
                      className="flex items-center justify-between py-3 text-sm font-semibold text-[#e2e8f0] cursor-pointer"
                    >
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(db.set[key])}
                        onChange={() => {
                          onUiClick();
                          onToggleSetting(key);
                        }}
                        className="w-4 h-4 accent-[#27c24c] cursor-pointer"
                      />
                    </label>
                  ))}
                  <label className="flex items-center justify-between py-3 text-sm font-semibold text-[#e2e8f0]">
                    <span>Master volume</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={db.set.vol}
                      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      className="w-40 accent-[#27c24c] cursor-pointer"
                    />
                  </label>
                </div>
              )}

              {effectiveSettingsSub === 'controls' && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {KEYBIND_LABELS.map(([action, label]) => {
                      const isListening = listeningKey === action;
                      return (
                        <div
                          key={action}
                          className="bg-[#101827] border-2 border-[#090e17] rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs font-semibold text-[#e2e8f0]"
                        >
                          <span className="truncate">{label}</span>
                          <button
                            type="button"
                            onClick={() => {
                              onUiClick();
                              onStartRebind(action);
                            }}
                            className={`w-20 py-1 rounded border border-[#090e17] text-[11px] font-mono-num font-bold uppercase shrink-0 cursor-pointer transition-colors ${
                              isListening
                                ? 'bg-[#2563eb] text-white'
                                : 'bg-[#24324a] text-white hover:bg-[#31456b]'
                            }`}
                          >
                            {isListening ? '...' : db.kb[action] || ''}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onUiClick();
                        onResetKeybinds();
                      }}
                      className="px-4 py-2 rounded-lg bg-[#24324a] hover:bg-[#31456b] border-2 border-[#090e17] shadow-[0_3px_0_#090e17] text-xs font-extrabold text-white cursor-pointer"
                    >
                      Reset defaults
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ACCOUNT Tab */}
        {tab === 'account' && (
          <section className={`my-auto w-full max-w-[580px] ${FRAME_PANEL} flex flex-col`}>
            <div className="bg-[#141e30] border-b-[3px] border-[#090e17] px-6 py-3 flex items-center justify-between">
              <div className="flex items-baseline gap-3">
                <h1 className="text-2xl font-display font-black italic uppercase tracking-wider text-white">
                  Account
                </h1>
                <span className="font-mono-num text-sm font-bold text-[#38bdf8]">
                  {profile.tagId}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono-num">
                <span className="inline-flex items-center gap-1 text-[#ffd24d] font-bold">
                  <CoinSprite className="w-4 h-4" />
                  {profile.coins.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1 text-[#e879f9] font-bold">
                  <GemSprite className="w-4 h-4" />
                  {(profile.gems || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-3.5">
              <div className="bg-[#101827] border-2 border-[#090e17] rounded-xl p-4 flex flex-col gap-3">
                {googleUser ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-[#4ade80] font-bold">
                        Cloud Save Active
                      </div>
                      <div className="text-base font-bold text-white truncate">
                        {playerName}
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
                      className="px-3.5 py-2 rounded-lg bg-[#24324a] hover:bg-[#31456b] border-2 border-[#090e17] shadow-[0_3px_0_#090e17] text-xs font-extrabold text-white cursor-pointer shrink-0"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-[#cbd5e1]">
                      Sign in with Google to save coins, gems, rank, and cosmetics across devices.
                    </div>
                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={() => {
                        onUiClick();
                        onGoogleSignIn();
                      }}
                      className="w-full py-2.5 rounded-lg bg-white hover:bg-[#f1f5f9] border-2 border-[#090e17] shadow-[0_3px_0_#090e17] text-[#0f172a] text-sm font-extrabold flex items-center justify-center gap-2.5 cursor-pointer transition-colors disabled:opacity-60"
                    >
                      <GoogleIcon />
                      <span>{authLoading ? 'Connecting...' : 'Continue with Google'}</span>
                    </button>
                  </>
                )}

                {authErrorMsg && (
                  <div className="text-xs text-[#ff5c6c] font-medium">{authErrorMsg}</div>
                )}
              </div>

              {(googleUser || db.cur) && (
                <div className="bg-[#101827] border-2 border-[#090e17] rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-white">Change Username</span>
                    {(profile.nameChangesUsed || 0) === 0 ? (
                      <span className="font-extrabold text-[#4ade80]">First change: Free</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono-num font-bold text-[#e879f9]">
                        <GemSprite className="w-3.5 h-3.5" />
                        {NAME_CHANGE_GEM_COST.toLocaleString()} Gems
                      </span>
                    )}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onUiClick();
                      const res = onUpdateDisplayName(newDisplayName);
                      setNameFeedback(res);
                      if (res.ok) setNewDisplayName('');
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      maxLength={16}
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder={`New username (current: ${playerName})`}
                      className="flex-1 px-3 py-2 rounded-lg border-2 border-[#090e17] bg-[#182338] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8]"
                    />
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-lg border-2 border-[#090e17] shadow-[0_3px_0_#090e17] text-xs font-extrabold whitespace-nowrap cursor-pointer transition-colors ${
                        (profile.nameChangesUsed || 0) === 0
                          ? 'bg-[#27c24c] hover:bg-[#32d659] text-white'
                          : (profile.gems || 0) >= NAME_CHANGE_GEM_COST
                            ? 'bg-[#9333ea] hover:bg-[#a855f7] text-white'
                            : 'bg-[#24324a] text-[#94a3b8] hover:bg-[#2d3e5c]'
                      }`}
                    >
                      {(profile.nameChangesUsed || 0) === 0
                        ? 'Change (Free)'
                        : `Change · ${NAME_CHANGE_GEM_COST.toLocaleString()} Gems`}
                    </button>
                  </form>

                  {(profile.nameChangesUsed || 0) >= 1 &&
                    (profile.gems || 0) < NAME_CHANGE_GEM_COST && (
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#94a3b8]">
                        <span>
                          Need {(NAME_CHANGE_GEM_COST - (profile.gems || 0)).toLocaleString()} more Gems to rename again.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onUiClick();
                            setShopCat('gems');
                            onSetTab('shop');
                          }}
                          className="text-[#e879f9] font-bold hover:underline cursor-pointer shrink-0"
                        >
                          Buy Gems
                        </button>
                      </div>
                    )}

                  {nameFeedback && (
                    <div
                      className={`text-xs font-medium ${
                        nameFeedback.ok ? 'text-[#4ade80]' : 'text-[#ff5c6c]'
                      }`}
                    >
                      {nameFeedback.message}
                    </div>
                  )}
                </div>
              )}

              {!googleUser && (
                <div className="bg-[#101827] border-2 border-[#090e17] rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#93c5fd] font-bold">Local Browser Profile</span>
                    {db.cur && (
                      <button
                        type="button"
                        onClick={() => {
                          onUiClick();
                          onSignOut();
                        }}
                        className="text-[#f87171] font-bold hover:underline cursor-pointer"
                      >
                        Sign out ({db.cur})
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleAuthSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      maxLength={12}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Player name"
                      className="px-3 py-2 rounded-lg border-2 border-[#090e17] bg-[#182338] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8]"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (4+ chars)"
                      className="px-3 py-2 rounded-lg border-2 border-[#090e17] bg-[#182338] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8]"
                    />
                    {authError && (
                      <div className="sm:col-span-2 text-xs text-[#ff5c6c] font-medium">
                        {authError}
                      </div>
                    )}
                    <button
                      type="submit"
                      className="sm:col-span-2 py-2 rounded-lg bg-[#2563eb] hover:bg-[#3b82f6] border-2 border-[#090e17] shadow-[0_3px_0_#090e17] text-xs font-extrabold text-white cursor-pointer transition-colors"
                    >
                      {db.cur ? 'Switch local profile' : 'Create or log in locally'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Quiet 1-Line Control Legend */}
      <footer className="pb-2.5 px-4 text-[11px] font-semibold text-[#cbd5e1] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] text-center shrink-0">
        v{VER} · Space Drop · WASD Move · Mouse Shoot · E Loot/Door · R Reload · M Map · 1–6 Slots
      </footer>
    </div>
  );
}

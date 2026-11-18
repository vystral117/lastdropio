import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Map as MapIcon, Volume2, VolumeX } from 'lucide-react';
import {
  AMMO_INFO,
  AMMO_TYPES,
  ISLAND_MARGIN,
  isGun,
  isSniper,
  isStackable,
  MAP_SIZE,
  RARITY_TIERS,
  WP,
} from '../game/constants';
import { HudSnapshot, Keybinds } from '../game/types';
import { WeaponIcon } from './WeaponIcon';

interface GameHudProps {
  hud: HudSnapshot;
  keybinds: Keybinds;
  muted: boolean;
  showFullMap: boolean;
  onToggleMap: () => void;
  onToggleMute: () => void;
  onLeaveLobby: () => void;
  onJumpPlane: () => void;
  onSelectSlot: (idx: number) => void;
  onSwapSlots: (fromIdx: number, toIdx: number) => void;
  onDropSlot: (slotIdx: number) => void;
  onShowResults: () => void;
}

function MinimapSvg({
  hud,
  size,
  showLabels,
}: {
  hud: HudSnapshot;
  size: number;
  showLabels: boolean;
}) {
  const s = size / MAP_SIZE;
  const mm = hud.minimap;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="Island Tactical Map"
    >
      <rect width={size} height={size} fill="#1b5d91" />
      <rect
        x={(ISLAND_MARGIN - 55) * s}
        y={(ISLAND_MARGIN - 55) * s}
        width={(MAP_SIZE - (ISLAND_MARGIN - 55) * 2) * s}
        height={(MAP_SIZE - (ISLAND_MARGIN - 55) * 2) * s}
        fill="#d9c68a"
      />
      <rect
        x={ISLAND_MARGIN * s}
        y={ISLAND_MARGIN * s}
        width={(MAP_SIZE - ISLAND_MARGIN * 2) * s}
        height={(MAP_SIZE - ISLAND_MARGIN * 2) * s}
        fill="#478236"
      />

      {mm.roads.map((r, idx) => (
        <line
          key={idx}
          x1={r.x1 * s}
          y1={r.y1 * s}
          x2={r.x2 * s}
          y2={r.y2 * s}
          stroke="#59616e"
          strokeWidth={Math.max(1.5, r.w * s)}
          strokeLinecap="round"
        />
      ))}

      {mm.buildings.map((b, idx) => (
        <rect
          key={idx}
          x={b.x * s}
          y={b.y * s}
          width={Math.max(2, b.w * s)}
          height={Math.max(2, b.h * s)}
          fill="#b58d5e"
        />
      ))}

      {showLabels &&
        mm.pois.map((poi) => (
          <text
            key={poi.name}
            x={poi.x * s}
            y={poi.y * s}
            textAnchor="middle"
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth={2.5}
            paintOrder="stroke"
            fontSize={12}
            fontWeight={800}
            fontFamily="'Barlow Condensed', sans-serif"
          >
            {poi.name.toUpperCase()}
          </text>
        ))}

      {mm.hasNextStorm && (
        <>
          <line
            x1={mm.x * s}
            y1={mm.y * s}
            x2={mm.nextStormX * s}
            y2={mm.nextStormY * s}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <circle
            cx={mm.nextStormX * s}
            cy={mm.nextStormY * s}
            r={mm.nextStormR * s}
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={1.25}
            strokeDasharray="4 3"
          />
        </>
      )}

      <circle
        cx={mm.stormX * s}
        cy={mm.stormY * s}
        r={mm.stormR * s}
        fill="none"
        stroke="#c084fc"
        strokeWidth={2}
      />

      {mm.plane.active && (
        <>
          <line
            x1={mm.plane.sx * s}
            y1={mm.plane.sy * s}
            x2={mm.plane.ex * s}
            y2={mm.plane.ey * s}
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <circle
            cx={mm.plane.x * s}
            cy={mm.plane.y * s}
            r={showLabels ? 6 : 3.5}
            fill="#e2e8f0"
            stroke="#0f172a"
            strokeWidth={1.5}
          />
        </>
      )}

      {mm.airdrops.map((a, idx) => (
        <rect
          key={idx}
          x={a.x * s - 3}
          y={a.y * s - 3}
          width={6}
          height={6}
          fill="#ffd24d"
          stroke="#111"
          strokeWidth={1}
        />
      ))}

      <circle
        cx={mm.x * s}
        cy={mm.y * s}
        r={showLabels ? 5.5 : 3.6}
        fill="#ffffff"
        stroke="#111"
        strokeWidth={1.5}
      />
    </svg>
  );
}

export function GameHud({
  hud,
  keybinds,
  muted,
  showFullMap,
  onToggleMap,
  onToggleMute,
  onLeaveLobby,
  onJumpPlane,
  onSelectSlot,
  onSwapSlots,
  onDropSlot,
  onShowResults,
}: GameHudProps) {
  const [dragState, setDragState] = useState<{
    fromIdx: number;
    weaponId: number;
    rarity: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);

  const slotRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: PointerEvent) => {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const moved = dragState.moved || Math.hypot(dx, dy) > 7;
      setDragState((prev) =>
        prev ? { ...prev, x: e.clientX, y: e.clientY, moved } : null
      );
    };

    const handleUp = (e: PointerEvent) => {
      const current = dragState;
      setDragState(null);

      if (!current.moved) {
        onSelectSlot(current.fromIdx);
        return;
      }

      let targetSlot = -1;
      for (let i = 0; i < 6; i++) {
        const el = slotRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          targetSlot = i;
          break;
        }
      }

      if (targetSlot === 0) return;
      if (targetSlot > 0) {
        if (targetSlot !== current.fromIdx) {
          onSwapSlots(current.fromIdx, targetSlot);
        }
      } else {
        onDropSlot(current.fromIdx);
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragState, onSelectSlot, onSwapSlots, onDropSlot]);

  const heldDef = WP[hud.heldWeapon] || WP[0];
  const heldRarityInfo = RARITY_TIERS[hud.heldRarity || 0];

  return (
    <div className="fixed inset-0 pointer-events-none z-10 select-none">
      {/* Top-Left: Storm Timer & Elimination Feed */}
      <div className="absolute top-3 left-3 flex flex-col gap-2">
        <div className="bg-[#0e1526]/88 border border-white/14 rounded-xl px-3.5 py-2 flex items-center gap-3">
          <div className="text-xs font-bold text-[#d8b4fe] font-mono-num">
            {hud.stormFinal
              ? 'FINAL CIRCLE'
              : hud.stormShrinking
                ? 'GAS CLOSING'
                : `GAS IN ${hud.stormTimer}s`}
          </div>
          {hud.inStorm && (
            <span className="text-xs font-bold text-[#ff5c6c]">IN GAS</span>
          )}
        </div>

        {hud.feed.length > 0 && (
          <div className="flex flex-col gap-1 pl-1 max-w-xs">
            {hud.feed.map((f) => (
              <div
                key={f.id}
                style={{ opacity: f.alpha, color: f.accent || '#f1f5f9' }}
                className="text-xs font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
              >
                {f.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top-Right: Minimap, Alive/Kills, Mute, and Leave to Lobby */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
        <div className="flex items-start gap-2">
          <div className="bg-[#0e1526]/88 border border-white/14 rounded-xl px-3.5 py-2 flex items-center gap-4">
            <div className="text-center">
              <div className="text-[10px] font-bold text-[#94a3b8]">ALIVE</div>
              <div className="font-mono-num text-lg font-bold leading-tight text-white">
                {hud.aliveCount}
              </div>
            </div>
            <div className="w-px h-6 bg-white/12" />
            <div className="text-center">
              <div className="text-[10px] font-bold text-[#94a3b8]">KILLS</div>
              <div className="font-mono-num text-lg font-bold leading-tight text-white">
                {hud.kills}
              </div>
            </div>
            {hud.isArena && (
              <>
                <div className="w-px h-6 bg-white/12" />
                <div className="text-center">
                  <div className="text-[10px] font-bold text-[#ffd24d]">PTS</div>
                  <div className="font-mono-num text-lg font-bold leading-tight text-[#ffd24d]">
                    {hud.points}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={onToggleMap}
              aria-label="Toggle full map"
              className="w-10 h-10 rounded-lg bg-[#0e1526]/88 border border-white/14 text-[#d5dae3] hover:text-white hover:border-white/30 flex items-center justify-center transition-colors cursor-pointer"
            >
              <MapIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="w-10 h-10 rounded-lg bg-[#0e1526]/88 border border-white/14 text-[#d5dae3] hover:text-white hover:border-white/30 flex items-center justify-center transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onLeaveLobby}
              className="h-10 px-3 rounded-lg bg-[#0e1526]/88 border border-white/14 text-xs font-bold text-[#f87171] hover:text-white hover:bg-[#e8365d] hover:border-[#e8365d] flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave to Lobby</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleMap}
          className="relative bg-[#0e1526]/90 border-2 border-white/20 rounded-xl overflow-hidden pointer-events-auto cursor-pointer hover:border-white/40 transition-colors"
          style={{ width: 146, height: 146 }}
          title={`Toggle full map (${(keybinds.map || 'm').toUpperCase()})`}
        >
          <MinimapSvg hud={hud} size={142} showLabels={false} />
          <span className="absolute bottom-1 right-1.5 font-mono-num text-[10px] font-bold text-white/85 drop-shadow">
            [{(keybinds.map || 'm').toUpperCase()}]
          </span>
        </button>
      </div>

      {/* Top-Center: Online Staging / Connection Banner */}
      {hud.onlineStatus && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#0e1526]/92 border border-[#38bdf8]/40 rounded-xl px-4 py-1.5 text-center shadow">
          {!hud.onlineStatus.connected ? (
            <div className="text-xs font-bold text-[#fbbf24]">
              Connecting to online match server...
            </div>
          ) : hud.onlineStatus.phase === 'COUNTDOWN' ? (
            <div className="text-xs font-bold text-white">
              ONLINE LOBBY · Boarding Drop Plane in{' '}
              <span className="font-mono-num text-[#38bdf8]">{hud.onlineStatus.countdown}s</span>
              <span className="text-[#94a3b8]"> · {hud.onlineStatus.humanCount} Real Players</span>
            </div>
          ) : (
            <div className="text-xs font-bold text-[#86efac]">
              ONLINE MATCH ·{' '}
              <span className="font-mono-num text-white">{hud.onlineStatus.humanCount}</span> Real
              {hud.onlineStatus.humanCount === 1 ? ' Player' : ' Players'}
            </div>
          )}
        </div>
      )}

      {/* Drop Plane / Parachute Prompt */}
      {hud.playerAlive &&
        hud.inPlane &&
        (!hud.onlineStatus || hud.onlineStatus.phase !== 'COUNTDOWN') && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto">
          <div className="bg-[#0e1526]/92 border border-white/20 rounded-xl px-5 py-2.5 text-center shadow-lg">
            <div className="font-display font-black italic text-2xl tracking-wider text-white">
              PRESS SPACE TO DROP
            </div>
            <div className="text-xs text-[#94a3b8]">
              Pick a landing spot on the island
            </div>
          </div>
          <button
            type="button"
            onClick={onJumpPlane}
            className="px-5 py-2 rounded-lg bg-[#e8365d] hover:bg-[#f0476c] text-xs font-bold text-white cursor-pointer"
          >
            DROP NOW
          </button>
        </div>
      )}

      {hud.playerAlive && hud.parachuting && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-[#0e1526]/88 border border-white/15 rounded-xl px-4 py-1.5 text-xs font-semibold text-white">
          Gliding — Steer with WASD
        </div>
      )}

      {/* Full Tactical Map Overlay */}
      {showFullMap && (
        <div
          className="fixed inset-0 z-20 bg-black/65 flex items-center justify-center p-4 pointer-events-auto"
          onClick={onToggleMap}
        >
          <div
            className="bg-[#0e1526] border-2 border-white/20 rounded-2xl p-3 shadow-2xl flex flex-col items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between px-1">
              <span className="font-display font-black italic text-xl tracking-wide text-white">
                ISLAND MAP
              </span>
              <button
                type="button"
                onClick={onToggleMap}
                className="text-xs font-semibold text-[#94a3b8] hover:text-white cursor-pointer"
              >
                Close [{(keybinds.map || 'm').toUpperCase()}]
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/12">
              <MinimapSvg
                hud={hud}
                size={Math.min(
                  540,
                  Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.72)
                )}
                showLabels={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Center-Bottom Active Heal / Shield Channeling Timer */}
      {hud.playerAlive && hud.healProgress > 0 && hud.healRemaining > 0 && !hud.inPlane && !hud.parachuting && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[264px] bg-[#0e1526]/94 border border-white/18 rounded-xl px-3.5 py-2.5 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <WeaponIcon weaponId={hud.healWeaponId} className="w-6 h-4 shrink-0" />
              <span className="text-xs font-bold text-white truncate">
                {hud.healWeaponId === 7
                  ? 'Using Medkit'
                  : hud.healWeaponId === 12
                    ? 'Popping Mini Shield'
                    : 'Drinking Shield'}
              </span>
            </div>
            <span
              className="font-mono-num text-xs font-bold shrink-0"
              style={{
                color:
                  hud.healWeaponId === 7
                    ? '#ff5c6c'
                    : hud.healWeaponId === 12
                      ? '#7dd3fc'
                      : '#38bdf8',
              }}
            >
              {hud.healRemaining.toFixed(1)}s
            </span>
          </div>
          <div className="h-2 bg-black/60 rounded overflow-hidden">
            <div
              className="h-full transition-[width] duration-75"
              style={{
                width: `${Math.min(100, Math.max(0, hud.healProgress * 100))}%`,
                backgroundColor:
                  hud.healWeaponId === 7
                    ? '#ff5c6c'
                    : hud.healWeaponId === 12
                      ? '#7dd3fc'
                      : '#38bdf8',
              }}
            />
          </div>
          <div className="text-[10px] text-[#94a3b8] mt-1 text-center">
            Switch slot to cancel
          </div>
        </div>
      )}

      {/* Center-Bottom Contextual Loot / Chest Prompt */}
      {hud.playerAlive && hud.nearbyAction && !hud.inPlane && !hud.parachuting && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#0e1526]/92 border border-white/18 rounded-lg px-4 py-2 text-xs font-semibold text-white flex items-center gap-2">
          <span className="font-mono-num text-[#ffd24d]">
            [{(keybinds.pick || 'e').toUpperCase()}]
          </span>
          <span
            style={{
              color: hud.nearbyAction.isDoor
                ? '#e6b17a'
                : hud.nearbyAction.isChest
                  ? '#fbbf24'
                  : hud.nearbyAction.rarity !== undefined && hud.nearbyAction.rarity > 0
                    ? RARITY_TIERS[hud.nearbyAction.rarity].color
                    : '#ffffff',
            }}
          >
            {hud.nearbyAction.label}
          </span>
        </div>
      )}

      {/* Bottom-Left: Shield Bar above Health Bar (+ Stamina) */}
      {hud.playerAlive && (
        <div className="absolute bottom-4 left-4 w-[280px] bg-[#0e1526]/90 border border-white/14 rounded-xl p-2.5 flex flex-col gap-1.5">
          {/* Shield Bar (above Health) */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#7dd3fc] w-7">SHD</span>
            <div className="flex-1 h-2.5 bg-black/55 rounded overflow-hidden">
              <div
                className="h-full bg-[#38bdf8] transition-[width] duration-75"
                style={{ width: `${hud.sh}%` }}
              />
            </div>
            <span className="font-mono-num text-xs font-bold text-[#7dd3fc] w-7 text-right">
              {hud.sh}
            </span>
          </div>

          {/* Health Bar */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#86efac] w-7">HP</span>
            <div className="flex-1 h-3.5 bg-black/55 rounded overflow-hidden">
              <div
                className="h-full bg-[#4ade80] transition-[width] duration-75"
                style={{ width: `${hud.hp}%` }}
              />
            </div>
            <span className="font-mono-num text-xs font-bold text-[#86efac] w-7 text-right">
              {hud.hp}
            </span>
          </div>

          {/* Stamina Strip */}
          <div className="h-1 bg-black/45 rounded overflow-hidden mt-0.5">
            <div className="h-full bg-white/75" style={{ width: `${hud.st}%` }} />
          </div>
        </div>
      )}

      {/* Bottom-Right: 6-Slot Rarity Hotbar + Ammo System Readout */}
      {hud.playerAlive ? (
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1.5">
          {!hud.inPlane && !hud.parachuting && (
            <>
              {/* Reserve Ammo Pool Strip */}
              <div className="flex items-center gap-2.5 bg-[#0e1526]/85 border border-white/12 rounded-lg px-2.5 py-1">
                {AMMO_TYPES.map((aType) => {
                  const info = AMMO_INFO[aType];
                  const count = hud.reserveAmmo?.[aType] ?? 0;
                  const isActiveType = heldDef?.ammoType === aType;
                  return (
                    <div
                      key={aType}
                      className={`flex items-center gap-1 text-[10px] font-mono-num font-bold ${
                        isActiveType ? 'opacity-100' : 'opacity-70'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-xs inline-block"
                        style={{ backgroundColor: info.color }}
                      />
                      <span className="text-white/75">{info.short}</span>
                      <span style={{ color: count === 0 ? '#ff5c6c' : '#ffffff' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="text-xs font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] flex items-center gap-2 pr-0.5">
                {isSniper(hud.heldWeapon) && (
                  <span className="font-mono-num text-[#38bdf8]">WIDE FOV</span>
                )}
                {heldDef?.mag !== undefined && heldDef.ammoType && (
                  <>
                    <span
                      className="font-mono-num"
                      style={{
                        color:
                          (hud.ammo[hud.heldWeapon] ?? heldDef.mag) === 0 &&
                          (hud.reserveAmmo?.[heldDef.ammoType] ?? 0) === 0
                            ? '#ff5c6c'
                            : (hud.ammo[hud.heldWeapon] ?? heldDef.mag) === 0
                              ? '#fbbf24'
                              : '#ffffff',
                      }}
                    >
                      {hud.ammo[hud.heldWeapon] ?? heldDef.mag} /{' '}
                      {hud.reserveAmmo?.[heldDef.ammoType] ?? 0}
                    </span>
                    <span aria-hidden="true" className="text-white/30">
                      ·
                    </span>
                  </>
                )}
                <span
                  style={{
                    color: isGun(hud.heldWeapon) ? heldRarityInfo.color : heldDef.color,
                  }}
                >
                  {isGun(hud.heldWeapon)
                    ? `${heldRarityInfo.name} ${heldDef.name}`
                    : heldDef.name}
                </span>
                <span aria-hidden="true" className="text-white/30">
                  ·
                </span>
                <span className="text-white/75 font-medium">
                  [{(keybinds.emote || 'b').toUpperCase()}] Emote
                </span>
              </div>
            </>
          )}

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {hud.inv.map((wi, idx) => {
              const isSelected = hud.selectedSlot === idx;
              const def = wi >= 0 ? WP[wi] : null;
              const rTier = hud.invRarity[idx] || 0;
              const rInfo = RARITY_TIERS[rTier];
              const gun = isGun(wi);

              const keyLabel = (
                keybinds[`s${idx + 1}` as keyof Keybinds] || ''
              ).toUpperCase();
              const stackCount =
                wi === 6 ? hud.grenades : wi >= 7 ? hud.counts[wi] || 0 : 0;
              const magCount =
                def?.mag !== undefined ? hud.ammo[wi] ?? def.mag : null;
              const isDraggingThis = dragState?.moved && dragState.fromIdx === idx;

              return (
                <button
                  key={idx}
                  ref={(el) => {
                    slotRefs.current[idx] = el;
                  }}
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (e.button !== 0) return;
                    if (idx === 0) {
                      onSelectSlot(0);
                      return;
                    }
                    if (wi >= 0) {
                      setDragState({
                        fromIdx: idx,
                        weaponId: wi,
                        rarity: rTier,
                        startX: e.clientX,
                        startY: e.clientY,
                        x: e.clientX,
                        y: e.clientY,
                        moved: false,
                      });
                    }
                  }}
                  style={{
                    backgroundColor: gun
                      ? rInfo.bg
                      : isSelected
                        ? 'rgba(255,255,255,0.18)'
                        : 'rgba(14,21,38,0.9)',
                    borderColor: isSelected
                      ? '#ffd24d'
                      : gun
                        ? rInfo.color
                        : 'rgba(255,255,255,0.16)',
                  }}
                  className={`relative w-[60px] h-[60px] rounded-xl border-2 flex flex-col items-center justify-center transition-transform cursor-pointer ${
                    isSelected ? '-translate-y-0.5' : ''
                  } ${isDraggingThis ? 'opacity-35' : ''}`}
                >
                  <span className="absolute top-1 left-1.5 font-mono-num text-[10px] font-bold text-white/80">
                    {keyLabel}
                  </span>

                  {magCount !== null && (
                    <span
                      className="absolute top-1 right-1.5 font-mono-num text-[10px] font-bold"
                      style={{ color: magCount === 0 ? '#ff5c6c' : '#ffffff' }}
                    >
                      {magCount}
                    </span>
                  )}

                  {isStackable(wi) && stackCount > 0 && (
                    <span
                      className="absolute top-1 right-1.5 font-mono-num text-[10px] font-bold"
                      style={{ color: def?.color }}
                    >
                      x{stackCount}
                    </span>
                  )}

                  {def && (
                    <>
                      <WeaponIcon
                        weaponId={wi}
                        rarity={rTier}
                        className="w-9 h-6 mt-1.5"
                      />
                      <span
                        className="text-[10px] font-bold leading-none mt-0.5 truncate max-w-[54px]"
                        style={{ color: gun ? rInfo.color : def.color }}
                      >
                        {def.name}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0e1526]/94 border border-white/16 rounded-xl px-5 py-3 flex items-center gap-4 pointer-events-auto">
          <div>
            <div className="text-sm font-bold text-white">
              Spectating {hud.spectatingName || 'Survivor'}
            </div>
            <div className="text-xs text-[#94a3b8] mt-0.5">
              {hud.eliminatedBy
                ? `Eliminated by ${hud.eliminatedBy}`
                : 'Eliminated by the storm'}
              <span aria-hidden="true"> · </span>
              Press Esc for results
            </div>
          </div>
          <button
            type="button"
            onClick={onShowResults}
            className="px-3.5 py-2 rounded-lg bg-[#e8365d] hover:bg-[#f0476c] text-xs font-bold text-white whitespace-nowrap cursor-pointer transition-colors"
          >
            View Results
          </button>
        </div>
      )}

      {dragState?.moved && (
        <div
          className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 bg-[#0e1526]/95 border-2 border-[#ffd24d] rounded-xl p-2"
          style={{ left: dragState.x, top: dragState.y }}
        >
          <WeaponIcon
            weaponId={dragState.weaponId}
            rarity={dragState.rarity as 0 | 1 | 2 | 3 | 4 | 5}
            className="w-10 h-7"
          />
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { RARITY_TIERS, WP } from '../game/constants';
import { RarityTier } from '../game/types';

export function LastDropLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 290 100"
      className={className}
      role="img"
      aria-label="Last Drop"
    >
      <path d="M52 44a40 38 0 0 1 80 0z" fill="#e8365d" />
      <path d="M72 44a20 38 0 0 1 40 0z" fill="#ffc93c" />
      <path
        d="M52 44L92 74M132 44L92 74M92 44V74"
        stroke="currentColor"
        strokeWidth="1.75"
        fill="none"
        opacity="0.85"
      />
      <circle cx="92" cy="80" r="6" fill="currentColor" />
      <text
        x="144"
        y="48"
        fontSize="38"
        fontWeight="900"
        fontStyle="italic"
        fill="currentColor"
        fontFamily="'Barlow Condensed', Impact, sans-serif"
        letterSpacing="1.5"
      >
        LAST
      </text>
      <text
        x="144"
        y="86"
        fontSize="38"
        fontWeight="900"
        fontStyle="italic"
        fill="#e8365d"
        fontFamily="'Barlow Condensed', Impact, sans-serif"
        letterSpacing="1.5"
      >
        DROP
      </text>
    </svg>
  );
}

export function PlayerAvatar({
  gliderColor,
  skinColor = '#e0ac82',
  skinId = 'skin_classic',
  backblingId = 'bb_none',
  pickaxeId = 'pick_fists',
  size = 56,
}: {
  gliderColor: string;
  skinColor?: string;
  skinId?: string;
  backblingId?: string;
  pickaxeId?: string;
  size?: number;
}) {
  const showJetpack = backblingId === 'bb_jetpack';
  const showSatchel = backblingId === 'bb_satchel';
  const showShield = backblingId === 'bb_shield';

  const pickStyles: Record<string, { head: string; shaft: string; collar: string }> = {
    pick_timber: { head: '#94a3b8', shaft: '#8b5a2b', collar: '#475569' },
    pick_tactical: { head: '#cbd5e1', shaft: '#334155', collar: '#64748b' },
    pick_plasma: { head: '#38bdf8', shaft: '#1e293b', collar: '#0284c7' },
    pick_emerald: { head: '#10b981', shaft: '#1e293b', collar: '#047857' },
    pick_crimson: { head: '#e8365d', shaft: '#1f2937', collar: '#9f1239' },
    pick_golden: { head: '#fbbf24', shaft: '#5c3d1e', collar: '#d97706' },
  };
  const pickStyle = pickaxeId !== 'pick_fists' ? pickStyles[pickaxeId] || pickStyles.pick_tactical : null;

  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true">
      {/* Glider canopy behind character */}
      <path
        d="M10 24 L36 8 L62 24 L50 32 L36 26 L22 32 Z"
        fill={gliderColor}
        stroke="#111827"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Optional Back Bling */}
      {showJetpack && (
        <g>
          <rect x="16" y="34" width="10" height="16" rx="2.5" fill="#475569" stroke="#111827" strokeWidth="2" />
          <circle cx="21" cy="42" r="2.5" fill="#fbbf24" />
        </g>
      )}
      {showSatchel && (
        <rect x="17" y="35" width="9" height="14" rx="2.5" fill="#7c4a26" stroke="#111827" strokeWidth="2" />
      )}
      {showShield && (
        <ellipse cx="20" cy="42" rx="4.5" ry="11" fill="#1e3a8a" stroke="#38bdf8" strokeWidth="2" />
      )}

      {/* Equipped Outfit shoulder/torso accent */}
      {skinId === 'skin_ranger' && (
        <rect x="20" y="33" width="24" height="22" rx="8" fill="#556b2f" stroke="#111827" strokeWidth="2.4" />
      )}
      {skinId === 'skin_medic' && (
        <g>
          <rect x="20" y="33" width="24" height="22" rx="8" fill="#f8fafc" stroke="#111827" strokeWidth="2.4" />
          <rect x="25" y="42" width="6" height="3" fill="#e11d48" />
          <rect x="26.5" y="40.5" width="3" height="6" fill="#e11d48" />
        </g>
      )}
      {skinId === 'skin_beanie' && (
        <rect x="19" y="32" width="26" height="24" rx="9" fill="#b91c1c" stroke="#111827" strokeWidth="2.4" />
      )}
      {skinId === 'skin_sheriff' && (
        <g>
          <rect x="20" y="33" width="24" height="22" rx="8" fill="#925a2b" stroke="#111827" strokeWidth="2.4" />
          <circle cx="42" cy="42" r="4.5" fill="#dc2626" />
        </g>
      )}
      {skinId === 'skin_knight' && (
        <g>
          <ellipse cx="33" cy="27" rx="9" ry="5.5" fill="#1d4ed8" stroke="#111827" strokeWidth="2.2" />
          <ellipse cx="33" cy="56" rx="9" ry="5.5" fill="#1d4ed8" stroke="#111827" strokeWidth="2.2" />
        </g>
      )}
      {skinId === 'skin_cyber' && (
        <rect x="19" y="32" width="26" height="24" rx="8" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
      )}

      {/* Optional Regular Pickaxe held sideways at right side */}
      {pickStyle && (
        <g transform="translate(46, 51) rotate(72)">
          <rect x="-6" y="-2" width="24" height="4" rx="1.3" fill={pickStyle.shaft} stroke="#111827" strokeWidth="1.4" />
          <path
            d="M14 -12 Q21 -5 20.5 0 Q21 5 14 12 Q16.5 5.5 15.5 0 Q16.5 -5.5 14 -12 Z"
            fill={pickStyle.head}
            stroke="#111827"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <rect x="13" y="-3" width="4.8" height="6" rx="1" fill={pickStyle.collar} stroke="#111827" strokeWidth="1.3" />
        </g>
      )}

      {/* Solid 1-color flesh player body & hands */}
      <circle cx="36" cy="42" r="15" fill={skinColor} stroke="#111827" strokeWidth="3.2" />
      <circle cx="47" cy="51" r="5.5" fill={skinColor} stroke="#111827" strokeWidth="2.2" />
      <circle cx="48" cy="41" r="5.5" fill={skinColor} stroke="#111827" strokeWidth="2.2" />

      {/* Equipped Hat on top of head */}
      {skinId === 'skin_ranger' && (
        <g>
          <circle cx="36" cy="42" r="12.5" fill="#4d5d2b" stroke="#111827" strokeWidth="2.2" />
          <path d="M46 33 Q55 42 46 51 Z" fill="#657a3a" stroke="#111827" strokeWidth="2" />
        </g>
      )}
      {skinId === 'skin_medic' && (
        <g>
          <circle cx="36" cy="42" r="12.5" fill="#f1f5f9" stroke="#111827" strokeWidth="2.2" />
          <path d="M46 33 Q54 42 46 51 Z" fill="#cbd5e1" stroke="#111827" strokeWidth="2" />
          <rect x="32.5" y="40.5" width="7" height="3" fill="#e11d48" />
          <rect x="34.5" y="38.5" width="3" height="7" fill="#e11d48" />
        </g>
      )}
      {skinId === 'skin_beanie' && (
        <g>
          <circle cx="35" cy="42" r="13" fill="#dc2626" stroke="#111827" strokeWidth="2.2" />
          <rect x="31" y="31" width="4" height="22" fill="#f8fafc" />
          <circle cx="27" cy="42" r="4.5" fill="#ffffff" stroke="#111827" strokeWidth="1.8" />
        </g>
      )}
      {skinId === 'skin_sheriff' && (
        <g>
          <ellipse cx="36" cy="42" rx="17" ry="15" fill="#6d4020" stroke="#111827" strokeWidth="2.4" />
          <ellipse cx="36" cy="42" rx="10" ry="8.5" fill="#8b5a2b" stroke="#fbbf24" strokeWidth="2" />
        </g>
      )}
      {skinId === 'skin_knight' && (
        <g>
          <circle cx="36" cy="42" r="14" fill="#94a3b8" stroke="#111827" strokeWidth="2.4" />
          <rect x="42" y="35" width="4" height="14" fill="#1e293b" />
          <rect x="23" y="38.5" width="16" height="7" rx="3" fill="#2563eb" stroke="#111827" strokeWidth="1.8" />
        </g>
      )}
      {skinId === 'skin_cyber' && (
        <g>
          <circle cx="36" cy="42" r="14" fill="#1e293b" stroke="#111827" strokeWidth="2.4" />
          <rect x="42" y="33" width="6" height="18" rx="3" fill="#22d3ee" stroke="#111827" strokeWidth="1.8" />
        </g>
      )}
    </svg>
  );
}

export function WeaponIcon({
  weaponId,
  rarity = 0,
  className = 'w-10 h-7',
}: {
  weaponId: number;
  rarity?: RarityTier;
  className?: string;
}) {
  const accent = rarity > 0 ? RARITY_TIERS[rarity].color : WP[weaponId]?.color || '#d0d0d0';

  if (weaponId === 0) {
    return (
      <svg viewBox="0 0 48 30" className={className} aria-hidden="true">
        <circle cx="16" cy="15" r="6.5" fill="#e0ac82" stroke="#14161b" strokeWidth="2.2" />
        <circle cx="32" cy="15" r="6.5" fill="#e0ac82" stroke="#14161b" strokeWidth="2.2" />
      </svg>
    );
  }
  if (weaponId === 1) {
    return (
      <svg viewBox="0 0 48 30" className={className} aria-hidden="true">
        <rect x="13" y="8" width="22" height="7" rx="1.2" fill="#2b303a" stroke="#111" strokeWidth="1.4" />
        <rect x="14" y="14" width="7" height="10" rx="1.2" fill="#1f232b" stroke="#111" strokeWidth="1.4" />
        <rect x="17" y="10" width="14" height="2.5" rx="0.6" fill={accent} />
      </svg>
    );
  }
  if (weaponId === 2) {
    return (
      <svg viewBox="0 0 48 30" className={className} aria-hidden="true">
        <rect x="5" y="10" width="7" height="5" rx="1" fill="#363c48" stroke="#111" strokeWidth="1.2" />
        <rect x="11" y="9" width="24" height="7" rx="1.2" fill="#22262e" stroke="#111" strokeWidth="1.4" />
        <rect x="19" y="16" width="5.5" height="9" rx="1" fill="#1c1f26" stroke="#111" strokeWidth="1.2" />
        <rect x="35" y="10.5" width="7" height="4" rx="0.8" fill="#475569" stroke="#111" strokeWidth="1.1" />
        <rect x="16" y="10.5" width="14" height="2.5" fill={accent} />
      </svg>
    );
  }
  if (weaponId === 3) {
    return (
      <svg viewBox="0 0 48 30" className={className} aria-hidden="true">
        <rect x="3" y="11" width="11" height="7" rx="1.5" fill="#7c4a26" stroke="#111" strokeWidth="1.3" />
        <rect x="13" y="10.5" width="12" height="7" rx="1" fill="#272b33" stroke="#111" strokeWidth="1.3" />
        <rect x="24" y="11" width="20" height="4.5" rx="1" fill="#3f4654" stroke="#111" strokeWidth="1.2" />
        <rect x="25" y="10" width="12" height="7.5" rx="1.2" fill="#8b5730" stroke="#111" strokeWidth="1.2" />
        <rect x="15" y="12" width="8" height="3" fill={accent} />
      </svg>
    );
  }
  if (weaponId === 4) {
    return (
      <svg viewBox="0 0 48 30" className={className} aria-hidden="true">
        <rect x="2" y="11" width="10" height="6.5" rx="1" fill="#282c34" stroke="#111" strokeWidth="1.2" />
        <rect x="11" y="10" width="16" height="8" rx="1.2" fill="#1f232a" stroke="#111" strokeWidth="1.3" />
        <rect x="19" y="17.5" width="5.5" height="9" rx="1" fill="#2d333d" stroke="#111" strokeWidth="1.2" />
        <rect x="27" y="11" width="11" height="6" rx="1" fill="#3b4250" stroke="#111" strokeWidth="1.2" />
        <rect x="38" y="12.5" width="8" height="3" fill="#181a20" />
        <rect x="15" y="7.5" width="9" height="2.5" rx="0.5" fill={accent} />
      </svg>
    );
  }
  if (weaponId === 5) {
    return (
      <svg viewBox="0 0 48 30" className={className} aria-hidden="true">
        <rect x="2" y="12" width="12" height="6.5" rx="1" fill="#5c4028" stroke="#111" strokeWidth="1.2" />
        <rect x="13" y="11" width="13" height="7.5" rx="1" fill="#252932" stroke="#111" strokeWidth="1.3" />
        <rect x="26" y="12.5" width="17" height="3.8" fill="#3a414e" stroke="#111" strokeWidth="1.1" />
        <rect x="42" y="11.5" width="4.5" height="5.8" rx="0.8" fill="#181a20" />
        <rect x="14" y="6.5" width="14" height="4" rx="1" fill="#15181e" stroke="#111" strokeWidth="1.1" />
        <rect x="15.5" y="7.5" width="11" height="2" fill={accent} />
        <rect x="26.5" y="7" width="2" height="3" fill="#7dd3fc" />
      </svg>
    );
  }
  if (weaponId === 9) {
    return (
      <svg viewBox="0 0 48 30" className={className} aria-hidden="true">
        <rect x="2" y="11" width="11" height="7.5" rx="1" fill="#1e293b" stroke="#111" strokeWidth="1.2" />
        <rect x="12" y="10" width="14" height="9.5" rx="1.2" fill="#334155" stroke="#111" strokeWidth="1.3" />
        <rect x="26" y="10.5" width="19" height="3" fill="#475569" />
        <rect x="26" y="16" width="19" height="3" fill="#475569" />
        <rect x="15" y="13" width="29" height="3.5" fill={accent} />
        <rect x="29" y="9.5" width="2.5" height="10.5" fill="#e0f2fe" />
        <rect x="35" y="9.5" width="2.5" height="10.5" fill="#e0f2fe" />
        <rect x="41" y="9.5" width="2.5" height="10.5" fill="#e0f2fe" />
        <rect x="14" y="6" width="11" height="3.5" rx="0.8" fill="#0f172a" />
        <rect x="16" y="7" width="7" height="1.5" fill="#38bdf8" />
      </svg>
    );
  }
  if (weaponId === 6) {
    return (
      <svg viewBox="0 0 48 30" className={className} aria-hidden="true">
        <circle cx="24" cy="17" r="8" fill="#3f5a3a" stroke="#14161b" strokeWidth="1.8" />
        <rect x="21.5" y="5" width="5" height="4.5" rx="0.8" fill="#94a3b8" stroke="#14161b" strokeWidth="1.2" />
        <circle cx="28.5" cy="7.5" r="2.5" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
      </svg>
    );
  }
  if (weaponId === 7) {
    return (
      <svg viewBox="0 0 48 30" className={className} aria-hidden="true">
        <rect x="14" y="5" width="20" height="20" rx="2.5" fill="#f8fafc" stroke="#14161b" strokeWidth="1.6" />
        <rect x="22" y="9" width="4" height="12" fill="#e11d48" />
        <rect x="18" y="13" width="12" height="4" fill="#e11d48" />
      </svg>
    );
  }
  if (weaponId === 8) {
    return (
      <svg viewBox="0 0 48 30" className={className} aria-hidden="true">
        <circle cx="24" cy="17" r="9" fill="#0284c7" stroke="#14161b" strokeWidth="1.6" />
        <circle cx="24" cy="17" r="6.5" fill="#38bdf8" />
        <rect x="21" y="5" width="6" height="4" rx="0.8" fill="#92400e" stroke="#14161b" strokeWidth="1.2" />
        <circle cx="21" cy="14" r="2" fill="#e0f2fe" />
      </svg>
    );
  }
  if (weaponId === 10) {
    return (
      <svg viewBox="0 0 48 30" className={className} aria-hidden="true">
        <circle cx="24" cy="16.5" r="8.5" fill="#0369a1" stroke="#14161b" strokeWidth="1.8" />
        <circle cx="24" cy="16.5" r="5" fill="#38bdf8" />
        <circle cx="24" cy="16.5" r="2" fill="#e0f2fe" />
        <rect x="21" y="4.5" width="6" height="4" rx="0.8" fill="#e0f2fe" stroke="#14161b" strokeWidth="1.2" />
      </svg>
    );
  }
  if (weaponId === 11) {
    return (
      <svg viewBox="0 0 48 30" className={className} aria-hidden="true">
        <circle cx="24" cy="16.5" r="8.5" fill="#581c87" stroke="#14161b" strokeWidth="1.8" />
        <circle cx="24" cy="16.5" r="5" fill="#c084fc" />
        <circle
          cx="24"
          cy="16.5"
          r="7"
          fill="none"
          stroke="#f3e8ff"
          strokeWidth="1.4"
          strokeDasharray="6 3"
        />
        <rect x="21" y="4.5" width="6" height="4" rx="0.8" fill="#d8b4fe" stroke="#14161b" strokeWidth="1.2" />
      </svg>
    );
  }
  if (weaponId === 12) {
    return (
      <svg viewBox="0 0 48 30" className={className} aria-hidden="true">
        <rect x="18" y="10" width="12" height="15" rx="3.5" fill="#0ea5e9" stroke="#14161b" strokeWidth="1.6" />
        <rect x="20" y="13" width="8" height="10" rx="2" fill="#7dd3fc" />
        <rect x="21.5" y="5.5" width="5" height="4.5" rx="0.8" fill="#92400e" stroke="#14161b" strokeWidth="1.2" />
        <rect x="21" y="14" width="2" height="6" rx="0.8" fill="#e0f2fe" />
      </svg>
    );
  }
  return null;
}

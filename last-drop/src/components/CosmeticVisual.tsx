import React from 'react';
import { CosmeticItem } from '../game/types';

function SkinArtwork({ item }: { item: CosmeticItem }) {
  const id = item.id;
  return (
    <svg viewBox="0 0 160 112" className="w-full h-full" aria-hidden="true">
      {/* Subtle tactical backdrop rings */}
      <circle cx="80" cy="56" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <circle cx="80" cy="56" r="32" fill="none" stroke={item.secondary || item.color} strokeOpacity="0.24" strokeWidth="1.5" strokeDasharray="4 4" />

      {/* Outfit / Torso */}
      {id === 'skin_classic' && (
        <g>
          <rect x="52" y="64" width="56" height="36" rx="16" fill="#475569" stroke="#0f172a" strokeWidth="3" />
          <path d="M72 64 L80 74 L88 64" fill="#e0ac82" stroke="#0f172a" strokeWidth="2" />
        </g>
      )}
      {id === 'skin_ranger' && (
        <g>
          <rect x="48" y="64" width="64" height="38" rx="16" fill="#556b2f" stroke="#0f172a" strokeWidth="3" />
          <rect x="56" y="70" width="14" height="22" rx="3" fill="#3f4f22" stroke="#0f172a" strokeWidth="2" />
          <rect x="90" y="70" width="14" height="22" rx="3" fill="#3f4f22" stroke="#0f172a" strokeWidth="2" />
          <rect x="75" y="64" width="10" height="36" fill="#334124" />
        </g>
      )}
      {id === 'skin_medic' && (
        <g>
          <rect x="48" y="64" width="64" height="38" rx="16" fill="#f8fafc" stroke="#0f172a" strokeWidth="3" />
          <rect x="55" y="72" width="16" height="18" rx="3" fill="#e2e8f0" stroke="#0f172a" strokeWidth="2" />
          <rect x="93" y="74" width="12" height="5" fill="#e11d48" />
          <rect x="96.5" y="70.5" width="5" height="12" fill="#e11d48" />
        </g>
      )}
      {id === 'skin_beanie' && (
        <g>
          <rect x="46" y="64" width="68" height="38" rx="18" fill="#b91c1c" stroke="#0f172a" strokeWidth="3" />
          <path d="M52 76 H108 M52 88 H108" stroke="#7f1d1d" strokeWidth="2.5" />
          <rect x="78" y="64" width="4" height="38" fill="#f8fafc" />
        </g>
      )}
      {id === 'skin_sheriff' && (
        <g>
          <rect x="48" y="64" width="64" height="38" rx="16" fill="#925a2b" stroke="#0f172a" strokeWidth="3" />
          <path d="M64 64 L80 82 L96 64 Z" fill="#dc2626" stroke="#0f172a" strokeWidth="2" />
          <polygon points="94,74 96,79 101,79 97,82 98.5,87 94,84 89.5,87 91,82 87,79 92,79" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.2" />
        </g>
      )}
      {id === 'skin_knight' && (
        <g>
          <rect x="46" y="64" width="68" height="38" rx="14" fill="#334155" stroke="#0f172a" strokeWidth="3" />
          <ellipse cx="48" cy="72" rx="13" ry="9" fill="#1d4ed8" stroke="#0f172a" strokeWidth="2.5" />
          <ellipse cx="112" cy="72" rx="13" ry="9" fill="#1d4ed8" stroke="#0f172a" strokeWidth="2.5" />
          <path d="M64 68 L80 82 L96 68" fill="none" stroke="#94a3b8" strokeWidth="3" />
        </g>
      )}
      {id === 'skin_cyber' && (
        <g>
          <rect x="46" y="64" width="68" height="38" rx="14" fill="#0f172a" stroke="#06b6d4" strokeWidth="2.5" />
          <path d="M58 64 L70 84 L90 84 L102 64" fill="none" stroke="#22d3ee" strokeWidth="2.5" />
          <circle cx="80" cy="77" r="4" fill="#22d3ee" />
        </g>
      )}

      {/* Hands */}
      <circle cx="44" cy="86" r="8" fill="#e0ac82" stroke="#0f172a" strokeWidth="2.5" />
      <circle cx="116" cy="86" r="8" fill="#e0ac82" stroke="#0f172a" strokeWidth="2.5" />

      {/* Head (default survivor solid flesh tone) */}
      <circle cx="80" cy="48" r="22" fill="#e0ac82" stroke="#0f172a" strokeWidth="3" />
      <circle cx="72" cy="48" r="2.7" fill="#0f172a" />
      <circle cx="88" cy="48" r="2.7" fill="#0f172a" />

      {/* Hat / Helmet */}
      {id === 'skin_ranger' && (
        <g>
          <path d="M56 42 C56 24, 104 24, 104 42 Z" fill="#4d5d2b" stroke="#0f172a" strokeWidth="2.8" />
          <path d="M54 41 Q80 34 112 43 Q80 47 54 41 Z" fill="#657a3a" stroke="#0f172a" strokeWidth="2.4" />
        </g>
      )}
      {id === 'skin_medic' && (
        <g>
          <path d="M56 42 C56 24, 104 24, 104 42 Z" fill="#f1f5f9" stroke="#0f172a" strokeWidth="2.8" />
          <path d="M54 41 Q80 34 110 43 Q80 47 54 41 Z" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2.4" />
          <rect x="76" y="29" width="8" height="3.2" fill="#e11d48" />
          <rect x="78.4" y="26.6" width="3.2" height="8" fill="#e11d48" />
        </g>
      )}
      {id === 'skin_beanie' && (
        <g>
          <circle cx="80" cy="18" r="7.5" fill="#ffffff" stroke="#0f172a" strokeWidth="2.4" />
          <path d="M57 40 C57 20, 103 20, 103 40 Z" fill="#dc2626" stroke="#0f172a" strokeWidth="2.8" />
          <path d="M60 32 H100" stroke="#f8fafc" strokeWidth="4.5" />
          <rect x="55" y="37" width="50" height="8" rx="4" fill="#b91c1c" stroke="#0f172a" strokeWidth="2.4" />
        </g>
      )}
      {id === 'skin_sheriff' && (
        <g>
          <ellipse cx="80" cy="36" rx="34" ry="7.5" fill="#6d4020" stroke="#0f172a" strokeWidth="2.6" />
          <path d="M62 35 L67 16 L80 21 L93 16 L98 35 Z" fill="#8b5a2b" stroke="#0f172a" strokeWidth="2.6" strokeLinejoin="round" />
          <rect x="63" y="30" width="34" height="4.5" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.5" />
        </g>
      )}
      {id === 'skin_knight' && (
        <g>
          <path d="M72 13 C78 6, 92 9, 90 22 L72 22 Z" fill="#2563eb" stroke="#0f172a" strokeWidth="2.4" />
          <circle cx="80" cy="46" r="24" fill="#94a3b8" stroke="#0f172a" strokeWidth="3" />
          <path d="M62 42 L80 46 L98 42 L95 57 L80 65 L65 57 Z" fill="#64748b" stroke="#0f172a" strokeWidth="2.4" />
          <rect x="67" y="42" width="10" height="4" rx="1.5" fill="#0f172a" />
          <rect x="83" y="42" width="10" height="4" rx="1.5" fill="#0f172a" />
          <path d="M73 52 V60 M80 51 V62 M87 52 V60" stroke="#0f172a" strokeWidth="2.2" />
        </g>
      )}
      {id === 'skin_cyber' && (
        <g>
          <circle cx="80" cy="47" r="23.5" fill="#1e293b" stroke="#0f172a" strokeWidth="3" />
          <rect x="59" y="38" width="42" height="14" rx="7" fill="#06b6d4" stroke="#0f172a" strokeWidth="2.5" />
          <path d="M64 43 H96" stroke="#cffafe" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

function PickaxeArtwork({ item }: { item: CosmeticItem }) {
  if (item.id === 'pick_fists') {
    return (
      <svg viewBox="0 0 160 112" className="w-full h-full" aria-hidden="true">
        <circle cx="80" cy="56" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
        <g transform="translate(56, 58) rotate(-15)">
          <rect x="-15" y="-14" width="30" height="28" rx="11" fill="#e0ac82" stroke="#0f172a" strokeWidth="3" />
          <line x1="-6" y1="-13" x2="-6" y2="-4" stroke="#0f172a" strokeWidth="2" />
          <line x1="2" y1="-13" x2="2" y2="-4" stroke="#0f172a" strokeWidth="2" />
        </g>
        <g transform="translate(104, 54) rotate(15)">
          <rect x="-15" y="-14" width="30" height="28" rx="11" fill="#e0ac82" stroke="#0f172a" strokeWidth="3" />
          <line x1="-2" y1="-13" x2="-2" y2="-4" stroke="#0f172a" strokeWidth="2" />
          <line x1="6" y1="-13" x2="6" y2="-4" stroke="#0f172a" strokeWidth="2" />
        </g>
      </svg>
    );
  }

  const palettes: Record<string, { head: string; highlight: string; shaft: string; collar: string; grip: string }> = {
    pick_timber: { head: '#94a3b8', highlight: '#f1f5f9', shaft: '#8b5a2b', collar: '#475569', grip: '#5c3a1b' },
    pick_tactical: { head: '#cbd5e1', highlight: '#ffffff', shaft: '#334155', collar: '#64748b', grip: '#1e293b' },
    pick_plasma: { head: '#38bdf8', highlight: '#e0f2fe', shaft: '#1e293b', collar: '#0284c7', grip: '#0f172a' },
    pick_emerald: { head: '#10b981', highlight: '#d1fae5', shaft: '#1e293b', collar: '#047857', grip: '#064e3b' },
    pick_crimson: { head: '#e8365d', highlight: '#ffe4e6', shaft: '#1f2937', collar: '#9f1239', grip: '#111827' },
    pick_golden: { head: '#fbbf24', highlight: '#fef9c3', shaft: '#5c3d1e', collar: '#d97706', grip: '#3f2710' },
  };
  const p = palettes[item.id] || palettes.pick_tactical;

  return (
    <svg viewBox="0 0 160 112" className="w-full h-full" aria-hidden="true">
      <circle cx="80" cy="56" r="42" fill="none" stroke={p.head} strokeOpacity="0.2" strokeWidth="1.5" />
      <g transform="translate(80, 58) rotate(-38)">
        {/* Regular Pickaxe Handle Shaft */}
        <rect x="-5" y="-12" width="10" height="58" rx="3" fill={p.shaft} stroke="#0f172a" strokeWidth="2.8" />
        {/* Grip wrap at base */}
        <rect x="-5.5" y="20" width="11" height="22" rx="2" fill={p.grip} stroke="#0f172a" strokeWidth="2.2" />
        <line x1="-5" y1="26" x2="5" y2="29" stroke="rgba(255,255,255,0.22)" strokeWidth="1.6" />
        <line x1="-5" y1="33" x2="5" y2="36" stroke="rgba(255,255,255,0.22)" strokeWidth="1.6" />
        {/* Pommel */}
        <rect x="-7" y="42" width="14" height="6" rx="2.5" fill={p.collar} stroke="#0f172a" strokeWidth="2.2" />

        {/* Classic Curved Regular Pickaxe Head (double pointed) */}
        <path
          d="M-38 -2 Q-16 -24 0 -22 Q16 -24 38 -2 Q18 -10 0 -9 Q-18 -10 -38 -2 Z"
          fill={p.head}
          stroke="#0f172a"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        {/* Metallic bevel sheen along top edge */}
        <path
          d="M-30 -6 Q-12 -20 0 -18.5 Q12 -20 30 -6"
          fill="none"
          stroke={p.highlight}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Center forged socket collar */}
        <rect x="-8" y="-23" width="16" height="15" rx="3" fill={p.collar} stroke="#0f172a" strokeWidth="2.5" />
        <circle cx="0" cy="-15.5" r="2.5" fill={p.highlight} opacity="0.75" />
      </g>
    </svg>
  );
}

function BackBlingArtwork({ item }: { item: CosmeticItem }) {
  return (
    <svg viewBox="0 0 160 112" className="w-full h-full" aria-hidden="true">
      <circle cx="80" cy="56" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      {item.id === 'bb_none' && (
        <g opacity="0.75">
          <rect x="60" y="30" width="40" height="50" rx="10" fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="5 4" />
          <line x1="54" y1="82" x2="106" y2="30" stroke="#e8365d" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )}
      {item.id === 'bb_jetpack' && (
        <g>
          {/* Side thruster fins */}
          <path d="M46 46 L30 62 L46 70 Z" fill="#334155" stroke="#0f172a" strokeWidth="2.5" />
          <path d="M114 46 L130 62 L114 70 Z" fill="#334155" stroke="#0f172a" strokeWidth="2.5" />
          {/* Thruster nozzles + flame */}
          <polygon points="58,82 68,82 65,98 61,98" fill="#fbbf24" />
          <polygon points="92,82 102,82 99,98 95,98" fill="#fbbf24" />
          <rect x="55" y="72" width="16" height="12" rx="2" fill="#334155" stroke="#0f172a" strokeWidth="2.4" />
          <rect x="89" y="72" width="16" height="12" rx="2" fill="#334155" stroke="#0f172a" strokeWidth="2.4" />
          {/* Main armored pack */}
          <rect x="50" y="24" width="60" height="54" rx="12" fill="#475569" stroke="#0f172a" strokeWidth="3" />
          <rect x="60" y="32" width="40" height="36" rx="8" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
          {/* Amber Core */}
          <circle cx="80" cy="50" r="12" fill="#f59e0b" stroke="#0f172a" strokeWidth="2.2" />
          <circle cx="80" cy="50" r="6" fill="#fef08a" />
        </g>
      )}
      {item.id === 'bb_satchel' && (
        <g>
          {/* Bedroll on top */}
          <rect x="52" y="20" width="56" height="14" rx="7" fill="#b48a5a" stroke="#0f172a" strokeWidth="2.6" />
          {/* Main leather pack */}
          <rect x="50" y="30" width="60" height="58" rx="12" fill="#7c4a26" stroke="#0f172a" strokeWidth="3" />
          {/* Top flap */}
          <path d="M50 40 C50 30, 110 30, 110 40 L106 58 L54 58 Z" fill="#925a2b" stroke="#0f172a" strokeWidth="2.6" />
          {/* Tan straps + brass buckles */}
          <rect x="60" y="32" width="8" height="44" rx="2" fill="#d6b384" stroke="#0f172a" strokeWidth="2" />
          <rect x="92" y="32" width="8" height="44" rx="2" fill="#d6b384" stroke="#0f172a" strokeWidth="2" />
          <rect x="59" y="53" width="10" height="6" rx="1" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.6" />
          <rect x="91" y="53" width="10" height="6" rx="1" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.6" />
        </g>
      )}
      {item.id === 'bb_shield' && (
        <g>
          {/* Shield outer body */}
          <path
            d="M80 18 L112 30 V58 C112 76 96 90 80 96 C64 90 48 76 48 58 V30 Z"
            fill="#1e3a8a"
            stroke="#0f172a"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          {/* Glowing cyan energy rim */}
          <path
            d="M80 25 L104 35 V57 C104 71 92 82 80 87 C68 82 56 71 56 57 V35 Z"
            fill="#0f172a"
            fillOpacity="0.45"
            stroke="#38bdf8"
            strokeWidth="2.8"
          />
          {/* Core crest */}
          <polygon points="80,38 92,52 80,72 68,52" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1.8" />
        </g>
      )}
    </svg>
  );
}

function GliderArtwork({ item }: { item: CosmeticItem }) {
  const accent = item.secondary || '#e2e8f0';
  return (
    <svg viewBox="0 0 160 112" className="w-full h-full" aria-hidden="true">
      <circle cx="80" cy="56" r="42" fill="none" stroke={item.color} strokeOpacity="0.22" strokeWidth="1.5" />
      {/* Suspension cables + grip bar */}
      <line x1="48" y1="60" x2="72" y2="86" stroke="#cbd5e1" strokeWidth="2.2" />
      <line x1="112" y1="60" x2="88" y2="86" stroke="#cbd5e1" strokeWidth="2.2" />
      <line x1="80" y1="54" x2="80" y2="86" stroke="#94a3b8" strokeWidth="2.4" />
      <line x1="65" y1="86" x2="95" y2="86" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />

      {/* Main swept delta canopy */}
      <path
        d="M80 18 L142 64 L108 72 L80 54 L52 72 L18 64 Z"
        fill={item.color}
        stroke="#0f172a"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Wing stripe trim */}
      <path
        d="M80 26 L124 61 L108 65 L80 46 L52 65 L36 61 Z"
        fill={accent}
        fillOpacity="0.32"
      />
      {/* Center keel */}
      <line x1="80" y1="18" x2="80" y2="56" stroke="#0f172a" strokeWidth="2.6" />
      {item.id === 'gl_gold' && (
        <polygon points="73,34 76,27 80,32 84,27 87,34" fill="#fef08a" stroke="#0f172a" strokeWidth="1.4" />
      )}
    </svg>
  );
}

function MusicArtwork({ item }: { item: CosmeticItem }) {
  if (item.id === 'mus_off') {
    return (
      <svg viewBox="0 0 160 112" className="w-full h-full" aria-hidden="true">
        <circle cx="80" cy="56" r="32" fill="#1e293b" stroke="#475569" strokeWidth="2.5" />
        <text x="80" y="64" textAnchor="middle" fontSize="26" fill="#94a3b8" fontWeight="bold">♪</text>
        <line x1="56" y1="80" x2="104" y2="32" stroke="#e8365d" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 160 112" className="w-full h-full" aria-hidden="true">
      {/* Equalizer bars behind vinyl */}
      {[34, 46, 58, 102, 114, 126].map((x, idx) => {
        const h = [26, 44, 34, 38, 50, 24][idx];
        return (
          <rect
            key={x}
            x={x - 3}
            y={56 - h / 2}
            width="6"
            height={h}
            rx="3"
            fill={item.color}
            fillOpacity="0.45"
          />
        );
      })}
      {/* Vinyl record */}
      <circle cx="80" cy="56" r="34" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />
      <circle cx="80" cy="56" r="26" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />
      <circle cx="80" cy="56" r="19" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
      <circle cx="80" cy="56" r="13" fill={item.color} stroke="#0f172a" strokeWidth="2" />
      <circle cx="80" cy="56" r="3.5" fill="#0f172a" />
    </svg>
  );
}

export function CosmeticVisual({ item }: { item: CosmeticItem }) {
  return (
    <div
      className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center"
      style={{
        background: `radial-gradient(circle at 50% 42%, ${item.color}2e 0%, #071126 78%)`,
      }}
    >
      {item.category === 'skin' && <SkinArtwork item={item} />}
      {item.category === 'pickaxe' && <PickaxeArtwork item={item} />}
      {item.category === 'backbling' && <BackBlingArtwork item={item} />}
      {item.category === 'glider' && <GliderArtwork item={item} />}
      {item.category === 'music' && <MusicArtwork item={item} />}
    </div>
  );
}

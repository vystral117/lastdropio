import {
  AMMO_INFO,
  ISLAND_MARGIN,
  isStackable,
  MAP_SIZE,
  PLAYER_RADIUS,
  POIS,
  RARITY_TIERS,
  SPAWN_ISLAND,
  STORM_RADII,
  WP,
} from './constants';
import { GameEngine } from './engine';
import { CosmeticItem, GameSettings, Player, RarityTier } from './types';

function drawWeaponSprite(g: CanvasRenderingContext2D, w: number, rarity: RarityTier = 0) {
  const accent = rarity > 0 ? RARITY_TIERS[rarity].color : WP[w].color;
  g.lineJoin = 'round';
  g.lineWidth = 1.6;
  g.strokeStyle = '#14161b';

  if (w === 1) {
    g.fillStyle = '#2b303a';
    g.fillRect(3, -3.5, 16, 6.5);
    g.strokeRect(3, -3.5, 16, 6.5);
    g.fillStyle = '#1f232b';
    g.fillRect(4, 1, 5.5, 8);
    g.strokeRect(4, 1, 5.5, 8);
    g.fillStyle = accent;
    g.fillRect(6, -2.5, 10, 2.5);
  } else if (w === 2) {
    g.fillStyle = '#22262e';
    g.fillRect(0, -3.5, 25, 7);
    g.strokeRect(0, -3.5, 25, 7);
    g.fillStyle = '#363c48';
    g.fillRect(-6, -2.5, 7, 5);
    g.strokeRect(-6, -2.5, 7, 5);
    g.fillStyle = '#1c1f26';
    g.fillRect(10, 3, 5, 10);
    g.strokeRect(10, 3, 5, 10);
    g.fillStyle = accent;
    g.fillRect(6, -2.5, 14, 2.5);
    g.fillStyle = '#475569';
    g.fillRect(25, -2, 5, 4);
  } else if (w === 3) {
    g.fillStyle = '#7c4a26';
    g.fillRect(-7, -3.5, 12, 7);
    g.strokeRect(-7, -3.5, 12, 7);
    g.fillStyle = '#272b33';
    g.fillRect(4, -3.5, 13, 7);
    g.strokeRect(4, -3.5, 13, 7);
    g.fillStyle = '#3f4654';
    g.fillRect(16, -2.5, 20, 4.5);
    g.strokeRect(16, -2.5, 20, 4.5);
    g.fillStyle = '#8b5730';
    g.fillRect(17, -4, 12, 7.5);
    g.strokeRect(17, -4, 12, 7.5);
    g.fillStyle = accent;
    g.fillRect(7, -2, 8, 3);
  } else if (w === 4) {
    g.fillStyle = '#282c34';
    g.fillRect(-8, -3, 11, 6);
    g.strokeRect(-8, -3, 11, 6);
    g.fillStyle = '#1f232a';
    g.fillRect(2, -4, 18, 8);
    g.strokeRect(2, -4, 18, 8);
    g.fillStyle = '#2d333d';
    g.fillRect(11, 3.5, 5.5, 9);
    g.strokeRect(11, 3.5, 5.5, 9);
    g.fillStyle = '#3b4250';
    g.fillRect(20, -3, 12, 6);
    g.strokeRect(20, -3, 12, 6);
    g.fillStyle = '#181a20';
    g.fillRect(32, -1.8, 8, 3.6);
    g.fillStyle = accent;
    g.fillRect(7, -5.5, 11, 2.5);
    g.fillRect(21, -2, 9, 2);
  } else if (w === 5) {
    g.fillStyle = '#5c4028';
    g.fillRect(-10, -3.5, 16, 7);
    g.strokeRect(-10, -3.5, 16, 7);
    g.fillStyle = '#252932';
    g.fillRect(5, -4, 17, 8);
    g.strokeRect(5, -4, 17, 8);
    g.fillStyle = '#3a414e';
    g.fillRect(22, -2, 22, 4);
    g.strokeRect(22, -2, 22, 4);
    g.fillStyle = '#181a20';
    g.fillRect(42, -3, 5, 6);
    g.fillStyle = '#15181e';
    g.fillRect(7, -8.5, 18, 4.5);
    g.strokeRect(7, -8.5, 18, 4.5);
    g.fillStyle = accent;
    g.fillRect(8, -7.5, 16, 2);
    g.fillStyle = '#7dd3fc';
    g.fillRect(24, -8, 2, 3.5);
  } else if (w === 9) {
    g.fillStyle = '#1e293b';
    g.fillRect(-9, -4, 15, 8);
    g.strokeRect(-9, -4, 15, 8);
    g.fillStyle = '#334155';
    g.fillRect(6, -5, 18, 10);
    g.strokeRect(6, -5, 18, 10);
    g.fillStyle = '#475569';
    g.fillRect(24, -4.5, 22, 3);
    g.fillRect(24, 1.5, 22, 3);
    g.fillStyle = accent;
    g.fillRect(10, -2, 34, 4);
    g.fillStyle = '#e0f2fe';
    for (let x = 26; x < 43; x += 6) {
      g.fillRect(x, -5.5, 2.5, 11);
    }
    g.fillStyle = '#0f172a';
    g.fillRect(9, -9, 14, 4);
    g.fillStyle = '#38bdf8';
    g.fillRect(11, -8, 10, 2);
  } else if (w === 6) {
    g.fillStyle = '#3f5a3a';
    g.beginPath();
    g.arc(12, 0, 7.5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#94a3b8';
    g.fillRect(9.5, -10.5, 5, 4);
    g.strokeStyle = '#fbbf24';
    g.beginPath();
    g.arc(16, -9, 2.5, 0, Math.PI * 2);
    g.stroke();
  } else if (w === 7) {
    g.fillStyle = '#f8fafc';
    g.fillRect(3, -9, 20, 18);
    g.strokeRect(3, -9, 20, 18);
    g.fillStyle = '#e11d48';
    g.fillRect(11, -6, 4, 12);
    g.fillRect(7, -2, 12, 4);
  } else if (w === 8) {
    g.fillStyle = '#0284c7';
    g.beginPath();
    g.arc(13, 1, 9, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#38bdf8';
    g.beginPath();
    g.arc(13, 1, 6.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#92400e';
    g.fillRect(10, -10, 6, 4);
    g.fillStyle = '#e0f2fe';
    g.beginPath();
    g.arc(10.5, -1.5, 2, 0, Math.PI * 2);
    g.fill();
  } else if (w === 10) {
    // Impulse Grenade (cyan shockwave orb)
    g.fillStyle = '#0369a1';
    g.beginPath();
    g.arc(12, 0, 8, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#38bdf8';
    g.beginPath();
    g.arc(12, 0, 4.8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e0f2fe';
    g.fillRect(9.5, -10.5, 5, 3.5);
  } else if (w === 11) {
    // Reverse Impulse Grenade (violet gravity pull orb)
    g.fillStyle = '#581c87';
    g.beginPath();
    g.arc(12, 0, 8, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#c084fc';
    g.beginPath();
    g.arc(12, 0, 4.8, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#f3e8ff';
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(12, 0, 6.3, 0, Math.PI * 1.4);
    g.stroke();
    g.fillStyle = '#d8b4fe';
    g.fillRect(9.5, -10.5, 5, 3.5);
  } else if (w === 12) {
    // Mini Shield (compact icy-cyan shield flask)
    g.fillStyle = '#0ea5e9';
    g.beginPath();
    g.roundRect(6, -6, 13, 12, 3.5);
    g.fill();
    g.stroke();
    g.fillStyle = '#7dd3fc';
    g.beginPath();
    g.roundRect(8, -4, 9, 8, 2);
    g.fill();
    g.fillStyle = '#92400e';
    g.fillRect(10.5, -9.5, 4.5, 3.5);
    g.fillStyle = '#e0f2fe';
    g.fillRect(9.5, -2.5, 2, 5);
  }
}

function drawEquippedBackBling(g: CanvasRenderingContext2D, p: Player) {
  if (!p.backblingId || p.backblingId === 'bb_none') return;
  g.save();
  g.translate(p.x, p.y);
  g.rotate(p.a);
  g.strokeStyle = '#14161b';
  g.lineWidth = 2;

  if (p.backblingId === 'bb_jetpack') {
    g.fillStyle = '#475569';
    g.fillRect(-19, -9, 8, 18);
    g.strokeRect(-19, -9, 8, 18);
    g.fillStyle = '#fbbf24';
    g.fillRect(-18, -3, 4, 6);
  } else if (p.backblingId === 'bb_satchel') {
    g.fillStyle = '#7c4a26';
    g.fillRect(-18, -8, 7, 16);
    g.strokeRect(-18, -8, 7, 16);
    g.fillStyle = '#d6b384';
    g.fillRect(-17, -6, 2, 12);
  } else if (p.backblingId === 'bb_shield') {
    g.fillStyle = '#1e3a8a';
    g.beginPath();
    g.arc(-15, 0, 9, Math.PI * 0.5, Math.PI * 1.5);
    g.closePath();
    g.fill();
    g.stroke();
    g.strokeStyle = '#38bdf8';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(-15, 0, 6.5, Math.PI * 0.55, Math.PI * 1.45);
    g.stroke();
  }
  g.restore();
}

const PICKAXE_STYLES: Record<
  string,
  { head: string; edge: string; shaft: string; collar: string }
> = {
  pick_timber: { head: '#94a3b8', edge: '#e2e8f0', shaft: '#8b5a2b', collar: '#475569' },
  pick_tactical: { head: '#cbd5e1', edge: '#f8fafc', shaft: '#334155', collar: '#64748b' },
  pick_plasma: { head: '#38bdf8', edge: '#bae6fd', shaft: '#1e293b', collar: '#0284c7' },
  pick_emerald: { head: '#10b981', edge: '#a7f3d0', shaft: '#1e293b', collar: '#047857' },
  pick_crimson: { head: '#e8365d', edge: '#fda4af', shaft: '#1f2937', collar: '#9f1239' },
  pick_golden: { head: '#fbbf24', edge: '#fef08a', shaft: '#5c3d1e', collar: '#d97706' },
};

function drawPickaxeSpriteModel(g: CanvasRenderingContext2D, pickaxeId: string) {
  const st = PICKAXE_STYLES[pickaxeId] || PICKAXE_STYLES.pick_tactical;
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.lineWidth = 2.2;
  g.strokeStyle = '#14161b';

  // Handle shaft
  g.fillStyle = st.shaft;
  g.beginPath();
  g.roundRect(-7, -2.1, 26, 4.2, 1.6);
  g.fill();
  g.stroke();

  // Pommel grip cap at handle bottom
  g.fillStyle = st.collar;
  g.beginPath();
  g.roundRect(-9.2, -2.8, 3.6, 5.6, 1.2);
  g.fill();
  g.stroke();

  // Classic curved regular pickaxe head perpendicular to the handle
  g.fillStyle = st.head;
  g.beginPath();
  g.moveTo(14.8, -14);
  g.quadraticCurveTo(22.2, -5.8, 21.8, 0);
  g.quadraticCurveTo(22.2, 5.8, 14.8, 14);
  g.quadraticCurveTo(17.4, 6.2, 16.4, 0);
  g.quadraticCurveTo(17.4, -6.2, 14.8, -14);
  g.closePath();
  g.fill();
  g.stroke();

  // Metallic highlight ridge cleanly inside outer pickaxe curve
  g.strokeStyle = st.edge;
  g.lineWidth = 1.25;
  g.beginPath();
  g.moveTo(16.6, -9.8);
  g.quadraticCurveTo(19.9, 0, 16.6, 9.8);
  g.stroke();

  // Socket collar where shaft meets pickaxe head
  g.strokeStyle = '#14161b';
  g.lineWidth = 2.0;
  g.fillStyle = st.collar;
  g.beginPath();
  g.roundRect(14.4, -3.3, 5.4, 6.6, 1.4);
  g.fill();
  g.stroke();
  g.restore();
}

function drawPlayerArms(g: CanvasRenderingContext2D, p: Player) {
  const w = WP[p.w];
  const r = p.invRarity[p.sl] || 0;
  g.save();
  g.translate(p.x, p.y);
  g.rotate(p.a);
  g.lineWidth = 2.4;
  g.strokeStyle = '#14161b';

  const hand = (x: number, y: number) => {
    g.fillStyle = p.fl;
    g.beginPath();
    g.arc(x, y, 5.8, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  };

  if (w.melee) {
    const k = p.pc > 0 ? Math.sin((p.pc / 0.2) * Math.PI) : 0;
    const dir = p.hd ? 1 : -1;
    // Draw equipped Pickaxe if not bare fists (held sideways at the player's side, swinging in an arc)
    if (p.pickaxeId && p.pickaxeId !== 'pick_fists') {
      g.save();
      const swingShiftX = k * 7;
      const swingShiftY = -k * 6;
      const restAngle = Math.PI * 0.44;
      const swingAngle = restAngle - k * (0.95 + dir * 0.2);
      g.translate(10 + swingShiftX, 11 + swingShiftY);
      g.rotate(swingAngle);
      drawPickaxeSpriteModel(g, p.pickaxeId);
      g.restore();

      hand(9 + k * 7, 11 - k * 5);
      hand(11 + k * 8, 2 - k * 5);
    } else {
      hand(14 + (dir > 0 ? k * 22 : 0), 11);
      hand(14 + (dir < 0 ? k * 22 : 0), -11);
    }
  } else {
    const kick = p.recoil * 4;
    g.translate(-kick, 0);
    drawWeaponSprite(g, p.w, r);
    hand(6, 4.5);
    hand(p.w === 1 ? 14 : p.w === 2 ? 20 : 28, -2);
  }
  g.restore();
}

function drawEquippedOutfit(g: CanvasRenderingContext2D, p: Player) {
  if (!p.skinId || p.skinId === 'skin_classic') return;
  g.save();
  g.translate(p.x, p.y);
  g.rotate(p.a);
  g.strokeStyle = '#14161b';
  g.lineWidth = 2;

  if (p.skinId === 'skin_ranger') {
    g.fillStyle = '#556b2f';
    g.beginPath();
    g.roundRect(-13, -15, 16, 30, 6);
    g.fill();
    g.stroke();
  } else if (p.skinId === 'skin_beanie') {
    g.fillStyle = '#b91c1c';
    g.beginPath();
    g.roundRect(-14, -16, 17, 32, 7);
    g.fill();
    g.stroke();
  } else if (p.skinId === 'skin_sheriff') {
    g.fillStyle = '#925a2b';
    g.beginPath();
    g.roundRect(-13, -15, 16, 30, 6);
    g.fill();
    g.stroke();
    g.fillStyle = '#dc2626';
    g.beginPath();
    g.arc(4, 0, 5, 0, Math.PI * 2);
    g.fill();
  } else if (p.skinId === 'skin_knight') {
    g.fillStyle = '#1d4ed8';
    g.beginPath();
    g.ellipse(-3, -15, 9, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.ellipse(-3, 15, 9, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  } else if (p.skinId === 'skin_medic') {
    g.fillStyle = '#f8fafc';
    g.beginPath();
    g.roundRect(-13, -15, 16, 30, 6);
    g.fill();
    g.stroke();
    g.fillStyle = '#e11d48';
    g.fillRect(-7, -2, 6, 4);
    g.fillRect(-5, -4, 2, 8);
  } else if (p.skinId === 'skin_cyber') {
    g.fillStyle = '#0f172a';
    g.beginPath();
    g.roundRect(-14, -16, 17, 32, 6);
    g.fill();
    g.stroke();
    g.strokeStyle = '#06b6d4';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-2, -13);
    g.lineTo(-2, 13);
    g.stroke();
  }
  g.restore();
}

function drawEquippedHat(g: CanvasRenderingContext2D, p: Player) {
  if (!p.skinId || p.skinId === 'skin_classic') return;
  g.save();
  g.translate(p.x, p.y);
  g.rotate(p.a);
  g.strokeStyle = '#14161b';
  g.lineWidth = 2;

  if (p.skinId === 'skin_ranger') {
    // Olive tactical cap + forward brim
    g.fillStyle = '#4d5d2b';
    g.beginPath();
    g.arc(0, 0, 12.5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#657a3a';
    g.beginPath();
    g.ellipse(11, 0, 6.5, 9.5, 0, -Math.PI / 2, Math.PI / 2);
    g.fill();
    g.stroke();
  } else if (p.skinId === 'skin_medic') {
    // White medic cap + red cross emblem
    g.fillStyle = '#f1f5f9';
    g.beginPath();
    g.arc(0, 0, 12.5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#cbd5e1';
    g.beginPath();
    g.ellipse(11, 0, 6, 9, 0, -Math.PI / 2, Math.PI / 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#e11d48';
    g.fillRect(-3.5, -1.5, 7, 3);
    g.fillRect(-1.5, -3.5, 3, 7);
  } else if (p.skinId === 'skin_beanie') {
    // Crimson & white striped knit beanie + pom-pom
    g.fillStyle = '#dc2626';
    g.beginPath();
    g.arc(-1, 0, 13, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#f8fafc';
    g.fillRect(-5, -10, 4, 20);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(-8, 0, 4.5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  } else if (p.skinId === 'skin_sheriff') {
    // Wide-brim cowboy hat + gold band
    g.fillStyle = '#6d4020';
    g.beginPath();
    g.ellipse(0, 0, 18, 16, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#8b5a2b';
    g.beginPath();
    g.ellipse(0, 0, 10.5, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fbbf24';
    g.lineWidth = 2;
    g.stroke();
  } else if (p.skinId === 'skin_knight') {
    // Steel knight helmet + blue crest plume
    g.fillStyle = '#94a3b8';
    g.beginPath();
    g.arc(0, 0, 14, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#1e293b';
    g.fillRect(6, -7, 4, 14);
    g.fillStyle = '#2563eb';
    g.beginPath();
    g.roundRect(-13, -3.5, 16, 7, 3);
    g.fill();
    g.stroke();
  } else if (p.skinId === 'skin_cyber') {
    // Sleek dark tech helmet + glowing cyan visor
    g.fillStyle = '#1e293b';
    g.beginPath();
    g.arc(0, 0, 14, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#22d3ee';
    g.beginPath();
    g.roundRect(6, -9, 6, 18, 3);
    g.fill();
    g.stroke();
  }
  g.restore();
}

function drawGliderOverPlayer(g: CanvasRenderingContext2D, p: Player, alt: number) {
  g.save();
  g.rotate(p.a);

  g.strokeStyle = '#1e293b';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(8, -8);
  g.lineTo(6, -24);
  g.moveTo(8, 8);
  g.lineTo(6, 24);
  g.stroke();

  g.strokeStyle = '#cbd5e1';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(8, -11);
  g.lineTo(8, 11);
  g.stroke();

  const open = Math.min(1, (1 - alt) * 4 + 0.35);
  const span = 44 * open;
  const chord = 26;

  g.fillStyle = p.col;
  g.strokeStyle = '#14161b';
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(chord * 0.75, 0);
  g.lineTo(-chord * 0.65, -span);
  g.lineTo(-chord * 0.28, -span * 0.35);
  g.lineTo(-chord * 0.48, 0);
  g.lineTo(-chord * 0.28, span * 0.35);
  g.lineTo(-chord * 0.65, span);
  g.closePath();
  g.fill();
  g.stroke();

  g.strokeStyle = 'rgba(255,255,255,0.45)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(chord * 0.7, 0);
  g.lineTo(-chord * 0.45, 0);
  g.moveTo(chord * 0.15, -span * 0.42);
  g.lineTo(chord * 0.15, span * 0.42);
  g.stroke();

  g.restore();
}

export function drawGliderPreview(
  g: CanvasRenderingContext2D,
  color: string,
  w: number,
  h: number
) {
  const s = Math.min(w / 108, h / 64);
  g.save();
  g.translate(w / 2, h / 2 + 5 * s);
  g.scale(s, s);
  drawGliderOverPlayer(g, { a: -Math.PI / 2, col: color } as Player, 0.25);
  g.restore();
}

export function drawCosmeticSpritePreview(
  g: CanvasRenderingContext2D,
  item: CosmeticItem,
  w: number,
  h: number
) {
  g.clearRect(0, 0, w, h);

  if (item.category === 'glider') {
    drawGliderPreview(g, item.color, w, h);
    return;
  }

  if (item.category === 'pickaxe') {
    g.save();
    if (item.id === 'pick_fists') {
      const s = Math.min(w / 62, h / 34);
      g.translate(w / 2, h / 2);
      g.scale(s, s);
      g.lineWidth = 2.4;
      g.strokeStyle = '#14161b';
      g.fillStyle = '#e0ac82';
      g.beginPath();
      g.arc(-8, 2, 5.8, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.beginPath();
      g.arc(8, -2, 5.8, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    } else {
      const s = Math.min(w / 74, h / 44);
      g.translate(w / 2 - 4.5 * s, h / 2 + 4.5 * s);
      g.rotate(-0.62);
      g.scale(s, s);
      drawPickaxeSpriteModel(g, item.id);
    }
    g.restore();
    return;
  }

  if (item.category === 'skin') {
    const previewPlayer = {
      x: 0,
      y: 0,
      a: -0.32,
      w: 0,
      sl: 0,
      invRarity: [0],
      pc: 0,
      hd: 0,
      fl: '#e0ac82',
      skinId: item.id,
      pickaxeId: 'pick_fists',
      backblingId: 'bb_none',
    } as unknown as Player;

    const s = Math.min(w / 72, h / 44);
    g.save();
    g.translate(w / 2 - 2 * s, h / 2 + s);
    g.scale(s, s);

    // Shadow
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath();
    g.arc(2, 4, PLAYER_RADIUS, 0, Math.PI * 2);
    g.fill();

    drawEquippedOutfit(g, previewPlayer);

    g.fillStyle = previewPlayer.fl;
    g.beginPath();
    g.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#14161b';
    g.stroke();

    drawPlayerArms(g, previewPlayer);
    drawEquippedHat(g, previewPlayer);
    g.restore();
    return;
  }

  if (item.category === 'backbling') {
    const s = Math.min(w / 68, h / 40);
    g.save();
    g.translate(w / 2 + 4 * s, h / 2 + s);
    g.scale(s, s);

    if (item.id === 'bb_none') {
      g.strokeStyle = 'rgba(148,163,184,0.45)';
      g.lineWidth = 2;
      g.setLineDash([4, 3]);
      g.beginPath();
      g.arc(-4, 0, PLAYER_RADIUS, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      g.strokeStyle = '#e8365d';
      g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(-14, 10);
      g.lineTo(6, -10);
      g.stroke();
    } else {
      const previewPlayer = {
        x: 0,
        y: 0,
        a: -0.25,
        backblingId: item.id,
      } as unknown as Player;

      // Subtle silhouette of survivor so the player sees how the back bling attaches
      g.save();
      g.globalAlpha = 0.25;
      g.fillStyle = '#94a3b8';
      g.beginPath();
      g.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
      g.fill();
      g.restore();

      drawEquippedBackBling(g, previewPlayer);
    }
    g.restore();
  }
}

export function drawFullLoadoutSpritePreview(
  g: CanvasRenderingContext2D,
  opts: {
    gliderColor?: string;
    skinColor?: string;
    skinId: string;
    backblingId: string;
    pickaxeId: string;
  },
  w: number,
  h: number
) {
  g.clearRect(0, 0, w, h);

  const p = {
    x: 0,
    y: 0,
    a: -0.35,
    w: 0,
    sl: 0,
    invRarity: [0],
    pc: 0,
    hd: 0,
    fl: opts.skinColor || '#e0ac82',
    skinId: opts.skinId,
    pickaxeId: opts.pickaxeId,
    backblingId: opts.backblingId,
  } as unknown as Player;

  const scale = Math.min(w, h) / 76;

  g.save();
  g.translate(w / 2 - 7 * scale, h / 2 - 5 * scale);
  g.scale(scale, scale);

  g.fillStyle = 'rgba(0,0,0,0.32)';
  g.beginPath();
  g.arc(2, 4, PLAYER_RADIUS, 0, Math.PI * 2);
  g.fill();

  drawEquippedBackBling(g, p);
  drawEquippedOutfit(g, p);

  g.fillStyle = p.fl;
  g.beginPath();
  g.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = '#14161b';
  g.stroke();

  drawPlayerArms(g, p);
  drawEquippedHat(g, p);
  g.restore();
}

export function renderGame(
  g: CanvasRenderingContext2D,
  engine: GameEngine,
  W: number,
  H: number,
  settings: GameSettings
) {
  const scene = engine.getRenderScene();
  const zoom = scene.zoom || 1;
  const shakeAmt = scene.shake * 14 * (settings.shake ? 1 : 0);
  const sx = (Math.random() * 2 - 1) * shakeAmt;
  const sy = (Math.random() * 2 - 1) * shakeAmt;

  const viewHalfW = W / 2 / zoom;
  const viewHalfH = H / 2 / zoom;
  const cx = scene.camX - viewHalfW;
  const cy = scene.camY - viewHalfH;
  const vw = viewHalfW * 2;
  const vh = viewHalfH * 2;

  g.fillStyle = '#257ab5';
  g.fillRect(0, 0, W, H);

  g.save();
  g.translate(W / 2 + sx, H / 2 + sy);
  g.scale(zoom, zoom);
  g.translate(-scene.camX, -scene.camY);

  // Main island deep-water drop shadow
  g.fillStyle = 'rgba(8,28,56,0.22)';
  g.fillRect(
    ISLAND_MARGIN - 43,
    ISLAND_MARGIN - 41,
    MAP_SIZE - (ISLAND_MARGIN - 55) * 2,
    MAP_SIZE - (ISLAND_MARGIN - 55) * 2
  );

  // Sandy Beach Shoreline
  g.fillStyle = '#e0cf93';
  g.fillRect(
    ISLAND_MARGIN - 55,
    ISLAND_MARGIN - 55,
    MAP_SIZE - (ISLAND_MARGIN - 55) * 2,
    MAP_SIZE - (ISLAND_MARGIN - 55) * 2
  );
  g.strokeStyle = 'rgba(255,255,255,0.45)';
  g.lineWidth = 6;
  g.strokeRect(
    ISLAND_MARGIN - 55,
    ISLAND_MARGIN - 55,
    MAP_SIZE - (ISLAND_MARGIN - 55) * 2,
    MAP_SIZE - (ISLAND_MARGIN - 55) * 2
  );

  // Grass Island
  g.fillStyle = '#5da142';
  g.fillRect(
    ISLAND_MARGIN,
    ISLAND_MARGIN,
    MAP_SIZE - ISLAND_MARGIN * 2,
    MAP_SIZE - ISLAND_MARGIN * 2
  );

  // Grid tiles
  const startX = Math.max(ISLAND_MARGIN, Math.floor(cx / 120) * 120);
  const endX = Math.min(MAP_SIZE - ISLAND_MARGIN, Math.ceil((cx + vw) / 120) * 120);
  const startY = Math.max(ISLAND_MARGIN, Math.floor(cy / 120) * 120);
  const endY = Math.min(MAP_SIZE - ISLAND_MARGIN, Math.ceil((cy + vh) / 120) * 120);

  g.strokeStyle = 'rgba(0,0,0,0.065)';
  g.lineWidth = 1.5;
  g.beginPath();
  for (let i = startX; i <= endX; i += 120) {
    g.moveTo(i, startY);
    g.lineTo(i, endY);
  }
  for (let j = startY; j <= endY; j += 120) {
    g.moveTo(startX, j);
    g.lineTo(endX, j);
  }
  g.stroke();

  // Paved Roads
  for (const r of scene.roads) {
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = '#535a66';
    g.lineWidth = r.w;
    g.beginPath();
    g.moveTo(r.x1, r.y1);
    g.lineTo(r.x2, r.y2);
    g.stroke();

    g.strokeStyle = '#e5c158';
    g.lineWidth = 3;
    g.setLineDash([22, 22]);
    g.beginPath();
    g.moveTo(r.x1, r.y1);
    g.lineTo(r.x2, r.y2);
    g.stroke();
    g.restore();
  }

  // Offshore Spawn Island Staging Ground
  const si = SPAWN_ISLAND;
  if (
    cx + vw > si.x - 140 &&
    cx < si.x + si.w + 200 &&
    cy + vh > si.y - 140 &&
    cy < si.y + si.h + 140
  ) {
    // Deep-water shoreline shadow
    g.fillStyle = 'rgba(8,28,56,0.24)';
    g.fillRect(si.x - 33, si.y - 31, si.w + 90, si.h + 90);

    // Sandy beach shoreline
    g.fillStyle = '#e0cf93';
    g.fillRect(si.x - 45, si.y - 45, si.w + 90, si.h + 90);
    g.strokeStyle = 'rgba(255,255,255,0.45)';
    g.lineWidth = 5;
    g.strokeRect(si.x - 45, si.y - 45, si.w + 90, si.h + 90);

    // Wooden dock shadow + planks extending east toward the main island
    g.save();
    g.fillStyle = 'rgba(8,28,56,0.3)';
    g.fillRect(si.x + si.w + 4, si.cy - 26, 98, 72);
    g.fillStyle = '#9b6b3e';
    g.strokeStyle = '#2d1c0d';
    g.lineWidth = 2.5;
    g.fillRect(si.x + si.w - 4, si.cy - 36, 98, 72);
    g.strokeRect(si.x + si.w - 4, si.cy - 36, 98, 72);
    g.strokeStyle = 'rgba(0,0,0,0.22)';
    g.lineWidth = 1.5;
    for (let px = si.x + si.w + 12; px < si.x + si.w + 90; px += 16) {
      g.beginPath();
      g.moveTo(px, si.cy - 36);
      g.lineTo(px, si.cy + 36);
      g.stroke();
    }
    g.restore();

    // Lush grass surface
    g.fillStyle = '#5da142';
    g.fillRect(si.x, si.y, si.w, si.h);

    // Subtle tile grid matching main island
    g.strokeStyle = 'rgba(0,0,0,0.065)';
    g.lineWidth = 1.5;
    g.beginPath();
    for (let i = si.x + 120; i < si.x + si.w; i += 120) {
      g.moveTo(i, si.y);
      g.lineTo(i, si.y + si.h);
    }
    for (let j = si.y + 120; j < si.y + si.h; j += 120) {
      g.moveTo(si.x, j);
      g.lineTo(si.x + si.w, j);
    }
    g.stroke();

    // Paved cross-walkways connecting Helipad to Weapon Rack (north) and Dock (east)
    g.save();
    g.fillStyle = '#535a66';
    g.fillRect(si.cx - 29, si.cy - 245, 58, 245);
    g.fillRect(si.cx, si.cy - 29, si.x + si.w - si.cx, 58);

    // Weapon Rack Staging Pad
    g.fillStyle = 'rgba(30, 41, 59, 0.36)';
    g.strokeStyle = 'rgba(229, 193, 88, 0.48)';
    g.lineWidth = 2;
    g.setLineDash([10, 8]);
    g.fillRect(si.cx - 215, si.cy - 320, 430, 120);
    g.strokeRect(si.cx - 215, si.cy - 320, 430, 120);
    g.setLineDash([]);
    g.restore();

    // Paved Drop Plane Boarding Apron / Helipad with subtle edge shadow
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillRect(si.cx - 99, si.cy - 98, 210, 210);
    g.fillStyle = '#475569';
    g.strokeStyle = '#1e293b';
    g.lineWidth = 3;
    g.fillRect(si.cx - 105, si.cy - 105, 210, 210);
    g.strokeRect(si.cx - 105, si.cy - 105, 210, 210);

    g.setLineDash([14, 12]);
    g.strokeStyle = '#e5c158';
    g.lineWidth = 2.5;
    g.strokeRect(si.cx - 93, si.cy - 93, 186, 186);
    g.setLineDash([]);

    g.strokeStyle = 'rgba(255,255,255,0.42)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(si.cx, si.cy, 58, 0, Math.PI * 2);
    g.stroke();

    g.fillStyle = 'rgba(255,255,255,0.42)';
    g.font = '800 54px "Barlow Condensed", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('H', si.cx, si.cy + 2);
    g.restore();

    // Ground stencils
    g.save();
    g.font = '800 22px "Barlow Condensed", sans-serif';
    g.textAlign = 'center';
    g.fillStyle = 'rgba(255,255,255,0.3)';
    g.fillText('SPAWN ISLAND', si.cx, si.cy + 148);
    g.fillText('WEAPON RACK', si.cx, si.cy - 336);
    g.restore();
  }

  // POI Ground Markers
  g.save();
  g.font = '800 24px "Barlow Condensed", sans-serif';
  g.textAlign = 'center';
  g.fillStyle = 'rgba(255,255,255,0.22)';
  for (const poi of POIS) {
    if (poi.x < cx - 260 || poi.x > cx + vw + 260 || poi.y < cy - 120 || poi.y > cy + vh + 120)
      continue;
    g.fillText(poi.name.toUpperCase(), poi.x, poi.y);
  }
  g.restore();

  // Building Ground Cast Shadows & Wooden Floors
  for (const f of scene.floors) {
    if (f.x > cx + vw + 24 || f.x + f.w < cx - 24 || f.y > cy + vh + 24 || f.y + f.h < cy - 24)
      continue;
    g.fillStyle = 'rgba(0,0,0,0.24)';
    g.fillRect(f.x + 12, f.y + 16, f.w, f.h);
    g.fillStyle = '#a88459';
    g.fillRect(f.x, f.y, f.w, f.h);
    g.strokeStyle = 'rgba(0,0,0,0.12)';
    g.lineWidth = 1;
    for (let px = f.x + 24; px < f.x + f.w; px += 24) {
      g.beginPath();
      g.moveTo(px, f.y);
      g.lineTo(px, f.y + f.h);
      g.stroke();
    }
  }

  // Building Walls
  for (const w of scene.walls) {
    if (w.x > cx + vw || w.x + w.w < cx || w.y > cy + vh || w.y + w.h < cy) continue;
    g.fillStyle = '#404552';
    g.fillRect(w.x, w.y, w.w, w.h);
    g.strokeStyle = '#181a20';
    g.lineWidth = 2.5;
    g.strokeRect(w.x, w.y, w.w, w.h);
  }

  // Visible Building Doors & Thresholds
  for (const d of scene.doors) {
    if (d.x > cx + vw + 40 || d.x + d.w < cx - 40 || d.y > cy + vh + 40 || d.y + d.h < cy - 40)
      continue;
    g.save();
    // Wooden doorway threshold mat slightly wider than the wall opening so entrances stand out
    g.fillStyle = '#9b6b3e';
    g.strokeStyle = '#2d1c0d';
    g.lineWidth = 2;
    if (d.horizontal) {
      const swing = d.openProgress ?? (d.open ? (d.openDir ?? -1) : 0);
      g.fillRect(d.x, d.y - 6, d.w, d.h + 12);
      g.strokeRect(d.x, d.y - 6, d.w, d.h + 12);
      // Jamb frames
      g.fillStyle = '#4b2e16';
      g.fillRect(d.x - 4, d.y - 3, 7, d.h + 6);
      g.fillRect(d.x + d.w - 3, d.y - 3, 7, d.h + 6);
      // Hinged wooden door leaf swings in the direction the player was facing
      const leafLen = d.w - 8;
      g.translate(d.x + 4, d.y + d.h / 2);
      g.rotate(1.45 * swing);
      g.fillStyle = '#c98e4b';
      g.fillRect(0, -5, leafLen, 10);
      g.strokeRect(0, -5, leafLen, 10);
      g.fillStyle = '#fbbf24';
      g.beginPath();
      g.arc(leafLen - 9, 0, 2.5, 0, Math.PI * 2);
      g.fill();
    } else {
      const swing = d.openProgress ?? (d.open ? (d.openDir ?? 1) : 0);
      g.fillRect(d.x - 6, d.y, d.w + 12, d.h);
      g.strokeRect(d.x - 6, d.y, d.w + 12, d.h);
      // Jamb frames
      g.fillStyle = '#4b2e16';
      g.fillRect(d.x - 3, d.y - 4, d.w + 6, 7);
      g.fillRect(d.x - 3, d.y + d.h - 3, d.w + 6, 7);
      // Hinged wooden door leaf swings in the direction the player was facing
      const leafLen = d.h - 8;
      g.translate(d.x + d.w / 2, d.y + 4);
      g.rotate(Math.PI / 2 - 1.45 * swing);
      g.fillStyle = '#c98e4b';
      g.fillRect(0, -5, leafLen, 10);
      g.strokeRect(0, -5, leafLen, 10);
      g.fillStyle = '#fbbf24';
      g.beginPath();
      g.arc(leafLen - 9, 0, 2.5, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  // Supply Chests
  for (const c of scene.chests) {
    if (c.x < cx - 50 || c.x > cx + vw + 50 || c.y < cy - 50 || c.y > cy + vh + 50) continue;
    g.save();
    g.translate(c.x, c.y);
    g.fillStyle = 'rgba(0,0,0,0.26)';
    g.fillRect(-11, -6, 28, 20);
    if (c.opened) {
      g.fillStyle = '#5c4632';
      g.fillRect(-14, -10, 28, 20);
      g.strokeStyle = '#1a1c22';
      g.lineWidth = 2;
      g.strokeRect(-14, -10, 28, 20);
    } else {
      if (c.golden) {
        g.fillStyle = 'rgba(251,191,36,0.28)';
        g.beginPath();
        g.arc(0, 0, 24 + Math.sin(scene.elapsed * 5) * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = c.golden ? '#f59e0b' : '#9c6b3f';
      g.fillRect(-15, -11, 30, 22);
      g.strokeStyle = '#181a20';
      g.lineWidth = 2.5;
      g.strokeRect(-15, -11, 30, 22);
      g.fillStyle = c.golden ? '#fef08a' : '#d6b384';
      g.fillRect(-4, -3, 8, 6);
    }
    g.restore();
  }

  // Ground Loot
  for (const l of scene.loot) {
    if (l.x < cx - 60 || l.x > cx + vw + 60 || l.y < cy - 60 || l.y > cy + vh + 60) continue;

    if (l.t === 'a') {
      const aInfo = AMMO_INFO[l.ammoType || 'medium'];
      g.save();
      g.translate(l.x, l.y);
      g.fillStyle = 'rgba(0,0,0,0.26)';
      g.beginPath();
      g.roundRect(-7.5, -4, 20, 16, 3.5);
      g.fill();
      g.fillStyle = 'rgba(15, 23, 42, 0.85)';
      g.strokeStyle = aInfo.color;
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(-10, -8, 20, 16, 3.5);
      g.fill();
      g.stroke();
      g.fillStyle = aInfo.color;
      g.fillRect(-6, -4, 3, 8);
      g.fillRect(-1.5, -4, 3, 8);
      g.fillRect(3, -4, 3, 8);
      g.restore();
    } else if (l.t === 'w') {
      const rInfo = isStackable(l.w)
        ? { color: WP[l.w].color, bg: 'rgba(255,255,255,0.16)' }
        : RARITY_TIERS[l.r];
      g.save();
      g.translate(l.x, l.y);

      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.beginPath();
      g.arc(2.5, 4, 20, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = rInfo.bg;
      g.beginPath();
      g.arc(0, 0, 21, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = rInfo.color;
      g.lineWidth = 2;
      g.stroke();

      g.rotate(-0.45);
      g.translate(-16, 0);
      drawWeaponSprite(g, l.w, l.r);
      g.restore();
    } else {
      g.fillStyle = 'rgba(0,0,0,0.24)';
      g.beginPath();
      g.arc(l.x + 2.5, l.y + 3.5, 8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = l.t === 'h' ? '#ff5c6c' : '#38bdf8';
      g.beginPath();
      g.arc(l.x, l.y, 8, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#fff';
      g.lineWidth = 2;
      g.stroke();
    }

    if (l.air) {
      g.strokeStyle = '#ffd24d';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(l.x, l.y, 24 + 6 * Math.sin(scene.elapsed * 5), 0, Math.PI * 2);
      g.stroke();
    }
  }

  // Rocks, Crates, Barrels
  for (const o of scene.obstacles) {
    if (o.kind === 'tree') continue;
    if (o.x < cx - 60 || o.x > cx + vw + 60 || o.y < cy - 60 || o.y > cy + vh + 60) continue;

    if (o.kind === 'crate') {
      const s = o.r * 1.75;
      g.fillStyle = 'rgba(0,0,0,0.26)';
      g.fillRect(o.x - s / 2 + 5, o.y - s / 2 + 6, s, s);
    } else {
      g.fillStyle = 'rgba(0,0,0,0.26)';
      g.beginPath();
      g.arc(o.x + 5, o.y + 6, o.r, 0, Math.PI * 2);
      g.fill();
    }

    if (o.kind === 'rock') {
      g.fillStyle = o.hitFlash > 0 ? '#ffffff' : '#7b828e';
      g.beginPath();
      g.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#22262e';
      g.lineWidth = 2.5;
      g.stroke();
      if (o.hitFlash <= 0) {
        g.fillStyle = '#9aa1ad';
        g.beginPath();
        g.arc(o.x - o.r * 0.22, o.y - o.r * 0.22, o.r * 0.5, 0, Math.PI * 2);
        g.fill();
      }
    } else if (o.kind === 'crate') {
      const s = o.r * 1.75;
      g.fillStyle = o.hitFlash > 0 ? '#ffffff' : '#b37a4c';
      g.fillRect(o.x - s / 2, o.y - s / 2, s, s);
      g.strokeStyle = '#2b1d12';
      g.lineWidth = 2.5;
      g.strokeRect(o.x - s / 2, o.y - s / 2, s, s);
      g.beginPath();
      g.moveTo(o.x - s / 2, o.y - s / 2);
      g.lineTo(o.x + s / 2, o.y + s / 2);
      g.stroke();
    } else if (o.kind === 'barrel') {
      g.fillStyle = o.hitFlash > 0 ? '#ffffff' : '#dc2626';
      g.beginPath();
      g.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#181a20';
      g.lineWidth = 2.5;
      g.stroke();
      g.fillStyle = '#fbbf24';
      g.beginPath();
      g.arc(o.x, o.y, 4, 0, Math.PI * 2);
      g.fill();
    }

    if (o.hp < o.mh) {
      const bw = Math.max(24, o.r * 1.2);
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillRect(o.x - bw / 2, o.y + o.r + 6, bw, 4);
      g.fillStyle = '#facc15';
      g.fillRect(o.x - bw / 2, o.y + o.r + 6, bw * (o.hp / o.mh), 4);
    }
  }

  // Grenades (Frag, Impulse, Reverse Impulse) with 2.5D height arc & ground shadow
  for (const q of scene.grenades) {
    const fuseFrac = 1 - Math.max(0, q.l / q.ml);
    const z = Math.max(0, q.z || 0);
    const scale = 1 + Math.min(0.45, z * 0.005);
    const gy = q.y - z;

    // Ground shadow beneath airborne throwable
    g.fillStyle = `rgba(0, 0, 0, ${Math.max(0.14, 0.36 - z * 0.003)})`;
    g.beginPath();
    g.ellipse(q.x, q.y + 3, 6.5 * (1 - Math.min(0.4, z * 0.004)), 4.2 * (1 - Math.min(0.4, z * 0.004)), 0, 0, Math.PI * 2);
    g.fill();

    if (q.kind === 'impulse') {
      g.strokeStyle = `rgba(56, 189, 248, ${0.32 + fuseFrac * 0.55})`;
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(q.x, q.y, 18 + fuseFrac * 185, 0, Math.PI * 2);
      g.stroke();

      g.fillStyle = '#0369a1';
      g.strokeStyle = '#0f172a';
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(q.x, gy, 7 * scale, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#38bdf8';
      g.beginPath();
      g.arc(q.x, gy, 3.5 * scale, 0, Math.PI * 2);
      g.fill();
    } else if (q.kind === 'reverse') {
      g.strokeStyle = `rgba(192, 132, 252, ${0.32 + fuseFrac * 0.55})`;
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(q.x, q.y, 215 * (1 - fuseFrac * 0.72), 0, Math.PI * 2);
      g.stroke();

      g.fillStyle = '#581c87';
      g.strokeStyle = '#0f172a';
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(q.x, gy, 7 * scale, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#c084fc';
      g.beginPath();
      g.arc(q.x, gy, 3.5 * scale, 0, Math.PI * 2);
      g.fill();
    } else {
      g.strokeStyle = `rgba(255, 179, 64, ${0.25 + fuseFrac * 0.45})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(q.x, q.y, 16 + fuseFrac * 92, 0, Math.PI * 2);
      g.stroke();

      g.fillStyle = '#222';
      g.strokeStyle = '#0f172a';
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(q.x, gy, 6.5 * scale, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = fuseFrac > 0.7 ? '#ff5c6c' : '#7bd66f';
      g.beginPath();
      g.arc(q.x, gy, 2.5 * scale, 0, Math.PI * 2);
      g.fill();
    }
  }

  // Shockwaves
  for (const s of scene.shockwaves) {
    g.globalAlpha = Math.max(0, s.l / s.ml) * 0.75;
    g.strokeStyle = s.c;
    g.lineWidth = 4;
    g.beginPath();
    g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 1;

  // Bullets
  for (const b of scene.bullets) {
    g.strokeStyle = b.c;
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(b.x, b.y);
    g.lineTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025);
    g.stroke();
  }

  // Grounded Players (solid 1-color flesh + optional Back Bling + Pickaxe/Weapon)
  for (const p of scene.players) {
    if (!p.alive || p.inPlane || p.dropTime > 0) continue;
    if (p.x < cx - 80 || p.x > cx + vw + 80 || p.y < cy - 80 || p.y > cy + vh + 80) continue;

    g.fillStyle = 'rgba(0,0,0,0.32)';
    g.beginPath();
    g.arc(p.x + 4, p.y + 6, PLAYER_RADIUS, 0, Math.PI * 2);
    g.fill();

    drawEquippedBackBling(g, p);
    drawEquippedOutfit(g, p);

    g.fillStyle = p.hitFlash > 0 ? '#ffffff' : p.fl;
    g.beginPath();
    g.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
    g.fill();

    g.lineWidth = 3;
    g.strokeStyle = p === scene.me ? '#ffffff' : '#14161b';
    g.stroke();

    drawPlayerArms(g, p);
    drawEquippedHat(g, p);

    if (p.rl > 0 && p.rt > 0) {
      g.strokeStyle = '#ffd24d';
      g.lineWidth = 3.5;
      g.beginPath();
      g.arc(
        p.x,
        p.y,
        23,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * (1 - p.rl / p.rt)
      );
      g.stroke();
    } else if ((p.hl ?? 0) > 0 && (p.ht ?? 0) > 0) {
      const healColor =
        p.hw === 7 ? '#ff5c6c' : p.hw === 12 ? '#7dd3fc' : '#38bdf8';
      g.strokeStyle = healColor;
      g.lineWidth = 3.8;
      g.beginPath();
      g.arc(
        p.x,
        p.y,
        24,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * (1 - (p.hl || 0) / (p.ht || 1))
      );
      g.stroke();
    }

    if (p !== scene.me) {
      g.fillStyle = 'rgba(0,0,0,0.65)';
      g.fillRect(p.x - 19, p.y - 31, 38, 5);
      g.fillStyle = '#4ade80';
      g.fillRect(p.x - 19, p.y - 31, 38 * Math.max(0, p.hp / 100), 5);
    }

    g.fillStyle = '#ffffff';
    g.font = '700 12px "Plus Jakarta Sans", system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText(p.name, p.x, p.y - 37);

    if (p.emote) {
      g.save();
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#14161b';
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(p.x - 20, p.y - 68, 40, 24, 8);
      g.fill();
      g.stroke();
      g.fillStyle = '#14161b';
      g.font = '800 13px "Plus Jakarta Sans", sans-serif';
      g.fillText(p.emote, p.x, p.y - 51);
      g.restore();
    }
  }

  // Building Roofs (disappear smoothly when walking inside, reappear when leaving!)
  for (const f of scene.floors) {
    if (f.roofAlpha <= 0.02) continue;
    if (f.x > cx + vw + 20 || f.x + f.w < cx - 20 || f.y > cy + vh + 20 || f.y + f.h < cy - 20)
      continue;

    g.save();
    g.globalAlpha = f.roofAlpha;

    // Slight overhang pitched roof + cast overhang shadow
    const pad = 6;
    const rx = f.x - pad;
    const ry = f.y - pad;
    const rw = f.w + pad * 2;
    const rh = f.h + pad * 2;

    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(rx + 8, ry + 10, rw, rh);

    g.fillStyle = f.roofColor;
    g.fillRect(rx, ry, rw, rh);

    // Pitched ridge shadow & shingle lines
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillRect(rx, ry + rh / 2, rw, rh / 2);

    g.strokeStyle = 'rgba(255,255,255,0.22)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(rx + 12, ry + rh / 2);
    g.lineTo(rx + rw - 12, ry + rh / 2);
    g.stroke();

    g.strokeStyle = '#14161b';
    g.lineWidth = 3;
    g.strokeRect(rx, ry, rw, rh);
    g.restore();
  }

  // Exterior Doorway Entrance Step Markers (visible even while building roof is opaque!)
  for (const d of scene.doors) {
    if (d.x > cx + vw + 40 || d.x + d.w < cx - 40 || d.y > cy + vh + 40 || d.y + d.h < cy - 40)
      continue;
    g.save();
    g.fillStyle = d.open ? 'rgba(212, 163, 106, 0.35)' : '#d4a36a';
    g.strokeStyle = '#181a20';
    g.lineWidth = 2;
    if (d.horizontal) {
      g.fillRect(d.x + 8, d.y + d.h / 2 - 4, d.w - 16, 8);
      g.strokeRect(d.x + 8, d.y + d.h / 2 - 4, d.w - 16, 8);
    } else {
      g.fillRect(d.x + d.w / 2 - 4, d.y + 8, 8, d.h - 16);
      g.strokeRect(d.x + d.w / 2 - 4, d.y + 8, 8, d.h - 16);
    }
    g.restore();
  }

  // Lush Tree Canopies
  const camTarget = scene.me && scene.me.alive ? scene.me : null;
  for (const o of scene.obstacles) {
    if (o.kind !== 'tree') continue;
    if (o.x < cx - 70 || o.x > cx + vw + 70 || o.y < cy - 70 || o.y > cy + vh + 70) continue;

    const nearPlayer = camTarget && Math.hypot(camTarget.x - o.x, camTarget.y - o.y) < o.r + 24;
    g.save();
    g.globalAlpha = nearPlayer ? 0.55 : 0.96;

    g.fillStyle = 'rgba(0,0,0,0.26)';
    g.beginPath();
    g.arc(o.x + 11, o.y + 14, o.r, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = o.hitFlash > 0 ? '#ffffff' : '#2e6f38';
    g.beginPath();
    g.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#193d1f';
    g.lineWidth = 2.5;
    g.stroke();

    if (o.hitFlash <= 0) {
      g.fillStyle = '#3f8f4b';
      g.beginPath();
      g.arc(o.x - o.r * 0.16, o.y - o.r * 0.16, o.r * 0.65, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  // Parachuting Players with Glider
  for (const p of scene.players) {
    if (!p.alive || p.inPlane || p.dropTime <= 0) continue;
    const alt = p.dropTime / p.dropMax;
    const scale = 1 + alt * 0.85;

    g.fillStyle = 'rgba(0,0,0,0.24)';
    g.beginPath();
    g.ellipse(
      p.x + alt * 30,
      p.y + alt * 36,
      26 * scale * 0.6,
      16 * scale * 0.6,
      p.a,
      0,
      Math.PI * 2
    );
    g.fill();

    g.save();
    g.translate(p.x, p.y);
    g.scale(scale, scale);

    g.fillStyle = p.fl;
    g.beginPath();
    g.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = p === scene.me ? '#ffffff' : '#14161b';
    g.lineWidth = 2.6;
    g.stroke();

    g.save();
    g.rotate(p.a);
    g.fillStyle = p.fl;
    g.strokeStyle = '#14161b';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(10, -9, 5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.arc(10, 9, 5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.restore();

    drawGliderOverPlayer(g, p, alt);

    g.restore();
  }

  // Drop Plane
  if (scene.plane.active) {
    const pl = scene.plane;
    g.save();
    g.setLineDash([16, 14]);
    g.strokeStyle = 'rgba(255,255,255,0.45)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(pl.sx, pl.sy);
    g.lineTo(pl.ex, pl.ey);
    g.stroke();
    g.restore();

    g.save();
    g.translate(pl.x + 48, pl.y + 58);
    g.rotate(pl.a);
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(-48, -14, 96, 28);
    g.fillRect(-14, -76, 26, 152);
    g.restore();

    g.save();
    g.translate(pl.x, pl.y);
    g.rotate(pl.a);
    g.fillStyle = '#334155';
    g.strokeStyle = '#0f172a';
    g.lineWidth = 3;
    g.fillRect(-14, -78, 28, 156);
    g.strokeRect(-14, -78, 28, 156);
    g.fillRect(-48, -28, 14, 56);
    g.strokeRect(-48, -28, 14, 56);
    g.fillStyle = '#e2e8f0';
    g.beginPath();
    g.roundRect(-50, -14, 102, 28, 14);
    g.fill();
    g.stroke();
    g.fillStyle = '#38bdf8';
    g.beginPath();
    g.arc(34, 0, 8, -Math.PI / 2, Math.PI / 2);
    g.fill();
    g.restore();
  }

  // Particles & Floating Damage Numbers
  for (const q of scene.particles) {
    g.globalAlpha = Math.min(1, (q.l / q.ml) * 1.4);
    if (q.t) {
      g.fillStyle = '#ffffff';
      g.font = '800 15px "JetBrains Mono", monospace';
      g.textAlign = 'center';
      g.fillText(q.t, q.x, q.y);
    } else {
      g.fillStyle = q.c;
      g.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
  }
  g.globalAlpha = 1;

  if (!scene.spawnIslandActive) {
    // Next Safe Zone dashed ring
    if (scene.storm.set && scene.storm.i < STORM_RADII.length - 1) {
      g.save();
      g.setLineDash([12, 10]);
      g.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(
        scene.storm.tx,
        scene.storm.ty,
        STORM_RADII[scene.storm.i + 1],
        0,
        Math.PI * 2
      );
      g.stroke();
      g.restore();
    }

    // Safe Zone Directional Guide Line
    if (scene.me && scene.me.alive && !scene.me.inPlane) {
      const zx = scene.storm.set ? scene.storm.tx : scene.storm.x;
      const zy = scene.storm.set ? scene.storm.ty : scene.storm.y;
      const zr = scene.storm.set ? STORM_RADII[scene.storm.i + 1] : scene.storm.r;
      if (Math.hypot(scene.me.x - zx, scene.me.y - zy) > zr) {
        g.save();
        g.setLineDash([8, 8]);
        g.strokeStyle = 'rgba(255,255,255,0.55)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(scene.me.x, scene.me.y);
        g.lineTo(zx, zy);
        g.stroke();
        g.restore();
      }
    }

    // Storm Gas
    g.fillStyle = 'rgba(138, 43, 226, 0.38)';
    g.beginPath();
    g.rect(-3000, -3000, MAP_SIZE + 6000, MAP_SIZE + 6000);
    g.arc(scene.storm.x, scene.storm.y, scene.storm.r, 0, Math.PI * 2, true);
    g.fill('evenodd');

    g.strokeStyle = '#c084fc';
    g.lineWidth = 4.5;
    g.beginPath();
    g.arc(scene.storm.x, scene.storm.y, scene.storm.r, 0, Math.PI * 2);
    g.stroke();
  }

  g.restore();

  if (scene.ambient) {
    const grad = g.createRadialGradient(
      W / 2,
      H / 2,
      Math.min(W, H) * 0.22,
      W / 2,
      H / 2,
      Math.max(W, H) * 0.78
    );
    grad.addColorStop(0, 'rgba(16, 40, 88, 0.42)');
    grad.addColorStop(1, 'rgba(10, 22, 52, 0.88)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  } else if (scene.isDeathCam) {
    const grad = g.createRadialGradient(
      W / 2,
      H / 2,
      Math.min(W, H) * 0.3,
      W / 2,
      H / 2,
      Math.max(W, H) * 0.82
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(127, 29, 29, 0.34)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  } else if (
    scene.me &&
    scene.me.alive &&
    !scene.me.inPlane &&
    scene.me.dropTime <= 0 &&
    !scene.paused
  ) {
    const mx = scene.mouseX;
    const my = scene.mouseY;
    g.save();
    g.translate(mx, my);

    if (scene.hitmarker > 0) {
      g.strokeStyle = '#ff5c6c';
      g.lineWidth = 2.5;
      const d1 = 6;
      const d2 = 13;
      g.beginPath();
      g.moveTo(-d2, -d2); g.lineTo(-d1, -d1);
      g.moveTo(d2, -d2); g.lineTo(d1, -d1);
      g.moveTo(-d2, d2); g.lineTo(-d1, d1);
      g.moveTo(d2, d2); g.lineTo(d1, d1);
      g.stroke();
    }

    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 1.75;
    g.beginPath();
    g.arc(0, 0, 9, 0, Math.PI * 2);
    g.stroke();

    g.fillStyle = '#e8365d';
    g.beginPath();
    g.arc(0, 0, 2, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

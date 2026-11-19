import React, { useEffect, useRef } from 'react';
import {
  drawCosmeticSpritePreview,
  drawFullLoadoutSpritePreview,
  drawGliderPreview,
} from '../game/renderer';
import { CosmeticItem } from '../game/types';

function MusicArtwork({ item }: { item: CosmeticItem }) {
  if (item.id === 'mus_off') {
    return (
      <svg viewBox="0 0 160 96" className="w-full h-full" aria-hidden="true">
        <circle cx="80" cy="48" r="28" fill="#1e293b" stroke="#475569" strokeWidth="2.5" />
        <text x="80" y="56" textAnchor="middle" fontSize="24" fill="#94a3b8" fontWeight="bold">
          ♪
        </text>
        <line x1="58" y1="70" x2="102" y2="26" stroke="#e8365d" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 160 96" className="w-full h-full" aria-hidden="true">
      {[36, 48, 60, 100, 112, 124].map((x, idx) => {
        const h = [22, 38, 28, 34, 42, 20][idx];
        return (
          <rect
            key={x}
            x={x - 3}
            y={48 - h / 2}
            width="6"
            height={h}
            rx="3"
            fill={item.color}
            fillOpacity="0.45"
          />
        );
      })}
      <circle cx="80" cy="48" r="30" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />
      <circle cx="80" cy="48" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />
      <circle cx="80" cy="48" r="16" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
      <circle cx="80" cy="48" r="11" fill={item.color} stroke="#0f172a" strokeWidth="2" />
      <circle cx="80" cy="48" r="3" fill="#0f172a" />
    </svg>
  );
}

function SpriteCanvas({
  draw,
  deps,
  width,
  height,
  className = 'w-full h-full block',
}: {
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  deps: unknown[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const cw = width ?? (rect.width || 168);
      const ch = height ?? (rect.height || 96);
      if (cw <= 0 || ch <= 0) return;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const targetW = Math.round(cw * dpr);
      const targetH = Math.round(ch * dpr);
      if (canvas.width !== targetW) canvas.width = targetW;
      if (canvas.height !== targetH) canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, cw, ch);
      ctx.restore();
    };

    render();

    if (width !== undefined && height !== undefined) return;
    if (typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => render());
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, ...deps]);

  return (
    <canvas
      ref={canvasRef}
      style={width && height ? { width, height } : { width: '100%', height: '100%' }}
      className={className}
      aria-hidden="true"
    />
  );
}

export function CosmeticVisual({
  item,
  heightClass = 'h-24',
}: {
  item: CosmeticItem;
  heightClass?: string;
}) {
  return (
    <div
      className={`relative w-full ${heightClass} rounded-lg overflow-hidden border-2 border-[#090e17] bg-[#10192b] flex items-center justify-center`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: item.color }}
        aria-hidden="true"
      />
      {item.category === 'music' ? (
        <MusicArtwork item={item} />
      ) : (
        <SpriteCanvas
          deps={[item.id, item.category, item.color]}
          draw={(ctx, w, h) => drawCosmeticSpritePreview(ctx, item, w, h)}
        />
      )}
    </div>
  );
}

export function CrateGliderVisual({
  color,
  heightClass = 'h-24',
}: {
  color: string;
  heightClass?: string;
}) {
  return (
    <div
      className={`relative w-full ${heightClass} rounded-lg overflow-hidden border-2 border-[#090e17] bg-[#10192b] flex items-center justify-center`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <SpriteCanvas
        deps={[color]}
        draw={(ctx, w, h) => drawGliderPreview(ctx, color, w, h)}
      />
    </div>
  );
}

export function LoadoutSpriteShowcase({
  gliderColor,
  skinColor = '#e0ac82',
  skinId,
  backblingId,
  pickaxeId,
  size = 148,
}: {
  gliderColor: string;
  skinColor?: string;
  skinId: string;
  backblingId: string;
  pickaxeId: string;
  size?: number;
}) {
  return (
    <div style={{ width: size, height: size }}>
      <SpriteCanvas
        width={size}
        height={size}
        deps={[gliderColor, skinColor, skinId, backblingId, pickaxeId]}
        draw={(ctx, w, h) =>
          drawFullLoadoutSpritePreview(
            ctx,
            { gliderColor, skinColor, skinId, backblingId, pickaxeId },
            w,
            h
          )
        }
      />
    </div>
  );
}

import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';
import { renderGame } from '../game/renderer';
import { GameSettings } from '../game/types';

interface GameCanvasProps {
  engine: GameEngine;
  getSettings: () => GameSettings;
  activeCursor: boolean;
}

export const GameCanvas = React.memo(function GameCanvas({
  engine,
  getSettings,
  activeCursor,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      engine.setViewport(w, h);
    };

    resize();
    window.addEventListener('resize', resize);

    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      engine.step(dt);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderGame(ctx, engine, w, h, getSettings());

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [engine, getSettings]);

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={(e) => {
        engine.mouseX = e.clientX;
        engine.mouseY = e.clientY;
      }}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        engine.mouseX = e.clientX;
        engine.mouseY = e.clientY;
        if (
          !engine.ambient &&
          !engine.paused &&
          engine.me &&
          !engine.me.inPlane &&
          engine.me.dropTime <= 0
        ) {
          engine.mouseDown = true;
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`fixed inset-0 block w-full h-full ${
        activeCursor ? 'cursor-none' : 'cursor-default'
      }`}
    />
  );
});

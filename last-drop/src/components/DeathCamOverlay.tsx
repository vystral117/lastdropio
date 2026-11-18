import React from 'react';
import { FastForward, RotateCcw } from 'lucide-react';
import { DeathCamState } from '../game/types';

interface DeathCamOverlayProps {
  deathCam: DeathCamState;
  onReplay: () => void;
  onSkip: () => void;
}

export function DeathCamOverlay({
  deathCam,
  onReplay,
  onSkip,
}: DeathCamOverlayProps) {
  const progressPct =
    deathCam.duration > 0
      ? Math.min(100, Math.max(0, (deathCam.time / deathCam.duration) * 100))
      : 100;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6">
      {/* Top-Center: Death Cam Header & Elimination Context */}
      <div className="mx-auto bg-[#0e1526]/92 border border-[#e8365d]/50 rounded-xl px-5 py-2.5 shadow-xl flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="font-display font-black italic text-lg tracking-wider text-[#ff5c6c]">
          DEATH CAM
        </span>
        <span aria-hidden="true" className="text-white/25">
          ·
        </span>
        <span className="text-xs sm:text-sm font-semibold text-white">
          {deathCam.killerName
            ? `Eliminated by ${deathCam.killerName}`
            : 'Eliminated by the Storm'}
          {deathCam.killerWeapon ? (
            <span className="text-[#94a3b8] font-medium">
              {' '}
              · {deathCam.killerWeapon}
            </span>
          ) : null}
        </span>
      </div>

      {/* Bottom-Center: Playback Timeline & Controls */}
      <div className="mx-auto w-full max-w-[540px] bg-[#0e1526]/92 border border-white/16 rounded-xl px-4 py-3 shadow-xl flex flex-wrap sm:flex-nowrap items-center gap-3 pointer-events-auto">
        <div className="flex items-center gap-3 flex-1 min-w-[180px]">
          <div className="h-2 flex-1 bg-white/12 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#e8365d] transition-[width] duration-75"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="font-mono-num text-xs font-bold text-[#e2e8f0] whitespace-nowrap shrink-0">
            {deathCam.time.toFixed(1)}s / {deathCam.duration.toFixed(1)}s
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            type="button"
            onClick={onReplay}
            className="px-3 py-2 rounded-lg border border-white/18 hover:border-white/35 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay</span>
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="px-3.5 py-2 rounded-lg bg-[#e8365d] hover:bg-[#f0476c] text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <span>Skip to Results</span>
            <FastForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { REPORT_REASONS, TOTAL_PLAYERS } from '../game/constants';
import { MatchResult } from '../game/types';
import { CoinSprite, SkullSprite } from './WeaponIcon';

interface MatchModalProps {
  mode: 'RESULTS' | 'REPORT';
  result: MatchResult | null;
  allOver: boolean;
  reportTarget: string;
  hasDeathCam?: boolean;
  onWatchDeathCam?: () => void;
  onSpectate: () => void;
  onPlayAgain: () => void;
  onLobby: () => void;
  onOpenReport: () => void;
  onCancelReport: () => void;
  onSubmitReport: (reason: string) => void;
}

export function MatchModal({
  mode,
  result,
  allOver,
  reportTarget,
  hasDeathCam,
  onWatchDeathCam,
  onSpectate,
  onPlayAgain,
  onLobby,
  onOpenReport,
  onCancelReport,
  onSubmitReport,
}: MatchModalProps) {
  const [animateBars, setAnimateBars] = useState(false);
  const [selectedReason, setSelectedReason] = useState<number | null>(null);
  const [reportError, setReportError] = useState('');
  const [reportSaved, setReportSaved] = useState(false);

  useEffect(() => {
    if (mode === 'RESULTS') {
      setAnimateBars(false);
      const id = setTimeout(() => setAnimateBars(true), 60);
      return () => clearTimeout(id);
    }
    if (mode === 'REPORT') {
      setSelectedReason(null);
      setReportError('');
      setReportSaved(false);
    }
  }, [mode, result]);

  const formatTime = (secs: number) =>
    `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  const isVictory = result?.title === 'VICTORY';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#090e17]/75">
      <div className="w-full max-w-[490px] bg-[#182338] border-[3px] border-[#090e17] shadow-[0_7px_0_#090e17] rounded-xl overflow-hidden">
        {mode === 'RESULTS' && result && (
          <>
            {/* Zombs Royale Style Top Banner */}
            <div
              className={`px-5 py-3.5 border-b-[3px] border-[#090e17] flex items-center justify-between gap-3 ${
                isVictory ? 'bg-[#eab308]' : 'bg-[#dc2626]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {!isVictory && <SkullSprite className="w-8 h-8 shrink-0" />}
                <h2
                  className={`font-display font-black italic text-3xl sm:text-4xl tracking-wider uppercase leading-none ${
                    isVictory
                      ? 'text-[#090e17]'
                      : 'text-white drop-shadow-[0_2px_0_#090e17]'
                  }`}
                >
                  {isVictory ? 'VICTORY ROYALE!' : 'YOU DIED'}
                </h2>
              </div>

              <div
                className={`px-3 py-1 rounded-lg border-2 border-[#090e17] font-mono-num text-sm font-black shrink-0 ${
                  isVictory
                    ? 'bg-[#090e17] text-[#fbbf24]'
                    : 'bg-[#090e17] text-white'
                }`}
              >
                #{result.pl} / {TOTAL_PLAYERS}
              </div>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Killer / Match Winner Line */}
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#cbd5e1] pb-3 border-b-2 border-[#090e17]">
                <div className="flex items-center gap-2 min-w-0">
                  {!isVictory ? (
                    <>
                      <SkullSprite className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {result.killer ? (
                          <>
                            Eliminated by{' '}
                            <strong className="text-white">{result.killer}</strong>
                            {result.killerWeapon ? ` with ${result.killerWeapon}` : ''}
                          </>
                        ) : (
                          'Eliminated by the Gas'
                        )}
                      </span>
                    </>
                  ) : (
                    <span className="text-[#fbbf24] font-bold">
                      Last Survivor Standing
                    </span>
                  )}
                </div>
                {result.winnerName && !isVictory && (
                  <span className="text-[#fbbf24] font-bold shrink-0">
                    Winner: {result.winnerName}
                  </span>
                )}
              </div>

              {/* Single-Surface Divided Arcade Scoreboard (No Cards Within Cards) */}
              <div className="grid grid-cols-4 bg-[#101827] border-2 border-[#090e17] rounded-lg divide-x-2 divide-[#090e17] text-center">
                <div className="py-3 px-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                    Rank
                  </div>
                  <div className="font-mono-num text-xl font-black text-white mt-0.5">
                    #{result.pl}
                  </div>
                </div>

                <div className="py-3 px-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                    Kills
                  </div>
                  <div className="mt-0.5 flex items-center justify-center gap-1.5">
                    <SkullSprite className="w-5 h-5 shrink-0" />
                    <span className="font-mono-num text-xl font-black text-white">
                      {result.k}
                    </span>
                  </div>
                </div>

                <div className="py-3 px-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                    Damage
                  </div>
                  <div className="font-mono-num text-xl font-black text-white mt-0.5">
                    {result.dm}
                  </div>
                </div>

                <div className="py-3 px-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
                    Survived
                  </div>
                  <div className="font-mono-num text-xl font-black text-white mt-0.5">
                    {formatTime(result.sv)}
                  </div>
                </div>
              </div>

              {/* XP & Coin Progress */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono-num font-bold">
                  <span className="text-[#7dd3fc]">
                    +{result.xp} XP · Lv {result.af.l}
                    {result.af.l > result.b4.l ? ' (LEVEL UP!)' : ''}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#fbbf24]">
                    <CoinSprite className="w-4 h-4" />
                    +{result.co} Coins
                  </span>
                </div>
                <div className="h-3.5 rounded-md bg-[#0b111c] border-2 border-[#090e17] overflow-hidden">
                  <div
                    className="h-full bg-[#38bdf8] transition-[width] duration-1000 ease-out"
                    style={{
                      width: `${
                        animateBars
                          ? result.af.l > result.b4.l
                            ? 100
                            : (result.af.x / result.af.n) * 100
                          : (result.b4.x / result.b4.n) * 100
                      }%`,
                    }}
                  />
                </div>
                <div className="text-[11px] font-mono-num text-[#94a3b8] text-right">
                  {result.af.x} / {result.af.n} XP
                </div>
              </div>

              {/* Arena Hype Progress */}
              {result.ar && (
                <div className="flex flex-col gap-1.5 pt-2 border-t-2 border-[#090e17]">
                  <div className="flex items-center justify-between text-xs font-mono-num font-bold">
                    <span style={{ color: result.ar.r1.c }}>
                      {result.ar.r1.n}
                      {result.ar.r1.i > result.ar.r0.i
                        ? ' · RANK UP!'
                        : result.ar.r1.i < result.ar.r0.i
                          ? ' · DEMOTED'
                          : ''}
                    </span>
                    <span className="text-[#fbbf24]">
                      {result.ar.pt} pts ({result.ar.h1 >= result.ar.h0 ? '+' : ''}
                      {result.ar.h1 - result.ar.h0} hype)
                    </span>
                  </div>
                  <div className="h-3 rounded-md bg-[#0b111c] border-2 border-[#090e17] overflow-hidden">
                    <div
                      className="h-full transition-[width] duration-1000 ease-out"
                      style={{
                        backgroundColor: result.ar.r1.c,
                        width: `${
                          animateBars
                            ? result.ar.r1.i > result.ar.r0.i
                              ? 100
                              : result.ar.r1.p
                            : result.ar.r0.p
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Chunky Beveled Zombs Royale Action Buttons */}
              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onPlayAgain}
                  className="w-full py-3 rounded-lg bg-[#27c24c] hover:bg-[#32d659] border-2 border-[#090e17] shadow-[0_4px_0_#157a2e] active:translate-y-0.5 active:shadow-[0_2px_0_#157a2e] font-display font-black italic text-2xl tracking-widest text-white drop-shadow-[0_2px_0_rgba(9,14,23,0.85)] cursor-pointer transition-all whitespace-nowrap"
                >
                  PLAY AGAIN
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {hasDeathCam && onWatchDeathCam && result.title === 'ELIMINATED' && (
                    <button
                      type="button"
                      onClick={onWatchDeathCam}
                      className="py-2.5 px-3 rounded-lg bg-[#2563eb] hover:bg-[#3b82f6] border-2 border-[#090e17] shadow-[0_3px_0_#090e17] active:translate-y-0.5 text-xs font-bold text-white whitespace-nowrap cursor-pointer transition-all"
                    >
                      Death Cam (3s)
                    </button>
                  )}

                  {!allOver && result.title !== 'VICTORY' && (
                    <button
                      type="button"
                      onClick={onSpectate}
                      className="py-2.5 px-3 rounded-lg bg-[#263552] hover:bg-[#31456b] border-2 border-[#090e17] shadow-[0_3px_0_#090e17] active:translate-y-0.5 text-xs font-bold text-white truncate cursor-pointer transition-all"
                    >
                      Spectate{result.killer ? ` ${result.killer}` : ''}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onLobby}
                    className={`py-2.5 px-3 rounded-lg bg-[#263552] hover:bg-[#31456b] border-2 border-[#090e17] shadow-[0_3px_0_#090e17] active:translate-y-0.5 text-xs font-bold text-[#e2e8f0] hover:text-white whitespace-nowrap cursor-pointer transition-all ${
                      !hasDeathCam && (allOver || isVictory) && !result.killer
                        ? 'col-span-2'
                        : ''
                    }`}
                  >
                    Leave to Lobby
                  </button>

                  {result.killer && (
                    <button
                      type="button"
                      onClick={onOpenReport}
                      className="py-2.5 px-3 rounded-lg bg-[#1c263b] hover:bg-[#2a3854] border-2 border-[#090e17] shadow-[0_3px_0_#090e17] active:translate-y-0.5 text-xs font-bold text-[#cbd5e1] hover:text-white truncate cursor-pointer transition-all"
                    >
                      Report {result.killer}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {mode === 'REPORT' && (
          <>
            <div className="px-5 py-3 bg-[#dc2626] border-b-[3px] border-[#090e17] flex items-center justify-between">
              <h2 className="font-display font-black italic text-2xl tracking-wider text-white drop-shadow-[0_2px_0_#090e17]">
                REPORT PLAYER
              </h2>
              <span className="text-xs font-bold text-white/90 truncate max-w-[180px]">
                {reportTarget}
              </span>
            </div>

            <div className="p-5 flex flex-col gap-3">
              {reportSaved ? (
                <>
                  <p className="text-sm text-[#cbd5e1] text-center py-2">
                    Report saved for <b className="text-white">{reportTarget}</b>. Reports are stored locally on this device.
                  </p>
                  <button
                    type="button"
                    onClick={onCancelReport}
                    className="w-full py-2.5 rounded-lg bg-[#2563eb] hover:bg-[#3b82f6] border-2 border-[#090e17] shadow-[0_3px_0_#090e17] text-sm font-bold text-white cursor-pointer"
                  >
                    Back to Results
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-[#94a3b8]">
                    Select a reason for reporting <strong className="text-white">{reportTarget}</strong>:
                  </p>
                  <div className="divide-y-2 divide-[#090e17] bg-[#101827] border-2 border-[#090e17] rounded-lg px-3">
                    {REPORT_REASONS.map((reason, idx) => (
                      <label
                        key={reason}
                        className="flex items-center justify-between py-2.5 text-sm text-[#e2e8f0] cursor-pointer"
                      >
                        <span>{reason}</span>
                        <input
                          type="radio"
                          name="report-reason"
                          checked={selectedReason === idx}
                          onChange={() => {
                            setSelectedReason(idx);
                            setReportError('');
                          }}
                          className="accent-[#dc2626] w-4 h-4"
                        />
                      </label>
                    ))}
                  </div>
                  {reportError && (
                    <div className="text-xs font-bold text-[#ff5c6c]">{reportError}</div>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onCancelReport}
                      className="py-2.5 rounded-lg bg-[#263552] hover:bg-[#31456b] border-2 border-[#090e17] shadow-[0_3px_0_#090e17] text-sm font-bold text-[#cbd5e1] hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedReason === null) {
                          setReportError('Pick a reason first.');
                          return;
                        }
                        onSubmitReport(REPORT_REASONS[selectedReason]);
                        setReportSaved(true);
                      }}
                      className="py-2.5 rounded-lg bg-[#dc2626] hover:bg-[#ef4444] border-2 border-[#090e17] shadow-[0_3px_0_#090e17] text-sm font-bold text-white cursor-pointer"
                    >
                      Send Report
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

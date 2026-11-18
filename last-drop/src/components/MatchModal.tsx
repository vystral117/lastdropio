import React, { useEffect, useState } from 'react';
import { REPORT_REASONS } from '../game/constants';
import { MatchResult } from '../game/types';

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

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/65">
      <div className="w-full max-w-[440px] bg-[#14171d] border border-white/14 rounded-2xl p-6 shadow-2xl">
        {mode === 'RESULTS' && result && (
          <div className="flex flex-col gap-3.5 text-center">
            <h2
              className={`font-display font-black italic text-4xl tracking-wider ${
                result.title === 'VICTORY' ? 'text-[#ffd24d]' : 'text-white'
              }`}
            >
              {result.title}
            </h2>

            <div className="grid grid-cols-2 gap-2 text-left">
              {[
                [`#${result.pl}`, 'Placement'],
                [result.k, 'Kills'],
                [result.dm, 'Damage dealt'],
                [formatTime(result.sv), 'Survived'],
              ].map(([val, label]) => (
                <div
                  key={label}
                  className="border border-white/10 bg-white/[0.03] rounded-xl p-3"
                >
                  <div className="font-mono-num text-xl font-bold text-white">
                    {val}
                  </div>
                  <div className="text-xs text-[#9aa3b2]">{label}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-xs font-bold text-white font-mono-num">
                +{result.xp} XP · +{result.co} coins
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden my-1.5">
                <div
                  className="h-full bg-gradient-to-r from-[#ff7a18] to-[#e8365d] transition-[width] duration-1000 ease-out"
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
              <div className="text-xs text-[#9aa3b2] font-mono-num">
                {result.af.l > result.b4.l ? 'LEVEL UP! · ' : ''}
                Level {result.af.l} · {result.af.x}/{result.af.n} XP
              </div>
            </div>

            {result.ar && (
              <div>
                <div className="text-xs font-bold text-[#ffd24d] font-mono-num">
                  Arena: {result.ar.pt} points ·{' '}
                  {result.ar.h1 >= result.ar.h0 ? '+' : ''}
                  {result.ar.h1 - result.ar.h0} hype
                </div>
                <div className="h-2.5 rounded-full bg-white/10 overflow-hidden my-1.5">
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
                <div
                  className="text-xs font-semibold"
                  style={{ color: result.ar.r1.c }}
                >
                  {result.ar.r1.i > result.ar.r0.i
                    ? 'RANK UP! · '
                    : result.ar.r1.i < result.ar.r0.i
                      ? 'DEMOTED · '
                      : ''}
                  {result.ar.r1.n} · {result.ar.h1} hype
                </div>
              </div>
            )}

            {result.winnerName && (
              <div className="text-xs text-[#b8c0ce]">
                {result.winnerName} won the match.
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              {hasDeathCam && onWatchDeathCam && result.title === 'ELIMINATED' && (
                <button
                  type="button"
                  onClick={onWatchDeathCam}
                  className="w-full py-2.5 rounded-xl border border-[#e8365d]/55 bg-[#e8365d]/12 hover:bg-[#e8365d]/22 text-sm font-semibold text-white whitespace-nowrap cursor-pointer transition-colors"
                >
                  Watch Death Cam (3s)
                </button>
              )}
              {!allOver && result.title !== 'VICTORY' && (
                <button
                  type="button"
                  onClick={onSpectate}
                  className="w-full py-2.5 rounded-xl border border-white/15 hover:border-white/30 text-sm font-semibold text-white cursor-pointer"
                >
                  Spectate{result.killer ? ` ${result.killer}` : ''}
                </button>
              )}
              {result.killer && (
                <button
                  type="button"
                  onClick={onOpenReport}
                  className="w-full py-2.5 rounded-xl border border-white/15 hover:border-white/30 text-sm font-semibold text-[#b8c0ce] hover:text-white cursor-pointer"
                >
                  Report {result.killer}
                </button>
              )}
              <button
                type="button"
                onClick={onPlayAgain}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#ff7a18] to-[#e8365d] hover:brightness-110 text-base font-display font-black italic tracking-widest text-white cursor-pointer"
              >
                PLAY AGAIN
              </button>
              <button
                type="button"
                onClick={onLobby}
                className="w-full py-2.5 rounded-xl border border-white/15 hover:border-white/30 text-sm font-semibold text-[#b8c0ce] hover:text-white cursor-pointer"
              >
                Leave to Lobby
              </button>
            </div>
          </div>
        )}

        {mode === 'REPORT' && (
          <div className="flex flex-col gap-3">
            <h2 className="font-display font-black italic text-2xl tracking-wider text-white text-center">
              REPORT PLAYER
            </h2>
            {reportSaved ? (
              <>
                <p className="text-sm text-[#b8c0ce] text-center">
                  Report saved for <b className="text-white">{reportTarget}</b>. Reports are stored locally on this device.
                </p>
                <button
                  type="button"
                  onClick={onCancelReport}
                  className="w-full py-2.5 rounded-xl bg-[#e8365d] text-sm font-bold text-white cursor-pointer"
                >
                  Back to Results
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-[#9aa3b2] text-center">
                  Report <b className="text-white">{reportTarget}</b>. Pick a reason below.
                </p>
                <div className="divide-y divide-white/10">
                  {REPORT_REASONS.map((reason, idx) => (
                    <label
                      key={reason}
                      className="flex items-center justify-between py-2.5 text-sm text-[#e4e7ee] cursor-pointer"
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
                        className="accent-[#e8365d]"
                      />
                    </label>
                  ))}
                </div>
                {reportError && (
                  <div className="text-xs text-[#ff5c6c]">{reportError}</div>
                )}
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
                  className="w-full py-2.5 rounded-xl bg-[#e8365d] hover:bg-[#f0476c] text-sm font-bold text-white cursor-pointer"
                >
                  Send report
                </button>
                <button
                  type="button"
                  onClick={onCancelReport}
                  className="w-full py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-[#b8c0ce] cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

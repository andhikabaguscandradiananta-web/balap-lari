import React from 'react';
import { Flame, Shield, Sparkles, Trophy, Zap } from 'lucide-react';
import { BIKE_COLOR_PALETTES, KEYBOARD_HINTS } from '../data/wordQuestions';
import { PlayerConfig, PlayerRaceState } from '../types/game';

interface PlayerConsoleProps {
  player: PlayerConfig;
  raceState: PlayerRaceState;
  rank: number;
  trackLength: number;
  onAnswer: (playerId: number, optionIndex: number) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export const PlayerConsole: React.FC<PlayerConsoleProps> = ({
  player,
  raceState,
  rank,
  trackLength,
  onAnswer,
}) => {
  const palette = BIKE_COLOR_PALETTES.find((c) => c.id === player.bikeColor) ?? BIKE_COLOR_PALETTES[0];
  const keys = KEYBOARD_HINTS[player.id] ?? ['1', '2', '3', '4'];

  const activeObstacle =
    raceState.activeObstacleIndex !== null
      ? raceState.obstacles[raceState.activeObstacleIndex]
      : null;

  const isQuestionVisible =
    activeObstacle &&
    activeObstacle.resolved === 'pending' &&
    activeObstacle.answeredOptionIndex === null &&
    !raceState.finished;

  const progressToObstacle = activeObstacle
    ? Math.max(
        0,
        Math.min(
          100,
          ((activeObstacle.x - raceState.distance) /
            Math.max(1, activeObstacle.x - activeObstacle.triggerX)) *
            100
        )
      )
    : 0;

  const secondsLeft = activeObstacle
    ? Math.max(
        0,
        Math.ceil(
          (activeObstacle.x - 16 - raceState.distance) /
            Math.max(40, raceState.speed || raceState.baseSpeed)
        )
      )
    : 0;

  const now = Date.now();
  const feedbackActive = raceState.lastFeedback && raceState.lastFeedback.expiresAt > now;

  return (
    <section
      className="flex flex-col h-full min-h-0 bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden shadow-lg"
      aria-label={`Panel kontrol ${player.name}`}
    >
      {/* Top Player Header Strip */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-950/85 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-md font-display text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: palette.primary }}
          >
            P{player.id + 1}
          </span>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
              {player.name}
            </div>
            <div className="text-[10px] text-slate-400 font-mono-num leading-tight">
              #{rank} · {Math.round((raceState.distance / trackLength) * 100)}%
            </div>
          </div>
        </div>

        {/* Active Powerups & Score */}
        <div className="flex items-center gap-1.5 shrink-0">
          {raceState.shieldActive && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold"
              title="Perisai aktif: melindungi 1 kali salah"
            >
              <Shield className="w-3 h-3" />
            </span>
          )}
          {raceState.doubleScoreActive && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold"
              title="Skor Ganda 2x aktif"
            >
              <Sparkles className="w-3 h-3" />
              2×
            </span>
          )}
          {raceState.nitroTimer > 0 && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold"
              title="Nitro aktif"
            >
              <Zap className="w-3 h-3" />
            </span>
          )}
          {raceState.streak >= 2 && (
            <span className="inline-flex items-center gap-0.5 text-amber-400 text-[11px] font-mono-num font-bold">
              <Flame className="w-3 h-3" />
              {raceState.streak}×
            </span>
          )}
          <div className="text-right pl-1">
            <div className="text-sm sm:text-base font-extrabold font-mono-num text-amber-400 leading-none">
              {raceState.score}
            </div>
            <div className="text-[9px] text-slate-400 font-mono-num">POIN</div>
          </div>
        </div>
      </div>

      {/* Main Interactive Body (Scrollable fallback ensures D is never clipped) */}
      <div className="flex-1 flex flex-col justify-between p-2 sm:p-2.5 min-h-0 overflow-y-auto">
        {raceState.finished ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-2 gap-1.5">
            <Trophy className="w-8 h-8 text-amber-400" />
            <div className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide">
              FINIS PERINGKAT #{rank}
            </div>
            <p className="text-xs text-slate-300 font-mono-num">
              Benar: {raceState.correctCount} · Salah: {raceState.wrongCount} · Skor: {raceState.score}
            </p>
          </div>
        ) : isQuestionVisible && activeObstacle ? (
          <div className="flex-1 flex flex-col justify-between gap-2 min-h-0">
            {/* Question Header & Timer Progress */}
            <div className="space-y-1 shrink-0">
              <div className="flex items-center justify-between text-[11px] text-slate-400 gap-2">
                <span className="font-semibold text-sky-300 truncate">
                  {activeObstacle.question.topic}
                </span>
                <span
                  className={`font-mono-num font-bold shrink-0 ${
                    secondsLeft <= 4 ? 'text-red-400' : 'text-amber-300'
                  }`}
                >
                  {secondsLeft} dtk
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    progressToObstacle < 30 ? 'bg-red-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${progressToObstacle}%` }}
                />
              </div>
              <p className="text-xs sm:text-[13px] font-semibold text-white leading-snug pt-0.5">
                {activeObstacle.question.question}
              </p>
            </div>

            {/* 4 Large Touch Answer Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5 mt-auto shrink-0">
              {activeObstacle.question.options.map((optionText, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAnswer(player.id, idx)}
                  className="group relative flex items-center gap-2 w-full min-h-[38px] px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-[0.98] border border-slate-700 hover:border-amber-400/70 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded font-display text-xs sm:text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: palette.primary }}
                  >
                    {OPTION_LABELS[idx]}
                  </span>
                  <span className="text-[11px] sm:text-xs font-medium text-slate-100 leading-tight flex-1">
                    {optionText}
                  </span>
                  <span className="hidden xl:inline-block text-[10px] font-mono-num text-slate-500 shrink-0">
                    [{keys[idx]}]
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : feedbackActive && raceState.lastFeedback ? (
          <div
            className={`flex-1 flex flex-col items-center justify-center text-center rounded-lg px-3 py-2 border ${
              raceState.lastFeedback.type === 'correct'
                ? 'bg-emerald-950/60 border-emerald-500/40'
                : raceState.lastFeedback.type === 'wrong'
                ? 'bg-red-950/60 border-red-500/40'
                : raceState.lastFeedback.type === 'shield'
                ? 'bg-teal-950/60 border-teal-500/40'
                : 'bg-sky-950/60 border-sky-500/40'
            }`}
          >
            <div
              className={`font-display text-xl sm:text-2xl font-extrabold tracking-wide ${
                raceState.lastFeedback.type === 'correct'
                  ? 'text-emerald-400'
                  : raceState.lastFeedback.type === 'wrong'
                  ? 'text-red-400'
                  : raceState.lastFeedback.type === 'shield'
                  ? 'text-teal-300'
                  : 'text-sky-300'
              }`}
            >
              {raceState.lastFeedback.title}
            </div>
            <p className="text-xs text-slate-200 mt-1 leading-relaxed">
              {raceState.lastFeedback.detail}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-3 py-2 bg-slate-950/40 rounded-lg border border-slate-800/70">
            <div className="text-xs font-bold text-amber-400 tracking-wide">
              {raceState.nitroTimer > 0 ? 'SPRINT TURBO MELESAT!' : 'BERLARI DI LINTASAN...'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Bersiap menghadapi rintangan Microsoft Word berikutnya!
            </p>
            <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-400 font-mono-num">
              <span>Benar: {raceState.correctCount}</span>
              <span>·</span>
              <span>Salah: {raceState.wrongCount}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

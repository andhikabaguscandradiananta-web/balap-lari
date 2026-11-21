import React from 'react';
import { ArrowRight, Award, CheckCircle2, RotateCcw, Trophy } from 'lucide-react';
import { BIKE_COLOR_PALETTES, LEVEL_DEFINITIONS } from '../data/wordQuestions';
import { PlayerConfig, RaceMode } from '../types/game';
import { BikePreviewSvg } from './BikePreviewSvg';

export interface PlayerSummaryStats {
  player: PlayerConfig;
  score: number;
  correctCount: number;
  wrongCount: number;
  maxStreak: number;
  bonusesCollected: number;
  rank: number;
  finishedFirst?: boolean;
}

interface PodiumViewProps {
  isFinalPodium: boolean;
  currentLevel: 1 | 2 | 3 | 4;
  raceMode: RaceMode;
  standings: PlayerSummaryStats[];
  savedToLeaderboard: boolean;
  onSaveToLeaderboard: () => void;
  onNextLevel: () => void;
  onPlayAgain: () => void;
  onOpenLeaderboard: () => void;
  onBackToLobby: () => void;
}

export const PodiumView: React.FC<PodiumViewProps> = ({
  isFinalPodium,
  currentLevel,
  raceMode,
  standings,
  savedToLeaderboard,
  onSaveToLeaderboard,
  onNextLevel,
  onPlayAgain,
  onOpenLeaderboard,
  onBackToLobby,
}) => {
  const levelDef = LEVEL_DEFINITIONS.find((l) => l.level === currentLevel) ?? LEVEL_DEFINITIONS[0];
  const winner = standings[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Banner Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl bg-slate-900 border border-slate-800 p-6">
        <div className="flex items-center gap-5">
          <img
            src="/src/assets/images/champion_trophy_badge_1795269410881.jpg"
            alt="Piala Juara"
            referrerPolicy="no-referrer"
            className="w-20 h-20 rounded-xl object-cover border border-amber-400/50 shrink-0"
          />
          <div>
            <div className="text-xs font-bold text-amber-400 tracking-wide">
              {isFinalPodium
                ? raceMode === 'tournament'
                  ? 'KEJUARAAN TURNAMEN 4 LEVEL SELESAI'
                  : `${levelDef.title} SELESAI`
                : `${levelDef.title} TUNTAS`}
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight mt-0.5">
              {isFinalPodium
                ? `Juara 1: ${winner?.player.name ?? '-'}`
                : `Pimpinan Sementara: ${winner?.player.name ?? '-'}`}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {isFinalPodium
                ? 'Juara 1 diraih pelari pertama yang mencapai finis; Juara 2, 3, dan 4 ditentukan dari jumlah soal benar terbanyak.'
                : `Perlombaan level ini selesai setelah pelari pertama finis. Juara 2–4 ditentukan dari jumlah soal benar sebelum lanjut ke Level ${currentLevel + 1}.`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!isFinalPodium ? (
            <button
              type="button"
              onClick={onNextLevel}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              Lanjut ke Level {currentLevel + 1}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onSaveToLeaderboard}
                disabled={savedToLeaderboard}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  savedToLeaderboard
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {savedToLeaderboard ? 'Tersimpan di Peringkat' : 'Simpan ke Papan Peringkat'}
              </button>
              <button
                type="button"
                onClick={onPlayAgain}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                Main Lagi
              </button>
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                Papan Peringkat
              </button>
            </>
          )}
        </div>
      </div>

      {/* Podium Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {standings.map((item, idx) => {
          const palette =
            BIKE_COLOR_PALETTES.find((c) => c.id === item.player.bikeColor) ?? BIKE_COLOR_PALETTES[0];
          const totalAttempts = item.correctCount + item.wrongCount;
          const accuracy = totalAttempts > 0 ? Math.round((item.correctCount / totalAttempts) * 100) : 0;

          return (
            <div
              key={item.player.id}
              className={`flex flex-col rounded-2xl border p-5 ${
                idx === 0
                  ? 'bg-slate-900 border-amber-400/60 shadow-xl'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-display text-lg font-extrabold ${
                      idx === 0
                        ? 'bg-amber-400 text-slate-950'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-950'
                        : idx === 2
                        ? 'bg-orange-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-white text-base">{item.player.name}</div>
                    <div className="text-xs text-slate-400">
                      No. {item.player.raceNumber}
                      {item.finishedFirst
                        ? ' · Finis Pertama'
                        : idx > 0
                        ? ` · ${item.correctCount} Soal Benar`
                        : ''}
                    </div>
                  </div>
                </div>
                {idx === 0 && <Award className="w-6 h-6 text-amber-400" />}
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-800 p-2 mb-4">
                <BikePreviewSvg
                  bikeColor={item.player.bikeColor}
                  helmetStyle={item.player.helmetStyle}
                  bikeModel={item.player.bikeModel}
                  raceNumber={item.player.raceNumber}
                  className="w-full h-24"
                />
              </div>

              <div className="text-center py-2 border-y border-slate-800 mb-3">
                <div className="text-xs text-slate-400">Skor Total</div>
                <div className="font-display text-4xl font-extrabold text-amber-400 font-mono-num">
                  {item.score}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Akurasi Materi Word</span>
                  <span
                    className={`font-mono-num font-bold ${
                      accuracy >= 80
                        ? 'text-emerald-400'
                        : accuracy >= 50
                        ? 'text-amber-300'
                        : 'text-red-400'
                    }`}
                  >
                    {accuracy}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Jawaban Benar / Salah</span>
                  <span className="font-mono-num font-bold text-emerald-300">
                    {item.correctCount} Benar{' '}
                    <span className="font-normal text-slate-400">/ {item.wrongCount} Salah</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Streak Terbaik</span>
                  <span className="font-mono-num text-slate-200">{item.maxStreak}×</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Bonus Diambil</span>
                  <span className="font-mono-num text-sky-300">{item.bonusesCollected} item</span>
                </div>
              </div>

              <div
                className="mt-4 h-1.5 w-full rounded-full"
                style={{ backgroundColor: palette.primary }}
              />
            </div>
          );
        })}
      </div>

      {isFinalPodium && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onBackToLobby}
            className="text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Kembali ke Menu Utama
          </button>
        </div>
      )}
    </div>
  );
};

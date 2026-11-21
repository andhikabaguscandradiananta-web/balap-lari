import React, { useState } from 'react';
import { Award, Medal, Trash2, Trophy } from 'lucide-react';
import { BIKE_COLOR_PALETTES, BIKE_MODELS } from '../data/wordQuestions';
import { LeaderboardEntry } from '../types/game';
import championTrophyBadgeImg from '../assets/images/champion_trophy_badge_1795269410881.jpg';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  onClearLeaderboard: () => void;
  onBackToLobby: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  entries,
  onClearLeaderboard,
  onBackToLobby,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'tournament' | 'single'>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = entries.filter((e) => {
    if (filterMode === 'all') return true;
    return e.mode === filterMode;
  });

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(iso));
    } catch {
      return '-';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-4">
          <img
            src={championTrophyBadgeImg}
            alt="Piala Juara WordCross Arena"
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-xl object-cover border border-amber-400/40 shrink-0"
          />
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Papan Peringkat Kelas
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Catatan skor tertinggi dan akurasi materi Microsoft Word untuk kompetisi sehat antar siswa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {entries.length > 0 && !confirmClear && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-red-950/60 text-slate-300 hover:text-red-300 text-xs font-semibold border border-slate-700 hover:border-red-500/40 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Catatan
            </button>
          )}
          {confirmClear && (
            <div className="flex items-center gap-2 bg-red-950/80 border border-red-500/40 rounded-lg px-3 py-1.5">
              <span className="text-xs text-red-200 font-medium">Reset semua skor?</span>
              <button
                type="button"
                onClick={() => {
                  onClearLeaderboard();
                  setConfirmClear(false);
                }}
                className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                Ya, Hapus
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onBackToLobby}
            className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap"
          >
            Kembali ke Arena
          </button>
        </div>
      </div>

      {/* Interactive Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          {[
            { id: 'all', label: 'Semua Mode' },
            { id: 'tournament', label: 'Mode Turnamen (4 Level)' },
            { id: 'single', label: 'Balapan Tunggal' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id as 'all' | 'tournament' | 'single')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                filterMode === tab.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400 font-mono-num">
          Total Pelari Tercatat: {filtered.length}
        </div>
      </div>

      {/* Leaderboard Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <Trophy className="w-12 h-12 text-slate-600 mb-3" />
          <h2 className="font-display text-2xl font-bold text-slate-200">
            Belum Ada Rekor Peringkat
          </h2>
          <p className="text-sm text-slate-400 max-w-md mt-1">
            Selesaikan satu balapan bersama siswa untuk mencatat skor dan akurasi penguasaan Microsoft Word di sini.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400">
                <th className="py-3.5 px-4">Peringkat</th>
                <th className="py-3.5 px-4">Pelari</th>
                <th className="py-3.5 px-4">Gaya Atlet</th>
                <th className="py-3.5 px-4">Mode & Level</th>
                <th className="py-3.5 px-4 text-right">Akurasi Word</th>
                <th className="py-3.5 px-4 text-right">Streak Terbaik</th>
                <th className="py-3.5 px-4 text-right">Skor Total</th>
                <th className="py-3.5 px-4 text-right">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {filtered.map((entry, index) => {
                const palette =
                  BIKE_COLOR_PALETTES.find((c) => c.id === entry.bikeColor) ?? BIKE_COLOR_PALETTES[0];
                const modelLabel =
                  BIKE_MODELS.find((m) => m.id === entry.bikeModel)?.label ?? 'MX Pro';

                return (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono-num font-bold">
                      {index === 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-400">
                          <Trophy className="w-4 h-4" /> #1
                        </span>
                      ) : index === 1 ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-200">
                          <Medal className="w-4 h-4" /> #2
                        </span>
                      ) : index === 2 ? (
                        <span className="inline-flex items-center gap-1.5 text-orange-400">
                          <Award className="w-4 h-4" /> #3
                        </span>
                      ) : (
                        <span className="text-slate-400">#{index + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="inline-flex items-center justify-center w-7 h-7 rounded font-display text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: palette.primary }}
                        >
                          {entry.raceNumber}
                        </span>
                        <span className="font-bold text-white">{entry.playerName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-xs">{modelLabel}</td>
                    <td className="py-3 px-4 text-xs text-slate-300">
                      {entry.mode === 'tournament' ? 'Turnamen' : 'Tunggal'} · Level {entry.levelReached}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num">
                      <span
                        className={`font-semibold ${
                          entry.accuracy >= 80
                            ? 'text-emerald-400'
                            : entry.accuracy >= 50
                            ? 'text-amber-300'
                            : 'text-red-400'
                        }`}
                      >
                        {entry.accuracy}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-300">
                      {entry.maxStreak}×
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-extrabold text-amber-400 text-base">
                      {entry.score}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-400 font-mono-num">
                      {formatDate(entry.dateIso)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

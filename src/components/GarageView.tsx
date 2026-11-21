import React from 'react';
import { Check, Play, RotateCcw } from 'lucide-react';
import {
  BIKE_COLOR_PALETTES,
  BIKE_MODELS,
  DEFAULT_PLAYERS,
  HELMET_STYLES,
} from '../data/wordQuestions';
import { BikeColorId, BikeModelId, HelmetStyleId, PlayerConfig } from '../types/game';
import { BikePreviewSvg } from './BikePreviewSvg';

interface GarageViewProps {
  players: PlayerConfig[];
  onUpdatePlayer: (id: number, patch: Partial<PlayerConfig>) => void;
  onResetPlayers: () => void;
  onStartRace: () => void;
}

const PRESET_NUMBERS = ['01', '07', '12', '24', '46', '77', '88', '99'];

export const GarageView: React.FC<GarageViewProps> = ({
  players,
  onUpdatePlayer,
  onResetPlayers,
  onStartRace,
}) => {
  const activeCount = players.filter((p) => p.active).length;

  const handleToggleActive = (player: PlayerConfig) => {
    if (player.active && activeCount <= 2) return; // Minimum 2 players to race
    onUpdatePlayer(player.id, { active: !player.active });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ruang Ganti &amp; Kustomisasi Pelari
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Atur nama siswa, warna kostum lari, aksesori kepala, gaya atlet, dan nomor dada untuk 2 hingga 4 pelari sekaligus.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onResetPlayers}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            Atur Ulang
          </button>
          <button
            type="button"
            onClick={onStartRace}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current" />
            Mulai Lomba ({activeCount} Pelari)
          </button>
        </div>
      </div>

      {/* 4 Player Customization Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {players.map((player) => {
          const palette =
            BIKE_COLOR_PALETTES.find((c) => c.id === player.bikeColor) ?? BIKE_COLOR_PALETTES[0];

          return (
            <div
              key={player.id}
              className={`flex flex-col rounded-xl border p-4 transition-all ${
                player.active
                  ? 'bg-slate-900 border-slate-700 shadow-lg'
                  : 'bg-slate-900/40 border-slate-800/70 opacity-65'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-display text-base font-bold text-white"
                    style={{ backgroundColor: palette.primary }}
                  >
                    P{player.id + 1}
                  </span>
                  <span className="text-sm font-bold text-slate-200">
                    Pelari {player.id + 1}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleActive(player)}
                  disabled={player.active && activeCount <= 2}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    player.active
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {player.active ? 'Ikut Lomba' : 'Nonaktif'}
                </button>
              </div>

              {/* Live SVG Bike Preview */}
              <div className="relative rounded-lg bg-slate-950 border border-slate-800 p-3 mb-4">
                <BikePreviewSvg
                  bikeColor={player.bikeColor}
                  helmetStyle={player.helmetStyle}
                  bikeModel={player.bikeModel}
                  raceNumber={player.raceNumber}
                  className="w-full h-28"
                />
              </div>

              {/* Player Name Input */}
              <div className="space-y-3 flex-1">
                <div>
                  <label
                    htmlFor={`name-${player.id}`}
                    className="block text-xs font-semibold text-slate-400 mb-1"
                  >
                    Nama Siswa / Tim
                  </label>
                  <input
                    id={`name-${player.id}`}
                    type="text"
                    maxLength={16}
                    value={player.name}
                    onChange={(e) => onUpdatePlayer(player.id, { name: e.target.value })}
                    placeholder={DEFAULT_PLAYERS[player.id].name}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Color Picker */}
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-1.5">
                    Warna Kostum Lari · <span className="text-slate-200">{palette.label}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {BIKE_COLOR_PALETTES.map((color) => {
                      const selected = player.bikeColor === color.id;
                      return (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => onUpdatePlayer(player.id, { bikeColor: color.id as BikeColorId })}
                          title={color.label}
                          aria-label={`Pilih warna ${color.label}`}
                          className={`h-8 rounded-lg flex items-center justify-center border-2 transition-transform cursor-pointer ${
                            selected
                              ? 'border-white scale-105'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.primary }}
                        >
                          {selected && <Check className="w-4 h-4 text-white drop-shadow" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Helmet Style */}
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-1.5">Aksesori Kepala</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {HELMET_STYLES.map((h) => {
                      const selected = player.helmetStyle === h.id;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => onUpdatePlayer(player.id, { helmetStyle: h.id as HelmetStyleId })}
                          className={`px-2.5 py-2 rounded-lg text-xs font-semibold text-left border transition-colors cursor-pointer ${
                            selected
                              ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {h.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bike Model */}
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-1.5">Gaya Kostum &amp; Sepatu</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {BIKE_MODELS.map((m) => {
                      const selected = player.bikeModel === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => onUpdatePlayer(player.id, { bikeModel: m.id as BikeModelId })}
                          className={`px-2.5 py-2 rounded-lg text-xs font-semibold text-left border transition-colors cursor-pointer ${
                            selected
                              ? 'bg-sky-500/15 border-sky-400 text-sky-300'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Race Number */}
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-1.5">Nomor Dada</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_NUMBERS.map((num) => {
                      const selected = player.raceNumber === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => onUpdatePlayer(player.id, { raceNumber: num })}
                          className={`w-9 h-8 rounded-md font-display text-sm font-bold border transition-colors cursor-pointer ${
                            selected
                              ? 'bg-white text-slate-950 border-white'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

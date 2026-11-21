import React, { useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { LEVEL_DEFINITIONS } from '../data/wordQuestions';
import { WordQuestion } from '../types/game';

interface WordMaterialModalProps {
  open: boolean;
  questions: WordQuestion[];
  onClose: () => void;
}

export const WordMaterialModal: React.FC<WordMaterialModalProps> = ({
  open,
  questions: allQuestions,
  onClose,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3 | 4>(1);

  if (!open) return null;

  const levelDef = LEVEL_DEFINITIONS.find((l) => l.level === selectedLevel) ?? LEVEL_DEFINITIONS[0];
  const questions = allQuestions.filter((q) => q.level === selectedLevel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Ringkasan Materi Microsoft Word"
    >
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-2xl font-bold text-white">
              Kisi-Kisi Materi Microsoft Word
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup materi"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 bg-slate-950/60 border-b border-slate-800 overflow-x-auto">
          {LEVEL_DEFINITIONS.map((lvl) => (
            <button
              key={lvl.level}
              type="button"
              onClick={() => setSelectedLevel(lvl.level)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedLevel === lvl.level
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Level {lvl.level}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="pb-2 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white">{levelDef.title}</h3>
            <p className="text-sm text-slate-400 mt-0.5">{levelDef.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {questions.map((q) => (
              <div
                key={q.id}
                className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 space-y-1.5"
              >
                <div className="text-xs font-bold text-sky-400">{q.topic}</div>
                <div className="text-sm font-semibold text-white">{q.options[q.correctIndex]}</div>
                <p className="text-xs text-slate-400 leading-relaxed">{q.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

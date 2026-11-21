import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  Gauge,
  LogOut,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { StudentResultRecord, TeacherSettings, WordQuestion } from '../types/game';
import { DEFAULT_TEACHER_SETTINGS, exportStudentResultsToExcel } from '../utils/teacherStore';

interface TeacherDashboardViewProps {
  questions: WordQuestion[];
  settings: TeacherSettings;
  studentResults: StudentResultRecord[];
  onSaveQuestions: (updated: WordQuestion[]) => void;
  onResetQuestions: () => void;
  onUpdateSettings: (updated: TeacherSettings) => void;
  onClearResults: () => void;
  onLogout: () => void;
}

type TeacherTab = 'questions' | 'timing' | 'results';

interface QuestionFormState {
  id: string | null;
  level: 1 | 2 | 3 | 4;
  topic: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctIndex: number;
  explanation: string;
}

const EMPTY_FORM: QuestionFormState = {
  id: null,
  level: 1,
  topic: '',
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctIndex: 0,
  explanation: '',
};

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  questions,
  settings,
  studentResults,
  onSaveQuestions,
  onResetQuestions,
  onUpdateSettings,
  onClearResults,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<TeacherTab>('questions');
  const [filterLevel, setFilterLevel] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<QuestionFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmResetQuestions, setConfirmResetQuestions] = useState(false);
  const [confirmClearResults, setConfirmClearResults] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

  // Teacher PIN change state
  const [newPin, setNewPin] = useState(settings.teacherPin);

  const showToastNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(''), 2600);
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (filterLevel !== 0 && q.level !== filterLevel) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          q.question.toLowerCase().includes(term) ||
          q.topic.toLowerCase().includes(term) ||
          q.options.some((o) => o.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [questions, filterLevel, searchTerm]);

  const handleOpenAdd = () => {
    setForm({
      ...EMPTY_FORM,
      level: filterLevel === 0 ? 1 : filterLevel,
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleOpenEdit = (q: WordQuestion) => {
    setForm({
      id: q.id,
      level: q.level,
      topic: q.topic,
      question: q.question,
      optionA: q.options[0],
      optionB: q.options[1],
      optionC: q.options[2],
      optionD: q.options[3],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.topic.trim() || !form.question.trim()) {
      setFormError('Topik dan teks pertanyaan wajib diisi.');
      return;
    }
    if (!form.optionA.trim() || !form.optionB.trim() || !form.optionC.trim() || !form.optionD.trim()) {
      setFormError('Keempat pilihan jawaban (A, B, C, D) wajib diisi.');
      return;
    }

    const newQuestion: WordQuestion = {
      id: form.id ?? `custom-${Date.now()}`,
      level: form.level,
      topic: form.topic.trim(),
      question: form.question.trim(),
      options: [
        form.optionA.trim(),
        form.optionB.trim(),
        form.optionC.trim(),
        form.optionD.trim(),
      ],
      correctIndex: form.correctIndex,
      explanation:
        form.explanation.trim() ||
        `Jawaban yang tepat adalah ${
          [form.optionA, form.optionB, form.optionC, form.optionD][form.correctIndex]
        }.`,
    };

    if (form.id) {
      const updated = questions.map((item) => (item.id === form.id ? newQuestion : item));
      onSaveQuestions(updated);
      showToastNotice('Soal berhasil diperbarui.');
    } else {
      onSaveQuestions([newQuestion, ...questions]);
      showToastNotice('Soal baru berhasil ditambahkan.');
    }

    setFormOpen(false);
  };

  const handleDeleteQuestion = (q: WordQuestion) => {
    const sameLevelCount = questions.filter((item) => item.level === q.level).length;
    if (sameLevelCount <= 1) {
      showToastNotice(`Minimal harus tersisa 1 soal di Level ${q.level}.`);
      setConfirmDeleteId(null);
      return;
    }
    onSaveQuestions(questions.filter((item) => item.id !== q.id));
    setConfirmDeleteId(null);
    showToastNotice('Soal telah dihapus.');
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length < 3) {
      showToastNotice('PIN minimal 3 karakter.');
      return;
    }
    onUpdateSettings({ ...settings, teacherPin: newPin.trim() });
    showToastNotice('PIN guru berhasil diperbarui.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Halaman Guru — Kontrol Materi & Evaluasi
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Kelola soal Microsoft Word, atur kecepatan serta durasi tiap pertanyaan, dan unduh rekap nilai siswa ke Excel.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              {savedNotice}
            </span>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            Keluar Mode Guru
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'questions'
              ? 'bg-amber-400 text-slate-950'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          Kelola Bank Soal ({questions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('timing')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'timing'
              ? 'bg-amber-400 text-slate-950'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Gauge className="w-4 h-4" />
          Waktu & Kecepatan Soal
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('results')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'results'
              ? 'bg-amber-400 text-slate-950'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Hasil Siswa & Excel ({studentResults.length})
        </button>
      </div>

      {/* ================= TAB 1: BANK SOAL ================= */}
      {activeTab === 'questions' && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                {[0, 1, 2, 3, 4].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFilterLevel(lvl as 0 | 1 | 2 | 3 | 4)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      filterLevel === lvl
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl === 0 ? 'Semua Level' : `Level ${lvl}`}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari soal atau topik..."
                  className="pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 w-56 sm:w-64"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!confirmResetQuestions ? (
                <button
                  type="button"
                  onClick={() => setConfirmResetQuestions(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Pulihkan Soal Bawaan
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-amber-950/60 border border-amber-500/40 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-amber-200">Kembalikan soal awal?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onResetQuestions();
                      setConfirmResetQuestions(false);
                      showToastNotice('Bank soal dikembalikan ke bawaan.');
                    }}
                    className="px-2.5 py-1 rounded bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    Ya
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetQuestions(false)}
                    className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Tambah Soal Baru
              </button>
            </div>
          </div>

          {/* Question List */}
          <div className="grid grid-cols-1 gap-3">
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono-num font-bold text-amber-400">Level {q.level}</span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-semibold text-sky-400">{q.topic}</span>
                  </div>
                  <p className="text-sm font-bold text-white leading-snug">{q.question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`px-3 py-1.5 rounded-lg text-xs border ${
                          oIdx === q.correctIndex
                            ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300 font-semibold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="font-mono-num font-bold mr-1.5">
                          {['A', 'B', 'C', 'D'][oIdx]}.
                        </span>
                        {opt}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">
                    <span className="text-slate-300 font-semibold">Penjelasan:</span> {q.explanation}
                  </p>
                </div>

                {/* Row Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(q)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Ubah
                  </button>

                  {confirmDeleteId !== q.id ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(q.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/70 text-slate-300 hover:text-red-300 text-xs font-semibold border border-slate-700 hover:border-red-500/40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                      >
                        Ya, Hapus
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 2: WAKTU & KECEPATAN SOAL ================= */}
      {activeTab === 'timing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                Pengaturan Waktu & Kecepatan Pertanyaan
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Atur seberapa lama siswa memiliki kesempatan membaca dan menjawab setiap soal sebelum motor cross menabrak rintangan.
              </p>
            </div>

            {/* Question Duration Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="question-time-slider"
                  className="text-sm font-bold text-slate-200"
                >
                  Waktu per Pertanyaan
                </label>
                <span className="font-mono-num text-lg font-extrabold text-amber-400">
                  {settings.questionTimeSeconds} detik
                </span>
              </div>

              <input
                id="question-time-slider"
                type="range"
                min={8}
                max={30}
                step={1}
                value={settings.questionTimeSeconds}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    questionTimeSeconds: Number(e.target.value),
                  })
                }
                className="w-full accent-amber-400 cursor-pointer"
              />

              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { label: 'Cepat (10 dtk)', sec: 10 },
                  { label: 'Normal (15 dtk)', sec: 15 },
                  { label: 'Santai (20 dtk)', sec: 20 },
                  { label: 'Ekstra (25 dtk)', sec: 25 },
                ].map((preset) => (
                  <button
                    key={preset.sec}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ ...settings, questionTimeSeconds: preset.sec })
                    }
                    className={`px-2.5 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      settings.questionTimeSeconds === preset.sec
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Runner Cruising Speed Multiplier */}
            <div className="space-y-2.5 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200">Kecepatan Lari Atlet</span>
                <span className="font-mono-num text-sm font-bold text-sky-400">
                  {settings.speedMultiplier}×
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Mengatur kecepatan lari visual di lintasan (jarak gawang/rintangan otomatis menyesuaikan agar durasi baca soal tetap sesuai pilihan di atas).
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Santai (0.8×)', val: 0.8 },
                  { label: 'Standar (1.0×)', val: 1.0 },
                  { label: 'Agresif (1.25×)', val: 1.25 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, speedMultiplier: opt.val })}
                    className={`px-3 py-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      settings.speedMultiplier === opt.val
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Explanation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div>
                <div className="text-sm font-bold text-slate-200">
                  Tampilkan Penjelasan Singkat
                </div>
                <div className="text-xs text-slate-400">
                  Menampilkan pembahasan materi setelah siswa menjawab soal.
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    showExplanation: !settings.showExplanation,
                  })
                }
                className={`px-4 py-2 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                  settings.showExplanation
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-700 text-slate-400'
                }`}
              >
                {settings.showExplanation ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onUpdateSettings(DEFAULT_TEACHER_SETTINGS);
                  setNewPin(DEFAULT_TEACHER_SETTINGS.teacherPin);
                  showToastNotice('Pengaturan dikembalikan ke setelan standar.');
                }}
                className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Kembalikan Pengaturan Standar
              </button>
            </div>
          </div>

          {/* Teacher Security PIN Box */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 h-fit">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Keamanan Akses Guru</h2>
              <p className="text-xs text-slate-400 mt-1">
                Ubah PIN login guru agar siswa tidak dapat mengubah bank soal atau pengaturan lomba tanpa izin.
              </p>
            </div>

            <form onSubmit={handleSavePin} className="space-y-3">
              <div>
                <label htmlFor="new-pin-input" className="block text-xs font-semibold text-slate-300 mb-1">
                  PIN Guru Baru
                </label>
                <input
                  id="new-pin-input"
                  type="text"
                  maxLength={12}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono-num text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan PIN Baru
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= TAB 3: HASIL SISWA & DOWNLOAD EXCEL ================= */}
      {activeTab === 'results' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-slate-900 border border-slate-800 p-5">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                Rekap Hasil Evaluasi Siswa
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Setiap balapan yang selesai otomatis tercatat di sini dan dapat diunduh sebagai file Microsoft Excel (.xlsx).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {studentResults.length > 0 && !confirmClearResults && (
                <button
                  type="button"
                  onClick={() => setConfirmClearResults(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 text-xs font-semibold border border-slate-700 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus Riwayat
                </button>
              )}
              {confirmClearResults && (
                <div className="flex items-center gap-2 bg-red-950/70 border border-red-500/40 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-red-200">Hapus semua hasil?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearResults();
                      setConfirmClearResults(false);
                    }}
                    className="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Ya
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearResults(false)}
                    className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => exportStudentResultsToExcel(studentResults, questions)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-extrabold cursor-pointer whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Unduh Hasil Siswa (.xlsx)
              </button>
            </div>
          </div>

          {studentResults.length === 0 ? (
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-12 text-center">
              <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <div className="font-display text-2xl font-bold text-slate-200">
                Belum Ada Riwayat Hasil Siswa
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Mainkan satu sesi balapan bersama siswa untuk melihat catatan nilai, akurasi, dan mengekspornya ke Excel.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400">
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Mode & Level</th>
                    <th className="py-3 px-4 text-right">Benar</th>
                    <th className="py-3 px-4 text-right">Salah</th>
                    <th className="py-3 px-4 text-right">Akurasi</th>
                    <th className="py-3 px-4 text-right">Skor</th>
                    <th className="py-3 px-4 text-right">Peringkat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {studentResults.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 text-xs text-slate-400 font-mono-num whitespace-nowrap">
                        {new Date(r.dateIso).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white">{r.playerName}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-300">
                        {r.mode === 'tournament' ? 'Turnamen' : 'Tunggal'} · Level {r.levelReached}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-emerald-400 font-semibold">
                        {r.correctCount}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-red-400 font-semibold">
                        {r.wrongCount}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-slate-200 font-bold">
                        {r.accuracy}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-amber-400 font-extrabold">
                        {r.score}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-slate-300">
                        #{r.rank}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= ADD / EDIT QUESTION MODAL ================= */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label={form.id ? 'Ubah Soal Microsoft Word' : 'Tambah Soal Baru'}
        >
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="font-display text-2xl font-bold text-white">
                {form.id ? 'Ubah Pertanyaan' : 'Tambah Pertanyaan Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tingkat Level
                  </label>
                  <select
                    value={form.level}
                    onChange={(e) =>
                      setForm({ ...form, level: Number(e.target.value) as 1 | 2 | 3 | 4 })
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value={1}>Level 1 — Dasar Dokumen</option>
                    <option value={2}>Level 2 — Teks & Paragraf</option>
                    <option value={3}>Level 3 — Tabel & Tata Letak</option>
                    <option value={4}>Level 4 — Pintasan & Fitur Mahir</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Topik Materi
                  </label>
                  <input
                    type="text"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    placeholder="Contoh: Pintasan Keyboard"
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Teks Pertanyaan
                </label>
                <textarea
                  rows={2}
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  placeholder="Tuliskan soal tentang Microsoft Word..."
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'optionA', label: 'Pilihan A', idx: 0 },
                  { key: 'optionB', label: 'Pilihan B', idx: 1 },
                  { key: 'optionC', label: 'Pilihan C', idx: 2 },
                  { key: 'optionD', label: 'Pilihan D', idx: 3 },
                ].map((item) => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">{item.label}</label>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, correctIndex: item.idx })}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                          form.correctIndex === item.idx
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {form.correctIndex === item.idx ? 'Jawaban Benar' : 'Tandai Benar'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={form[item.key as keyof QuestionFormState] as string}
                      onChange={(e) => setForm({ ...form, [item.key]: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Penjelasan Singkat (Opsional)
                </label>
                <input
                  type="text"
                  value={form.explanation}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                  placeholder="Penjelasan ringkas mengapa jawaban tersebut benar..."
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {formError && (
                <div className="rounded-lg bg-red-950/70 border border-red-500/40 px-3 py-2 text-xs text-red-200">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Simpan Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

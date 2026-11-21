import * as XLSX from 'xlsx';
import { WORD_QUESTIONS } from '../data/wordQuestions';
import { StudentResultRecord, TeacherSettings, WordQuestion } from '../types/game';

const QUESTIONS_KEY = 'wordcross_arena_questions_v1';
const SETTINGS_KEY = 'wordcross_arena_teacher_settings_v1';
const RESULTS_KEY = 'wordcross_arena_student_results_v1';

export const DEFAULT_TEACHER_SETTINGS: TeacherSettings = {
  questionTimeSeconds: 15,
  speedMultiplier: 1.0,
  showExplanation: true,
  teacherPin: '1234',
};

export function loadQuestions(): WordQuestion[] {
  try {
    const raw = localStorage.getItem(QUESTIONS_KEY);
    if (!raw) return WORD_QUESTIONS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return WORD_QUESTIONS;
    return parsed;
  } catch {
    return WORD_QUESTIONS;
  }
}

export function saveQuestions(questions: WordQuestion[]): void {
  try {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
  } catch {
    // Ignore storage error
  }
}

export function resetQuestionsToDefault(): WordQuestion[] {
  try {
    localStorage.removeItem(QUESTIONS_KEY);
  } catch {
    // Ignore
  }
  return WORD_QUESTIONS;
}

export function loadTeacherSettings(): TeacherSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_TEACHER_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_TEACHER_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_TEACHER_SETTINGS;
  }
}

export function saveTeacherSettings(settings: TeacherSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function loadStudentResults(): StudentResultRecord[] {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function appendStudentResults(newRecords: StudentResultRecord[]): StudentResultRecord[] {
  const existing = loadStudentResults();
  const merged = [...newRecords, ...existing].slice(0, 500);
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(merged));
  } catch {
    // Ignore
  }
  return merged;
}

export function clearStudentResults(): void {
  try {
    localStorage.removeItem(RESULTS_KEY);
  } catch {
    // Ignore
  }
}

export function exportStudentResultsToExcel(
  results: StudentResultRecord[],
  questions: WordQuestion[]
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Hasil Evaluasi Siswa
  const detailRows = results.map((r, idx) => ({
    No: idx + 1,
    Tanggal: new Date(r.dateIso).toLocaleString('id-ID'),
    'Nama Siswa': r.playerName,
    'No. Motor': r.raceNumber,
    Mode: r.mode === 'tournament' ? 'Turnamen' : 'Tunggal',
    'Level Dicapai': `Level ${r.levelReached}`,
    'Peringkat Lomba': `#${r.rank}`,
    'Jawaban Benar': r.correctCount,
    'Jawaban Salah': r.wrongCount,
    'Total Soal Dijawab': r.totalQuestions,
    'Akurasi (%)': r.accuracy,
    'Streak Terbaik': r.maxStreak,
    'Bonus Diambil': r.bonusesCollected,
    'Skor Akhir': r.score,
  }));

  const wsDetails = XLSX.utils.json_to_sheet(
    detailRows.length > 0
      ? detailRows
      : [
          {
            Info: 'Belum ada hasil balapan siswa yang tercatat.',
          },
        ]
  );
  wsDetails['!cols'] = [
    { wch: 5 },
    { wch: 20 },
    { wch: 18 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Hasil Evaluasi Siswa');

  // Sheet 2: Rekap Per Siswa
  const studentMap = new Map<
    string,
    {
      races: number;
      totalCorrect: number;
      totalWrong: number;
      bestScore: number;
      totalScore: number;
    }
  >();

  for (const r of results) {
    const prev = studentMap.get(r.playerName) ?? {
      races: 0,
      totalCorrect: 0,
      totalWrong: 0,
      bestScore: 0,
      totalScore: 0,
    };
    prev.races += 1;
    prev.totalCorrect += r.correctCount;
    prev.totalWrong += r.wrongCount;
    prev.bestScore = Math.max(prev.bestScore, r.score);
    prev.totalScore += r.score;
    studentMap.set(r.playerName, prev);
  }

  const summaryRows = Array.from(studentMap.entries()).map(([name, st], idx) => {
    const attempts = st.totalCorrect + st.totalWrong;
    const avgAccuracy = attempts > 0 ? Math.round((st.totalCorrect / attempts) * 100) : 0;
    return {
      No: idx + 1,
      'Nama Siswa': name,
      'Jumlah Lomba': st.races,
      'Total Benar': st.totalCorrect,
      'Total Salah': st.totalWrong,
      'Rata-rata Akurasi (%)': avgAccuracy,
      'Skor Tertinggi': st.bestScore,
      'Rata-rata Skor': Math.round(st.totalScore / Math.max(1, st.races)),
    };
  });

  if (summaryRows.length > 0) {
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 5 },
      { wch: 20 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 22 },
      { wch: 16 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Rekap Per Siswa');
  }

  // Sheet 3: Bank Soal Microsoft Word
  const questionRows = questions.map((q, idx) => ({
    No: idx + 1,
    Level: `Level ${q.level}`,
    Topik: q.topic,
    Pertanyaan: q.question,
    'Pilihan A': q.options[0],
    'Pilihan B': q.options[1],
    'Pilihan C': q.options[2],
    'Pilihan D': q.options[3],
    'Kunci Jawaban': ['A', 'B', 'C', 'D'][q.correctIndex] ?? 'A',
    Penjelasan: q.explanation,
  }));

  const wsQuestions = XLSX.utils.json_to_sheet(questionRows);
  wsQuestions['!cols'] = [
    { wch: 5 },
    { wch: 10 },
    { wch: 20 },
    { wch: 52 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 14 },
    { wch: 46 },
  ];
  XLSX.utils.book_append_sheet(wb, wsQuestions, 'Bank Soal Aktif');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Hasil_Siswa_WordCross_Arena_${today}.xlsx`);
}

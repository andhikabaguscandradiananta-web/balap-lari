import React, { useState } from 'react';
import { Lock, LogIn, X } from 'lucide-react';

interface TeacherLoginModalProps {
  open: boolean;
  expectedPin: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const TeacherLoginModal: React.FC<TeacherLoginModalProps> = ({
  open,
  expectedPin,
  onClose,
  onSuccess,
}) => {
  const [username, setUsername] = useState('guru');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().toLowerCase() !== 'guru') {
      setError('Nama pengguna guru tidak sesuai (gunakan "guru").');
      return;
    }
    if (pin.trim() !== expectedPin) {
      setError('PIN / Kata sandi guru salah. Coba periksa kembali.');
      return;
    }
    setError('');
    setPin('');
    onSuccess();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Login Guru"
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-2xl font-bold text-white">Login Halaman Guru</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog login"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Masuk ke halaman guru untuk mengelola soal Microsoft Word, mengatur waktu & kecepatan pertanyaan, serta mengunduh laporan hasil siswa dalam format Excel.
          </p>

          <div>
            <label htmlFor="teacher-user" className="block text-xs font-semibold text-slate-300 mb-1">
              Nama Pengguna
            </label>
            <input
              id="teacher-user"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
              placeholder="guru"
              required
            />
          </div>

          <div>
            <label htmlFor="teacher-pin" className="block text-xs font-semibold text-slate-300 mb-1">
              PIN / Kata Sandi Guru
            </label>
            <input
              id="teacher-pin"
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white font-mono-num focus:outline-none focus:border-amber-400"
              placeholder="Masukkan PIN (bawaan: 1234)"
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-950/70 border border-red-500/40 px-3 py-2 text-xs text-red-200 font-medium">
              {error}
            </div>
          )}

          <div className="text-[11px] text-slate-400 bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2">
            Info akses awal: Pengguna <strong className="text-slate-200">guru</strong> · PIN bawaan{' '}
            <strong className="text-amber-300 font-mono-num">1234</strong> (dapat diubah di Pengaturan Guru).
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Masuk Guru
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

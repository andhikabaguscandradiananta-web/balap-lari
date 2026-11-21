import { LeaderboardEntry } from '../types/game';

const STORAGE_KEY = 'wordcross_arena_leaderboard_v1';

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveLeaderboardEntries(newEntries: LeaderboardEntry[]): LeaderboardEntry[] {
  const existing = loadLeaderboard();
  const merged = [...existing, ...newEntries]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.accuracy - a.accuracy;
    })
    .slice(0, 50);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Ignore quota errors
  }
  return merged;
}

export function clearLeaderboard(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

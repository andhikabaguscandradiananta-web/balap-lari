export type BikeColorId = 'red' | 'blue' | 'emerald' | 'orange' | 'violet' | 'gold';
export type HelmetStyleId = 'pro' | 'cyber' | 'eagle' | 'champ';
export type BikeModelId = 'trail' | 'mx' | 'turbo' | 'aero';

export interface BikeColorPalette {
  id: BikeColorId;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
  badgeBg: string;
  border: string;
  ring: string;
}

export interface PlayerConfig {
  id: number; // 0 to 3
  name: string;
  active: boolean;
  bikeColor: BikeColorId;
  helmetStyle: HelmetStyleId;
  bikeModel: BikeModelId;
  raceNumber: string;
}

export interface WordQuestion {
  id: string;
  level: 1 | 2 | 3 | 4;
  topic: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export type ObstacleKind = 'ramp' | 'mud' | 'tires' | 'logs' | 'hill';

export type BonusItemType = 'NITRO' | 'SHIELD' | 'DOUBLE_SCORE' | 'BONUS_POINTS';

export interface TrackObstacle {
  id: string;
  x: number;
  kind: ObstacleKind;
  question: WordQuestion;
  triggerX: number;
  resolved: 'pending' | 'cleared' | 'crashed' | 'shielded';
  answeredOptionIndex: number | null;
  answeredCorrectly: boolean | null;
  answerTimestamp: number | null;
  jumpTriggered?: boolean;
}

export interface TrackBonusItem {
  id: string;
  x: number;
  type: BonusItemType;
  collected: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingToast {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export interface PlayerRaceState {
  playerId: number;
  distance: number;
  speed: number;
  baseSpeed: number;
  jumpY: number;
  jumpVy: number;
  pitchAngle: number;
  wheelRotation: number;
  crashTimer: number;
  nitroTimer: number;
  shieldActive: boolean;
  doubleScoreActive: boolean;
  score: number;
  correctCount: number;
  wrongCount: number;
  streak: number;
  maxStreak: number;
  bonusesCollected: number;
  obstacles: TrackObstacle[];
  bonusItems: TrackBonusItem[];
  activeObstacleIndex: number | null;
  lastFeedback: {
    type: 'correct' | 'wrong' | 'shield' | 'bonus';
    title: string;
    detail: string;
    expiresAt: number;
  } | null;
  finished: boolean;
  finishTimeMs: number | null;
  finishRank: number | null;
  particles: Particle[];
  toasts: FloatingToast[];
}

export interface LevelDefinition {
  level: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
  circuitName: string;
  biome: 'meadow' | 'canyon' | 'golden' | 'stadium';
  obstacleCount: number;
  baseSpeed: number;
  trackLength: number;
  bonusCount: number;
  topics: string[];
}

export type RaceMode = 'tournament' | 'single';

export type AppScreen =
  | 'LOBBY'
  | 'GARAGE'
  | 'RACING'
  | 'LEVEL_COMPLETE'
  | 'PODIUM'
  | 'LEADERBOARD'
  | 'TEACHER';

export interface TeacherSettings {
  questionTimeSeconds: number; // Default 15 seconds (range 8..30)
  speedMultiplier: number; // 0.8 = Santai, 1.0 = Normal, 1.25 = Cepat
  showExplanation: boolean;
  teacherPin: string;
}

export interface StudentResultRecord {
  id: string;
  playerName: string;
  raceNumber: string;
  mode: RaceMode;
  levelReached: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  accuracy: number;
  maxStreak: number;
  bonusesCollected: number;
  score: number;
  rank: number;
  dateIso: string;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  accuracy: number;
  levelReached: number;
  mode: RaceMode;
  bikeColor: BikeColorId;
  bikeModel: BikeModelId;
  raceNumber: string;
  maxStreak: number;
  dateIso: string;
}

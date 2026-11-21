import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Flag,
  GraduationCap,
  Music,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wrench,
  Zap,
} from 'lucide-react';
import { BikePreviewSvg } from './components/BikePreviewSvg';
import { GarageView } from './components/GarageView';
import { LeaderboardView } from './components/LeaderboardView';
import { PlayerConsole } from './components/PlayerConsole';
import { PlayerSummaryStats, PodiumView } from './components/PodiumView';
import { TeacherDashboardView } from './components/TeacherDashboardView';
import { TeacherLoginModal } from './components/TeacherLoginModal';
import { TrackCanvas } from './components/TrackCanvas';
import { WordMaterialModal } from './components/WordMaterialModal';
import runningArenaHeroImg from './assets/images/running_arena_hero_1795272127368.jpg';
import {
  BIKE_COLOR_PALETTES,
  DEFAULT_PLAYERS,
  KEYBOARD_HINTS,
  LEVEL_DEFINITIONS,
  prepareShuffledQuestion,
  shuffleArray,
} from './data/wordQuestions';
import {
  AppScreen,
  BonusItemType,
  LeaderboardEntry,
  LevelDefinition,
  ObstacleKind,
  PlayerConfig,
  PlayerRaceState,
  RaceMode,
  StudentResultRecord,
  TeacherSettings,
  TrackBonusItem,
  TrackObstacle,
  WordQuestion,
} from './types/game';
import { clearLeaderboard, loadLeaderboard, saveLeaderboardEntries } from './utils/leaderboard';
import { soundEngine } from './utils/sound';
import {
  appendStudentResults,
  clearStudentResults,
  loadQuestions,
  loadStudentResults,
  loadTeacherSettings,
  resetQuestionsToDefault,
  saveQuestions,
  saveTeacherSettings,
} from './utils/teacherStore';

const OBSTACLE_KINDS: ObstacleKind[] = ['ramp', 'tires', 'logs', 'mud', 'hill'];
const BONUS_TYPES: BonusItemType[] = ['NITRO', 'SHIELD', 'DOUBLE_SCORE', 'BONUS_POINTS'];

function computeDynamicLevelDef(
  levelNum: 1 | 2 | 3 | 4,
  settings: TeacherSettings
): LevelDefinition {
  const baseDef = LEVEL_DEFINITIONS.find((l) => l.level === levelNum) ?? LEVEL_DEFINITIONS[0];
  const effectiveSpeed = Math.round(baseDef.baseSpeed * settings.speedMultiplier);
  const triggerDistance = Math.round(effectiveSpeed * settings.questionTimeSeconds);
  const cruisingGap = 280;
  const spacing = triggerDistance + cruisingGap;
  const firstObstacleX = triggerDistance + 240;
  const trackLength = firstObstacleX + (baseDef.obstacleCount - 1) * spacing + 420;

  return {
    ...baseDef,
    baseSpeed: effectiveSpeed,
    trackLength,
  };
}

function buildPlayerRaceState(
  playerId: number,
  levelNum: 1 | 2 | 3 | 4,
  questionBank: WordQuestion[],
  settings: TeacherSettings,
  carryStats?: PlayerSummaryStats
): PlayerRaceState {
  const dynamicDef = computeDynamicLevelDef(levelNum, settings);
  const filteredPool = questionBank.filter((q) => q.level === levelNum);
  const safePool = filteredPool.length > 0 ? filteredPool : questionBank;
  const levelPool = shuffleArray(safePool);

  const triggerDistance = Math.round(dynamicDef.baseSpeed * settings.questionTimeSeconds);
  const cruisingGap = 280;
  const spacing = triggerDistance + cruisingGap;
  const firstObstacleX = triggerDistance + 240;

  const obstacles: TrackObstacle[] = Array.from({ length: dynamicDef.obstacleCount }, (_, idx) => {
    const rawQ = levelPool[idx % levelPool.length];
    const q = prepareShuffledQuestion(rawQ);
    const obsX = Math.round(firstObstacleX + idx * spacing);
    return {
      id: `p${playerId}-l${levelNum}-obs${idx}`,
      x: obsX,
      kind: OBSTACLE_KINDS[(idx + playerId) % OBSTACLE_KINDS.length],
      question: q,
      triggerX: obsX - triggerDistance,
      resolved: 'pending',
      answeredOptionIndex: null,
      answeredCorrectly: null,
      answerTimestamp: null,
      jumpTriggered: false,
    };
  });

  // Place bonus pickups in cruising gaps before obstacles
  const bonusItems: TrackBonusItem[] = Array.from({ length: dynamicDef.bonusCount }, (_, idx) => {
    const obsIdx = idx % Math.max(1, obstacles.length);
    const targetObs = obstacles[obsIdx];
    const bonusX = Math.max(140, targetObs.triggerX - 130);
    return {
      id: `p${playerId}-l${levelNum}-bon${idx}`,
      x: Math.min(dynamicDef.trackLength - 180, bonusX),
      type: BONUS_TYPES[(idx + playerId + levelNum) % BONUS_TYPES.length],
      collected: false,
    };
  });

  return {
    playerId,
    distance: 0,
    speed: dynamicDef.baseSpeed,
    baseSpeed: dynamicDef.baseSpeed,
    jumpY: 0,
    jumpVy: 0,
    pitchAngle: 0,
    wheelRotation: 0,
    crashTimer: 0,
    nitroTimer: 0,
    shieldActive: false,
    doubleScoreActive: false,
    score: carryStats?.score ?? 0,
    correctCount: carryStats?.correctCount ?? 0,
    wrongCount: carryStats?.wrongCount ?? 0,
    streak: 0,
    maxStreak: carryStats?.maxStreak ?? 0,
    bonusesCollected: carryStats?.bonusesCollected ?? 0,
    obstacles,
    bonusItems,
    activeObstacleIndex: null,
    lastFeedback: null,
    finished: false,
    finishTimeMs: null,
    finishRank: null,
    particles: [],
    toasts: [],
  };
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('LOBBY');
  const [players, setPlayers] = useState<PlayerConfig[]>(DEFAULT_PLAYERS);
  const [raceMode, setRaceMode] = useState<RaceMode>('tournament');
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3 | 4>(1);
  const [currentLevel, setCurrentLevel] = useState<1 | 2 | 3 | 4>(1);
  const [muted, setMuted] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard());
  const [savedToLeaderboard, setSavedToLeaderboard] = useState(false);
  const [standingsSnapshot, setStandingsSnapshot] = useState<PlayerSummaryStats[]>([]);

  // Teacher state
  const [questions, setQuestions] = useState<WordQuestion[]>(() => loadQuestions());
  const [teacherSettings, setTeacherSettings] = useState<TeacherSettings>(() =>
    loadTeacherSettings()
  );
  const [studentResults, setStudentResults] = useState<StudentResultRecord[]>(() =>
    loadStudentResults()
  );
  const [teacherLoggedIn, setTeacherLoggedIn] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Live race states stored in ref for 60fps canvas + synced to React UI state
  const raceStatesRef = useRef<PlayerRaceState[]>([]);
  const [uiRaceStates, setUiRaceStates] = useState<PlayerRaceState[]>([]);
  const finishCounterRef = useRef(0);
  const raceStartTimeRef = useRef(0);
  const cumulativeStatsRef = useRef<Record<number, PlayerSummaryStats>>({});

  const activePlayers = players.filter((p) => p.active);

  const currentLevelDef = useMemo(
    () => computeDynamicLevelDef(currentLevel, teacherSettings),
    [currentLevel, teacherSettings]
  );

  const handleToggleMute = () => {
    const next = !muted;
    soundEngine.setMuted(next);
    setMuted(next);
  };

  const handleToggleMusic = () => {
    const next = !musicEnabled;
    soundEngine.setMusicEnabled(next);
    setMusicEnabled(next);
  };

  useEffect(() => {
    if (screen === 'RACING' && !paused) {
      soundEngine.startBackgroundMusic();
    } else {
      soundEngine.stopBackgroundMusic();
    }
    return () => {
      soundEngine.stopBackgroundMusic();
    };
  }, [screen, paused]);

  const handleUpdatePlayer = (id: number, patch: Partial<PlayerConfig>) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handleResetPlayers = () => {
    setPlayers(DEFAULT_PLAYERS);
  };

  const handleSaveQuestions = (updated: WordQuestion[]) => {
    setQuestions(updated);
    saveQuestions(updated);
  };

  const handleResetQuestions = () => {
    const restored = resetQuestionsToDefault();
    setQuestions(restored);
  };

  const handleUpdateSettings = (updated: TeacherSettings) => {
    setTeacherSettings(updated);
    saveTeacherSettings(updated);
  };

  const handleClearStudentResults = () => {
    clearStudentResults();
    setStudentResults([]);
  };

  const handleOpenTeacherPortal = () => {
    if (teacherLoggedIn) {
      setScreen('TEACHER');
    } else {
      setLoginModalOpen(true);
    }
  };

  const syncUiFromRef = useCallback(() => {
    setUiRaceStates(raceStatesRef.current.map((s) => ({ ...s })));
  }, []);

  const buildStandings = useCallback(
    (states: PlayerRaceState[]): PlayerSummaryStats[] => {
      const sorted = [...states].sort((a, b) => {
        if (a.finished !== b.finished) return a.finished ? -1 : 1;
        if (a.finished && b.finished && (a.finishRank ?? 9) !== (b.finishRank ?? 9)) {
          return (a.finishRank ?? 9) - (b.finishRank ?? 9);
        }
        if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
        if (a.wrongCount !== b.wrongCount) return a.wrongCount - b.wrongCount;
        if (b.score !== a.score) return b.score - a.score;
        return b.distance - a.distance;
      });
      return sorted.map((st, idx) => {
        const player = players.find((p) => p.id === st.playerId) ?? DEFAULT_PLAYERS[0];
        return {
          player,
          score: st.score,
          correctCount: st.correctCount,
          wrongCount: st.wrongCount,
          maxStreak: st.maxStreak,
          bonusesCollected: st.bonusesCollected,
          rank: idx + 1,
          finishedFirst: st.finished && st.finishRank === 1,
        };
      });
    },
    [players]
  );

  const recordStudentSessionResults = useCallback(
    (summary: PlayerSummaryStats[], lvl: 1 | 2 | 3 | 4) => {
      const nowIso = new Date().toISOString();
      const newRecords: StudentResultRecord[] = summary.map((s) => {
        const total = s.correctCount + s.wrongCount;
        const accuracy = total > 0 ? Math.round((s.correctCount / total) * 100) : 0;
        return {
          id: `res-${Date.now()}-${s.player.id}-${Math.random().toString(36).slice(2, 6)}`,
          playerName: s.player.name,
          raceNumber: s.player.raceNumber,
          mode: raceMode,
          levelReached: lvl,
          correctCount: s.correctCount,
          wrongCount: s.wrongCount,
          totalQuestions: total,
          accuracy,
          maxStreak: s.maxStreak,
          bonusesCollected: s.bonusesCollected,
          score: s.score,
          rank: s.rank,
          dateIso: nowIso,
        };
      });
      const updated = appendStudentResults(newRecords);
      setStudentResults(updated);
    },
    [raceMode]
  );

  const startLevelRace = useCallback(
    (levelNum: 1 | 2 | 3 | 4, keepCumulative: boolean) => {
      if (!keepCumulative) {
        cumulativeStatsRef.current = {};
      }
      setCurrentLevel(levelNum);
      setPaused(false);
      setSavedToLeaderboard(false);
      finishCounterRef.current = 0;

      const active = players.filter((p) => p.active);
      const initialStates = active.map((p) =>
        buildPlayerRaceState(
          p.id,
          levelNum,
          questions,
          teacherSettings,
          keepCumulative ? cumulativeStatsRef.current[p.id] : undefined
        )
      );

      raceStatesRef.current = initialStates;
      setUiRaceStates(initialStates);
      setScreen('RACING');
      setCountdown(3);
      soundEngine.playCountdown(false);
    },
    [players, questions, teacherSettings]
  );

  const handleStartNewRace = () => {
    const startLvl = raceMode === 'tournament' ? 1 : selectedLevel;
    startLevelRace(startLvl, false);
  };

  // Countdown Timer (3 -> 2 -> 1 -> GO!)
  useEffect(() => {
    if (screen !== 'RACING' || countdown === null) return;
    if (countdown <= 0) {
      raceStartTimeRef.current = performance.now();
      const timer = setTimeout(() => setCountdown(null), 550);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      const next = countdown - 1;
      setCountdown(next);
      soundEngine.playCountdown(next === 0);
    }, 750);
    return () => clearTimeout(timer);
  }, [screen, countdown]);

  const addToast = (st: PlayerRaceState, text: string, color: string) => {
    st.toasts.push({
      id: `${Date.now()}-${Math.random()}`,
      text,
      color,
      x: st.distance + 10,
      y: 58,
      life: 1.15,
      maxLife: 1.15,
    });
  };

  const addBurstParticles = (st: PlayerRaceState, color: string, count = 14) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 140;
      st.particles.push({
        x: st.distance,
        y: 16 + st.jumpY,
        vx: Math.cos(angle) * spd,
        vy: Math.abs(Math.sin(angle) * spd) + 40,
        radius: 2.5 + Math.random() * 3.5,
        color,
        alpha: 1,
        life: 0.55 + Math.random() * 0.35,
        maxLife: 0.9,
      });
    }
  };

  const handleAnswer = useCallback(
    (playerId: number, optionIndex: number) => {
      if (screen !== 'RACING' || paused || (countdown !== null && countdown > 0)) return;
      const st = raceStatesRef.current.find((s) => s.playerId === playerId);
      if (!st || st.finished || st.activeObstacleIndex === null) return;

      const obs = st.obstacles[st.activeObstacleIndex];
      if (!obs || obs.resolved !== 'pending' || obs.answeredOptionIndex !== null) return;

      obs.answeredOptionIndex = optionIndex;
      obs.answerTimestamp = performance.now();
      const isCorrect = optionIndex === obs.question.correctIndex;
      obs.answeredCorrectly = isCorrect;

      if (isCorrect) {
        obs.resolved = 'cleared';
        st.correctCount += 1;
        st.streak += 1;
        if (st.streak > st.maxStreak) st.maxStreak = st.streak;

        const distLeftRatio = Math.max(
          0,
          Math.min(1, (obs.x - st.distance) / Math.max(1, obs.x - obs.triggerX))
        );
        const speedBonus = Math.round(distLeftRatio * 40);
        const streakBonus = (st.streak - 1) * 20;
        let gained = 100 + speedBonus + streakBonus;
        if (st.doubleScoreActive) {
          gained *= 2;
          st.doubleScoreActive = false;
        }
        st.score += gained;

        // If bike is close to obstacle, jump immediately; otherwise surge forward and jump at obstacle
        if (obs.x - st.distance <= 85) {
          obs.jumpTriggered = true;
          st.jumpVy = 270;
          soundEngine.playJump();
        }
        st.speed = st.baseSpeed * 2.4;

        addBurstParticles(st, '#FACC15', 16);
        addToast(st, `+${gained} BENAR!`, '#4ADE80');

        st.lastFeedback = {
          type: 'correct',
          title: `BENAR! +${gained}`,
          detail: teacherSettings.showExplanation
            ? obs.question.explanation
            : 'Melompat mulus melewati rintangan!',
          expiresAt: Date.now() + 2000,
        };

        if (st.streak > 0 && st.streak % 3 === 0) {
          st.nitroTimer = Math.max(st.nitroTimer, 2.2);
          addToast(st, 'STREAK NITRO!', '#38BDF8');
        }

        soundEngine.playCorrect();
        st.activeObstacleIndex = null;
      } else {
        if (st.shieldActive) {
          st.shieldActive = false;
          obs.resolved = 'shielded';
          if (obs.x - st.distance <= 85) {
            obs.jumpTriggered = true;
            st.jumpVy = 235;
          }
          st.speed = st.baseSpeed * 1.9;
          addBurstParticles(st, '#10B981', 14);
          addToast(st, 'PERISAI AKTIF!', '#34D399');
          st.lastFeedback = {
            type: 'shield',
            title: 'PERISAI MENYELAMATKAN!',
            detail: teacherSettings.showExplanation
              ? `Jawaban tepat: ${obs.question.options[obs.question.correctIndex]}`
              : 'Perisai menahan rintangan!',
            expiresAt: Date.now() + 2200,
          };
          soundEngine.playShieldSave();
          st.activeObstacleIndex = null;
        } else {
          obs.resolved = 'crashed';
          st.wrongCount += 1;
          st.streak = 0;
          st.crashTimer = 1.6;
          st.speed = 0;
          addBurstParticles(st, '#EF4444', 18);
          addToast(st, 'TERJATUH!', '#F87171');
          st.lastFeedback = {
            type: 'wrong',
            title: 'TERJATUH!',
            detail: teacherSettings.showExplanation
              ? `Jawaban tepat: ${obs.question.options[obs.question.correctIndex]}`
              : 'Tetap semangat untuk rintangan berikutnya!',
            expiresAt: Date.now() + 2300,
          };
          soundEngine.playWrong();
          st.activeObstacleIndex = null;
        }
      }

      syncUiFromRef();
    },
    [screen, paused, countdown, teacherSettings.showExplanation, syncUiFromRef]
  );

  // Keyboard bindings for 4 simultaneous players
  useEffect(() => {
    if (screen !== 'RACING') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      const keyUpper = e.key.toUpperCase();
      KEYBOARD_HINTS.forEach((keys, pIdx) => {
        const optIdx = keys.indexOf(keyUpper);
        if (optIdx !== -1) {
          handleAnswer(pIdx, optIdx);
        }
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, handleAnswer]);

  // Core 60fps Game Simulation Loop
  useEffect(() => {
    if (screen !== 'RACING') return;

    let animId = 0;
    let lastTime = performance.now();
    let lastUiSync = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const isCountdownActive = countdown !== null && countdown > 0;
      const levelDef = computeDynamicLevelDef(currentLevel, teacherSettings);

      if (!paused && !isCountdownActive) {
        let firstFinisher: PlayerRaceState | null = null;
        let bestOvershoot = -1;

        for (const st of raceStatesRef.current) {
          st.particles = st.particles.filter((pt) => {
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vy -= 260 * dt;
            if (pt.y < 0) pt.y = 0;
            pt.life -= dt;
            return pt.life > 0;
          });

          st.toasts = st.toasts.filter((t) => {
            t.y += 28 * dt;
            t.life -= dt;
            return t.life > 0;
          });

          if (st.finished) continue;

          if (st.crashTimer > 0) {
            st.crashTimer = Math.max(0, st.crashTimer - dt);
            st.speed = 0;
            continue;
          }

          if (st.nitroTimer > 0) {
            st.nitroTimer = Math.max(0, st.nitroTimer - dt);
          }

          // Check if runner has already answered the upcoming obstacle correctly and is surging toward it
          const surgingToClearedObs = st.obstacles.find(
            (o) =>
              (o.resolved === 'cleared' || o.resolved === 'shielded') &&
              !o.jumpTriggered &&
              o.x >= st.distance - 10
          );

          const scoreSpeedAdj =
            Math.min(35, st.correctCount * 5) - Math.min(18, st.wrongCount * 4);
          let targetSpeed =
            st.nitroTimer > 0
              ? (st.baseSpeed + Math.max(0, scoreSpeedAdj)) * 1.8
              : Math.max(60, st.baseSpeed + scoreSpeedAdj);
          if (surgingToClearedObs) {
            const distGap = Math.max(80, surgingToClearedObs.x - st.distance);
            targetSpeed = Math.max(targetSpeed, Math.min(720, distGap * 2.2));
          }

          st.speed += (targetSpeed - st.speed) * Math.min(1, dt * 5.2);
          st.distance += st.speed * dt;
          st.wheelRotation += (st.speed * dt) / 10;

          if (st.jumpY <= 1 && Math.random() < 0.45) {
            st.particles.push({
              x: st.distance - 22,
              y: 4,
              vx: -40 - Math.random() * 50,
              vy: 20 + Math.random() * 35,
              radius: 2 + Math.random() * 2.5,
              color: st.nitroTimer > 0 ? '#38BDF8' : '#D97706',
              alpha: 0.8,
              life: 0.35,
              maxLife: 0.35,
            });
          }

          if (st.jumpY > 0 || st.jumpVy > 0) {
            st.jumpY += st.jumpVy * dt;
            st.jumpVy -= 680 * dt;
            st.pitchAngle = Math.max(-0.42, Math.min(0.28, -st.jumpVy / 650));
            if (st.jumpY <= 0) {
              st.jumpY = 0;
              st.jumpVy = 0;
              st.pitchAngle = 0;
            }
          } else {
            st.pitchAngle = st.nitroTimer > 0 ? -0.09 : 0;
          }

          // Bonus pickup collision
          for (const item of st.bonusItems) {
            if (!item.collected && Math.abs(st.distance - item.x) < 28) {
              item.collected = true;
              st.bonusesCollected += 1;
              soundEngine.playBonus();

              if (item.type === 'NITRO') {
                st.nitroTimer = 2.8;
                soundEngine.playEngineRev(true);
                addBurstParticles(st, '#38BDF8', 14);
                addToast(st, 'SPRINT TURBO!', '#38BDF8');
              } else if (item.type === 'SHIELD') {
                st.shieldActive = true;
                addBurstParticles(st, '#10B981', 14);
                addToast(st, 'PERISAI AKTIF!', '#34D399');
              } else if (item.type === 'DOUBLE_SCORE') {
                st.doubleScoreActive = true;
                addBurstParticles(st, '#A855F7', 14);
                addToast(st, 'SKOR 2×!', '#C084FC');
              } else {
                st.score += 150;
                addBurstParticles(st, '#EAB308', 14);
                addToast(st, '+150 BONUS!', '#FACC15');
              }
            }
          }

          // Obstacle Trigger, Surge Jump & Collision
          st.obstacles.forEach((obs, obsIdx) => {
            if (
              (obs.resolved === 'cleared' || obs.resolved === 'shielded') &&
              !obs.jumpTriggered &&
              st.distance >= obs.x - 45
            ) {
              obs.jumpTriggered = true;
              st.jumpVy = 270;
              soundEngine.playJump();
            }

            if (obs.resolved !== 'pending') return;

            if (st.distance >= obs.triggerX && st.distance < obs.x - 18) {
              if (st.activeObstacleIndex !== obsIdx) {
                st.activeObstacleIndex = obsIdx;
              }
            }

            if (st.distance >= obs.x - 16) {
              if (st.nitroTimer > 0) {
                obs.resolved = 'cleared';
                obs.jumpTriggered = true;
                st.correctCount += 1;
                st.score += 120;
                st.jumpVy = 270;
                addBurstParticles(st, '#38BDF8', 14);
                addToast(st, 'NITRO LOMPAT! +120', '#38BDF8');
                soundEngine.playJump();
                if (st.activeObstacleIndex === obsIdx) st.activeObstacleIndex = null;
              } else if (st.shieldActive) {
                st.shieldActive = false;
                obs.resolved = 'shielded';
                obs.jumpTriggered = true;
                st.jumpVy = 235;
                addBurstParticles(st, '#10B981', 14);
                addToast(st, 'PERISAI!', '#34D399');
                soundEngine.playShieldSave();
                if (st.activeObstacleIndex === obsIdx) st.activeObstacleIndex = null;
              } else {
                obs.resolved = 'crashed';
                st.wrongCount += 1;
                st.streak = 0;
                st.crashTimer = 1.65;
                st.speed = 0;
                addBurstParticles(st, '#EF4444', 18);
                addToast(st, 'TERJATUH!', '#F87171');
                st.lastFeedback = {
                  type: 'wrong',
                  title: 'WAKTU HABIS & TERJATUH!',
                  detail: teacherSettings.showExplanation
                    ? `Jawaban tepat: ${obs.question.options[obs.question.correctIndex]}`
                    : 'Coba jawab lebih cepat pada rintangan berikutnya!',
                  expiresAt: Date.now() + 2300,
                };
                soundEngine.playWrong();
                if (st.activeObstacleIndex === obsIdx) st.activeObstacleIndex = null;
              }
            }
          });

          // Finish Line check: first runner to cross immediately wins #1 and stops the race
          if (st.distance >= levelDef.trackLength) {
            const overshoot = st.distance - levelDef.trackLength;
            if (
              !firstFinisher ||
              overshoot > bestOvershoot ||
              (overshoot === bestOvershoot && st.correctCount > firstFinisher.correctCount)
            ) {
              firstFinisher = st;
              bestOvershoot = overshoot;
            }
          }
        }

        if (firstFinisher && raceStatesRef.current.length > 0) {
          for (const st of raceStatesRef.current) {
            if (st.playerId === firstFinisher.playerId) {
              st.distance = levelDef.trackLength;
              st.finished = true;
              finishCounterRef.current = 1;
              st.finishRank = 1;
              st.finishTimeMs = now - raceStartTimeRef.current;
              st.score += 200;
              addToast(st, 'FINIS #1! +200', '#FACC15');
            } else if (st.distance >= levelDef.trackLength) {
              st.distance = levelDef.trackLength - 1;
            }
          }
          soundEngine.playFinishFanfare();
          syncUiFromRef();

          const summary = buildStandings(raceStatesRef.current);
          summary.forEach((item) => {
            cumulativeStatsRef.current[item.player.id] = item;
          });
          setStandingsSnapshot(summary);
          if (raceMode === 'tournament' && currentLevel < 4) {
            setScreen('LEVEL_COMPLETE');
          } else {
            recordStudentSessionResults(summary, currentLevel);
            setScreen('PODIUM');
          }
          return;
        }
      }

      if (now - lastUiSync > 90) {
        lastUiSync = now;
        syncUiFromRef();
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [
    screen,
    paused,
    countdown,
    currentLevel,
    raceMode,
    teacherSettings,
    buildStandings,
    recordStudentSessionResults,
    syncUiFromRef,
  ]);

  const handleFinishEarly = () => {
    const summary = buildStandings(raceStatesRef.current);
    summary.forEach((item) => {
      cumulativeStatsRef.current[item.player.id] = item;
    });
    setStandingsSnapshot(summary);
    recordStudentSessionResults(summary, currentLevel);
    setScreen('PODIUM');
  };

  const handleSaveToLeaderboard = () => {
    if (savedToLeaderboard) return;
    const newEntries: LeaderboardEntry[] = standingsSnapshot.map((s) => {
      const total = s.correctCount + s.wrongCount;
      const accuracy = total > 0 ? Math.round((s.correctCount / total) * 100) : 0;
      return {
        id: `${Date.now()}-${s.player.id}-${Math.random().toString(36).slice(2, 7)}`,
        playerName: s.player.name,
        score: s.score,
        accuracy,
        levelReached: currentLevel,
        mode: raceMode,
        bikeColor: s.player.bikeColor,
        bikeModel: s.player.bikeModel,
        raceNumber: s.player.raceNumber,
        maxStreak: s.maxStreak,
        dateIso: new Date().toISOString(),
      };
    });
    const updated = saveLeaderboardEntries(newEntries);
    setLeaderboard(updated);
    setSavedToLeaderboard(true);
  };

  const handleClearLeaderboard = () => {
    clearLeaderboard();
    setLeaderboard([]);
  };

  const liveRankMap = new Map<number, number>();
  [...uiRaceStates]
    .sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.finished && b.finished && (a.finishRank ?? 9) !== (b.finishRank ?? 9)) {
        return (a.finishRank ?? 9) - (b.finishRank ?? 9);
      }
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      if (a.wrongCount !== b.wrongCount) return a.wrongCount - b.wrongCount;
      if (b.score !== a.score) return b.score - a.score;
      return b.distance - a.distance;
    })
    .forEach((st, idx) => liveRankMap.set(st.playerId, idx + 1));

  // ================= RENDER ACTIVE RACING VIEW =================
  if (screen === 'RACING') {
    const gridCols =
      activePlayers.length === 2
        ? 'grid-cols-2'
        : activePlayers.length === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4';

    return (
      <div className="min-h-screen md:h-screen w-full flex flex-col bg-slate-950 md:overflow-hidden">
        <header className="flex items-center justify-between gap-4 px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-display text-xl font-extrabold text-amber-400 tracking-wide whitespace-nowrap">
              WordCross Arena
            </span>
            <span className="text-slate-600 hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
              {currentLevelDef.title} — {currentLevelDef.circuitName} ({teacherSettings.questionTimeSeconds} dtk/soal)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleMusic}
              aria-label={musicEnabled ? 'Matikan musik latar' : 'Nyalakan musik latar'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer whitespace-nowrap transition-colors ${
                musicEnabled && !muted
                  ? 'bg-amber-400/15 text-amber-300 border-amber-400/40 hover:bg-amber-400/25'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{musicEnabled ? 'Musik: ON' : 'Musik: OFF'}</span>
            </button>
            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={muted ? 'Aktifkan suara' : 'Bisukan suara'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold border border-slate-700 cursor-pointer whitespace-nowrap"
            >
              {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {paused ? 'Lanjut' : 'Jeda'}
            </button>
            <button
              type="button"
              onClick={handleFinishEarly}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 text-xs font-bold border border-amber-400/40 cursor-pointer whitespace-nowrap"
            >
              <Flag className="w-3.5 h-3.5" />
              Selesaikan
            </button>
            <button
              type="button"
              onClick={() => setScreen('LOBBY')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/70 text-slate-300 hover:text-red-200 text-xs font-semibold border border-slate-700 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Keluar
            </button>
          </div>
        </header>

        <div className="relative h-[44vh] min-h-[250px] max-h-[450px] shrink-0">
          <TrackCanvas
            players={players}
            raceStatesRef={raceStatesRef}
            levelDef={currentLevelDef}
            paused={paused}
          />

          {countdown !== null && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/65 pointer-events-none">
              <div className="text-center">
                <div className="font-display text-7xl sm:text-9xl font-extrabold text-amber-400 drop-shadow-lg">
                  {countdown > 0 ? countdown : 'GAS!'}
                </div>
                <div className="text-sm sm:text-base font-bold text-white tracking-wide mt-1">
                  Siapkan jari di papan interaktif!
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`flex-1 min-h-0 p-2.5 bg-slate-950 grid ${gridCols} gap-2.5`}>
          {activePlayers.map((player) => {
            const st = uiRaceStates.find((s) => s.playerId === player.id);
            if (!st) return null;
            return (
              <PlayerConsole
                key={player.id}
                player={player}
                raceState={st}
                rank={liveRankMap.get(player.id) ?? 1}
                trackLength={currentLevelDef.trackLength}
                onAnswer={handleAnswer}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ================= RENDER STANDARD SHELL =================
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-4 sm:px-6 py-3.5">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setScreen('LOBBY')}
            className="font-display text-2xl font-extrabold tracking-tight text-amber-400 whitespace-nowrap shrink-0 cursor-pointer"
          >
            WordCross Arena
          </button>

          {/* Zone 2: Concise Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-300">
            <button
              type="button"
              onClick={() => setScreen('LOBBY')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                screen === 'LOBBY' ? 'text-white underline decoration-amber-400 underline-offset-8 decoration-2' : ''
              }`}
            >
              Arena Lomba
            </button>
            <button
              type="button"
              onClick={() => setScreen('GARAGE')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                screen === 'GARAGE' ? 'text-white underline decoration-amber-400 underline-offset-8 decoration-2' : ''
              }`}
            >
              Kustomisasi Pelari
            </button>
            <button
              type="button"
              onClick={() => setScreen('LEADERBOARD')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                screen === 'LEADERBOARD' ? 'text-white underline decoration-amber-400 underline-offset-8 decoration-2' : ''
              }`}
            >
              Papan Peringkat
            </button>
            <button
              type="button"
              onClick={() => setMaterialOpen(true)}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Materi Word
            </button>
            <button
              type="button"
              onClick={handleOpenTeacherPortal}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                screen === 'TEACHER' ? 'text-white underline decoration-amber-400 underline-offset-8 decoration-2' : ''
              }`}
            >
              {teacherLoggedIn ? 'Halaman Guru' : 'Login Guru'}
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleStartNewRace}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              Mulai Lomba
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Secondary Nav */}
        <nav className="md:hidden flex items-center gap-4 px-4 pb-2.5 text-xs font-semibold text-slate-300 overflow-x-auto border-t border-slate-900 pt-2">
          <button
            type="button"
            onClick={() => setScreen('LOBBY')}
            className={`whitespace-nowrap shrink-0 cursor-pointer ${
              screen === 'LOBBY' ? 'text-amber-400' : ''
            }`}
          >
            Arena Lomba
          </button>
          <button
            type="button"
            onClick={() => setScreen('GARAGE')}
            className={`whitespace-nowrap shrink-0 cursor-pointer ${
              screen === 'GARAGE' ? 'text-amber-400' : ''
            }`}
          >
            Kustomisasi Pelari
          </button>
          <button
            type="button"
            onClick={() => setScreen('LEADERBOARD')}
            className={`whitespace-nowrap shrink-0 cursor-pointer ${
              screen === 'LEADERBOARD' ? 'text-amber-400' : ''
            }`}
          >
            Papan Peringkat
          </button>
          <button
            type="button"
            onClick={() => setMaterialOpen(true)}
            className="whitespace-nowrap shrink-0 cursor-pointer"
          >
            Materi Word
          </button>
          <button
            type="button"
            onClick={handleOpenTeacherPortal}
            className={`whitespace-nowrap shrink-0 cursor-pointer ${
              screen === 'TEACHER' ? 'text-amber-400' : ''
            }`}
          >
            {teacherLoggedIn ? 'Halaman Guru' : 'Login Guru'}
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {screen === 'TEACHER' && (
          <TeacherDashboardView
            questions={questions}
            settings={teacherSettings}
            studentResults={studentResults}
            onSaveQuestions={handleSaveQuestions}
            onResetQuestions={handleResetQuestions}
            onUpdateSettings={handleUpdateSettings}
            onClearResults={handleClearStudentResults}
            onLogout={() => {
              setTeacherLoggedIn(false);
              setScreen('LOBBY');
            }}
          />
        )}

        {screen === 'GARAGE' && (
          <GarageView
            players={players}
            onUpdatePlayer={handleUpdatePlayer}
            onResetPlayers={handleResetPlayers}
            onStartRace={handleStartNewRace}
          />
        )}

        {screen === 'LEADERBOARD' && (
          <LeaderboardView
            entries={leaderboard}
            onClearLeaderboard={handleClearLeaderboard}
            onBackToLobby={() => setScreen('LOBBY')}
          />
        )}

        {(screen === 'LEVEL_COMPLETE' || screen === 'PODIUM') && (
          <PodiumView
            isFinalPodium={screen === 'PODIUM'}
            currentLevel={currentLevel}
            raceMode={raceMode}
            standings={standingsSnapshot}
            savedToLeaderboard={savedToLeaderboard}
            onSaveToLeaderboard={handleSaveToLeaderboard}
            onNextLevel={() => startLevelRace((currentLevel + 1) as 1 | 2 | 3 | 4, true)}
            onPlayAgain={handleStartNewRace}
            onOpenLeaderboard={() => setScreen('LEADERBOARD')}
            onBackToLobby={() => setScreen('LOBBY')}
          />
        )}

        {screen === 'LOBBY' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
            {/* Hero Split Banner */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-amber-400 tracking-wide">
                    Papan Interaktif Digital · 2–4 Pemain Serentak · {teacherSettings.questionTimeSeconds} Detik/Soal
                  </div>
                  <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white leading-[1.05] text-balance">
                    Taklukkan Lomba Lari Rintangan dengan Penguasaan Microsoft Word
                  </h1>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                    Empat siswa berlari bersama di satu layar papan interaktif. Jawab soal Microsoft Word sebelum menyentuh gawang agar pelari melompat mulus, raih item bonus, dan rebut posisi puncak!
                  </p>
                </div>

                {/* Mode & Level Selector */}
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 mr-1">Mode Balap:</span>
                    <div className="inline-flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setRaceMode('tournament')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                          raceMode === 'tournament'
                            ? 'bg-amber-400 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Turnamen (Level 1–4)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRaceMode('single')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                          raceMode === 'single'
                            ? 'bg-amber-400 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Pilih 1 Level
                      </button>
                    </div>
                  </div>

                  {raceMode === 'single' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {LEVEL_DEFINITIONS.map((lvl) => (
                        <button
                          key={lvl.level}
                          type="button"
                          onClick={() => setSelectedLevel(lvl.level)}
                          className={`px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                            selectedLevel === lvl.level
                              ? 'bg-amber-400/15 border-amber-400 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="font-display text-base font-bold text-amber-400">
                            Level {lvl.level}
                          </div>
                          <div className="text-[11px] leading-tight line-clamp-1">
                            {lvl.circuitName}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleStartNewRace}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-extrabold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Mulai Lomba ({activePlayers.length} Pelari)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScreen('GARAGE')}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Wrench className="w-4 h-4 text-sky-400" />
                      Kustomisasi Pelari
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaterialOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      Materi Word
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenTeacherPortal}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-sm font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <GraduationCap className="w-4 h-4" />
                      {teacherLoggedIn ? 'Halaman Guru' : 'Login Guru'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Hero Visual Image */}
              <div className="lg:col-span-6 relative min-h-[260px]">
                <img
                  src={runningArenaHeroImg}
                  alt="Arena Lomba Lari Rintangan WordCross"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent lg:bg-gradient-to-r lg:from-slate-900 lg:via-transparent lg:to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200 bg-slate-950/80 backdrop-blur-sm border border-slate-800 rounded-xl px-4 py-2.5">
                  <span className="font-semibold">
                    {raceMode === 'tournament'
                      ? 'Mode Turnamen: 4 Lintasan Berurutan'
                      : `Pilihan Lintasan: ${LEVEL_DEFINITIONS[selectedLevel - 1].circuitName}`}
                  </span>
                  <span className="font-mono-num text-amber-400 font-bold">
                    {teacherSettings.questionTimeSeconds} Detik/Soal · {questions.length} Soal Aktif
                  </span>
                </div>
              </div>
            </section>

            {/* Active Players Roster Preview */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <h2 className="font-display text-2xl font-bold text-white">
                    Susunan Pelari Siap Berlomba
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setScreen('GARAGE')}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  Ubah Nama &amp; Kostum →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {players.map((p) => {
                  const palette =
                    BIKE_COLOR_PALETTES.find((c) => c.id === p.bikeColor) ?? BIKE_COLOR_PALETTES[0];
                  return (
                    <div
                      key={p.id}
                      onClick={() => setScreen('GARAGE')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setScreen('GARAGE');
                      }}
                      className={`rounded-xl border p-4 transition-all cursor-pointer hover:border-slate-500 ${
                        p.active
                          ? 'bg-slate-900 border-slate-800'
                          : 'bg-slate-900/40 border-slate-800/60 opacity-55'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center justify-center w-7 h-7 rounded font-display text-sm font-bold text-white"
                            style={{ backgroundColor: palette.primary }}
                          >
                            P{p.id + 1}
                          </span>
                          <span className="font-bold text-white text-sm">{p.name}</span>
                        </div>
                        <span className="text-xs font-mono-num text-slate-400">
                          {p.active ? `#${p.raceNumber}` : 'Nonaktif'}
                        </span>
                      </div>
                      <BikePreviewSvg
                        bikeColor={p.bikeColor}
                        helmetStyle={p.helmetStyle}
                        bikeModel={p.bikeModel}
                        raceNumber={p.raceNumber}
                        className="w-full h-24"
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Bonus Items & Level Progression Info Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">
                    Item Bonus di Setiap Level
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ambil peti bonus di sepanjang lintasan untuk membantu melewati rintangan.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                      <Zap className="w-4 h-4" /> Sprint Turbo
                    </div>
                    <p className="text-xs text-slate-400">
                      Berlari super cepat dan otomatis melompati 1 rintangan gawang.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <Shield className="w-4 h-4" /> Perisai Energi
                    </div>
                    <p className="text-xs text-slate-400">
                      Melindungi pelari agar tidak terjatuh jika salah menjawab 1 soal.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                      <Sparkles className="w-4 h-4" /> Skor Ganda 2×
                    </div>
                    <p className="text-xs text-slate-400">
                      Menggandakan poin pada jawaban benar berikutnya.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                      <Trophy className="w-4 h-4" /> Bonus +150 Poin
                    </div>
                    <p className="text-xs text-slate-400">
                      Langsung menambahkan +150 poin ekstra ke skor pelari.
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white">
                      Tingkatan Level Materi Microsoft Word
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Semakin tinggi level, kecepatan lari bertambah dan materi semakin menantang.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScreen('LEADERBOARD')}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer whitespace-nowrap"
                  >
                    Lihat Papan Peringkat →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {LEVEL_DEFINITIONS.map((lvl) => (
                    <div
                      key={lvl.level}
                      className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-display text-base font-bold text-amber-400">
                          {lvl.title}
                        </span>
                        <span className="font-mono-num text-slate-400">
                          {lvl.obstacleCount} Soal
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-snug">{lvl.subtitle}</p>
                      <div className="text-[11px] text-slate-400 pt-1">
                        {lvl.topics.join(' · ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      <WordMaterialModal
        open={materialOpen}
        questions={questions}
        onClose={() => setMaterialOpen(false)}
      />

      <TeacherLoginModal
        open={loginModalOpen}
        expectedPin={teacherSettings.teacherPin}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={() => {
          setTeacherLoggedIn(true);
          setLoginModalOpen(false);
          setScreen('TEACHER');
        }}
      />
    </div>
  );
}

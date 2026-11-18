import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  Archive,
  Award,
  Check,
  ChevronRight,
  Eye,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Search,
  Star,
  Trophy,
  User as UserIcon,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ArchiveModal } from './components/ArchiveModal';
import { AvatarEmblem } from './components/AvatarEmblem';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ProfileModal } from './components/ProfileModal';
import { SceneCanvas } from './components/SceneCanvas';
import {
  calculateScoreBreakdown,
  formatDuration,
  formatReadableDate,
  generatePuzzleForDate,
  getArchiveDateKeys,
  getTodayDateKey,
} from './engine/puzzleGenerator';
import { soundEngine } from './engine/sound';
import { auth, googleProvider } from './firebase';
import {
  ensureUserAccountAndProfile,
  loadLocalCompletions,
  loadLocalMuted,
  recordPuzzleCompletion,
  saveLocalMuted,
  subscribeUserCompletions,
  updateUserSoundPreference,
} from './services/gameService';
import type {
  GameScreen,
  PlayerProfile,
  PlayOverlay,
  ScoreBreakdown,
  UserCompletion,
} from './types/game';

const BACKDROP_IMAGE = '/src/assets/images/atelier_loupe_backdrop_1794967322087.jpg';

export default function App() {
  const todayKey = getTodayDateKey();
  const archiveDates = useMemo(() => getArchiveDateKeys(todayKey), [todayKey]);

  const [screen, setScreen] = useState<GameScreen>('TITLE');
  const [overlay, setOverlay] = useState<PlayOverlay>('NONE');
  const [activeDate, setActiveDate] = useState<string>(todayKey);

  // Auth & Profile
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [completions, setCompletions] = useState<Record<string, UserCompletion>>(() =>
    loadLocalCompletions()
  );
  const [muted, setMuted] = useState<boolean>(() => {
    const m = loadLocalMuted();
    soundEngine.setMuted(m);
    return m;
  });

  // Active Gameplay State
  const [foundIds, setFoundIds] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [hintDiffId, setHintDiffId] = useState<string | null>(null);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [runningScore, setRunningScore] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [loupeActive, setLoupeActive] = useState<boolean>(false);
  const [hoverPos, setHoverPos] = useState<{
    x: number;
    y: number;
    source: 'original' | 'altered';
  } | null>(null);
  const [missFlash, setMissFlash] = useState<{ x: number; y: number; key: number } | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    text: string;
    tone: 'hit' | 'miss' | 'hint';
  } | null>(null);

  // Victory state
  const [victoryBreakdown, setVictoryBreakdown] = useState<ScoreBreakdown | null>(null);
  const [victoryMeta, setVictoryMeta] = useState<{
    isNewPersonalBest: boolean;
    savedToCloud: boolean;
  } | null>(null);
  const [leaderboardDateFocus, setLeaderboardDateFocus] = useState<string>(todayKey);

  const feedbackTimerRef = useRef<number | null>(null);

  const activePuzzle = useMemo(
    () => generatePuzzleForDate(activeDate, todayKey),
    [activeDate, todayKey]
  );

  // Firebase Auth listener
  useEffect(() => {
    let unsubCompletions: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (unsubCompletions) {
        unsubCompletions();
        unsubCompletions = null;
      }

      if (nextUser) {
        try {
          const loadedProfile = await ensureUserAccountAndProfile(nextUser);
          setProfile(loadedProfile);
          unsubCompletions = subscribeUserCompletions(nextUser.uid, (cloudMap) => {
            setCompletions((prev) => ({ ...prev, ...cloudMap }));
          });
        } catch (err) {
          console.error('Failed to initialize profile:', err);
        }
      } else {
        setProfile(null);
        setCompletions(loadLocalCompletions());
      }
      setAuthLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubCompletions) unsubCompletions();
    };
  }, []);

  const showToast = useCallback((text: string, tone: 'hit' | 'miss' | 'hint') => {
    setFeedbackBanner({ text, tone });
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackBanner(null);
    }, 2600);
  }, []);

  // Precision game timer (runs only during active unpaused play)
  useEffect(() => {
    if (screen !== 'PLAYING' || overlay !== 'NONE') return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [screen, overlay]);

  const startPuzzle = useCallback(
    (dateKey: string) => {
      soundEngine.playClick();
      setActiveDate(dateKey);
      setFoundIds([]);
      setMistakes(0);
      setHintsUsed(0);
      setHintDiffId(null);
      setCombo(0);
      setMaxCombo(0);
      setRunningScore(0);
      setElapsedSeconds(0);
      setHoverPos(null);
      setMissFlash(null);
      setFeedbackBanner(null);
      setVictoryBreakdown(null);
      setVictoryMeta(null);
      setOverlay('NONE');
      setScreen('PLAYING');
    },
    []
  );

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
    saveLocalMuted(nextMuted);
    if (user && user.emailVerified) {
      void updateUserSoundPreference(user.uid, !nextMuted).catch(() => {});
    }
  }, [muted, user]);

  const handleSignIn = useCallback(async () => {
    soundEngine.playClick();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign-in failed:', err);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    soundEngine.playClick();
    try {
      await signOut(auth);
      setScreen('TITLE');
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  }, []);

  const triggerHint = useCallback(() => {
    if (screen !== 'PLAYING' || overlay !== 'NONE') return;
    const remaining = activePuzzle.differences.filter((d) => !foundIds.includes(d.id));
    if (remaining.length === 0) return;
    const target = remaining[0];
    setHintDiffId(target.id);
    setHintsUsed((h) => h + 1);
    setRunningScore((s) => Math.max(0, s - 180));
    soundEngine.playHint();
    showToast(`Hint revealed · ${target.description} (-180 pts)`, 'hint');
  }, [screen, overlay, activePuzzle.differences, foundIds, showToast]);

  const handleCompletePuzzle = useCallback(
    async (finalFoundCount: number, nextMaxCombo: number, finalMistakes: number, finalHints: number) => {
      const safeTime = Math.max(1, elapsedSeconds);
      const breakdown = calculateScoreBreakdown({
        totalDiffs: finalFoundCount,
        maxCombo: nextMaxCombo,
        elapsedSeconds: safeTime,
        parSeconds: activePuzzle.parSeconds,
        hintsUsed: finalHints,
        mistakes: finalMistakes,
      });

      setVictoryBreakdown(breakdown);
      setOverlay('VICTORY');
      soundEngine.playVictory();

      try {
        const result = await recordPuzzleCompletion({
          user,
          profile,
          puzzleDate: activePuzzle.date,
          elapsedSeconds: safeTime,
          hintsUsed: finalHints,
          mistakes: finalMistakes,
          breakdown,
        });
        setVictoryMeta(result);
        setCompletions(loadLocalCompletions());
        if (user) {
          const refreshed = await ensureUserAccountAndProfile(user);
          setProfile(refreshed);
        }
      } catch (err) {
        console.error('Failed saving completion:', err);
        setVictoryMeta({ isNewPersonalBest: false, savedToCloud: false });
      }
    },
    [elapsedSeconds, activePuzzle.parSeconds, activePuzzle.date, user, profile]
  );

  const handleCanvasClick = useCallback(
    (x: number, y: number) => {
      if (screen !== 'PLAYING' || overlay !== 'NONE') return;

      const isInsideDiffBounds = (
        px: number,
        py: number,
        diff: (typeof activePuzzle.differences)[number]
      ) => {
        const halfW = diff.hitWidth / 2;
        const halfH = diff.hitHeight / 2;
        const inOrig = Math.abs(px - diff.origX) <= halfW && Math.abs(py - diff.origY) <= halfH;
        const inAlt = Math.abs(px - diff.altX) <= halfW && Math.abs(py - diff.altY) <= halfH;
        return inOrig || inAlt;
      };

      // Find closest unfound difference whose exact prop bounds contain the click
      let matched = null;
      let bestDist = Infinity;

      for (const diff of activePuzzle.differences) {
        if (foundIds.includes(diff.id)) continue;
        if (isInsideDiffBounds(x, y, diff)) {
          const dOrig = Math.hypot(diff.origX - x, diff.origY - y);
          const dAlt = Math.hypot(diff.altX - x, diff.altY - y);
          const dist = Math.min(dOrig, dAlt);
          if (dist < bestDist) {
            bestDist = dist;
            matched = diff;
          }
        }
      }

      if (!matched) {
        // Don't penalize accidental double-clicks on an already-spotted difference
        const clickedAlreadyFound = activePuzzle.differences.some(
          (diff) => foundIds.includes(diff.id) && isInsideDiffBounds(x, y, diff)
        );
        if (clickedAlreadyFound) {
          return;
        }
      }

      if (matched) {
        const nextFound = [...foundIds, matched.id];
        const nextCombo = combo + 1;
        const nextMaxCombo = Math.max(maxCombo, nextCombo);
        const pointsGained = 500 + (nextCombo - 1) * 140;

        setFoundIds(nextFound);
        setCombo(nextCombo);
        setMaxCombo(nextMaxCombo);
        setRunningScore((s) => s + pointsGained);
        if (hintDiffId === matched.id) {
          setHintDiffId(null);
        }
        soundEngine.playSpotHit(nextCombo);
        showToast(
          `${matched.description} · +${pointsGained} pts${nextCombo > 1 ? ` (×${nextCombo} streak)` : ''}`,
          'hit'
        );

        if (nextFound.length === activePuzzle.differences.length) {
          void handleCompletePuzzle(nextFound.length, nextMaxCombo, mistakes, hintsUsed);
        }
      } else {
        setCombo(0);
        setMistakes((m) => m + 1);
        setRunningScore((s) => Math.max(0, s - 85));
        setMissFlash({ x, y, key: Date.now() });
        soundEngine.playMiss();
        showToast('No difference there · -85 pts', 'miss');
      }
    },
    [
      screen,
      overlay,
      activePuzzle.differences,
      foundIds,
      combo,
      maxCombo,
      hintDiffId,
      mistakes,
      hintsUsed,
      showToast,
      handleCompletePuzzle,
    ]
  );

  // Global keyboard shortcuts matching Game Shell guidelines
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (screen === 'TITLE') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startPuzzle(todayKey);
        }
        return;
      }

      if (screen === 'PLAYING') {
        if (e.key === ' ' || e.key === 'Escape') {
          if (overlay === 'VICTORY') return;
          e.preventDefault();
          soundEngine.playClick();
          setOverlay((prev) => (prev === 'PAUSED' ? 'NONE' : 'PAUSED'));
        } else if (e.key.toLowerCase() === 'z' && overlay === 'NONE') {
          e.preventDefault();
          soundEngine.playClick();
          setLoupeActive((l) => !l);
        } else if (e.key.toLowerCase() === 'h' && overlay === 'NONE') {
          e.preventDefault();
          triggerHint();
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          toggleMute();
        }
      } else if (e.key === 'Escape') {
        setScreen('TITLE');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, overlay, todayKey, startPuzzle, triggerHint, toggleMute]);

  const todayPuzzle = useMemo(
    () => generatePuzzleForDate(todayKey, todayKey),
    [todayKey]
  );
  const todayCompletion = completions[todayKey];
  const solvedTotalCount = Object.keys(completions).length;

  // Find next archive edition after current activeDate
  const nextArchiveDate = useMemo(() => {
    const idx = archiveDates.indexOf(activeDate);
    if (idx === -1) return todayKey;
    return archiveDates[(idx + 1) % archiveDates.length];
  }, [archiveDates, activeDate, todayKey]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#12161D] text-[#F2EFE9] relative select-none">
      {/* =================================================================== */}
      {/* SCREEN 1: FULL-VIEWPORT GAME SHELL TITLE SCREEN                     */}
      {/* =================================================================== */}
      {screen === 'TITLE' && (
        <main className="relative h-full w-full overflow-hidden flex items-center">
          {/* Generated Atmospheric Key-Art Backdrop */}
          <img
            src={BACKDROP_IMAGE}
            alt="Atelier Loupe conservatory desk and brass magnifier"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-right scale-[1.04] pointer-events-none"
          />
          {/* Calm left negative-space scrim for crisp WCAG AA legibility */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(18,22,29,0.96) 0%, rgba(18,22,29,0.88) 38%, rgba(18,22,29,0.28) 72%, rgba(18,22,29,0.18) 100%)',
            }}
          />

          {/* Top-right quiet utility cluster inside Title Shell */}
          <div className="absolute top-5 right-6 z-10 flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="p-2.5 rounded-lg bg-[#12161D]/75 border border-white/12 text-[#F2EFE9] hover:border-[#E09F3E]/60 transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {!authLoading &&
              (user && profile ? (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setScreen('PROFILE');
                  }}
                  className="inline-flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-lg bg-[#12161D]/80 border border-white/15 hover:border-[#E09F3E]/60 transition-colors cursor-pointer"
                >
                  <AvatarEmblem avatarId={profile.avatarId} size={26} />
                  <span className="text-xs font-medium text-[#F2EFE9] max-w-[120px] truncate">
                    {profile.displayName}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#12161D]/80 border border-white/15 text-xs font-semibold text-[#F2EFE9] hover:border-[#E09F3E]/70 transition-colors cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#E09F3E]" />
                  <span>Sign in</span>
                </button>
              ))}
          </div>

          {/* Left-third Title Lockup over calm negative space */}
          <div className="relative z-10 max-w-xl px-7 sm:px-14 space-y-7">
            {/* Bespoke Inline SVG Title Lockup */}
            <div className="space-y-3">
              <svg
                viewBox="0 0 380 96"
                className="w-72 sm:w-96 h-auto overflow-visible"
                role="img"
                aria-label="Atelier Loupe"
              >
                <g transform="translate(2, 12)">
                  <circle
                    cx="26"
                    cy="26"
                    r="20"
                    fill="rgba(224,159,62,0.14)"
                    stroke="#E09F3E"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M40 40 L54 54"
                    stroke="#E09F3E"
                    strokeWidth="4.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M18 19 A10 10 0 0 1 32 16"
                    fill="none"
                    stroke="#F2EFE9"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="26" cy="26" r="4" fill="#E09F3E" />
                </g>
                <text
                  x="74"
                  y="44"
                  fill="#F2EFE9"
                  style={{
                    fontFamily: 'Fraunces, Georgia, serif',
                    fontSize: '40px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Atelier Loupe
                </text>
                <text
                  x="76"
                  y="70"
                  fill="#A9B2C0"
                  style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: '13px',
                    fontWeight: 500,
                    letterSpacing: '0.06em',
                  }}
                >
                  DAILY ILLUSTRATED SPOT THE DIFFERENCE
                </text>
              </svg>

              <p className="text-sm sm:text-base text-[#D3D8E0] leading-relaxed max-w-md text-balance">
                Compare paired archival prints under a precision magnifier. Uncover subtle visual discrepancies faster for higher accuracy multipliers and leaderboard rank.
              </p>
            </div>

            {/* Today's Daily Spotlight (unboxed clean metadata) */}
            <div className="space-y-2 border-t border-white/12 pt-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#A9B2C0]">
                <span className="font-semibold text-[#E09F3E]">
                  Today&apos;s Daily · Issue #{todayPuzzle.issueNumber}
                </span>
                <span aria-hidden="true">·</span>
                <span>{formatReadableDate(todayKey)}</span>
                <span aria-hidden="true">·</span>
                <span>{todayPuzzle.differences.length} differences</span>
                <span aria-hidden="true">·</span>
                <span>{todayPuzzle.difficulty}</span>
              </div>

              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-2xl font-semibold text-[#F2EFE9]">
                  {todayPuzzle.title}
                </h2>
                {todayCompletion && (
                  <span className="font-mono-tabular text-xs text-[#10B981] inline-flex items-center gap-1 shrink-0">
                    <Check className="w-3.5 h-3.5" />
                    Best {todayCompletion.bestScore.toLocaleString()} pts
                  </span>
                )}
              </div>
            </div>

            {/* Primary CTA & Secondary Game Shell Triggers */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => startPuzzle(todayKey)}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold bg-[#E09F3E] text-[#12161D] hover:bg-[#ebb159] transition-transform active:scale-[0.98] shadow-lg cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{todayCompletion ? "Replay Today's Daily" : "Play Today's Daily"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setScreen('ARCHIVE');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-white/8 text-[#F2EFE9] hover:bg-white/14 border border-white/10 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Archive className="w-4 h-4 text-[#E09F3E]" />
                  <span>6-Month Archive ({archiveDates.length})</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-sm text-[#D3D8E0]">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setLeaderboardDateFocus(todayKey);
                    setScreen('LEADERBOARD');
                  }}
                  className="inline-flex items-center gap-1.5 hover:text-[#E09F3E] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Trophy className="w-4 h-4 text-[#E09F3E]" />
                  <span>Leaderboards</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setScreen('PROFILE');
                  }}
                  className="inline-flex items-center gap-1.5 hover:text-[#E09F3E] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <UserIcon className="w-4 h-4 text-[#E09F3E]" />
                  <span>Profile &amp; Stats ({solvedTotalCount} solved)</span>
                </button>
              </div>
            </div>

            {/* Single Flat Control-Hint Line */}
            <p className="text-xs font-mono-tabular text-[#A9B2C0]/80 pt-1">
              Click Difference · H Hint · Z Loupe · Space Pause
            </p>
          </div>
        </main>
      )}

      {/* =================================================================== */}
      {/* SCREEN 2: ACTIVE GAMEPLAY WORKBENCH                                 */}
      {/* =================================================================== */}
      {screen === 'PLAYING' && (
        <div className="h-full w-full flex flex-col overflow-hidden bg-[#12161D]">
          {/* Low-Occlusion Perimeter HUD */}
          <header className="shrink-0 h-14 px-3 sm:px-6 border-b border-white/10 bg-[#161B24] flex items-center justify-between gap-3">
            {/* Left: Menu + Edition */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setOverlay('PAUSED');
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/6 hover:bg-white/12 text-[#F2EFE9] transition-colors cursor-pointer shrink-0"
              >
                <Pause className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pause</span>
              </button>

              <div className="min-w-0">
                <p className="font-display text-sm sm:text-base font-semibold text-[#F2EFE9] truncate">
                  #{activePuzzle.issueNumber} · {activePuzzle.title}
                </p>
                <p className="text-[11px] text-[#A9B2C0] hidden sm:block truncate">
                  {activePuzzle.isToday ? "Today's Daily" : formatReadableDate(activePuzzle.date)} ·{' '}
                  {activePuzzle.difficulty}
                </p>
              </div>
            </div>

            {/* Center: Found Counter Pips */}
            <div className="flex items-center gap-2 shrink-0" aria-label="Differences found">
              <div className="hidden md:flex items-center gap-1.5">
                {activePuzzle.differences.map((d, i) => {
                  const found = foundIds.includes(d.id);
                  return (
                    <span
                      key={d.id}
                      title={found ? d.description : `Difference ${i + 1}`}
                      className={`w-3 h-3 rounded-full border transition-all ${
                        found
                          ? 'bg-[#10B981] border-[#10B981] scale-105'
                          : 'bg-transparent border-white/30'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="font-mono-tabular text-xs sm:text-sm font-semibold text-[#F2EFE9]">
                {foundIds.length}/{activePuzzle.differences.length}
              </span>
            </div>

            {/* Right: Timer, Score, Tools */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center gap-3 font-mono-tabular text-xs sm:text-sm pr-1">
                <span className="text-[#F2EFE9]">{formatDuration(elapsedSeconds)}</span>
                <span className="text-[#E09F3E] font-semibold hidden sm:inline">
                  {runningScore.toLocaleString()} pts
                </span>
                {combo > 1 && (
                  <span className="text-[#10B981] font-semibold hidden md:inline">
                    ×{combo}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setLoupeActive((l) => !l);
                }}
                title="Toggle Magnifying Loupe (Z)"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  loupeActive
                    ? 'bg-[#E09F3E] text-[#12161D] border-[#E09F3E]'
                    : 'bg-white/5 text-[#F2EFE9] border-white/10 hover:bg-white/10'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Loupe</span>
              </button>

              <button
                type="button"
                onClick={triggerHint}
                title="Reveal a Difference Hint (H)"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-[#F2EFE9] border border-white/10 hover:border-[#E09F3E]/60 transition-colors cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5 text-[#E09F3E]" />
                <span className="hidden sm:inline">Hint</span>
              </button>

              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="p-1.5 rounded-lg bg-white/5 text-[#F2EFE9] border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </header>

          {/* Twin Side-by-Side Illustrated Plates (>85% viewport area) */}
          <div className="relative flex-1 min-h-0 p-3 sm:p-5 lg:p-6 flex flex-col justify-center">
            <div className="w-full max-w-[1380px] h-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5 items-stretch">
              <SceneCanvas
                puzzle={activePuzzle}
                mode="original"
                foundIds={foundIds}
                hintDiffId={hintDiffId}
                missFlash={missFlash}
                loupeActive={loupeActive}
                hoverPos={hoverPos}
                onHoverChange={setHoverPos}
                onCanvasClick={handleCanvasClick}
                disabled={overlay !== 'NONE'}
              />
              <SceneCanvas
                puzzle={activePuzzle}
                mode="altered"
                foundIds={foundIds}
                hintDiffId={hintDiffId}
                missFlash={missFlash}
                loupeActive={loupeActive}
                hoverPos={hoverPos}
                onHoverChange={setHoverPos}
                onCanvasClick={handleCanvasClick}
                disabled={overlay !== 'NONE'}
              />
            </div>

            {/* Non-blocking ephemeral discovery toast */}
            {feedbackBanner && (
              <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
                <div
                  className={`px-4 py-2 rounded-lg text-xs font-medium shadow-xl border ${
                    feedbackBanner.tone === 'hit'
                      ? 'bg-[#132A24] border-[#10B981]/50 text-[#D1FAE5]'
                      : feedbackBanner.tone === 'hint'
                      ? 'bg-[#2B2214] border-[#E09F3E]/50 text-[#FDE68A]'
                      : 'bg-[#2D1719] border-[#EF4444]/50 text-[#FECACA]'
                  }`}
                >
                  {feedbackBanner.text}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PAUSE MODAL                                                         */}
      {/* =================================================================== */}
      {screen === 'PLAYING' && overlay === 'PAUSED' && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-5">
          <div className="w-full max-w-sm rounded-2xl bg-[#181E27] border border-white/12 p-6 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <p className="text-xs font-mono-tabular text-[#E09F3E]">
                Issue #{activePuzzle.issueNumber} · {formatDuration(elapsedSeconds)}
              </p>
              <h2 className="font-display text-2xl font-semibold text-[#F2EFE9]">
                Inspection Paused
              </h2>
              <p className="text-sm text-[#A9B2C0]">
                {foundIds.length} of {activePuzzle.differences.length} differences spotted.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setOverlay('NONE');
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-[#E09F3E] text-[#12161D] hover:bg-[#ebb159] transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume</span>
              </button>

              <button
                type="button"
                onClick={() => startPuzzle(activeDate)}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium bg-white/8 text-[#F2EFE9] hover:bg-white/14 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Edition</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setOverlay('NONE');
                  setScreen('ARCHIVE');
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium bg-white/8 text-[#F2EFE9] hover:bg-white/14 transition-colors cursor-pointer"
              >
                <Archive className="w-4 h-4" />
                <span>6-Month Archive</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setOverlay('NONE');
                  setScreen('TITLE');
                }}
                className="w-full py-2 text-xs font-medium text-[#A9B2C0] hover:text-[#F2EFE9] transition-colors cursor-pointer"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VICTORY / COMPLETION MODAL                                          */}
      {/* =================================================================== */}
      {screen === 'PLAYING' && overlay === 'VICTORY' && victoryBreakdown && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl bg-[#181E27] border border-white/14 p-6 sm:p-7 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto atelier-scroll">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-mono-tabular text-[#E09F3E]">
                  Issue #{activePuzzle.issueNumber} · {formatReadableDate(activePuzzle.date)}
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F2EFE9]">
                  Edition Complete
                </h2>
                <p className="text-sm text-[#A9B2C0]">{activePuzzle.title}</p>
              </div>

              <div className="flex items-center gap-1 pt-1 shrink-0">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`w-6 h-6 ${
                      s <= victoryBreakdown.stars
                        ? 'fill-[#E09F3E] text-[#E09F3E]'
                        : 'text-white/15'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Primary Score Hero */}
            <div className="rounded-xl bg-black/30 border border-white/8 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[#A9B2C0]">Final Score</p>
                <p className="font-mono-tabular text-3xl font-bold text-[#E09F3E]">
                  {victoryBreakdown.finalScore.toLocaleString()}
                </p>
                {victoryMeta?.isNewPersonalBest && (
                  <p className="text-xs text-[#10B981] font-medium inline-flex items-center gap-1 mt-0.5">
                    <Award className="w-3.5 h-3.5" />
                    New Personal Best
                  </p>
                )}
              </div>

              <div className="text-right font-mono-tabular space-y-1 text-xs">
                <p className="text-[#F2EFE9]">
                  Time <span className="font-semibold">{formatDuration(elapsedSeconds)}</span>
                </p>
                <p className="text-[#F2EFE9]">
                  Accuracy <span className="font-semibold">{victoryBreakdown.accuracy.toFixed(0)}%</span>
                </p>
                <p className="text-[#A9B2C0]">
                  Max Streak <span className="text-[#F2EFE9]">×{Math.max(1, maxCombo)}</span>
                </p>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-1.5 text-xs border-t border-b border-white/8 py-3 font-mono-tabular">
              <div className="flex justify-between text-[#D3D8E0]">
                <span>Differences Spotted ({activePuzzle.differences.length})</span>
                <span>+{victoryBreakdown.baseScore.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#D3D8E0]">
                <span>Streak Bonus</span>
                <span>+{victoryBreakdown.comboBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#D3D8E0]">
                <span>Speed Bonus (Par {formatDuration(activePuzzle.parSeconds)})</span>
                <span>+{victoryBreakdown.speedBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#D3D8E0]">
                <span>Accuracy Bonus</span>
                <span>+{victoryBreakdown.accuracyBonus.toLocaleString()}</span>
              </div>
              {(victoryBreakdown.hintPenalty > 0 || victoryBreakdown.mistakePenalty > 0) && (
                <div className="flex justify-between text-[#EF4444]">
                  <span>Penalties ({hintsUsed} hints · {mistakes} misses)</span>
                  <span>
                    -{(victoryBreakdown.hintPenalty + victoryBreakdown.mistakePenalty).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Cloud Leaderboard Sync Status */}
            {!user ? (
              <div className="rounded-xl bg-[#E09F3E]/10 border border-[#E09F3E]/30 p-3.5 flex items-center justify-between gap-3">
                <p className="text-xs text-[#F2EFE9] leading-relaxed">
                  Saved locally. Sign in with Google to post this score to the competitive leaderboard.
                </p>
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E09F3E] text-[#12161D] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Sign in
                </button>
              </div>
            ) : (
              <p className="text-xs text-[#10B981] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Score synced to your profile and global standings.</span>
              </p>
            )}

            {/* End-State CTAs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => startPuzzle(nextArchiveDate)}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-[#E09F3E] text-[#12161D] hover:bg-[#ebb159] transition-colors cursor-pointer"
              >
                <span>Next Archive Edition</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setOverlay('NONE');
                  setLeaderboardDateFocus(activeDate);
                  setScreen('LEADERBOARD');
                }}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium bg-white/8 text-[#F2EFE9] hover:bg-white/14 transition-colors cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-[#E09F3E]" />
                <span>View Standings</span>
              </button>

              <button
                type="button"
                onClick={() => startPuzzle(activeDate)}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium bg-white/5 text-[#D3D8E0] hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setOverlay('NONE');
                  setScreen('TITLE');
                }}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium bg-white/5 text-[#D3D8E0] hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Title Screen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ARCHIVE, LEADERBOARD & PROFILE GAME SHELL OVERLAYS                  */}
      {/* =================================================================== */}
      {screen === 'ARCHIVE' && (
        <ArchiveModal
          completions={completions}
          activeDate={activeDate}
          onSelectPuzzle={(dateKey) => startPuzzle(dateKey)}
          onClose={() => {
            soundEngine.playClick();
            setScreen('TITLE');
          }}
        />
      )}

      {screen === 'LEADERBOARD' && (
        <LeaderboardModal
          currentUserId={user?.uid || null}
          initialDate={leaderboardDateFocus}
          onSignIn={handleSignIn}
          onPlayDate={(dateKey) => startPuzzle(dateKey)}
          onClose={() => {
            soundEngine.playClick();
            setScreen('TITLE');
          }}
        />
      )}

      {screen === 'PROFILE' && (
        <ProfileModal
          user={user}
          profile={profile}
          completions={completions}
          onProfileUpdated={(updated) =>
            setProfile((prev) => (prev ? { ...prev, ...updated } : prev))
          }
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onPlayPuzzle={(dateKey) => startPuzzle(dateKey)}
          onClose={() => {
            soundEngine.playClick();
            setScreen('TITLE');
          }}
        />
      )}
    </div>
  );
}

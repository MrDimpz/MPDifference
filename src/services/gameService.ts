import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { getTodayDateKey, parseDateKey } from '../engine/puzzleGenerator';
import type {
  AvatarId,
  PlayerProfile,
  PuzzleScoreEntry,
  ScoreBreakdown,
  UserCompletion,
} from '../types/game';

const VALID_AVATARS: AvatarId[] = [
  'loupe',
  'owl',
  'lighthouse',
  'compass',
  'monstera',
  'astrolabe',
  'chalet',
  'saxophone',
];

const LOCAL_COMPLETIONS_KEY = 'atelier_loupe_local_completions_v1';
const LOCAL_SOUND_KEY = 'atelier_loupe_sound_muted_v1';

export function sanitizeDisplayName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 32);
  return cleaned.length >= 2 ? cleaned : 'Observer';
}

export function sanitizeMotto(raw: string): string {
  return raw.trim().slice(0, 120);
}

export function sanitizeAvatarId(raw: string): AvatarId {
  return VALID_AVATARS.includes(raw as AvatarId) ? (raw as AvatarId) : 'loupe';
}

export function loadLocalCompletions(): Record<string, UserCompletion> {
  try {
    const raw = localStorage.getItem(LOCAL_COMPLETIONS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, UserCompletion>;
  } catch {
    return {};
  }
}

export function saveLocalCompletion(completion: UserCompletion) {
  try {
    const existing = loadLocalCompletions();
    existing[completion.puzzleDate] = completion;
    localStorage.setItem(LOCAL_COMPLETIONS_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage quota issues
  }
}

export function loadLocalMuted(): boolean {
  try {
    return localStorage.getItem(LOCAL_SOUND_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveLocalMuted(muted: boolean) {
  try {
    localStorage.setItem(LOCAL_SOUND_KEY, muted ? 'true' : 'false');
  } catch {
    // Ignore storage quota issues
  }
}

export async function ensureUserAccountAndProfile(user: User): Promise<PlayerProfile> {
  const userPath = `users/${user.uid}`;
  const profilePath = `profiles/${user.uid}`;

  // 1. Ensure private user account document
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: (user.email || 'player@atelierloupe.app').slice(0, 254),
        soundEnabled: !loadLocalMuted(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  // 2. Ensure public player profile
  try {
    const profileRef = doc(db, 'profiles', user.uid);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      return profileSnap.data() as PlayerProfile;
    }

    const defaultName = sanitizeDisplayName(
      user.displayName || (user.email ? user.email.split('@')[0] : 'Observer')
    );
    const initialProfile: PlayerProfile = {
      uid: user.uid,
      displayName: defaultName,
      avatarId: 'loupe',
      motto: 'Sharp eyes, steady pace.',
      isPublic: true,
      totalScore: 0,
      puzzlesSolved: 0,
      currentStreak: 0,
      bestStreak: 0,
      bestTimeSeconds: 0,
      totalAccuracySum: 0,
      lastPlayedDate: '',
    };

    await setDoc(profileRef, {
      ...initialProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return initialProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, profilePath);
  }
}

export async function updatePlayerProfileIdentity(
  uid: string,
  updates: { displayName: string; avatarId: AvatarId; motto: string }
): Promise<void> {
  const path = `profiles/${uid}`;
  try {
    const ref = doc(db, 'profiles', uid);
    await updateDoc(ref, {
      displayName: sanitizeDisplayName(updates.displayName),
      avatarId: sanitizeAvatarId(updates.avatarId),
      motto: sanitizeMotto(updates.motto),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserSoundPreference(uid: string, soundEnabled: boolean): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      soundEnabled,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserCompletions(
  uid: string,
  onData: (map: Record<string, UserCompletion>) => void
): Unsubscribe {
  const path = `users/${uid}/completions`;
  const q = query(collection(db, 'users', uid, 'completions'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const map: Record<string, UserCompletion> = {};
      snap.forEach((d) => {
        const data = d.data() as UserCompletion;
        map[data.puzzleDate] = data;
      });
      onData(map);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

function computeNextStreak(lastPlayedDate: string, currentStreak: number, todayKey: string): number {
  if (!lastPlayedDate) return 1;
  if (lastPlayedDate === todayKey) return Math.max(1, currentStreak);
  const prev = parseDateKey(lastPlayedDate);
  const cur = parseDateKey(todayKey);
  const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86400000);
  if (diffDays === 1) {
    return currentStreak + 1;
  }
  return 1;
}

export async function recordPuzzleCompletion(params: {
  user: User | null;
  profile: PlayerProfile | null;
  puzzleDate: string;
  elapsedSeconds: number;
  hintsUsed: number;
  mistakes: number;
  breakdown: ScoreBreakdown;
}): Promise<{ isNewPersonalBest: boolean; savedToCloud: boolean }> {
  const { user, profile, puzzleDate, elapsedSeconds, hintsUsed, mistakes, breakdown } = params;
  const safeTime = Math.max(1, Math.min(86400, Math.round(elapsedSeconds)));
  const safeScore = Math.max(0, Math.min(25000, Math.round(breakdown.finalScore)));

  // Always save locally for instant feedback & offline/guest support
  const localMap = loadLocalCompletions();
  const prevLocal = localMap[puzzleDate];
  const isLocalBest = !prevLocal || safeScore > prevLocal.bestScore;

  const localRecord: UserCompletion = {
    uid: user?.uid || 'guest',
    puzzleDate,
    bestScore: isLocalBest ? safeScore : prevLocal.bestScore,
    bestTimeSeconds: isLocalBest ? safeTime : Math.min(prevLocal.bestTimeSeconds, safeTime),
    bestAccuracy: isLocalBest ? breakdown.accuracy : Math.max(prevLocal.bestAccuracy, breakdown.accuracy),
    hintsUsed: isLocalBest ? hintsUsed : prevLocal.hintsUsed,
    mistakes: isLocalBest ? mistakes : prevLocal.mistakes,
    stars: isLocalBest ? breakdown.stars : Math.max(prevLocal.stars, breakdown.stars),
    attempts: (prevLocal?.attempts ?? 0) + 1,
  };
  saveLocalCompletion(localRecord);

  if (!user || !profile || !user.emailVerified) {
    return { isNewPersonalBest: isLocalBest, savedToCloud: false };
  }

  // Ensure user account exists before master-gated subcollection write
  const completionPath = `users/${user.uid}/completions/${puzzleDate}`;
  let isFirstSolveForPuzzle = false;
  let isNewPersonalBest = false;

  try {
    const completionRef = doc(db, 'users', user.uid, 'completions', puzzleDate);
    const existingSnap = await getDoc(completionRef);

    if (!existingSnap.exists()) {
      isFirstSolveForPuzzle = true;
      isNewPersonalBest = true;
      await setDoc(completionRef, {
        uid: user.uid,
        puzzleDate,
        bestScore: safeScore,
        bestTimeSeconds: safeTime,
        bestAccuracy: breakdown.accuracy,
        hintsUsed,
        mistakes,
        stars: breakdown.stars,
        attempts: 1,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const prev = existingSnap.data() as UserCompletion;
      isNewPersonalBest = safeScore > prev.bestScore;
      await updateDoc(completionRef, {
        bestScore: isNewPersonalBest ? safeScore : prev.bestScore,
        bestTimeSeconds: Math.min(prev.bestTimeSeconds, safeTime),
        bestAccuracy: Math.max(prev.bestAccuracy, breakdown.accuracy),
        hintsUsed: isNewPersonalBest ? hintsUsed : prev.hintsUsed,
        mistakes: isNewPersonalBest ? mistakes : prev.mistakes,
        stars: Math.max(prev.stars, breakdown.stars),
        attempts: prev.attempts + 1,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, completionPath);
  }

  // Update public leaderboard score for this puzzle date ({puzzleDate}_{uid})
  const scoreId = `${puzzleDate}_${user.uid}`;
  const scorePath = `puzzleScores/${scoreId}`;
  try {
    const scoreRef = doc(db, 'puzzleScores', scoreId);
    const scoreSnap = await getDoc(scoreRef);

    if (!scoreSnap.exists()) {
      await setDoc(scoreRef, {
        uid: user.uid,
        puzzleDate,
        displayName: sanitizeDisplayName(profile.displayName),
        avatarId: sanitizeAvatarId(profile.avatarId),
        score: safeScore,
        timeSeconds: safeTime,
        accuracy: breakdown.accuracy,
        hintsUsed,
        mistakes,
        stars: breakdown.stars,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const prevScore = scoreSnap.data() as PuzzleScoreEntry;
      if (safeScore >= prevScore.score) {
        await updateDoc(scoreRef, {
          displayName: sanitizeDisplayName(profile.displayName),
          avatarId: sanitizeAvatarId(profile.avatarId),
          score: safeScore,
          timeSeconds: safeTime,
          accuracy: breakdown.accuracy,
          hintsUsed,
          mistakes,
          stars: breakdown.stars,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, scorePath);
  }

  // Update public cumulative player profile
  const profilePath = `profiles/${user.uid}`;
  try {
    const profileRef = doc(db, 'profiles', user.uid);
    const profileSnap = await getDoc(profileRef);
    const current = (profileSnap.exists() ? profileSnap.data() : profile) as PlayerProfile;

    const todayKey = getTodayDateKey();
    const isDailyPlay = puzzleDate === todayKey;
    const nextStreak = isDailyPlay
      ? computeNextStreak(current.lastPlayedDate, current.currentStreak, todayKey)
      : current.currentStreak;
    const nextBestStreak = Math.max(current.bestStreak, nextStreak);
    const nextBestTime =
      current.bestTimeSeconds === 0 ? safeTime : Math.min(current.bestTimeSeconds, safeTime);

    const scoreDelta = isFirstSolveForPuzzle
      ? safeScore
      : isNewPersonalBest
      ? safeScore - (prevLocal?.bestScore ?? 0)
      : 0;

    await updateDoc(profileRef, {
      displayName: sanitizeDisplayName(current.displayName),
      avatarId: sanitizeAvatarId(current.avatarId),
      motto: sanitizeMotto(current.motto),
      totalScore: current.totalScore + Math.max(0, scoreDelta),
      puzzlesSolved: current.puzzlesSolved + (isFirstSolveForPuzzle ? 1 : 0),
      currentStreak: nextStreak,
      bestStreak: nextBestStreak,
      bestTimeSeconds: nextBestTime,
      totalAccuracySum: current.totalAccuracySum + (isFirstSolveForPuzzle ? breakdown.accuracy : 0),
      lastPlayedDate: isDailyPlay ? todayKey : current.lastPlayedDate,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, profilePath);
  }

  return { isNewPersonalBest, savedToCloud: true };
}

export async function fetchPuzzleLeaderboard(puzzleDate: string): Promise<PuzzleScoreEntry[]> {
  const path = 'puzzleScores';
  try {
    const q = query(
      collection(db, 'puzzleScores'),
      where('isPublic', '==', true),
      where('puzzleDate', '==', puzzleDate),
      orderBy('score', 'desc'),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PuzzleScoreEntry, 'id'>) }));
  } catch (error) {
    // Fallback if composite index is still building: query by isPublic + puzzleDate and sort client-side
    try {
      const qFallback = query(
        collection(db, 'puzzleScores'),
        where('isPublic', '==', true),
        where('puzzleDate', '==', puzzleDate),
        limit(50)
      );
      const snap = await getDocs(qFallback);
      return snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<PuzzleScoreEntry, 'id'>) }))
        .sort((a, b) => b.score - a.score || a.timeSeconds - b.timeSeconds)
        .slice(0, 30);
    } catch (innerError) {
      handleFirestoreError(innerError || error, OperationType.LIST, path);
    }
  }
}

export async function fetchGlobalStandings(mode: 'score' | 'streak'): Promise<PlayerProfile[]> {
  const path = 'profiles';
  try {
    const q = query(
      collection(db, 'profiles'),
      where('isPublic', '==', true),
      orderBy(mode === 'score' ? 'totalScore' : 'bestStreak', 'desc'),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as PlayerProfile);
  } catch (error) {
    try {
      const qFallback = query(
        collection(db, 'profiles'),
        where('isPublic', '==', true),
        limit(50)
      );
      const snap = await getDocs(qFallback);
      return snap.docs
        .map((d) => d.data() as PlayerProfile)
        .sort((a, b) =>
          mode === 'score'
            ? b.totalScore - a.totalScore || b.puzzlesSolved - a.puzzlesSolved
            : b.bestStreak - a.bestStreak || b.totalScore - a.totalScore
        )
        .slice(0, 30);
    } catch (innerError) {
      handleFirestoreError(innerError || error, OperationType.LIST, path);
    }
  }
}

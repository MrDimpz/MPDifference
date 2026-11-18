import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { Check, ChevronLeft, LogOut, Play, Save, Star } from 'lucide-react';
import {
  formatDuration,
  formatReadableDate,
  generatePuzzleForDate,
  getTodayDateKey,
} from '../engine/puzzleGenerator';
import { updatePlayerProfileIdentity } from '../services/gameService';
import type { AvatarId, PlayerProfile, UserCompletion } from '../types/game';
import { AVATAR_OPTIONS, AvatarEmblem } from './AvatarEmblem';

interface ProfileModalProps {
  user: User | null;
  profile: PlayerProfile | null;
  completions: Record<string, UserCompletion>;
  onProfileUpdated: (updated: Partial<PlayerProfile>) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onPlayPuzzle: (dateKey: string) => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  profile,
  completions,
  onProfileUpdated,
  onSignIn,
  onSignOut,
  onPlayPuzzle,
  onClose,
}) => {
  const [displayName, setDisplayName] = useState(profile?.displayName || 'Observer');
  const [motto, setMotto] = useState(profile?.motto || 'Sharp eyes, steady pace.');
  const [avatarId, setAvatarId] = useState<AvatarId>(profile?.avatarId || 'loupe');
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setMotto(profile.motto);
      setAvatarId(profile.avatarId);
    }
  }, [profile]);

  const todayKey = getTodayDateKey();

  const recentCompletions = useMemo(() => {
    return Object.values(completions)
      .sort((a, b) => b.puzzleDate.localeCompare(a.puzzleDate))
      .slice(0, 20);
  }, [completions]);

  const localAggregate = useMemo(() => {
    const list = Object.values(completions);
    const totalScore = list.reduce((acc, c) => acc + c.bestScore, 0);
    const bestTime = list.reduce(
      (min, c) => (min === 0 ? c.bestTimeSeconds : Math.min(min, c.bestTimeSeconds)),
      0
    );
    const avgAcc =
      list.length > 0
        ? list.reduce((acc, c) => acc + c.bestAccuracy, 0) / list.length
        : 0;
    return { solved: list.length, totalScore, bestTime, avgAcc };
  }, [completions]);

  const displayStats = {
    solved: profile ? Math.max(profile.puzzlesSolved, localAggregate.solved) : localAggregate.solved,
    totalScore: profile ? Math.max(profile.totalScore, localAggregate.totalScore) : localAggregate.totalScore,
    currentStreak: profile?.currentStreak ?? 0,
    bestStreak: profile?.bestStreak ?? 0,
    bestTime: profile?.bestTimeSeconds || localAggregate.bestTime,
    avgAccuracy:
      profile && profile.puzzlesSolved > 0
        ? profile.totalAccuracySum / profile.puzzlesSolved
        : localAggregate.avgAcc,
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setErrorMsg('Display handle must be at least 2 characters.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      await updatePlayerProfileIdentity(user.uid, {
        displayName: trimmed,
        avatarId,
        motto: motto.trim(),
      });
      onProfileUpdated({ displayName: trimmed, avatarId, motto: motto.trim() });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#12161D] flex flex-col overflow-hidden">
      <header className="shrink-0 flex items-center justify-between gap-4 px-5 sm:px-8 py-4 border-b border-white/10 bg-[#161B24]">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#F2EFE9] bg-white/5 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-[#F2EFE9] truncate">
              Observer Dossier
            </h1>
            <p className="text-xs text-[#A9B2C0] truncate">
              {user ? `Signed in as ${user.email}` : 'Guest session · Local browser archive'}
            </p>
          </div>
        </div>

        {user ? (
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-[#F2EFE9] bg-white/8 hover:bg-white/14 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#E09F3E] text-[#12161D] hover:bg-[#ebb159] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sign in with Google
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto atelier-scroll px-5 sm:px-8 py-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Identity Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-xl bg-[#181E27] border border-white/10 p-6 space-y-5">
              <div className="flex items-center gap-4">
                <AvatarEmblem avatarId={avatarId} size={56} />
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-semibold text-[#F2EFE9] truncate">
                    {displayName || 'Observer'}
                  </h2>
                  <p className="text-xs text-[#A9B2C0] truncate">
                    {motto || 'Sharp eyes, steady pace.'}
                  </p>
                </div>
              </div>

              {!user ? (
                <div className="pt-3 border-t border-white/8 space-y-3">
                  <p className="text-sm text-[#A9B2C0] leading-relaxed">
                    Sign in with Google to customize your public observer handle, sync your 6-month archive progress across devices, and rank on competitive leaderboards.
                  </p>
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-[#E09F3E] text-[#12161D] hover:bg-[#ebb159] transition-colors cursor-pointer"
                  >
                    Sign in with Google
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4 pt-3 border-t border-white/8">
                  <div className="space-y-1.5">
                    <label htmlFor="handle-input" className="block text-xs font-medium text-[#A9B2C0]">
                      Public Handle
                    </label>
                    <input
                      id="handle-input"
                      type="text"
                      maxLength={32}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 border border-white/10 text-[#F2EFE9] focus:outline-none focus:border-[#E09F3E]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="motto-input" className="block text-xs font-medium text-[#A9B2C0]">
                      Observer Motto
                    </label>
                    <input
                      id="motto-input"
                      type="text"
                      maxLength={120}
                      value={motto}
                      onChange={(e) => setMotto(e.target.value)}
                      placeholder="A brief motto for the leaderboard..."
                      className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 border border-white/10 text-[#F2EFE9] focus:outline-none focus:border-[#E09F3E]"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-medium text-[#A9B2C0]">Emblem Insignia</span>
                    <div className="grid grid-cols-4 gap-2">
                      {AVATAR_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setAvatarId(opt.id)}
                          title={opt.label}
                          className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                            avatarId === opt.id
                              ? 'bg-[#E09F3E]/15 border-[#E09F3E]'
                              : 'bg-black/20 border-white/8 hover:border-white/20'
                          }`}
                        >
                          <AvatarEmblem avatarId={opt.id} size={32} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {errorMsg && <p className="text-xs text-[#EF4444]">{errorMsg}</p>}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold bg-[#E09F3E] text-[#12161D] hover:bg-[#ebb159] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {savedToast ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Profile Saved</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save Identity'}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Lifetime Metrics & Solved History */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {[
                { label: 'Season Score', value: displayStats.totalScore.toLocaleString() },
                { label: 'Editions Solved', value: `${displayStats.solved}` },
                { label: 'Current Streak', value: `${displayStats.currentStreak}d` },
                { label: 'Best Streak', value: `${displayStats.bestStreak}d` },
                {
                  label: 'Fastest Solve',
                  value: displayStats.bestTime > 0 ? formatDuration(displayStats.bestTime) : '--:--',
                },
                {
                  label: 'Avg Accuracy',
                  value: displayStats.avgAccuracy > 0 ? `${displayStats.avgAccuracy.toFixed(0)}%` : '--',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl bg-[#181E27] border border-white/8 p-4 space-y-1"
                >
                  <p className="text-xs text-[#A9B2C0]">{stat.label}</p>
                  <p className="font-mono-tabular text-xl font-semibold text-[#F2EFE9]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-[#181E27] border border-white/10 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-[#F2EFE9]">
                  Recent Solved Editions
                </h3>
                <span className="font-mono-tabular text-xs text-[#A9B2C0]">
                  {recentCompletions.length} shown
                </span>
              </div>

              {recentCompletions.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm text-[#A9B2C0]">
                    You haven&apos;t completed any editions yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => onPlayPuzzle(todayKey)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#E09F3E] text-[#12161D] cursor-pointer"
                  >
                    Play Today&apos;s Daily
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-white/6">
                  {recentCompletions.map((item) => {
                    const p = generatePuzzleForDate(item.puzzleDate, todayKey);
                    return (
                      <div
                        key={item.puzzleDate}
                        className="py-3 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#F2EFE9] truncate">
                            #{p.issueNumber} · {p.title}
                          </p>
                          <p className="text-xs text-[#A9B2C0] font-mono-tabular">
                            {formatReadableDate(item.puzzleDate)} · {formatDuration(item.bestTimeSeconds)} ·{' '}
                            {item.bestAccuracy.toFixed(0)}% accuracy
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="hidden sm:inline-flex items-center gap-0.5">
                            {[1, 2, 3].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= item.stars ? 'fill-[#E09F3E] text-[#E09F3E]' : 'text-white/15'
                                }`}
                              />
                            ))}
                          </span>
                          <span className="font-mono-tabular text-sm font-semibold text-[#E09F3E]">
                            {item.bestScore.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => onPlayPuzzle(item.puzzleDate)}
                            aria-label={`Replay ${p.title}`}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/12 text-[#F2EFE9] transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

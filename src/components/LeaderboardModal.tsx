import React, { useEffect, useState } from 'react';
import { ChevronLeft, Flame, RefreshCw, Star, Trophy } from 'lucide-react';
import {
  formatDuration,
  formatReadableDate,
  generatePuzzleForDate,
  getArchiveStartDateKey,
  getTodayDateKey,
} from '../engine/puzzleGenerator';
import { fetchGlobalStandings, fetchPuzzleLeaderboard } from '../services/gameService';
import type { PlayerProfile, PuzzleScoreEntry } from '../types/game';
import { AvatarEmblem } from './AvatarEmblem';

interface LeaderboardModalProps {
  currentUserId: string | null;
  initialDate?: string;
  onSignIn: () => void;
  onPlayDate: (dateKey: string) => void;
  onClose: () => void;
}

type LeaderboardTab = 'daily' | 'archive' | 'season' | 'streaks';

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  currentUserId,
  initialDate,
  onSignIn,
  onPlayDate,
  onClose,
}) => {
  const todayKey = getTodayDateKey();
  const minDateKey = getArchiveStartDateKey(todayKey);

  const [tab, setTab] = useState<LeaderboardTab>(
    initialDate && initialDate !== todayKey ? 'archive' : 'daily'
  );
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayKey);
  const [puzzleRows, setPuzzleRows] = useState<PuzzleScoreEntry[]>([]);
  const [profileRows, setProfileRows] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const targetDate = tab === 'daily' ? todayKey : selectedDate;
  const targetPuzzle = generatePuzzleForDate(targetDate, todayKey);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (tab === 'daily' || tab === 'archive') {
        const rows = await fetchPuzzleLeaderboard(targetDate);
        setPuzzleRows(rows);
      } else if (tab === 'season') {
        const rows = await fetchGlobalStandings('score');
        setProfileRows(rows);
      } else {
        const rows = await fetchGlobalStandings('streak');
        setProfileRows(rows);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedDate]);

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
              Competitive Standings
            </h1>
            <p className="text-xs text-[#A9B2C0] truncate">
              Verified observer rankings across daily editions and season totals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#F2EFE9] bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {!currentUserId && (
            <button
              type="button"
              onClick={onSignIn}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#E09F3E] text-[#12161D] hover:bg-[#ebb159] transition-colors whitespace-nowrap cursor-pointer"
            >
              Sign in to Compete
            </button>
          )}
        </div>
      </header>

      {/* Tabs & Date Selector */}
      <div className="shrink-0 px-5 sm:px-8 py-3.5 border-b border-white/8 bg-[#141922] flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 rounded-lg bg-black/30 border border-white/8 overflow-x-auto max-w-full">
          {(
            [
              { id: 'daily', label: "Today's Daily" },
              { id: 'archive', label: 'Archive Edition' },
              { id: 'season', label: 'Season Points' },
              { id: 'streaks', label: 'Daily Streaks' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                tab === item.id
                  ? 'bg-[#E09F3E] text-[#12161D]'
                  : 'text-[#A9B2C0] hover:text-[#F2EFE9]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {(tab === 'daily' || tab === 'archive') && (
          <div className="flex items-center gap-3">
            {tab === 'archive' && (
              <input
                type="date"
                aria-label="Select archive puzzle date"
                min={minDateKey}
                max={todayKey}
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="px-3 py-1.5 text-xs font-mono-tabular rounded-lg bg-black/30 border border-white/10 text-[#F2EFE9] focus:outline-none focus:border-[#E09F3E]"
              />
            )}
            <span className="text-xs text-[#A9B2C0] hidden md:inline">
              #{targetPuzzle.issueNumber} · {targetPuzzle.title} · {formatReadableDate(targetDate)}
            </span>
            <button
              type="button"
              onClick={() => onPlayDate(targetDate)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 text-[#F2EFE9] hover:bg-white/15 transition-colors whitespace-nowrap cursor-pointer"
            >
              Play This Edition
            </button>
          </div>
        )}
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-y-auto atelier-scroll px-5 sm:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="space-y-2.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : errorMsg ? (
            <div className="rounded-xl bg-[#1A202A] border border-[#EF4444]/30 p-6 text-center space-y-3">
              <p className="text-sm text-[#F2EFE9] font-medium">Unable to retrieve standings</p>
              <p className="text-xs text-[#A9B2C0] break-words">{errorMsg}</p>
              <button
                type="button"
                onClick={() => void loadData()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#E09F3E] text-[#12161D] cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : tab === 'daily' || tab === 'archive' ? (
            puzzleRows.length === 0 ? (
              <div className="rounded-xl bg-[#181E27] border border-white/8 p-10 text-center space-y-3">
                <Trophy className="w-8 h-8 text-[#E09F3E] mx-auto opacity-80" />
                <h2 className="font-display text-lg font-semibold text-[#F2EFE9]">
                  No entries recorded yet for {formatReadableDate(targetDate)}
                </h2>
                <p className="text-sm text-[#A9B2C0] max-w-md mx-auto">
                  Complete this edition while signed in to claim first place on the standings board.
                </p>
                <button
                  type="button"
                  onClick={() => onPlayDate(targetDate)}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#E09F3E] text-[#12161D] hover:bg-[#ebb159] transition-colors cursor-pointer"
                >
                  Solve Edition #{targetPuzzle.issueNumber}
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden bg-[#181E27]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-medium text-[#A9B2C0] bg-black/20">
                      <th className="py-3 px-4 w-16">Rank</th>
                      <th className="py-3 px-4">Player</th>
                      <th className="py-3 px-4 text-right">Time</th>
                      <th className="py-3 px-4 text-right hidden sm:table-cell">Accuracy</th>
                      <th className="py-3 px-4 text-right hidden sm:table-cell">Stars</th>
                      <th className="py-3 px-4 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/6 text-sm">
                    {puzzleRows.map((row, idx) => {
                      const isSelf = currentUserId && row.uid === currentUserId;
                      return (
                        <tr
                          key={row.id}
                          className={isSelf ? 'bg-[#E09F3E]/10' : 'hover:bg-white/[0.02]'}
                        >
                          <td className="py-3 px-4 font-mono-tabular font-semibold">
                            <span
                              className={
                                idx === 0
                                  ? 'text-[#E09F3E]'
                                  : idx === 1
                                  ? 'text-[#CBD5E1]'
                                  : idx === 2
                                  ? 'text-[#D97757]'
                                  : 'text-[#A9B2C0]'
                              }
                            >
                              #{idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <AvatarEmblem avatarId={row.avatarId} size={32} />
                              <div className="min-w-0">
                                <p className="font-medium text-[#F2EFE9] truncate">
                                  {row.displayName}
                                  {isSelf && (
                                    <span className="ml-2 text-xs text-[#E09F3E] font-semibold">
                                      (You)
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-[#A9B2C0]">
                                  {row.hintsUsed} hints · {row.mistakes} misses
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular text-[#A9B2C0]">
                            {formatDuration(row.timeSeconds)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular text-[#A9B2C0] hidden sm:table-cell">
                            {row.accuracy.toFixed(0)}%
                          </td>
                          <td className="py-3 px-4 text-right hidden sm:table-cell">
                            <span className="inline-flex items-center justify-end gap-0.5">
                              {[1, 2, 3].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= row.stars ? 'fill-[#E09F3E] text-[#E09F3E]' : 'text-white/15'
                                  }`}
                                />
                              ))}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-[#E09F3E]">
                            {row.score.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : profileRows.length === 0 ? (
            <div className="rounded-xl bg-[#181E27] border border-white/8 p-10 text-center space-y-2">
              <p className="font-display text-lg text-[#F2EFE9]">No ranked observers yet</p>
              <p className="text-sm text-[#A9B2C0]">
                Sign in and solve puzzles to appear on the season standings.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden bg-[#181E27]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] font-medium text-[#A9B2C0] bg-black/20">
                    <th className="py-3 px-4 w-16">Rank</th>
                    <th className="py-3 px-4">Observer</th>
                    <th className="py-3 px-4 text-right">Solved</th>
                    <th className="py-3 px-4 text-right hidden sm:table-cell">Best Streak</th>
                    <th className="py-3 px-4 text-right">
                      {tab === 'streaks' ? 'Current Streak' : 'Season Score'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 text-sm">
                  {profileRows.map((p, idx) => {
                    const isSelf = currentUserId && p.uid === currentUserId;
                    return (
                      <tr key={p.uid} className={isSelf ? 'bg-[#E09F3E]/10' : 'hover:bg-white/[0.02]'}>
                        <td className="py-3 px-4 font-mono-tabular font-semibold text-[#A9B2C0]">
                          <span className={idx < 3 ? 'text-[#E09F3E]' : ''}>#{idx + 1}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <AvatarEmblem avatarId={p.avatarId} size={34} />
                            <div className="min-w-0">
                              <p className="font-medium text-[#F2EFE9] truncate">
                                {p.displayName}
                                {isSelf && (
                                  <span className="ml-2 text-xs text-[#E09F3E] font-semibold">
                                    (You)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-[#A9B2C0] truncate max-w-xs">{p.motto}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono-tabular text-[#A9B2C0]">
                          {p.puzzlesSolved}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-tabular text-[#F2EFE9] hidden sm:table-cell">
                          <span className="inline-flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-[#E09F3E]" />
                            {p.bestStreak}d
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-[#E09F3E]">
                          {tab === 'streaks'
                            ? `${p.bestStreak} days`
                            : p.totalScore.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

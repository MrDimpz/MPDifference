import React, { useMemo, useState } from 'react';
import { Calendar, Check, ChevronLeft, Play, Search, Star } from 'lucide-react';
import {
  formatDuration,
  formatMonthHeading,
  formatReadableDate,
  generatePuzzleForDate,
  getArchiveDateKeys,
  getTodayDateKey,
} from '../engine/puzzleGenerator';
import type { DailyPuzzle, PuzzleTheme, UserCompletion } from '../types/game';

interface ArchiveModalProps {
  completions: Record<string, UserCompletion>;
  activeDate: string;
  onSelectPuzzle: (dateKey: string) => void;
  onClose: () => void;
}

const THEME_FILTERS: { id: 'all' | PuzzleTheme; label: string }[] = [
  { id: 'all', label: 'All Worlds' },
  { id: 'conservatory', label: 'Conservatory' },
  { id: 'lighthouse', label: 'Lighthouse' },
  { id: 'observatory', label: 'Observatory' },
  { id: 'cafe', label: 'Café Terrace' },
  { id: 'chalet', label: 'Alpine Chalet' },
  { id: 'clockshop', label: 'Clockmaker' },
  { id: 'mesa', label: 'Canyon Mesa' },
  { id: 'jazzrooftop', label: 'Rooftop Jazz' },
];

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
  completions,
  activeDate,
  onSelectPuzzle,
  onClose,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'unsolved' | 'solved'>('all');
  const [themeFilter, setThemeFilter] = useState<'all' | PuzzleTheme>('all');
  const [searchText, setSearchText] = useState('');

  const todayKey = getTodayDateKey();

  const allPuzzles = useMemo(() => {
    const keys = getArchiveDateKeys(todayKey);
    return keys.map((dateKey) => generatePuzzleForDate(dateKey, todayKey));
  }, [todayKey]);

  const solvedCount = useMemo(
    () => allPuzzles.filter((p) => Boolean(completions[p.date])).length,
    [allPuzzles, completions]
  );

  const filteredPuzzles = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return allPuzzles.filter((p) => {
      const isSolved = Boolean(completions[p.date]);
      if (statusFilter === 'solved' && !isSolved) return false;
      if (statusFilter === 'unsolved' && isSolved) return false;
      if (themeFilter !== 'all' && p.theme !== themeFilter) return false;
      if (q) {
        const hay = `${p.title} ${p.date} ${p.themeLabel} #${p.issueNumber}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allPuzzles, completions, statusFilter, themeFilter, searchText]);

  const groupedByMonth = useMemo(() => {
    const groups: { monthKey: string; items: DailyPuzzle[] }[] = [];
    const map = new Map<string, DailyPuzzle[]>();
    filteredPuzzles.forEach((p) => {
      const monthKey = p.date.slice(0, 7);
      if (!map.has(monthKey)) {
        const arr: DailyPuzzle[] = [];
        map.set(monthKey, arr);
        groups.push({ monthKey, items: arr });
      }
      map.get(monthKey)!.push(p);
    });
    return groups;
  }, [filteredPuzzles]);

  return (
    <div className="fixed inset-0 z-40 bg-[#12161D] flex flex-col overflow-hidden">
      {/* Compact Game Shell Header */}
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
              Six-Month Folio Archive
            </h1>
            <p className="text-xs text-[#A9B2C0] truncate">
              {allPuzzles.length} daily editions · {solvedCount} solved
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectPuzzle(todayKey)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#E09F3E] text-[#12161D] hover:bg-[#ebb159] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
          <span>Play Today</span>
        </button>
      </header>

      {/* Filter Toolbar */}
      <div className="shrink-0 px-5 sm:px-8 py-3.5 border-b border-white/8 bg-[#141922] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-lg bg-black/30 border border-white/8">
            {(['all', 'unsolved', 'solved'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-[#E09F3E] text-[#12161D]'
                    : 'text-[#A9B2C0] hover:text-[#F2EFE9]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by illustration world"
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value as 'all' | PuzzleTheme)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-black/30 border border-white/10 text-[#F2EFE9] focus:outline-none focus:border-[#E09F3E]"
          >
            {THEME_FILTERS.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#1A202A]">
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#A9B2C0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search date, title, or #issue..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-black/30 border border-white/10 text-[#F2EFE9] placeholder:text-[#A9B2C0]/60 focus:outline-none focus:border-[#E09F3E]"
          />
        </div>
      </div>

      {/* Scrollable Month Archive Grid */}
      <div className="flex-1 overflow-y-auto atelier-scroll px-5 sm:px-8 py-6 space-y-8">
        {groupedByMonth.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 space-y-3">
            <p className="font-display text-lg text-[#F2EFE9]">No matching archive editions</p>
            <p className="text-sm text-[#A9B2C0]">
              Try clearing your search or switching the status filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setThemeFilter('all');
                setSearchText('');
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white/10 text-[#F2EFE9] hover:bg-white/15 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          groupedByMonth.map((group) => (
            <section key={group.monthKey} className="space-y-3.5">
              <div className="flex items-baseline justify-between border-b border-white/10 pb-2">
                <h2 className="font-display text-lg font-semibold text-[#F2EFE9]">
                  {formatMonthHeading(group.monthKey)}
                </h2>
                <span className="font-mono-tabular text-xs text-[#A9B2C0]">
                  {group.items.filter((i) => Boolean(completions[i.date])).length} / {group.items.length} solved
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {group.items.map((puzzle) => {
                  const comp = completions[puzzle.date];
                  const isCurrent = puzzle.date === activeDate;
                  return (
                    <button
                      key={puzzle.date}
                      type="button"
                      onClick={() => onSelectPuzzle(puzzle.date)}
                      className={`group text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isCurrent
                          ? 'bg-[#1F2733] border-[#E09F3E]/60'
                          : 'bg-[#181E27] border-white/8 hover:border-white/25 hover:bg-[#1D2430]'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs text-[#A9B2C0]">
                          <span className="font-mono-tabular">
                            #{puzzle.issueNumber} · {formatReadableDate(puzzle.date)}
                          </span>
                          {puzzle.isToday ? (
                            <span className="font-semibold text-[#E09F3E]">Daily</span>
                          ) : comp ? (
                            <span className="inline-flex items-center gap-1 text-[#10B981] font-medium">
                              <Check className="w-3.5 h-3.5" />
                              Solved
                            </span>
                          ) : null}
                        </div>

                        <h3 className="font-display text-base font-semibold text-[#F2EFE9] group-hover:text-[#E09F3E] transition-colors truncate">
                          {puzzle.title}
                        </h3>

                        <p className="text-xs text-[#A9B2C0]">
                          {puzzle.themeLabel} · {puzzle.differences.length} differences · {puzzle.difficulty}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/6 text-xs">
                        {comp ? (
                          <div className="flex items-center gap-3 font-mono-tabular text-[#F2EFE9]">
                            <span className="text-[#E09F3E] font-semibold">
                              {comp.bestScore.toLocaleString()} pts
                            </span>
                            <span className="text-[#A9B2C0]">
                              {formatDuration(comp.bestTimeSeconds)}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[#E09F3E]">
                              {[1, 2, 3].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${
                                    s <= comp.stars ? 'fill-[#E09F3E] text-[#E09F3E]' : 'text-white/20'
                                  }`}
                                />
                              ))}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#A9B2C0] group-hover:text-[#F2EFE9] inline-flex items-center gap-1.5 transition-colors">
                            <Play className="w-3 h-3" />
                            Play Edition
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

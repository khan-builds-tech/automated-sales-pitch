"use client";

import { useState } from "react";
import { Star, Globe, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface Filters {
  minRating: number;
  pitchedFilter: "all" | "pitched" | "new";
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  showPitchedFilter?: boolean;
}

export type { Filters };

export default function SearchFilters({ filters, onChange, showPitchedFilter = true }: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilters = filters.minRating > 0 || (showPitchedFilter && filters.pitchedFilter !== "all");

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm text-[#888] hover:text-white transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Globe size={14} /> Filters
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
          )}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[#1a1a1a] pt-4">
          {/* Min Rating */}
          <div>
            <label className="text-xs text-[#666] uppercase tracking-wider mb-2 block">Minimum Rating</label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 4.5].map((r) => (
                <button
                  key={r}
                  onClick={() => onChange({ ...filters, minRating: r })}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                    filters.minRating === r
                      ? "bg-[#eab308]/10 text-[#eab308] border-[#eab308]/20"
                      : "border-[#222] text-[#666] hover:text-[#888] hover:border-[#333]"
                  }`}
                >
                  {r === 0 ? "Any" : <><Star size={10} className="fill-current" /> {r}+</>}
                </button>
              ))}
            </div>
          </div>

          {/* Pitch Status */}
          {showPitchedFilter && (
            <div>
              <label className="text-xs text-[#666] uppercase tracking-wider mb-2 block">Pitch Status</label>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: "all", label: "All", icon: false },
                  { value: "pitched", label: "Already Pitched", icon: true },
                  { value: "new", label: "New Prospects", icon: false },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ ...filters, pitchedFilter: opt.value })}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                      filters.pitchedFilter === opt.value
                        ? "bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20"
                        : "border-[#222] text-[#666] hover:text-[#888] hover:border-[#333]"
                    }`}
                  >
                    {opt.icon && <Sparkles size={10} className="fill-current" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={() => onChange({ minRating: 0, pitchedFilter: "all" })}
              className="text-xs text-[#ef4444] hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

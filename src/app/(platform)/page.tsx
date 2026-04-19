"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useActivity, useSearchHistory } from "@/hooks/useStorage";
import { getTotalPitchCount, getEmailSentCount } from "@/lib/pitch-storage";
import StatCard from "@/components/StatCard";
import ActivityFeed from "@/components/ActivityFeed";
import { Search, Sparkles, Mail, FileText, ArrowRight, Clock } from "lucide-react";
import { useCurrentUser } from "@/lib/user-context";

export default function DashboardPage() {
  const activity = useActivity();
  const searchHistory = useSearchHistory();
  const currentUser = useCurrentUser();
  const ownerFilter = currentUser.role === "admin" ? null : currentUser.email;
  const [savedPitches, setSavedPitches] = useState<number | null>(null);
  const [emailsSent, setEmailsSent] = useState<number | null>(null);

  useEffect(() => {
    getTotalPitchCount(ownerFilter).then(setSavedPitches).catch(() => setSavedPitches(0));
    getEmailSentCount(ownerFilter).then(setEmailsSent).catch(() => setEmailsSent(0));
  }, [ownerFilter]);

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-[#888] mt-1">Overview of your lead discovery and outreach activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {savedPitches === null ? (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
            <div className="skeleton h-4 w-20 rounded mb-3" />
            <div className="skeleton h-8 w-12 rounded" />
          </div>
        ) : (
          <StatCard icon={Sparkles} label="Saved Pitches" value={savedPitches} color="#8b5cf6" />
        )}
        {emailsSent === null ? (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
            <div className="skeleton h-4 w-20 rounded mb-3" />
            <div className="skeleton h-8 w-12 rounded" />
          </div>
        ) : (
          <StatCard icon={Mail} label="Emails Sent" value={emailsSent} color="#22c55e" />
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/search"
          className="bg-gradient-to-br from-[#3b82f6]/10 to-[#111] border border-[#3b82f6]/20 rounded-2xl p-5 flex items-center gap-4 hover:border-[#3b82f6]/40 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center flex-shrink-0">
            <Search size={22} className="text-[#3b82f6]" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white group-hover:text-[#3b82f6] transition-colors">New Search</h3>
            <p className="text-xs text-[#666] mt-0.5">Find and audit new businesses</p>
          </div>
          <ArrowRight size={16} className="text-[#444] group-hover:text-[#3b82f6] transition-colors" />
        </Link>

        <Link
          href="/pitches"
          className="bg-gradient-to-br from-[#8b5cf6]/10 to-[#111] border border-[#8b5cf6]/20 rounded-2xl p-5 flex items-center gap-4 hover:border-[#8b5cf6]/40 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#8b5cf6]/10 flex items-center justify-center flex-shrink-0">
            <FileText size={22} className="text-[#8b5cf6]" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white group-hover:text-[#8b5cf6] transition-colors">View Saved Pitches</h3>
            <p className="text-xs text-[#666] mt-0.5">Browse and manage generated pitches</p>
          </div>
          <ArrowRight size={16} className="text-[#444] group-hover:text-[#8b5cf6] transition-colors" />
        </Link>
      </div>

      {/* Search History */}
      {searchHistory.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock size={14} /> Recent Searches
          </h2>
          <div className="flex flex-wrap gap-2">
            {searchHistory.slice(0, 5).map((entry, i) => (
              <Link
                key={i}
                href={`/search?q=${encodeURIComponent(entry.query)}`}
                className="text-xs px-3 py-1.5 rounded-full bg-[#111] border border-[#222] text-[#888] hover:text-white hover:border-[#333] transition-colors"
              >
                {entry.query} <span className="text-[#555]">({entry.resultCount})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div>
        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">Recent Activity</h2>
        {activity.length > 0 ? (
          <ActivityFeed events={activity.slice(0, 15)} />
        ) : (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-8 text-center">
            <p className="text-sm text-[#666]">No activity yet. Start by searching for businesses!</p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 mt-4 text-sm text-[#3b82f6] hover:underline"
            >
              <Search size={14} /> Go to Search
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

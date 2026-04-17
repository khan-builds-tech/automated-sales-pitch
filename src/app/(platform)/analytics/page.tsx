"use client";

import { useStats, useLeads, useCampaigns } from "@/hooks/useStorage";
import StatCard from "@/components/StatCard";
import { BarChart3, Users, Sparkles, Mail, FolderKanban, TrendingUp } from "lucide-react";
import { LeadStatus } from "@/lib/types";

const statusColors: Record<LeadStatus, string> = {
  new: "#3b82f6",
  contacted: "#eab308",
  responded: "#8b5cf6",
  won: "#22c55e",
  lost: "#ef4444",
  archived: "#666666",
};

const gradeColors: Record<string, string> = {
  "A+": "#22c55e",
  "A": "#22c55e",
  "B": "#3b82f6",
  "C": "#eab308",
  "D": "#ef4444",
  "F": "#ef4444",
};

export default function AnalyticsPage() {
  const stats = useStats();
  const leads = useLeads();
  const campaigns = useCampaigns();

  // Grade distribution
  const gradeCounts: Record<string, number> = {};
  leads.forEach((l) => {
    if (l.audit) {
      const grade = l.audit.overallGrade;
      gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
    }
  });
  const maxGradeCount = Math.max(...Object.values(gradeCounts), 1);

  // Business type distribution
  const typeCounts: Record<string, number> = {};
  leads.forEach((l) => {
    const types = l.business.types || [];
    const mainType = types[0] || "unknown";
    const label = mainType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    typeCounts[label] = (typeCounts[label] || 0) + 1;
  });
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxTypeCount = Math.max(...sortedTypes.map(([, c]) => c), 1);

  // Pipeline data
  const pipelineTotal = leads.filter((l) => l.status !== "archived").length;

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={24} /> Analytics
        </h1>
        <p className="text-sm text-[#888] mt-0.5">Overview of your lead discovery and outreach metrics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Leads" value={stats.totalLeads} color="#3b82f6" />
        <StatCard icon={Sparkles} label="Pitches Generated" value={stats.pitchesGenerated} color="#8b5cf6" />
        <StatCard icon={Mail} label="Emails Sent" value={stats.emailsSent} color="#22c55e" />
        <StatCard icon={FolderKanban} label="Campaigns" value={stats.activeCampaigns} color="#eab308" />
      </div>

      {leads.length === 0 ? (
        <div className="bg-[#111] border border-[#222] rounded-2xl p-12 text-center">
          <TrendingUp size={32} className="text-[#333] mx-auto mb-3" />
          <p className="text-sm text-[#666]">Start saving leads to see analytics here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead Pipeline */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Lead Pipeline</h3>
            {pipelineTotal > 0 ? (
              <>
                {/* Stacked bar */}
                <div className="h-4 bg-[#1a1a1a] rounded-full overflow-hidden flex mb-4">
                  {(["new", "contacted", "responded", "won", "lost"] as LeadStatus[]).map((status) => {
                    const count = stats.leadsByStatus[status] || 0;
                    if (count === 0) return null;
                    return (
                      <div
                        key={status}
                        className="h-full first:rounded-l-full last:rounded-r-full transition-all"
                        style={{
                          width: `${(count / pipelineTotal) * 100}%`,
                          backgroundColor: statusColors[status],
                        }}
                      />
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="space-y-2">
                  {(["new", "contacted", "responded", "won", "lost"] as LeadStatus[]).map((status) => {
                    const count = stats.leadsByStatus[status] || 0;
                    const pct = pipelineTotal > 0 ? Math.round((count / pipelineTotal) * 100) : 0;
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: statusColors[status] }} />
                          <span className="text-sm text-[#ccc] capitalize">{status}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-white">{count}</span>
                          <span className="text-xs text-[#666] w-10 text-right">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-[#555]">No active leads in pipeline</p>
            )}
          </div>

          {/* Audit Grade Distribution */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Audit Grades</h3>
            {Object.keys(gradeCounts).length > 0 ? (
              <div className="space-y-3">
                {["A+", "A", "B", "C", "D", "F"].map((grade) => {
                  const count = gradeCounts[grade] || 0;
                  if (count === 0) return null;
                  const pct = (count / maxGradeCount) * 100;
                  return (
                    <div key={grade} className="flex items-center gap-3">
                      <span className="text-sm font-bold w-6" style={{ color: gradeColors[grade] || "#888" }}>{grade}</span>
                      <div className="flex-1 h-6 bg-[#1a1a1a] rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-lg transition-all flex items-center pl-2"
                          style={{
                            width: `${Math.max(pct, 10)}%`,
                            backgroundColor: `${gradeColors[grade] || "#888"}20`,
                            borderLeft: `3px solid ${gradeColors[grade] || "#888"}`,
                          }}
                        >
                          <span className="text-xs font-medium" style={{ color: gradeColors[grade] || "#888" }}>{count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#555]">No audits completed yet</p>
            )}
          </div>

          {/* Top Business Types */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Top Business Types</h3>
            {sortedTypes.length > 0 ? (
              <div className="space-y-3">
                {sortedTypes.map(([type, count], i) => {
                  const pct = (count / maxTypeCount) * 100;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-xs text-[#666] w-4 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-[#ccc] truncate">{type}</span>
                          <span className="text-xs text-[#888] font-medium">{count}</span>
                        </div>
                        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#3b82f6] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#555]">No data yet</p>
            )}
          </div>

          {/* Conversion Funnel */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Conversion Funnel</h3>
            {stats.totalLeads > 0 ? (
              <div className="space-y-4">
                {[
                  { label: "Leads Saved", value: stats.totalLeads, color: "#3b82f6" },
                  { label: "Audited", value: leads.filter((l) => l.audit).length, color: "#eab308" },
                  { label: "Pitched", value: stats.pitchesGenerated, color: "#8b5cf6" },
                  { label: "Contacted", value: stats.emailsSent, color: "#22c55e" },
                  { label: "Won", value: stats.leadsByStatus.won, color: "#22c55e" },
                ].map((item, i) => {
                  const pct = stats.totalLeads > 0 ? Math.round((item.value / stats.totalLeads) * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-[#ccc]">{item.label}</span>
                        <span className="text-sm font-bold text-white">{item.value} <span className="text-xs text-[#666] font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#555]">No data yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

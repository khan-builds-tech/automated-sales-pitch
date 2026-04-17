"use client";

import { LeadStatus } from "@/lib/types";

const statusConfig: Record<LeadStatus, { label: string; bg: string; text: string; border: string }> = {
  new: { label: "New", bg: "bg-[#3b82f6]/10", text: "text-[#3b82f6]", border: "border-[#3b82f6]/20" },
  contacted: { label: "Contacted", bg: "bg-[#eab308]/10", text: "text-[#eab308]", border: "border-[#eab308]/20" },
  responded: { label: "Responded", bg: "bg-[#8b5cf6]/10", text: "text-[#8b5cf6]", border: "border-[#8b5cf6]/20" },
  won: { label: "Won", bg: "bg-[#22c55e]/10", text: "text-[#22c55e]", border: "border-[#22c55e]/20" },
  lost: { label: "Lost", bg: "bg-[#ef4444]/10", text: "text-[#ef4444]", border: "border-[#ef4444]/20" },
  archived: { label: "Archived", bg: "bg-[#666]/10", text: "text-[#666]", border: "border-[#666]/20" },
};

export default function StatusBadge({ status }: { status: LeadStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full ${config.bg} ${config.text} border ${config.border} font-medium uppercase tracking-wider`}>
      {config.label}
    </span>
  );
}

export function StatusSelector({ status, onChange }: { status: LeadStatus; onChange: (s: LeadStatus) => void }) {
  const statuses: LeadStatus[] = ["new", "contacted", "responded", "won", "lost", "archived"];
  return (
    <div className="flex gap-2 flex-wrap">
      {statuses.map((s) => {
        const config = statusConfig[s];
        const active = s === status;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
              active
                ? `${config.bg} ${config.text} ${config.border}`
                : "border-[#222] text-[#666] hover:text-[#888] hover:border-[#333]"
            }`}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}

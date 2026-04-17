"use client";

import { ActivityEvent } from "@/lib/types";
import { Search, BarChart3, Sparkles, Mail, Bookmark, ArrowRightLeft, FolderKanban } from "lucide-react";

const icons: Record<string, React.ElementType> = {
  search: Search,
  audit: BarChart3,
  pitch: Sparkles,
  email_sent: Mail,
  lead_saved: Bookmark,
  lead_status_change: ArrowRightLeft,
  campaign_created: FolderKanban,
};

const colors: Record<string, string> = {
  search: "#3b82f6",
  audit: "#eab308",
  pitch: "#8b5cf6",
  email_sent: "#22c55e",
  lead_saved: "#3b82f6",
  lead_status_change: "#eab308",
  campaign_created: "#8b5cf6",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface Props {
  events: ActivityEvent[];
}

export default function ActivityFeed({ events }: Props) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl divide-y divide-[#1a1a1a]">
      {events.map((event) => {
        const Icon = icons[event.type] || Search;
        const color = colors[event.type] || "#888";
        return (
          <div key={event.id} className="flex items-center gap-3 px-4 py-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon size={14} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#ccc] truncate">{event.description}</p>
            </div>
            <span className="text-[11px] text-[#555] flex-shrink-0">{timeAgo(event.timestamp)}</span>
          </div>
        );
      })}
    </div>
  );
}

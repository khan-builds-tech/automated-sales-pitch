"use client";

import Link from "next/link";
import { Campaign, Lead } from "@/lib/types";
import { FolderKanban, Users, ArrowRight } from "lucide-react";

interface Props {
  campaign: Campaign;
  leads: Lead[];
}

export default function CampaignCard({ campaign, leads }: Props) {
  const campaignLeads = leads.filter((l) => campaign.leadIds.includes(l.id));
  const total = campaignLeads.length;
  const contacted = campaignLeads.filter((l) => l.status !== "new").length;
  const won = campaignLeads.filter((l) => l.status === "won").length;
  const percent = total > 0 ? Math.round((contacted / total) * 100) : 0;

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="bg-[#111] border border-[#222] rounded-2xl p-5 hover:border-[#333] transition-colors group block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/10 flex items-center justify-center flex-shrink-0">
            <FolderKanban size={18} className="text-[#8b5cf6]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-[#8b5cf6] transition-colors">
              {campaign.name}
            </h3>
            {campaign.description && (
              <p className="text-xs text-[#666] mt-0.5 truncate max-w-[200px]">{campaign.description}</p>
            )}
          </div>
        </div>
        <ArrowRight size={14} className="text-[#444] group-hover:text-[#8b5cf6] transition-colors mt-1" />
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-[#888] flex items-center gap-1">
          <Users size={12} /> {total} leads
        </span>
        {won > 0 && (
          <span className="text-xs text-[#22c55e]">{won} won</span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-[10px] text-[#555] mt-1">{percent}% contacted</p>
    </Link>
  );
}

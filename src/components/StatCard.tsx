"use client";

import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
}

export default function StatCard({ icon: Icon, label, value, color }: Props) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-[#888] mt-0.5">{label}</div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Lead } from "@/lib/types";
import { X, Search, Check, Users } from "lucide-react";
import StatusBadge from "./StatusBadge";

interface Props {
  leads: Lead[];
  existingLeadIds: string[];
  onAdd: (leadIds: string[]) => void;
  onClose: () => void;
}

export default function AddLeadsModal({ leads, existingLeadIds, onAdd, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const available = leads.filter((l) => !existingLeadIds.includes(l.id));

  const filtered = search.trim()
    ? available.filter((l) => l.business.name.toLowerCase().includes(search.toLowerCase()))
    : available;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#111] border border-[#222] rounded-2xl w-full max-w-lg mx-4 toast-in">
        <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white">Add Leads to Campaign</h3>
          <button onClick={onClose} className="text-[#555] hover:text-white cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {/* Search */}
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#444] outline-none focus:border-[#333]"
              autoFocus
            />
          </div>

          {/* Lead List */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-8">
                <Users size={24} className="text-[#333] mx-auto mb-2" />
                <p className="text-xs text-[#666]">
                  {available.length === 0 ? "All leads are already in this campaign" : "No matching leads"}
                </p>
              </div>
            ) : (
              filtered.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => toggle(lead.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                    selected.has(lead.id) ? "bg-[#3b82f6]/10 border border-[#3b82f6]/20" : "hover:bg-[#1a1a1a] border border-transparent"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selected.has(lead.id) ? "bg-[#3b82f6] border-[#3b82f6]" : "border-[#444]"
                  }`}>
                    {selected.has(lead.id) && <Check size={10} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white truncate block">{lead.business.name}</span>
                    <span className="text-[11px] text-[#666] truncate block">{lead.business.address}</span>
                  </div>
                  <StatusBadge status={lead.status} />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-5 border-t border-[#1a1a1a]">
          <span className="text-xs text-[#888]">{selected.size} selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm text-[#888] hover:text-white px-4 py-2 cursor-pointer">
              Cancel
            </button>
            <button
              onClick={() => onAdd(Array.from(selected))}
              disabled={selected.size === 0}
              className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Add {selected.size > 0 ? `(${selected.size})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

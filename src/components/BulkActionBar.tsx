"use client";

import { Bookmark, BarChart3, Download, X } from "lucide-react";

interface Props {
  count: number;
  onSaveAll: () => void;
  onAuditAll: () => void;
  onExport: () => void;
  onClear: () => void;
}

export default function BulkActionBar({ count, onSaveAll, onAuditAll, onExport, onClear }: Props) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#111] border border-[#3b82f6]/30 rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl shadow-black/50 toast-in">
      <span className="text-sm text-white font-medium">
        {count} selected
      </span>

      <div className="w-px h-6 bg-[#222]" />

      <button onClick={onSaveAll} className="text-xs text-[#888] hover:text-[#3b82f6] flex items-center gap-1.5 transition-colors cursor-pointer">
        <Bookmark size={14} /> Save All
      </button>
      <button onClick={onAuditAll} className="text-xs text-[#888] hover:text-[#eab308] flex items-center gap-1.5 transition-colors cursor-pointer">
        <BarChart3 size={14} /> Audit All
      </button>
      <button onClick={onExport} className="text-xs text-[#888] hover:text-[#22c55e] flex items-center gap-1.5 transition-colors cursor-pointer">
        <Download size={14} /> Export
      </button>

      <button onClick={onClear} className="text-[#555] hover:text-white transition-colors cursor-pointer ml-2">
        <X size={16} />
      </button>
    </div>
  );
}

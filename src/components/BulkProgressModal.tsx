"use client";

import { Loader2, CheckCircle2, XCircle, X } from "lucide-react";

interface ProgressItem {
  name: string;
  status: "pending" | "in_progress" | "done" | "error";
}

interface Props {
  title: string;
  items: ProgressItem[];
  current: number;
  total: number;
  onClose?: () => void;
  isDone: boolean;
}

export default function BulkProgressModal({ title, items, current, total, onClose, isDone }: Props) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={isDone ? onClose : undefined} />
      <div className="relative bg-[#111] border border-[#222] rounded-2xl w-full max-w-md mx-4 p-6 toast-in">
        {isDone && onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-[#555] hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        )}

        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-sm text-[#888] mb-4">
          {isDone ? `Completed ${current}/${total}` : `Processing ${current + 1}/${total}...`}
        </p>

        {/* Progress Bar */}
        <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Items List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              {item.status === "pending" && <div className="w-4 h-4 rounded-full border border-[#333]" />}
              {item.status === "in_progress" && <Loader2 size={16} className="animate-spin text-[#3b82f6]" />}
              {item.status === "done" && <CheckCircle2 size={16} className="text-[#22c55e]" />}
              {item.status === "error" && <XCircle size={16} className="text-[#ef4444]" />}
              <span className={`text-sm truncate ${item.status === "in_progress" ? "text-white" : item.status === "done" ? "text-[#888]" : "text-[#555]"}`}>
                {item.name}
              </span>
            </div>
          ))}
        </div>

        {isDone && onClose && (
          <button
            onClick={onClose}
            className="w-full mt-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium py-2.5 rounded-xl transition-colors cursor-pointer text-sm"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}

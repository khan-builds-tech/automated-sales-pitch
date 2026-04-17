"use client";

import { useToast } from "@/lib/toast-context";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const colors = {
  success: { bg: "bg-[#22c55e]/10", border: "border-[#22c55e]/20", text: "text-[#22c55e]" },
  error: { bg: "bg-[#ef4444]/10", border: "border-[#ef4444]/20", text: "text-[#ef4444]" },
  info: { bg: "bg-[#3b82f6]/10", border: "border-[#3b82f6]/20", text: "text-[#3b82f6]" },
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        const color = colors[t.type];
        return (
          <div
            key={t.id}
            className={`${color.bg} ${color.border} border rounded-xl px-4 py-3 flex items-center gap-3 toast-in shadow-lg`}
          >
            <Icon size={16} className={color.text} />
            <span className="text-sm text-white flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-[#666] hover:text-white cursor-pointer">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

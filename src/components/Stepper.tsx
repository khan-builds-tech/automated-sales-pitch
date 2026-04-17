"use client";

import { Step } from "@/lib/types";
import { Search, MousePointerClick, BarChart3, Sparkles } from "lucide-react";

const steps: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: "search", label: "Search", icon: Search },
  { key: "select", label: "Select", icon: MousePointerClick },
  { key: "audit", label: "Audit", icon: BarChart3 },
  { key: "pitch", label: "Pitch", icon: Sparkles },
];

const stepOrder: Step[] = ["search", "select", "audit", "pitch"];

interface StepperProps {
  current: Step;
  onStepClick?: (step: Step) => void;
}

export default function Stepper({ current, onStepClick }: StepperProps) {
  const currentIdx = stepOrder.indexOf(current);

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-10">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        const clickable = isDone && !!onStepClick;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={`flex flex-col items-center gap-1.5 ${clickable ? "cursor-pointer" : ""}`}
              onClick={() => clickable && onStepClick(step.key)}
            >
              <div
                className={`
                  flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-300
                  ${isDone ? "bg-[#22c55e] text-white" : ""}
                  ${isActive ? "bg-[#3b82f6] text-white ring-2 ring-[#3b82f6]/30 ring-offset-2 ring-offset-[#0a0a0a]" : ""}
                  ${!isDone && !isActive ? "bg-[#222] text-[#666]" : ""}
                  ${clickable ? "hover:ring-2 hover:ring-[#22c55e]/40 hover:ring-offset-2 hover:ring-offset-[#0a0a0a]" : ""}
                `}
              >
                <Icon size={16} />
              </div>
              <span className={`text-[10px] sm:text-xs font-medium ${isActive ? "text-white" : isDone ? "text-[#22c55e]" : "text-[#555]"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 sm:w-14 h-px mx-1 sm:mx-2 mb-5 transition-colors ${i < currentIdx ? "bg-[#22c55e]" : "bg-[#222]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

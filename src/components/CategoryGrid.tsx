"use client";

import {
  Utensils,
  Car,
  Stethoscope,
  Dumbbell,
  Scissors,
  Hotel,
  Wrench,
  Scale,
  Home,
  Cog,
} from "lucide-react";

const categories = [
  { label: "Restaurants", query: "Restaurants", icon: Utensils },
  { label: "Car Washes", query: "Car washes", icon: Car },
  { label: "Dentists", query: "Dentists", icon: Stethoscope },
  { label: "Gyms", query: "Gyms", icon: Dumbbell },
  { label: "Salons", query: "Beauty salons", icon: Scissors },
  { label: "Hotels", query: "Hotels", icon: Hotel },
  { label: "Plumbers", query: "Plumbers", icon: Wrench },
  { label: "Lawyers", query: "Lawyers", icon: Scale },
  { label: "Real Estate", query: "Real estate agents", icon: Home },
  { label: "Auto Repair", query: "Auto repair shops", icon: Cog },
];

interface Props {
  onSelect: (query: string) => void;
}

export default function CategoryGrid({ onSelect }: Props) {
  return (
    <div>
      <h3 className="text-xs text-[#666] uppercase tracking-wider mb-3 text-center">Popular Categories</h3>
      <div className="grid grid-cols-5 gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.label}
              onClick={() => onSelect(cat.query)}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-[#111] border border-[#222] hover:border-[#333] hover:bg-[#1a1a1a] transition-colors cursor-pointer group"
            >
              <Icon size={18} className="text-[#555] group-hover:text-[#3b82f6] transition-colors" />
              <span className="text-[10px] text-[#888] group-hover:text-white transition-colors">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

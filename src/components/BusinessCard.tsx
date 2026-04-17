"use client";

import { Business } from "@/lib/types";
import { Star, MapPin, Globe, ExternalLink, Bookmark, Check, Sparkles } from "lucide-react";

interface Props {
  business: Business;
  onSelect: (b: Business) => void;
  onSave?: (b: Business) => void;
  isSaved?: boolean;
  isPitched?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (b: Business) => void;
}

export default function BusinessCard({ business, onSelect, onSave, isSaved, isPitched, selectable, selected, onToggle }: Props) {
  return (
    <div className="relative group">
      {/* Pitched accent stripe */}
      {isPitched && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b from-[#8b5cf6] to-[#7c3aed] z-[5]" aria-hidden />
      )}
      {/* Checkbox for bulk select */}
      {selectable && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle?.(business); }}
          className={`absolute top-3 left-3 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
            selected ? "bg-[#3b82f6] border-[#3b82f6]" : "border-[#444] hover:border-[#666] bg-transparent"
          }`}
        >
          {selected && <Check size={12} className="text-white" />}
        </button>
      )}

      {/* Save/Bookmark button */}
      {onSave && (
        <button
          onClick={(e) => { e.stopPropagation(); onSave(business); }}
          className={`absolute top-3 right-3 z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            isSaved
              ? "bg-[#3b82f6]/20 text-[#3b82f6]"
              : "bg-[#1a1a1a] text-[#555] opacity-0 group-hover:opacity-100 hover:text-[#3b82f6] hover:bg-[#3b82f6]/10"
          }`}
          title={isSaved ? "Saved as lead" : "Save as lead"}
        >
          <Bookmark size={14} className={isSaved ? "fill-current" : ""} />
        </button>
      )}

      <button
        onClick={() => onSelect(business)}
        className={`w-full text-left bg-[#111] border rounded-xl p-4 hover:border-[#3b82f6]/50 hover:bg-[#141414] transition-all duration-200 cursor-pointer ${
          selected ? "border-[#3b82f6] bg-[#3b82f6]/5"
            : isPitched ? "border-[#8b5cf6]/30 bg-[#8b5cf6]/[0.03] hover:border-[#8b5cf6]/50"
            : "border-[#222]"
        } ${selectable ? "pl-10" : ""}`}
      >
        <div className="flex gap-4">
          {business.photo_url ? (
            <img
              src={business.photo_url}
              alt={business.name}
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
              <Globe size={24} className="text-[#444]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-white truncate group-hover:text-[#3b82f6] transition-colors">
                {business.name}
              </h3>
              <ExternalLink size={14} className="text-[#444] group-hover:text-[#3b82f6] flex-shrink-0 mt-1 transition-colors" />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={12} className="text-[#666]" />
              <span className="text-xs text-[#888] truncate">{business.address}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {business.rating && (
                <div className="flex items-center gap-1 mr-1">
                  <Star size={12} className="text-[#eab308] fill-[#eab308]" />
                  <span className="text-sm text-white font-medium">{business.rating}</span>
                  {business.total_ratings && (
                    <span className="text-xs text-[#666]">({business.total_ratings})</span>
                  )}
                </div>
              )}
              {business.website && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
                  Has Website
                </span>
              )}
              {!business.website && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20">
                  No Website
                </span>
              )}
              {isPitched && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 flex items-center gap-1 font-medium">
                  <Sparkles size={9} className="fill-current" /> Pitched
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

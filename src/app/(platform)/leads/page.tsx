"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLeads } from "@/hooks/useStorage";
import { deleteLead, updateLead } from "@/lib/storage";
import { addActivity } from "@/lib/storage";
import { useToast } from "@/lib/toast-context";
import StatusBadge from "@/components/StatusBadge";
import { LeadStatus } from "@/lib/types";
import {
  Users,
  Search,
  Trash2,
  ExternalLink,
  Star,
  MapPin,
  Download,
  ChevronDown,
  Globe,
  Filter,
} from "lucide-react";

type SortKey = "newest" | "oldest" | "name" | "rating";

export default function LeadsPage() {
  const leads = useLeads();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [searchText, setSearchText] = useState("");

  const filtered = useMemo(() => {
    let result = [...leads];

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }

    // Text search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (l) =>
          l.business.name.toLowerCase().includes(q) ||
          l.business.address.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "name":
        result.sort((a, b) => a.business.name.localeCompare(b.business.name));
        break;
      case "rating":
        result.sort((a, b) => (b.business.rating || 0) - (a.business.rating || 0));
        break;
    }

    return result;
  }, [leads, statusFilter, sortBy, searchText]);

  const handleDelete = (id: string, name: string) => {
    deleteLead(id);
    toast(`${name} removed`, "info");
  };

  const handleStatusChange = (id: string, status: LeadStatus, name: string) => {
    updateLead(id, { status });
    addActivity("lead_status_change", `Changed ${name} status to ${status}`, id);
    toast(`${name} marked as ${status}`, "success");
  };

  const handleExportAll = () => {
    if (filtered.length === 0) return;
    const header = "Business Name,Location,Website,Phone,Rating,Status,Grade\n";
    const rows = filtered.map((l) => {
      const b = l.business;
      return [
        `"${b.name}"`,
        `"${b.address}"`,
        b.website || "N/A",
        b.phone || "N/A",
        b.rating || "N/A",
        l.status,
        l.audit?.overallGrade || "N/A",
      ].join(",");
    });
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${filtered.length} leads`, "success");
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={24} /> Leads
          </h1>
          <p className="text-sm text-[#888] mt-0.5">{leads.length} total leads</p>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={handleExportAll}
            className="bg-[#111] border border-[#222] hover:border-[#333] text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search leads..."
            className="bg-[#111] border border-[#222] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#444] outline-none focus:border-[#333] w-48"
          />
        </div>

        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
            className="bg-[#111] border border-[#222] rounded-lg pl-9 pr-8 py-2 text-sm text-white outline-none appearance-none cursor-pointer focus:border-[#333]"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="responded">Responded</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="archived">Archived</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white outline-none appearance-none cursor-pointer focus:border-[#333] pr-8"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name A-Z</option>
            <option value="rating">Rating</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] pointer-events-none" />
        </div>
      </div>

      {/* Leads List */}
      {filtered.length === 0 ? (
        <div className="bg-[#111] border border-[#222] rounded-2xl p-12 text-center">
          <Users size={32} className="text-[#333] mx-auto mb-3" />
          <p className="text-sm text-[#666] mb-1">
            {leads.length === 0 ? "No leads yet" : "No leads match your filters"}
          </p>
          <p className="text-xs text-[#555]">
            {leads.length === 0
              ? "Save businesses from search results to start building your pipeline"
              : "Try adjusting your filters"
            }
          </p>
          {leads.length === 0 && (
            <Link href="/search" className="inline-flex items-center gap-2 mt-4 text-sm text-[#3b82f6] hover:underline">
              <Search size={14} /> Go to Search
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => {
            const b = lead.business;
            return (
              <div
                key={lead.id}
                className="bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors group"
              >
                <div className="flex items-center gap-4">
                  {/* Photo */}
                  {b.photo_url ? (
                    <img src={b.photo_url} alt={b.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                      <Globe size={18} className="text-[#444]" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/leads/${lead.id}`} className="text-sm font-semibold text-white hover:text-[#3b82f6] transition-colors truncate">
                        {b.name}
                      </Link>
                      <StatusBadge status={lead.status} />
                      {lead.audit && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          lead.audit.overallGrade.startsWith("A") ? "bg-[#22c55e]/10 text-[#22c55e]" :
                          lead.audit.overallGrade === "B" ? "bg-[#3b82f6]/10 text-[#3b82f6]" :
                          "bg-[#eab308]/10 text-[#eab308]"
                        }`}>
                          {lead.audit.overallGrade}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[#888] flex items-center gap-1 truncate">
                        <MapPin size={10} /> {b.address}
                      </span>
                      {b.rating && (
                        <span className="text-xs text-[#888] flex items-center gap-1 flex-shrink-0">
                          <Star size={10} className="text-[#eab308] fill-[#eab308]" /> {b.rating}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Status quick-change */}
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus, b.name)}
                      className="bg-transparent border border-[#222] rounded-lg px-2 py-1.5 text-[11px] text-[#888] outline-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="responded">Responded</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="archived">Archived</option>
                    </select>

                    <Link
                      href={`/leads/${lead.id}`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                    >
                      <ExternalLink size={14} />
                    </Link>

                    <button
                      onClick={() => handleDelete(lead.id, b.name)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#555] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DocumentSnapshot } from "firebase/firestore";
import {
  getNoWebsiteLeads,
  getTotalNoWebsiteLeadCount,
  getAllNoWebsiteLeadsForExport,
  getDistinctNoWebsiteLeadOwners,
  updateNoWebsiteLeadStatus,
  deleteNoWebsiteLeads,
  NoWebsiteLead,
  OwnerOption,
} from "@/lib/no-website-leads";
import { Search, Loader2, Download, ChevronLeft, ChevronRight, ArrowUpDown, Filter, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/lib/user-context";

type SortField = "date" | "name";
type SortDir = "asc" | "desc";
type BoolFilter = "all" | "yes" | "no";

const PAGE_SIZE = 10;

function StatusToggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
        value
          ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
          : "bg-[#333]/30 text-[#666] border border-[#333] hover:text-[#888]"
      }`}
    >
      {value ? "Yes" : "No"}
    </button>
  );
}

export default function NoWebsiteLeadsPage() {
  const [leads, setLeads] = useState<NoWebsiteLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<Map<number, DocumentSnapshot | null>>(new Map([[1, null]]));
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [contactedFilter, setContactedFilter] = useState<BoolFilter>("all");
  const [calledFilter, setCalledFilter] = useState<BoolFilter>("all");
  const [convertedFilter, setConvertedFilter] = useState<BoolFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [ownerEmailFilter, setOwnerEmailFilter] = useState<string>("");
  const [ownerNameFilter, setOwnerNameFilter] = useState<string>("");
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const currentUser = useCurrentUser();
  const isAdmin = currentUser.role === "admin";
  const effectiveOwnerFilter = isAdmin
    ? (ownerEmailFilter || null)
    : currentUser.email;

  const loadPage = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const cursor = pageCursors.get(page) ?? null;
      const { leads: data, lastDoc } = await getNoWebsiteLeads(cursor, PAGE_SIZE, effectiveOwnerFilter);
      setLeads(data);
      if (lastDoc && !pageCursors.has(page + 1)) {
        setPageCursors((prev) => new Map(prev).set(page + 1, lastDoc));
      }
    } catch (err) {
      console.error("Failed to load non-website leads:", err);
    }
    setLoading(false);
  }, [pageCursors, effectiveOwnerFilter]);

  useEffect(() => {
    setPageCursors(new Map([[1, null]]));
    setCurrentPage(1);
    loadPage(1);
    getTotalNoWebsiteLeadCount(effectiveOwnerFilter).then(setTotalCount).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveOwnerFilter]);

  useEffect(() => {
    if (!isAdmin) return;
    getDistinctNoWebsiteLeadOwners().then(setOwners).catch(() => setOwners([]));
  }, [isAdmin]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadPage(page);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleToggle = async (id: string, field: "contacted" | "called" | "converted") => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    const newValue = !lead[field];
    // Optimistic update
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, [field]: newValue } : l));
    try {
      await updateNoWebsiteLeadStatus(id, { [field]: newValue });
    } catch {
      // Revert on error
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, [field]: !newValue } : l));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === displayLeads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(displayLeads.map((l) => l.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      await deleteNoWebsiteLeads(Array.from(selected));
      setLeads((prev) => prev.filter((l) => !selected.has(l.id)));
      setTotalCount((prev) => prev - selected.size);
      setSelected(new Set());
    } catch (err) {
      console.error("Delete failed:", err);
    }
    setDeleting(false);
  };

  const displayLeads = useMemo(() => {
    let result = [...leads];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.businessName.toLowerCase().includes(q) ||
          l.businessAddress.toLowerCase().includes(q)
      );
    }

    if (contactedFilter !== "all") result = result.filter((l) => l.contacted === (contactedFilter === "yes"));
    if (calledFilter !== "all") result = result.filter((l) => l.called === (calledFilter === "yes"));
    if (convertedFilter !== "all") result = result.filter((l) => l.converted === (convertedFilter === "yes"));
    if (isAdmin && ownerNameFilter) result = result.filter((l) => l.ownerName === ownerNameFilter);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") cmp = a.createdAt.getTime() - b.createdAt.getTime();
      else if (sortField === "name") cmp = a.businessName.localeCompare(b.businessName);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [leads, searchQuery, sortField, sortDir, contactedFilter, calledFilter, convertedFilter, isAdmin, ownerNameFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir(field === "name" ? "asc" : "desc"); }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const all = await getAllNoWebsiteLeadsForExport(effectiveOwnerFilter);
      const header = "Business Name,Address,Phone,Rating,Contacted,Called,Converted,Owner\n";
      const escape = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
      const rows = all.map((l) =>
        [
          escape(l.businessName),
          escape(l.businessAddress),
          escape(l.businessPhone || "N/A"),
          l.rating ?? "N/A",
          l.contacted ? "Yes" : "No",
          l.called ? "Yes" : "No",
          l.converted ? "Yes" : "No",
          escape(l.ownerEmail || "N/A"),
        ].join(",")
      );
      const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `no_website_leads_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
    setExporting(false);
  };

  const hasActiveFilters =
    contactedFilter !== "all" ||
    calledFilter !== "all" ||
    convertedFilter !== "all" ||
    (isAdmin && (ownerEmailFilter !== "" || ownerNameFilter !== ""));

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">No-Website Leads</h1>
          <p className="text-sm text-[#888] mt-0.5">
            {totalCount} lead{totalCount !== 1 ? "s" : ""}{" "}
            {currentUser.role === "admin" ? "saved (all users)" : "saved by you"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-[#ef4444]/10 border border-[#ef4444]/20 hover:border-[#ef4444]/40 text-[#ef4444] text-sm font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete {selected.size} selected
            </button>
          )}
          <button
            onClick={handleExportCSV}
            disabled={exporting || totalCount === 0}
            className="bg-[#111] border border-[#222] hover:border-[#333] text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export CSV
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by business name or address..."
              className="w-full bg-[#111] border border-[#222] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#444] outline-none focus:border-[#3b82f6]/50 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={`${sortField}-${sortDir}`}
              onChange={(e) => { const [f, d] = e.target.value.split("-"); setSortField(f as SortField); setSortDir(d as SortDir); }}
              className="appearance-none bg-[#111] border border-[#222] rounded-xl pl-3 pr-8 py-2.5 text-sm text-white outline-none cursor-pointer focus:border-[#3b82f6]/50"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
            <ArrowUpDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] pointer-events-none hidden" />
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter size={14} className="text-[#666]" />
          <select value={contactedFilter} onChange={(e) => setContactedFilter(e.target.value as BoolFilter)}
            className="appearance-none bg-[#111] border border-[#222] rounded-lg pl-2.5 pr-6 py-1.5 text-xs text-white outline-none cursor-pointer">
            <option value="all">Contacted: All</option><option value="yes">Contacted: Yes</option><option value="no">Contacted: No</option>
          </select>
          <select value={calledFilter} onChange={(e) => setCalledFilter(e.target.value as BoolFilter)}
            className="appearance-none bg-[#111] border border-[#222] rounded-lg pl-2.5 pr-6 py-1.5 text-xs text-white outline-none cursor-pointer">
            <option value="all">Called: All</option><option value="yes">Called: Yes</option><option value="no">Called: No</option>
          </select>
          <select value={convertedFilter} onChange={(e) => setConvertedFilter(e.target.value as BoolFilter)}
            className="appearance-none bg-[#111] border border-[#222] rounded-lg pl-2.5 pr-6 py-1.5 text-xs text-white outline-none cursor-pointer">
            <option value="all">Converted: All</option><option value="yes">Converted: Yes</option><option value="no">Converted: No</option>
          </select>
          {isAdmin && (
            <>
              <select
                value={ownerEmailFilter}
                onChange={(e) => setOwnerEmailFilter(e.target.value)}
                className="appearance-none bg-[#111] border border-[#222] rounded-lg pl-2.5 pr-6 py-1.5 text-xs text-white outline-none cursor-pointer max-w-[200px]"
                title="Filter by owner email"
              >
                <option value="">Owner email: All</option>
                {owners.map((o) => (
                  <option key={`email-${o.email}`} value={o.email}>{o.email}</option>
                ))}
              </select>
              <select
                value={ownerNameFilter}
                onChange={(e) => setOwnerNameFilter(e.target.value)}
                className="appearance-none bg-[#111] border border-[#222] rounded-lg pl-2.5 pr-6 py-1.5 text-xs text-white outline-none cursor-pointer max-w-[200px]"
                title="Filter by owner name"
              >
                <option value="">Owner name: All</option>
                {Array.from(new Set(owners.map((o) => o.name).filter(Boolean))).map((n) => (
                  <option key={`name-${n}`} value={n}>{n}</option>
                ))}
              </select>
            </>
          )}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setContactedFilter("all");
                setCalledFilter("all");
                setConvertedFilter("all");
                setOwnerEmailFilter("");
                setOwnerNameFilter("");
              }}
              className="text-xs text-[#ef4444] hover:text-[#f87171] cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#3b82f6]" />
        </div>
      ) : displayLeads.length === 0 ? (
        <div className="bg-[#111] border border-[#222] rounded-2xl p-12 text-center">
          <p className="text-[#666] text-sm">
            {searchQuery || hasActiveFilters
              ? "No leads match your filters"
              : "No non-website leads yet. Add some from the Search page's \"No Website\" tab."}
          </p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#222]">
                  <th className="w-10 px-3 py-3.5">
                    <input type="checkbox" checked={selected.size > 0 && selected.size === displayLeads.length}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-[#444] bg-transparent cursor-pointer accent-[#3b82f6]" />
                  </th>
                  <th onClick={() => handleSort("name")}
                    className="text-left text-xs text-[#666] font-medium uppercase tracking-wider px-4 py-3.5 cursor-pointer hover:text-white transition-colors">
                    Business {sortField === "name" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-left text-xs text-[#666] font-medium uppercase tracking-wider px-4 py-3.5">Phone</th>
                  <th className="text-left text-xs text-[#666] font-medium uppercase tracking-wider px-4 py-3.5">Rating</th>
                  {currentUser.role === "admin" && (
                    <th className="text-left text-xs text-[#666] font-medium uppercase tracking-wider px-4 py-3.5">Owner</th>
                  )}
                  <th className="text-center text-xs text-[#666] font-medium uppercase tracking-wider px-3 py-3.5">Contacted</th>
                  <th className="text-center text-xs text-[#666] font-medium uppercase tracking-wider px-3 py-3.5">Called</th>
                  <th className="text-center text-xs text-[#666] font-medium uppercase tracking-wider px-3 py-3.5">Converted</th>
                  <th onClick={() => handleSort("date")}
                    className="text-right text-xs text-[#666] font-medium uppercase tracking-wider px-4 py-3.5 cursor-pointer hover:text-white transition-colors">
                    Date {sortField === "date" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayLeads.map((l) => (
                  <tr key={l.id} className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#1a1a1a] transition-colors">
                    <td className="w-10 px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(l.id)}
                        onChange={() => toggleSelect(l.id)}
                        className="w-3.5 h-3.5 rounded border-[#444] bg-transparent cursor-pointer accent-[#3b82f6]" />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-white">{l.businessName}</p>
                      <p className="text-xs text-[#666] mt-0.5 truncate max-w-[200px]">{l.businessAddress}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[#888]">{l.businessPhone || "N/A"}</td>
                    <td className="px-4 py-3.5 text-sm text-[#888]">
                      {l.rating ? `${l.rating}/5${l.totalRatings ? ` (${l.totalRatings})` : ""}` : "N/A"}
                    </td>
                    {currentUser.role === "admin" && (
                      <td className="px-4 py-3.5 text-xs text-[#888]">
                        <div className="truncate max-w-[160px]" title={l.ownerEmail}>
                          {l.ownerName || l.ownerEmail || "—"}
                        </div>
                      </td>
                    )}
                    <td className="px-3 py-3.5 text-center">
                      <StatusToggle value={l.contacted} onChange={() => handleToggle(l.id, "contacted")} />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <StatusToggle value={l.called} onChange={() => handleToggle(l.id, "called")} />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <StatusToggle value={l.converted} onChange={() => handleToggle(l.id, "converted")} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[#888] text-right whitespace-nowrap">{l.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}
            className="p-2 rounded-lg bg-[#111] border border-[#222] text-[#888] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let page: number;
            if (totalPages <= 5) page = i + 1;
            else if (currentPage <= 3) page = i + 1;
            else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
            else page = currentPage - 2 + i;
            return (
              <button key={page} onClick={() => handlePageChange(page)} disabled={!pageCursors.has(page)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  page === currentPage ? "bg-[#3b82f6] text-white" : "bg-[#111] border border-[#222] text-[#888] hover:text-white hover:border-[#333]"
                } disabled:opacity-30 disabled:cursor-not-allowed`}>
                {page}
              </button>
            );
          })}
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages || !pageCursors.has(currentPage + 1)}
            className="p-2 rounded-lg bg-[#111] border border-[#222] text-[#888] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

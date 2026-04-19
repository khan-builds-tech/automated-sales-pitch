"use client";

import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Business, AuditResult, SalesPitch, Step } from "@/lib/types";
import Stepper from "@/components/Stepper";
import BusinessCard from "@/components/BusinessCard";
import AuditReport from "@/components/AuditReport";
import SalesPitchView from "@/components/SalesPitchView";
import SearchFilters, { Filters } from "@/components/SearchFilters";
import CategoryGrid from "@/components/CategoryGrid";
import BulkActionBar from "@/components/BulkActionBar";
import BulkProgressModal from "@/components/BulkProgressModal";
import { Search, Loader2, ArrowLeft, Clock, CheckSquare, Square } from "lucide-react";
import { addActivity, addSearchHistory, saveLead, generateId, isBusinessSaved, getLeadByPlaceId, updateLead, getSearchHistory } from "@/lib/storage";
import { useToast } from "@/lib/toast-context";
import { savePitch as savePitchToFirestore, getPitchByPlaceId as getExistingPitch, getPitchedPlaceIds, updatePitchStatus, SavedPitch } from "@/lib/pitch-storage";
import PitchDetailModal from "@/components/PitchDetailModal";
import { useCurrentUser } from "@/lib/user-context";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#3b82f6]" /></div>}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [pitch, setPitch] = useState<SalesPitch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [displayCount, setDisplayCount] = useState(10);
  const [existingPitch, setExistingPitch] = useState<SavedPitch | null>(null);
  const [showExistingPitchModal, setShowExistingPitchModal] = useState(false);
  const [savedPitchId, setSavedPitchId] = useState<string | null>(null);
  const { toast } = useToast();
  const currentUser = useCurrentUser();
  const ownerFilter = currentUser.role === "admin" ? null : currentUser.email;

  // Filters
  const [filters, setFilters] = useState<Filters>({ minRating: 0, websiteFilter: "all", pitchedFilter: "all" });

  // Pitched place IDs (from Firestore)
  const [pitchedIds, setPitchedIds] = useState<Set<string>>(new Set());

  // Bulk select
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<{ items: { name: string; status: "pending" | "in_progress" | "done" | "error" }[]; current: number; total: number; title: string } | null>(null);

  // Search history
  const [searchHistory, setSearchHistoryState] = useState<{ query: string; resultCount: number }[]>([]);

  useEffect(() => {
    setSearchHistoryState(getSearchHistory().map(h => ({ query: h.query, resultCount: h.resultCount })));
  }, []);

  // Auto-search if q param present
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q.trim() && step === "search") {
      setQuery(q);
      doSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setBusinesses([]);
    setDisplayCount(10);
    setSelected(new Set());
    setBulkMode(false);
    setPitchedIds(new Set());

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Search failed");
        setLoading(false);
        return;
      }
      setBusinesses(data.businesses);
      if (data.businesses.length > 0) {
        setStep("select");
        addSearchHistory({ query: q, resultCount: data.businesses.length, timestamp: new Date().toISOString() });
        addActivity("search", `Searched "${q}" — ${data.businesses.length} results`);
        setSearchHistoryState(getSearchHistory().map(h => ({ query: h.query, resultCount: h.resultCount })));

        // Check which businesses already have saved pitches (non-blocking)
        const placeIds = (data.businesses as Business[]).map((b) => b.place_id);
        getPitchedPlaceIds(placeIds, ownerFilter).then(setPitchedIds).catch(() => { /* silent */ });
      } else {
        setError("No businesses found. Try a different search.");
      }
    } catch {
      setError("Network error — please try again");
    }
    setLoading(false);
  };

  const handleSearch = useCallback(() => doSearch(query), [query]);

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      if (filters.minRating > 0 && (!b.rating || b.rating < filters.minRating)) return false;
      if (filters.websiteFilter === "has" && !b.website) return false;
      if (filters.websiteFilter === "none" && b.website) return false;
      if (filters.pitchedFilter === "pitched" && !pitchedIds.has(b.place_id)) return false;
      if (filters.pitchedFilter === "new" && pitchedIds.has(b.place_id)) return false;
      return true;
    });
  }, [businesses, filters, pitchedIds]);

  const handleSelect = useCallback(async (biz: Business) => {
    setSelectedBiz(biz);
    setStep("audit");

    // If same business was already audited, reuse cached audit
    if (selectedBiz?.place_id === biz.place_id && audit) {
      return;
    }

    // Different business — clear stale data and fetch fresh
    setAudit(null);
    setPitch(null);
    setExistingPitch(null);
    setSavedPitchId(null);
    setLoading(true);
    setError("");

    // Check Firestore for existing pitch (non-blocking)
    getExistingPitch(biz.place_id, ownerFilter).then((saved) => {
      if (saved) {
        setExistingPitch(saved);
        toast("A pitch was already generated for this business", "info");
      }
    }).catch(() => { /* silent */ });

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business: biz }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Audit failed");
        setStep("select");
        setLoading(false);
        return;
      }
      setAudit(data);
      addActivity("audit", `Audited ${biz.name}`, biz.place_id);
      const existingLead = getLeadByPlaceId(biz.place_id);
      if (existingLead) {
        updateLead(existingLead.id, { audit: data });
      }
    } catch {
      setError("Network error — please try again");
      setStep("select");
    }
    setLoading(false);
  }, [selectedBiz, audit, toast, ownerFilter]);

  const handleGeneratePitch = useCallback(async () => {
    if (!audit) return;

    // If pitch already exists for current business, reuse it
    if (pitch) {
      setStep("pitch");
      return;
    }

    setStep("pitch");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/generate-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate pitch");
        setStep("audit");
        setLoading(false);
        return;
      }
      setPitch(data);
      addActivity("pitch", `Generated pitch for ${audit.business.name}`, audit.business.place_id);
      const existingLead = getLeadByPlaceId(audit.business.place_id);
      if (existingLead) {
        updateLead(existingLead.id, { pitch: data });
      }

      // Auto-save to Firestore
      toast("Saving sales pitch...", "info");
      savePitchToFirestore(audit, data.email.subject, {
        email: currentUser.email,
        name: currentUser.name,
      })
        .then((docId) => { setSavedPitchId(docId); toast("Sales pitch saved!", "success"); })
        .catch(() => { /* silent */ });
    } catch {
      setError("Network error — please try again");
      setStep("audit");
    }
    setLoading(false);
  }, [audit, pitch, toast, currentUser.email, currentUser.name]);

  const handleEmailSent = useCallback((recipientEmail: string) => {
    if (audit) {
      addActivity("email_sent", `Sent email to ${audit.business.name}`, audit.business.place_id);
      const existingLead = getLeadByPlaceId(audit.business.place_id);
      if (existingLead) {
        updateLead(existingLead.id, { status: "contacted", emailSentAt: new Date().toISOString(), contactedAt: new Date().toISOString() });
      }
      // Update Firestore emailSent + recipientEmail
      const firestoreUpdate = { emailSent: true, recipientEmail };
      if (savedPitchId) {
        updatePitchStatus(savedPitchId, firestoreUpdate).catch(() => {});
      } else {
        getExistingPitch(audit.business.place_id, ownerFilter).then((saved) => {
          if (saved) updatePitchStatus(saved.id, firestoreUpdate).catch(() => {});
        }).catch(() => {});
      }
      toast("Email sent successfully!", "success");
    }
  }, [audit, toast, savedPitchId, ownerFilter]);

  const handleSaveLead = useCallback((biz: Business) => {
    if (isBusinessSaved(biz.place_id)) {
      toast("Already saved as a lead", "info");
      return;
    }
    saveLead({
      id: biz.place_id,
      business: biz,
      status: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    addActivity("lead_saved", `Saved ${biz.name} as a lead`, biz.place_id);
    toast(`${biz.name} saved as lead`, "success");
  }, [toast]);

  // Bulk operations
  const handleBulkSaveAll = () => {
    const selectedBizs = businesses.filter((b) => selected.has(b.place_id));
    let saved = 0;
    selectedBizs.forEach((biz) => {
      if (!isBusinessSaved(biz.place_id)) {
        saveLead({
          id: biz.place_id,
          business: biz,
          status: "new",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        saved++;
      }
    });
    addActivity("lead_saved", `Bulk saved ${saved} leads`);
    toast(`${saved} leads saved`, "success");
    setSelected(new Set());
    setBulkMode(false);
  };

  const handleBulkAudit = async () => {
    const selectedBizs = businesses.filter((b) => selected.has(b.place_id));
    if (selectedBizs.length === 0) return;

    const items = selectedBizs.map((b) => ({ name: b.name, status: "pending" as const }));
    setBulkProgress({ items, current: 0, total: selectedBizs.length, title: "Bulk Audit" });

    for (let i = 0; i < selectedBizs.length; i++) {
      const biz = selectedBizs[i];
      setBulkProgress((prev) => prev ? {
        ...prev,
        current: i,
        items: prev.items.map((item, idx) => idx === i ? { ...item, status: "in_progress" } : item),
      } : null);

      try {
        const res = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ business: biz }),
        });
        const data = await res.json();

        // Save as lead with audit data
        if (!isBusinessSaved(biz.place_id)) {
          saveLead({
            id: biz.place_id,
            business: biz,
            status: "new",
            audit: res.ok ? data : undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else {
          const existingLead = getLeadByPlaceId(biz.place_id);
          if (existingLead && res.ok) {
            updateLead(existingLead.id, { audit: data });
          }
        }

        setBulkProgress((prev) => prev ? {
          ...prev,
          current: i + 1,
          items: prev.items.map((item, idx) => idx === i ? { ...item, status: res.ok ? "done" : "error" } : item),
        } : null);
      } catch {
        setBulkProgress((prev) => prev ? {
          ...prev,
          current: i + 1,
          items: prev.items.map((item, idx) => idx === i ? { ...item, status: "error" } : item),
        } : null);
      }
    }

    addActivity("audit", `Bulk audited ${selectedBizs.length} businesses`);
  };

  const handleBulkExport = () => {
    const selectedBizs = businesses.filter((b) => selected.has(b.place_id));
    if (selectedBizs.length === 0) return;
    const header = "Business Name,Location,Website,Phone,Rating\n";
    const rows = selectedBizs.map((b) =>
      [
        `"${b.name}"`,
        `"${b.address}"`,
        b.website || "N/A",
        b.phone || "N/A",
        b.rating || "N/A",
      ].join(",")
    );
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `businesses_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${selectedBizs.length} businesses`, "success");
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredBusinesses.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredBusinesses.map((b) => b.place_id)));
    }
  };

  const handleReset = useCallback(() => {
    setStep("search");
    setQuery("");
    setBusinesses([]);
    setSelectedBiz(null);
    setAudit(null);
    setPitch(null);
    setError("");
    setDisplayCount(10);
    setSelected(new Set());
    setBulkMode(false);
  }, []);

  const handleBack = useCallback(() => {
    if (step === "select") setStep("search");
    else if (step === "audit") setStep("select");
    else if (step === "pitch") setStep("audit");
  }, [step]);

  const handleStepClick = useCallback((targetStep: Step) => {
    const order: Step[] = ["search", "select", "audit", "pitch"];
    const currentIdx = order.indexOf(step);
    const targetIdx = order.indexOf(targetStep);
    if (targetIdx < currentIdx) {
      setStep(targetStep);
    }
  }, [step]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Search & Pitch</h1>
          <p className="text-sm text-[#888] mt-0.5">Find businesses, audit them, and generate personalized pitches</p>
        </div>
        {step !== "search" && (
          <button onClick={handleBack} className="text-xs text-[#666] hover:text-white flex items-center gap-1 transition-colors cursor-pointer">
            <ArrowLeft size={14} /> Back
          </button>
        )}
      </div>

      <Stepper current={step} onStepClick={handleStepClick} />

      {/* STEP 1: Search */}
      {step === "search" && (
        <div className="fade-in max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
              Find & Pitch Businesses
            </h2>
            <p className="text-[#888] text-sm">
              Search any location or business type. We&apos;ll audit their digital presence and craft a personalized sales pitch.
            </p>
          </div>

          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder='e.g. "Carwashes in Paris" or "Restaurants London"'
              className="w-full bg-[#111] border border-[#222] rounded-xl pl-11 pr-4 py-4 text-white placeholder-[#444] outline-none focus:border-[#3b82f6]/50 transition-colors text-sm"
              autoFocus
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="w-full mt-4 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Searching...</>
            ) : (
              <><Search size={16} /> Search Businesses</>
            )}
          </button>

          {error && (
            <p className="text-sm text-[#ef4444] text-center mt-4">{error}</p>
          )}

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs text-[#666] uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock size={12} /> Recent Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {searchHistory.slice(0, 6).map((h, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuery(h.query); doSearch(h.query); }}
                    className="text-xs px-3 py-1.5 rounded-full bg-[#111] border border-[#222] text-[#888] hover:text-white hover:border-[#333] transition-colors cursor-pointer"
                  >
                    {h.query} <span className="text-[#555]">({h.resultCount})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Grid */}
          <div className="mt-6">
            <CategoryGrid onSelect={(q) => { setQuery(q); }} />
          </div>
        </div>
      )}

      {/* STEP 2: Select */}
      {step === "select" && (
        <div className="fade-in">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-white">Select a Business</h2>
              <p className="text-xs text-[#888] mt-0.5">
                Showing {Math.min(displayCount, filteredBusinesses.length)} of {filteredBusinesses.length} results for &quot;{query}&quot;
              </p>
            </div>
            {pitchedIds.size > 0 && (
              <button
                onClick={() => setFilters((f) => ({ ...f, pitchedFilter: f.pitchedFilter === "pitched" ? "all" : "pitched" }))}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  filters.pitchedFilter === "pitched"
                    ? "bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/40"
                    : "bg-[#8b5cf6]/5 text-[#8b5cf6]/80 border-[#8b5cf6]/20 hover:bg-[#8b5cf6]/10"
                }`}
                title="Toggle: show only businesses with a saved pitch"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                {pitchedIds.size} already pitched
              </button>
            )}
          </div>

          {/* Filters */}
          <SearchFilters filters={filters} onChange={setFilters} />

          {error && <p className="text-sm text-[#ef4444] mb-4">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredBusinesses.slice(0, displayCount).map((biz) => (
              <BusinessCard
                key={biz.place_id}
                business={biz}
                onSelect={handleSelect}
                onSave={handleSaveLead}
                isSaved={isBusinessSaved(biz.place_id)}
                isPitched={pitchedIds.has(biz.place_id)}
              />
            ))}
          </div>

          {displayCount < filteredBusinesses.length && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setDisplayCount((prev) => prev + 10)}
                className="text-sm text-[#3b82f6] hover:text-[#60a5fa] bg-[#111] border border-[#222] hover:border-[#3b82f6]/50 px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Load More Businesses ({filteredBusinesses.length - displayCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Audit */}
      {step === "audit" && (
        <>
          {loading ? (
            <div className="fade-in flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={32} className="animate-spin text-[#3b82f6]" />
              <div className="text-center">
                <p className="text-white font-medium">Auditing {selectedBiz?.name}...</p>
                <p className="text-xs text-[#666] mt-1">Analyzing website performance, SEO, competitors</p>
              </div>
              <div className="flex gap-2 mt-4">
                {["Performance", "SEO", "UX", "Competitors"].map((item, i) => (
                  <div key={item} className="skeleton h-6 w-20 rounded-full" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          ) : audit ? (
            <>
              {existingPitch && (
                <div className="mb-4 bg-[#1a1a2e] border border-[#3b82f6]/20 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">A pitch already exists for this business</p>
                    <p className="text-xs text-[#888] mt-0.5">Generated on {existingPitch.createdAt.toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => setShowExistingPitchModal(true)}
                    className="text-sm text-[#3b82f6] hover:text-[#60a5fa] bg-[#3b82f6]/10 border border-[#3b82f6]/20 px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    View Existing Pitch
                  </button>
                </div>
              )}
              <AuditReport audit={audit} onProceed={handleGeneratePitch} />
            </>
          ) : null}
        </>
      )}

      {/* STEP 4: Pitch */}
      {step === "pitch" && (
        <>
          {loading ? (
            <div className="fade-in flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={32} className="animate-spin text-[#8b5cf6]" />
              <div className="text-center">
                <p className="text-white font-medium">Generating AI Sales Pitch...</p>
                <p className="text-xs text-[#666] mt-1">Crafting personalized email and call script using GPT</p>
              </div>
              <div className="flex gap-2 mt-4">
                {["Email", "Call Script", "Objections", "CTA"].map((item, i) => (
                  <div key={item} className="skeleton h-6 w-20 rounded-full" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          ) : pitch && audit ? (
            <SalesPitchView audit={audit} pitch={pitch} onEmailSent={handleEmailSent} />
          ) : null}
        </>
      )}

      {/* Existing Pitch Modal */}
      {showExistingPitchModal && existingPitch && (
        <PitchDetailModal pitch={existingPitch} onClose={() => setShowExistingPitchModal(false)} />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLead } from "@/hooks/useStorage";
import { updateLead, addActivity } from "@/lib/storage";
import { useToast } from "@/lib/toast-context";
import { StatusSelector } from "@/components/StatusBadge";
import StatusBadge from "@/components/StatusBadge";
import AuditReport from "@/components/AuditReport";
import SalesPitchView from "@/components/SalesPitchView";
import { LeadStatus, AuditResult, SalesPitch } from "@/lib/types";
import { savePitch as savePitchToFirestore, getPitchByPlaceId as getExistingPitch, updatePitchStatus } from "@/lib/pitch-storage";
import { useCurrentUser } from "@/lib/user-context";
import {
  ArrowLeft,
  Globe,
  MapPin,
  Star,
  Phone,
  BarChart3,
  Sparkles,
  Mail,
  Loader2,
  StickyNote,
} from "lucide-react";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const lead = useLead(id);
  const currentUser = useCurrentUser();
  const ownerFilter = currentUser.role === "admin" ? null : currentUser.email;

  const [tab, setTab] = useState<"overview" | "audit" | "pitch">("overview");
  const [notes, setNotes] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [pitching, setPitching] = useState(false);
  const [localAudit, setLocalAudit] = useState<AuditResult | null>(null);
  const [localPitch, setLocalPitch] = useState<SalesPitch | null>(null);

  useEffect(() => {
    if (lead) {
      setNotes(lead.notes || "");
      if (lead.audit) setLocalAudit(lead.audit);
      if (lead.pitch) setLocalPitch(lead.pitch);
    }
  }, [lead]);

  if (!lead) {
    return (
      <div className="fade-in flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-[#888]">Lead not found</p>
        <Link href="/leads" className="text-sm text-[#3b82f6] hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Leads
        </Link>
      </div>
    );
  }

  const b = lead.business;

  const handleStatusChange = (status: LeadStatus) => {
    updateLead(id, { status });
    addActivity("lead_status_change", `Changed ${b.name} status to ${status}`, id);
    toast(`Status changed to ${status}`, "success");
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    updateLead(id, { notes: val });
  };

  const handleRunAudit = async () => {
    setAuditing(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business: b }),
      });
      const data = await res.json();
      if (res.ok) {
        setLocalAudit(data);
        updateLead(id, { audit: data });
        addActivity("audit", `Audited ${b.name}`, id);
        toast("Audit complete!", "success");
        setTab("audit");
      } else {
        toast(data.error || "Audit failed", "error");
      }
    } catch {
      toast("Network error", "error");
    }
    setAuditing(false);
  };

  const handleGeneratePitch = async () => {
    const audit = localAudit || lead.audit;
    if (!audit) {
      toast("Run an audit first", "info");
      return;
    }
    setPitching(true);
    try {
      const res = await fetch("/api/generate-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit }),
      });
      const data = await res.json();
      if (res.ok) {
        setLocalPitch(data);
        updateLead(id, { pitch: data });
        addActivity("pitch", `Generated pitch for ${b.name}`, id);
        toast("Pitch generated!", "success");
        setTab("pitch");

        // Auto-save to Firestore (fire-and-forget)
        const auditData = localAudit || lead.audit;
        if (auditData) {
          toast("Saving sales pitch...", "info");
          savePitchToFirestore(auditData, data.email.subject, {
            email: currentUser.email,
            name: currentUser.name,
          })
            .then(() => toast("Sales pitch saved!", "success"))
            .catch(() => { /* silent */ });
        }
      } else {
        toast(data.error || "Pitch failed", "error");
      }
    } catch {
      toast("Network error", "error");
    }
    setPitching(false);
  };

  const handleSent = (recipientEmail: string) => {
    updateLead(id, { status: "contacted", emailSentAt: new Date().toISOString(), contactedAt: new Date().toISOString() });
    addActivity("email_sent", `Sent email to ${b.name}`, id);
    // Update Firestore
    getExistingPitch(b.place_id, ownerFilter).then((saved) => {
      if (saved) updatePitchStatus(saved.id, { emailSent: true, recipientEmail }).catch(() => {});
    }).catch(() => {});
    toast("Email sent!", "success");
  };

  return (
    <div className="fade-in">
      {/* Back nav */}
      <Link href="/leads" className="text-xs text-[#666] hover:text-white flex items-center gap-1 transition-colors mb-6 w-fit">
        <ArrowLeft size={14} /> Back to Leads
      </Link>

      {/* Business Info Header */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          {b.photo_url ? (
            <img src={b.photo_url} alt={b.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
              <Globe size={24} className="text-[#444]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-white truncate">{b.name}</h1>
              <StatusBadge status={lead.status} />
              {lead.audit && (
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                  lead.audit.overallGrade.startsWith("A") ? "bg-[#22c55e]/10 text-[#22c55e]" :
                  lead.audit.overallGrade === "B" ? "bg-[#3b82f6]/10 text-[#3b82f6]" :
                  "bg-[#eab308]/10 text-[#eab308]"
                }`}>
                  Grade: {lead.audit.overallGrade}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-[#888]">
              <span className="flex items-center gap-1"><MapPin size={12} /> {b.address}</span>
              {b.rating && (
                <span className="flex items-center gap-1"><Star size={12} className="text-[#eab308] fill-[#eab308]" /> {b.rating}</span>
              )}
              {b.phone && (
                <span className="flex items-center gap-1"><Phone size={12} /> {b.phone}</span>
              )}
            </div>
            {b.website && (
              <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[#3b82f6] hover:underline flex items-center gap-1 mt-1">
                <Globe size={10} /> {b.website}
              </a>
            )}
          </div>
        </div>

        {/* Status Selector */}
        <div className="mt-5 pt-5 border-t border-[#1a1a1a]">
          <label className="text-xs text-[#666] uppercase tracking-wider mb-2 block">Status</label>
          <StatusSelector status={lead.status} onChange={handleStatusChange} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleRunAudit}
          disabled={auditing}
          className="bg-[#111] border border-[#222] hover:border-[#3b82f6]/50 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {auditing ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
          {auditing ? "Auditing..." : lead.audit ? "Re-Audit" : "Run Audit"}
        </button>
        <button
          onClick={handleGeneratePitch}
          disabled={pitching || (!localAudit && !lead.audit)}
          className="bg-[#111] border border-[#222] hover:border-[#8b5cf6]/50 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {pitching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {pitching ? "Generating..." : lead.pitch ? "Re-Generate Pitch" : "Generate Pitch"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#111] border border-[#222] rounded-xl overflow-hidden mb-6">
        {(["overview", "audit", "pitch"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer capitalize ${
              tab === t ? "bg-[#3b82f6] text-white" : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
            }`}
          >
            {t === "overview" ? "Overview" : t === "audit" ? "Audit Results" : "Sales Pitch"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Notes */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3 flex items-center gap-2">
              <StickyNote size={14} /> Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add notes about this lead..."
              rows={4}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 text-sm text-[#ccc] placeholder-[#444] outline-none focus:border-[#333] resize-none"
            />
          </div>

          {/* Timeline info */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">Timeline</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#666]">Added</span>
                <span className="text-[#ccc]">{new Date(lead.createdAt).toLocaleDateString()}</span>
              </div>
              {lead.contactedAt && (
                <div className="flex justify-between">
                  <span className="text-[#666]">Contacted</span>
                  <span className="text-[#ccc]">{new Date(lead.contactedAt).toLocaleDateString()}</span>
                </div>
              )}
              {lead.emailSentAt && (
                <div className="flex justify-between">
                  <span className="text-[#666]">Email Sent</span>
                  <span className="text-[#ccc]">{new Date(lead.emailSentAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "audit" && (
        <>
          {localAudit ? (
            <AuditReport audit={localAudit} onProceed={handleGeneratePitch} />
          ) : (
            <div className="bg-[#111] border border-[#222] rounded-2xl p-12 text-center">
              <BarChart3 size={32} className="text-[#333] mx-auto mb-3" />
              <p className="text-sm text-[#666]">No audit data yet</p>
              <button
                onClick={handleRunAudit}
                disabled={auditing}
                className="mt-4 text-sm text-[#3b82f6] hover:underline cursor-pointer"
              >
                Run Audit
              </button>
            </div>
          )}
        </>
      )}

      {tab === "pitch" && (
        <>
          {localPitch && localAudit ? (
            <SalesPitchView audit={localAudit} pitch={localPitch} onEmailSent={handleSent} />
          ) : (
            <div className="bg-[#111] border border-[#222] rounded-2xl p-12 text-center">
              <Sparkles size={32} className="text-[#333] mx-auto mb-3" />
              <p className="text-sm text-[#666]">No pitch generated yet</p>
              <button
                onClick={handleGeneratePitch}
                disabled={!localAudit && !lead.audit}
                className="mt-4 text-sm text-[#3b82f6] hover:underline cursor-pointer disabled:text-[#555]"
              >
                {localAudit || lead.audit ? "Generate Pitch" : "Run audit first"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

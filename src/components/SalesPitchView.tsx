"use client";

import { useState } from "react";
import { AuditResult, SalesPitch } from "@/lib/types";
import { getPitchByPlaceId, updatePitchStatus } from "@/lib/pitch-storage";
import { Send, Phone, Mail, Eye, Edit3, Loader2, AlertCircle, Copy, CheckCircle2, Search } from "lucide-react";
import { useCurrentUser } from "@/lib/user-context";
import { parseRecipients, validateRecipients } from "@/lib/email-utils";

interface Props {
  audit: AuditResult;
  pitch: SalesPitch;
  onEmailSent: (recipientEmail: string) => void;
}

export default function SalesPitchView({ audit, pitch, onEmailSent }: Props) {
  const [tab, setTab] = useState<"email" | "call">("email");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(pitch.email.subject);
  const [emailBody, setEmailBody] = useState(pitch.email.body);
  const [emailMode, setEmailMode] = useState<"preview" | "edit">("preview");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [called, setCalled] = useState(false);
  const [fetchingEmails, setFetchingEmails] = useState(false);
  const [fetchInfo, setFetchInfo] = useState<string | null>(null);
  const currentUser = useCurrentUser();
  const ownerFilter = currentUser.role === "admin" ? null : currentUser.email;

  const website = audit.business.website || "";

  const handleFetchEmails = async () => {
    if (!website) return;
    setFetchingEmails(true);
    setFetchInfo(null);
    try {
      const res = await fetch("/api/fetch-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: website }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFetchInfo(data.error || "Couldn't fetch from website");
        setFetchingEmails(false);
        return;
      }
      const found: string[] = Array.isArray(data.emails) ? data.emails : [];
      const pagesScanned: number = typeof data.pagesScanned === "number" ? data.pagesScanned : 0;

      if (found.length === 0) {
        setFetchInfo(
          pagesScanned === 0
            ? "Couldn't reach the website"
            : "No emails found on the website"
        );
      } else {
        const existing = parseRecipients(to);
        const merged: string[] = [];
        const seen = new Set<string>();
        for (const e of [...existing, ...found]) {
          const lower = e.toLowerCase();
          if (!seen.has(lower)) {
            seen.add(lower);
            merged.push(e);
          }
        }
        setTo(merged.join(", "));
        setError("");
        setFetchInfo(
          `Found ${found.length} email${found.length === 1 ? "" : "s"} (scanned ${pagesScanned} page${pagesScanned === 1 ? "" : "s"})`
        );
      }
    } catch {
      setFetchInfo("Couldn't fetch from website");
    }
    setFetchingEmails(false);
  };

  const handleSend = async () => {
    const toCheck = validateRecipients(to);
    if (toCheck.valid.length === 0) {
      setError("Please enter at least one recipient email address");
      return;
    }
    if (toCheck.invalid.length > 0) {
      setError(`Invalid recipient: ${toCheck.invalid.join(", ")}`);
      return;
    }
    const ccCheck = validateRecipients(cc);
    if (ccCheck.invalid.length > 0) {
      setError(`Invalid CC: ${ccCheck.invalid.join(", ")}`);
      return;
    }
    const bccCheck = validateRecipients(bcc);
    if (bccCheck.invalid.length > 0) {
      setError(`Invalid BCC: ${bccCheck.invalid.join(", ")}`);
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: toCheck.valid,
          cc: ccCheck.valid,
          bcc: bccCheck.valid,
          subject,
          html: pitch.email.html,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send email");
        setSending(false);
        return;
      }

      onEmailSent(toCheck.valid.join(", "));
      setEmailSent(true);
      setSending(false);
    } catch {
      setError("Network error — please try again");
      setSending(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fade-in max-w-3xl mx-auto space-y-4">
      {/* Tab Switcher */}
      <div className="flex bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        <button
          onClick={() => setTab("email")}
          className={`flex-1 py-3.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            tab === "email" ? "bg-[#3b82f6] text-white" : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
          }`}
        >
          <Mail size={16} /> Email Pitch
        </button>
        <button
          onClick={() => setTab("call")}
          className={`flex-1 py-3.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            tab === "call" ? "bg-[#8b5cf6] text-white" : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
          }`}
        >
          <Phone size={16} /> Call Script
        </button>
      </div>

      {/* EMAIL TAB */}
      {tab === "email" && (
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
            {/* Email Header */}
            <div className="p-4 border-b border-[#222] space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs text-[#666] w-12 flex-shrink-0">To:</label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => { setTo(e.target.value); setError(""); setFetchInfo(null); }}
                  placeholder="recipient@business.com, another@business.com"
                  className="flex-1 bg-transparent text-sm text-white placeholder-[#444] outline-none"
                />
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleFetchEmails}
                    disabled={!website || fetchingEmails}
                    title={website ? "Scan the business website for email addresses" : "No website on file"}
                    className="text-[#666] hover:text-[#3b82f6] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                  >
                    {fetchingEmails ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
                    {fetchingEmails ? "Fetching..." : "Fetch"}
                  </button>
                  {!showCc && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="text-[#666] hover:text-[#3b82f6] cursor-pointer"
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      type="button"
                      onClick={() => setShowBcc(true)}
                      className="text-[#666] hover:text-[#3b82f6] cursor-pointer"
                    >
                      Bcc
                    </button>
                  )}
                </div>
              </div>
              {fetchInfo && (
                <p className="text-[11px] text-[#666] pl-[3.75rem]">{fetchInfo}</p>
              )}
              {showCc && (
                <div className="flex items-center gap-3">
                  <label className="text-xs text-[#666] w-12 flex-shrink-0">Cc:</label>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => { setCc(e.target.value); setError(""); }}
                    placeholder="cc@example.com, another@example.com"
                    className="flex-1 bg-transparent text-sm text-white placeholder-[#444] outline-none"
                  />
                </div>
              )}
              {showBcc && (
                <div className="flex items-center gap-3">
                  <label className="text-xs text-[#666] w-12 flex-shrink-0">Bcc:</label>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => { setBcc(e.target.value); setError(""); }}
                    placeholder="bcc@example.com"
                    className="flex-1 bg-transparent text-sm text-white placeholder-[#444] outline-none"
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="text-xs text-[#666] w-12 flex-shrink-0">Subject:</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white outline-none"
                />
              </div>
            </div>

            {/* Toggle */}
            <div className="flex border-b border-[#222]">
              <button
                onClick={() => setEmailMode("preview")}
                className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${emailMode === "preview" ? "text-[#3b82f6] bg-[#3b82f6]/5 border-b-2 border-[#3b82f6]" : "text-[#666] hover:text-[#888]"}`}
              >
                <Eye size={13} /> Preview
              </button>
              <button
                onClick={() => setEmailMode("edit")}
                className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${emailMode === "edit" ? "text-[#3b82f6] bg-[#3b82f6]/5 border-b-2 border-[#3b82f6]" : "text-[#666] hover:text-[#888]"}`}
              >
                <Edit3 size={13} /> Edit
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              {emailMode === "edit" ? (
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={20}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg p-4 text-sm text-[#ccc] font-mono leading-relaxed resize-none outline-none focus:border-[#333]"
                />
              ) : (
                <div className="bg-white rounded-lg overflow-hidden">
                  <div dangerouslySetInnerHTML={{ __html: pitch.email.html }} />
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-4 py-2.5">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSend}
              disabled={sending || emailSent}
              className={`flex-1 font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                emailSent
                  ? "bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30"
                  : "bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-white"
              }`}
            >
              {emailSent ? (
                <><CheckCircle2 size={16} /> Email Sent!</>
              ) : sending ? (
                <><Loader2 size={16} className="animate-spin" /> Sending...</>
              ) : (
                <><Send size={16} /> Send Email</>
              )}
            </button>
            <button
              onClick={() => handleCopy(emailBody, "email")}
              className="bg-[#111] border border-[#222] hover:border-[#333] text-white py-3.5 px-5 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
            >
              {copied === "email" ? <CheckCircle2 size={16} className="text-[#22c55e]" /> : <Copy size={16} />}
              {copied === "email" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* CALL SCRIPT TAB */}
      {tab === "call" && (
        <div className="space-y-4">
          {/* Phone Number */}
          {audit.business.phone && (
            <div className="bg-[#111] border border-[#222] rounded-2xl p-4 flex items-center gap-3">
              <Phone size={18} className="text-[#8b5cf6]" />
              <div>
                <p className="text-xs text-[#666]">Call this number</p>
                <p className="text-sm font-medium text-white">{audit.business.phone}</p>
              </div>
            </div>
          )}

          {/* Script Sections */}
          <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
            {/* Opening */}
            <div className="p-5 border-b border-[#222]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center text-xs font-bold text-[#8b5cf6]">1</div>
                <h3 className="text-sm font-semibold text-white">Opening</h3>
                <span className="text-[10px] text-[#666] bg-[#1a1a1a] px-2 py-0.5 rounded-full ml-auto">~15 seconds</span>
              </div>
              <p className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">{pitch.callScript.opening}</p>
            </div>

            {/* Discovery */}
            <div className="p-5 border-b border-[#222]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-[#3b82f6]/20 flex items-center justify-center text-xs font-bold text-[#3b82f6]">2</div>
                <h3 className="text-sm font-semibold text-white">Discovery Questions</h3>
                <span className="text-[10px] text-[#666] bg-[#1a1a1a] px-2 py-0.5 rounded-full ml-auto">~30 seconds</span>
              </div>
              <p className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">{pitch.callScript.discovery}</p>
            </div>

            {/* Pitch */}
            <div className="p-5 border-b border-[#222]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-xs font-bold text-[#22c55e]">3</div>
                <h3 className="text-sm font-semibold text-white">Main Pitch</h3>
                <span className="text-[10px] text-[#666] bg-[#1a1a1a] px-2 py-0.5 rounded-full ml-auto">~45 seconds</span>
              </div>
              <p className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">{pitch.callScript.pitch}</p>
            </div>

            {/* Objection Handling */}
            <div className="p-5 border-b border-[#222]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-[#eab308]/20 flex items-center justify-center text-xs font-bold text-[#eab308]">4</div>
                <h3 className="text-sm font-semibold text-white">Objection Handling</h3>
              </div>
              <div className="space-y-3">
                {pitch.callScript.objectionHandling.map((obj, i) => {
                  const [objection, ...responseParts] = obj.split(":");
                  const response = responseParts.join(":").trim();
                  return (
                    <div key={i} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
                      <p className="text-xs font-medium text-[#ef4444] mb-1.5">&ldquo;{objection.trim()}&rdquo;</p>
                      <p className="text-sm text-[#ccc]">{response || obj}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Closing */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-xs font-bold text-[#22c55e]">5</div>
                <h3 className="text-sm font-semibold text-white">Closing</h3>
              </div>
              <p className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">{pitch.callScript.closing}</p>
            </div>
          </div>

          {/* Full Script Copyable */}
          <details className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
            <summary className="p-4 text-sm font-medium text-[#888] hover:text-white cursor-pointer transition-colors">
              View Full Script (copy-friendly)
            </summary>
            <div className="px-4 pb-4">
              <pre className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 text-sm text-[#ccc] whitespace-pre-wrap leading-relaxed overflow-auto max-h-[500px]">
                {pitch.callScript.fullScript}
              </pre>
            </div>
          </details>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => handleCopy(pitch.callScript.fullScript, "script")}
              className="flex-1 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied === "script" ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copied === "script" ? "Script Copied!" : "Copy Full Script"}
            </button>
          </div>

          {/* Called Toggle */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Mark as Called</p>
              <p className="text-xs text-[#666] mt-0.5">Did you call this business?</p>
            </div>
            <button
              onClick={() => {
                const newValue = !called;
                setCalled(newValue);
                getPitchByPlaceId(audit.business.place_id, ownerFilter).then((saved) => {
                  if (saved) updatePitchStatus(saved.id, { called: newValue }).catch(() => {});
                }).catch(() => {});
              }}
              className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                called ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
                  : "bg-[#222] text-[#888] border border-[#333] hover:text-white"
              }`}
            >
              {called ? "Yes" : "No"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import { useState } from "react";
import { AuditResult } from "@/lib/types";
import { Send, Edit3, Eye, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface Props {
  audit: AuditResult;
  emailDraft: { subject: string; body: string; html: string };
  onSent: () => void;
}

export default function EmailComposer({ audit, emailDraft, onSent }: Props) {
  const [to, setTo] = useState(audit.business.phone ? "" : "");
  const [subject, setSubject] = useState(emailDraft.subject);
  const [body, setBody] = useState(emailDraft.body);
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!to.trim()) {
      setError("Please enter the recipient email address");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setError("Please enter a valid email address");
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, html: emailDraft.html }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send email");
        setSending(false);
        return;
      }

      onSent();
    } catch {
      setError("Network error — please try again");
      setSending(false);
    }
  };

  return (
    <div className="fade-in max-w-3xl mx-auto space-y-4">
      <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
        {/* Email Header */}
        <div className="p-4 border-b border-[#222] space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-xs text-[#666] w-12 flex-shrink-0">To:</label>
            <input
              type="email"
              value={to}
              onChange={(e) => { setTo(e.target.value); setError(""); }}
              placeholder="recipient@business.com"
              className="flex-1 bg-transparent text-sm text-white placeholder-[#444] outline-none"
            />
          </div>
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
            onClick={() => setMode("preview")}
            className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${mode === "preview" ? "text-[#3b82f6] bg-[#3b82f6]/5 border-b-2 border-[#3b82f6]" : "text-[#666] hover:text-[#888]"}`}
          >
            <Eye size={13} /> Preview
          </button>
          <button
            onClick={() => setMode("edit")}
            className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${mode === "edit" ? "text-[#3b82f6] bg-[#3b82f6]/5 border-b-2 border-[#3b82f6]" : "text-[#666] hover:text-[#888]"}`}
          >
            <Edit3 size={13} /> Edit
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {mode === "edit" ? (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={20}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg p-4 text-sm text-[#ccc] font-mono leading-relaxed resize-none outline-none focus:border-[#333]"
            />
          ) : (
            <div className="bg-white rounded-lg overflow-hidden">
              <div dangerouslySetInnerHTML={{ __html: emailDraft.html }} />
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-4 py-2.5">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {sending ? (
            <><Loader2 size={16} className="animate-spin" /> Sending...</>
          ) : (
            <><Send size={16} /> Send Email</>
          )}
        </button>
      </div>
    </div>
  );
}

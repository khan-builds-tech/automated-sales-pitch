"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SavedPitch, updatePitchStatus } from "@/lib/pitch-storage";
import { X, Phone, Globe, MapPin, Send, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface Props {
  pitch: SavedPitch;
  onClose: () => void;
  onStatusChange?: (id: string, field: "emailSent" | "called" | "converted" | "catchupSent", value: boolean, recipientEmail?: string) => void;
}

function StatusToggle({ label, description, value, onChange }: {
  label: string;
  description: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-[#666] mt-0.5">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
          value
            ? "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
            : "bg-[#222] text-[#888] border border-[#333] hover:text-white"
        }`}
      >
        {value ? "Yes" : "No"}
      </button>
    </div>
  );
}

export default function PitchDetailModal({ pitch, onClose, onStatusChange }: Props) {
  const [emailSent, setEmailSent] = useState(pitch.emailSent);
  const [called, setCalled] = useState(pitch.called);
  const [converted, setConverted] = useState(pitch.converted);
  const [catchupSent, setCatchupSent] = useState(pitch.catchupSent);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleResend = async () => {
    setResendError("");
    if (!pitch.recipientEmail) {
      setResendError("No recipient on file — send the first email first.");
      return;
    }
    if (!pitch.emailSubject) {
      setResendError("Original subject not stored — can't thread a catchup.");
      return;
    }
    setResending(true);
    try {
      const res = await fetch("/api/send-catchup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: pitch.recipientEmail,
          originalSubject: pitch.emailSubject,
          businessName: pitch.businessName,
          overallGrade: pitch.overallGrade,
          businessWebsite: pitch.businessWebsite,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResendError(data.error || "Failed to send catchup email");
        setResending(false);
        return;
      }
      setCatchupSent(true);
      onStatusChange?.(pitch.id, "catchupSent", true);
      updatePitchStatus(pitch.id, { catchupSent: true }).catch(() => {});
    } catch {
      setResendError("Network error — please try again");
    }
    setResending(false);
  };

  const handleToggle = async (field: "emailSent" | "called" | "converted") => {
    const current = field === "emailSent" ? emailSent : field === "called" ? called : converted;
    const newValue = !current;
    const setter = field === "emailSent" ? setEmailSent : field === "called" ? setCalled : setConverted;
    setter(newValue);
    onStatusChange?.(pitch.id, field, newValue);
    try {
      await updatePitchStatus(pitch.id, { [field]: newValue });
    } catch {
      setter(current);
    }
  };

  const gradeColor =
    pitch.overallGrade.startsWith("A") ? "bg-[#22c55e]/10 text-[#22c55e]" :
    pitch.overallGrade === "B" ? "bg-[#3b82f6]/10 text-[#3b82f6]" :
    "bg-[#eab308]/10 text-[#eab308]";

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#222] flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{pitch.businessName}</h2>
              {pitch.overallGrade && (
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${gradeColor}`}>
                  Grade: {pitch.overallGrade}
                </span>
              )}
            </div>
            <p className="text-xs text-[#888] mt-1">Saved on {pitch.createdAt.toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className="text-[#666] hover:text-white transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Business Info */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 space-y-2.5">
            <div className="flex items-start gap-2 text-sm">
              <MapPin size={14} className="text-[#666] mt-0.5 flex-shrink-0" />
              <span className="text-[#ccc]">{pitch.businessAddress}</span>
            </div>
            {pitch.businessPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-[#666] flex-shrink-0" />
                <span className="text-[#ccc]">{pitch.businessPhone}</span>
              </div>
            )}
            {pitch.businessWebsite && (
              <div className="flex items-center gap-2 text-sm">
                <Globe size={14} className="text-[#666] flex-shrink-0" />
                <a href={pitch.businessWebsite} target="_blank" rel="noopener noreferrer"
                  className="text-[#3b82f6] hover:underline truncate">
                  {pitch.businessWebsite}
                </a>
              </div>
            )}
          </div>

          {/* Status Section */}
          <div>
            <h3 className="text-xs text-[#666] uppercase tracking-wider mb-2">Outreach Status</h3>
            <div className="space-y-2">
              <StatusToggle
                label="Email Sent"
                description={pitch.recipientEmail ? `Sent to ${pitch.recipientEmail}` : "Mark if an email was sent"}
                value={emailSent}
                onChange={() => handleToggle("emailSent")}
              />
              <StatusToggle
                label="Called"
                description="Did you call this business?"
                value={called}
                onChange={() => handleToggle("called")}
              />
              <StatusToggle
                label="Converted"
                description="Mark if this lead converted"
                value={converted}
                onChange={() => handleToggle("converted")}
              />
            </div>
          </div>

          {/* Catchup Email */}
          <div>
            <h3 className="text-xs text-[#666] uppercase tracking-wider mb-2">Follow-up</h3>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-medium text-white">Catchup Email</p>
                  <p className="text-xs text-[#666] mt-0.5">
                    Sends a re-engagement email in the same thread as the original pitch.
                  </p>
                </div>
                {catchupSent ? (
                  <button disabled
                    className="text-xs px-3 py-2 rounded-lg font-medium bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 flex items-center gap-1.5 cursor-not-allowed flex-shrink-0">
                    <CheckCircle2 size={13} /> Email Resent
                  </button>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resending || !pitch.emailSent || !pitch.recipientEmail}
                    className="text-xs px-3 py-2 rounded-lg font-medium bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 hover:bg-[#3b82f6]/20 hover:border-[#3b82f6]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0">
                    {resending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    {resending ? "Sending..." : "Resend"}
                  </button>
                )}
              </div>
              {!pitch.emailSent && (
                <p className="text-[11px] text-[#666]">Send the initial pitch first to enable a catchup.</p>
              )}
              {resendError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-[#ef4444]">
                  <AlertCircle size={12} /> {resendError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

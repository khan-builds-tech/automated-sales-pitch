"use client";

import { AuditResult } from "@/lib/types";
import ScoreRing from "./ScoreRing";
import { TrendingUp, Users, AlertTriangle, CheckCircle, Globe, Star, ArrowRight, ExternalLink, XCircle, CheckCircle2, Lightbulb } from "lucide-react";

interface Props {
  audit: AuditResult;
  onProceed: () => void;
}

export default function AuditReport({ audit, onProceed }: Props) {
  const gradeColor = audit.overallGrade === "—" ? "#555"
    : audit.overallGrade.startsWith("A") ? "#22c55e"
    : audit.overallGrade === "B" ? "#3b82f6"
    : audit.overallGrade === "C" ? "#eab308"
    : "#ef4444";

  return (
    <div className="fade-in space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{audit.business.name}</h2>
            <p className="text-sm text-[#888] mt-1">{audit.business.address}</p>
            {audit.business.website && (
              <a href={audit.business.website} target="_blank" rel="noopener noreferrer"
                className="text-sm text-[#3b82f6] hover:underline flex items-center gap-1 mt-1">
                <Globe size={12} /> {audit.business.website}
              </a>
            )}
          </div>
          <div className="text-center">
            <div className="text-3xl font-black" style={{ color: gradeColor }}>{audit.overallGrade}</div>
            <div className="text-[10px] text-[#666] uppercase tracking-wider">Overall</div>
          </div>
        </div>

        {!audit.hasWebsite && (
          <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-[#ef4444] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#ef4444]">
                {audit.socialOnlyPlatform
                  ? `${audit.socialOnlyPlatform}-Only Presence — No Website Detected`
                  : "No Website Detected"}
              </p>
              <p className="text-xs text-[#888] mt-0.5">
                {audit.socialOnlyPlatform
                  ? `This business relies entirely on ${audit.socialOnlyPlatform} for online discovery. A dedicated website would convert that audience into owned, measurable revenue.`
                  : "This business has no digital presence — a significant growth opportunity."}
              </p>
            </div>
          </div>
        )}

        {audit.hasWebsite && audit.siteBroken && (
          <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-[#ef4444] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#ef4444]">Your website appears to be broken or unreachable</p>
              <p className="text-xs text-[#888] mt-0.5">{audit.auditError} We can diagnose the issue and rebuild on a reliable, modern stack — typically within 2-4 weeks.</p>
            </div>
          </div>
        )}

        {audit.hasWebsite && !audit.siteBroken && audit.auditError && (
          <div className="bg-[#eab308]/10 border border-[#eab308]/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-[#eab308] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#eab308]">Automated audit unavailable</p>
              <p className="text-xs text-[#888] mt-0.5">{audit.auditError}. Scores below could not be measured — review the site manually before relying on the report.</p>
            </div>
          </div>
        )}
      </div>

      {/* Online Presence — shown when no website */}
      {audit.onlinePresence && !audit.hasWebsite && (
        <>
          {/* Social Media Discovery */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Globe size={14} /> Social Media & Online Presence
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {audit.onlinePresence.socialProfiles.map((p) => (
                <div key={p.platform} className={`rounded-lg p-3 border ${p.found ? "bg-[#22c55e]/5 border-[#22c55e]/20" : "bg-[#0a0a0a] border-[#1a1a1a]"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {p.found
                      ? <CheckCircle2 size={14} className="text-[#22c55e] flex-shrink-0" />
                      : <XCircle size={14} className="text-[#ef4444] flex-shrink-0" />}
                    <span className="text-sm font-medium text-white">{p.platform}</span>
                  </div>
                  {p.found && p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-[#3b82f6] hover:underline flex items-center gap-1 truncate">
                      <ExternalLink size={10} /> View Profile
                    </a>
                  ) : (
                    <span className="text-[11px] text-[#666]">Not found</span>
                  )}
                </div>
              ))}
            </div>
            {audit.onlinePresence.socialProfiles.filter(p => p.found).length === 0 && (
              <p className="text-xs text-[#888] mt-3 bg-[#ef4444]/5 border border-[#ef4444]/10 rounded-lg p-2.5">
                No social media profiles detected. This business has virtually no online footprint beyond Google Maps.
              </p>
            )}
          </div>

          {/* Website Benefits */}
          <div className="bg-gradient-to-br from-[#22c55e]/5 to-[#111] border border-[#22c55e]/20 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#22c55e] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Lightbulb size={14} /> Why a Website Matters
            </h3>
            <ul className="space-y-2">
              {audit.onlinePresence.websiteBenefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#ccc]">
                  <ArrowRight size={14} className="text-[#22c55e] mt-0.5 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Competitor Online Presence Summary */}
          {audit.competitors.length > 0 && (
            <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users size={14} /> Competitor Online Presence
              </h3>
              <div className="flex items-center gap-4 mb-4 p-3 bg-[#0a0a0a] rounded-lg border border-[#1a1a1a]">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#ef4444]">{audit.onlinePresence.competitorsWithWebsites}</div>
                  <div className="text-[10px] text-[#666] uppercase">With Websites</div>
                </div>
                <div className="text-[#333]">/</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#888]">{audit.onlinePresence.competitorsTotal}</div>
                  <div className="text-[10px] text-[#666] uppercase">Competitors</div>
                </div>
                <div className="ml-auto text-xs text-[#888] max-w-[200px]">
                  {audit.onlinePresence.competitorsWithWebsites > 0
                    ? "Your competitors are already capturing online customers."
                    : "None of your competitors have websites — act now for first-mover advantage!"}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {audit.competitors.map((c, i) => (
                  <div key={i} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-white">{c.name}</span>
                      <div className="flex items-center gap-2">
                        {c.hasWebsite && (
                          <span className="text-[10px] bg-[#22c55e]/10 text-[#22c55e] px-1.5 py-0.5 rounded">Has Website</span>
                        )}
                        {c.rating && (
                          <div className="flex items-center gap-1">
                            <Star size={10} className="text-[#eab308] fill-[#eab308]" />
                            <span className="text-xs text-[#888]">{c.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {c.website && (
                      <a href={c.website} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-[#3b82f6] hover:underline flex items-center gap-1 mb-1 truncate">
                        <ExternalLink size={10} /> {c.website}
                      </a>
                    )}
                    <ul className="space-y-0.5">
                      {c.strengths.filter(s => !s.startsWith("Has website")).map((s, j) => (
                        <li key={j} className="text-[11px] text-[#666]">• {s}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Scores Grid */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-5">Audit Scores</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-6">
          {audit.scores.map((s) => (
            <div key={s.label} className="relative flex flex-col items-center">
              <ScoreRing score={s.score} label={s.label} unavailable={s.unavailable} />
            </div>
          ))}
        </div>
      </div>

      {/* Score Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {audit.scores.map((s) => (
          <div key={s.label} className="bg-[#111] border border-[#222] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">{s.label}</span>
              {s.unavailable ? (
                <span className="text-sm font-bold text-[#666]">—</span>
              ) : (
                <span className={`text-sm font-bold ${s.score >= 80 ? "text-[#22c55e]" : s.score >= 50 ? "text-[#eab308]" : "text-[#ef4444]"}`}>
                  {s.score}/100
                </span>
              )}
            </div>
            <ul className="space-y-1">
              {s.details.map((d, i) => (
                <li key={i} className="text-xs text-[#888] flex items-start gap-1.5">
                  <span className="text-[#444] mt-0.5">•</span> {d}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp size={14} /> Recommendations
        </h3>
        <ul className="space-y-2">
          {audit.recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#ccc]">
              <CheckCircle size={14} className="text-[#3b82f6] mt-0.5 flex-shrink-0" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Opportunities */}
      <div className="bg-gradient-to-br from-[#3b82f6]/10 to-[#111] border border-[#3b82f6]/20 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-[#3b82f6] uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp size={14} /> Growth Opportunities
        </h3>
        <ul className="space-y-2">
          {audit.opportunities.map((o, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#ccc]">
              <ArrowRight size={14} className="text-[#3b82f6] mt-0.5 flex-shrink-0" />
              {o}
            </li>
          ))}
        </ul>
      </div>

      {/* Competitors */}
      {audit.competitors.length > 0 && (
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users size={14} /> Competitor Landscape
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {audit.competitors.map((c, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-white">{c.name}</span>
                  {c.rating && (
                    <div className="flex items-center gap-1">
                      <Star size={10} className="text-[#eab308] fill-[#eab308]" />
                      <span className="text-xs text-[#888]">{c.rating}</span>
                    </div>
                  )}
                </div>
                <ul className="space-y-0.5">
                  {c.strengths.map((s, j) => (
                    <li key={j} className="text-[11px] text-[#666]">• {s}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onProceed}
        className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        <Mail size={16} /> Generate Sales Pitch
      </button>
    </div>
  );
}

function Mail(props: { size: number }) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

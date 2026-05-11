import { NextRequest } from "next/server";
import OpenAI from "openai";
import { AuditResult } from "@/lib/types";

function getCalendlyUrl(): string {
  const raw = process.env.CALENDLY_URL?.trim();
  if (!raw) return "https://calendly.com/infra2rise";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

const INFRA2RISE_CONTEXT = `
COMPANY: Infra2Rise
HEADQUARTERED: Dubai (IFZA Business Park, Dubai Silicon Oasis)
WEBSITE: https://www.infra2rise.com/
IT SERVICES PAGE: https://www.infra2rise.com/it/services

CORE IT SERVICES:
1. Cloud Infrastructure — migration, server management, network architecture (99.9% uptime)
2. Network Penetration Testing — security assessments, vulnerability testing
3. Data Analytics — business intelligence, data-driven insights
4. Software Development — custom software, web apps, mobile apps
5. Web & Mobile Development — responsive websites, native/cross-platform mobile apps
6. ISO 27001 Certification — guidance and implementation
7. SOC-2 Compliance — audit preparation and certification
8. PCI DSS Advisory — payment security compliance
9. Policy Development & Reviews — security policy creation
10. Security Training Programs — employee cybersecurity awareness
11. Phishing Simulation Campaigns — test and train against social engineering
12. Web & Mobile Application Testing — QA and functional testing
13. Digital Advertising — Google Ads, Meta Ads management
14. SEO — search engine optimization and ranking
15. Web Design & Development — modern, conversion-optimized websites

VALUE PROPOSITIONS:
- Multi-disciplinary firm (IT, Railway Infrastructure, Media Production)
- Dubai-based with global service reach
- End-to-end: from website design to cybersecurity to digital marketing
- Proven track record helping businesses scale digitally
- Free initial consultation offered
`;

function buildAuditSummary(audit: AuditResult): string {
  const biz = audit.business;
  const websiteLine = audit.socialOnlyPlatform
    ? `${biz.website} (${audit.socialOnlyPlatform} only — NO real website)`
    : (biz.website || "NONE — no website detected");
  const lines: string[] = [
    `Business Name: ${biz.name}`,
    `Location: ${biz.address}`,
    `Website: ${websiteLine}`,
    `Phone: ${biz.phone || "Not available"}`,
    `Rating: ${biz.rating ? `${biz.rating}/5 (${biz.total_ratings || 0} reviews)` : "N/A"}`,
    `Business Type: ${biz.types?.join(", ") || "Unknown"}`,
    `Has Website: ${audit.hasWebsite ? "Yes" : "No"}`,
    audit.socialOnlyPlatform
      ? `Pitch Angle: This business has ONLY a ${audit.socialOnlyPlatform} presence — no actual website. Frame the pitch around converting their social audience into owned, measurable revenue via a real website.`
      : "",
    audit.siteBroken
      ? `Pitch Angle: The business website is BROKEN/UNREACHABLE (returned errors during automated checks). Frame the pitch around urgency: every day the site is down they are losing leads to competitors, and our team can diagnose and rebuild it.`
      : "",
    `Overall Grade: ${audit.overallGrade}`,
    "",
    "AUDIT SCORES:",
    ...audit.scores.map(s => s.unavailable
      ? `  ${s.label}: unavailable — ${s.details.join("; ")}`
      : `  ${s.label}: ${s.score}/100 — ${s.details.join("; ")}`),
    "",
    "RECOMMENDATIONS:",
    ...audit.recommendations.map(r => `  - ${r}`),
    "",
    "GROWTH OPPORTUNITIES:",
    ...audit.opportunities.map(o => `  - ${o}`),
  ];

  if (audit.competitors.length > 0) {
    lines.push("", "COMPETITORS:");
    for (const c of audit.competitors) {
      lines.push(`  - ${c.name}: ${c.hasWebsite ? "Has website" : "No website"}, Rating: ${c.rating || "N/A"}, Strengths: ${c.strengths.join(", ")}`);
    }
  }

  if (audit.onlinePresence) {
    const found = audit.onlinePresence.socialProfiles.filter(p => p.found);
    const missing = audit.onlinePresence.socialProfiles.filter(p => !p.found);
    lines.push("", "SOCIAL MEDIA:");
    if (found.length > 0) lines.push(`  Found: ${found.map(p => p.platform).join(", ")}`);
    if (missing.length > 0) lines.push(`  Missing: ${missing.map(p => p.platform).join(", ")}`);
    lines.push(`  Competitors with websites: ${audit.onlinePresence.competitorsWithWebsites}/${audit.onlinePresence.competitorsTotal}`);
  }

  return lines.join("\n");
}

function buildEmailHTML(subject: string, body: string, audit: AuditResult): string {
  const biz = audit.business;
  const calendlyUrl = getCalendlyUrl();
  const calendlyDisplay = calendlyUrl.replace(/^https?:\/\//, "");
  const gradeColor = audit.overallGrade === "—" ? "#9ca3af"
    : audit.overallGrade.startsWith("A") ? "#22c55e"
    : audit.overallGrade === "B" ? "#3b82f6"
    : audit.overallGrade === "C" ? "#eab308"
    : "#ef4444";

  const usableScores = audit.scores.filter(s => !s.unavailable);
  const scoreRows = usableScores.map(s => {
    const barColor = s.score >= 80 ? "#22c55e" : s.score >= 50 ? "#eab308" : "#ef4444";
    return `
      <tr>
        <td style="padding: 10px 16px; font-size: 14px; color: #1a1a1a; font-weight: 500;">${s.label}</td>
        <td style="padding: 10px 16px; width: 180px;">
          <div style="background: #e5e7eb; border-radius: 10px; height: 10px; overflow: hidden;">
            <div style="background: ${barColor}; width: ${s.score}%; height: 100%; border-radius: 10px;"></div>
          </div>
        </td>
        <td style="padding: 10px 16px; font-size: 14px; font-weight: 700; color: ${barColor}; text-align: right;">${s.score}/100</td>
      </tr>`;
  }).join("");

  const bodyParagraphs = body
    .split("\n\n")
    .filter(p => p.trim())
    .map(p => `<p style="margin: 0 0 16px; color: #1a1a1a; font-size: 15px; line-height: 1.7;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 700px; margin: 0 auto; padding: 24px 16px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a56db 0%, #1e40af 100%); border-radius: 16px 16px 0 0; padding: 36px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0 0 4px; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Infra2Rise</h1>
      <p style="color: #ffffff; margin: 0; font-size: 13px; font-weight: 400;">Digital Growth Report for ${biz.name}</p>
    </div>

    <!-- Grade Badge -->
    <div style="background: #ffffff; padding: 28px 32px; text-align: center; border-bottom: 1px solid #e5e7eb;">
      <div style="display: inline-block; width: 84px; height: 84px; border-radius: 50%; border: 4px solid ${gradeColor}; line-height: 76px; text-align: center; background: ${gradeColor}10;">
        <span style="font-size: 36px; font-weight: 800; color: ${gradeColor};">${audit.overallGrade}</span>
      </div>
      <p style="color: #6b7280; font-size: 13px; margin: 10px 0 0; font-weight: 500;">Overall Digital Grade</p>
    </div>

    <!-- Top CTA: Book a call -->
    <div style="background: #ffffff; padding: 20px 32px 28px; text-align: center; border-bottom: 1px solid #e5e7eb;">
      <p style="color: #111827; font-size: 15px; margin: 0 0 14px; font-weight: 600;">Want to walk through these findings with us?</p>
      <a href="${calendlyUrl}" style="display: inline-block; background: #1a56db; color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none;">
        📅 Book a free 15-minute call
      </a>
      <p style="color: #6b7280; font-size: 12px; margin: 12px 0 0;">
        Or open <a href="${calendlyUrl}" style="color: #1a56db; text-decoration: underline;">${calendlyDisplay}</a> to pick a time that works for you
      </p>
    </div>

    <!-- Scores Table -->
    ${usableScores.length > 0 ? `
    <div style="background: #ffffff; padding: 24px 16px;">
      <h2 style="color: #111827; font-size: 16px; font-weight: 700; margin: 0 0 16px 16px; padding-bottom: 10px; border-bottom: 2px solid #f3f4f6;">
        ${audit.hasWebsite ? "Your Website Audit" : "Digital Presence Analysis"}
      </h2>
      <table style="width: 100%; border-collapse: collapse;">${scoreRows}</table>
    </div>` : ""}

    <!-- Email Body -->
    <div style="background: #ffffff; padding: 28px 32px; border-top: 1px solid #e5e7eb;">
      ${bodyParagraphs}
    </div>

    <!-- Recommendations -->
    <div style="background: #ffffff; padding: 28px 32px; border-top: 1px solid #e5e7eb;">
      <h2 style="color: #111827; font-size: 16px; font-weight: 700; margin: 0 0 16px; padding-bottom: 10px; border-bottom: 2px solid #f3f4f6;">Our Recommendations</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${audit.recommendations.slice(0, 5).map(r => `
        <tr>
          <td style="padding: 8px 0; vertical-align: top; width: 24px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #1a56db; margin-top: 6px;"></div>
          </td>
          <td style="padding: 8px 0 8px 8px; font-size: 14px; color: #374151; line-height: 1.5;">${r}</td>
        </tr>`).join("")}
      </table>
    </div>

    <!-- Growth Opportunities -->
    <div style="background: #eff6ff; padding: 28px 32px; border-top: 1px solid #dbeafe;">
      <h2 style="color: #1e40af; font-size: 16px; font-weight: 700; margin: 0 0 16px;">Growth Opportunities</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${audit.opportunities.slice(0, 4).map(o => `
        <tr>
          <td style="padding: 6px 0; vertical-align: top; width: 24px;">
            <span style="color: #1a56db; font-size: 16px; font-weight: 700;">→</span>
          </td>
          <td style="padding: 6px 0 6px 8px; font-size: 14px; color: #1e40af; line-height: 1.5;">${o}</td>
        </tr>`).join("")}
      </table>
    </div>

    <!-- Competitors -->
    ${audit.competitors.length > 0 ? `
    <div style="background: #ffffff; padding: 28px 32px; border-top: 1px solid #e5e7eb;">
      <h2 style="color: #111827; font-size: 16px; font-weight: 700; margin: 0 0 16px; padding-bottom: 10px; border-bottom: 2px solid #f3f4f6;">Competitor Landscape</h2>
      ${audit.competitors.slice(0, 5).map(c => {
        const ratingStars = c.rating ? `<span style="color: #eab308; font-size: 13px;">★ ${c.rating}</span>` : "";
        const websiteBadge = c.hasWebsite
          ? `<span style="display: inline-block; background: #dcfce7; color: #16a34a; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px;">Has Website</span>`
          : `<span style="display: inline-block; background: #fef2f2; color: #dc2626; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px;">No Website</span>`;
        return `
        <div style="background: #f9fafb; border-radius: 8px; padding: 14px 16px; margin-bottom: 8px;">
          <div style="margin-bottom: 4px;">
            <strong style="color: #111827; font-size: 14px;">${c.name}</strong>
            <span style="margin-left: 8px;">${ratingStars}</span>
            <span style="margin-left: 8px;">${websiteBadge}</span>
          </div>
          <div style="font-size: 12px; color: #6b7280;">${c.strengths.join(" · ")}</div>
        </div>`;
      }).join("")}
    </div>` : ""}

    <!-- CTA -->
    <div style="background: linear-gradient(135deg, #1a56db 0%, #1e40af 100%); padding: 36px 32px; text-align: center;">
      <h2 style="color: #ffffff; margin: 0 0 10px; font-size: 20px; font-weight: 700;">Ready to Grow Your Business?</h2>
      <p style="color: #ffffff; margin: 0 0 24px; font-size: 14px; line-height: 1.5;">Book a free consultation with our team — no commitment required.</p>
      <a href="${calendlyUrl}" style="display: inline-block; background: #ffffff; color: #1a56db; font-weight: 700; font-size: 15px; padding: 14px 36px; border-radius: 10px; text-decoration: none;">📅 Schedule a Call</a>
      <p style="color: #ffffff; font-size: 12px; margin: 14px 0 0;">${calendlyDisplay}</p>
    </div>

    <!-- Footer -->
    <div style="border-radius: 0 0 16px 16px; background: #111827; padding: 28px 32px; text-align: center;">
      <p style="color: #9ca3af; font-size: 13px; margin: 0 0 6px; font-weight: 600;">Infra2Rise</p>
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px;">IFZA Business Park, Dubai Silicon Oasis</p>
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px;">${process.env.FIRM_EMAIL || "infra2rise@gmail.com"}</p>
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 12px;">${process.env.FIRM_PHONE || ""}</p>
      <a href="https://www.infra2rise.com" style="color: #60a5fa; font-size: 12px; text-decoration: none;">www.infra2rise.com</a>
    </div>

  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  const { audit } = (await request.json()) as { audit: AuditResult };

  if (!audit?.business) {
    return Response.json({ error: "Audit data is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey });
  const auditSummary = buildAuditSummary(audit);

  try {
    const [emailResponse, callResponse] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `You are an expert B2B cold email copywriter for Infra2Rise, a Dubai-based IT consulting firm.

${INFRA2RISE_CONTEXT}

COLD EMAIL RULES:
- Subject line: Short, curiosity-driven, personalized with business name. No spam words.
- Opening: Reference a SPECIFIC finding from their audit (score, missing feature, competitor gap). Never use generic openers like "Hi there" — address the business by name.
- Paragraph 1 (Pain): Lead with their SPECIFIC pain point from audit data. Cite exact scores, competitor names, or missing features. Make them feel the urgency.
- Paragraph 2 (Bridge): Connect their pain to how Infra2Rise solves it. Mention 2-3 SPECIFIC services from our offerings that match their gaps. Explain what those services deliver in concrete terms (e.g., "our SEO team typically improves organic traffic by 40-60% within 3 months").
- Paragraph 3 (Social proof / Competitor pressure): Reference their competitors by name if they have websites. Create urgency — "While [Competitor] is already capturing online customers..."
- Paragraph 4 (Offer): Present a specific, tangible offer — free audit walkthrough, complimentary strategy session, or sample mockup. Make it low-commitment.
- CTA: Soft ask — "Would a quick 15-minute call this week make sense?" or "I'd love to walk you through these findings — no strings attached."
- Sign off as the Infra2Rise team. Include: ${process.env.FIRM_EMAIL || "infra2rise@gmail.com"} | www.infra2rise.com | ${process.env.FIRM_PHONE || ""}
- Tone: Professional but warm, consultative not salesy. Like a knowledgeable advisor sharing valuable intel.
- DO NOT use filler phrases like "I hope this email finds you well."
- DO NOT use excessive exclamation marks or ALL CAPS.
- Total length: 200-300 words. Substantial enough to be credible, concise enough to be read.

Return a JSON object with this exact structure:
{
  "subject": "email subject line",
  "body": "plain text email body"
}

Do NOT generate HTML. Only return subject and plain text body.`,
          },
          {
            role: "user",
            content: `Generate a personalized cold sales email for this business based on their audit results:\n\n${auditSummary}`,
          },
        ],
        response_format: { type: "json_object" },
      }),

      openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `You are an expert B2B sales call script writer for Infra2Rise, a Dubai-based IT consulting firm.

${INFRA2RISE_CONTEXT}

CALL SCRIPT RULES:
- This script will be used by a real salesperson calling the business. Make it sound NATURAL and conversational, not robotic.
- The caller is from Infra2Rise, a Dubai-based IT consulting firm, and is calling to offer IT services based on an audit of their online presence.

OPENING (write 3-4 sentences):
- Greet by business name: "Hi, this is [Name] from Infra2Rise."
- Give a credible reason for calling: "We specialize in helping [their industry] businesses grow their digital presence, and I was looking into businesses in [their area]..."
- Mention you found something specific: reference a real audit finding (score, missing website, competitor gap).
- Ask permission: "Do you have a quick couple of minutes?"

DISCOVERY (write 3-4 targeted questions):
- Ask about their current digital strategy or online leads.
- Ask about their biggest challenge with their website / online presence / getting customers.
- Ask a question that reveals a pain point their audit data shows (e.g., if performance is low: "Have you noticed your website loading slowly?" or if no website: "How do most of your customers find you right now?").
- Ask about competitors: "Are you aware that [Competitor Name] has a website and is showing up in search results?"

PITCH (write 5-7 sentences):
- Present 3-4 SPECIFIC Infra2Rise services that address their audit gaps. Explain what each does in plain language.
- Use concrete numbers from the audit: "Your performance score is X/100 — we typically bring that up to 85+ within the first month."
- Reference competitors by name: "Right now [Competitor] is ahead because they have X — we can get you there and beyond."
- Mention a specific outcome: "Businesses we've worked with see a 40-60% increase in online inquiries within 90 days."
- Keep it benefit-focused, not feature-focused.

OBJECTION HANDLING (provide 5-6 objections with detailed rebuttals):
- "We already have someone handling our IT/website" → acknowledge, differentiate with audit data
- "We're not interested right now" → create urgency with competitor data
- "It sounds expensive" → reframe as ROI, mention free consultation
- "We don't need a website / We get enough business" → use audit data showing missed opportunities
- "Just send me an email" → agree enthusiastically, use it as a follow-up bridge
- "We tried digital marketing before and it didn't work" → empathize, explain what was likely missing
Each rebuttal should be 2-3 sentences, natural-sounding, and reference the audit data.

CLOSING (write 3-4 sentences):
- Summarize the key value prop in one sentence.
- Propose a specific next step: "I'd love to set up a free 20-minute strategy session where I can walk you through these findings in detail."
- Offer flexibility: suggest 2-3 time options or ask for their preference.
- End warmly: thank them for their time regardless of outcome.

FULL SCRIPT:
- Combine all sections into one flowing conversation.
- Use [PAUSE] markers where the caller should wait for a response.
- Use [IF YES] and [IF NO] branching markers.
- Include natural transitions between sections.
- The full script should read like an actual phone conversation, not a list.

Return a JSON object with this exact structure:
{
  "opening": "the opening section",
  "discovery": "discovery questions section with context",
  "pitch": "the detailed pitch section",
  "objectionHandling": ["Objection text: detailed rebuttal response", ...],
  "closing": "the closing section",
  "fullScript": "the complete flowing conversation script with [PAUSE], [IF YES], [IF NO] markers"
}`,
          },
          {
            role: "user",
            content: `Generate a personalized sales call script for this business based on their audit results:\n\n${auditSummary}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    ]);

    const emailContent = emailResponse.choices[0]?.message?.content;
    const callContent = callResponse.choices[0]?.message?.content;

    if (!emailContent || !callContent) {
      return Response.json({ error: "Failed to generate pitch content" }, { status: 500 });
    }

    const email = JSON.parse(emailContent);
    const call = JSON.parse(callContent);
    const html = buildEmailHTML(email.subject, email.body, audit);

    return Response.json({
      email: {
        subject: email.subject,
        body: email.body,
        html,
      },
      callScript: {
        opening: call.opening,
        discovery: call.discovery,
        pitch: call.pitch,
        objectionHandling: call.objectionHandling,
        closing: call.closing,
        fullScript: call.fullScript,
      },
    });
  } catch (err) {
    console.error("Pitch generation error:", err);
    return Response.json({ error: "Failed to generate sales pitch" }, { status: 500 });
  }
}

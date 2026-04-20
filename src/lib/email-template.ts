import { AuditResult } from "./types";

function getCalendlyUrl(): string {
  const raw = process.env.CALENDLY_URL?.trim();
  if (!raw) return "https://calendly.com/infra2rise";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function generateEmailDraft(audit: AuditResult): { subject: string; body: string; html: string } {
  const firmName = "Your Consulting Firm";
  const biz = audit.business;
  const hasWebsite = audit.hasWebsite;
  const CALENDLY_URL = getCalendlyUrl();

  const subject = hasWebsite
    ? `${biz.name} — Your Website Audit Results & Growth Opportunities`
    : `${biz.name} — How a Digital Presence Can Transform Your Business`;

  const scoresSummary = audit.scores
    .map(s => `  • ${s.label}: ${s.score}/100`)
    .join("\n");

  const recommendationsList = audit.recommendations
    .map(r => `  • ${r}`)
    .join("\n");

  const opportunitiesList = audit.opportunities
    .map(o => `  • ${o}`)
    .join("\n");

  const competitorsList = audit.competitors.length > 0
    ? audit.competitors.map(c => `  • ${c.name}${c.rating ? ` (${c.rating}★)` : ""}`).join("\n")
    : "  No direct competitors analyzed";

  // Plain text version
  const body = hasWebsite ? `Hi ${biz.name} Team,

I recently came across your business and took the time to analyze your online presence. I wanted to share some insights that could help you attract more customers and grow your revenue.

📅 Prefer to jump straight to a conversation? Grab a time here: ${CALENDLY_URL}

WEBSITE AUDIT RESULTS
Overall Grade: ${audit.overallGrade}

${scoresSummary}

KEY RECOMMENDATIONS
${recommendationsList}

GROWTH OPPORTUNITIES
${opportunitiesList}

YOUR COMPETITIVE LANDSCAPE
${competitorsList}

These improvements could significantly impact your bottom line. Our team at ${firmName} specializes in helping businesses like yours optimize their digital presence for maximum ROI.

Would you be open to a quick 15-minute call to discuss how we can help? No commitment — just a conversation about your goals.

Best regards,
${firmName}` : `Hi ${biz.name} Team,

I noticed that your business doesn't currently have a website, and I wanted to reach out because I believe there's a tremendous growth opportunity you're missing out on.

📅 Prefer to jump straight to a conversation? Grab a time here: ${CALENDLY_URL}

WHY DIGITAL PRESENCE MATTERS
  • 97% of consumers search online for local businesses
  • Businesses with websites generate 2-3x more leads
  • Online presence builds trust and credibility with new customers

WHAT YOUR COMPETITORS ARE DOING
${competitorsList}

WHAT WE CAN DO FOR YOU
${recommendationsList}

EXPECTED OUTCOMES
${opportunitiesList}

Our team at ${firmName} has helped numerous businesses establish their digital presence and see measurable growth within the first 3 months.

Would you be interested in a free consultation to explore how we can help ${biz.name} grow? Just reply to this email or give us a call.

Best regards,
${firmName}`;

  // HTML version
  const html = generateHTML(audit, firmName, CALENDLY_URL);

  return { subject, body, html };
}

function generateHTML(audit: AuditResult, firmName: string, CALENDLY_URL: string): string {
  const biz = audit.business;
  const gradeColor = audit.overallGrade.startsWith("A") ? "#22c55e"
    : audit.overallGrade === "B" ? "#3b82f6"
    : audit.overallGrade === "C" ? "#eab308"
    : "#ef4444";

  const scoreRows = audit.scores.map(s => {
    const barColor = s.score >= 80 ? "#22c55e" : s.score >= 50 ? "#eab308" : "#ef4444";
    return `
      <tr>
        <td style="padding: 8px 12px; font-size: 14px; color: #333;">${s.label}</td>
        <td style="padding: 8px 12px; width: 200px;">
          <div style="background: #f0f0f0; border-radius: 10px; height: 8px; overflow: hidden;">
            <div style="background: ${barColor}; width: ${s.score}%; height: 100%; border-radius: 10px;"></div>
          </div>
        </td>
        <td style="padding: 8px 12px; font-size: 14px; font-weight: 600; color: ${barColor}; text-align: right;">${s.score}/100</td>
      </tr>`;
  }).join("");

  const recsHTML = audit.recommendations.map(r =>
    `<li style="padding: 4px 0; color: #555; font-size: 14px;">${r}</li>`
  ).join("");

  const oppsHTML = audit.opportunities.map(o =>
    `<li style="padding: 4px 0; color: #555; font-size: 14px;">${o}</li>`
  ).join("");

  const competitorsHTML = audit.competitors.length > 0
    ? audit.competitors.map(c => `
      <div style="background: #f8f9fa; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #333; font-size: 14px;">${c.name}</strong>
          ${c.rating ? `<span style="color: #eab308; font-size: 13px;">★ ${c.rating}</span>` : ""}
        </div>
        <div style="margin-top: 4px; font-size: 12px; color: #888;">${c.strengths.join(" · ")}</div>
      </div>`).join("")
    : '<p style="color: #888; font-size: 14px;">No direct competitors analyzed in your area.</p>';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">${audit.hasWebsite ? "Website Audit Report" : "Digital Growth Opportunity"}</h1>
      <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Prepared for ${biz.name}</p>
    </div>

    <!-- Grade -->
    <div style="background: white; padding: 24px; text-align: center; border-bottom: 1px solid #eee;">
      <div style="display: inline-block; width: 80px; height: 80px; border-radius: 50%; background: ${gradeColor}15; border: 3px solid ${gradeColor}; line-height: 74px; text-align: center;">
        <span style="font-size: 32px; font-weight: 800; color: ${gradeColor};">${audit.overallGrade}</span>
      </div>
      <p style="color: #888; font-size: 13px; margin: 8px 0 0;">Overall Grade</p>
    </div>

    <!-- Top CTA: Book a call -->
    <div style="background: #ffffff; padding: 20px 24px 24px; text-align: center; border-bottom: 1px solid #eee;">
      <p style="color: #1a1a2e; font-size: 15px; margin: 0 0 12px; font-weight: 600;">Want to talk through these findings live?</p>
      <a href="${CALENDLY_URL}" style="display: inline-block; background: #1a56db; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 26px; border-radius: 10px; text-decoration: none;">
        📅 Book a 15-minute call
      </a>
      <p style="color: #888; font-size: 12px; margin: 10px 0 0;">
        Or open <a href="${CALENDLY_URL}" style="color: #1a56db; text-decoration: underline;">${CALENDLY_URL.replace(/^https?:\/\//, "")}</a> to pick a time
      </p>
    </div>

    <!-- Scores -->
    <div style="background: white; padding: 24px;">
      <h2 style="color: #1a1a2e; font-size: 16px; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 2px solid #f0f0f0;">
        ${audit.hasWebsite ? "Audit Scores" : "Current Digital Status"}
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${scoreRows}
      </table>
    </div>

    <!-- Recommendations -->
    <div style="background: white; padding: 24px; border-top: 1px solid #eee;">
      <h2 style="color: #1a1a2e; font-size: 16px; margin: 0 0 12px;">Our Recommendations</h2>
      <ul style="margin: 0; padding-left: 20px;">${recsHTML}</ul>
    </div>

    <!-- Growth Opportunities -->
    <div style="background: #f0f7ff; padding: 24px; border-top: 1px solid #dbeafe;">
      <h2 style="color: #1e40af; font-size: 16px; margin: 0 0 12px;">Growth Opportunities</h2>
      <ul style="margin: 0; padding-left: 20px;">${oppsHTML}</ul>
    </div>

    <!-- Competitors -->
    <div style="background: white; padding: 24px; border-top: 1px solid #eee;">
      <h2 style="color: #1a1a2e; font-size: 16px; margin: 0 0 12px;">Competitor Landscape</h2>
      ${competitorsHTML}
    </div>

    <!-- CTA -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 0 0 16px 16px; padding: 32px; text-align: center;">
      <h2 style="color: white; margin: 0 0 8px; font-size: 18px;">Ready to Grow?</h2>
      <p style="color: #bfdbfe; margin: 0 0 20px; font-size: 14px;">Let's discuss how we can help ${biz.name} reach its full potential.</p>
      <a href="${CALENDLY_URL}" style="display: inline-block; background: #ffffff; color: #1d4ed8; font-weight: 600; font-size: 14px; padding: 12px 26px; border-radius: 10px; text-decoration: none;">
        📅 Schedule a free consultation
      </a>
      <p style="color: #bfdbfe; font-size: 12px; margin: 14px 0 0;">Or reply to this email directly.</p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px;">
      <p style="color: #888; font-size: 12px; margin: 0;">Sent by ${firmName}</p>
    </div>
  </div>
</body>
</html>`;
}

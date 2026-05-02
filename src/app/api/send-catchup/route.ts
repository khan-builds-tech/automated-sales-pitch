import { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { isValidEmail, normalizeRecipients } from "@/lib/email-utils";

interface CatchupPayload {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  originalSubject: string;
  businessName: string;
  overallGrade: string;
  businessWebsite?: string | null;
}

function getCalendlyUrl(): string {
  const raw = process.env.CALENDLY_URL?.trim();
  if (!raw) return "https://calendly.com/infra2rise";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function buildCatchupHTML(payload: CatchupPayload): string {
  const { businessName, overallGrade, businessWebsite } = payload;
  const firmEmail = process.env.FIRM_EMAIL || "infra2rise@gmail.com";
  const firmPhone = process.env.FIRM_PHONE || "";
  const CALENDLY_URL = getCalendlyUrl();

  const gradeColor =
    overallGrade.startsWith("A") ? "#22c55e" :
    overallGrade === "B" ? "#3b82f6" :
    overallGrade === "C" ? "#eab308" : "#ef4444";

  const paragraphs = [
    `Circling back on the digital audit we shared for <strong>${businessName}</strong> — figured it was worth a second look while the findings are still fresh.`,

    `Every week that the gaps we flagged stay unaddressed, a few quiet things happen: people searching for businesses like yours in the area land on a competitor's site instead, local rankings drift further down, and the cost of catching back up grows. The <strong style="color: ${gradeColor};">Grade ${overallGrade}</strong> in the report isn't a verdict — it's a snapshot of the easiest wins still on the table.`,

    `We've helped businesses in a similar spot tighten three things quickly: a cleaner, faster website that turns passing traffic into real inquiries; local SEO that actually surfaces you for the searches that matter; and paid campaigns structured so budget doesn't quietly bleed out. Most partners see a meaningful lift in inbound leads inside the first 60–90 days.`,

    `If now isn't the moment, that's completely fair${businessWebsite ? ` — and the ${businessWebsite.replace(/^https?:\/\//, "")} improvements can wait` : ""}. But if even one or two of the fixes from the audit look worth a closer look, we'd be glad to walk you through the top three — no pitch, just the plan — on a quick 20-minute call.`,
  ];

  const bodyHTML = paragraphs
    .map(p => `<p style="margin: 0 0 18px; color: #1f2937; font-size: 15px; line-height: 1.75;">${p}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">

    <div style="background: linear-gradient(135deg, #1a56db 0%, #1e40af 100%); border-radius: 16px 16px 0 0; padding: 28px 32px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">A quick follow-up</h1>
      <p style="color: #bfdbfe; margin: 4px 0 0; font-size: 13px;">On the digital audit we shared for ${businessName}</p>
    </div>

    <div style="background: #ffffff; padding: 32px;">
      <div style="margin: 0 0 24px; padding: 16px 18px; background: #eff6ff; border-left: 4px solid #1a56db; border-radius: 6px;">
        <p style="margin: 0 0 10px; color: #1e3a8a; font-size: 14px; font-weight: 600;">📅 Want to skip the back-and-forth? Pick a time that works.</p>
        <a href="${CALENDLY_URL}"
          style="display: inline-block; background: #1a56db; color: #ffffff; font-weight: 600; font-size: 13px; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
          Schedule a 20-minute call →
        </a>
      </div>

      ${bodyHTML}

      <div style="margin: 28px 0 8px;">
        <a href="${CALENDLY_URL}"
          style="display: inline-block; background: #1a56db; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 26px; border-radius: 10px; text-decoration: none;">
          Book a 20-minute call
        </a>
        <p style="margin: 12px 0 0; color: #6b7280; font-size: 13px;">
          Worth a quick call this week? Or just reply to
          <a href="mailto:${firmEmail}?subject=${encodeURIComponent("Re: " + payload.originalSubject)}" style="color: #1a56db; text-decoration: underline;">${firmEmail}</a>.
        </p>
      </div>
    </div>

    <div style="background: #111827; border-radius: 0 0 16px 16px; padding: 24px 32px;">
      <p style="color: #e5e7eb; font-size: 14px; margin: 0 0 6px; font-weight: 600;">— The Infra2Rise Team</p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 2px;">${firmEmail}${firmPhone ? ` · ${firmPhone}` : ""}</p>
      <a href="https://www.infra2rise.com" style="color: #60a5fa; font-size: 12px; text-decoration: none;">www.infra2rise.com</a>
    </div>

  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as CatchupPayload;
  const { originalSubject, businessName, overallGrade } = payload;

  if (!originalSubject || !businessName || !overallGrade) {
    return Response.json({ error: "Missing required fields: originalSubject, businessName, overallGrade" }, { status: 400 });
  }

  const toList = normalizeRecipients(payload.to);
  const ccList = normalizeRecipients(payload.cc);
  const bccList = normalizeRecipients(payload.bcc);

  if (toList.length === 0) {
    return Response.json({ error: "At least one recipient is required" }, { status: 400 });
  }

  const allInvalid = [...toList, ...ccList, ...bccList].filter((e) => !isValidEmail(e));
  if (allInvalid.length > 0) {
    return Response.json({ error: `Invalid email address: ${allInvalid.join(", ")}` }, { status: 400 });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass || smtpUser === "your-email@gmail.com") {
    return Response.json({ error: "SMTP not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.local" }, { status: 500 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const firmName = process.env.FIRM_NAME || "Infra2Rise";
    const firmEmail = process.env.FIRM_EMAIL || smtpUser;
    const threadedSubject = originalSubject.toLowerCase().startsWith("re:")
      ? originalSubject
      : `Re: ${originalSubject}`;

    await transporter.sendMail({
      from: `"${firmName}" <${firmEmail}>`,
      to: toList,
      cc: ccList.length > 0 ? ccList : undefined,
      bcc: bccList.length > 0 ? bccList : undefined,
      subject: threadedSubject,
      html: buildCatchupHTML(payload),
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("Catchup send error:", err);
    return Response.json({ error: "Failed to send catchup email. Check SMTP configuration." }, { status: 500 });
  }
}

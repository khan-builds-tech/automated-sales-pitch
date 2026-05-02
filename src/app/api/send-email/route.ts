import { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { isValidEmail, normalizeRecipients } from "@/lib/email-utils";

export async function POST(request: NextRequest) {
  const { to, cc, bcc, subject, html } = await request.json();

  if (!subject || !html) {
    return Response.json({ error: "Missing required fields: subject, html" }, { status: 400 });
  }

  const toList = normalizeRecipients(to);
  const ccList = normalizeRecipients(cc);
  const bccList = normalizeRecipients(bcc);

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
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const firmName = process.env.FIRM_NAME || "Our Consulting Firm";
    const firmEmail = process.env.FIRM_EMAIL || smtpUser;

    await transporter.sendMail({
      from: `"${firmName}" <${firmEmail}>`,
      to: toList,
      cc: ccList.length > 0 ? ccList : undefined,
      bcc: bccList.length > 0 ? bccList : undefined,
      subject,
      html,
    });

    return Response.json({ success: true, message: "Email sent successfully" });
  } catch (err) {
    console.error("Email send error:", err);
    return Response.json({ error: "Failed to send email. Check SMTP configuration." }, { status: 500 });
  }
}

import nodemailer from "nodemailer";

export function getTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("SMTP not configured");
  }

  return {
    transporter: nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    }),
    fromHeader: `"${process.env.FIRM_NAME || "SalesPitch AI"}" <${
      process.env.FIRM_EMAIL || smtpUser
    }>`,
  };
}

export async function sendAccessRequestEmail(params: {
  adminEmails: string[];
  requesterEmail: string;
  requesterName: string;
  approvalUrl: string;
}): Promise<void> {
  try {
    const { transporter, fromHeader } = getTransporter();
    const subject = `New access request: ${params.requesterEmail}`;
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px;">
        <h2 style="margin:0 0 16px">New access request</h2>
        <p><strong>${escapeHtml(params.requesterName)}</strong> (${escapeHtml(
      params.requesterEmail
    )}) has signed up and is awaiting approval to access SalesPitch AI.</p>
        <p style="margin:24px 0">
          <a href="${params.approvalUrl}" style="background:#3b82f6;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Review access requests</a>
        </p>
        <p style="color:#666;font-size:12px">Only admins can approve. If this was unexpected, reject the request from the admin panel.</p>
      </div>
    `;
    await transporter.sendMail({
      from: fromHeader,
      to: params.adminEmails.join(", "),
      subject,
      html,
    });
  } catch (err) {
    console.error("Failed to send access request email:", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

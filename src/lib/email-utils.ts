const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseRecipients(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateRecipients(input: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const email of parseRecipients(input)) {
    (EMAIL_RE.test(email) ? valid : invalid).push(email);
  }
  return { valid, invalid };
}

export function normalizeRecipients(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);
  }
  if (typeof input === "string") return parseRecipients(input);
  return [];
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

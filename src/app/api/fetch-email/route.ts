import { NextRequest } from "next/server";
import { isValidEmail } from "@/lib/email-utils";

const FETCH_TIMEOUT_MS = 5000;
const MAX_PAGES = 7;
const MAX_BODY_BYTES = 500_000;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const FIXED_PATHS = [
  "/contact",
  "/contact-us",
  "/about",
  "/about-us",
  "/locations",
  "/imprint",
];

const NAV_KEYWORDS = [
  "contact",
  "kontakt",
  "about",
  "team",
  "people",
  "locations",
  "imprint",
  "legal",
  "reach",
  "get-in-touch",
  "get in touch",
];

const BLOCKED_DOMAINS = ["example.com", "sentry.io", "wixpress.com"];
const BLOCKED_LOCAL_PARTS = [
  "noreply",
  "donotreply",
  "do-not-reply",
  "wordpress",
  "wix",
  "example",
];
const FILE_EXTENSIONS = [
  "png", "jpg", "jpeg", "gif", "svg", "webp", "ico",
  "css", "js", "woff", "woff2", "ttf", "otf",
  "pdf", "zip",
];

const PREFERRED_LOCAL_PARTS = new Set([
  "info", "contact", "hello", "sales", "office",
  "inquiries", "enquiries", "team", "admin",
]);

const DEMOTED_LOCAL_PARTS = ["noreply", "webmaster"];

interface FetchResult {
  url: string;
  html: string | null;
}

async function fetchPage(url: string): Promise<FetchResult> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return { url, html: null };
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_BODY_BYTES ? buf.slice(0, MAX_BODY_BYTES) : buf;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
    return { url, html };
  } catch {
    return { url, html: null };
  }
}

function discoverNavLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const anchorRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Map<string, number>();

  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, " ").trim().toLowerCase();
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) continue;

    let abs: URL;
    try {
      abs = new URL(href, baseUrl);
    } catch {
      continue;
    }
    if (abs.origin !== base.origin) continue;

    const pathLower = abs.pathname.toLowerCase();
    let score = 0;
    for (const kw of NAV_KEYWORDS) {
      if (pathLower.includes(kw)) score += 2;
      if (text.includes(kw)) score += 1;
    }
    if (score === 0) continue;

    const key = normalizeUrl(abs);
    const prev = seen.get(key) ?? -1;
    if (score > prev) seen.set(key, score);
  }

  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .slice(0, 5)
    .map(([url]) => url);
}

function normalizeUrl(u: URL): string {
  const path = u.pathname.replace(/\/+$/, "") || "/";
  return `${u.origin}${path}`.toLowerCase();
}

function extractEmails(html: string): string[] {
  const out: string[] = [];
  const mailtoRe = /mailto:([^"'?\s>]+)/gi;
  const bodyRe = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

  let m: RegExpExecArray | null;
  while ((m = mailtoRe.exec(html)) !== null) {
    try {
      out.push(decodeURIComponent(m[1]));
    } catch {
      out.push(m[1]);
    }
  }
  while ((m = bodyRe.exec(html)) !== null) {
    out.push(m[0]);
  }
  return out;
}

function isJunk(email: string): boolean {
  if (!isValidEmail(email)) return true;
  const lower = email.toLowerCase();
  const [local, domain] = lower.split("@");
  if (!local || !domain) return true;

  for (const ext of FILE_EXTENSIONS) {
    if (local.endsWith(`.${ext}`)) return true;
  }
  for (const blocked of BLOCKED_DOMAINS) {
    if (domain === blocked || domain.endsWith(`.${blocked}`)) return true;
  }
  for (const blockedLocal of BLOCKED_LOCAL_PARTS) {
    if (local === blockedLocal || local.startsWith(`${blockedLocal}-`) || local.startsWith(`${blockedLocal}.`)) {
      return true;
    }
  }
  return false;
}

function rootDomain(host: string): string {
  const parts = host.toLowerCase().split(".");
  return parts.slice(-2).join(".");
}

function rankEmails(emails: string[], baseUrl: string): string[] {
  let baseDomain = "";
  try {
    baseDomain = rootDomain(new URL(baseUrl).hostname);
  } catch {
    baseDomain = "";
  }

  const scored = emails.map((email) => {
    const lower = email.toLowerCase();
    const [local, domain] = lower.split("@");
    let score = 0;
    if (baseDomain && (domain === baseDomain || domain.endsWith(`.${baseDomain}`))) score += 10;
    if (PREFERRED_LOCAL_PARTS.has(local)) score += 5;
    if (DEMOTED_LOCAL_PARTS.some((d) => local.includes(d))) score -= 10;
    return { email: lower, score };
  });

  scored.sort((a, b) => b.score - a.score || a.email.localeCompare(b.email));
  return scored.map((s) => s.email);
}

export async function POST(request: NextRequest) {
  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.url !== "string" || !body.url.trim()) {
    return Response.json({ error: "Missing required field: url" }, { status: 400 });
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(body.url.trim());
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    return Response.json({ error: "URL must use http or https" }, { status: 400 });
  }

  const homeUrl = `${baseUrl.origin}${baseUrl.pathname.replace(/\/+$/, "") || ""}` || baseUrl.origin;
  const home = await fetchPage(homeUrl);

  const navLinks = home.html ? discoverNavLinks(home.html, homeUrl) : [];
  const fixedLinks = FIXED_PATHS.map((p) => `${baseUrl.origin}${p}`);

  const urlSet = new Map<string, string>();
  urlSet.set(normalizeUrl(new URL(homeUrl)), homeUrl);
  for (const link of [...navLinks, ...fixedLinks]) {
    try {
      const key = normalizeUrl(new URL(link));
      if (!urlSet.has(key) && urlSet.size < MAX_PAGES) {
        urlSet.set(key, link);
      }
    } catch {
      // skip malformed
    }
  }

  const toFetch = [...urlSet.values()].filter((u) => u !== homeUrl);
  const fetched = await Promise.allSettled(toFetch.map((u) => fetchPage(u)));

  const pages: FetchResult[] = [home];
  for (const r of fetched) {
    if (r.status === "fulfilled") pages.push(r.value);
  }

  const pagesScanned = pages.filter((p) => p.html !== null).length;

  const collected: string[] = [];
  for (const p of pages) {
    if (p.html) collected.push(...extractEmails(p.html));
  }

  const cleaned = collected
    .map((e) => e.trim())
    .filter((e) => !isJunk(e));

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const e of cleaned) {
    const lower = e.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      deduped.push(lower);
    }
  }

  const ranked = rankEmails(deduped, baseUrl.toString()).slice(0, 10);

  return Response.json({ emails: ranked, pagesScanned });
}

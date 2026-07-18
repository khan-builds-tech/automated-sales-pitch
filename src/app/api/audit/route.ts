import { NextRequest } from "next/server";
import { AuditResult, AuditScore, CompetitorInfo, Business, SocialProfile, OnlinePresence } from "@/lib/types";

interface NearbyPlace {
  id: string;
  displayName?: { text: string };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  currentOpeningHours?: { openNow: boolean };
  photos?: { name: string }[];
}

async function getPlaceDetails(placeId: string, apiKey: string): Promise<Partial<Business>> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "displayName,formattedAddress,internationalPhoneNumber,nationalPhoneNumber,websiteUri,rating,userRatingCount,types",
    },
  });
  if (!res.ok) return {};
  const r = await res.json();
  return {
    name: r.displayName?.text,
    address: r.formattedAddress,
    phone: r.internationalPhoneNumber || r.nationalPhoneNumber,
    website: r.websiteUri,
    rating: r.rating,
    total_ratings: r.userRatingCount,
    types: r.types,
  };
}

async function discoverSocialMedia(businessName: string, address: string, apiKey: string): Promise<SocialProfile[]> {
  const platforms = [
    { name: "Facebook", query: `${businessName} ${address} facebook` },
    { name: "Instagram", query: `${businessName} ${address} instagram` },
    { name: "Twitter / X", query: `${businessName} ${address} twitter` },
    { name: "LinkedIn", query: `${businessName} ${address} linkedin` },
    { name: "YouTube", query: `${businessName} ${address} youtube` },
    { name: "Blog / Website", query: `${businessName} ${address} blog` },
  ];

  const domainMap: Record<string, string> = {
    "Facebook": "facebook.com",
    "Instagram": "instagram.com",
    "Twitter / X": "twitter.com",
    "LinkedIn": "linkedin.com",
    "YouTube": "youtube.com",
  };

  const profiles: SocialProfile[] = [];

  // Use Places API text search to look for the business — won't find social links directly,
  // so we try a lightweight HEAD-request approach to check common URL patterns
  const cityMatch = address.match(/,\s*([^,]+),/);
  const city = cityMatch ? cityMatch[1].trim() : "";
  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const slugDash = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

  const checks = [
    { platform: "Facebook", urls: [`https://www.facebook.com/${slug}`, `https://www.facebook.com/${slugDash}`] },
    { platform: "Instagram", urls: [`https://www.instagram.com/${slug}`, `https://www.instagram.com/${slugDash}`] },
    { platform: "Twitter / X", urls: [`https://x.com/${slug}`, `https://x.com/${slugDash}`] },
    { platform: "LinkedIn", urls: [`https://www.linkedin.com/company/${slug}`, `https://www.linkedin.com/company/${slugDash}`] },
    { platform: "YouTube", urls: [`https://www.youtube.com/@${slug}`, `https://www.youtube.com/@${slugDash}`] },
  ];

  const results = await Promise.allSettled(
    checks.map(async ({ platform, urls }) => {
      for (const url of urls) {
        try {
          const res = await fetch(url, {
            method: "HEAD",
            redirect: "follow",
            signal: AbortSignal.timeout(5000),
          });
          // Most platforms return 200 even for non-existent pages (they show a "not found" page),
          // but a redirect to a login/home page or a 404 means no profile
          if (res.ok && !res.url.includes("/login") && !res.url.includes("/accounts/login")) {
            return { platform, found: true, url: res.url };
          }
        } catch {
          // timeout or network error — skip
        }
      }
      return { platform, found: false };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      profiles.push(result.value);
    }
  }

  // Add any platforms we didn't check
  const checkedPlatforms = new Set(profiles.map(p => p.platform));
  for (const { name } of platforms) {
    if (!checkedPlatforms.has(name)) {
      profiles.push({ platform: name, found: false });
    }
  }

  return profiles;
}

interface PageSpeedResult {
  scores: AuditScore[];
  error?: string;
  siteBroken?: boolean;
}

const SOCIAL_DOMAIN_PATTERNS: { test: RegExp; platform: string }[] = [
  { test: /(?:^|\.)instagram\.com$/i, platform: "Instagram" },
  { test: /(?:^|\.)facebook\.com$/i, platform: "Facebook" },
  { test: /(?:^|\.)fb\.com$/i, platform: "Facebook" },
  { test: /(?:^|\.)linktr\.ee$/i, platform: "Linktree" },
  { test: /(?:^|\.)linktree\.com$/i, platform: "Linktree" },
  { test: /(?:^|\.)tiktok\.com$/i, platform: "TikTok" },
  { test: /(?:^|\.)x\.com$/i, platform: "Twitter / X" },
  { test: /(?:^|\.)twitter\.com$/i, platform: "Twitter / X" },
  { test: /(?:^|\.)youtube\.com$/i, platform: "YouTube" },
  { test: /(?:^|\.)youtu\.be$/i, platform: "YouTube" },
  { test: /(?:^|\.)wa\.me$/i, platform: "WhatsApp" },
  { test: /(?:^|\.)api\.whatsapp\.com$/i, platform: "WhatsApp" },
];

function detectSocialOnlyWebsite(websiteUrl: string | undefined): { isSocial: boolean; platform?: string } {
  if (!websiteUrl) return { isSocial: false };
  let host = "";
  try {
    host = new URL(websiteUrl).hostname.toLowerCase();
  } catch {
    const lower = websiteUrl.toLowerCase();
    const m = lower.match(/^(?:https?:\/\/)?([^/]+)/);
    host = m ? m[1] : lower;
  }
  for (const { test, platform } of SOCIAL_DOMAIN_PATTERNS) {
    if (test.test(host)) return { isSocial: true, platform };
  }
  return { isSocial: false };
}

async function fetchPageSpeed(url: string, timeoutMs: number): Promise<{ data?: { error?: { message?: string }; lighthouseResult?: { categories?: Record<string, { score?: number }>; audits?: Record<string, { score?: number; displayValue?: string }> } }; error?: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) {
      return { error: `PageSpeed HTTP ${res.status}` };
    }
    const data = await res.json();
    if (data.error) {
      return { error: `PageSpeed API: ${data.error.message || "unknown error"}` };
    }
    return { data };
  } catch (err) {
    const name = (err as Error)?.name;
    const msg = (err as Error)?.message || String(err);
    if (name === "TimeoutError" || name === "AbortError") {
      return { error: "timeout" };
    }
    return { error: `fetch failed: ${msg}` };
  }
}

async function getPageSpeedScores(website: string): Promise<PageSpeedResult> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  const categories = ["performance", "seo", "accessibility", "best_practices"];
  const catParams = categories.map(c => `category=${c.toUpperCase()}`).join("&");
  const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(website)}&strategy=mobile&${catParams}${apiKey ? `&key=${apiKey}` : ""}`;

  let attempt = await fetchPageSpeed(url, 75000);
  if (attempt.error === "timeout") {
    console.warn(`[audit] PageSpeed timed out for ${website}, retrying once`);
    attempt = await fetchPageSpeed(url, 75000);
  }

  if (!attempt.data) {
    if (attempt.error === "timeout") {
      const reason = "PageSpeed Insights timed out — the site may be too slow or large to analyze automatically";
      console.error(`[audit] PageSpeed timed out for ${website}`);
      return { scores: generateUnavailableScores(reason), error: reason };
    }
    // HTTP 4xx/5xx or "fetch failed" from PSI almost always means the target site itself is unreachable,
    // returning errors, blocking automated traffic, or fundamentally broken — pitch this as a fix opportunity.
    const reason = `Your website appears to be unreachable or returning errors (${attempt.error}). Real customers searching for you are seeing the same — and walking away.`;
    console.error(`[audit] PageSpeed reported site broken for ${website}: ${attempt.error}`);
    return { scores: generateBrokenSiteScores(), error: reason, siteBroken: true };
  }

  const data = attempt.data;
  const cats = data.lighthouseResult?.categories || {};
  const scores: AuditScore[] = [];

  if (cats.performance) {
    const perfScore = Math.round((cats.performance.score || 0) * 100);
    scores.push({
      label: "Performance",
      score: perfScore,
      details: getPerformanceDetails(perfScore, data.lighthouseResult?.audits),
    });
  }

  if (cats.seo) {
    const seoScore = Math.round((cats.seo.score || 0) * 100);
    scores.push({
      label: "SEO",
      score: seoScore,
      details: getSEODetails(seoScore, data.lighthouseResult?.audits),
    });
  }

  if (cats.accessibility) {
    const a11yScore = Math.round((cats.accessibility.score || 0) * 100);
    scores.push({
      label: "Accessibility",
      score: a11yScore,
      details: getAccessibilityDetails(a11yScore),
    });
  }

  if (cats["best_practices"]) {
    const bpScore = Math.round((cats["best_practices"].score || 0) * 100);
    scores.push({
      label: "Best Practices",
      score: bpScore,
      details: getBestPracticesDetails(bpScore),
    });
  }

  if (scores.length === 0) {
    const reason = "PageSpeed Insights returned no category scores for this site";
    console.error(`[audit] ${reason}: ${website}`);
    return { scores: generateUnavailableScores(reason), error: reason };
  }

  const perfVal = scores.find(s => s.label === "Performance")?.score ?? 50;
  const a11yVal = scores.find(s => s.label === "Accessibility")?.score ?? 50;
  const uxScore = Math.round((perfVal * 0.4 + a11yVal * 0.6));
  scores.push({
    label: "UX / Design",
    score: uxScore,
    details: getUXDetails(uxScore),
  });

  return { scores };
}

function generateUnavailableScores(reason: string): AuditScore[] {
  return [
    { label: "Performance", score: 0, unavailable: true, details: [reason] },
    { label: "SEO", score: 0, unavailable: true, details: [reason] },
    { label: "Accessibility", score: 0, unavailable: true, details: [reason] },
    { label: "Best Practices", score: 0, unavailable: true, details: [reason] },
    { label: "UX / Design", score: 0, unavailable: true, details: [reason] },
  ];
}

function generateBrokenSiteScores(): AuditScore[] {
  const rootCauses = [
    "Common causes: server downtime, expired hosting, DNS misconfiguration, SSL certificate failure, or firewall blocking automated traffic",
    "Whatever blocks Google's tools also blocks search engines and likely real customers",
  ];
  return [
    {
      label: "Site Reachability",
      score: 0,
      unavailable: true,
      details: [
        "Your site failed to respond successfully to automated reachability checks",
        ...rootCauses,
      ],
    },
    {
      label: "SEO",
      score: 0,
      unavailable: true,
      details: [
        "Google cannot crawl or rank a site that consistently fails to load",
        "If the issue has persisted, your search ranking is actively decaying",
        "Recovery typically takes 4-8 weeks of consistent uptime after the fix",
      ],
    },
    {
      label: "Lead Capture",
      score: 0,
      unavailable: true,
      details: [
        "Broken contact forms, booking widgets and calls-to-action mean zero inbound leads",
        "Any spend on Google Ads or social ads pointing at a broken site is wasted budget",
        "Every day the site is down represents qualified inquiries you will never see",
      ],
    },
    {
      label: "Customer Trust",
      score: 0,
      unavailable: true,
      details: [
        "A broken site reads as 'closed for business' to first-time visitors",
        "Industry research shows ~88% of users do not return after a poor website experience",
        "Years of offline reputation can be undermined by one unreliable digital storefront",
      ],
    },
    {
      label: "Brand Perception",
      score: 0,
      unavailable: true,
      details: [
        "Competitors with working websites win every direct comparison by default",
        "Prospects assume a broken site reflects how the business is run overall",
      ],
    },
  ];
}

function getPerformanceDetails(score: number, audits?: Record<string, { displayValue?: string }>): string[] {
  const details: string[] = [];
  if (audits) {
    if (audits["first-contentful-paint"]?.displayValue) details.push(`First Contentful Paint: ${audits["first-contentful-paint"].displayValue}`);
    if (audits["largest-contentful-paint"]?.displayValue) details.push(`Largest Contentful Paint: ${audits["largest-contentful-paint"].displayValue}`);
    if (audits["speed-index"]?.displayValue) details.push(`Speed Index: ${audits["speed-index"].displayValue}`);
    if (audits["total-blocking-time"]?.displayValue) details.push(`Total Blocking Time: ${audits["total-blocking-time"].displayValue}`);
  }
  if (score < 50) details.push("Critical: Major performance issues detected");
  else if (score < 80) details.push("Website loads slower than industry average");
  else details.push("Good performance — loads within acceptable range");
  return details;
}

function getSEODetails(score: number, audits?: Record<string, { score?: number }>): string[] {
  const details: string[] = [];
  if (audits) {
    if (audits["meta-description"]?.score === 0) details.push("Missing meta description tag");
    if (audits["document-title"]?.score === 0) details.push("Missing or empty page title");
    if (audits["link-text"]?.score === 0) details.push("Links lack descriptive text");
    if (audits["is-crawlable"]?.score === 0) details.push("Page is blocked from indexing");
  }
  if (score < 50) details.push("Severe SEO issues — likely not ranking in search results");
  else if (score < 80) details.push("SEO needs improvement to rank competitively");
  else details.push("Solid SEO foundation in place");
  return details;
}

function getAccessibilityDetails(score: number): string[] {
  if (score < 50) return ["Major accessibility barriers for users with disabilities", "Missing ARIA labels and alt text", "Color contrast issues likely present"];
  if (score < 80) return ["Some accessibility improvements needed", "May not meet WCAG 2.1 AA standards"];
  return ["Good accessibility practices in place"];
}

function getBestPracticesDetails(score: number): string[] {
  if (score < 50) return ["Security vulnerabilities or outdated libraries detected", "Console errors present", "HTTPS issues possible"];
  if (score < 80) return ["Some best practice violations found", "Minor security or code quality issues"];
  return ["Follows modern web best practices"];
}

function getUXDetails(score: number): string[] {
  if (score < 50) return ["Poor user experience — slow loading and usability issues", "Mobile experience likely subpar", "High bounce rate expected"];
  if (score < 80) return ["Decent UX but room for improvement", "Page interactions could be smoother"];
  return ["Good overall user experience"];
}

function generateNoWebsiteScores(competitors: CompetitorInfo[], socialProfiles: SocialProfile[], socialOnlyPlatform?: string): AuditScore[] {
  const competitorsWithSites = competitors.filter(c => c.hasWebsite).length;
  const socialFound = socialProfiles.filter(p => p.found).length;

  const digitalPresenceScore = socialFound > 3 ? 30 : socialFound > 1 ? 20 : socialFound > 0 ? 10 : 0;
  const competitiveScore = competitorsWithSites === 0 ? 40 : Math.max(5, 40 - competitorsWithSites * 8);

  const presenceDetails: string[] = socialOnlyPlatform
    ? [
        `Your only verified online presence is ${socialOnlyPlatform} — a rented audience on a platform you do not control`,
        "Without a website, there's no owned hub for customers to learn, compare, and convert",
        `${socialOnlyPlatform} algorithm changes, account suspensions and feature deprecations can wipe out your visibility overnight`,
        "Businesses with a website see 2-3x more customer inquiries than social-only businesses",
      ]
    : [
        "No website detected — invisible to the 97% of consumers who research online before buying",
        socialFound > 0
          ? `Found ${socialFound} social media profile(s) — but without a website, there's no central hub to convert visitors`
          : "No social media profiles detected — zero online footprint outside of Google Maps",
        "Businesses with websites get 2-3x more customer inquiries than those without",
      ];

  const seoDetails: string[] = socialOnlyPlatform
    ? [
        `Google searches do not surface ${socialOnlyPlatform} posts ahead of competitor websites — you are missing the most valuable buyer-intent traffic`,
        '"Near me" searches drive most local service revenue and have grown 500%+ in recent years — none of that traffic reaches you today',
        "Without ranked pages, you depend entirely on social discovery — a single algorithm change can cut visibility overnight",
      ]
    : [
        "Cannot appear in Google search results without a website",
        "Potential customers searching for your services will find competitors instead",
        '"Near me" searches have grown 500%+ in recent years — you cannot rank for any of them',
        "No ability to rank for industry-specific keywords or service-area pages",
      ];

  const leadGenDetails: string[] = socialOnlyPlatform
    ? [
        `${socialOnlyPlatform} DMs cap inbound to whenever a follower decides to message — a website captures interest the moment it forms`,
        "No way to run Google Ads, retargeting, or pixel-based campaigns — Meta-only ads typically cost 30-50% more per qualified lead in local service categories",
        "No email capture means no owned audience — every campaign restarts from zero",
        "Online booking, quote forms and click-to-WhatsApp from a real site convert dramatically better than DM funnels",
      ]
    : [
        "No online booking, contact forms, or quote request capability",
        "Missing 24/7 lead capture — customers can only reach you during business hours",
        "No email list building or newsletter capability",
        "Cannot run Google Ads or retargeting campaigns without a landing page",
      ];

  return [
    { label: "Digital Presence", score: digitalPresenceScore, details: presenceDetails },
    { label: "SEO & Discoverability", score: 0, details: seoDetails },
    { label: "Lead Generation", score: 5, details: leadGenDetails },
    {
      label: "Competitive Standing",
      score: competitiveScore,
      details: competitorsWithSites > 0
        ? [
            `${competitorsWithSites} of ${competitors.length} nearby competitors have websites`,
            ...competitors.filter(c => c.hasWebsite).slice(0, 3).map(c =>
              `${c.name} has a website${c.rating ? ` (${c.rating}/5 stars, ${c.totalRatings || 0} reviews)` : ""}`
            ),
            "Buyers default to competitors they can research, compare and book directly",
          ]
        : [
            "None of your nearby competitors have websites either — this is your opportunity to lead",
            "Being the first in your area with a website gives a meaningful first-mover advantage",
            "Early digital presence captures customers before competitors catch up",
          ],
    },
    {
      label: "Trust & Credibility",
      score: socialOnlyPlatform ? 25 : 15,
      details: socialOnlyPlatform
        ? [
            "84% of consumers say a business with a professional website is more credible than one without",
            `${socialOnlyPlatform} alone makes it harder to display certifications, case studies, pricing transparency and detailed service pages`,
            "Limited control over brand narrative — your story is constrained to a feed format",
          ]
        : [
            "84% of consumers believe a business with a website is more credible",
            "No platform to showcase testimonials, portfolio, or certifications",
            "Cannot display trust signals (awards, partnerships, certifications)",
            "Limited to Google Maps listing — no control over brand narrative",
          ],
    },
  ];
}

async function findCompetitors(business: Business, apiKey: string): Promise<CompetitorInfo[]> {
  const type = business.types?.[0] || "business";
  const lat = business.lat;
  const lng = business.lng;

  if (!lat || !lng) return [];

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount,places.websiteUri,places.currentOpeningHours,places.photos",
      },
      body: JSON.stringify({
        includedTypes: [type],
        maxResultCount: 10,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 5000.0,
          },
        },
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.places || [])
      .filter((p: NearbyPlace) => p.id !== business.place_id)
      .slice(0, 5)
      .map((p: NearbyPlace) => ({
        name: p.displayName?.text || "",
        rating: p.rating,
        totalRatings: p.userRatingCount,
        website: p.websiteUri,
        hasWebsite: !!p.websiteUri,
        strengths: getCompetitorStrengths(p),
      }));
  } catch {
    return [];
  }
}

function getCompetitorStrengths(place: NearbyPlace): string[] {
  const strengths: string[] = [];
  if (place.websiteUri) strengths.push(`Has website: ${place.websiteUri}`);
  if (place.rating && place.rating >= 4.5) strengths.push(`High rating: ${place.rating}/5`);
  if (place.userRatingCount && place.userRatingCount > 100) strengths.push(`Strong review base: ${place.userRatingCount} reviews`);
  if (place.currentOpeningHours) strengths.push("Active business hours listed");
  if (place.photos) strengths.push("Visual presence with photos");
  if (strengths.length === 0) strengths.push("Established local presence");
  return strengths;
}

function generateRecommendations(hasWebsite: boolean, scores: AuditScore[], socialProfiles: SocialProfile[], opts?: { siteBroken?: boolean; siteUrl?: string; socialOnlyPlatform?: string }): string[] {
  const recs: string[] = [];

  if (opts?.siteBroken) {
    const where = opts.siteUrl ? ` (${opts.siteUrl})` : "";
    recs.push(`Your website${where} appears to be broken or unreachable — every day it stays this way represents qualified inquiries lost to competitors`);
    recs.push("Immediately verify the issue from multiple geographies using a free uptime checker (uptimerobot.com, pingdom.com) so you can quantify the downtime to date");
    recs.push("If the cause is hosting-related, migrate to a managed host with a 99.9%+ uptime SLA — cheap shared hosting routinely costs more in lost revenue than it saves in fees");
    recs.push("If the site itself is broken, our team can typically diagnose and rebuild a small business site within 2-4 weeks on a modern, reliable stack");
    recs.push("Set up uptime monitoring with email and SMS alerts so future outages are caught in minutes — not days later through a frustrated customer");
    recs.push("Re-submit the fixed site to Google Search Console as soon as it's stable to accelerate re-indexing and recover lost ranking");
    recs.push("Pair the rebuild with proper analytics (GA4, Search Console, Hotjar) so the next iteration is informed by real visitor behaviour, not guesswork");
    return recs;
  }

  if (!hasWebsite) {
    if (opts?.socialOnlyPlatform) {
      const p = opts.socialOnlyPlatform;
      recs.push(`Your business currently relies entirely on ${p} for online discovery — a borrowed audience on a platform you do not own or control`);
      recs.push(`Build a dedicated website to convert ${p} engagement into measurable revenue: a clean 5-page site (Home, Services, About, Reviews, Contact) is enough for most local businesses to start`);
      recs.push(`Use ${p} as a top-of-funnel channel and your website as the conversion engine — link your bio, stories and posts to specific landing pages instead of DMs`);
      recs.push("Add a 24/7 contact form, online booking and click-to-WhatsApp to capture inbound interest the moment it forms — not whenever someone remembers to message you");
      recs.push("Register a custom domain matching your business name — significantly stronger trust signal than a social handle in search results");
    } else {
      recs.push("Build a professional, mobile-responsive website — this is the #1 priority for sustainable lead generation");
      recs.push("Register a custom domain that matches your business name to establish brand consistency and trust");
    }

    const missingSocial = socialProfiles.filter(p => !p.found);
    const foundSocial = socialProfiles.filter(p => p.found);

    if (foundSocial.length > 0) {
      recs.push(`Connect your existing ${foundSocial.map(p => p.platform).join(", ")} presence to a central website so casual followers turn into trackable, owned leads`);
    }
    if (missingSocial.length > 0) {
      recs.push(`Expand reach with profiles on: ${missingSocial.map(p => p.platform).join(", ")}`);
    }

    recs.push("Complete your Google Business Profile with photos, services, and weekly posts — this directly feeds local search ranking");
    recs.push("Implement online booking or a contact form for round-the-clock lead capture");
    recs.push("Build a review collection workflow across Google, Facebook and your website — reviews are the single biggest trust factor for local buyers");
    return recs;
  }

  const usable = scores.filter(s => !s.unavailable);

  for (const s of usable) {
    if (s.score < 50) {
      if (s.label === "Performance") recs.push("Optimize website speed — compress images, enable caching, minimize JavaScript");
      if (s.label === "SEO") recs.push("Implement comprehensive SEO strategy — meta tags, structured data, keyword optimization");
      if (s.label === "Accessibility") recs.push("Fix accessibility issues to reach wider audience and improve search rankings");
      if (s.label === "Best Practices") recs.push("Update security headers, fix console errors, and modernize tech stack");
      if (s.label === "UX / Design") recs.push("Redesign for better user experience — improve navigation, mobile responsiveness, and page layout");
    } else if (s.score < 80) {
      if (s.label === "Performance") recs.push("Fine-tune performance — lazy load images, optimize critical rendering path");
      if (s.label === "SEO") recs.push("Enhance SEO with content strategy, blog posts, and backlink building");
      if (s.label === "UX / Design") recs.push("Polish UX with micro-interactions, better typography, and clearer CTAs");
    }
  }

  if (usable.length === 0) {
    recs.push("Run a manual review of the website — automated analysis was unavailable");
    recs.push("Validate the site's mobile responsiveness, page speed, and SEO basics manually");
  } else if (recs.length === 0) {
    recs.push("Website is solid — focus on conversion rate optimization");
    recs.push("Implement A/B testing to optimize key landing pages");
  }

  recs.push("Set up analytics and conversion tracking to measure ROI");
  recs.push("Run targeted advertising campaigns (Google Ads, Social Media Ads)");

  return recs;
}

function getOverallGrade(scores: AuditScore[]): string {
  const usable = scores.filter(s => !s.unavailable);
  if (usable.length === 0) return "—";
  const avg = usable.reduce((sum, s) => sum + s.score, 0) / usable.length;
  if (avg >= 90) return "A+";
  if (avg >= 80) return "A";
  if (avg >= 70) return "B";
  if (avg >= 60) return "C";
  if (avg >= 40) return "D";
  return "F";
}

function generateOpportunities(hasWebsite: boolean, scores: AuditScore[], competitors: CompetitorInfo[], opts?: { siteBroken?: boolean; socialOnlyPlatform?: string }): string[] {
  if (opts?.siteBroken) {
    const competitorsWithSites = competitors.filter(c => c.hasWebsite).length;
    const opps = [
      "Recover the leads currently lost every day — prospective customers do not refresh a broken site, they go to a competitor and rarely come back",
      "A modern rebuild on a reliable stack often outperforms the original site within 60 days — current web standards alone deliver 2-3x faster load times",
      "Restore Google ranking — broken sites get demoted, but recovery typically begins within 4-8 weeks of consistent uptime after the fix",
      "Layer in the analytics, conversion tracking and uptime monitoring that the original site likely lacked — so the next iteration is measured, not guessed",
    ];
    if (competitorsWithSites > 0) {
      opps.push(`${competitorsWithSites} nearby competitor(s) currently have working websites — they are absorbing the leads your broken site is rejecting today`);
    }
    opps.push("Pair the rebuild with retargeting and Google Ads to win back visitors lost over the months the site has been broken");
    opps.push("Use the rebuild as a positioning reset — fresh design, sharper messaging, and clear calls-to-action typically lift inquiry volume by 40-60%");
    return opps;
  }

  if (!hasWebsite) {
    const competitorsWithSites = competitors.filter(c => c.hasWebsite).length;
    const opps: string[] = [];

    if (opts?.socialOnlyPlatform) {
      const p = opts.socialOnlyPlatform;
      opps.push(`Convert ${p} engagement into measurable revenue — most social-only businesses lose 60-80% of interested followers because there is no clear next step beyond a DM`);
      opps.push("Capture the ~68% of buyers who research on Google before contacting any business — that audience cannot find you today");
      opps.push(`Reach buyers who do not actively use ${p} — local intent search on Google reaches significantly more buyers for service categories than any single social platform`);
      opps.push("Run Google Search Ads to a real landing page (impossible from a social-only presence) — local service categories typically pay 30-50% less per qualified lead than Meta Ads");
      opps.push("Build a compounding SEO foundation — paid ads stop the moment you stop spending, but ranked content keeps generating leads for years");
      opps.push("Own your customer relationships through email and phone capture — a list of 500 owned customers is more valuable than 5,000 followers you do not control");
    } else {
      opps.push("Capture the 97% of consumers who research a local business online before visiting");
      opps.push("Showcase reviews and testimonials in a controlled environment to build trust at scale");
      opps.push("Provide 24/7 access to your hours, services, pricing and FAQs — without burdening your team");
      opps.push("Generate leads while you sleep with automated contact forms, online booking and click-to-call");
    }

    if (competitorsWithSites > 0) {
      opps.push(`${competitorsWithSites} competitor(s) already have websites — a proper site levels the playing field and lets you compete on Google directly`);
    } else {
      opps.push("None of your nearby competitors have websites — be the first and dominate local search results in your area");
    }

    opps.push("A focused professional website typically lifts inbound inquiries by 200-400% within the first 90 days for local service businesses");
    opps.push("Content marketing (blog posts, location guides, service pages) establishes you as the area authority and compounds in value over months");

    return opps;
  }

  const opps: string[] = [];
  const usable = scores.filter(s => !s.unavailable);

  if (usable.length === 0) {
    opps.push("Confirm site performance manually — automated analysis was unavailable");
    opps.push("A walk-through audit can still surface conversion, SEO, and design wins");
    opps.push("Targeted advertising could deliver 5-10x ROI on ad spend");
    return opps;
  }

  const avg = usable.reduce((sum, s) => sum + s.score, 0) / usable.length;

  if (avg < 50) {
    opps.push("Potential to increase online leads by 200-300% with website overhaul");
    opps.push("Fix critical issues to stop losing customers to faster competitor sites");
  } else if (avg < 80) {
    opps.push("Optimization could increase conversion rates by 50-100%");
    opps.push("Better SEO could drive 2-3x more organic traffic");
  } else {
    opps.push("Fine-tuning could capture an additional 10-20% more leads");
    opps.push("Advanced strategies like personalization could boost conversions");
  }

  opps.push("Targeted advertising could deliver 5-10x ROI on ad spend");
  opps.push("Content marketing can establish thought leadership in your market");

  return opps;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { business } = body as { business: Business };

  if (!business?.place_id) {
    return Response.json({ error: "Business data is required" }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey || apiKey === "YOUR_GOOGLE_PLACES_API_KEY") {
    return Response.json({ error: "Google API key not configured" }, { status: 500 });
  }

  try {
    const details = await getPlaceDetails(business.place_id, apiKey);
    const enrichedBusiness: Business = { ...business, ...details };

    // Detect when Google Places returned a social-media URL as the "website" — these
    // businesses do not have a real website and should be pitched as such.
    const socialOnly = detectSocialOnlyWebsite(enrichedBusiness.website);
    const hasWebsite = !!enrichedBusiness.website && !socialOnly.isSocial;

    // Run competitor search and social media discovery in parallel
    const [competitors, socialProfiles] = await Promise.all([
      findCompetitors(enrichedBusiness, apiKey),
      discoverSocialMedia(enrichedBusiness.name, enrichedBusiness.address, apiKey),
    ]);

    // If the "website" Google has on file is actually a social URL, surface that profile as found
    if (socialOnly.isSocial && socialOnly.platform && enrichedBusiness.website) {
      const existing = socialProfiles.find(p => p.platform === socialOnly.platform);
      if (existing) {
        existing.found = true;
        existing.url = enrichedBusiness.website;
      } else {
        socialProfiles.unshift({ platform: socialOnly.platform, found: true, url: enrichedBusiness.website });
      }
    }

    // Only run PageSpeed if there IS a real website — social-only businesses get the no-website pitch
    let scores: AuditScore[];
    let auditError: string | undefined;
    let siteBroken = false;
    if (hasWebsite) {
      const result = await getPageSpeedScores(enrichedBusiness.website!);
      scores = result.scores;
      auditError = result.error;
      siteBroken = !!result.siteBroken;
    } else {
      scores = generateNoWebsiteScores(competitors, socialProfiles, socialOnly.platform);
    }

    const recommendations = generateRecommendations(hasWebsite, scores, socialProfiles, {
      siteBroken,
      siteUrl: enrichedBusiness.website,
      socialOnlyPlatform: socialOnly.platform,
    });
    const overallGrade = getOverallGrade(scores);
    const opportunities = generateOpportunities(hasWebsite, scores, competitors, {
      siteBroken,
      socialOnlyPlatform: socialOnly.platform,
    });

    const competitorsWithWebsites = competitors.filter(c => c.hasWebsite).length;

    const onlinePresence: OnlinePresence = {
      hasWebsite,
      socialProfiles,
      competitorsWithWebsites,
      competitorsTotal: competitors.length,
      websiteBenefits: !hasWebsite
        ? socialOnly.platform
          ? [
              `A website turns ${socialOnly.platform} engagement into an owned, measurable customer pipeline — followers become trackable leads`,
              "70-80% of buyers research a business on Google before any contact — without a website you are invisible to that intent",
              "Owned digital real estate is immune to algorithm changes, account suspensions and platform policy shifts",
              "A website unlocks Google Search Ads, SEO and retargeting — channels that typically deliver lower cost-per-lead than social ads alone",
              "Showcase pricing, certifications, case studies and detailed services in a structured format that a social feed simply cannot deliver",
              "A website is the foundation for every other marketing investment — without it, paid social, email marketing and SEO all underperform",
            ]
          : [
              "A website works 24/7 as your digital storefront — even when you're closed",
              "70-80% of consumers research a business online before visiting or making a purchase",
              "Websites let you control your brand narrative, showcase work, and build trust at scale",
              "Online presence enables Google Ads, SEO, email marketing, and social media integration",
              "Competitors with websites capture significantly more leads and customer inquiries",
              "A website is the foundation for all digital marketing — without it, other efforts are limited",
            ]
        : [],
    };

    const result: AuditResult = {
      business: enrichedBusiness,
      hasWebsite,
      scores,
      recommendations,
      competitors,
      overallGrade,
      opportunities,
      onlinePresence,
      auditError,
      siteBroken: siteBroken || undefined,
      socialOnlyPlatform: socialOnly.platform,
    };

    return Response.json(result);
  } catch (err) {
    console.error("Audit error:", err);
    return Response.json({ error: "Failed to audit business" }, { status: 500 });
  }
}

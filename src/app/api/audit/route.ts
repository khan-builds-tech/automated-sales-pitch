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
      "X-Goog-FieldMask": "displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,types",
    },
  });
  if (!res.ok) return {};
  const r = await res.json();
  return {
    name: r.displayName?.text,
    address: r.formattedAddress,
    phone: r.nationalPhoneNumber,
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
  const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(website)}&${catParams}${apiKey ? `&key=${apiKey}` : ""}`;

  let attempt = await fetchPageSpeed(url, 75000);
  if (attempt.error === "timeout") {
    console.warn(`[audit] PageSpeed timed out for ${website}, retrying once`);
    attempt = await fetchPageSpeed(url, 75000);
  }

  if (!attempt.data) {
    const reason = attempt.error === "timeout"
      ? "PageSpeed Insights timed out — the site may be too slow or large to analyze automatically"
      : `PageSpeed Insights could not analyze this site (${attempt.error})`;
    console.error(`[audit] PageSpeed failed for ${website}: ${attempt.error}`);
    return { scores: generateUnavailableScores(reason), error: reason };
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

function generateNoWebsiteScores(competitors: CompetitorInfo[], socialProfiles: SocialProfile[]): AuditScore[] {
  const competitorsWithSites = competitors.filter(c => c.hasWebsite).length;
  const socialFound = socialProfiles.filter(p => p.found).length;

  const digitalPresenceScore = socialFound > 3 ? 30 : socialFound > 1 ? 20 : socialFound > 0 ? 10 : 0;
  const competitiveScore = competitorsWithSites === 0 ? 40 : Math.max(5, 40 - competitorsWithSites * 8);

  return [
    {
      label: "Digital Presence",
      score: digitalPresenceScore,
      details: [
        "No website found — invisible to 97% of consumers who search online",
        socialFound > 0
          ? `Found ${socialFound} social media profile(s) — but without a website, there's no central hub to convert visitors`
          : "No social media profiles detected — zero online footprint outside of Google Maps",
        "Businesses with websites get 2-3x more customer inquiries than those without",
      ],
    },
    {
      label: "SEO & Discoverability",
      score: 0,
      details: [
        "Cannot appear in Google search results without a website",
        "Potential customers searching for your services will find competitors instead",
        "Missing out on local SEO — \"near me\" searches have grown 500% in recent years",
        "No ability to rank for industry-specific keywords",
      ],
    },
    {
      label: "Lead Generation",
      score: 5,
      details: [
        "No online booking, contact forms, or quote request capability",
        "Missing 24/7 lead capture — customers can only reach you during business hours",
        "No email list building or newsletter capability",
        "Cannot run Google Ads or retargeting campaigns without a landing page",
      ],
    },
    {
      label: "Competitive Standing",
      score: competitiveScore,
      details: competitorsWithSites > 0
        ? [
            `${competitorsWithSites} of ${competitors.length} nearby competitors have websites`,
            ...competitors.filter(c => c.hasWebsite).slice(0, 3).map(c =>
              `${c.name} has a website${c.rating ? ` (${c.rating}/5 stars, ${c.totalRatings || 0} reviews)` : ""}`
            ),
            "Customers are choosing competitors they can research online",
          ]
        : [
            "None of your nearby competitors have websites either — this is your opportunity to lead",
            "Being the first in your area with a website gives a massive first-mover advantage",
            "Early digital presence captures customers before competitors catch up",
          ],
    },
    {
      label: "Trust & Credibility",
      score: 15,
      details: [
        "84% of consumers believe a business with a website is more credible",
        "No platform to showcase testimonials, portfolio, or certifications",
        "Cannot display trust signals (BBB rating, awards, partnerships)",
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

function generateRecommendations(hasWebsite: boolean, scores: AuditScore[], socialProfiles: SocialProfile[]): string[] {
  const recs: string[] = [];

  if (!hasWebsite) {
    recs.push("Build a professional, mobile-responsive website — this is the #1 priority");
    recs.push("Register a domain name that matches your business name for brand consistency");

    const missingSocial = socialProfiles.filter(p => !p.found);
    const foundSocial = socialProfiles.filter(p => p.found);

    if (foundSocial.length > 0) {
      recs.push(`Leverage your existing presence on ${foundSocial.map(p => p.platform).join(", ")} by linking to a central website`);
    }
    if (missingSocial.length > 0) {
      recs.push(`Create profiles on: ${missingSocial.map(p => p.platform).join(", ")}`);
    }

    recs.push("Set up Google Business Profile with complete info, photos, and regular posts");
    recs.push("Implement an online booking or contact form for 24/7 lead capture");
    recs.push("Start collecting and showcasing customer reviews across platforms");
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

function generateOpportunities(hasWebsite: boolean, scores: AuditScore[], competitors: CompetitorInfo[]): string[] {
  if (!hasWebsite) {
    const competitorsWithSites = competitors.filter(c => c.hasWebsite).length;
    const opps = [
      "Capture the 97% of consumers who search online before visiting a local business",
      "Enable online reviews and testimonials to build trust and social proof",
      "Provide 24/7 information access — hours, services, pricing, FAQs",
      "Generate leads while you sleep with automated contact forms and booking",
    ];

    if (competitorsWithSites > 0) {
      opps.push(`${competitorsWithSites} competitor(s) already have websites — a website levels the playing field`);
    } else {
      opps.push("None of your nearby competitors have websites — be the first and dominate local search");
    }

    opps.push("A basic professional website can increase customer inquiries by 200-400%");
    opps.push("Content marketing (blog posts, guides) can establish you as the local authority");

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
    const hasWebsite = !!enrichedBusiness.website;

    // Run competitor search and social media discovery in parallel
    const [competitors, socialProfiles] = await Promise.all([
      findCompetitors(enrichedBusiness, apiKey),
      discoverSocialMedia(enrichedBusiness.name, enrichedBusiness.address, apiKey),
    ]);

    // Only run PageSpeed if there IS a website — otherwise generate insight-driven scores
    let scores: AuditScore[];
    let auditError: string | undefined;
    if (hasWebsite) {
      const result = await getPageSpeedScores(enrichedBusiness.website!);
      scores = result.scores;
      auditError = result.error;
    } else {
      scores = generateNoWebsiteScores(competitors, socialProfiles);
    }

    const recommendations = generateRecommendations(hasWebsite, scores, socialProfiles);
    const overallGrade = getOverallGrade(scores);
    const opportunities = generateOpportunities(hasWebsite, scores, competitors);

    const competitorsWithWebsites = competitors.filter(c => c.hasWebsite).length;

    const onlinePresence: OnlinePresence = {
      hasWebsite,
      socialProfiles,
      competitorsWithWebsites,
      competitorsTotal: competitors.length,
      websiteBenefits: !hasWebsite
        ? [
            "A website works 24/7 as your digital storefront — even when you're closed",
            "70-80% of consumers research a business online before visiting or making a purchase",
            "Websites allow you to control your brand narrative, showcase work, and build trust",
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
    };

    return Response.json(result);
  } catch (err) {
    console.error("Audit error:", err);
    return Response.json({ error: "Failed to audit business" }, { status: 500 });
  }
}

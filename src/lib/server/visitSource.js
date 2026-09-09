const SITE_HOSTS = ["zik-music.fr", "www.zik-music.fr", "localhost"];

// Regroupe les nombreux domaines d'un même canal sous une seule étiquette.
const HOST_GROUPS = [
  [/(^|\.)reddit\.com$|(^|\.)redd\.it$/, "reddit", "social"],
  [/(^|\.)google\./, "google", "search"],
  [/(^|\.)bing\.com$/, "bing", "search"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo", "search"],
  [
    /(^|\.)ecosia\.org$|(^|\.)qwant\.com$|(^|\.)yahoo\./,
    "autre-moteur",
    "search",
  ],
  [/(^|\.)discord\.com$|(^|\.)discordapp\.com$/, "discord", "social"],
  [/(^|\.)tiktok\.com$/, "tiktok", "social"],
  [/(^|\.)instagram\.com$/, "instagram", "social"],
  [
    /(^|\.)facebook\.com$|(^|\.)messenger\.com$|(^|\.)fb\.me$/,
    "facebook",
    "social",
  ],
  [/(^|\.)x\.com$|(^|\.)twitter\.com$|(^|\.)t\.co$/, "twitter", "social"],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "youtube", "social"],
  [/(^|\.)twitch\.tv$/, "twitch", "social"],
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, "linkedin", "social"],
  [/(^|\.)whatsapp\.com$/, "whatsapp", "messaging"],
  [/(^|\.)snapchat\.com$/, "snapchat", "messaging"],
  [/(^|\.)telegram\.(org|me)$|(^|\.)t\.me$/, "telegram", "messaging"],
  [/(^|\.)producthunt\.com$/, "producthunt", "referral"],
  [/(^|\.)news\.ycombinator\.com$/, "hackernews", "referral"],
];

// Chemins qui ne correspondent pas à une arrivée de visiteur.
const IGNORED_PREFIXES = [
  "/api/",
  "/admin",
  "/sitemap.xml",
  "/robots.txt",
  "/llms.txt",
];

const BOT_RE =
  /bot|crawl|spider|slurp|preview|fetch|monitor|lighthouse|headless|curl|wget/i;

function hostOf(referrer) {
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function groupFor(host) {
  const match = HOST_GROUPS.find(([re]) => re.test(host));
  if (match) return { source: match[1], medium: match[2] };
  return { source: host.replace(/^www\./, ""), medium: "referral" };
}

function clean(value, max = 120) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase().slice(0, max);
  return trimmed || null;
}

/**
 * Traduit un referrer et des paramètres utm en canal d'acquisition.
 * Les utm priment : ce sont eux qu'on maîtrise dans les liens qu'on diffuse.
 */
export function resolveSource(referrer, searchParams) {
  const utmSource = clean(searchParams?.get("utm_source"));
  const utmMedium = clean(searchParams?.get("utm_medium"));
  const campaign = clean(searchParams?.get("utm_campaign"));

  if (utmSource) {
    return { source: utmSource, medium: utmMedium ?? "campagne", campaign };
  }

  const host = referrer ? hostOf(referrer) : null;
  if (!host || SITE_HOSTS.includes(host)) {
    return { source: "direct", medium: "direct", campaign };
  }

  return { ...groupFor(host), campaign, referrerHost: host };
}

/**
 * Une visite n'est retenue que si elle ressemble à une vraie arrivée :
 * une page du site, demandée en GET par autre chose qu'un robot.
 */
export function isTrackableVisit({ method, pathname, userAgent, accept }) {
  if (method !== "GET") return false;
  if (IGNORED_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  if (/\.[a-z0-9]{2,5}$/i.test(pathname)) return false;
  if (!accept?.includes("text/html")) return false;
  if (!userAgent || BOT_RE.test(userAgent)) return false;
  return true;
}

export function buildVisitRow(event) {
  const { source, medium, campaign, referrerHost } = resolveSource(
    event.request.headers.get("referer"),
    event.url.searchParams,
  );
  return {
    source,
    medium,
    campaign,
    referrer_host: referrerHost ?? null,
    landing_path: event.url.pathname.slice(0, 200),
  };
}

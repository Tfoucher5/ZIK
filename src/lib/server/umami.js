// Client API Umami self-host : login → token Bearer, re-login sur 401.
let _token = null;

const cfg = () => ({
  url: process.env.UMAMI_API_URL,
  siteId: process.env.UMAMI_WEBSITE_ID,
  user: process.env.UMAMI_USER,
  pass: process.env.UMAMI_PASS,
});

export function isUmamiConfigured() {
  const c = cfg();
  return Boolean(c.url && c.siteId && c.user && c.pass);
}

async function login() {
  const c = cfg();
  const r = await fetch(`${c.url}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: c.user, password: c.pass }),
  });
  if (!r.ok) throw new Error(`Umami login ${r.status}`);
  _token = (await r.json()).token;
}

async function api(path, params) {
  const c = cfg();
  const qs = new URLSearchParams(params).toString();
  const call = () =>
    fetch(`${c.url}/api/websites/${c.siteId}${path}?${qs}`, {
      headers: { Authorization: `Bearer ${_token}` },
    });
  if (!_token) await login();
  let r = await call();
  if (r.status === 401) {
    await login();
    r = await call();
  }
  if (!r.ok) throw new Error(`Umami ${path} ${r.status}`);
  return r.json();
}

export async function getUmamiData(days) {
  if (!isUmamiConfigured()) return null;
  const DAY = 86_400_000;
  const now = Date.now();
  const start = now - days * DAY;
  const start7 = now - 7 * DAY;
  const start14 = now - 14 * DAY;
  try {
    const [series, statsNow, statsPrev, referrers, pages] = await Promise.all([
      api("/pageviews", {
        startAt: start,
        endAt: now,
        unit: "day",
        timezone: "Europe/Paris",
      }),
      api("/stats", { startAt: start7, endAt: now }),
      api("/stats", { startAt: start14, endAt: start7 }),
      api("/metrics", {
        startAt: start7,
        endAt: now,
        type: "referrer",
        limit: 8,
      }),
      api("/metrics", { startAt: start7, endAt: now, type: "url", limit: 8 }),
    ]);
    const num = (v) => (typeof v === "object" ? (v?.value ?? 0) : (v ?? 0));
    return {
      visitors: series.sessions ?? [],
      pageviews7d: num(statsNow.pageviews),
      visitors7d: num(statsNow.visitors),
      visitors7dPrev: num(statsPrev.visitors),
      referrers,
      pages,
    };
  } catch (e) {
    console.error("[umami]", e.message);
    return null;
  }
}

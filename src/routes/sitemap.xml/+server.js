import { supabase } from "$lib/server/config.js";
import { BLIND_TEST_THEMES } from "$lib/blindTestThemes.js";

const SITE = "https://www.zik-music.fr";

/* `lastmod` : seules les pages dont le contenu bouge réellement chaque jour
   (rooms, classements, jeux quotidiens) le laissent vide et héritent de la date
   du jour. Les pages éditoriales portent leur vraie date de dernière modif, en
   dur. Un lastmod qui change tous les jours sans changement réel finit par être
   ignoré par Google — autant ne pas l'envoyer. À mettre à jour quand on édite
   une de ces pages. */
const STATIC_PAGES = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/rooms", changefreq: "hourly", priority: "0.9" },
  { loc: "/zikle", changefreq: "daily", priority: "0.9" },
  { loc: "/zikle/archives", changefreq: "daily", priority: "0.6" },
  { loc: "/classements", changefreq: "daily", priority: "0.7" },
  { loc: "/defi", changefreq: "daily", priority: "0.7" },
  {
    loc: "/playlists",
    changefreq: "weekly",
    priority: "0.7",
    lastmod: "2026-10-03",
  },
  {
    loc: "/defi/archives",
    changefreq: "weekly",
    priority: "0.5",
    lastmod: "2026-08-13",
  },
  {
    loc: "/salon",
    changefreq: "weekly",
    priority: "1.0",
    lastmod: "2026-10-02",
  },
  { loc: "/pro", changefreq: "weekly", priority: "0.9", lastmod: "2026-10-02" },
  {
    loc: "/docs",
    changefreq: "monthly",
    priority: "0.6",
    lastmod: "2026-10-02",
  },
  {
    loc: "/nouveautes",
    changefreq: "weekly",
    priority: "0.5",
    lastmod: "2026-10-03",
  },
  {
    loc: "/soutenir",
    changefreq: "monthly",
    priority: "0.4",
    lastmod: "2026-10-03",
  },
  {
    loc: "/vs/kahoot",
    changefreq: "monthly",
    priority: "0.6",
    lastmod: "2026-10-03",
  },
  {
    loc: "/vs/blinest",
    changefreq: "monthly",
    priority: "0.6",
    lastmod: "2026-10-03",
  },
  {
    loc: "/vs/blindtest-io",
    changefreq: "monthly",
    priority: "0.6",
    lastmod: "2026-10-03",
  },
  { loc: "/cgu", changefreq: "yearly", priority: "0.2", lastmod: "2026-09-30" },
  { loc: "/cgv", changefreq: "yearly", priority: "0.2", lastmod: "2026-09-30" },
  {
    loc: "/confidentialite",
    changefreq: "yearly",
    priority: "0.2",
    lastmod: "2026-09-30",
  },
  {
    loc: "/mentions-legales",
    changefreq: "yearly",
    priority: "0.2",
    lastmod: "2026-09-30",
  },
];

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const urls = [
    ...STATIC_PAGES,
    {
      loc: "/blind-test",
      changefreq: "weekly",
      priority: "0.8",
      lastmod: "2026-10-03",
    },
    ...BLIND_TEST_THEMES.map((t) => ({
      loc: `/blind-test/${t.slug}`,
      changefreq: "monthly",
      priority: "0.8",
      lastmod: "2026-09-30",
    })),
  ];

  // `rooms` n'a pas de colonne updated_at : le lastmod vient de last_active_at.
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("code, last_active_at")
    .eq("is_public", true)
    .eq("is_official", true)
    .order("last_active_at", { ascending: false })
    .limit(200);

  if (roomsError) console.error("[sitemap] rooms:", roomsError.message);

  for (const room of rooms ?? []) {
    urls.push({
      loc: `/room/${room.code}`,
      changefreq: "daily",
      priority: "0.5",
      lastmod: room.last_active_at
        ? room.last_active_at.slice(0, 10)
        : undefined,
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(SITE + u.loc)}</loc>
    <lastmod>${u.lastmod ?? today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

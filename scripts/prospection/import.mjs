// Remplit la table prospects depuis OpenStreetMap (données libres, licence ODbL).
// Usage : node scripts/prospection/import.mjs
// Sans effet sur les lieux déjà présents : relançable pour récupérer les nouveaux.
import { db, sleep } from "./lib.mjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const ASSO_NAME = "f[eê]te|comit[eé]|animation|loisir|foyer|amicale|festi";

const QUERIES = {
  bar: `nwr["amenity"~"^(bar|pub)$"]["email"](area.fr);nwr["amenity"~"^(bar|pub)$"]["contact:email"](area.fr);`,
  camping: `nwr["tourism"="camp_site"]["email"](area.fr);nwr["tourism"="camp_site"]["contact:email"](area.fr);`,
  association: `nwr["office"="association"]["name"~"${ASSO_NAME}",i]["email"](area.fr);nwr["office"="association"]["name"~"${ASSO_NAME}",i]["contact:email"](area.fr);`,
};

// Serveur public et gratuit : il refuse les requêtes trop rapprochées (429)
async function overpass(body, attempt = 1) {
  const query = `[out:json][timeout:180];area["ISO3166-1"="FR"][admin_level=2]->.fr;(${body});out tags;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "User-Agent": "ZIK-prospection/1.0 (theo@zik-music.fr)",
    },
    body: new URLSearchParams({ data: query }),
  });
  if ((res.status === 429 || res.status === 504) && attempt < 6) {
    await sleep(attempt * 30_000);
    return overpass(body, attempt + 1);
  }
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  return (await res.json()).elements;
}

function toRow(kind, el) {
  const t = el.tags ?? {};
  const email = (t.email || t["contact:email"] || "")
    .split(/[;,\s]/)[0]
    .trim()
    .toLowerCase();
  if (!t.name || !EMAIL_RE.test(email)) return null;
  return {
    osm_id: `${el.type}/${el.id}`,
    kind,
    name: t.name.trim().slice(0, 120),
    email,
    website: t.website || t["contact:website"] || null,
    city: t["addr:city"] || null,
    postcode: t["addr:postcode"] || null,
  };
}

const sb = db();
for (const [kind, body] of Object.entries(QUERIES)) {
  const seen = new Set();
  const rows = (await overpass(body))
    .map((el) => toRow(kind, el))
    .filter((r) => r && !seen.has(r.email) && seen.add(r.email));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb
      .from("prospects")
      .upsert(rows.slice(i, i + 500), {
        onConflict: "email",
        ignoreDuplicates: true,
      });
    if (error) throw error;
  }
  console.log(`${kind} : ${rows.length} lieux avec e-mail`);
}
const { count } = await sb
  .from("prospects")
  .select("*", { count: "exact", head: true });
console.log(`Total en base : ${count}`);

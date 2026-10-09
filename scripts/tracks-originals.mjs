// Aligne les titres du catalogue sur leur version originale Deezer (celle de
// leur carte) : titre et artiste officiels, identifiant Deezer de l'original,
// pochette de l'album de l'original.
//
// Usage : node scripts/tracks-originals.mjs           → rapport, aucune écriture
//         node scripts/tracks-originals.mjs --apply   → applique les changements
//
// Les surcharges propres à une playlist (custom_title, custom_artist…) ne sont
// pas touchées. Un titre dont la version originale existe déjà comme autre
// ligne du catalogue n'est pas renommé (doublon à fusionner à part).
import { getAdminClient } from "../src/lib/server/config.js";

const apply = process.argv.includes("--apply");
const sb = getAdminClient();

const normKey = (artist, title) =>
  `${String(artist).trim().toLowerCase()}|${String(title).trim().toLowerCase()}`;

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb
    .from("tracks")
    .select(
      "id, artist, title, norm_key, external_id, source, cover_url, cards(title, artist, deezer_track_id, card_albums(cover_url))",
    )
    .not("card_id", "is", null)
    .order("id")
    .range(from, from + 999);
  if (error) throw error;
  if (!data.length) break;
  rows.push(...data);
}

const existingKeys = new Set();
for (let from = 0; ; from += 1000) {
  const { data } = await sb
    .from("tracks")
    .select("norm_key")
    .range(from, from + 999);
  if (!data?.length) break;
  data.forEach((r) => existingKeys.add(r.norm_key));
}

const changes = [];
const collisions = [];
const claimed = new Set();
for (const t of rows) {
  const card = t.cards;
  const title = card.title;
  const artist = card.artist;
  const key = normKey(artist, title);
  const renamed = t.title !== title || t.artist !== artist;
  const relinked =
    t.source !== "deezer" ||
    String(t.external_id) !== String(card.deezer_track_id);
  if (!renamed && !relinked) continue;

  if (key !== t.norm_key && (existingKeys.has(key) || claimed.has(key))) {
    collisions.push(t);
    continue;
  }
  claimed.add(key);
  changes.push({
    track: t,
    renamed,
    patch: {
      artist,
      title,
      source: "deezer",
      external_id: String(card.deezer_track_id),
      cover_url: card.card_albums?.cover_url || t.cover_url,
      // L'extrait est recherché de nouveau, cette fois pour l'original
      ...(relinked ? { preview_url: null, preview_expires_at: null } : {}),
    },
  });
}

const renamed = changes.filter((c) => c.renamed);
console.log(`Titres avec une carte : ${rows.length}`);
console.log(`À aligner : ${changes.length} (dont ${renamed.length} renommés)`);
console.log(
  `Doublons (original déjà au catalogue, non touchés) : ${collisions.length}`,
);
console.log("\nExemples de renommage :");
for (const c of renamed.slice(0, 40))
  console.log(
    `  ${c.track.artist} - ${c.track.title}  →  ${c.patch.artist} - ${c.patch.title}`,
  );
console.log("\nExemples de doublons :");
for (const t of collisions.slice(0, 15))
  console.log(
    `  ${t.artist} - ${t.title}  →  ${t.cards.artist} - ${t.cards.title}`,
  );

if (!apply) {
  console.log("\nRapport seulement. Relance avec --apply pour écrire.");
  process.exit(0);
}

let done = 0;
for (const c of changes) {
  const { error } = await sb
    .from("tracks")
    .update(c.patch)
    .eq("id", c.track.id);
  if (error) console.error(`${c.track.id} :`, error.message);
  else done++;
}
console.log(`\n${done} titres alignés sur leur version originale.`);
process.exit(0);

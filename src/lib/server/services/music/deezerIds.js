import { getAdminClient } from "../../config.js";
import { deezerIdMatch } from "./deezer.js";
import { deezerIdOf } from "../../../shared/playlist/deezerId.js";

// Complète l'identifiant Deezer des titres qui n'en ont pas (import Spotify,
// YouTube, collage), par lots, depuis Admin › Réglages. Rapprochement strict
// sur l'artiste, le titre et la version : un titre douteux reste sans id.
const LOT = 200;
const PARALLELE = 5;

const tracks = () => getAdminClient().schema("catalog").from("tracks");

export async function remaining() {
  const { count, error } = await tracks()
    .select("id", { count: "exact", head: true })
    .is("deezer_id", null)
    .is("deezer_checked_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function fillDeezerIds() {
  const { data, error } = await tracks()
    .select("id, artist, title, external_id")
    .is("deezer_id", null)
    .is("deezer_checked_at", null)
    .order("created_at")
    .limit(LOT);
  if (error) throw new Error(error.message);
  let checked = 0;
  let found = 0;
  let failed = 0;
  // shortcut: une écriture par titre (200 au plus), à grouper si le lot grossit
  for (let i = 0; i < data.length && !failed; i += PARALLELE) {
    await Promise.all(
      data.slice(i, i + PARALLELE).map(async (t) => {
        let id = deezerIdOf(t);
        try {
          id ??= await deezerIdMatch(t.artist, t.title);
        } catch {
          // Deezer indisponible : lot arrêté, le titre sera repris
          failed++;
          return;
        }
        const { error: e } = await tracks()
          .update({
            deezer_id: id,
            deezer_checked_at: new Date().toISOString(),
          })
          .eq("id", t.id);
        if (e) return failed++;
        checked++;
        if (id) found++;
      }),
    );
  }
  const left = await remaining().catch(() => null);
  return { checked, found, failed, left };
}

import { getAdminClient } from "../../config.js";

// Interrupteurs des sources du son des soirées (admin › Réglages). Couper une
// source ne redéploie rien : les parties passent à l'autre au titre suivant.
// Cache sur globalThis : la page admin (bundle) et les sockets (src/) chargent
// chacune leur copie de ce module dans le même process.
const DEFAULT_SOURCES = { youtube: true, deezer: true };
const TTL = 60_000;

const etat = (globalThis.__zik_mediaSources ??= {
  value: DEFAULT_SOURCES,
  at: 0,
  loading: null,
});

const normalise = (v) => ({
  youtube: v?.youtube !== false,
  deezer: v?.deezer !== false,
});

async function load() {
  try {
    const { data, error } = await getAdminClient()
      .schema("ops")
      .from("site_settings")
      .select("value")
      .eq("key", "media_sources")
      .maybeSingle();
    // Base injoignable : on garde la dernière valeur connue
    if (!error) etat.value = normalise(data?.value);
  } catch {
    // idem
  }
  etat.at = Date.now();
}

// Lecture sans attente, dans le chemin d'une manche : la valeur en cache, et
// un rafraîchissement en fond quand elle a plus d'une minute
export function sources() {
  if (Date.now() - etat.at >= TTL && !etat.loading)
    etat.loading = load().finally(() => (etat.loading = null));
  return etat.value;
}

// Au démarrage du serveur et pour la page admin : valeur relue en base
export async function getSources() {
  sources();
  if (etat.loading) await etat.loading;
  return etat.value;
}

export async function setSources(choix) {
  const value = normalise(choix);
  const { error } = await getAdminClient()
    .schema("ops")
    .from("site_settings")
    .upsert(
      { key: "media_sources", value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
  etat.value = value;
  etat.at = Date.now();
  return value;
}

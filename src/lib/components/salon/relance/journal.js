// Journal des plantages des écrans du salon : un envoi par plantage, sans
// pseudo, clé de régie ni jeton du joueur
let noted = null;
let lastSent = null;
const CODE = /^[A-Z0-9]{4,12}$/;

export function noteCrash(error) {
  noted = error;
}

const texte = (v) => {
  try {
    return typeof v === "string" ? v : String(v ?? "");
  } catch {
    return "";
  }
};

const echappe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Mots entiers seulement : un pseudo de 2 lettres ne hache pas la pile
export function redact(text, secrets = []) {
  let out = texte(text).replace(/\?[^\s)'":]*/g, "");
  for (const s of secrets)
    if (typeof s === "string" && s.length >= 2)
      out = out.replace(
        new RegExp(
          `(?<![\\p{L}\\p{N}_])${echappe(s)}(?![\\p{L}\\p{N}_])`,
          "gu",
        ),
        "…",
      );
  return out;
}

// Valeurs connues du navigateur qui ne doivent jamais partir
export function knownSecrets(local, search) {
  const out = [];
  try {
    const s = local ?? localStorage;
    out.push(s.getItem("salon_user"));
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith("zik_salon_player_") || k?.startsWith("zik_salon_key_"))
        out.push(s.getItem(k));
    }
  } catch {
    /* stockage indisponible */
  }
  try {
    const q = new URLSearchParams(search ?? location.search);
    for (const [, v] of q) out.push(v);
  } catch {
    /* adresse illisible */
  }
  return out.filter(Boolean).sort((a, b) => b.length - a.length);
}

export function sendCrash({ ecran, code, essai, version, error }, deps = {}) {
  try {
    const err = noted ?? error;
    noted = null;
    if (err && err === lastSent) return false;
    lastSent = err ?? null;
    const secrets = knownSecrets(deps.local, deps.search);
    const body = {
      ecran,
      ...(typeof code === "string" && CODE.test(code) && { code }),
      essai,
      message: redact(err?.message ?? err, secrets).slice(0, 300),
      pile: redact(err?.stack, secrets).slice(0, 1500),
      version: texte(version).slice(0, 40),
    };
    const fetchFn = deps.fetch ?? fetch;
    Promise.resolve(
      fetchFn("/api/salon/crash", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      }),
    ).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

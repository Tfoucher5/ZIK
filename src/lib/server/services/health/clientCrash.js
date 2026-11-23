import { checkRateLimit } from "../../middleware/auth.js";
import { validate, str, int, optional } from "../../socket/safe.js";

const ECRANS = new Set(["host", "regie", "play"]);
const CODE = /^[A-Z0-9]{4,12}$/;
const TROP = "Trop de signalements, réessaie dans un instant.";
// Plantage d'un navigateur : dans ops.errors, hors de la sonde « Erreurs serveur »
export const PREFIXE_ECRAN = "[ecran-salon]";

const SCHEMA = {
  ecran: (v) => (ECRANS.has(v) ? v : undefined),
  code: optional((v) =>
    typeof v === "string" && CODE.test(v) ? v : undefined,
  ),
  essai: int(1, 10_000),
  message: str(20_000),
  pile: optional(str(50_000)),
  version: optional(str(1_000)),
};

const uneLigne = (s, max) =>
  s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ")
    .trim()
    .slice(0, max);

// Indentée : une pile ne peut pas imiter une ligne de journal
const pileIndentee = (s) =>
  s
    .slice(0, 1500)
    .split(/\r\n|[\r\n\u2028\u2029]/)
    .map((l) => `    ${uneLigne(l, 1500)}`)
    .join("\n");

/** Note le plantage d'un écran du salon dans le journal (ops.errors). Lève 429 au-delà du débit. */
export function recordClientCrash(payload, { ip, userAgent }) {
  checkRateLimit(`crash:${ip}`, 6, 60_000, TROP);
  const d = validate(SCHEMA, payload);
  if (!d) return false;
  checkRateLimit("crash:*", 20, 60_000, TROP);

  const lignes = [
    `${PREFIXE_ECRAN} ${d.ecran} ${d.code ?? "-"} essai ${d.essai} : ${uneLigne(d.message, 300)}`,
  ];
  if (d.pile) lignes.push(pileIndentee(d.pile));
  if (d.version) lignes.push(`    version : ${uneLigne(d.version, 40)}`);
  lignes.push(`    navigateur : ${uneLigne(String(userAgent ?? ""), 200)}`);
  console.error(lignes.join("\n"));
  return true;
}

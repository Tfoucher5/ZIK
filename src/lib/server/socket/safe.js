// Enregistrement des handlers Socket.io : payload validé, exception attrapée.
// Une exception non attrapée dans un handler fait tomber le process, donc
// toutes les soirées en cours.

const MAX_STRING = 500;

export const str =
  (max = MAX_STRING) =>
  (v) =>
    typeof v === "string" && v.length <= max ? v : undefined;
// Pseudo, code… servent de clé d'objet : « constructor » ou « __proto__ »
// tomberaient sur Object.prototype
export const key = (max) => (v) =>
  str(max)(v) !== undefined && !(v in Object.prototype) ? v : undefined;
export const int = (min, max) => (v) =>
  Number.isInteger(v) && v >= min && v <= max ? v : undefined;
export const num = (min, max) => (v) =>
  Number.isFinite(v) && v >= min && v <= max ? v : undefined;
export const bool = () => (v) => (typeof v === "boolean" ? v : undefined);
export const optional = (check) => (v) => (v == null ? null : check(v));
const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);
export const object =
  (maxKeys = 20) =>
  (v) =>
    isPlainObject(v) && Object.keys(v).length <= maxKeys ? v : undefined;

// Schéma objet : chaque champ vérifié, un champ invalide fait tout échouer.
// Schéma fonction : pour un payload qui n'est pas un objet (texte, jeton).
// Schéma vide : payload ignoré (événement sans données, disconnect).
export function validate(schema, payload) {
  if (typeof schema === "function") return schema(payload) ?? null;
  const entries = Object.entries(schema);
  if (!entries.length) return {};
  if (!isPlainObject(payload)) return null;
  const out = {};
  for (const [name, check] of entries) {
    const value = check(payload[name]);
    if (value === undefined) return null;
    out[name] = value;
  }
  return out;
}

export function safe(socket, name, schema, fn) {
  socket.on(name, async (payload, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    const data = validate(schema, payload);
    if (data === null) return;
    try {
      await fn(data, reply);
    } catch (err) {
      console.error(`[socket] ${name}`, err?.stack ?? err);
    }
  });
}

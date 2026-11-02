# Gabarit `safe()` et validation

À placer dans `src/lib/server/socket/safe.js`. La validation reste sans dépendance : de petits helpers suffisent pour les payloads de ZIK, et on évite une bibliothèque de plus.

```js
const MAX_STRING = 500;

export const str =
  (max = MAX_STRING) =>
  (v) =>
    typeof v === "string" && v.length <= max ? v : undefined;
export const int = (min, max) => (v) =>
  Number.isInteger(v) && v >= min && v <= max ? v : undefined;
export const oneOf =
  (...values) =>
  (v) =>
    values.includes(v) ? v : undefined;
export const bool = () => (v) => (typeof v === "boolean" ? v : undefined);
export const optional = (check) => (v) => (v === undefined ? null : check(v));

// Retourne l'objet validé, ou null si un champ est invalide.
// Un champ optional() absent vaut null ; un champ requis invalide fait tout échouer.
export function validate(schema, payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload))
    return null;
  const out = {};
  for (const [key, check] of Object.entries(schema)) {
    const value = check(payload[key]);
    if (value === undefined) return null;
    out[key] = value;
  }
  return out;
}

export function safe(socket, name, schema, fn) {
  socket.on(name, async (payload, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    const data = validate(schema, payload ?? {});
    if (!data) return;
    try {
      await fn(data, reply);
    } catch (err) {
      console.error(`[socket] ${name}`, err?.stack ?? err);
    }
  });
}
```

Usage :

```js
import { safe, str } from "../safe.js";

safe(socket, "salon_submit_guess", { guess: str(100) }, ({ guess }) => {
  // guess est forcément une chaîne de 100 caractères au plus
});
```

Et dans `server.js`, en dernier filet, tant que l'état vit en mémoire :

```js
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err?.stack ?? err);
});
```

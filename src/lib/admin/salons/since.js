import { ago } from "../stats-utils.js";

/** « depuis 3 min », ou « à l'instant ». */
export function since(ms) {
  const a = ago(new Date(ms).toISOString());
  return a.startsWith("il y a ") ? `depuis ${a.slice(7)}` : a;
}

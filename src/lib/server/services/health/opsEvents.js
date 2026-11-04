import { opsEvents } from "../../state.js";

// Ce qui s'est passé récemment (mails, webhooks, sauvegardes), relu par les sondes
const KEEP_MS = 24 * 60 * 60 * 1000;
const KEEP_MAX = 2000;

export function noteEvent(name, now = Date.now()) {
  const list = (opsEvents[name] ??= []);
  list.push(now);
  while (list.length > KEEP_MAX || now - list[0] > KEEP_MS) list.shift();
}

export function countSince(name, ms, now = Date.now()) {
  return (opsEvents[name] ?? []).filter((t) => now - t <= ms).length;
}

export function resetOpsEvents() {
  for (const k of Object.keys(opsEvents)) delete opsEvents[k];
}

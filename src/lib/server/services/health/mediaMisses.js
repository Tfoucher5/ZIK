// Titres qui n'ont pas pu être joués en salon (ni vidéo ni extrait). La règle
// « titres sans média » aurait détecté l'incident du 30/10 dès 22h34.
const misses = [];
const KEEP_MS = 10 * 60 * 1000;

export function noteMediaMiss(now = Date.now()) {
  misses.push(now);
  while (misses.length && now - misses[0] > KEEP_MS) misses.shift();
}

export function mediaMissesSince(ms, now = Date.now()) {
  return misses.filter((t) => now - t <= ms).length;
}

export function resetMediaMisses() {
  misses.length = 0;
}

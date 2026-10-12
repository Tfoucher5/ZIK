// Valeur gardée en mémoire ttlMs millisecondes
export function makeCache(ttlMs) {
  let data = null;
  let expires = 0;
  return {
    get() {
      return expires > Date.now() ? data : null;
    },
    set(v) {
      data = v;
      expires = Date.now() + ttlMs;
    },
  };
}

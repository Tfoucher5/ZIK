// Sections épinglées de /soiree : chaque section dessine un état pur render(p)
// pour une progression 0 → 1, que GSAP fait avancer au scroll (DESIGN.md v2).

export const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
export const ease = (t) => 1 - Math.pow(1 - t, 3);
export const pad = (n) => String(n).padStart(2, "0");
/** Indice du temps en cours : nombre de seuils déjà franchis. */
export const stage = (p, cuts) => cuts.filter((c) => p >= c).length;
/** Les `n` premiers caractères de `s`, à mesure que p va de a à b. */
export const typed = (p, s, a, b) =>
  s.slice(0, Math.round(seg(p, a, b) * s.length));

export const ROSE = "#ff4f9a";
export const BLEU = "#5bc0eb";
// Motif fixe du faux QR code des mockups (9 × 9)
export const QR = [
  ..."111111101100000101101110101101110101100000101111111010000000000110101011011010111",
].map((c) => c === "1");

/** Registre des sections, rempli par Pin.svelte et la frise avant le montage. */
export function pinRegistry() {
  const list = [];
  return {
    list,
    live: false,
    add(entry) {
      list.push(entry);
      return () => list.splice(list.indexOf(entry), 1);
    },
  };
}

/**
 * Charge GSAP à la demande et branche chaque section sur le scroll.
 * Entrée : { el, len, set(p), loose? } ; `loose` = élément suivi sans épinglage
 * sur téléphone. Renvoie la fonction qui tue tous les ScrollTrigger.
 */
export async function mountPins(reg) {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const byPage = [...reg.list].sort((a, b) =>
    a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1,
  );
  const mm = gsap.matchMedia();
  mm.add(
    { d: "(min-width: 900px)", m: "(max-width: 899px)" },
    ({ conditions }) => {
      for (const e of byPage) {
        const o = { p: 0 };
        e.set(0);
        const scrollTrigger =
          e.loose && !conditions.d
            ? { trigger: e.loose, start: "top 70%", end: "bottom 60%" }
            : {
                trigger: e.el,
                start: "top top",
                end: () => "+=" + innerHeight * e.len,
                pin: true,
                anticipatePin: 1,
                invalidateOnRefresh: true,
              };
        gsap.to(o, {
          p: 1,
          ease: "none",
          onUpdate: () => e.set(o.p),
          scrollTrigger: { ...scrollTrigger, scrub: 0.5 },
        });
      }
    },
  );
  // Les espaces d'épinglage allongent la page : positions recalculées tout de suite
  ScrollTrigger.refresh();
  reg.st = ScrollTrigger;
  reg.live = true;
  return () => {
    reg.live = false;
    mm.revert();
  };
}

/**
 * Remet la page à sa place une fois les espaces d'épinglage créés : la position
 * d'un retour arrière (y), sinon l'ancre de l'adresse. Sans eux, la page plus
 * courte a ramené le scroll en haut. Avec `st` (ScrollTrigger), la cible est
 * reposée à chaque recalcul pendant 5 s. Renvoie la fonction qui arrête tout.
 */
export function replacer(y, hash, st) {
  let id = "";
  try {
    id = hash ? decodeURIComponent(hash.slice(1)) : "";
  } catch {
    /* ancre mal formée : rien à viser */
  }
  const poser = () =>
    y != null
      ? scrollTo({ top: y, behavior: "instant" })
      : document.getElementById(id)?.scrollIntoView({ behavior: "instant" });
  poser();
  if (!st || (y == null && !id)) return () => {};
  // Images et vidéos chargées après coup relancent l'épinglage et décalent la
  // page : on repose la cible tant que le visiteur n'a pas bougé lui-même
  const gestes = ["wheel", "touchstart", "keydown", "pointerdown"];
  const fin = () => {
    st.removeEventListener("refresh", poser);
    gestes.forEach((g) => removeEventListener(g, fin));
    clearTimeout(t);
  };
  st.addEventListener("refresh", poser);
  gestes.forEach((g) =>
    addEventListener(g, fin, { once: true, passive: true }),
  );
  const t = setTimeout(fin, 5000);
  return fin;
}

// Régie en 1024 px (deux colonnes, tout sur la ligne), suivie en direct.
// À appeler à l'initialisation d'un composant.
export function ecranLarge() {
  const e = $state({ large: false });
  $effect(() => {
    const mq = matchMedia("(min-width: 900px)");
    const maj = () => (e.large = mq.matches);
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  });
  return e;
}

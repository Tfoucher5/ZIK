// Groupe de boutons role="radio" au clavier (motif ARIA) : un seul arrêt de
// tabulation (le choix coché, sinon le premier), les flèches changent de choix.
const STEP = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

// Index du choix suivant pour une touche, null si la touche ne sert pas
export function nextIndex(count, current, key) {
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  const step = STEP[key];
  if (!step || current < 0) return null;
  return (current + step + count) % count;
}

const radiosOf = (group) => [...group.querySelectorAll('[role="radio"]')];

function rove(group) {
  const radios = radiosOf(group);
  const on =
    radios.find((r) => r.getAttribute("aria-checked") === "true") ?? radios[0];
  for (const r of radios) r.tabIndex = r === on ? 0 : -1;
}

// Attachement Svelte : {@attach radioGroup} sur l'élément role="radiogroup"
export function radioGroup(group) {
  const onKey = (e) => {
    const radios = radiosOf(group);
    const i = nextIndex(radios.length, radios.indexOf(e.target), e.key);
    if (i === null) return;
    e.preventDefault();
    radios[i].focus();
    // Un choix ZIK Pro verrouillé reçoit le focus sans ouvrir l'offre
    if (!radios[i].classList.contains("verrou")) radios[i].click();
  };
  const watch = new MutationObserver(() => rove(group));
  watch.observe(group, {
    subtree: true,
    childList: true,
    attributeFilter: ["aria-checked"],
  });
  rove(group);
  group.addEventListener("keydown", onKey);
  return () => {
    watch.disconnect();
    group.removeEventListener("keydown", onKey);
  };
}

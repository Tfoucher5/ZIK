// Action Svelte : le texte (premier enfant) rétrécit jusqu'à tenir dans sa
// boîte, jamais coupé et jamais sous 28 px sur une TV 1920 × 1080 (1,46em).
export function fit(node) {
  const run = () => {
    node.style.fontSize = "";
    const min =
      parseFloat(getComputedStyle(node.parentElement).fontSize) * 1.46;
    let f = parseFloat(getComputedStyle(node).fontSize);
    while (
      node.firstElementChild.offsetWidth > node.clientWidth + 1 &&
      f > min
    ) {
      f = Math.max(min, f * 0.94);
      node.style.fontSize = `${f}px`;
    }
  };
  const ro = new ResizeObserver(run);
  ro.observe(node.parentElement);
  document.fonts?.ready.then(run);
  return { update: run, destroy: () => ro.disconnect() };
}

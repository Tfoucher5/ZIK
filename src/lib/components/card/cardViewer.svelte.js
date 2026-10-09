// État partagé de la visionneuse : n'importe quelle page appelle openCard()
// sans monter sa propre modale. CardViewer.svelte est monté une seule fois.
export const viewer = $state({ list: [], index: -1, dir: 0 });

export function openCard(card, list) {
  viewer.list = list?.length ? list : [card];
  viewer.index = Math.max(
    0,
    viewer.list.findIndex((c) => c.id === card.id),
  );
  viewer.dir = 0;
}

export function stepCard(delta) {
  const n = viewer.list.length;
  if (n < 2) return;
  viewer.index = (viewer.index + delta + n) % n;
  viewer.dir = delta;
}

export function closeCard() {
  viewer.index = -1;
}

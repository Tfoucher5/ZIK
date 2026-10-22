// Fait apparaître l'élément au scroll (classes .reveal / .visible stylées dans la page).
export function reveal(node) {
  node.classList.add("reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          node.classList.add("visible");
          observer.unobserve(node);
        }
      }
    },
    { threshold: 0.1 },
  );
  observer.observe(node);
  return {
    destroy() {
      observer.disconnect();
    },
  };
}

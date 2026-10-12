export function reveal(node, delay = 0) {
  node.style.setProperty("--rd", `${delay}ms`);
  node.classList.add("will-reveal");
  const io = new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) {
        node.classList.add("revealed");
        io.disconnect();
      }
    },
    { threshold: 0.07, rootMargin: "0px 0px -48px 0px" },
  );
  io.observe(node);
  return { destroy: () => io.disconnect() };
}

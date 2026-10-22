// Inclinaison 3D de l'élément qui suit la souris.
export function tilt(node) {
  let raf;

  function onMove(e) {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const rect = node.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      node.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateZ(4px)`;
    });
  }

  function onLeave() {
    cancelAnimationFrame(raf);
    node.style.transform = "";
    node.style.transition = "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
    setTimeout(() => {
      node.style.transition = "";
    }, 500);
  }

  node.addEventListener("mousemove", onMove);
  node.addEventListener("mouseleave", onLeave);
  return {
    destroy() {
      node.removeEventListener("mousemove", onMove);
      node.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    },
  };
}

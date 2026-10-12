const COLORS = [
  "#fbbf24",
  "#a855f7",
  "#3b82f6",
  "#10b981",
  "#f43f5e",
  "#06b6d4",
  "#e879f9",
  "#84cc16",
];

// Pluie de confettis plein écran (styles .confetti-* dans game.css)
export function launchConfetti() {
  const container = document.createElement("div");
  container.className = "confetti-container";
  document.body.appendChild(container);
  for (let i = 0; i < 130; i++) {
    const el = document.createElement("div");
    el.className = "confetti-piece";
    el.style.cssText = `left:${Math.random() * 100}%;background:${COLORS[Math.floor(Math.random() * COLORS.length)]};animation-delay:${Math.random() * 1.8}s;animation-duration:${2.5 + Math.random() * 2.5}s;width:${5 + Math.random() * 7}px;height:${6 + Math.random() * 9}px;transform:rotate(${Math.random() * 360}deg);border-radius:${Math.random() > 0.5 ? "50%" : "2px"};`;
    container.appendChild(el);
  }
  setTimeout(() => container.remove(), 7000);
}

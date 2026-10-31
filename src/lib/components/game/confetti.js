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

const FALL = [
  { transform: "translateY(0) rotate(0deg)", opacity: 1 },
  { opacity: 1, offset: 0.75 },
  { transform: "translateY(110vh) rotate(720deg)", opacity: 0 },
];

// Pluie de confettis plein écran, sans feuille de style : utilisable partout
export function launchConfetti(count = 130) {
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:400;overflow:hidden;";
  document.body.appendChild(container);
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;top:-12px;left:${Math.random() * 100}%;background:${COLORS[Math.floor(Math.random() * COLORS.length)]};width:${5 + Math.random() * 7}px;height:${6 + Math.random() * 9}px;border-radius:${Math.random() > 0.5 ? "50%" : "2px"};`;
    container.appendChild(el);
    el.animate(FALL, {
      duration: 2500 + Math.random() * 2500,
      delay: Math.random() * 1800,
      fill: "both",
    });
  }
  setTimeout(() => container.remove(), 7000);
}

export const THEMES = [
  { id: "light", label: "Clair", bg: "#f7f5fa", accent: "#c026d3" },
  { id: "dark", label: "Sombre", bg: "#080808", accent: "#ff00ff" },
  { id: "violet", label: "Violet", bg: "#0c0814", accent: "#a78bfa" },
  { id: "ocean", label: "Océan", bg: "#050b13", accent: "#22d3ee" },
  { id: "sunset", label: "Sunset", bg: "#140806", accent: "#fb923c" },
  { id: "emeraude", label: "Émeraude", bg: "#04100a", accent: "#34d399" },
];

export const DEFAULT_THEME = "light";

export function getTheme() {
  try {
    return localStorage.getItem("zik_theme") || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function setTheme(id) {
  try {
    localStorage.setItem("zik_theme", id);
  } catch {
    /* localStorage indisponible : le thème s'applique quand même pour la session */
  }
  document.documentElement.setAttribute("data-theme", id);
  const bg = THEMES.find((t) => t.id === id)?.bg;
  if (bg) {
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.content = bg;
    });
  }
}

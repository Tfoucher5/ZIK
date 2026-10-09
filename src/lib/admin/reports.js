import { BUG_MOTIFS } from "$lib/reports/bug-report.js";

export const REPORT_TYPES = {
  bug: "Bug",
  contact: "Contact",
  user: "Joueur signalé",
};

const MOTIFS = Object.fromEntries(BUG_MOTIFS.map((m) => [m.value, m.label]));

export const TRACK_SUBJECTS = ["audio", "mauvaise-reponse"];

export function subjectLabel(r) {
  if (r.type === "bug" && r.subject === "salon")
    return `Aide demandée depuis le salon ${r.room_id ?? ""}`.trim();
  if (r.type === "bug" && r.subject === "card")
    return `Carte n° ${r.metadata?.card ?? r.extra?.card ?? "?"} à corriger`;
  if (r.type === "bug" && r.subject)
    return MOTIFS[r.subject] ?? `Bug : ${r.subject}`;
  if (r.type === "user" && r.subject) return `Joueur signalé : ${r.subject}`;
  return r.subject || REPORT_TYPES[r.type] || r.type;
}

export function describeDevice(ua) {
  if (!ua) return null;
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : "Système inconnu";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /CriOS|Chrome\//.test(ua)
          ? "Chrome"
          : /FxiOS|Firefox\//.test(ua)
            ? "Firefox"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Navigateur inconnu";
  const app = /FBAN|FBAV|Instagram|TikTok/.test(ua) ? " (dans une appli)" : "";
  return `${browser} sur ${os}${app}`;
}

// Report d'un salon dont l'hôte a le Pro : il passe avant les autres
export function isPrioritySalon(r) {
  return (
    r.type === "bug" &&
    r.subject === "salon" &&
    (r.context ?? r.metadata?.context)?.server?.pro === true
  );
}

const SALON_ROLES = { host: "écran TV", regie: "régie", player: "téléphone" };
const SALON_PHASES = {
  lobby: "en attente",
  starting: "lancement",
  round: "manche en cours",
  summary: "réponse affichée",
  gameover: "partie finie",
};

const SLOT = { found: "trouvé", wrong: "faux", revealed: "révélé" };
const yes = (v) => (v ? "oui" : "non");

// Lignes lisibles du contexte joint au signalement
export function contextRows(c) {
  if (!c) return [];
  const g = c.game ?? {};
  const s = c.server ?? {};
  const rows = [
    ["Page", c.page],
    ["Venait de", c.from],
    ["Appareil", describeDevice(c.userAgent)],
    [
      "Écran",
      c.viewport &&
        `${c.viewport} (écran ${c.screen ?? "?"})${c.touch ? ", tactile" : ""}`,
    ],
    ["Réseau", c.online === false ? "hors ligne" : c.network],
    ["Onglet", c.visible === "hidden" ? "en arrière-plan" : null],
    [
      "Langue",
      c.language && `${c.language}${c.timezone ? `, ${c.timezone}` : ""}`,
    ],
    ["Version du site", c.version],
    ["Partie", g.room && `${g.room} · ${g.mode ?? "?"} · ${g.round ?? ""}`],
    [
      "Écran de jeu",
      g.screen &&
        `${g.screen}${g.timer != null ? `, ${g.timer} s restantes` : ""}`,
    ],
    [
      "Réponses",
      g.answer &&
        `artiste ${SLOT[g.answer.artist] ?? "pas trouvé"}, titre ${SLOT[g.answer.title] ?? "pas trouvé"}`,
    ],
    [
      "Connexion au jeu",
      g.connected != null && (g.connected ? "connecté" : "déconnecté"),
    ],
    ["Joueurs", g.players ?? s.players],
    ["Invité", g.guest != null ? yes(g.guest) : null],
    [
      "Côté serveur",
      s.kind &&
        [
          s.kind === "salon"
            ? `salon ${SALON_PHASES[s.phase] ?? s.phase}${s.paused ? ", en pause" : ""}`
            : s.active
              ? "partie en cours"
              : "pas de partie",
          `manche ${s.round}`,
          s.pro != null && `Pro ${yes(s.pro)}`,
        ]
          .filter(Boolean)
          .join(" · "),
    ],
    ["Titre en cours", s.track],
  ];
  if (c.salon)
    rows.push([
      "Envoyé depuis",
      [
        SALON_ROLES[c.salon.role] ?? c.salon.role,
        c.salon.connected === false && "déconnecté du salon",
      ]
        .filter(Boolean)
        .join(" · "),
    ]);
  if (s.kind === "salon") {
    rows.push(
      [
        "Hôte",
        s.hostConnected == null
          ? null
          : s.hostConnected
            ? `connecté (${s.screens} écran TV, ${s.controls} régie)`
            : "aucun écran ni régie connecté",
      ],
      [
        "Musique",
        s.playlistIds &&
          `${s.playlistIds.length} playlist${s.playlistIds.length > 1 ? "s" : ""} · ${s.trackCount} titres`,
      ],
      [
        "Réglages",
        s.settings &&
          [
            s.settings.answerMode === "multiple" ? "QCM" : "réponse libre",
            `${s.settings.roundDuration} s par manche`,
            s.settings.manualNext ? "suite à la main" : "suite auto",
            s.settings.teams?.length && `${s.settings.teams.length} équipes`,
          ]
            .filter(Boolean)
            .join(" · "),
      ],
      [
        "Joueurs du salon",
        s.roster?.length
          ? s.roster
              .map(
                (p) => `${p.username} ${p.score}${p.offline ? " (parti)" : ""}`,
              )
              .join(", ")
          : null,
      ],
    );
  }
  for (const a of c.audio ?? [])
    rows.push([
      a.kind === "video" ? "Vidéo" : "Son",
      [
        a.paused ? "en pause" : "en lecture",
        a.muted && "muet",
        `volume ${a.volume} %`,
        `à ${a.position} s`,
        a.error && `erreur ${a.error}`,
        a.source,
      ]
        .filter(Boolean)
        .join(" · "),
    ]);
  return rows.filter(([, v]) => v != null && v !== "");
}

// Textes des sections épinglées de /soiree (maquette validée le 15/11).
// Les chiffres viennent des réglages et des offres ; défauts : createSalon.
import { FREE_MAX_PLAYERS, FREE_MAX_TEAMS } from "../../data/proPlans.js";
import {
  SALON_DURATIONS,
  SALON_TEAMS,
  SPECIALS,
  SPECIAL_INTRO_MS,
} from "../../data/salonOptions.js";
import { PAUSES } from "./soireeContent.js";

const first = (a) => a[0];
const last = (a) => a[a.length - 1];

// Une phrase par temps de la section ; `b` en gras devant, `pro` = étiquette ZIK Pro
export const PINS = {
  rejoindre: {
    label: "Rejoindre",
    title: "Sortez vos téléphones.",
    beats: [
      {
        t: "Les joueurs scannent le QR code de la TV ou tapent son code. Pas d'appli, pas de compte.",
      },
      {
        t: `Chacun choisit son équipe sur son téléphone : ${FREE_MAX_TEAMS} équipes en gratuit, jusqu'à ${last(SALON_TEAMS)} avec`,
        pro: true,
      },
      {
        t: `Chaque arrivée s'affiche sur la TV. Gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs, illimité avec`,
        pro: true,
      },
    ],
  },
  manche: {
    label: "Une manche",
    title: "30 secondes pour trouver",
    beats: [
      {
        t: `La musique part sur la TV, jamais sur les téléphones. 30 secondes par défaut, de ${first(SALON_DURATIONS)} à ${last(SALON_DURATIONS)} au choix.`,
      },
      {
        t: "Chacun tape l'artiste, puis le titre. Les pastilles A et T s'allument sur la TV, F pour les featurings.",
      },
      {
        t: "1 point par bonne réponse, plus 2 de bonus sous 10 s, ou 1 sous 20 s. Tout le monde a répondu ? La manche s'arrête.",
      },
    ],
  },
  revelation: {
    label: "La révélation",
    title: "7 secondes de vérité",
    beats: [
      {
        t: "La pochette se dévoile avec la réponse, et la TV salue le plus rapide.",
      },
      {
        t: "Les points tombent et le classement se réordonne sous les yeux de toute la salle.",
      },
    ],
  },
  reponses: {
    label: "Les réponses",
    title: "Trois façons de répondre",
    beats: [
      {
        b: "Texte libre.",
        t: "Artiste, titre, featurings : chacun tape ce qu'il a reconnu. Pour les connaisseurs.",
      },
      {
        b: "4 choix.",
        t: "Une réponse parmi quatre, verrouillée au premier appui. Parfait quand les niveaux se mélangent.",
      },
      {
        b: "Buzzer",
        pro: true,
        t: "Qui buzze le plus vite répond à voix haute, l'animateur valide depuis la régie.",
      },
    ],
  },
  speciales: {
    label: "Manches spéciales",
    pro: true,
    title: "Ça relance la partie",
    lede: `Environ une manche sur quatre, annoncée ${SPECIAL_INTRO_MS / 1000} secondes en grand sur la TV.`,
  },
  regie: {
    label: "La régie",
    title: "Rien à gérer, tout sous la main",
    beats: [
      {
        t: "Sur votre téléphone ou une tablette : qui a répondu, qui attend, qui a décroché.",
      },
      {
        t: "Pause sur la régie, pause sur la TV. Manche suivante : un appui. Révéler ou terminer à tout moment avec",
        pro: true,
      },
      {
        t: "La réponse reste masquée, visible sur la régie seulement. Un titre ne passe pas ? Signalez-le.",
      },
      {
        t: "Volume de la TV, réglages et points se corrigent en pleine partie.",
        pro: true,
      },
    ],
  },
  enchainer: {
    label: "Fin de partie",
    title: "On enchaîne les parties",
    beats: [
      {
        t: "Le vainqueur, le plus rapide, le plus régulier : chaque partie finit en grand, avec le QR code pour la suivante. Chaque joueur peut partager le podium en story.",
      },
      {
        t: `Un entracte si vous voulez, de ${first(PAUSES)} à ${last(PAUSES)} minutes. Les joueurs restent dans le salon.`,
      },
      {
        t: "Partie après partie, le classement de soirée cumule les points.",
        pro: true,
      },
    ],
  },
  podium: {
    label: "Le podium",
    pro: true,
    title: "Le final de la soirée",
    beats: [
      { t: "La 3e place, puis la 2e. Toute la salle regarde la TV." },
      { t: "« Et la victoire revient à… » Roulement de tambour." },
      {
        t: "Le vainqueur, les places 4 à 10, et chaque joueur voit sa place de la soirée sur son téléphone. Le buzz et le tambour se coupent si besoin.",
      },
    ],
  },
  tient: {
    label: "Ça tient",
    title: "Même quand ça coupe",
    beats: [
      {
        t: "La Wi-Fi décroche ? Le joueur revient avec sa place et ses points. La soirée est sauvegardée en continu.",
      },
      {
        t: "Il change de téléphone ? Il récupère sa place après l'accord de l'hôte sur la régie.",
      },
      {
        t: "La musique ne répond plus ? La partie attend et réessaie toute seule. Personne ne perd ses points.",
      },
    ],
  },
};

export const CARTONS = [
  { k: "double", c: "#ff00ff", g: "×2" },
  { k: "flash", c: "#2fb8ff", g: "5 s" },
  { k: "sprint", c: "#f4e04d", g: "½" },
].map((x) => ({ ...x, ...SPECIALS[x.k] }));

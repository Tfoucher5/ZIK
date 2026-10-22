// Textes et formats de l'écran Chiffres de l'admin.

export const INFO = {
  north: {
    title: "Étoile polaire",
    what: "Les parties terminées avec au moins 2 joueurs sur les 7 derniers jours, rooms en ligne et salons confondus. Le graphique montre les semaines du lundi au dimanche, la semaine en cours en pointillés.",
    how: "Rooms : parties finies avec 2 joueurs ou plus dans game_players. Salons : parties finies avec player_count de 2 ou plus.",
    goal: "60 par semaine. C'est la preuve que ZIK est joué comme un jeu à plusieurs.",
  },
  activation: {
    title: "Inscrits qui jouent",
    what: "Part des inscrits de la période qui ont terminé au moins une partie ou un Zikle.",
    how: "profiles créés sur la période, avec au moins une ligne game_players ou daily_results.",
    goal: "60 %. En dessous, le premier chantier est ce qui se passe juste après l'inscription.",
  },
  return: {
    title: "Reviennent dans la semaine",
    what: "Part des nouveaux joueurs qui rejouent entre le lendemain et le 7e jour après leur première partie.",
    how: "Joueurs dont la première partie date de la période (décalée de 7 jours pour leur laisser le temps de revenir), avec une autre partie entre J+1 et J+7.",
    goal: "20 %.",
  },
  host: {
    title: "Invités devenus hôtes",
    what: "Estimation de la part des invités de salon qui lancent ensuite leur propre salon.",
    how: "Salons lancés depuis le bouton « Créer mon salon » de fin de partie, divisés par le nombre d'invités des salons (joueurs moins l'hôte).",
    goal: "5 %. C'est la boucle d'acquisition la plus naturelle de ZIK.",
  },
  social: {
    title: "Visiteurs venus des réseaux",
    what: "Part des nouveaux visiteurs arrivés depuis TikTok, Instagram, Facebook, X ou YouTube.",
    how: "visit_sources avec medium = social, sur la période.",
    goal: "10 %. Mesure directe de l'effet des vidéos promo.",
  },
  zikle: {
    title: "Zikle du jour",
    what: "Les résultats des joueurs connectés sur le titre du jour, par nombre d'essais.",
    how: "daily_results du jour (heure de Paris).",
    goal: "Entre 50 et 75 % de victoires : assez dur pour être intéressant, assez facile pour donner envie de revenir.",
  },
};

export const MEDIUM = {
  direct: { label: "Direct", color: "var(--a-violet)" },
  search: { label: "Moteurs de recherche", color: "var(--a-cyan)" },
  social: { label: "Réseaux sociaux", color: "var(--a-accent)" },
  referral: { label: "Autres sites", color: "var(--a-warn)" },
  campagne: { label: "IA et campagnes", color: "var(--a-good)" },
};

export const dayLabel = (d) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

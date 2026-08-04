# Spec — Zikle (mini-jeu "chanson du jour")

**Date :** 2026-08-04
**Contexte :** nouvelle fonctionnalité de rétention/acquisition (trafic type TikTok), indépendante du jeu multijoueur existant. Concept inspiré de lessgames.com/songless (extrait audio qui s'allonge, 6 essais, partage type Wordle), adapté en français et poussé plus loin sur l'intégration compte + la qualité du pool de titres.

## Décisions validées

- **Nom provisoire :** "Zikle" (interface/branding à affiner plus tard, pas bloquant).
- **Aucun compte requis** pour jouer le jour courant. Compte **requis** pour rejouer un jour passé (archives) — sert de levier de conversion inscription.
- **Sélection automatique**, sans intervention admin.
- **Jamais le même titre avant 365 jours** depuis sa dernière apparition.
- Pool de titres **mainstream uniquement**, sourcé depuis les charts Deezer (pas le catalogue `tracks` existant, jugé trop niche) — accumulé automatiquement au fil du temps plutôt qu'importé en un bloc.
- Testé d'abord en local sur une nouvelle branche (pas de déploiement immédiat).

## Pool de titres (`zikle_pool`)

Problème : le Top France Deezer (~100 titres) ne suffit pas seul à couvrir 365 jours sans redite.

Solution : un pool qui s'accumule automatiquement.

- Nouvelle table `zikle_pool` : `track_id` (uuid, FK → `tracks.id`, PK), `added_at` (timestamptz, default now()). RLS activé, aucune policy (accès service role uniquement — même pattern que `tracks`).
- Au moment du pick quotidien, si le dernier rafraîchissement date de plus de 7 jours : on interroge l'API publique Deezer (chart France, même pattern d'appel non-authentifié que `api/deezer/search`), on upsert les titres obtenus dans `tracks` via le RPC `resolve_tracks` (appel direct `getAdminClient().rpc(...)`, pas besoin de passer par l'endpoint HTTP `/api/tracks/resolve` qui exige un user connecté — ce refresh est un appel serveur-serveur), puis on ajoute les nouveaux `track_id` dans `zikle_pool` (ignore les doublons déjà présents).
- Le pool grossit chaque semaine (les charts changent). Les premières semaines il est petit, mais un seul titre dispo par jour suffit — pas besoin d'avoir 365 titres dès le départ.

## Sélection du jour (`daily_songs`)

- Nouvelle table `daily_songs` : `id` (uuid PK), `date` (date, UNIQUE), `track_id` (uuid, FK → `tracks.id`), `created_at`.
- Au chargement de `/zikle`, si aucune ligne pour la date du jour (fuseau Europe/Paris) : le serveur tire aléatoirement un `track_id` dans `zikle_pool` en excluant ceux utilisés dans `daily_songs` au cours des 365 derniers jours, insère la ligne. Premier visiteur du jour déclenche le pick, les suivants récupèrent la même ligne.
- RLS activé, aucune policy publique — lecture uniquement via service role côté serveur (le client ne doit jamais recevoir `artist`/`title`/`cover_url` avant d'avoir gagné ou perdu, sous peine de spoiler la réponse). Seul `preview_url` (nécessaire à la lecture audio) et le numéro du jour sont envoyés au client tant que la partie n'est pas terminée.

## Mécanique de jeu (client)

- Paliers d'extrait : 1s → 2s → 4s → 7s → 11s → 16s, 6 essais. Défaite = extrait complet + réponse révélée.
- Lecture via `<audio>` sur `preview_url`, coupé côté client (`pause()`) au palier autorisé. Réécoute illimitée du palier courant.
- Autocomplete : nouvel endpoint `GET /api/tracks/search?q=` (ilike sur `artist`/`title` dans `tracks`, limite ~8 résultats, pas de `preview_url` dans la réponse).
- Bouton "passer" = consomme un essai sans proposition.

## Vérification de réponse (serveur, anti-triche)

- `POST /api/zikle/guess` — body `{ date, track_id }`. Si `date` = aujourd'hui : pas d'auth requise. Si `date` dans le passé : auth obligatoire (vérif token comme les autres endpoints protégés). Compare au `track_id` de `daily_songs` pour cette date, renvoie `{ correct }`. La comparaison ne se fait jamais côté client (pas de fuite de la réponse dans le bundle JS/réseau).
- Quand la manche se termine (victoire ou 6e échec), le client appelle `POST /api/zikle/complete` — body `{ date, attempts, won, solve_time_seconds, guesses: [track_id, ...] }`, réponse inclut la révélation (`artist`, `title`, `cover_url`). Un invité (pas de token) reçoit quand même la révélation mais rien n'est persisté côté serveur — le streak/historique restent uniquement en `localStorage`. Un utilisateur connecté envoie son Bearer token : le résultat est sauvegardé en base en plus.

## Comptes / rétention

- **Invité :** progression + historique + streak calculés et stockés en `localStorage` uniquement.
- **Connecté :** table `daily_results` (`id`, `user_id` FK → `profiles.id`, `date`, `attempts`, `won`, `solve_time_seconds`, `guesses` jsonb, `created_at`, `UNIQUE(user_id, date)`). RLS : SELECT/INSERT propriétaire uniquement. L'unicité empêche de rejouer/re-sauver le même jour ; si une ligne existe déjà, `/api/zikle/complete` renvoie le résultat existant sans erreur.
- **Streak :** calculé à la volée depuis l'historique `daily_results` (pas de colonne dédiée à maintenir) — fonction pure testable `computeStreak(results, today)` dans `src/lib/server/services/zikle.js`.
- **XP :** +10 XP sur `profiles.xp` au premier `complete` gagnant du jour (pas de bonus selon le nombre d'essais pour rester simple).
- **Classement du jour :** RPC `zikle_leaderboard(p_date)` (SECURITY DEFINER), trié essais croissant puis `solve_time_seconds` croissant, retourne `username`/`attempts`/`solve_time_seconds` — évite d'exposer `daily_results` brut (guesses, user_id) publiquement.

## Partage

- Bouton partage : grille emoji façon Wordle (🟥 essai raté, 🟩 essai réussi) + numéro du jour, format texte (Web Share API, fallback copier-coller). Aucun spoiler du titre. Lien vers `/zikle`.

## Routes & SEO

- `/zikle` — jeu du jour, indexable, meta dynamique ("Zikle #N — Devine la chanson du jour").
- `/zikle/archives` — liste des jours passés, indexable.
- `/zikle/archives/[date]` — rejoue un jour passé (auth obligatoire pour jouer ; page visible et indexable sans compte avec teaser + CTA connexion pour la conversion SEO → inscription).

## Tests (vitest)

- Progression des paliers d'extrait.
- `computeStreak` (cas limites : trou dans l'historique, aujourd'hui pas encore joué, hier manqué).
- Logique de vérification de réponse et de non-répétition (sélection dans `zikle_pool` en excluant les 365 derniers jours).
- Construction de la grille emoji de partage.

## Points ouverts (à trancher en phase de plan, pas bloquants pour la spec)

- Endpoint Deezer exact pour le chart France (id de chart/pays) à vérifier à l'implémentation.
- Détail visuel de l'interface — pas fixé, à itérer en local.

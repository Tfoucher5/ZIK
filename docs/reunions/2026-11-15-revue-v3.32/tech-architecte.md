# Pôle Technique (architecte) — revue v3.32

**Verdict** : on garde le serveur, 4 petits points avant release. Un seul vrai bug visible en public : le CSS du téléphone reste en cache.

## Ce qui marche (à ne pas toucher si Produit refait les écrans)

- Reprise de place (#434) : `safe()` + schéma, une demande par pseudo, seule la régie confirme, banni exclu, nouveau jeton à chaque reprise, ancien téléphone lâché sans compter comme parti, `_reclaims` hors instantané (testé), 9 cas dont hostiles.
- `watchConnection` : alerte après 3 s, rien au départ volontaire.
- Code sur `/` (#420) : 5 s par appel, repli sur `/salon/play`.
- Préparation retenue (#427) : lecture tolérante, serveur revalide (`rooms.js:54,212`).
- Story (#433) : image préparée avant le clic (Safari), repli téléchargement.
- Nav (#424) : `/`, `/jouer`, `/soiree`, `/salon`, `/pro` en 200, canoniques justes, sitemap à jour.

À garder : événements `salon_name_taken`, `salon_reclaim_*`, `salon_reclaims`, `salon_closed` ; confirmation par l'hôte ; nouveau jeton ; délai 3 s ; ordre soirée puis room ; validation serveur des réglages.

## Problèmes

1. **Bloquant** — `phone.css` changé (`.sp-conn`) mais chargé en `?v=3.31.1` (`salon/+layout@.svelte:6`), servi `immutable` 1 an (`server.js:63`) : bandeau « Connexion perdue » en texte brut chez les habitués.
2. **Important** — abus de reprise (`reclaim.js:45-66`) : un téléphone peut demander tous les pseudos, `reclaimFor` ne garde que la dernière, lignes orphelines en régie ; un clic par erreur éjecte le vrai joueur.
3. **Important** — nouveau jeton pas sauvegardé (`reclaim.js:91`) avant le prochain changement de phase : redémarrage = ancien jeton revient. Non testé.
4. **Important** — code de room tapé sur `/` → `GET /api/salon` → lecture d'instantané ; compteur `httpLookups` global (`api/salon/+server.js:80,92`), 5/min : après 5 codes de room, reprise de soirée HTTP en 503 une minute (bandeau de reprise disparaît après déploiement).
5. **Confort** — code mal tapé : « Cette soirée n'existe plus. ».
6. **Confort** — logo de l'univers jeu → `/` au lieu de `/jouer` ; `/blind-test/bar|camping|soiree` classés « jeu » (`univers.js:5`).
7. **À tester** — story `files` + `text` + `url` (`shareFile.js:12`) : Instagram iPhone peut prendre le lien au lieu de l'image.
8. **Dette** — `join.js` 270 lignes, `playerEvents.js` 280 ; version CSS saisie à la main (cause du n°1).
9. **SEO** — suivre la Search Console 2-3 semaines après le transfert `/` → `/jouer`.

## Propositions

| Proposition                                                                             | Impact | Effort |
| --------------------------------------------------------------------------------------- | ------ | ------ |
| `?v=3.32.0` dans `salon/+layout@.svelte`                                                | fort   | S      |
| Test qui vérifie la version des `<link>` des CSS modifiés, ou version = hash du fichier | moyen  | S/M    |
| `reclaim.js` : une demande par téléphone + plafond par salon (5) + test                 | fort   | S      |
| `saveSnapshot(salon)` après `renewToken` + test de redémarrage                          | moyen  | S      |
| Compteur par IP, ou `/api/code` qui cherche en mémoire sans instantané                  | moyen  | S/M    |
| 404 : « Aucune soirée avec ce code. »                                                   | faible | S      |
| Logo → `/jouer` en univers jeu, `/blind-test/` en univers soirée                        | faible | S      |

## Questions

- Produit : alerte de reprise en régie avec score et heure d'arrivée ? Deux « Léa » : proposer « Léa 2 » d'office ?
- Ops : story sur vrai iPhone/Android (Instagram, TikTok) ?
- Marketing : qui suit le transfert SEO ?

_Non vérifié : rendu visuel, story sur appareils, reprise TV #425 en vrai._

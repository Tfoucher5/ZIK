# Pôle Produit (UX, parcours) — revue v3.32

Parcours joués sur le staging (Playwright, 1440 et 390 px, soirées de test L5FC63, EPBGAA). Prod : seulement `/` et `/salon` regardés.

**Verdict** : on retouche. Chemins nettement plus courts que la prod ; quatre trous dans les parcours organisateur et joueur ; « salon » et tutoiement côté organisateur traînent.

## Ce qui marche

- Gérant sur ordinateur : `/` → TV prête en **2 clics**, 6,5 s, playlist cochée d'office, « Musique prête : 10 titres sur 10 ».
- TV : gros code, gros QR, « Sortez vos téléphones », état vide clair, joueur visible dès l'entrée.
- Habitué : préparation reprise (2 clics) ; bandeau « Reprendre l'écran TV » sur `/` (1 clic).
- Code tapé sur `/` : arrivée sur `/salon/play` code rempli, reste le pseudo.
- Téléphone rechargé : « Re-bonjour Julie », un bouton.
- Plus de tutoriel en 20 étapes sur `/` (la prod le montre encore par-dessus l'accueil).

## Problèmes

1. **Bloquant** — gérant qui crée depuis son téléphone (fréquent depuis Google) : « Ouvrir l'écran TV » transforme le téléphone en TV, la clé reste dessus. Pour passer sur l'ordinateur : Régie → Liens → Copier le lien TV → se l'envoyer, rien ne le dit. Seule phrase utile en bas de `/salon` (`setup/SetupPro.svelte:10`).
2. **Important** — régie sur téléphone : le bouton Régie de la TV ouvre un onglet sur l'ordinateur de la TV (`host/HostTopBar.svelte:106-113`), aucun QR pour la régie ; l'erreur de régie renvoie au « lien donné à la création » qui n'existe plus (`regie/salonRegie.svelte.js:186`).
3. **Important** — code faux sur `/` : redirection vers `/salon/play` sans erreur, on l'apprend après avoir tapé son pseudo.
4. **Important** — « Salon L5FC63 » (`salon/play/+page.svelte:66`), « Dans le salon » (`PlayLobby.svelte:28`), erreurs `join.js:187,193` ; régie et `HostGameOver.svelte:139`, `SetupPro.svelte:10` au tutoiement.
5. **Important** — `/` sans bouton saillant pour l'organisateur : seul magenta = « Rejoindre » (+ « S'inscrire ») ; portes en contour ; en 390 px la porte soirée est sous la ligne de flottaison. La prod avait « Organiser une soirée » en magenta.
6. **Confort** — `/jouer` en direct : tutoriel 20 étapes s'ouvre ; 4 actions + 1 saisie pour jouer (« Jouer maintenant » ne fait que défiler).
7. **Confort, à vérifier** — avant le début, un 2ᵉ téléphone prend « Julie » sans confirmation pendant que le 1er est sur « Reprendre » (joueur déconnecté retiré avant le début).
8. **Confort** — même bouton, trois libellés : « Créer une soirée », « Lancer une soirée », « Créer ».

## Propositions

| #   | Proposition                                                                                                                                                            | Impact | Effort |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| 1   | `/salon` au-dessus du bouton : « À ouvrir sur l'ordinateur branché à la TV » ; TV en petit écran : bandeau « Vous êtes sur un téléphone » + Partager/Copier le lien TV | fort   | S      |
| 2   | QR « Piloter depuis mon téléphone » (lien de régie) sur la TV avant la partie et dans le menu Régie ; corriger `salonRegie.svelte.js:186`                              | fort   | S      |
| 3   | `/` : code inconnu → erreur sur place                                                                                                                                  | moyen  | S      |
| 4   | « Soirée » côté joueur, vouvoiement côté organisateur                                                                                                                  | moyen  | S      |
| 5   | Porte soirée en bouton plein magenta, « Rejoindre » en contour                                                                                                         | moyen  | S      |
| 6   | Avant le début, garder 2 min le pseudo d'un téléphone déconnecté                                                                                                       | faible | S      |
| 7   | Un seul libellé : « Créer une soirée »                                                                                                                                 | faible | S      |

États : erreur de code et hors ligne à ajouter sur `/` (`codeTarget` avale l'erreur).

**Critères d'acceptation** :

1. 390 px, `/salon` → « Ouvrir l'écran TV » : message visible sans défiler + lien TV partageable en 1 tap.
2. QR sur la TV avant la partie → régie autorisée sur téléphone.
3. Code ZZZZZ9 sur `/` → erreur sous le champ, sans changer de page.
4. Aucun « salon » visible dans `play/`, `regie/`, `join.js`.
5. `/` 1440 : un seul bouton plein côté portes, celui de la soirée.

## Questions

- UI : quel magenta prioritaire sur `/` ?
- Rédaction : tu joueur / vous organisateur, régie comprise ?
- Tech : clé de régie dans un QR sans exposer la soirée (usage unique) ?
- Ops : recette d'un gérant qui ne crée que depuis son téléphone ?

Pour la v3.32, l'UX ne bloquerait que sur 1 et 2.

_Non vérifié : partage du podium, reprise acceptée en régie, TV réelle à 5 m._

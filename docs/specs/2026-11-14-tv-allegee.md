# TV allégée — fiche de cadrage

Item du plan : `docs/audit/2026-11-02-a-valider.md`, « Rythme de la partie et fermeture du salon », TV allégée (décisions de Théo du 12/11). Fiche issue de `/produit` (agents `ux`, `ui`, `redaction`), le 14/11.

## Objectif

Pendant les manches, la TV ne montre que ce que les joueurs doivent voir. Les réglages de l'hôte se cachent et reviennent à la demande, la TV sait si une régie la pilote, et un réglage changé d'un côté se voit de l'autre.

## Parcours final

1. Lobby, `starting`, `gameover` : barre visible en permanence, comme aujourd'hui.
2. `round` et `summary` : après **5 s** sans action, le groupe des réglages disparaît en fondu et le curseur se cache.
3. `mousemove`, `pointerdown`, `keydown` : les réglages reviennent pour 5 s. La touche qui réveille ne déclenche rien d'autre (pas de raccourci Espace).
4. La barre reste ouverte : au survol, au focus (`:focus-within`), panneau Sons ouvert, aide ouverte (`h.helpOpen`), choix de playlist ouvert (`h.pickerOpen`), **en pause** (`h.paused`), pendant `restarting`, `restored` et la panne vidéo.
5. Au masquage, le panneau Sons se ferme.
6. Indice à la première manche après l'ouverture de la page (pas de stockage : il revient à chaque soirée, utile quand l'animateur change).

## Mise en page (tranché)

`ux` proposait de garder la ligne de la barre et de ne faire disparaître que les réglages ; `ui` de passer la barre en surimpression et de déplacer les éléments toujours visibles dans un pied sous le classement. **On garde la ligne** : zéro saut de mise en page, aucun élément déplacé, QR et code restent où les joueurs les connaissent, plus petit diff.

- Dans `HostTopBar.svelte`, les réglages masquables sont regroupés dans un conteneur qui passe en `opacity: 0; pointer-events: none` (pas `visibility: hidden` : le premier Tab doit retomber dans la barre et la rouvrir). Apparition 200 ms ease-out, disparition 250 ms ease-in. `prefers-reduced-motion` déjà géré par `static/css/theme.css`.
- Curseur : `cursor: none` sur `.sh` et ses descendants quand les réglages sont cachés (les `.sx-btn` et `.sh-icon-btn` forcent `pointer`).
- **Iframe YouTube** : le lecteur actif a `pointer-events: auto` (`tv-stage.css`). Pendant `round` et `summary`, il avale la souris (la barre ne revient pas) et garde son curseur. Couper ses événements souris dans ces phases.
- Tactile (`@media (pointer: coarse)`) : boutons de la barre à 44 px.

| Élément de la barre                       | `round` / `summary`                        |
| ----------------------------------------- | ------------------------------------------ |
| Marque « ZIK Salon » (lien vers `/`)      | caché (un clic faisait quitter la TV)      |
| QR, adresse, code                         | visible (retardataires)                    |
| « Manche x / y »                          | visible                                    |
| « Manche suivante » si `manualNext`       | visible (sans régie, seul moyen d'avancer) |
| « Maintenant » (enchaînement automatique) | caché, renommé « Manche suivante »         |
| Pause / Reprendre                         | caché, sauf en pause                       |
| Couper le son, volume, Sons, playlist     | caché                                      |
| « ? » Appeler un admin, lien Régie        | visible                                    |

Hors barre, rien ne change : juge buzzer (`HostBuzz`), « Lancer la partie », fin de partie, écrans de pause et de panne, `NoticeBanner`, toasts.

## Badge régie

- Serveur : nombre de régies du salon dans un champ `_` (hors instantané, `snapshot.js` ignore déjà ces champs), envoyé aux écrans à l'arrivée d'une régie, à son départ **5 s après** (pas de clignotement au rechargement, minuterie annulée si une régie revient et à la fermeture) et dans la réponse d'arrivée de la TV (reconnexion, reprise d'instantané).
- TV : à côté du lien Régie, motif `.rh-tv-ok` de `RegieHeader.svelte` (point `var(--success)`). « Régie connectée », « 2 régies connectées ». **0 régie : rien** (pas de « Pas de régie » ni de « déconnectée », que le public pourrait voir au survol et prendre pour une panne).
- `aria-label` du lien : « Ouvrir la régie. Une régie est connectée. » / « … {n} régies sont connectées. »

## Vérification de la musique

- TV : seulement « Vérification de la musique : n / total » et l'alerte (« Peu de clips disponibles : la partie se jouera surtout en extraits audio. »). « ✓ Musique prête » aussi **quand aucune régie n'est connectée**, sinon une TV seule ne le voit jamais.
- Régie : tout le bilan, alerte « Moins de la moitié des titres ont leur clip : la partie se jouera surtout en extraits audio. Tu peux changer de playlist dans Réglages. »

## Synchronisation TV ↔ régie

Déjà synchronisés par le serveur : pause, son du buzz, roulement de tambour, playlist, réglages de la partie suivante. Reste à brancher l'affichage là où il manque (cases cochées des deux côtés).

**Volume, pas synchronisé** : local à la TV (`localStorage zik_salon_vol`) ; la régie envoie `salon_volume` mais affiche toujours 100 % au chargement. Nouvel événement de la TV (via `safe()`, schéma, test d'entrées hostiles) qui annonce son volume ; le serveur le garde dans un champ `_` et le relaie aux régies, y compris à leur arrivée. Le volume reste libre sur la TV (réglage physique de l'écran). Côté régie : vrai volume affiché pour tous, réglage à distance réservé à Pro (cadenas en gratuit).

Bouton couper le son : revient au volume d'avant, pas à 100 %.

## Textes

- Indice (souris/clavier) : « Bougez la souris ou appuyez sur une touche pour afficher les réglages ». Écran tactile (`pointer: coarse`) : « Touchez l'écran pour afficher les réglages ». Pastille en haut au centre, `var(--bg2)`, `var(--border2)`, `var(--mid)`, 6 s, part dès que la barre revient. `role="status"`.
- Libellés unifiés : « Manche suivante » partout ; « Son du buzz » et « Roulement de tambour au podium final » ; choix « Oui / Non » ; « Appeler un admin ZIK » des deux côtés (`title` TV : « Un admin ZIK répond en direct »).

## Critères de recette

- `round` à 1920×1080 : après 5 s, seuls QR, code, manche, « ? », Régie (et « Manche suivante » en `manualNext`) restent ; curseur invisible, y compris sur la vidéo ; la vidéo ne bouge pas d'un pixel quand les réglages apparaissent ou disparaissent.
- Souris sur la vidéo en `summary` : la barre revient.
- Clavier : Tab rouvre la barre, focus visible, Espace ne met pas en pause quand la barre est cachée.
- Tactile : un toucher sur la zone cachée réveille sans actionner de bouton.
- Sons ou aide ouverts, pause : la barre ne se cache pas.
- Régie ouverte : badge en moins de 1 s ; rechargée : pas de clignotement ; fermée : badge parti après ~5 s ; TV rechargée : badge juste.
- Volume changé sur la TV : la régie l'affiche en moins de 1 s. Couper puis remettre : volume d'avant.
- Sons changés d'un côté : cochés de l'autre.
- Tests serveur : compte de régies (arrivée, départ avec délai, reprise d'instantané, fermeture), entrées hostiles du nouvel événement, champ absent de l'instantané.
- Desktop et 390 px vérifiés sur le staging.

## Décisions de Théo (14/11)

1. **Volume dans la régie** : toutes les régies voient le vrai volume de la TV ; une régie gratuite a un cadenas Pro, une régie Pro le pilote. L'offre ne change pas.
2. Marque de la TV : « ZIK Salon » devient « ZIK Soirée ».

Hors sujet noté : emoji de la barre (🔇 🔊 🔔) interdits par `DESIGN.md`, commandes YouTube visibles au survol (`controls: 1`).

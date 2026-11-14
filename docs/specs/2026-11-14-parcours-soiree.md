# Raccourcir le chemin vers ZIK Soirée

Fiche de cadrage du 14/11 (agents `ux` et `redaction`). Demande de Théo : « trop de clics pour arriver au mode soirée ».

## Constat

| Parcours                                              | Avant                                                                     | Après                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| Nouvel organisateur, de `/` à la TV qui affiche le QR | 3 clics, 3 écrans (porte → `/soiree` → `/salon` → TV)                     | 2 clics, 2 écrans (porte → `/salon` → TV)              |
| Habitué sans soirée ouverte                           | 3 clics + 3 à 5 réglages refaits                                          | 2 clics, réglages repris                               |
| Soirée encore ouverte (même navigateur)               | 1 clic, mais vers la régie alors que la clé est sur l'ordinateur de la TV | 1 clic vers l'écran TV                                 |
| Invité (QR ou code)                                   | déjà au plus court                                                        | inchangé                                               |
| Joueur en ligne qui découvre la soirée                | 3 clics                                                                   | inchangé : il doit d'abord voir le produit (`/soiree`) |

Autres frictions : le tutoriel du jeu s'ouvre sur `/pro` et `/vs/*` ; sur `/salon`, le chargement affiche « 0 playlist », une erreur n'a pas de « Réessayer » et un échec réseau montre un message brut ; textes encore en « salon » et en tutoiement.

## Décisions

- **Porte soirée de `/`** : toute la carte et le bouton « Créer une soirée » mènent à `/salon`. Lien secondaire « Comment ça marche ? » vers `/soiree`. Texte : « La TV diffuse la musique. Chaque téléphone sert de buzzer. Au bar, au camping ou à la maison. »
- **Bandeau de reprise** : « Reprendre l'écran TV de votre soirée XXXXXX » vers `/salon/host?code=`. Remplace le choix « régie » de la fiche deux univers.
- **`/salon`** :
  - surtitre « Créer une soirée », retour « ← Comment ça marche » ;
  - les 3 points deviennent les étapes « Choisissez la musique », « Affichez le code sur la TV », « Les invités jouent sur leur téléphone » ;
  - bouton « Ouvrir l'écran TV » ;
  - vouvoiement partout, erreurs avec action (« Réessayer ») ;
  - la page retient la dernière préparation (playlists et réglages) dans le navigateur ; `?playlist=` reste prioritaire ; une playlist disparue ou un réglage hors offre est ignoré sans message.
- **Tutoriel** : ne s'ouvre pas dans l'univers soirée (`universOf`).
- **Nav du jeu** : lien « ZIK Soirée » vers `/soiree` inchangé (choix ux : un joueur découvre avant de créer).

Désaccord tranché : bouton de `/salon` « Ouvrir l'écran TV » (ux, brief) plutôt que « Ouvrir la soirée » (redaction) : il dit concrètement ce qui va s'ouvrir.

## Découpage

1. `feat(accueil)` : porte soirée vers `/salon`, bandeau vers l'écran TV, tutoriel coupé côté soirée.
2. `fix(salon)` : libellés, vouvoiement, états de chargement et d'erreur.
3. `feat(salon)` : la création retient la dernière préparation.

## Critères d'acceptation

1. En 1440 et 390 px, un clic sur la carte soirée de `/` ouvre `/salon` ; « Comment ça marche ? » ouvre `/soiree` ; un seul magenta.
2. Navigateur vierge : `/pro` et `/vs/kahoot` n'ouvrent pas le tutoriel, `/jouer` l'ouvre.
3. `/salon` : bouton « Ouvrir l'écran TV » ; API des playlists en échec → message et « Réessayer » ; création en échec → message en français, bouton réactivé.
4. Créer avec une playlist et des réglages, revenir sur `/salon` : tout est repris, un clic ouvre la TV.

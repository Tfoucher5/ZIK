# Compte-rendu — branche `fix/audio-et-strategie` (v3.9.0)

_29 septembre 2026. 10 commits locaux, non poussés. 129 tests OK, 0 erreur ESLint, build OK._

## En bref

Le son devrait enfin être fiable, le Mode Salon s'ouvre à tout le monde et devient mesurable, et ZIK a 13 nouvelles pages pour Google. Tout suit le plan de `2026-09-29-audit-et-plan.md`.

## Ce qui a été fait

| Commit    | Quoi                                                                                                                                                                                                                                                                                             | Pourquoi                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `29bed37` | Extraits Deezer résolus juste avant la manche, validés sur leur vraie expiration, renouvelés sur 403 ; liens non audio écartés ; suppression du rafraîchissement massif (chargement de playlist + tâche de 6 h) ; raison des échecs yt-dlp dans les logs ; boutons salon et `/pro` sur l'accueil | 10/10 signalements récents = son. Le rafraîchissement massif relançait des centaines d'appels Deezer avant la manche 1 |
| `762b627` | Parties salon enregistrées dans `games` (`source = 'salon'`, `player_count`), hors classements                                                                                                                                                                                                   | Le mode sur lequel on mise était invisible dans les chiffres                                                           |
| `058eab6` | Créer un salon **sans compte** (playlists publiques et officielles, plafond de 50 salons invités)                                                                                                                                                                                                | Le compte obligatoire cassait la boucle invité → hôte. La page `/pro` promettait déjà « sans compte »                  |
| `3b8730a` | Conversion invité → hôte mesurée (`?ref=invite` → `games.origin`)                                                                                                                                                                                                                                | Indicateur clé de la boucle virale                                                                                     |
| `9ebedb9` | `/blind-test` + 12 pages thème, sitemap, footer, lien depuis `/pro`                                                                                                                                                                                                                              | Capter les recherches « blind test années 80 », « blind test anniversaire »…                                           |
| `e359ef8` | Les retardataires rejoignent un salon déjà lancé                                                                                                                                                                                                                                                 | Avant : « La partie a déjà commencé ». En soirée, les retards sont la norme                                            |
| `c046066` | « Créer un compte gratuit » en fin de partie invité (`/?auth=register`)                                                                                                                                                                                                                          | Activation : 66 % des inscrits ne jouaient jamais, l'inscription arrive maintenant après avoir joué                    |
| `f8cd3bc` | Joueur seul dans une room : copier le lien, ou passer au Mode Salon                                                                                                                                                                                                                              | 90 % des parties en ligne se jouaient seul                                                                             |
| `c048f19` | Version 3.9.0 + entrée dans Nouveautés                                                                                                                                                                                                                                                           | —                                                                                                                      |
| `4c247af` | Feuille de route à jour                                                                                                                                                                                                                                                                          | —                                                                                                                      |

Déjà présents, donc rien à coder : le QR code permanent sur l'écran hôte, le partage Zikle façon Wordle, le jeu sans inscription.

## ⚠️ Avant de merger

1. **Appliquer la migration** `supabase/migrations/20260929_games_salon_stats.sql` sur Supabase **avant** de déployer. Sans elle, les parties salon ne seront pas enregistrées (erreur loguée, le jeu marche quand même).
2. **Tester** :
   - Partie en ligne de 10 manches : du son dès la manche 1.
   - Relancer la même playlist 15 min plus tard : toujours du son.
   - `/salon` **déconnecté** : les playlists publiques apparaissent, créer un salon, jouer.
   - Pendant une partie salon, rejoindre avec un 2e téléphone : il entre dans la manche en cours.
   - Fin de partie côté invité : « Créer mon salon » mène à `/salon?ref=invite`.
   - `/blind-test`, `/blind-test/annees-80` (bouton « Lancer en soirée » : playlist présélectionnée), `/sitemap.xml`.
   - Fin de partie en invité dans une room : « Créer un compte gratuit » ouvre l'inscription.
   - Seul dans une room avant de lancer : l'encart « Tu es seul » s'affiche.
   - Accueil sur mobile : nouveau sous-titre, bouton « Organiser une soirée », nouvelle colonne dans le pied de page.
3. `git push` puis PR vers `master`.

## Après le déploiement

- **Logs Railway** : chercher `[ytdl] <id> : …`. La fin de la ligne dit pourquoi YouTube refuse. Selon la réponse :
  - « Sign in to confirm you're not a bot » → cookies YouTube ou plugin PO token (bgutil), sinon proxy résidentiel ;
  - « timeout » → réseau Railway lent vers YouTube ;
  - sinon → mettre Deezer en source principale.
- Chercher aussi `Salon skip` : le salon cherche ses vidéos avec `youtube-sr` côté serveur, lui aussi peut être bloqué par YouTube. Depuis ma machine, la recherche YouTube échouait (délai de connexion), je n'ai pas pu tester une vraie manche de salon.
- Lundi prochain : lancer `docs/strategie/kpis.sql`. Référence de départ (semaine du 22 au 29 septembre) : **5** parties en ligne à plusieurs, **108** parties lancées, **14/44** inscrits qui ont joué.

## Ce qui reste à faire (hors code ou côté Théo)

- Se faire lister dans les comparatifs : Mukiz, AlternativeTo, blogs « meilleurs blind tests ».
- Vidéos courtes TikTok / Reels d'une vraie soirée ZIK.
- 5 conversations Discord avec d'anciens joueurs : « qu'est-ce qui t'a fait arrêter ? ».
- **Nettoyer la playlist officielle « Années 1980-1990 »** : elle contient un remix techno (« Eufrocina Manigos and Eyvind Bilstad ») qui ressort parmi les artistes affichés sur `/blind-test/annees-80`.

## Mes propositions pour la suite

1. **Son, selon les logs** (priorité absolue) : cookies ou PO token pour yt-dlp, ou Deezer en principal. Ajouter un compteur « manches avec son / sans son » pour suivre le % de manches avec son sur la durée.
2. **Page admin « Revue du lundi »** : les requêtes de `kpis.sql` affichées dans `/admin`, pour ne plus avoir à lancer du SQL.
3. **Écran hôte du salon** : QR code plus grand pendant les pauses entre manches (46 px aujourd'hui, difficile à scanner depuis le canapé), et l'URL courte `zik-music.fr/salon/play` + le code en gros.
4. **Nouveaux thèmes SEO** dès qu'il y a les playlists : Noël, Halloween (une room existe déjà), années 90, K-pop, génériques de séries, enterrement de vie de jeune fille.
5. **Carte de fin de salon partageable** (comme les parties en ligne) : podium de la soirée → WhatsApp, avec le lien « Organise ta soirée ».
6. **Salons invités** : si le plafond de 50 est atteint un jour, passer à une limite par IP (il faudra configurer `ADDRESS_HEADER` sur Railway).
7. **Bot Discord** : il consomme autant de RAM que le site pour 33 parties au total. Voir s'il peut dormir quand personne ne l'utilise.
8. **Organisation** : je peux programmer une tâche cloud qui lance les KPI chaque lundi matin et te les envoie.

## Points d'attention

- Le MCP Supabase a perdu son authentification pendant la session : je n'ai pas pu vérifier en direct s'il existe une contrainte sur `games.source`. La migration gère les deux cas (elle remplace la contrainte si elle existe).
- `npm run lint` complet échoue sur Windows à cause des fins de ligne (Prettier voit ~190 fichiers CRLF). Ce n'est pas lié à la branche, la CI Linux passe normalement. ESLint : 0 erreur.
- Une partie salon relancée au milieu d'une partie laisse l'ancienne ligne `games` sans `ended_at` (comptée comme abandonnée).

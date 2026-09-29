# ZIK — Audit produit & plan de croissance

_29 septembre 2026 — chiffres tirés de Supabase, des logs Railway et d'une recherche concurrentielle._

## En une phrase

ZIK a déjà une vraie traction (Google le place parmi les premiers résultats sur « blind test en ligne multijoueur gratuit », ~140 inscrits/mois), mais **perd ses joueurs à cause du son** et **parce que les rooms publiques sont vides**. Avant de chercher plus de visiteurs, il faut que chaque visite finisse en une partie qui marche, à plusieurs.

---

## 1. État des lieux chiffré

### Activité mensuelle

| Mois    | Inscrits | Parties lancées | Parties finies | Joueurs distincts | Parties Zikle |
| ------- | -------- | --------------- | -------------- | ----------------- | ------------- |
| 2026-04 | 92       | 442             | 185            | 64                | —             |
| 2026-05 | 119      | 446             | 241            | 42                | —             |
| 2026-06 | 124      | 353             | 311            | 78                | —             |
| 2026-07 | 113      | 572             | 521            | 115               | —             |
| 2026-08 | 150      | 1 044           | 957            | 145               | 102           |
| 2026-09 | 142      | 707             | 572            | 107               | 53            |

Croissance régulière jusqu'en août, **recul en septembre** (-32 % de parties, Zikle divisé par deux).

### Rétention (inscrits des 120 derniers jours, hors 8 derniers)

| Étape                      | Nombre | %     |
| -------------------------- | ------ | ----- |
| Inscrits                   | 496    | 100 % |
| Ont joué au moins une fois | 169    | 34 %  |
| Revenus entre J+1 et J+7   | 41     | 8 %   |
| Revenus après J+7          | 20     | 4 %   |

**2 inscrits sur 3 ne jouent jamais.** Sur ceux qui jouent, 3 sur 4 ne reviennent pas.

### Taille des parties (60 derniers jours, parties terminées)

| Joueurs enregistrés | Parties | %     |
| ------------------- | ------- | ----- |
| 0                   | 801     | 52 %  |
| 1                   | 598     | 39 %  |
| 2–3                 | 125     | 8 %   |
| 4+                  | 9       | 0,6 % |

Dans les rooms en ligne, un jeu vendu comme **multijoueur** se joue à **plus de 90 % seul ou sans score**. (Les parties à 0 joueur sont des parties où personne n'a marqué ou tout le monde est parti — ce qui colle avec des manches sans son.)

⚠️ **Les parties en mode salon ne sont enregistrées nulle part** (ni `games`, ni `game_players`). Ces chiffres ne concernent donc que les rooms en ligne, et le mode sur lequel ZIK veut miser est aujourd'hui invisible. Les 353 arrivées mensuelles sur `/salon/play` laissent penser qu'il y a plusieurs dizaines de soirées par mois, toutes à plusieurs.

### D'où viennent les visiteurs (30 derniers jours, 1 795 visites suivies)

| Source                         | Visites | Part |
| ------------------------------ | ------- | ---- |
| Direct (lien, QR code, favori) | 1 312   | 73 % |
| Google                         | 367     | 20 % |
| ChatGPT                        | 83      | 5 %  |
| Réseaux sociaux                | 3       | ~0 % |

Pages d'arrivée : `/` (831), **`/salon/play` (353)**, `/docs` (103), `/game` (64), `/vs/blinest` (15).

→ 1 visite sur 5 arrive directement sur `/salon/play` : ce sont des **invités d'une soirée** qui ont scanné le QR code d'un hôte. C'est le meilleur canal d'acquisition de ZIK, et il n'est pas exploité (voir §5).

### Ce que disent les joueurs

Les **10 derniers signalements de bug sont tous « audio »** : « jamais de musique sur la manche 1 », « 1 sec de musique puis plus rien », « pas de son ».

### Coût serveur

5,93 $/mois sur Railway. ~280 Mo de RAM, CPU ≈ 0,3 % d'un cœur. **Aucun problème de ressources** — les microservices n'apporteraient rien. Le bot Discord consomme autant de RAM que le site : à surveiller.

---

## 2. Diagnostic : ce qui bloque, par ordre d'impact

1. **Le son ne marche pas de façon fiable.** Causes identifiées :
   - yt-dlp échoue sur presque tous les titres en prod (cause exacte à confirmer grâce au nouveau log — très probablement YouTube qui bloque les IP d'hébergeur).
   - Le repli Deezer réutilisait des liens expirés (valides 15 min, gardés 2 h) → 403.
   - À chaque chargement de playlist, le serveur « rafraîchissait » **tous** les liens Deezer avant la manche 1 (des centaines d'appels, limités par Deezer) → d'où « jamais de musique sur la manche 1 ». Le cron de 6 h refaisait la même chose sur ~4 200 titres, pour des liens qui expiraient 15 min plus tard.
2. **Rooms publiques vides.** Un nouveau joueur qui arrive seul dans une room ne vit pas l'expérience promise. Il part.
3. **Inscription sans activation.** 66 % des inscrits ne lancent jamais de partie : l'inscription arrive trop tôt ou le chemin vers « première partie » est trop long.
4. **Aucun moteur de viralité.** Pas de trafic social, les invités de salon repartent sans qu'on leur propose de devenir hôtes.

---

## 3. Marché & concurrence

Le blind test en ligne gratuit est un marché **encombré mais peu différencié** : tout le monde propose « gratuit, multijoueur, sans téléchargement ».

| Concurrent                                                                                                        | Ce qui le distingue                                           |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [SongTrivia2](https://songtrivia2.io/fr/play/withfriends)                                                         | Le plus gros, rooms publiques toujours pleines, appli mobile  |
| [Blinest](https://www.similarweb.com/website/blinest.com/competitors/)                                            | Référence FR historique (ZIK a déjà une page `/vs/blinest`)   |
| [TheBlindTest](https://theblindtest.ch/)                                                                          | Jusqu'à 100 joueurs, power-ups                                |
| [LetTheMusicPlay](https://letthemusicplay.fr/)                                                                    | Sans inscription, 6 000 titres                                |
| [Blindz](https://blindz.fr/)                                                                                      | Parties privées entre amis (20 max)                           |
| [What the Tune?!](https://whatthetune.com/), [Mukiz](https://mukiz.com/), [Quichante](https://www.quichante.com/) | Généralistes, gros travail SEO (Mukiz publie des comparatifs) |

**Là où ZIK peut gagner** (et où les gros sont faibles) :

- **Ses propres playlists** Spotify/Deezer importées — « un blind test sur TA musique ».
- **Le mode salon** : un écran partagé (TV/vidéoproj) + les téléphones des invités. C'est un usage soirée / anniversaire / afterwork / classe, où l'on n'a **pas besoin de rooms publiques pleines** : on vient déjà à plusieurs.
- **Zikle** (défi quotidien façon Heardle, disparu en 2023) pour faire revenir chaque jour.

**Là où ZIK ne gagnera pas** : les rooms publiques contre des inconnus. SongTrivia2 a la masse critique ; ZIK ne l'aura pas avant longtemps.

---

## 4. Positionnement proposé

> **ZIK, le blind test de soirée sur vos playlists.**
> Vous êtes plusieurs dans la pièce, la TV affiche le jeu, chacun répond sur son téléphone.

Cibles, par ordre de priorité :

| Cible                                         | Besoin                             | Porte d'entrée                     |
| --------------------------------------------- | ---------------------------------- | ---------------------------------- |
| **Hôte de soirée** (20–35 ans, amis, famille) | Animer une soirée sans préparation | `/salon/host`, playlists importées |
| **Invité de soirée**                          | Jouer tout de suite, sans compte   | QR code → `/salon/play`            |
| **Animateur / prof / CE**                     | Activité de groupe clé en main     | Page `/pro`                        |
| **Joueur quotidien**                          | 2 minutes par jour                 | Zikle                              |
| Streamer Twitch/Discord                       | Contenu interactif                 | Bot Discord existant               |

Les rooms publiques restent, mais ne sont plus la promesse principale.

---

## 5. Plan d'action

### Phase 0 — Fiabilité (maintenant, cette branche)

- [x] Extraits Deezer résolus au moment de la manche, validés sur leur vraie date d'expiration, redemandés sur 403.
- [x] Liens non audio (YouTube, Spotify) écartés des extraits.
- [x] Suppression du rafraîchissement massif (chargement de playlist + cron 6 h) : manche 1 plus rapide, des milliers d'appels Deezer en moins.
- [x] Extrait préparé pendant la manche précédente quand yt-dlp échoue (plus d'attente à l'écran de chargement).
- [x] Raison exacte de l'échec yt-dlp dans les logs.
- [ ] Lire les logs `[ytdl] <id> : …` après déploiement et choisir : cookies YouTube, plugin PO token, proxy résidentiel, ou Deezer en source principale.
- [ ] **KPI à suivre chaque semaine : % de manches avec son** (manches jouées vs `No audio source` / 503).

### Phase 1 — Activation & rétention (semaines 2 à 6)

- **Première partie en 1 clic, sans compte.** Proposer l'inscription _après_ la première partie (« sauvegarde ton score »), pas avant.
- **Plus de room vide.** Si personne n'est en ligne : proposer directement une partie solo ou un salon, au lieu d'une room publique déserte. Afficher le nombre de joueurs connectés seulement quand il est flatteur.
- **Partage Zikle façon Wordle** : grille d'emojis à coller dans un groupe WhatsApp/Discord. C'est ce qui a fait exploser Wordle et Heardle.
- **Rendez-vous fixe** : une « partie publique du soir » à heure fixe (ex. 21 h), annoncée sur Discord → concentre les joueurs au même moment.

### Phase 2 — Acquisition (semaines 4 à 12)

- **Boucle virale du salon** : à la fin d'une partie, l'écran des invités propose « Organise ta propre soirée ZIK » → un invité devient hôte. Mesurer ce taux.
- **Pages SEO par thème** : « blind test années 80 », « blind test rap FR », « blind test Disney », « blind test mariage »… chacune jouable immédiatement. Google + ChatGPT amènent déjà 25 % du trafic : c'est le canal qui marche, il faut l'élargir.
- **Vidéos courtes** (TikTok / Reels / Shorts) : une soirée ZIK filmée, le moment où tout le monde crie la réponse. Zéro trafic social aujourd'hui = marge énorme.
- **Se faire lister** dans les comparatifs existants (Mukiz, blogs « meilleurs blind tests ») et sur AlternativeTo.
- **Streamers** : proposer le bot Discord / un mode spectateur à 5–10 petits streamers FR.

### Phase 3 — Plus tard

- Offre `/pro` (animateurs, entreprises, écoles) si la demande se confirme.
- Monétisation au-delà de Ko-fi seulement quand la rétention J7 dépasse ~20 %.

---

## 6. Tableau de bord

| Indicateur                                                     | Aujourd'hui      | Objectif 3 mois |
| -------------------------------------------------------------- | ---------------- | --------------- |
| **Étoile polaire : parties terminées à ≥ 2 joueurs / semaine** | ~15              | 60              |
| % de manches avec son                                          | inconnu (faible) | > 97 %          |
| Inscrits qui jouent une partie                                 | 34 %             | 60 %            |
| Retour J+1 à J+7                                               | 8 %              | 20 %            |
| Invités de salon qui créent leur salon                         | non mesuré       | 5 %             |
| Trafic réseaux sociaux                                         | ~0 %             | 10 %            |

Toutes ces valeurs se calculent déjà depuis Supabase (`games`, `game_players`, `visit_sources`, `profiles`), sauf la conversion invité → hôte à instrumenter.

---

## 7. Organisation

**Rôles** : Claude développe (conception, code, lint, tests, chiffres). Théo orchestre : il valide les priorités, teste, merge et publie.

**La semaine type**

| Quand         | Qui    | Quoi                                                                                                                                             |
| ------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lundi         | Claude | Lance les requêtes de `kpis.sql`, résume les 6 indicateurs du §6, les signalements et les logs d'erreur de la semaine. Propose **une** priorité. |
| Lundi         | Théo   | Valide ou change la priorité (5 min).                                                                                                            |
| Mardi → jeudi | Claude | Développe sur une branche, lint + tests, livre une **checklist de test** courte.                                                                 |
| Vendredi      | Théo   | Teste avec la checklist (idéalement dans une vraie soirée à plusieurs), merge, déploie.                                                          |
| Vendredi      | Claude | Note la version, met à jour la feuille de route (§8).                                                                                            |

**Règles**

- Une priorité par semaine, pas plus. Une idée qui ne fait bouger aucun indicateur du §6 descend en bas de la liste.
- Parler aux joueurs : 5 conversations de 15 min (Discord) avec des gens qui ont arrêté. Une seule question : « qu'est-ce qui t'a fait arrêter ? ».
- Tester avant d'annoncer : une nouveauté visible passe par une vraie soirée avant d'être poussée sur les réseaux.

---

## 8. Feuille de route

### Sprint 1 — Son fiable + salon et `/pro` visibles (branche `fix/audio-et-strategie`)

- [x] Correctifs audio (voir Phase 0).
- [x] Accueil : sous-titre du héros repositionné (« En ligne ou en soirée sur la TV · Sur tes playlists · Gratuit »), bouton « Organiser une soirée » à la place de « Explorer les rooms » (les rooms restent dans le menu).
- [x] Accueil, bloc Mode Salon : lien vers `/pro` pour les bars, assos, entreprises.
- [x] Page `/salon` : lien vers le guide `/pro`.
- [x] Fin de partie sur le téléphone d'un invité : « Ça t'a plu ? Organise ta propre soirée » → `/salon`.

### Sprint 2 — Invité → hôte sans friction ✅

- [x] Parties salon enregistrées (`games.source = 'salon'`, `player_count`, `origin`), hors classements. Migration `20260929_games_salon_stats.sql`.
- [x] Créer un salon sans compte, sur les playlists publiques et officielles (plafond de 50 salons invités simultanés).
- [x] Conversion invité → hôte mesurée (`?ref=invite` → `games.origin = 'invite'`, requête 7 de `kpis.sql`).
- [x] QR code : déjà affiché en permanence dans l'en-tête de l'écran hôte.
- [x] Les retardataires rejoignent un salon déjà lancé (0 point, manche en cours) ou pendant le podium.

### Sprint 3 — SEO « blind test + thème » ✅

- [x] `/blind-test` + 12 pages thème (années 70/80/2000, rap FR/US, rock, chanson française, techno, films, Disney, anniversaire, mariage) : texte propre, artistes réels, FAQ + fil d'Ariane Schema.org, « Lancer en soirée » avec playlist présélectionnée, room officielle.
- [x] Sitemap, colonne dédiée dans le footer, lien depuis `/pro`.
- [ ] Demander à être listé dans les comparatifs (Mukiz, AlternativeTo, blogs) — côté Théo.

### Sprint 4 — Rétention ✅

- [x] Partage Zikle façon Wordle : déjà présent.
- [x] Jeu sans inscription déjà possible ; bouton « Créer un compte gratuit » en fin de partie invité (`/?auth=register`).
- [x] Joueur seul dans une room : copier le lien de la room ou passer au Mode Salon.

### Plus tard

- Vidéos courtes TikTok / Reels (côté Théo : filmer une vraie soirée).
- Partenariats avec des streamers, partie publique du soir à heure fixe.
- Offre payante `/pro` si la demande se confirme.

---

## Limites de cette analyse

- `visit_sources` n'existe que depuis septembre : pas d'historique d'acquisition.
- Les parties salon ne sont pas enregistrées : l'étoile polaire du §6 ne compte que les rooms en ligne tant que le sprint 2 n'est pas fait.
- Les parties « à 0 joueur » peuvent mélanger parties abandonnées et parties sans score.
- La cause des échecs yt-dlp est une hypothèse tant que les nouveaux logs n'ont pas tourné en prod.

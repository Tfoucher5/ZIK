# Pôle Marketing (contenu, marque) — revue v3.32

**Verdict** : on garde, avec retouches. Deux univers justes, « ZIK Soirée » bon nom. Manquent : le « pourquoi c'est mieux » sur `/`, un vocabulaire cohérent, une story qui ramène vraiment du monde.

## Ce qui marche

- `/soiree` compris en 5 s : « La TV diffuse. Les téléphones répondent. » (`soiree/SoireeHero.svelte:14`) + « Rien à installer, aucun compte demandé aux joueurs ».
- `/jouer` : « T'as l'oreille ? Prouve-le. » = vraie voix de marque, tutoiement.
- « ZIK Soirée » nomme le moment, convient au bar comme au salon entre amis (378 salons de 2 à 4 joueurs vs 44 > 12 sur 30 jours).
- Story (#433) ouverte à tous (`salon/phoneView.js:71`), 9:16, zone sûre, neutre en genre.
- Grand QR (#429) au bon moment.

## Problèmes

1. **Important** — story non mesurable : partage vers `SITE_URL` sans `ref` (`client/shareFile.js:11`) ; « zik-music.fr » en 36 px gris (`podiumStory.js:122`) sans appel ; bas de l'image vide.
2. **Important** — au podium, « Partager » en secondaire, « Créer mon compte » en principal (`salon/play/SummaryView.svelte:131-136`), alors qu'on joue sans compte.
3. **Important** — QR via `api.qrserver.com` (`client/salonClient.js:182-183`), sans sonde : panne = QR cassé devant le public.
4. **Important** — « buzzer » double sens : porte soirée « Chaque téléphone sert de buzzer » (`accueil/Doors.svelte:34`) vs « Mode buzzer » Pro (`data/proPlans.js:16`). Le cadrage disait « manette ».
5. **Confort** — H1 de `/` dit quoi, pas pourquoi ; « Gratuit, sans appli » seulement dans le `<title>`.
6. **Confort** — « zik-music.fr/salon/play » se dicte mal dans un bar.
7. **Confort** — phrase partagée plate : « Le podium de notre blind test ZIK Soirée » (`podiumStory.js:137`).

## Propositions

| #   | Proposition                                                                                                     | Impact | Effort |
| --- | --------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| 1   | URL de partage `…/soiree?ref=story`                                                                             | fort   | S      |
| 2   | « Partager le podium » en bouton principal, compte en lien                                                      | fort   | S      |
| 3   | Sur l'image : « Votre revanche ? zik-music.fr/soiree » en 56 px                                                 | fort   | S      |
| 4   | « buzzer » → « manette » sur la porte soirée                                                                    | fort   | S      |
| 5   | Sous le H1 de `/` : « Gratuit, sans appli, sans compte pour jouer. »                                            | moyen  | S      |
| 6   | QR généré en local (supprime la dépendance, permet un QR sur la story)                                          | fort   | M      |
| 7   | (Théo) TV gratuite entre deux parties : « Organisez la vôtre gratuitement, zik-music.fr/soiree », masqué en Pro | fort   | M      |
| 8   | (Théo) nom du lieu sur la story pour les Pro                                                                    | moyen  | M      |
| 9   | (Théo) adresse courte à dicter (`zik-music.fr/j`)                                                               | moyen  | S/M    |

**Noms** : « ZIK Soirée » = produit, « ZIK Pro » = son offre payante (jamais un 3ᵉ univers), le jeu en ligne = « ZIK ».

**Promesses** :

- `/` : « Le blind test qui se joue partout : sur ton téléphone contre les autres, ou sur la TV avec ceux qui sont là. Gratuit, sans appli. »
- Jouer en ligne : « T'as l'oreille ? Prouve-le : rooms par thème, tes playlists Deezer et un classement, gratuit et sans appli. »
- ZIK Soirée : « Votre TV devient un blind test, les téléphones de vos invités font le reste. Sans animateur, sans appli, sans compte. »
- ZIK Pro : « ZIK Soirée sans limite de joueurs, piloté depuis la régie, pour les lieux qui en font un rendez-vous. »

## Questions

- Argent/Produit : `PRO_PERKS` vend « Classement de la soirée et podium final » (`proPlans.js:15`), or le podium existe en gratuit. Corriger le texte ou le produit.
- Tech : QR local rapide ? Sinon sonde sur qrserver.
- Ops : une ligne ZIK sur la TV gratuite serait-elle un argument pour payer ?

_Non vérifié : rendu à l'œil, 390 px, story sur iPhone._

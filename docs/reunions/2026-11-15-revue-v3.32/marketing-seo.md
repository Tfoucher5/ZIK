# Pôle Marketing (SEO) — revue v3.32

**Verdict** : on garde le découpage, il aide le SEO. À régler avant release : trois pages visent « blind test soirée TV », et c'est l'outil `/salon` qui garde la place.

## Ce qui marche

- `/` staging : H1 « Le blind test, en ligne ou en soirée » > slogan prod ; titre couvre les deux recherches ; « blind test » ×13 (prod ×8).
- `/jouer` : vrai titre de recherche, canonical, balisage WebApplication/VideoGame + FAQ de 10.
- `/soiree` : canonical, fil d'Ariane, FAQ, H3 du déroulé, sitemap 1.0.
- Maillage `/blind-test/*` et `/vs/*` gardé (36 à 39 liens internes par page).

## Problèmes

1. **Bloquant SEO** — cannibalisation : `/salon` (`salon/+page.svelte:176`) et `/soiree` (`soiree/+page.svelte:16`) ont des titres quasi identiques, plus `/blind-test/soiree`. `/salon` reste indexée, FAQ de 8, priorité 1.0 (`sitemap.xml/+server.js:35`), ~12 liens internes contre ~6 vers `/soiree`. Google gardera le formulaire, pas la vitrine.
2. **Important** — `static/llms.txt:9,20` parle encore de « Mode Salon » → `/salon`, ni `/jouer` ni `/soiree` (71 visites ChatGPT/semaine).
3. **Important** — H1 sans « blind test » : `/jouer` « T'AS L'OREILLE ? PROUVE-LE. » (`home/HeroSection.svelte:84`), `/soiree` « La TV diffuse. Les téléphones répondent. » (`SoireeHero.svelte:14`).
4. **Important** — `/` perd des signaux : FAQ 11 → 4, texte 1 075 → 621 mots, VideoGame part sur `/jouer`, « multijoueur » 3 → 1, « sans compte » 4 → 1.
5. **Confort (déjà en prod)** — H1 doublé sur les thèmes : « Blind test Soirée blind test pour votre bar » (`blind-test/[theme]/+page.svelte:60`).
6. **Confort** — staging indexable (canonical vers la prod limite le risque).

## Propositions

| #   | Action                                                                                                                                                                                                                                                | Impact    | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| 1   | Une page par intention : `/soiree` seule page « blind test en soirée » (récupère la FAQ de `/salon`) ; `/salon` = outil, titre « Créer une soirée - ZIK Soirée », `noindex`, hors sitemap ; liens de contenu → `/soiree`, boutons d'action → `/salon` | fort      | S      |
| 2   | Réécrire `llms.txt` (ZIK Soirée → `/soiree`, jeu en ligne → `/jouer`)                                                                                                                                                                                 | fort (IA) | S      |
| 3   | H1 avec mot-clé, slogan en sous-titre (`/jouer` « Blind test en ligne, multijoueur et gratuit », `/soiree` « Le blind test en soirée sur la TV »)                                                                                                     | moyen     | S      |
| 4   | `/` : 2-3 questions mixtes de plus + lien texte vers `/blind-test`                                                                                                                                                                                    | moyen     | S      |
| 5   | `noindex` staging + corriger le `replace` des thèmes                                                                                                                                                                                                  | faible    | S      |

Structure : `/` aiguillage (code, portes, texte) · `/jouer` en ligne · `/soiree` soirée TV sans animateur · `/pro` lieux · `/blind-test/*` occasions → `/soiree` · `/salon` outil non indexé.

La place « blind test en soirée sans animateur » est libre dans Google (concurrents = prestations avec animateur).

## Questions

- Pages d'arrivée des 391 visites Google (`admin_traffic_landings`, prod) : si `/` ou `/salon` dominent, la proposition 1 est urgente.
- Produit : liens de contenu vers `/soiree`, `/salon` réservé aux boutons ?
- Tech : `noindex` staging via variable Railway `[DEV]` ?

_Non vérifié : Search Console, classements réels._

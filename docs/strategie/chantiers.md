# Chantiers

Ce qui est en cours et ce qui reste à faire, affiché dans le QG (bloc « Chantiers »). Tenu à jour par Claude à chaque lancement, rendu ou fusion. Une section par chantier, le plus important en haut :

```
## Titre
- **Statut** : en cours | à faire | fait
- **Équipe** : …
- **Prochaine étape** : …
```

Un chantier fini passe en `fait`, puis est retiré à la release suivante.

## Pannes de soirée signalées (compte rendu du 23/11)

- **Statut** : en cours
- **Équipe** : Technique puis Opérations
- **Prochaine étape** : « musique muette sur la TV » (19/11) corrigé et en prod en v3.34.0 (#571, TV rechargée reprend le titre en cours, pause tenue) ; scénario « TV rechargée » ajouté au staging ; « changement de playlist au podium » (21/11, Rom) : pas de bug serveur, la vraie gêne est une playlist de 3 titres pour 5 manches (voir chantier suivant) ; réponse à Rom à envoyer par Théo

## Imports `#lib` (SvelteKit 3)

- **Statut** : fait
- **Équipe** : Technique
- **Prochaine étape** : #586 fusionné le 24/11 : `$lib` (option `alias` dépréciée par kit 3) remplacé par `#lib` dans 416 fichiers, aucun changement visible ; staging déployé, scénario salon vert (run 45356191490) ; part à la prochaine release

## Playlist trop courte pour la partie

- **Statut** : fait
- **Équipe** : Technique
- **Prochaine étape** : en prod en v3.35.0 (24/11) : les manches suivent les titres, alertes à la création et dans la régie ; état « court » non vu en vrai (aucune playlist de moins de 20 titres sur le staging), couvert par les tests ; réponse à Rom à envoyer par Théo

## Release v3.35.0

- **Statut** : fait
- **Équipe** : Opérations
- **Prochaine étape** : en prod le 24/11 à 12 h 50 (nom de la soirée, les manches suivent les titres, un seul magenta sur la TV, Rejoindre sur réseau lent, imports #lib) ; scénario salon 38/38, revue de sécurité sans faille

## Promo

- **Statut** : en cours
- **Équipe** : Marketing
- **Prochaine étape** : carrousel programmé le 19/11 à 18 h ; Feuille de match en brouillon TikTok (date 22/11 18 h), Théo la programme depuis Brouillons ; recommandation du 23/11 : 20 s d'une vraie soirée sur TikTok et Instagram

## Retouches après tests réels

- **Statut** : en cours
- **Équipe** : Produit puis Technique
- **Prochaine étape** : un seul magenta sur la TV sans régie et nom de la soirée sur la story en prod (v3.35.0), story à voir sur un vrai iPhone ; paramètres avancés de soirée (idée de Théo) à cadrer

## Statut micro-entreprise

- **Statut** : à faire
- **Équipe** : Théo
- **Prochaine étape** : reporté par Théo (voir « À trancher »)

## Équipe d'agents et QG

- **Statut** : fait
- **Équipe** : Technique
- **Prochaine étape** : 23/11 : 10 agents (support et juridique ajoutés), skills chefs retirés, QG en console de pilotage (une carte par instance, chronologie, flux filtrable)

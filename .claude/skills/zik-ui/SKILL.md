---
name: zik-ui
description: Règles d'interface de ZIK (DESIGN.md, deux univers Jouer en ligne et ZIK Soirée, écrans TV, régie et téléphone, textes en français, états à prévoir). Utilise ce skill dès que tu crées ou modifies une page, un composant Svelte, du CSS, un texte affiché ou un écran de ZIK Soirée, même pour un petit ajustement visuel.
when_to_use: « refais la page », « ajoute un bouton », « l'écran TV », « la régie », « le téléphone du joueur », « c'est moche sur mobile », « change le texte », tout fichier .svelte ou sous static/css/.
paths:
  - src/**/*.svelte
  - src/**/*.svelte.js
  - static/css/**
---

# Interface ZIK

Les références sont à la racine et dans `docs/design/` :

- `DESIGN.md` : jetons (couleurs, typo, espacements, composants) et règles de la charte. C'est la source de vérité visuelle. Dans le code, les variables CSS de `static/css/theme.css` en sont la traduction : utilise-les, pas des valeurs en dur.
- `docs/design/brief-ecrans.md` : chaque écran cible, son but, son contenu, ses états, et l'arborescence (deux univers, accueil-aiguillage, espace organisateur centré sur le lieu).

Lis la fiche de l'écran concerné dans le brief avant de le toucher.

## Règles

1. **Deux univers, un compte.** Jouer en ligne et ZIK Soirée ont chacun leur navigation et leur profil (profil joueur ou espace organisateur « mon lieu »). Un composant d'un univers n'apparaît pas dans l'autre sans raison.
2. **TV, régie et téléphone n'ont aucune navigation du site.** Ils sont plein écran et ne montrent que ce qui sert à la soirée.
3. **TV** : lisible à 5 m sur 1920×1080, rien d'utile sous 28 px, une seule information forte à la fois, marge de 64 px, aucune mention technique (résolution, synchronisation, latence).
4. **Régie** : les actions de la manche en cours (Révéler, Pause, Manche suivante, Terminer) toujours visibles sans défilement, même en tablette (1024 px). Toute action destructive demande une confirmation.
5. **Téléphone** : 390 px, une colonne, actions dans la moitié basse, zones tactiles d'au moins 44 px. Jamais la réponse ni le média avant la révélation.
6. **Un seul accent magenta par écran**, pour l'action ou l'information principale.
7. **Textes en français**, phrases courtes, tutoiement côté joueurs, vouvoiement côté organisateurs et pages d'offres. Pas de jargon technique. Pas de chiffre, de nom ou de témoignage inventé : une donnée manquante ne s'affiche pas.
8. **États à prévoir** pour chaque écran : chargement, vide, erreur avec action pour réessayer, reconnexion, maintenance annoncée, fonction Pro verrouillée quand c'est pertinent. Message calme, jamais d'erreur brute devant la salle.
9. **Couleur jamais seule** : une équipe, un statut ou une bonne réponse a toujours un libellé.
10. **Conventions du dépôt** : Svelte 5 (runes), pas de framework CSS, CSS global par dossier dans `static/css/<domaine>/` chargé par la page, sinon `<style>` scoped. Moins de 300 lignes par fichier.

## Vérifier

- Contrôle visuel en desktop (1440 px) et mobile (390 px) sur le staging après fusion ; TV en 1920×1080, régie aussi en 1024 px.
- Relis chaque texte affiché : français, sans jargon, sans donnée inventée.
- Compte les éléments magenta à l'écran : un seul.

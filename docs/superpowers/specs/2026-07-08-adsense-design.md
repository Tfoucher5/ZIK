# Intégration AdSense — Design

**Date :** 2026-07-08
**Objectif :** Monétiser ZIK avec des pubs display discrètes, invisibles pour les admins, sans aucun format intrusif, intégrées au design Aurora Glass.

## Contraintes

- **Zéro pub intrusive** : pas d'Auto ads, pas de vignettes plein écran, pas d'ancres collantes. Unités manuelles uniquement.
- **Invisible pour les admins** (`user.profile.role === 'super_admin'`) : ni script Google, ni bannière de consentement, ni pub.
- **Jamais pendant le gameplay** : aucune pub pendant une manche, aucune dans le Mode Salon (TV et téléphone).
- **Zéro layout shift** : hauteur réservée sur chaque emplacement.
- Client AdSense : `ca-pub-6495356963886902`.

## Architecture

### Composant `AdSlot.svelte` (`src/lib/components/`)

- Rend un cadre Aurora Glass discret (bordure `var(--border)`, fond `var(--surface)`) avec label « Publicité » (style tape/Barlow Condensed) et une unité `<ins class="adsbygoogle">` display responsive.
- Props : `slot` (data-ad-slot), `minHeight` (défaut 280px desktop / ajusté mobile).
- `onMount` : `(window.adsbygoogle = window.adsbygoogle || []).push({})` — nécessaire à chaque montage en navigation SPA.
- Ne rend **rien** si : statut auth pas encore résolu, user admin, ou slot ID vide (placeholder non rempli).
- Si l'unité reste vide (unfilled), le cadre se replie (`display:none` via l'attribut `data-ad-status="unfilled"`).

### Chargement du script (`(site)/+layout.svelte`)

- Après résolution de l'auth Supabase : si l'utilisateur n'est **pas** super_admin, injection dynamique de
  `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6495356963886902` (async, crossorigin).
- Les invités et comptes normaux reçoivent le script ; les admins jamais.
- La bannière de consentement RGPD (CMP Google certifiée TCF) est servie par ce même script — aucune intégration supplémentaire côté code.

### Configuration des slots (`src/lib/ads.js`)

```js
export const ADSENSE_CLIENT = "ca-pub-6495356963886902";
export const AD_SLOTS = {
  home: "", // rempli après création des unités dans le dashboard
  content: "", // rooms, classements, playlists, docs, nouveautes
  gameLobby: "",
  gameOver: "",
};
```

Un slot vide ⇒ `AdSlot` ne rend rien (permet de merger avant que les unités existent).

## Emplacements

| Page / moment         | Position                          | Slot      |
| --------------------- | --------------------------------- | --------- |
| Home                  | entre le classement et le footer  | home      |
| /rooms                | sous la liste                     | content   |
| /classements          | sous le tableau                   | content   |
| /playlists            | sous la grille                    | content   |
| /docs                 | bas de page                       | content   |
| /nouveautes           | bas de page                       | content   |
| Jeu — lobby d'attente | encart sous la liste des joueurs  | gameLobby |
| Jeu — game over       | encart sous le tableau des scores | gameOver  |

## RGPD / conformité

- **CMP Google « Privacy & messaging »** activée dans le dashboard AdSense (message RGPD certifié TCF, servi automatiquement aux visiteurs EEE non-admins).
- **Mise à jour `/confidentialite`** section 5 : retirer « aucun cookie de publicité », documenter les cookies publicitaires Google (base légale : consentement), lien vers policies.google.com et le paramétrage du consentement.
- Policy AdSense « écrans sans contenu » : lobby et game over affichent du contenu réel (joueurs, scores) ; les encarts restent secondaires et sous le contenu.

## Guide dashboard AdSense (accompagnement pas à pas)

Phase à faire ensemble dans le dashboard https://adsense.google.com :

1. **Sites → Ajouter le site** `zik-music.fr` (si pas déjà fait) — la validation nécessite le script en place sur le site en prod (le code de cette intégration suffit).
2. **Confidentialité et messages → Message RGPD** : créer et publier le message pour `zik-music.fr` (choix « Consentir / Gérer les options / Refuser »), certifié TCF.
3. **Annonces → Par unité publicitaire → Annonce display** : créer 4 unités responsive :
   - `zik-home`, `zik-content`, `zik-game-lobby`, `zik-game-over`
   - récupérer chaque `data-ad-slot` (10 chiffres) et les coller dans `src/lib/ads.js`.
4. **Annonces → Par site → zik-music.fr** : vérifier que les **Auto ads sont désactivées** (aucun format automatique).
5. Après déploiement : lancer la vérification du site depuis le dashboard (Google crawle et valide sous quelques jours à quelques semaines ; les unités servent des cadres vides d'ici là).

## Test

- Compte non-admin ou invité : bannière consentement au premier chargement, puis pubs dans les emplacements listés.
- Compte super_admin : aucun script `pagead2.googlesyndication.com` dans l'onglet Réseau, aucune bannière, aucun encart.
- Pendant une manche (tous modes) : aucune pub.
- CLS : le cadre réserve sa hauteur, pas de saut au chargement des pubs.

## Inclus également

- `static/ads.txt` : `google.com, pub-6495356963886902, DIRECT, f08c47fec0942fa0` (requis par AdSense, servi à la racine).

## Hors périmètre

- Auto ads, formats ancrés/vignettes.
- Pubs dans le Mode Salon.
- Analytics / mesure de revenus au-delà du dashboard AdSense.

# Client Pro (patron de bar) — revue v3.32

**Verdict** : on garde, mais deux retouches avant la prod (reprise de place sans régie, message « salon complet » au-delà de 12). Le reste donne envie de payer.

## Ce qui marche

- `/soiree` parle à un patron : déroulé heure par heure, « Pour qui », vouvoiement. Meilleure page du lot.
- Prix clairs (`src/lib/data/proPlans.js:28-54`) : un blind test par semaine, le mensuel à 19 € passe sans réfléchir.
- Reprise de soirée (`setup/ResumeSalon.svelte:19-25`) : si l'ordi plante, on ne repart pas de zéro.
- Grand QR entre deux parties (#429) : les retardataires scannent sans demander le code.
- « Faites un essai avec deux téléphones avant le jour J » sur `/soiree`.

## Problèmes

1. **Bloquant** — reprise de place seulement via la régie : la demande part vers `salon:ctrl` (`server/socket/salon/reclaim.js:19`), la TV est dans `salon:screens` (`join.js:60`). TV seule (fréquent en bar) : le client attend « L'hôte doit confirmer sur la régie » (`play/JoinForm.svelte:26`) pour rien. `/soiree` promet pourtant qu'un joueur retrouve sa place.
2. **Important** — « Le salon est complet. » (`join.js:187`) : le 13ᵉ joueur gratuit ne sait pas que c'est une limite d'offre, l'organisateur n'est pas alerté.
3. **Important** — « Bientôt dans ZIK Pro » dans l'upsell (`setup/ProUpsell.svelte:30`) : on paie ce qui existe, pas des promesses.
4. **Confort** — `/` reste orienté joueurs (Zikle, ELO, succès) ; texte sous la porte soirée parle rooms et Deezer, lien Pro noyé.
5. **Confort** — conseil 4G/5G seulement dans la FAQ ; c'est le vrai risque avec 60 personnes sur le Wi-Fi.

## Propositions

| Proposition                                                                                                | Impact | Effort |
| ---------------------------------------------------------------------------------------------------------- | ------ | ------ |
| Demande de reprise affichée sur la TV sans régie, ou rendue automatiquement après confirmation du pseudo   | fort   | M      |
| 13ᵉ joueur : « Soirée pleine (version gratuite), prévenez l'organisateur » + alerte TV/régie avec lien Pro | fort   | S      |
| Retirer « Bientôt » de l'upsell (ou le mettre sur /pro)                                                    | moyen  | S      |
| Conseil Wi-Fi / 4G dans la préparation                                                                     | moyen  | S      |
| Sur `/`, « Bar, camping, entreprise : ZIK Pro » à côté de la porte soirée                                  | faible | S      |

## Questions

- Tech : la TV peut-elle recevoir les reprises ? Mesure réelle à 60 téléphones sur Wi-Fi de bar ?
- Produit : les clients Pro utilisent-ils la régie ou la TV seule ?
- Argent : combien de salons gratuits ont buté sur la limite de 12 la semaine dernière ?

_Non vérifié : aucune partie réelle, écrans en jeu lus dans le code._

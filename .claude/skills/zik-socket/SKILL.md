---
name: zik-socket
description: Règles et gabarits pour tout code temps réel de ZIK (Socket.io, ZIK Soirée, salons, TV, régie, téléphones, rooms en ligne). Utilise ce skill dès que tu crées, modifies ou débogues un handler Socket.io, l'état d'un salon, un chrono, un score, une reconnexion ou ce qui est envoyé aux écrans, même pour un petit correctif.
when_to_use: « ajoute un événement socket », « bug dans le salon », « le buzzer », « la régie ne reçoit pas », « reconnexion », « score faux », tout fichier sous src/lib/server/socket/.
paths:
  - src/lib/server/socket/**
  - src/lib/components/salon/**
  - src/lib/components/game/**
  - server.js
---

# Temps réel ZIK

Le serveur Socket.io fait tourner des soirées en public chez des clients payants. Tout le monde dans la salle voit une erreur. Chaque règle ci-dessous vient d'un incident réel ou d'une faille trouvée à l'audit du 02/11/2026 (`docs/audit/2026-11-02-audit.md`).

## Où est quoi

- `server.js` : serveur HTTP, Socket.io, tâches planifiées.
- `src/lib/server/socket/salon/` : ZIK Soirée. Point d'entrée `index.js`, un fichier par domaine (`join`, `rounds`, `answers`, `buzzer`, `control`, `timers`, `media`, `persist`, `players`…).
- `src/lib/server/socket/game/` : rooms en ligne.
- `src/lib/server/state.js` : `salonRooms` (sur `globalThis.__zik_salonRooms`), `setIO`, `getIO`.
- Salles Socket.io d'un salon : `salon:<code>` (tout le monde), `salon:screens:<code>` (TV), `salon:ctrl:<code>` (régie), `salon:players:<code>` (téléphones).

## Les règles, et pourquoi

1. **Chaque handler passe par `safe(socket, nom, schema, fn)`** (`src/lib/server/socket/safe.js`). Une exception non attrapée dans un handler fait tomber tout le process Node, donc toutes les soirées en cours. Ça a été reproduit avec un simple `{ guess: 42 }`. Si `safe.js` n'existe pas encore (phase 0), crée-le d'après `references/safe.md`.
2. **Chaque payload est validé par un schéma** avant usage : types, longueurs, entiers bornés, énumérations. Ne fais jamais `x.slice()` ou `x.trim()` sur une valeur venue du client sans avoir vérifié que c'est une chaîne.
3. **Le serveur est la seule source de vérité.** Chrono = heure de fin calculée côté serveur (`endsAt`), scores, phase, joueurs. Un client ne décide jamais d'un score.
4. **Les téléphones ne reçoivent jamais la réponse ni le média.** Rien de `videoId`, `audioUrl`, titre, artiste ou pochette vers `salon:players:*` avant `salon_round_end`. Le média part vers `salon:screens:*`, uniquement pour un écran qui a présenté la clé de régie.
5. **Un joueur parti reste compté.** Quand un joueur est retiré (déconnexion plus longue que le délai de grâce), garde-le dans `salon.departed` avec son score, son équipe et son `userId`. Inclus-le dans `recordSalonPlayers`, le classement de soirée et l'historique, marqué « parti ».
6. **L'état d'un salon est sérialisable.** Tout nouveau champ d'état doit survivre à l'instantané (écrit à chaque changement de phase et sur `SIGTERM`, relu au démarrage) : pas de timer, de socket ni de fonction dedans. Range ces objets non sérialisables dans des champs préfixés `_`, que le sérialiseur ignore, et ajoute le champ au test d'instantané.
7. **Aucun appel YouTube côté serveur pendant une partie.** Les vidéos sont résolues à l'import des playlists et lues dans `tracks.video_cache_*`. Repli : extrait Deezer. Si rien ne joue, la partie attend (`outage.js`) et ne saute jamais de titres en rafale.
8. **Débit** : en plus de l'anti-spam par réponse (300 ms), un plafond d'événements par socket. Un client qui boucle ne doit pas saturer la boucle d'événements.
9. **Rien de bloquant dans un handler** : pas de `execFileSync`, pas de gros calcul synchrone, pas d'attente réseau dans le chemin d'une manche.
10. **Les écritures en base se font en fin de partie**, groupées, avec `getAdminClient()`, et ne bloquent jamais le déroulé d'une manche (fire-and-forget avec journalisation de l'erreur).

## Ajouter ou modifier un handler

1. Écris le schéma du payload.
2. Enregistre le handler avec `safe(socket, "nom_evenement", schema, async (data, ack) => { … })`, dans le fichier du bon domaine.
3. Vérifie le rôle de l'émetteur (`socket.salonRole`, `socket.salonAdmin`, `requirePro`) avant toute action de régie.
4. Émets vers la bonne salle, avec le minimum de données. Repasse la règle 4.
5. Ajoute ses tests : cas normal, entrées hostiles, et instantané si l'état change. Gabarits dans `references/tests.md`.

## Avant de dire « c'est fini »

- `npx vitest run src/lib/server/socket` est vert.
- Le test d'entrées hostiles du handler existe et passe.
- Aucun envoi vers `salon:players:*` ne contient de média ou de réponse : `grep -n "salon:players" -r src/lib/server/socket`, et relis chaque `emit`.

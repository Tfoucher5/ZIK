# Spec — Bot Discord ZIK

**Date :** 2026-06-23  
**Status :** Approuvé — en attente d'implémentation  
**Périmètre :** Pilier 1 (Auth Discord), Pilier 2 (Slash commands), Pilier 5 (Blind test vocal)

---

## 1. Architecture globale

### Repo séparé `zik-discord-bot`

Le bot est un **processus Node.js indépendant** de l'app SvelteKit ZIK. Il communique avec Supabase via la service role key. Il n'a pas accès au state Socket.io du serveur principal.

```
zik-discord-bot/
├── src/
│   ├── index.js                # Entrée : client Discord, event handlers
│   ├── deploy-commands.js      # Script one-shot : enregistre les slash commands
│   ├── commands/
│   │   ├── stats.js            # /stats [@player]
│   │   ├── classement.js       # /classement [room] [mode]
│   │   ├── rooms.js            # /rooms [recherche]
│   │   ├── link.js             # /link
│   │   ├── zik-start.js        # /zik-start [playlist] [rounds]
│   │   ├── zik-stop.js         # /zik-stop
│   │   └── zik-skip.js         # /zik-skip
│   └── lib/
│       ├── supabase.js         # Client Supabase (service role)
│       ├── embeds.js           # Builders embed Discord réutilisables
│       ├── audio.js            # Streaming audio @discordjs/voice
│       ├── game-engine.js      # State management + logique blind test Discord
│       └── normalize.js        # Normalisation + Levenshtein pour validation réponses
├── .env
└── package.json
```

**Dépendances principales :**
- `discord.js` v14
- `@discordjs/voice`
- `@discordjs/opus` (codec audio)
- `ffmpeg-static` (transcoding audio)
- `@supabase/supabase-js`

**Hébergement :** Railway (même plateforme que le site ZIK), service dédié, process persistant 24/7.

### Variables d'environnement

**Côté bot (`zik-discord-bot`) :**
```env
DISCORD_TOKEN
DISCORD_CLIENT_ID
DISCORD_GUILD_ID
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ZIK_BASE_URL=https://www.zik-music.fr
```

**Côté ZIK web (à ajouter dans Railway + `.env`) :**
```env
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
# DISCORD_REDIRECT_URI géré par Supabase Dashboard
```

---

## 2. Migrations Supabase

### Table `profiles` — nouvelles colonnes

```sql
ALTER TABLE public.profiles
  ADD COLUMN discord_id       text UNIQUE,
  ADD COLUMN discord_username text,
  ADD COLUMN discord_avatar   text,   -- hash avatar Discord (ex: "abc123")
  ADD COLUMN discord_games_played int NOT NULL DEFAULT 0;
```

### Table `games` — nouvelle colonne

```sql
ALTER TABLE public.games
  ADD COLUMN source text NOT NULL DEFAULT 'web';
-- 'web' pour les parties normales, 'discord' pour les parties bot
```

### Trigger — copie discord_id vers profiles

Après qu'un utilisateur lie son Discord via Supabase OAuth, on extrait son `discord_id` depuis `auth.identities` et on le copie dans `profiles` :

```sql
CREATE OR REPLACE FUNCTION public.sync_discord_identity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.provider = 'discord' THEN
    UPDATE public.profiles
    SET
      discord_id       = NEW.identity_data->>'provider_id',
      discord_username = NEW.identity_data->>'full_name',
      discord_avatar   = NEW.identity_data->>'avatar_hash'
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_discord_identity
  AFTER INSERT ON auth.identities
  FOR EACH ROW EXECUTE FUNCTION public.sync_discord_identity();
```

### Nouvelle RPC `update_player_stats_discord`

Pour les parties Discord : XP gagné + compteur dédié, **sans impact sur ELO ni `games_played`**.

```sql
CREATE OR REPLACE FUNCTION public.update_player_stats_discord(
  p_user_id uuid,
  p_score   int
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_xp_gain int;
BEGIN
  -- XP proportionnel au score (même logique que les parties web)
  v_xp_gain := GREATEST(1, p_score / 10);

  UPDATE public.profiles
  SET
    discord_games_played = discord_games_played + 1,
    total_score          = total_score + p_score,
    xp                   = xp + v_xp_gain,
    level                = GREATEST(1, FLOOR(POWER((xp + v_xp_gain) / 100.0, 0.6))::int)
  WHERE id = p_user_id;
END;
$$;
```

---

## 3. Auth Discord — Connexion complète via Supabase

### Principe

Discord est ajouté comme **provider OAuth natif Supabase** (exactement comme Google). Cela permet deux cas d'usage :

1. **Nouveau compte** : l'utilisateur crée son compte ZIK directement en se connectant avec Discord
2. **Compte existant** : l'utilisateur lie son Discord à son compte ZIK déjà existant (`supabase.auth.linkIdentity`)

### Côté Supabase Dashboard

- Activer le provider "Discord" dans Authentication > Providers
- Renseigner `Client ID` et `Client Secret` de l'app Discord
- Redirect URL : `https://[project].supabase.co/auth/v1/callback`
- Scopes : `identify email guilds.join`

### Côté ZIK web

**Bouton "Se connecter avec Discord"** ajouté sur la page de connexion (AuthModal) et la page `/settings` :

```js
// Connexion / inscription avec Discord
await supabase.auth.signInWithOAuth({ provider: 'discord' })

// Liaison d'un compte existant (depuis /settings, user déjà connecté)
await supabase.auth.linkIdentity({ provider: 'discord' })
```

**Section Discord dans `/settings` :**
- Si non lié → bouton "Connecter mon Discord"
- Si lié → affichage `discord_username`, avatar Discord miniature, bouton "Délier" (si au moins une autre méthode de connexion existe — on n'autorise pas à supprimer la seule méthode d'auth)

**Déliaison :** `supabase.auth.unlinkIdentity(identity)` + mise à jour `profiles` (efface `discord_id`, `discord_username`, `discord_avatar`).

### Invitation automatique au serveur Discord ZIK

Optionnel, activable lors du linking : appel Discord API `PUT /guilds/{GUILD_ID}/members/{discord_id}` avec le `access_token` Discord récupéré pendant le flow OAuth. L'utilisateur est automatiquement ajouté au serveur ZIK.

---

## 4. Slash Commands

### `/link`

**Réponse :** ephemeral  
**But :** générer un lien pour lier son compte Discord à ZIK depuis Discord.

```
🔗 Lie ton compte Discord à ZIK !
──────────────────────────────────────
Une fois lié, /stats et /classement afficheront
tes vraies stats et tu pourras gagner de l'XP
en jouant via le bot.

[Bouton : Lier mon compte ZIK →]
(lien : https://zik-music.fr/settings?discord=link)
```

La page `/settings` avec le paramètre `?discord=link` scroll automatiquement vers la section Discord et déclenche le flow OAuth si l'utilisateur est connecté à ZIK.

---

### `/stats [@joueur]`

**Réponse :** publique  
**But :** afficher les stats ZIK d'un joueur. Sans argument = soi-même.

Si le compte Discord n'est pas lié à un compte ZIK → message d'erreur ephemeral : "Ce compte Discord n'est pas lié à ZIK. Tape `/link` pour lier le tien !"

**Embed avec pagination (3 pages via boutons Précédent/Suivant) :**

**Page 1 — Général**
```
┌─────────────────────────────────────────┐
│  [avatar ZIK]   🎵 Stats ZIK de Theo    │
│                                         │
│  ⚡ ELO          1 342                  │
│  🏅 Niveau       12 · 4 200 XP          │
│  🎮 Parties      87                     │
│  🏆 Score total  142 800                │
│  🎮 Parties Discord  14                 │
│                                         │
│  [couleur embed selon ELO]              │
│  ─────────────────────────              │
│  🔗 zik-music.fr/user/username          │
└─────────────────────────────────────────┘
  [◀ Précédent]  [1/3 Général]  [Suivant ▶]
```

Couleur embed selon ELO :
- `< 1100` → gris `#95a5a6`
- `1100–1300` → bleu `#3498db`
- `1300–1500` → violet `#7c3aed`
- `> 1500` → or `#f1c40f`

**Page 2 — Mode Classique**
```
│  🎮 Mode Classique                      │
│                                         │
│  Parties jouées   52                    │
│  Score moyen      1 634                 │
│  Meilleur score   4 200                 │
│  Top rang obtenu  🥇 1er                │
```
*(données depuis game_players filtrées sur mode='classic')*

**Page 3 — Mode QCM**
```
│  ❓ Mode QCM                            │
│                                         │
│  Parties jouées   21                    │
│  Score moyen      7 200                 │
│  Meilleur score   9 800                 │
│  Top rang obtenu  🥈 2ème               │
```

---

### `/classement [room] [mode]`

**Réponse :** publique  
**Options :**
- `room` (optionnel) : code de la room (ex: `RXKP2A`)
- `mode` (optionnel) : `classique` | `qcm` | `discord`

**Sans arguments** → classement hebdo global (`weekly_leaderboard()`)  
**Avec `room`** → classement de la room (`weekly_leaderboard_by_room(room)`)  
**Avec `mode`** → filtre les parties selon le mode (nécessite que `weekly_leaderboard` supporte un paramètre mode, à ajouter)

**Embed :**
```
┌─────────────────────────────────────────┐
│  🏆 Classement ZIK — Semaine du 23 juin │
│  Mode : Classique                        │
│                                         │
│  🥇  Theo          18 400 pts           │
│  🥈  AliceM        15 200 pts           │
│  🥉  Razer93       12 800 pts           │
│  4️⃣   JohnDoe       11 400 pts           │
│  5️⃣   Music_Geek     9 900 pts           │
│  ...                                    │
│                                         │
│  Footer: Mis à jour le 23/06 à 14:32    │
└─────────────────────────────────────────┘
  [◀ Précédent]  [Page 1/2]  [Suivant ▶]
```

---

### `/rooms [recherche]`

**Réponse :** publique  
**But :** lister les rooms actives avec lien direct. Option de recherche par nom.

**Critère "active" :** `rooms.is_public = true` et `rooms.last_active_at > now() - interval '10 minutes'`

**Sans argument :**
```
┌─────────────────────────────────────────┐
│  🎮 Rooms actives sur ZIK               │
│                                         │
│  🎵 Rock Classics     CODE: RXKP2A      │
│     👥 3 joueurs · Classique            │
│     [Rejoindre →]                       │
│                                         │
│  🎸 Pop 2000s         CODE: MPZ8TK      │
│     👥 1 joueur · QCM                   │
│     [Rejoindre →]                       │
│                                         │
│  🎵 Anime OST         CODE: KLW3NQ      │
│     👥 5 joueurs · Classique            │
│     [Rejoindre →]                       │
│                                         │
│  [Voir toutes les rooms sur ZIK →]      │
└─────────────────────────────────────────┘
  [◀ Précédent]  [Page 1/3]  [Suivant ▶]
```

Chaque bouton "Rejoindre →" ouvre `https://zik-music.fr/game?room=CODE`.

**Avec `recherche: rock` :**  
Filtre `ILIKE '%rock%'` sur le nom. Si 0 résultats → "Aucune room active avec ce nom."

**Note :** le nombre de joueurs en temps réel n'est pas accessible depuis le bot (state en mémoire du serveur ZIK). Afficher uniquement nom, emoji, code, mode de la room. Le champ `last_active_at` suffit pour savoir si une partie est en cours.

---

## 5. Blind Test Vocal — Pilier 5

### Vue d'ensemble

Jeu **non-classé** : XP gagné, `discord_games_played` incrémenté, **aucun impact sur l'ELO**. Mode classique uniquement. Maximum 1 partie par serveur Discord à la fois.

### Commandes

| Commande | Description |
|---|---|
| `/zik-start [playlist] [rounds]` | Lance une partie (défaut: 10 rounds, max: 20) |
| `/zik-stop` | Arrête la partie en cours (hôte ou admin serveur) |
| `/zik-skip` | Vote pour passer le round actuel (≥ 50% des joueurs) |

---

### Phase 1 — Lobby et sélection playlist

**1. L'utilisateur lance `/zik-start` dans un canal texte**

Le bot vérifie :
- L'utilisateur est dans un vocal → sinon erreur ephemeral "Tu dois être dans un salon vocal !"
- Pas de partie déjà en cours dans ce serveur → sinon erreur

**2. Sélection de la playlist**

Si `/zik-start` sans argument `playlist` → le bot répond avec un **Select Menu** :

```
┌─────────────────────────────────────────┐
│  🎵 Choisis ta playlist                 │
│                                         │
│  [Dropdown ▾]                           │
│  ⭐ Rock Classics       (42 titres)     │  ← officielles en premier
│  ⭐ Pop 2000s           (35 titres)     │
│  ⭐ Anime OST           (28 titres)     │
│  ──────────────────────                 │
│  🎵 Ma playlist perso  (12 titres)     │  ← publiques ensuite
│  🎵 Hip Hop FR         (20 titres)     │
└─────────────────────────────────────────┘
```

Le Select Menu Discord supporte 25 options max. Si plus de 25 playlists publiques, afficher les officielles + les 25 - N premières publiques triées par `track_count` DESC.

Si `/zik-start playlist:Rock` → recherche directe `ILIKE '%Rock%'` dans les playlists publiques/officielles.

**3. Création du thread de partie**

Le bot crée un **thread temporaire** dans le canal courant :
```
Nom du thread : "🎮 Blind Test — Rock Classics"
Auto-archive : 60 minutes
```

Le bot poste dans le thread :
```
┌─────────────────────────────────────────┐
│  🎮 Blind Test — Rock Classics          │
│  10 rounds · Mode Classique             │
│                                         │
│  Participants détectés dans le vocal :  │
│  @Theo @Alice @Razer                    │
│                                         │
│  ⚠️ Réponds aux réponses en DM au bot ! │
│  Active tes DMs si besoin.              │
│                                         │
│  ⏱️ Démarrage dans 60s ou quand tous   │
│  les joueurs sont prêts.               │
│                                         │
│  0/3 prêts                             │
│  [✅ Je suis prêt !]                   │
└─────────────────────────────────────────┘
```

Le bot DM chaque membre du vocal pour vérifier l'accessibilité :
> "🎮 Partie de Blind Test en cours sur **[Nom du serveur]** ! Réponds ici pendant la partie pour que personne ne voie ta réponse. Tu es prêt ?"

Si le DM échoue (DMs désactivés) → bot poste dans le thread :
> "⚠️ @Joueur — Je ne peux pas t'envoyer de DM. Active les DMs du serveur dans tes paramètres de confidentialité pour participer !"

**4. Démarrage**

- Dès que tous les joueurs valides (DMs ok + bouton "Prêt") cliquent → partie démarre
- Ou au bout de 60 secondes avec les joueurs qui ont cliqué (minimum 1 joueur)
- Le bot rejoint le vocal

---

### Phase 2 — Déroulement d'un round

**Séquence d'un round :**

```
1. Embed dans le thread (édité à chaque round) :

┌─────────────────────────────────────────┐
│  🎵 Round 3 / 10                        │
│                                         │
│  🎧 Écoute et envoie ta réponse en DM ! │
│  ⏱️ 30 secondes                         │
│                                         │
│  Scores actuels :                       │
│  🥇 Theo    72 pts                      │
│  🥈 Alice   58 pts                      │
│  🥉 Razer   43 pts                      │
└─────────────────────────────────────────┘

2. Bot stream l'audio dans le vocal (preview_url via @discordjs/voice)
   createAudioResource(previewUrl, { inputType: StreamType.Arbitrary })

3. Chaque joueur répond en DM au bot

4. Validation de chaque réponse (normalize.js) :
   - toLowerCase()
   - Suppression accents (NFD + regex)
   - Suppression ponctuation
   - Levenshtein distance ≤ 2 entre la réponse et le titre ET/OU l'artiste

5. Quand un joueur trouve → bot poste dans le thread :
   "✅ Theo a trouvé ! 1/3 joueurs ✅"
   "✅ Alice a trouvé ! 2/3 joueurs ✅"
   (sans révéler la réponse)

6. Fin du round (tous ont trouvé OU 30s écoulées) :
   → Bot arrête l'audio
   → Révélation dans le thread :
   "🎵 C'était Bohemian Rhapsody — Queen !
    +8 pts Theo · +5 pts Alice · Razer n'a pas trouvé"
   → Mise à jour du scoreboard

7. Pause 4 secondes → round suivant
```

**Calcul des points par round :**
- Réponse correcte : `10 - floor(secondes_écoulées / 3)`, minimum 1 point
- Premier à trouver dans le round : aucun bonus supplémentaire (non-compétitif)
- Pas de réponse dans le temps : 0 point

**Validation :** titre seul OU artiste seul OU "artiste - titre" sont tous acceptés.

---

### Phase 3 — Fin de partie

**Embed récapitulatif dans le thread :**

```
┌─────────────────────────────────────────┐
│  🏆 Résultats — Blind Test Discord      │
│  Playlist : Rock Classics (10 rounds)   │
│  Durée : 6 min 42 sec                   │
│                                         │
│  🥇 Theo    72 pts   (+142 XP)          │
│  🥈 Alice   58 pts   (+114 XP)          │
│  🥉 Razer   43 pts   (+85 XP)           │
│                                         │
│  XP gagnée uniquement (aucun impact ELO)│
└─────────────────────────────────────────┘
```

**Enregistrement BDD :**

```js
// 1. Insert dans games
const { data: game } = await supabase.from('games').insert({
  room_id: `discord:${guildId}`,
  source: 'discord',
  mode: 'classic',
  rounds: totalRounds,
  started_at: state.startedAt,
  ended_at: new Date().toISOString(),
}).select().single()

// 2. Insert dans game_players (un par joueur)
await supabase.from('game_players').insert(
  players.map((p, i) => ({
    game_id: game.id,
    user_id: p.zikUserId || null,         // null si compte non lié
    username: p.discordUsername,
    score: p.score,
    rank: i + 1,
    is_guest: !p.zikUserId,
  }))
)

// 3. Update stats pour les comptes liés seulement
for (const p of players.filter(p => p.zikUserId)) {
  await supabase.rpc('update_player_stats_discord', {
    p_user_id: p.zikUserId,
    p_score: p.score,
  })
}
```

**Nettoyage :**
- Bot quitte le vocal
- Thread auto-archivé (60 min, configuré à la création)

---

### State management en mémoire (bot)

```js
// Map<guildId, GameState> — une seule partie par serveur à la fois
const activeGames = new Map()

// Structure GameState
{
  hostId: 'discord_user_id',
  threadId: 'channel_id',
  voiceChannelId: 'channel_id',
  voiceConnection: VoiceConnection,
  audioPlayer: AudioPlayer,
  players: Map<discordUserId, {
    discordUsername: string,
    zikUserId: string | null,   // null si compte non lié
    score: number,
    dmChannel: DMChannel,
    hasAnswered: boolean,       // reset à chaque round
  }>,
  tracks: ShuffledTrack[],
  currentRound: number,
  totalRounds: number,
  skipVotes: Set<discordUserId>,
  roundTimeout: NodeJS.Timeout | null,
  startedAt: Date,
  globalTimeout: NodeJS.Timeout,  // 90 min max
}
```

---

### Edge cases

| Situation | Comportement |
|---|---|
| Bot expulsé du vocal | Partie arrêtée, BDD sauvegardée jusqu'au round en cours |
| Hôte quitte le vocal | Partie continue, n'importe quel autre joueur peut `/zik-stop` |
| Tous les joueurs quittent | Partie arrêtée après 60s d'inactivité |
| Preview URL inaccessible | Round passé automatiquement avec message "⚠️ Audio indisponible, round ignoré" |
| DMs désactivés par un joueur | Joueur exclu des participants, signalé dans le thread au lancement |
| Timeout global 90 min | Partie arrêtée proprement, BDD sauvegardée |
| `/zik-skip` vote | Si ≥ 50% des joueurs votent → round passé, aucun point attribué, réponse révélée |

---

## 6. Ordre d'implémentation

```
Phase 1 — Fondations BDD & Auth (côté ZIK web)
  → Migration : colonnes discord_id, discord_username, discord_avatar, discord_games_played
  → Migration : games.source
  → Trigger sync_discord_identity
  → RPC update_player_stats_discord
  → Supabase Dashboard : activer provider Discord
  → AuthModal ZIK : bouton "Se connecter avec Discord"
  → Settings ZIK : section liaison/déliaison Discord

Phase 2 — Bot : setup + commandes statiques
  → Repo zik-discord-bot, setup discord.js, Railway
  → /link
  → /stats avec pagination 3 pages
  → /classement avec filtres mode
  → /rooms avec recherche + pagination

Phase 3 — Bot : Blind Test Vocal
  → /zik-start : lobby + sélection playlist + thread + DM check
  → game-engine.js : state, rounds, audio streaming, validation
  → /zik-skip
  → /zik-stop
  → Enregistrement BDD fin de partie + update_player_stats_discord
  → Tests E2E sur serveur Discord de test
```

---

## 7. Points ouverts (à décider à l'implémentation)

- **RPC `weekly_leaderboard` avec filtre mode** : actuellement sans paramètre mode. À voir si on ajoute `p_mode text DEFAULT NULL` ou si on crée une RPC dédiée pour les stats Discord.
- **Nombre de rooms dans `/rooms`** : 5 par page semble correct mais dépend du volume réel de rooms actives simultanément.
- **XP Discord dans `/stats` page 1** : afficher `discord_games_played` dans la page Général est retenu — les stats de score par partie Discord (score moyen, meilleur score) peuvent être ajoutées en page 2 ou 3 dans une version future.
- **Avatar Discord dans le thread de partie** : les embeds de jeu peuvent inclure l'avatar Discord du joueur dans le scoreboard pour l'identité visuelle. Non prioritaire pour la v1.

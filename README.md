# ZIK. 🎵

> Blind test multijoueur en temps réel — trouve les titres avant tout le monde.

---

## 📑 Sommaire

- [Présentation](#-présentation)
- [Fonctionnalités](#-fonctionnalités)
- [Stack Technique](#-stack-technique)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Roadmap](#-roadmap)
- [Contribution](#-contribution)
- [Développeur](#-développeur)

---

## 📝 Présentation

**ZIK.** est une application web de **blind test multijoueur** en temps réel.

Les joueurs rejoignent une room, écoutent des extraits musicaux et tentent de trouver **l'artiste** et le **titre** le plus vite possible. Plus vite tu trouves, plus tu marques de points. Un système de classement ELO et hebdomadaire suit ta progression.

---

## ✨ Fonctionnalités

### 🎮 Gameplay
- Blind test **multijoueur synchronisé** (Socket.IO)
- Détection intelligente des réponses : similarité phonétique, accents, fautes de frappe
- Support des **artistes en featuring** (slots dynamiques)
- Timer par manche avec bonus de vitesse
- **Rooms officielles** curées + rooms personnalisées
- Rooms éphémères (4h) et rooms persistantes en base

### 🎵 Playlists
- Création et gestion de playlists personnalisées
- Import depuis **Spotify** (lien de playlist)
- Import depuis **Deezer** (lien de playlist)
- Playlists publiques ou privées
- Playlists officielles curées par l'équipe

### 🏆 Compétition
- Système de **points** avec bonus de vitesse
- **Classement ELO** all-time
- **Classement hebdomadaire**
- Meilleurs scores par room sur le profil

### 👤 Profil & Auth
- Inscription email / mot de passe
- Connexion **Google OAuth**
- Jeu en mode **invité** (score non sauvegardé)
- Profil avec avatar, pseudo, stats et historique
- Paramètres : animations, volume par défaut

### 📱 Interface
- Design **dark mode** natif
- **Responsive mobile** — layout optimisé touch avec bouton de validation
- Rooms publiques browsables + rejoindre par code
- Navigation fluide avec animations

---

## 🛠️ Stack Technique

| Couche | Techno |
|---|---|
| **Serveur** | Node.js + Express |
| **Temps réel** | Socket.IO |
| **Base de données** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (email + Google OAuth) |
| **Musique** | YouTube IFrame API (lecture) |
| **Import playlists** | Spotify Web API + Deezer API |
| **Frontend** | Vanilla JS, HTML, CSS (no framework) |
| **Déploiement** | Vercel (frontend) + serveur Node dédié |

---

## 🏗️ Architecture

```
/
├── server.js              # Serveur Express + Socket.IO + logique de jeu
├── public/
│   ├── css/               # Styles par page (home, game, playlists, rooms…)
│   └── js/                # Scripts par page + game.js (client Socket.IO)
├── views/                 # Pages HTML
│   ├── index.html         # Accueil
│   ├── game.html          # Interface de jeu
│   ├── rooms.html         # Browsing des rooms
│   ├── playlists.html     # Gestion des playlists
│   ├── profile.html       # Profil utilisateur
│   └── settings.html      # Paramètres
└── supabase_schema.sql    # Schéma de la base de données
```

### Logique de jeu (server.js)
- `roomGames{}` — état en mémoire de chaque partie
- `buildTrack()` — normalise un titre (artiste, feat, titre, cleanString)
- `parseFeaturing()` — extrait l'artiste principal et les featurings
- `cleanString()` — normalise pour comparaison (accents, ponctuation)
- `displayString()` — nettoie pour affichage (retire les parenthèses)
- `submit_guess` — vérifie une réponse (similarité Dice + wordMatch)
- `endRound()` — termine la manche, envoie les résultats, passe à la suivante

---

## 🚀 Installation

### Prérequis
- Node.js >= 18
- Compte [Supabase](https://supabase.com)
- Credentials Spotify API (pour l'import de playlists)

### Setup

```bash
# 1. Cloner le repo
git clone https://github.com/Tfoucher5/ZIK
cd ZIK

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Remplir SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
# SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, ADMIN_USER_ID

# 4. Appliquer le schéma Supabase
# Importer supabase_schema.sql dans ton projet Supabase

# 5. Lancer le serveur
node server.js
# ou en dev :
npm run dev
```

### Variables d'environnement

| Variable | Description |
|---|---|
| `SUPABASE_URL` | URL de ton projet Supabase |
| `SUPABASE_ANON_KEY` | Clé publique Supabase |
| `SPOTIFY_CLIENT_ID` | Client ID de ton app Spotify |
| `SPOTIFY_CLIENT_SECRET` | Secret de ton app Spotify |
| `ADMIN_USER_ID` | UUID Supabase de l'admin (accès super_admin) |

---

## 📈 Roadmap

### ✅ V1 — Implémenté
- [x] Auth email + Google OAuth
- [x] Rooms officielles et personnalisées
- [x] Gameplay temps réel (Socket.IO)
- [x] Import Spotify / Deezer
- [x] Featurings multiples
- [x] Classements ELO + hebdomadaire
- [x] Profil avec stats et meilleurs scores
- [x] Mode invité
- [x] Rooms éphémères et persistantes
- [x] Responsive mobile + bouton de validation

### 🚧 V1.1 — En cours
- [ ] Notifications en jeu (son, vibration mobile)
- [ ] Statistiques détaillées par room
- [ ] Mode spectateur

### 🔮 Idées futures
- [ ] Application mobile native (PWA)
- [ ] Tournois et brackets
- [ ] Mode solo (entraînement)
- [ ] Intégration Apple Music

---

## 🤝 Contribution

Le projet est ouvert aux suggestions et rapports de bugs via les **Issues GitHub**.

Un serveur Discord est prévu — lien à venir.

---

## 👨‍💻 Développeur

**Théo Foucher** — parce qu'il kiffe la **ZIK.**

> *"Développé avec Node.js, Supabase, et beaucoup trop de musique en fond."*

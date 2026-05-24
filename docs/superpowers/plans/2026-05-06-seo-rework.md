# SEO Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter un SEO moderne et LLM-first sur ZIK — contenu indexable, pages de comparaison, metas enrichies, sitemap.

**Architecture:** Modifications purement HTML/contenu dans les `<svelte:head>` et sections textuelles des pages existantes + création de 3 pages de comparaison statiques + sitemap dynamique. Aucune logique serveur nouvelle sauf pour le sitemap.

**Tech Stack:** SvelteKit 5 (Svelte 5 runes), JSON-LD schema.org, SvelteKit server endpoint pour sitemap

---

## Fichiers touchés

### Créés

- `src/routes/(site)/vs/kahoot/+page.svelte` — Comparaison ZIK vs Kahoot
- `src/routes/(site)/vs/blinest/+page.svelte` — Comparaison ZIK vs Blinest
- `src/routes/(site)/vs/blindtest-io/+page.svelte` — Comparaison ZIK vs Blindtest.io
- `src/routes/sitemap.xml/+server.js` — Sitemap XML dynamique

### Modifiés

- `src/routes/(site)/+page.svelte` — Section "Qu'est-ce que ZIK ?", FAQ, JSON-LD FAQPage
- `src/routes/(site)/rooms/+page.svelte` — Metas OG/Twitter complètes, JSON-LD, intro paragraphe
- `src/routes/(site)/salon/+page.svelte` — SEO complet : canonical, OG, description améliorée, JSON-LD
- `src/routes/(site)/playlists/+page.svelte` — Metas OG/Twitter + JSON-LD
- `src/routes/(site)/room/[code]/+page.svelte` — Description dynamique enrichie avec game_mode + JSON-LD

---

## Task 1 : Homepage — Section "Qu'est-ce que ZIK ?" et FAQ

**Objectif SEO :** fournir du texte indexable clair sur ce qu'est ZIK, citable par les LLMs (ChatGPT, Gemini, etc.)

**Fichiers :**

- Modify: `src/routes/(site)/+page.svelte`

- [ ] **Step 1 : Ajouter la section "Qu'est-ce que ZIK ?" après la section features**

Dans `src/routes/(site)/+page.svelte`, après la balise fermante `</section>` de la section features (qui se termine après `.feat-card` avec la liste de 6 cartes, autour de la ligne 375), insérer :

```svelte
<!-- ══════════════════════════════ QU'EST-CE QUE ZIK ══════════════════════════════ -->
<section class="section section-about" use:reveal id="a-propos">
  <div class="about-inner">
    <div class="about-text">
      <h2>Qu'est-ce que <span class="text-gradient">ZIK</span>&nbsp;?</h2>
      <p>
        ZIK est un jeu de blind test musical multijoueur gratuit, accessible directement dans le navigateur.
        Les joueurs s'affrontent en temps réel pour identifier les titres et artistes d'extraits musicaux.
        Aucune installation, aucune inscription obligatoire.
      </p>
      <p>
        ZIK se distingue des autres blind tests en ligne par trois modes de jeu complémentaires :
      </p>
      <ul class="about-list">
        <li><strong>Mode Classique</strong> — saisie libre du titre et de l'artiste, avec classement ELO compétitif. Idéal pour tester ses connaissances musicales sérieusement.</li>
        <li><strong>Mode QCM</strong> — quatre propositions à choix multiple, style Kahoot. Accessible à tous, sans pression.</li>
        <li><strong>Mode Salon</strong> — un hôte diffuse la musique depuis son grand écran (TV ou PC), les invités répondent depuis leur smartphone avec un code ou QR code. Parfait pour les soirées entre amis.</li>
      </ul>
      <p>
        ZIK prend en charge l'import de playlists complètes depuis <strong>Spotify</strong> et <strong>Deezer</strong>,
        ainsi que la création de playlists personnalisées directement sur le site.
        Chaque partie peut accueillir jusqu'à 20 joueurs simultanément.
      </p>
    </div>
    <div class="about-aside">
      <div class="about-stat-card">
        <span class="about-stat-icon">🎵</span>
        <span class="about-stat-label">Import Spotify &amp; Deezer</span>
      </div>
      <div class="about-stat-card">
        <span class="about-stat-icon">🏆</span>
        <span class="about-stat-label">Classement ELO compétitif</span>
      </div>
      <div class="about-stat-card">
        <span class="about-stat-icon">📺</span>
        <span class="about-stat-label">Mode Salon — TV + smartphones</span>
      </div>
      <div class="about-stat-card">
        <span class="about-stat-icon">⚡</span>
        <span class="about-stat-label">Gratuit, sans inscription</span>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2 : Ajouter la section FAQ après la section leaderboards**

Après la section `#leaderboards` (qui se termine autour de la ligne 832), insérer avant le guest modal :

```svelte
<!-- ══════════════════════════════ FAQ ══════════════════════════════ -->
<section class="section section-faq" use:reveal id="faq">
  <div class="section-head">
    <h2>Questions fréquentes</h2>
    <p class="section-sub">Tout ce que tu dois savoir sur ZIK.</p>
  </div>
  <div class="faq-list">
    <details class="faq-item">
      <summary class="faq-q">C'est quoi ZIK ?</summary>
      <p class="faq-a">ZIK est un jeu de blind test musical multijoueur gratuit, accessible dans le navigateur. Les joueurs écoutent des extraits musicaux et doivent identifier le titre et l'artiste le plus rapidement possible.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">ZIK est-il gratuit ?</summary>
      <p class="faq-a">Oui, ZIK est entièrement gratuit. Aucun abonnement, aucun achat dans l'application.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">Faut-il créer un compte pour jouer ?</summary>
      <p class="faq-a">Non. Le mode invité permet de rejoindre une partie immédiatement avec un pseudo. La création de compte est optionnelle et permet de sauvegarder ses scores et son classement ELO.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">Comment fonctionne le classement ELO sur ZIK ?</summary>
      <p class="faq-a">Le système ELO de ZIK attribue des points en fonction des adversaires battus, comme aux échecs. Battre un joueur mieux classé rapporte plus de points. Ce classement évolue uniquement en Mode Classique.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">Quelle est la différence entre le Mode Classique et le Mode QCM ?</summary>
      <p class="faq-a">En Mode Classique, les joueurs saisissent librement le titre et l'artiste — c'est le mode compétitif avec classement ELO. En Mode QCM, quatre propositions sont affichées et il faut choisir la bonne — plus accessible, sans ELO.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">Comment fonctionne le Mode Salon ?</summary>
      <p class="faq-a">En Mode Salon, un hôte lance une session depuis son ordinateur ou sa TV. Les invités rejoignent depuis leur smartphone en entrant un code ou en scannant un QR code. La musique est diffusée uniquement depuis l'écran de l'hôte.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">Puis-je importer mes playlists Spotify ou Deezer ?</summary>
      <p class="faq-a">Oui. ZIK permet l'import direct de playlists publiques Spotify et Deezer en quelques clics. Il est aussi possible de créer des playlists manuellement sur le site.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">ZIK fonctionne-t-il sur mobile ?</summary>
      <p class="faq-a">Oui. ZIK est conçu mobile-first. Le Mode Salon est particulièrement adapté aux smartphones pour les joueurs invités.</p>
    </details>
  </div>
</section>
```

- [ ] **Step 3 : Ajouter le JSON-LD FAQPage dans le `<svelte:head>`**

Dans la section `<svelte:head>` (autour de la ligne 281), après la balise `<script type="application/ld+json">{@html jsonLd}</script>`, ajouter :

```svelte
<script type="application/ld+json">{@html faqJsonLd}</script>
```

Et dans le `<script>` de la page (après la définition de `jsonLd`, autour de la ligne 257), ajouter :

```javascript
const faqJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "C'est quoi ZIK ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ZIK est un jeu de blind test musical multijoueur gratuit, accessible dans le navigateur. Les joueurs écoutent des extraits musicaux et doivent identifier le titre et l'artiste le plus rapidement possible.",
      },
    },
    {
      "@type": "Question",
      name: "ZIK est-il gratuit ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oui, ZIK est entièrement gratuit. Aucun abonnement, aucun achat dans l'application.",
      },
    },
    {
      "@type": "Question",
      name: "Faut-il créer un compte pour jouer ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Non. Le mode invité permet de rejoindre une partie immédiatement avec un pseudo. La création de compte est optionnelle et permet de sauvegarder ses scores et son classement ELO.",
      },
    },
    {
      "@type": "Question",
      name: "Comment fonctionne le classement ELO sur ZIK ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le système ELO de ZIK attribue des points en fonction des adversaires battus. Battre un joueur mieux classé rapporte plus de points. Ce classement évolue uniquement en Mode Classique.",
      },
    },
    {
      "@type": "Question",
      name: "Quelle est la différence entre le Mode Classique et le Mode QCM ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "En Mode Classique, les joueurs saisissent librement le titre et l'artiste — c'est le mode compétitif avec classement ELO. En Mode QCM, quatre propositions sont affichées et il faut choisir la bonne — plus accessible, sans ELO.",
      },
    },
    {
      "@type": "Question",
      name: "Comment fonctionne le Mode Salon ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "En Mode Salon, un hôte lance une session depuis son ordinateur ou sa TV. Les invités rejoignent depuis leur smartphone en entrant un code ou en scannant un QR code. La musique est diffusée uniquement depuis l'écran de l'hôte.",
      },
    },
    {
      "@type": "Question",
      name: "Puis-je importer mes playlists Spotify ou Deezer ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oui. ZIK permet l'import direct de playlists publiques Spotify et Deezer en quelques clics.",
      },
    },
    {
      "@type": "Question",
      name: "ZIK fonctionne-t-il sur mobile ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oui. ZIK est conçu mobile-first. Le Mode Salon est particulièrement adapté aux smartphones pour les joueurs invités.",
      },
    },
  ],
});
```

- [ ] **Step 4 : Ajouter les styles CSS pour les nouvelles sections dans `<style>`**

En bas du bloc `<style>` de la page (avant la dernière `}`), ajouter :

```css
/* ════════════════════════════ SECTION ABOUT ════════════════════════════ */
.about-inner {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 48px;
  align-items: start;
}
.about-text h2 {
  font-family: "Bricolage Grotesque", sans-serif;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 900;
  letter-spacing: -1px;
  margin-bottom: 20px;
}
.about-text p {
  font-size: 0.9rem;
  color: var(--mid);
  line-height: 1.7;
  margin-bottom: 14px;
}
.about-list {
  list-style: none;
  padding: 0;
  margin: 0 0 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.about-list li {
  font-size: 0.88rem;
  color: var(--mid);
  line-height: 1.6;
  padding-left: 18px;
  position: relative;
}
.about-list li::before {
  content: "→";
  position: absolute;
  left: 0;
  color: var(--accent);
  font-weight: 700;
}
.about-aside {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.about-stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgb(var(--c-glass) / 0.04);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px;
}
.about-stat-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
}
.about-stat-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
}

/* ════════════════════════════ FAQ ════════════════════════════ */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 800px;
}
.faq-item {
  background: rgb(var(--c-glass) / 0.04);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.faq-item[open] {
  border-color: var(--border2);
}
.faq-q {
  font-size: 0.9rem;
  font-weight: 700;
  padding: 16px 20px;
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.faq-q::after {
  content: "+";
  font-size: 1.1rem;
  color: var(--accent);
  flex-shrink: 0;
  transition: transform 0.2s;
}
.faq-item[open] .faq-q::after {
  content: "−";
}
.faq-a {
  font-size: 0.84rem;
  color: var(--mid);
  line-height: 1.65;
  padding: 0 20px 16px;
  margin: 0;
}

@media (max-width: 900px) {
  .about-inner {
    grid-template-columns: 1fr;
  }
  .about-aside {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 600px) {
  .about-aside {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5 : Lint et commit**

```bash
npm run lint
git add src/routes/\(site\)/+page.svelte
git commit -m "feat(seo): section 'Qu'est-ce que ZIK' + FAQ + JSON-LD FAQPage sur l'accueil"
```

---

## Task 2 : Page /rooms — SEO enrichi

**Objectif SEO :** Mot-clé principal "blind test multijoueur en ligne", contenu indexable sur les rooms.

**Fichiers :**

- Modify: `src/routes/(site)/rooms/+page.svelte`

- [ ] **Step 1 : Remplacer le `<svelte:head>` (autour ligne 237)**

Remplacer l'intégralité du bloc `<svelte:head>` existant par :

```svelte
<svelte:head>
  <title>Rooms de Blind Test Multijoueur en Ligne — ZIK</title>
  <meta name="description" content="Rejoins une room de blind test multijoueur gratuit ou crée la tienne. Mode Classique avec classement ELO ou Mode QCM, playlists Spotify/Deezer. Jusqu'à 20 joueurs en temps réel." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/rooms" />

  <meta property="og:title" content="Rooms de Blind Test Multijoueur — ZIK" />
  <meta property="og:description" content="Rejoins une room de blind test en ligne ou crée la tienne. Mode Classique ELO ou QCM casual. Playlists Spotify & Deezer. Gratuit, sans inscription." />
  <meta property="og:url" content="https://www.zik-music.fr/rooms" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Rooms de Blind Test Multijoueur — ZIK" />
  <meta name="twitter:description" content="Rejoins ou crée une room de blind test en ligne. Mode Classique ELO ou QCM. Gratuit, sans inscription." />
  <meta name="twitter:image" content="https://www.zik-music.fr/og.png" />

  <script type="application/ld+json">{@html roomsJsonLd}</script>
</svelte:head>
```

- [ ] **Step 2 : Ajouter `roomsJsonLd` dans le `<script>` de la page**

Dans le `<script>` (en début de fichier, avant les `$state`), ajouter :

```javascript
const roomsJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Rooms de Blind Test Multijoueur — ZIK",
  description:
    "Parcourez les rooms de blind test multijoueur ZIK. Mode Classique avec classement ELO ou Mode QCM. Créez votre propre room en 30 secondes.",
  url: "https://www.zik-music.fr/rooms",
  inLanguage: "fr-FR",
  isPartOf: {
    "@type": "WebSite",
    url: "https://www.zik-music.fr/",
    name: "ZIK",
  },
});
```

- [ ] **Step 3 : Améliorer le HeroSection de /rooms**

Trouver l'appel `<HeroSection` dans la partie template (autour ligne 253) et remplacer le contenu :

```svelte
<HeroSection
  title="Rooms de blind test"
  titleAccent="multijoueur."
  subtitle="Rejoins une partie en cours ou crée la tienne en 30 secondes. Mode Classique ELO ou QCM casual."
>
  <a href="/rooms" class="btn-accent" onclick={(e) => { e.preventDefault(); document.getElementById('tab-public')?.click(); }}>Rooms publiques →</a>
  <a href="/rooms" class="btn-ghost" onclick={(e) => { e.preventDefault(); document.getElementById('tab-mine')?.click(); }}>Mes rooms</a>
</HeroSection>
```

Note : si le HeroSection n'a pas de `children` dans /rooms, supprimer la partie `children` ci-dessus. Vérifier le fichier en lisant les lignes 253-270.

- [ ] **Step 4 : Lint et commit**

```bash
npm run lint
git add src/routes/\(site\)/rooms/+page.svelte
git commit -m "feat(seo): enrichir SEO page /rooms — title, metas OG, JSON-LD, H1"
```

---

## Task 3 : Page /salon — SEO complet

**Objectif SEO :** Mot-clé principal "blind test soirée" / "blind test TV smartphone", différencier du Mode Classique.

**Fichiers :**

- Modify: `src/routes/(site)/salon/+page.svelte`

La page /salon a actuellement un SEO très pauvre (pas de canonical, pas d'OG, description courte, pas de H1).

- [ ] **Step 1 : Remplacer le `<svelte:head>` (autour ligne 117)**

```svelte
<svelte:head>
  <title>Mode Salon — Blind Test en Soirée sur TV &amp; Smartphones | ZIK</title>
  <meta name="description" content="Organisez un blind test en soirée avec le Mode Salon ZIK. Un hôte diffuse la musique sur grand écran, les joueurs répondent depuis leur smartphone. Style Kahoot, avec vos musiques. Gratuit." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/salon" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />

  <meta property="og:title" content="Mode Salon — Blind Test en Soirée | ZIK" />
  <meta property="og:description" content="Blind test en soirée : grand écran sur la TV, smartphones comme manettes. Style Kahoot avec vos playlists Spotify/Deezer. Gratuit, sans inscription." />
  <meta property="og:url" content="https://www.zik-music.fr/salon" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Mode Salon — Blind Test en Soirée | ZIK" />
  <meta name="twitter:description" content="Organisez un blind test sur TV + smartphones. Style Kahoot, avec vos musiques. Gratuit." />
  <meta name="twitter:image" content="https://www.zik-music.fr/og.png" />

  <script type="application/ld+json">{@html salonJsonLd}</script>
</svelte:head>
```

- [ ] **Step 2 : Ajouter `salonJsonLd` dans le `<script>` (en haut de fichier, après les imports)**

```javascript
const salonJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Mode Salon — Blind Test en Soirée | ZIK",
  description:
    "Organisez un blind test en soirée avec le Mode Salon ZIK. Un hôte diffuse la musique sur grand écran, les joueurs répondent depuis leur smartphone.",
  url: "https://www.zik-music.fr/salon",
  inLanguage: "fr-FR",
  isPartOf: {
    "@type": "WebSite",
    url: "https://www.zik-music.fr/",
    name: "ZIK",
  },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: "https://www.zik-music.fr/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Mode Salon",
        item: "https://www.zik-music.fr/salon",
      },
    ],
  },
});
```

- [ ] **Step 3 : Remplacer le div logo en h1 visible**

Trouver la ligne :

```svelte
<div class="salon-setup-logo">ZIK <span>Salon</span></div>
```

Remplacer par :

```svelte
<h1 class="salon-setup-logo">ZIK <span>Salon</span></h1>
```

- [ ] **Step 4 : Lint et commit**

```bash
npm run lint
git add src/routes/\(site\)/salon/+page.svelte
git commit -m "feat(seo): SEO complet page /salon — canonical, OG, h1, JSON-LD"
```

---

## Task 4 : Page /playlists — Metas OG et JSON-LD

**Objectif SEO :** Mot-clé principal "créer une playlist blind test".

**Fichiers :**

- Modify: `src/routes/(site)/playlists/+page.svelte`

- [ ] **Step 1 : Remplacer le `<svelte:head>` (autour ligne 573)**

```svelte
<svelte:head>
  <title>Playlists de Blind Test — Créer &amp; Importer depuis Spotify/Deezer | ZIK</title>
  <meta name="description" content="Créez vos playlists de blind test musical. Importez depuis Spotify ou Deezer, ajoutez des titres manuellement. Lancez une room depuis votre playlist en un clic. Gratuit." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/playlists" />

  <meta property="og:title" content="Playlists de Blind Test — Import Spotify/Deezer | ZIK" />
  <meta property="og:description" content="Créez vos playlists de blind test, importez depuis Spotify ou Deezer. Lancez une room directement. Gratuit, sans limite." />
  <meta property="og:url" content="https://www.zik-music.fr/playlists" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Playlists de Blind Test | ZIK" />
  <meta name="twitter:description" content="Importez vos playlists Spotify/Deezer et jouez au blind test avec vos musiques. Gratuit." />
  <meta name="twitter:image" content="https://www.zik-music.fr/og.png" />

  <script type="application/ld+json">{@html playlistsJsonLd}</script>
</svelte:head>
```

- [ ] **Step 2 : Ajouter `playlistsJsonLd` dans le `<script>`**

```javascript
const playlistsJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Playlists de Blind Test — ZIK",
  description:
    "Créez et gérez vos playlists de blind test. Import Spotify et Deezer, ajout manuel de titres, partage avec d'autres joueurs.",
  url: "https://www.zik-music.fr/playlists",
  inLanguage: "fr-FR",
  isPartOf: {
    "@type": "WebSite",
    url: "https://www.zik-music.fr/",
    name: "ZIK",
  },
});
```

- [ ] **Step 3 : Lint et commit**

```bash
npm run lint
git add src/routes/\(site\)/playlists/+page.svelte
git commit -m "feat(seo): enrichir SEO page /playlists — OG, Twitter, JSON-LD"
```

---

## Task 5 : Page /room/[code] — Description dynamique enrichie

**Objectif :** Bing pénalise les pages avec des meta descriptions identiques. Chaque room doit avoir une description vraiment unique incluant le mode de jeu.

**Fichiers :**

- Modify: `src/routes/(site)/room/[code]/+page.svelte`

- [ ] **Step 1 : Enrichir la construction de `desc` et `pageTitle` (lignes 12-14)**

Remplacer :

```javascript
const desc =
  room.description ||
  `Rejoins la room ${room.name} sur ZIK pour un blind test musical multijoueur en ligne.`;
const pageTitle = `${room.emoji} ${room.name} — Blind Test ZIK`;
```

Par :

```javascript
const modeLabel =
  room.game_mode === "qcm"
    ? "Mode QCM (choix multiple)"
    : "Mode Classique (saisie libre, classement ELO)";
const officialLabel = room.is_official ? " Room officielle." : "";
const desc = room.description
  ? `${room.description} ${modeLabel}.${officialLabel} Rejoins sur ZIK, le blind test multijoueur gratuit.`
  : `Rejoins la room "${room.name}" sur ZIK. ${modeLabel}.${officialLabel} Blind test musical multijoueur gratuit en ligne.`;
const pageTitle = `${room.emoji} ${room.name} — ${room.game_mode === "qcm" ? "Blind Test QCM" : "Blind Test Classique"} | ZIK`;
```

- [ ] **Step 2 : Améliorer le JSON-LD (lignes 15-25)**

Remplacer :

```javascript
const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Game",
  name: `${room.name} — Blind Test ZIK`,
  description: desc,
  url: canonicalUrl,
  genre: ["Music", "Quiz", "Trivia"],
  isAccessibleForFree: true,
  inLanguage: "fr-FR",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
});
```

Par :

```javascript
const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Game",
  name: `${room.name} — Blind Test ZIK`,
  description: desc,
  url: canonicalUrl,
  genre: ["Music", "Quiz", "Trivia"],
  isAccessibleForFree: true,
  inLanguage: "fr-FR",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  applicationCategory: "GameApplication",
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: "https://www.zik-music.fr/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Rooms",
        item: "https://www.zik-music.fr/rooms",
      },
      { "@type": "ListItem", position: 3, name: room.name, item: canonicalUrl },
    ],
  },
});
```

- [ ] **Step 3 : Lint et commit**

```bash
npm run lint
git add src/routes/\(site\)/room/\[code\]/+page.svelte
git commit -m "feat(seo): descriptions dynamiques enrichies sur /room/[code] (mode de jeu + breadcrumb)"
```

---

## Task 6 : Page de comparaison /vs/kahoot

**Objectif SEO :** Capturer la recherche "ZIK vs Kahoot", "alternative à Kahoot pour blind test musical".

**Fichiers :**

- Create: `src/routes/(site)/vs/kahoot/+page.svelte`

- [ ] **Step 1 : Créer le fichier**

```svelte
<script>
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "ZIK vs Kahoot — Comparaison des blind tests en ligne",
    "description": "ZIK et Kahoot sont deux plateformes de quiz multijoueur. ZIK est spécialisé dans le blind test musical avec import Spotify/Deezer. Comparaison factuelle.",
    "url": "https://www.zik-music.fr/vs/kahoot",
    "inLanguage": "fr-FR",
    "isPartOf": { "@type": "WebSite", "url": "https://www.zik-music.fr/", "name": "ZIK" },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://www.zik-music.fr/" },
        { "@type": "ListItem", "position": 2, "name": "ZIK vs Kahoot", "item": "https://www.zik-music.fr/vs/kahoot" }
      ]
    }
  });
</script>

<svelte:head>
  <title>ZIK vs Kahoot — Quel est le meilleur blind test multijoueur ?</title>
  <meta name="description" content="ZIK ou Kahoot pour votre prochain blind test musical ? Comparaison factuelle : spécialisation musicale, import Spotify/Deezer, classement ELO, Mode Salon. ZIK est conçu exclusivement pour le blind test." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/vs/kahoot" />
  <meta property="og:title" content="ZIK vs Kahoot — Comparaison blind test multijoueur" />
  <meta property="og:description" content="ZIK est spécialisé dans le blind test musical avec import Spotify/Deezer et classement ELO. Kahoot est une plateforme de quiz généraliste. Comparaison factuelle." />
  <meta property="og:url" content="https://www.zik-music.fr/vs/kahoot" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png" />
  <script type="application/ld+json">{@html jsonLd}</script>
</svelte:head>

<main class="vs-page">
  <div class="vs-back">
    <a href="/">← Retour à ZIK</a>
  </div>

  <article class="vs-article">

    <header class="vs-header">
      <div class="vs-logos">
        <span class="vs-logo-zik">ZIK</span>
        <span class="vs-separator">vs</span>
        <span class="vs-logo-other">Kahoot</span>
      </div>
      <h1>ZIK vs Kahoot : quel outil choisir pour un blind test musical ?</h1>
      <p class="vs-intro">
        ZIK et Kahoot sont deux plateformes de quiz multijoueur en ligne. Leur point commun s'arrête là.
        ZIK est entièrement dédié au blind test musical. Kahoot est une plateforme de quiz généraliste,
        populaire dans les contextes éducatifs et professionnels.
        Cette comparaison est factuelle et basée sur les fonctionnalités documentées des deux plateformes.
      </p>
    </header>

    <section class="vs-section">
      <h2>Ce que fait ZIK</h2>
      <p>
        ZIK est un jeu de blind test musical multijoueur gratuit. Les joueurs écoutent des extraits musicaux
        et doivent identifier le titre et l'artiste. ZIK propose trois modes :
      </p>
      <ul>
        <li><strong>Mode Classique</strong> — saisie libre, classement ELO compétitif</li>
        <li><strong>Mode QCM</strong> — 4 propositions à choix multiple, accessible à tous</li>
        <li><strong>Mode Salon</strong> — hôte sur grand écran, joueurs sur smartphone</li>
      </ul>
      <p>
        ZIK permet l'import direct de playlists depuis Spotify et Deezer. Il est gratuit, sans abonnement,
        et ne nécessite pas de compte pour jouer.
      </p>
    </section>

    <section class="vs-section">
      <h2>Ce que fait Kahoot</h2>
      <p>
        Kahoot est une plateforme de quiz interactif principalement utilisée en contexte éducatif et professionnel.
        Elle permet de créer des questionnaires avec texte, images et vidéos, accessibles depuis un navigateur
        ou l'application mobile.
      </p>
      <p>
        Kahoot est généraliste : il ne propose pas de fonctionnalités dédiées au blind test musical.
        Créer un blind test sur Kahoot nécessite d'intégrer manuellement chaque extrait audio et de construire
        les questions à la main, sans import automatique de playlists.
      </p>
    </section>

    <section class="vs-section">
      <h2>Comparaison rapide</h2>
      <div class="vs-table-wrap">
        <table class="vs-table">
          <thead>
            <tr>
              <th>Fonctionnalité</th>
              <th>ZIK</th>
              <th>Kahoot</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Spécialisé blind test musical</td><td class="yes">✓</td><td class="no">✗</td></tr>
            <tr><td>Import Spotify / Deezer</td><td class="yes">✓</td><td class="no">✗</td></tr>
            <tr><td>Classement ELO compétitif</td><td class="yes">✓</td><td class="no">✗</td></tr>
            <tr><td>Mode Salon (TV + smartphones)</td><td class="yes">✓</td><td class="partial">Partiel</td></tr>
            <tr><td>Mode QCM multijoueur</td><td class="yes">✓</td><td class="yes">✓</td></tr>
            <tr><td>Sans inscription obligatoire</td><td class="yes">✓</td><td class="no">✗</td></tr>
            <tr><td>Entièrement gratuit</td><td class="yes">✓</td><td class="partial">Freemium</td></tr>
            <tr><td>Quiz non-musicaux</td><td class="no">✗</td><td class="yes">✓</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="vs-section">
      <h2>Quand choisir ZIK plutôt que Kahoot ?</h2>
      <ul>
        <li>Vous organisez une soirée blind test musical entre amis</li>
        <li>Vous voulez utiliser vos propres playlists Spotify ou Deezer</li>
        <li>Vous cherchez un classement compétitif avec système ELO</li>
        <li>Vous voulez jouer sans créer de compte</li>
        <li>Vous voulez un accès totalement gratuit, sans limite de participants</li>
      </ul>
    </section>

    <section class="vs-section">
      <h2>Quand choisir Kahoot ?</h2>
      <ul>
        <li>Vous souhaitez créer des quiz sur des sujets non-musicaux (histoire, sciences, etc.)</li>
        <li>Vous travaillez dans un contexte éducatif ou professionnel</li>
        <li>Vous avez besoin de fonctionnalités avancées de gestion de classes ou d'équipes</li>
      </ul>
    </section>

    <div class="vs-cta">
      <p>ZIK est fait pour le blind test musical. Essayez-le gratuitement.</p>
      <a href="/" class="vs-cta-btn">Jouer sur ZIK →</a>
    </div>

  </article>
</main>

<style>
  .vs-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 48px clamp(16px, 5vw, 48px) 80px;
  }
  .vs-back a {
    font-size: 0.82rem;
    color: var(--accent);
    font-weight: 600;
    opacity: 0.8;
    transition: opacity 0.15s;
  }
  .vs-back a:hover { opacity: 1; }
  .vs-back { margin-bottom: 32px; }

  .vs-header { margin-bottom: 40px; }
  .vs-logos {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
  }
  .vs-logo-zik {
    font-family: "Bricolage Grotesque", sans-serif;
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--accent);
  }
  .vs-separator {
    font-size: 1rem;
    font-weight: 700;
    color: var(--dim);
  }
  .vs-logo-other {
    font-family: "Bricolage Grotesque", sans-serif;
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--mid);
  }
  .vs-article h1 {
    font-family: "Bricolage Grotesque", sans-serif;
    font-size: clamp(1.5rem, 3vw, 2.2rem);
    font-weight: 900;
    letter-spacing: -1px;
    line-height: 1.2;
    margin-bottom: 16px;
  }
  .vs-intro {
    font-size: 0.92rem;
    color: var(--mid);
    line-height: 1.7;
  }

  .vs-section {
    margin-bottom: 36px;
    padding-bottom: 36px;
    border-bottom: 1px solid var(--border);
  }
  .vs-section:last-of-type { border-bottom: none; }
  .vs-section h2 {
    font-family: "Bricolage Grotesque", sans-serif;
    font-size: 1.15rem;
    font-weight: 800;
    margin-bottom: 14px;
    color: var(--text);
  }
  .vs-section p {
    font-size: 0.88rem;
    color: var(--mid);
    line-height: 1.7;
    margin-bottom: 10px;
  }
  .vs-section ul {
    padding-left: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .vs-section li {
    font-size: 0.88rem;
    color: var(--mid);
    line-height: 1.6;
    padding-left: 18px;
    position: relative;
  }
  .vs-section li::before {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--accent);
    font-weight: 700;
  }

  .vs-table-wrap { overflow-x: auto; }
  .vs-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }
  .vs-table th, .vs-table td {
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  .vs-table thead th {
    font-weight: 700;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--dim);
    background: rgb(var(--c-glass) / 0.04);
  }
  .vs-table td:first-child { color: var(--text); }
  .yes { color: #4ade80; font-weight: 700; }
  .no  { color: #f87171; font-weight: 700; }
  .partial { color: #fbbf24; font-weight: 700; }

  .vs-cta {
    margin-top: 48px;
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    text-align: center;
  }
  .vs-cta p {
    font-size: 0.92rem;
    color: var(--mid);
    margin-bottom: 16px;
  }
  .vs-cta-btn {
    display: inline-block;
    background: var(--accent);
    color: #000;
    font-weight: 800;
    font-family: "Bricolage Grotesque", sans-serif;
    padding: 12px 28px;
    border-radius: 10px;
    font-size: 0.92rem;
    transition: opacity 0.15s;
  }
  .vs-cta-btn:hover { opacity: 0.85; }
</style>
```

- [ ] **Step 2 : Lint et commit**

```bash
npm run lint
git add src/routes/\(site\)/vs/kahoot/+page.svelte
git commit -m "feat(seo): page comparaison ZIK vs Kahoot"
```

---

## Task 7 : Page de comparaison /vs/blinest

**Objectif SEO :** Capturer "ZIK vs Blinest", "alternative à Blinest".

**Fichiers :**

- Create: `src/routes/(site)/vs/blinest/+page.svelte`

- [ ] **Step 1 : Créer le fichier**

```svelte
<script>
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "ZIK vs Blinest — Comparaison des blind tests musicaux en ligne",
    "description": "ZIK et Blinest sont deux blind tests musicaux en ligne. Comparaison factuelle : playlists personnalisées, modes de jeu, classement ELO, Mode Salon.",
    "url": "https://www.zik-music.fr/vs/blinest",
    "inLanguage": "fr-FR",
    "isPartOf": { "@type": "WebSite", "url": "https://www.zik-music.fr/", "name": "ZIK" },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://www.zik-music.fr/" },
        { "@type": "ListItem", "position": 2, "name": "ZIK vs Blinest", "item": "https://www.zik-music.fr/vs/blinest" }
      ]
    }
  });
</script>

<svelte:head>
  <title>ZIK vs Blinest — Comparaison des blind tests musicaux en ligne</title>
  <meta name="description" content="ZIK ou Blinest pour votre prochain blind test musical ? Comparaison factuelle : playlists Spotify/Deezer personnalisées sur ZIK, classement ELO compétitif, Mode Salon pour les soirées." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/vs/blinest" />
  <meta property="og:title" content="ZIK vs Blinest — Comparaison blind test musical" />
  <meta property="og:description" content="ZIK et Blinest sont deux blind tests musicaux en ligne. ZIK permet d'importer ses propres playlists Spotify/Deezer et propose un Mode Salon pour les soirées." />
  <meta property="og:url" content="https://www.zik-music.fr/vs/blinest" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png" />
  <script type="application/ld+json">{@html jsonLd}</script>
</svelte:head>

<main class="vs-page">
  <div class="vs-back">
    <a href="/">← Retour à ZIK</a>
  </div>

  <article class="vs-article">

    <header class="vs-header">
      <div class="vs-logos">
        <span class="vs-logo-zik">ZIK</span>
        <span class="vs-separator">vs</span>
        <span class="vs-logo-other">Blinest</span>
      </div>
      <h1>ZIK vs Blinest : deux blind tests musicaux, des approches différentes</h1>
      <p class="vs-intro">
        ZIK et Blinest sont deux blind tests musicaux en ligne gratuits, tous deux francophones.
        Cette comparaison présente leurs différences de façon factuelle, pour vous aider à choisir
        selon votre usage.
      </p>
    </header>

    <section class="vs-section">
      <h2>Ce que fait ZIK</h2>
      <p>
        ZIK est un blind test musical multijoueur en temps réel. Il se distingue par :
      </p>
      <ul>
        <li>L'import de playlists personnalisées depuis Spotify et Deezer</li>
        <li>Trois modes de jeu : Classique (ELO), QCM (casual), Salon (soirée TV + smartphones)</li>
        <li>Un classement ELO compétitif persistant pour les joueurs inscrits</li>
        <li>La création de rooms publiques et privées avec code partageable</li>
        <li>Jusqu'à 20 joueurs simultanément, en temps réel via Socket.io</li>
      </ul>
    </section>

    <section class="vs-section">
      <h2>Ce que fait Blinest</h2>
      <p>
        Blinest est un blind test musical en ligne basé sur des extraits de playlists Deezer.
        Le joueur écoute un extrait et doit identifier le titre parmi des propositions.
        Blinest propose différents genres musicaux (pop, rock, rap, etc.) sous forme de défis.
      </p>
      <p>
        Blinest ne permet pas d'importer ses propres playlists personnalisées, ni d'organiser
        des parties multijoueur en temps réel avec ses amis depuis une room dédiée.
      </p>
    </section>

    <section class="vs-section">
      <h2>Comparaison rapide</h2>
      <div class="vs-table-wrap">
        <table class="vs-table">
          <thead>
            <tr>
              <th>Fonctionnalité</th>
              <th>ZIK</th>
              <th>Blinest</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Import playlists Spotify / Deezer</td><td class="yes">✓</td><td class="no">✗</td></tr>
            <tr><td>Multijoueur en temps réel</td><td class="yes">✓</td><td class="no">✗</td></tr>
            <tr><td>Classement ELO compétitif</td><td class="yes">✓</td><td class="no">✗</td></tr>
            <tr><td>Mode Salon (TV + smartphones)</td><td class="yes">✓</td><td class="no">✗</td></tr>
            <tr><td>Mode QCM</td><td class="yes">✓</td><td class="yes">✓</td></tr>
            <tr><td>Blind test solo / défis par genre</td><td class="partial">Partiel</td><td class="yes">✓</td></tr>
            <tr><td>Rooms privées avec code</td><td class="yes">✓</td><td class="no">✗</td></tr>
            <tr><td>Sans inscription obligatoire</td><td class="yes">✓</td><td class="yes">✓</td></tr>
            <tr><td>Entièrement gratuit</td><td class="yes">✓</td><td class="yes">✓</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="vs-section">
      <h2>Quand choisir ZIK plutôt que Blinest ?</h2>
      <ul>
        <li>Vous voulez jouer avec vos propres playlists Spotify ou Deezer</li>
        <li>Vous cherchez un blind test multijoueur en temps réel avec des amis</li>
        <li>Vous organisez une soirée et voulez un Mode Salon TV + smartphones</li>
        <li>Vous voulez un classement ELO compétitif et persistant</li>
      </ul>
    </section>

    <section class="vs-section">
      <h2>Quand choisir Blinest ?</h2>
      <ul>
        <li>Vous préférez jouer en solo sur des défis par genre musical prédéfinis</li>
        <li>Vous n'avez pas de playlist particulière en tête et voulez jouer directement</li>
      </ul>
    </section>

    <div class="vs-cta">
      <p>Importez vos playlists et jouez avec vos amis sur ZIK. Gratuit, sans inscription.</p>
      <a href="/" class="vs-cta-btn">Essayer ZIK →</a>
    </div>

  </article>
</main>

<style>
  .vs-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 48px clamp(16px, 5vw, 48px) 80px;
  }
  .vs-back a {
    font-size: 0.82rem;
    color: var(--accent);
    font-weight: 600;
    opacity: 0.8;
    transition: opacity 0.15s;
  }
  .vs-back a:hover { opacity: 1; }
  .vs-back { margin-bottom: 32px; }

  .vs-header { margin-bottom: 40px; }
  .vs-logos {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
  }
  .vs-logo-zik {
    font-family: "Bricolage Grotesque", sans-serif;
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--accent);
  }
  .vs-separator {
    font-size: 1rem;
    font-weight: 700;
    color: var(--dim);
  }
  .vs-logo-other {
    font-family: "Bricolage Grotesque", sans-serif;
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--mid);
  }
  .vs-article h1 {
    font-family: "Bricolage Grotesque", sans-serif;
    font-size: clamp(1.5rem, 3vw, 2.2rem);
    font-weight: 900;
    letter-spacing: -1px;
    line-height: 1.2;
    margin-bottom: 16px;
  }
  .vs-intro {
    font-size: 0.92rem;
    color: var(--mid);
    line-height: 1.7;
  }
  .vs-section {
    margin-bottom: 36px;
    padding-bottom: 36px;
    border-bottom: 1px solid var(--border);
  }
  .vs-section:last-of-type { border-bottom: none; }
  .vs-section h2 {
    font-family: "Bricolage Grotesque", sans-serif;
    font-size: 1.15rem;
    font-weight: 800;
    margin-bottom: 14px;
    color: var(--text);
  }
  .vs-section p {
    font-size: 0.88rem;
    color: var(--mid);
    line-height: 1.7;
    margin-bottom: 10px;
  }
  .vs-section ul {
    padding-left: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .vs-section li {
    font-size: 0.88rem;
    color: var(--mid);
    line-height: 1.6;
    padding-left: 18px;
    position: relative;
  }
  .vs-section li::before {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--accent);
    font-weight: 700;
  }
  .vs-table-wrap { overflow-x: auto; }
  .vs-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }
  .vs-table th, .vs-table td {
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  .vs-table thead th {
    font-weight: 700;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--dim);
    background: rgb(var(--c-glass) / 0.04);
  }
  .vs-table td:first-child { color: var(--text); }
  .yes { color: #4ade80; font-weight: 700; }
  .no  { color: #f87171; font-weight: 700; }
  .partial { color: #fbbf24; font-weight: 700; }
  .vs-cta {
    margin-top: 48px;
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    text-align: center;
  }
  .vs-cta p { font-size: 0.92rem; color: var(--mid); margin-bottom: 16px; }
  .vs-cta-btn {
    display: inline-block;
    background: var(--accent);
    color: #000;
    font-weight: 800;
    font-family: "Bricolage Grotesque", sans-serif;
    padding: 12px 28px;
    border-radius: 10px;
    font-size: 0.92rem;
    transition: opacity 0.15s;
  }
  .vs-cta-btn:hover { opacity: 0.85; }
</style>
```

- [ ] **Step 2 : Lint et commit**

```bash
npm run lint
git add src/routes/\(site\)/vs/blinest/+page.svelte
git commit -m "feat(seo): page comparaison ZIK vs Blinest"
```

---

## Task 8 : Page de comparaison /vs/blindtest-io

**Objectif SEO :** Capturer "ZIK vs Blindtest.io", "alternative à Blindtest.io".

**Fichiers :**

- Create: `src/routes/(site)/vs/blindtest-io/+page.svelte`

- [ ] **Step 1 : Créer le fichier**

```svelte
<script>
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "ZIK vs Blindtest.io — Comparaison des blind tests en ligne",
    "description": "ZIK et Blindtest.io sont deux blind tests musicaux en ligne. Comparaison factuelle : playlists personnalisées, modes de jeu, classement ELO, Mode Salon.",
    "url": "https://www.zik-music.fr/vs/blindtest-io",
    "inLanguage": "fr-FR",
    "isPartOf": { "@type": "WebSite", "url": "https://www.zik-music.fr/", "name": "ZIK" },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://www.zik-music.fr/" },
        { "@type": "ListItem", "position": 2, "name": "ZIK vs Blindtest.io", "item": "https://www.zik-music.fr/vs/blindtest-io" }
      ]
    }
  });
</script>

<svelte:head>
  <title>ZIK vs Blindtest.io — Comparaison des blind tests musicaux en ligne</title>
  <meta name="description" content="ZIK ou Blindtest.io ? Comparaison factuelle : ZIK propose l'import Spotify/Deezer, un classement ELO compétitif et un Mode Salon pour les soirées. Gratuit, sans inscription." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/vs/blindtest-io" />
  <meta property="og:title" content="ZIK vs Blindtest.io — Comparaison blind test en ligne" />
  <meta property="og:description" content="ZIK et Blindtest.io sont deux blind tests musicaux en ligne. ZIK permet l'import de playlists Spotify/Deezer et propose un Mode Salon pour les soirées." />
  <meta property="og:url" content="https://www.zik-music.fr/vs/blindtest-io" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png" />
  <script type="application/ld+json">{@html jsonLd}</script>
</svelte:head>

<main class="vs-page">
  <div class="vs-back">
    <a href="/">← Retour à ZIK</a>
  </div>

  <article class="vs-article">

    <header class="vs-header">
      <div class="vs-logos">
        <span class="vs-logo-zik">ZIK</span>
        <span class="vs-separator">vs</span>
        <span class="vs-logo-other">Blindtest.io</span>
      </div>
      <h1>ZIK vs Blindtest.io : quel blind test en ligne choisir ?</h1>
      <p class="vs-intro">
        ZIK et Blindtest.io sont deux plateformes de blind test musical en ligne.
        Cette comparaison présente leurs différences de façon factuelle pour vous aider à choisir
        selon votre usage.
      </p>
    </header>

    <section class="vs-section">
      <h2>Ce que fait ZIK</h2>
      <p>
        ZIK est un blind test musical multijoueur en temps réel avec trois modes de jeu :
      </p>
      <ul>
        <li><strong>Mode Classique</strong> — saisie libre du titre et de l'artiste, classement ELO compétitif</li>
        <li><strong>Mode QCM</strong> — 4 propositions à choix multiple, sans pression</li>
        <li><strong>Mode Salon</strong> — hôte sur grand écran, joueurs sur smartphone (QR code / code)</li>
      </ul>
      <p>
        ZIK permet d'importer des playlists depuis Spotify et Deezer, ou de créer des playlists manuellement.
        Rooms publiques, privées et rooms officielles thématiques disponibles.
      </p>
    </section>

    <section class="vs-section">
      <h2>Ce que fait Blindtest.io</h2>
      <p>
        Blindtest.io est un blind test musical en ligne permettant de jouer à partir d'extraits musicaux.
        La plateforme propose des thèmes et catégories musicales prédéfinis.
      </p>
      <p>
        Cette comparaison est basée sur les informations publiquement disponibles. Si des fonctionnalités
        ont évolué, ZIK ne saurait en être tenu responsable.
      </p>
    </section>

    <section class="vs-section">
      <h2>Comparaison rapide</h2>
      <div class="vs-table-wrap">
        <table class="vs-table">
          <thead>
            <tr>
              <th>Fonctionnalité</th>
              <th>ZIK</th>
              <th>Blindtest.io</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Import playlists Spotify / Deezer</td><td class="yes">✓</td><td class="no">✗</td></tr>
            <tr><td>Multijoueur en temps réel</td><td class="yes">✓</td><td class="yes">✓</td></tr>
            <tr><td>Classement ELO compétitif</td><td class="yes">✓</td><td class="no">✗</td></tr>
            <tr><td>Mode Salon (TV + smartphones)</td><td class="yes">✓</td><td class="no">✗</td></tr>
            <tr><td>Mode QCM</td><td class="yes">✓</td><td class="yes">✓</td></tr>
            <tr><td>Rooms privées avec code</td><td class="yes">✓</td><td class="yes">✓</td></tr>
            <tr><td>Sans inscription obligatoire</td><td class="yes">✓</td><td class="partial">Variable</td></tr>
            <tr><td>Entièrement gratuit</td><td class="yes">✓</td><td class="partial">Variable</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="vs-section">
      <h2>Quand choisir ZIK ?</h2>
      <ul>
        <li>Vous voulez utiliser vos propres playlists Spotify ou Deezer</li>
        <li>Vous cherchez un classement ELO compétitif persistant</li>
        <li>Vous organisez une soirée et voulez un Mode Salon (TV + smartphones)</li>
        <li>Vous voulez une expérience multijoueur en temps réel, gratuite et sans inscription</li>
      </ul>
    </section>

    <div class="vs-cta">
      <p>ZIK est conçu pour le blind test musical multijoueur. Essayez-le gratuitement.</p>
      <a href="/" class="vs-cta-btn">Jouer sur ZIK →</a>
    </div>

  </article>
</main>

<style>
  .vs-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 48px clamp(16px, 5vw, 48px) 80px;
  }
  .vs-back a {
    font-size: 0.82rem;
    color: var(--accent);
    font-weight: 600;
    opacity: 0.8;
    transition: opacity 0.15s;
  }
  .vs-back a:hover { opacity: 1; }
  .vs-back { margin-bottom: 32px; }
  .vs-header { margin-bottom: 40px; }
  .vs-logos {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
  }
  .vs-logo-zik {
    font-family: "Bricolage Grotesque", sans-serif;
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--accent);
  }
  .vs-separator { font-size: 1rem; font-weight: 700; color: var(--dim); }
  .vs-logo-other {
    font-family: "Bricolage Grotesque", sans-serif;
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--mid);
  }
  .vs-article h1 {
    font-family: "Bricolage Grotesque", sans-serif;
    font-size: clamp(1.5rem, 3vw, 2.2rem);
    font-weight: 900;
    letter-spacing: -1px;
    line-height: 1.2;
    margin-bottom: 16px;
  }
  .vs-intro { font-size: 0.92rem; color: var(--mid); line-height: 1.7; }
  .vs-section {
    margin-bottom: 36px;
    padding-bottom: 36px;
    border-bottom: 1px solid var(--border);
  }
  .vs-section:last-of-type { border-bottom: none; }
  .vs-section h2 {
    font-family: "Bricolage Grotesque", sans-serif;
    font-size: 1.15rem;
    font-weight: 800;
    margin-bottom: 14px;
    color: var(--text);
  }
  .vs-section p { font-size: 0.88rem; color: var(--mid); line-height: 1.7; margin-bottom: 10px; }
  .vs-section ul { padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .vs-section li {
    font-size: 0.88rem;
    color: var(--mid);
    line-height: 1.6;
    padding-left: 18px;
    position: relative;
  }
  .vs-section li::before { content: "→"; position: absolute; left: 0; color: var(--accent); font-weight: 700; }
  .vs-table-wrap { overflow-x: auto; }
  .vs-table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  .vs-table th, .vs-table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); }
  .vs-table thead th {
    font-weight: 700; font-size: 0.78rem; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--dim); background: rgb(var(--c-glass) / 0.04);
  }
  .vs-table td:first-child { color: var(--text); }
  .yes { color: #4ade80; font-weight: 700; }
  .no  { color: #f87171; font-weight: 700; }
  .partial { color: #fbbf24; font-weight: 700; }
  .vs-cta {
    margin-top: 48px;
    background: rgb(var(--c-glass) / 0.04);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    text-align: center;
  }
  .vs-cta p { font-size: 0.92rem; color: var(--mid); margin-bottom: 16px; }
  .vs-cta-btn {
    display: inline-block;
    background: var(--accent);
    color: #000;
    font-weight: 800;
    font-family: "Bricolage Grotesque", sans-serif;
    padding: 12px 28px;
    border-radius: 10px;
    font-size: 0.92rem;
    transition: opacity 0.15s;
  }
  .vs-cta-btn:hover { opacity: 0.85; }
</style>
```

- [ ] **Step 2 : Lint et commit**

```bash
npm run lint
git add src/routes/\(site\)/vs/blindtest-io/+page.svelte
git commit -m "feat(seo): page comparaison ZIK vs Blindtest.io"
```

---

## Task 9 : Sitemap XML dynamique

**Objectif :** Déclarer toutes les pages indexables à Google/Bing via un sitemap XML standard.

**Fichiers :**

- Create: `src/routes/sitemap.xml/+server.js`

- [ ] **Step 1 : Créer le server endpoint**

```javascript
import { supabase } from "$lib/server/config.js";

const SITE = "https://www.zik-music.fr";

const STATIC_PAGES = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/rooms", changefreq: "hourly", priority: "0.9" },
  { loc: "/playlists", changefreq: "weekly", priority: "0.7" },
  { loc: "/salon", changefreq: "monthly", priority: "0.7" },
  { loc: "/docs", changefreq: "monthly", priority: "0.6" },
  { loc: "/vs/kahoot", changefreq: "monthly", priority: "0.6" },
  { loc: "/vs/blinest", changefreq: "monthly", priority: "0.6" },
  { loc: "/vs/blindtest-io", changefreq: "monthly", priority: "0.6" },
  { loc: "/cgu", changefreq: "yearly", priority: "0.2" },
  { loc: "/confidentialite", changefreq: "yearly", priority: "0.2" },
  { loc: "/mentions-legales", changefreq: "yearly", priority: "0.2" },
];

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const urls = [...STATIC_PAGES];

  const { data: rooms } = await supabase
    .from("rooms")
    .select("code, updated_at")
    .eq("is_public", true)
    .order("last_active_at", { ascending: false })
    .limit(200);

  if (rooms) {
    for (const room of rooms) {
      urls.push({
        loc: `/room/${room.code}`,
        changefreq: "daily",
        priority: "0.5",
        lastmod: room.updated_at ? room.updated_at.slice(0, 10) : undefined,
      });
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(SITE + u.loc)}</loc>
    <lastmod>${u.lastmod ?? today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

- [ ] **Step 2 : Vérifier que `$lib/server/config.js` exporte bien `supabase`**

```bash
grep -n "export.*supabase" src/lib/server/config.js
```

Résultat attendu : une ligne `export const supabase = ...` ou `export { supabase }`.

- [ ] **Step 3 : Tester le sitemap localement**

```bash
npm run dev
```

Naviguer vers `http://localhost:5173/sitemap.xml` et vérifier que le XML est valide.

- [ ] **Step 4 : Lint et commit**

```bash
npm run lint
git add src/routes/sitemap.xml/+server.js
git commit -m "feat(seo): sitemap XML dynamique — pages statiques + rooms publiques"
```

---

## Task 10 : Ajouter les liens vs/\* dans le footer

**Objectif :** Les pages de comparaison doivent être accessibles depuis le site (signal interne pour les crawlers).

**Fichiers :**

- Modify: `src/routes/(site)/+layout.svelte`

- [ ] **Step 1 : Ajouter une colonne "Comparer" dans le footer**

Dans le footer de `+layout.svelte`, après la div `.footer-col` "Légal" (autour de la ligne 173), ajouter :

```svelte
<!-- Comparer -->
<div class="footer-col">
  <p class="footer-col-title">Comparer</p>
  <div class="footer-col-links">
    <a href="/vs/kahoot">ZIK vs Kahoot</a>
    <a href="/vs/blinest">ZIK vs Blinest</a>
    <a href="/vs/blindtest-io">ZIK vs Blindtest.io</a>
  </div>
</div>
```

- [ ] **Step 2 : Lint et commit**

```bash
npm run lint
git add src/routes/\(site\)/+layout.svelte
git commit -m "feat(seo): liens pages de comparaison dans le footer"
```

---

## Vérification finale

- [ ] Vérifier que toutes les pages de comparaison s'affichent correctement : `npm run dev` puis naviguer vers `/vs/kahoot`, `/vs/blinest`, `/vs/blindtest-io`
- [ ] Vérifier le sitemap : naviguer vers `/sitemap.xml`
- [ ] Vérifier l'accueil : les sections "Qu'est-ce que ZIK ?" et FAQ sont visibles
- [ ] Vérifier la page /salon : canonical et OG présents dans le `<head>`
- [ ] Vérifier la page /room/[code] d'une room QCM et une room Classique : descriptions différentes
- [ ] `npm run lint` propre

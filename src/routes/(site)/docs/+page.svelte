<script>
  import JsonLd from '$lib/components/JsonLd.svelte';
  import DocSidebar from '$lib/components/docs/DocSidebar.svelte';
  import DocHeader from '$lib/components/docs/DocHeader.svelte';
  import DecouverteSection from '$lib/components/docs/DecouverteSection.svelte';
  import RejoindreSection from '$lib/components/docs/RejoindreSection.svelte';
  import JouerSection from '$lib/components/docs/JouerSection.svelte';
  import PointsSection from '$lib/components/docs/PointsSection.svelte';
  import ZikleSection from '$lib/components/docs/ZikleSection.svelte';
  import SalonSection from '$lib/components/docs/SalonSection.svelte';
  import QcmSection from '$lib/components/docs/QcmSection.svelte';
  import PlaylistsSection from '$lib/components/docs/PlaylistsSection.svelte';
  import RoomsSection from '$lib/components/docs/RoomsSection.svelte';
  import CompteSection from '$lib/components/docs/CompteSection.svelte';
  import SuccesSection from '$lib/components/docs/SuccesSection.svelte';
  import CartesSection from '$lib/components/docs/CartesSection.svelte';
  import AmisSection from '$lib/components/docs/AmisSection.svelte';
  import ClassementSection from '$lib/components/docs/ClassementSection.svelte';
  import FaqSection from '$lib/components/docs/FaqSection.svelte';
  import { jsonLdPage, jsonLdFaq } from '$lib/components/docs/jsonld.js';
</script>

<svelte:head>
  <title>ZIK - Documentation | Blind Test Multijoueur</title>
  <meta name="description" content="Guide complet du blind test ZIK : comment jouer, système de points et bonus vitesse, Mode Salon Kahoot-like, import Deezer, classement ELO, FAQ. Gratuit en ligne." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/docs" />
  <meta property="og:title" content="Guide complet - Blind Test ZIK | Règles, Points, Mode Salon" />
  <meta property="og:description" content="Guide complet du blind test ZIK : comment jouer, système de points, Mode Salon Kahoot-like, import Deezer, classement ELO, FAQ." />
  <meta property="og:url" content="https://www.zik-music.fr/docs" />
  <meta name="twitter:title" content="Guide complet - Blind Test ZIK | Règles, Points, Mode Salon" />
  <meta name="twitter:description" content="Comment jouer, système de points, Mode Salon Kahoot-like, import Deezer, classement ELO, FAQ. Guide complet du blind test ZIK." />

  <JsonLd json={jsonLdPage} />
  <JsonLd json={jsonLdFaq} />
</svelte:head>

<div class="doc-root">
  <DocSidebar />

  <main class="doc-content">
    <DocHeader />
    <DecouverteSection />
    <RejoindreSection />
    <JouerSection />
    <PointsSection />
    <ZikleSection />
    <SalonSection />
    <QcmSection />
    <PlaylistsSection />
    <RoomsSection />
    <CompteSection />
    <SuccesSection />
    <CartesSection />
    <AmisSection />
    <ClassementSection />
    <FaqSection />

    <div class="doc-footer-note">
      <p>Documentation mise &agrave; jour &mdash; avril 2026. Une question non couverte&nbsp;? Utilisez le <strong>formulaire de contact</strong> dans le footer ou ouvrez une <a href="https://github.com/Tfoucher5/ZIK/issues" target="_blank" rel="noopener noreferrer">issue GitHub</a>.</p>
    </div>
  </main>
</div>

<style>
  .doc-root {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 0;
    max-width: 1200px;
    margin: 0 auto;
    padding: calc(var(--nav-h) + 32px) clamp(16px, 4vw, 60px) 40px;
    min-height: 100vh;
    align-items: start;
  }

  .doc-content {
    min-width: 0;
    padding-left: 40px;
    border-left: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
  }

  /* Styles communs aux sections (composants enfants) */
  .doc-content :global(section) {
    margin-bottom: 64px;
    padding-bottom: 64px;
    border-bottom: 1px solid var(--border, rgb(var(--c-glass) / 0.06));
  }

  .doc-content :global(section:last-of-type) {
    border-bottom: none;
  }

  .doc-content :global(h2) {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--text, #fff);
    margin: 0 0 24px;
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 12px;
    scroll-margin-top: 90px;
  }

  .doc-content :global(h3) {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text, #fff);
    margin: 32px 0 12px;
  }

  .doc-content :global(p) {
    font-size: 0.92rem;
    color: var(--mid, #ccc);
    line-height: 1.75;
    margin: 0 0 16px;
  }

  .doc-content :global(a) {
    color: var(--accent, #7c3aed);
    text-decoration: none;
  }

  .doc-content :global(a:hover) {
    text-decoration: underline;
  }

  .doc-content :global(code) {
    font-family: monospace;
    font-size: 0.82rem;
    background: rgb(var(--c-glass) / 0.07);
    border: 1px solid rgb(var(--c-glass) / 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--text, #fff);
  }

  .doc-content :global(.doc-list) {
    padding-left: 20px;
    margin: 0 0 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .doc-content :global(.doc-list li) {
    font-size: 0.92rem;
    color: var(--mid, #ccc);
    line-height: 1.6;
  }

  .doc-content :global(.doc-list li strong) {
    color: var(--text, #fff);
  }

  .doc-content :global(ol.doc-list) {
    list-style: decimal;
  }

  .doc-content :global(ul.doc-list) {
    list-style: disc;
  }

  .doc-footer-note {
    margin-top: 48px;
    padding-top: 24px;
    border-top: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
    font-size: 0.8rem;
    color: var(--dim, #888);
    text-align: center;
  }

  .doc-footer-note a {
    color: var(--accent, #7c3aed);
  }

  @media (max-width: 768px) {
    .doc-root {
      grid-template-columns: 1fr;
      padding: calc(var(--nav-h) + 24px) 16px 36px;
    }

    .doc-content {
      padding-left: 0;
      border-left: none;
    }

    .doc-content :global(h2) {
      font-size: 1.3rem;
    }
  }
</style>

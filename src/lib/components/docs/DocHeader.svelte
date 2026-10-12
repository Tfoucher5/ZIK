<button class="btn-back doc-back" onclick={() => history.back()}>Retour</button>

<nav class="breadcrumb" aria-label="Fil d'Ariane">
  <a href="/">Accueil</a>
  <span class="breadcrumb-sep">/</span>
  <span>Documentation</span>
</nav>

<h1 class="doc-title">Documentation ZIK</h1>
<p class="doc-subtitle">Tout ce que vous devez savoir pour jouer, créer et progresser sur ZIK — le blind test multijoueur en ligne.</p>

<style>
  .doc-back { margin-bottom: 20px; }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    color: var(--dim, #888);
    margin-bottom: 28px;
  }

  /* nav en plus pour passer devant « .doc-content a » de la page */
  nav.breadcrumb a {
    color: var(--dim, #888);
    text-decoration: none;
    transition: color 0.15s;
  }

  .breadcrumb a:hover {
    color: var(--text, #fff);
  }

  .breadcrumb-sep {
    color: var(--border, rgb(var(--c-glass) / 0.2));
  }

  .doc-title {
    font-family: "Barlow Condensed", sans-serif;
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    font-weight: 800;
    letter-spacing: -1px;
    color: var(--text, #fff);
    margin: 0 0 12px;
    line-height: 1.15;
  }

  .doc-subtitle {
    font-size: 1rem;
    color: var(--mid, #aaa);
    margin: 0 0 48px;
    line-height: 1.65;
    max-width: 600px;
  }

  @media (max-width: 768px) {
    .doc-title {
      font-size: 1.6rem;
    }
  }
</style>

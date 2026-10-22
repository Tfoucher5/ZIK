<script>
  import JsonLd from '$lib/components/ui/JsonLd.svelte';

  /**
   * Bloc : { p } ou { ul } (élément de liste : texte, ou [gras, suite]).
   * Cellule du tableau : true = ✓, false = ✗, texte = partiel.
   * @typedef {{ p?: string, ul?: (string | string[])[] }} VsBlock
   * @typedef {{ title: string, blocks?: VsBlock[], rows?: (string | boolean)[][] }} VsSection
   * @type {{
   *   slug: string, name: string, title: string, description: string,
   *   ogTitle: string, ogDescription: string, ldName: string, ldDescription: string,
   *   h1: string, intro: string, sections: VsSection[], cta: { text: string, label: string }
   * }}
   */
  let { slug, name, title, description, ogTitle, ogDescription, ldName, ldDescription, h1, intro, sections, cta } = $props();

  const url = $derived(`https://www.zik-music.fr/vs/${slug}`);
  const jsonLd = $derived(JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": ldName,
    "description": ldDescription,
    "url": url,
    "inLanguage": "fr-FR",
    "isPartOf": { "@type": "WebSite", "url": "https://www.zik-music.fr/", "name": "ZIK" },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://www.zik-music.fr/" },
        { "@type": "ListItem", "position": 2, "name": `ZIK vs ${name}`, "item": url }
      ]
    }
  }));

  const cellClass = (v) => v === true ? 'yes' : v === false ? 'no' : 'partial';
  const cellText = (v) => v === true ? '✓' : v === false ? '✗' : v;
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href={url} />
  <meta property="og:title" content={ogTitle} />
  <meta property="og:description" content={ogDescription} />
  <meta property="og:url" content={url} />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png?v=3.12.0" />
  <JsonLd json={jsonLd} />
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
        <span class="vs-logo-other">{name}</span>
      </div>
      <h1>{h1}</h1>
      <p class="vs-intro">{intro}</p>
    </header>

    {#each sections as s (s.title)}
      <section class="vs-section">
        <h2>{s.title}</h2>
        {#if s.rows}
          <div class="vs-table-wrap">
            <table class="vs-table">
              <thead>
                <tr>
                  <th>Fonctionnalité</th>
                  <th>ZIK</th>
                  <th>{name}</th>
                </tr>
              </thead>
              <tbody>
                {#each s.rows as [label, zik, other] (label)}
                  <tr><td>{label}</td><td class={cellClass(zik)} data-label="ZIK">{cellText(zik)}</td><td class={cellClass(other)} data-label={name}>{cellText(other)}</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
        {#each s.blocks ?? [] as b, i (i)}
          {#if b.ul}
            <ul>
              {#each b.ul as li, j (j)}
                <li>{#if Array.isArray(li)}<strong>{li[0]}</strong>{li[1]}{:else}{li}{/if}</li>
              {/each}
            </ul>
          {:else}
            <p>{b.p}</p>
          {/if}
        {/each}
      </section>
    {/each}

    <div class="vs-cta">
      <p>{cta.text}</p>
      <a href="/" class="vs-cta-btn">{cta.label}</a>
    </div>

  </article>
</main>

<style>
  .vs-page {
    max-width: 800px;
    margin: 0 auto;
    padding: calc(var(--nav-h) + 32px) clamp(16px, 5vw, 48px) 80px;
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
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--accent);
  }
  .vs-separator { font-size: 1rem; font-weight: 700; color: var(--dim); }
  .vs-logo-other {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--mid);
  }
  .vs-article h1 {
    font-family: "Barlow Condensed", sans-serif;
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
    font-family: "Barlow Condensed", sans-serif;
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
    color: var(--on-accent);
    font-weight: 800;
    font-family: "Barlow Condensed", sans-serif;
    padding: 12px 28px;
    border-radius: 10px;
    font-size: 0.92rem;
    transition: opacity 0.15s;
  }
  .vs-cta-btn:hover { opacity: 0.85; }

  @media (max-width: 768px) {
    .vs-page { padding: calc(var(--nav-h) + 20px) 16px 56px; }
    .vs-back { margin-bottom: 20px; }
    .vs-header { margin-bottom: 28px; }
    .vs-logos { gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
    .vs-logo-zik, .vs-logo-other { font-size: 1.25rem; }
    .vs-section { margin-bottom: 26px; padding-bottom: 26px; }
    .vs-cta { margin-top: 32px; padding: 24px 18px; }
  }

  /* Le tableau comparatif passe en lignes empilées : le scroll horizontal est
     pénalisé en ergonomie mobile. */
  @media (max-width: 560px) {
    .vs-table-wrap { overflow-x: visible; }
    .vs-table thead { display: none; }
    .vs-table, .vs-table tbody, .vs-table tr, .vs-table td { display: block; width: 100%; }
    .vs-table tr {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    .vs-table td { border-bottom: none; padding: 3px 0; }
    .vs-table td:first-child {
      font-weight: 700;
      font-size: 0.86rem;
      margin-bottom: 4px;
    }
    .vs-table td:not(:first-child)::before {
      content: attr(data-label) " : ";
      color: var(--dim);
      font-weight: 600;
    }
  }
</style>

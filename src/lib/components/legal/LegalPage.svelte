<script>
  /** @type {{ title: string, updated: string, children: import('svelte').Snippet }} */
  let { title, updated, children } = $props();
</script>

<main class="legal-page">
  <button onclick={() => history.back()} class="settings-back" style="background:none;border:none;cursor:pointer;padding:0;display:inline-block;margin-bottom:24px;font-size:.82rem;color:var(--mid);font-weight:500;transition:color .15s">&larr; Retour</button>
  <h1>{title}</h1>
  <p class="legal-date">Derni&egrave;re mise &agrave; jour&nbsp;: {updated}</p>

  {@render children()}
</main>

<style>
.legal-page {
  max-width: 720px;
  margin: 0 auto;
  padding: calc(var(--nav-h) + 32px) 24px 80px;
}
.legal-page h1 {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 6px;
}
.legal-date { font-size: 0.8rem; color: var(--dim); margin-bottom: 40px; }
.legal-page :global(section) { margin-bottom: 32px; }
.legal-page :global(h2) {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--text);
}
.legal-page :global(p), .legal-page :global(li) { font-size: 0.9rem; color: var(--mid); line-height: 1.7; }
.legal-page :global(ul) { padding-left: 20px; margin: 8px 0; }
.legal-page :global(li) { margin-bottom: 4px; }
.legal-page :global(a) { color: var(--accent); }
.legal-page :global(code) {
  font-size: 0.82rem;
  background: rgb(var(--c-glass) / 0.05);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 5px;
}
</style>

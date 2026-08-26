<script>
  /**
   * TrackAudioDebugger — rejoue la chaîne audio d'un titre et permet de la corriger.
   * Props:
   *   trackId — identifiant du catalogue `tracks`
   *   token   — jeton super_admin
   */
  let { trackId, token } = $props();

  let report  = $state(null);
  let loading = $state(false);
  let erreur  = $state('');
  let saving  = $state(false);
  let saved   = $state(false);

  let query        = $state('');
  let searching    = $state(false);
  let results      = $state(null);
  let searchErrors = $state([]);
  let choisi       = $state(null);

  // L'ordre reproduit celui que le jeu emprunte réellement.
  const ETAPES = [
    ['catalogue', 'Catalogue'],
    ['recherche', 'Recherche YouTube'],
    ['ytdlp', 'Extraction yt-dlp'],
    ['proxy', 'Flux audio'],
    ['deezer', 'Deezer'],
    ['itunes', 'iTunes'],
  ];

  const etapes = $derived(
    report ? ETAPES.filter(([cle]) => report.steps[cle]) : [],
  );

  async function tester() {
    loading = true; erreur = ''; saved = false;
    try {
      const res = await fetch(`/api/admin/track-audio-debug?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      });
      const d = await res.json();
      if (res.status === 403) { erreur = 'Session expirée — recharge la page.'; return; }
      if (!res.ok) { erreur = d.error || 'Le diagnostic a échoué.'; return; }
      report = d;
      if (!query.trim()) query = `${d.track.artist} ${d.track.title}`.trim();
    } catch { erreur = 'Le serveur est injoignable.'; }
    finally { loading = false; }
  }

  async function chercher() {
    if (!query.trim()) return;
    searching = true; erreur = ''; saved = false; choisi = null;
    try {
      const res = await fetch(`/api/admin/track-audio-search?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const d = await res.json();
      if (res.status === 403) { erreur = 'Session expirée — recharge la page.'; return; }
      if (!res.ok) { erreur = d.error || 'La recherche a échoué.'; return; }
      results = d.results;
      searchErrors = d.errors ?? [];
    } catch { erreur = 'Le serveur est injoignable.'; }
    finally { searching = false; }
  }

  // On n'enregistre que ce qui a été écouté : la source vient d'une proposition.
  async function utiliser(r) {
    saving = true; erreur = '';
    try {
      const res = await fetch(`/api/admin/track-audio-fix?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId,
          previewUrl: r.previewUrl,
          externalId: r.externalId || undefined,
        }),
      });
      const d = await res.json();
      if (res.status === 403) { erreur = 'Session expirée — recharge la page.'; return; }
      if (!res.ok) { erreur = d.error || "L'enregistrement a échoué."; return; }
      saved = true;
      choisi = r;
      await tester();
    } catch { erreur = 'Le serveur est injoignable.'; }
    finally { saving = false; }
  }

  function duree(s) {
    if (!s) return '';
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
</script>

<section class="tad">
  <header class="tad-top">
    <span class="tad-eyebrow">Diagnostic audio</span>
    <button class="tad-btn tad-btn-run" onclick={tester} disabled={loading}>
      {loading ? 'Analyse…' : report ? 'Relancer' : 'Analyser la chaîne'}
    </button>
  </header>

  {#if erreur}<p class="tad-alert">{erreur}</p>{/if}

  {#if report}
    <p class="tad-track">
      <span class="tad-track-a">{report.track.artist}</span>
      <span class="tad-track-t">{report.track.title}</span>
    </p>

    <p class="tad-verdict" class:ko={!report.playable}>
      {report.playable
        ? 'Une source jouable a été trouvée.'
        : 'Aucune source jouable — ce titre reste muet en partie.'}
    </p>

    <ol class="tad-chain">
      {#each etapes as [cle, libelle], i (cle)}
        <li class:ok={report.steps[cle].ok} class:last={i === etapes.length - 1}>
          <span class="tad-idx">{String(i + 1).padStart(2, '0')}</span>
          <span class="tad-node" aria-hidden="true"></span>
          <div class="tad-body">
            <span class="tad-step">{libelle}</span>
            <span class="tad-detail">{report.steps[cle].detail}</span>
            {#if report.steps[cle].error}
              <span class="tad-why">{report.steps[cle].error}</span>
            {/if}

            {#if cle === 'recherche' && report.candidats?.length}
              <ul class="tad-yt">
                {#each report.candidats as c (c.id)}
                  <li class:retenu={c.retenu}>
                    <span class="tad-yt-mark">{c.retenu ? '▸' : ''}</span>
                    <a href="https://www.youtube.com/watch?v={c.id}" target="_blank" rel="noopener noreferrer">
                      {c.titre}
                    </a>
                    <span class="tad-yt-meta">
                      {c.chaine}{c.topic ? ' · officielle' : ''}{c.duree ? ` · ${duree(c.duree)}` : ''}
                    </span>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </li>
      {/each}
    </ol>

    {#if report.playable}
      <!-- svelte-ignore a11y_media_has_caption -->
      <audio class="tad-audio" controls src={report.playable}></audio>
    {/if}

    <div class="tad-sep"></div>

    <span class="tad-eyebrow">Remplacer la source</span>
    <div class="tad-search">
      <input
        bind:value={query}
        placeholder="Artiste et titre"
        onkeydown={e => { if (e.key === 'Enter') chercher(); }}
      >
      <button class="tad-btn" onclick={chercher} disabled={searching || !query.trim()}>
        {searching ? 'Recherche…' : 'Chercher'}
      </button>
    </div>

    {#each searchErrors as e (e)}
      <p class="tad-note">{e}</p>
    {/each}

    {#if results}
      {#if results.length}
        <p class="tad-note">Écoute, puis remplace la source par celle qui correspond.</p>
        <ul class="tad-res">
          {#each results as r (r.source + (r.externalId ?? r.previewUrl))}
            <li class:chosen={choisi?.previewUrl === r.previewUrl}>
              {#if r.cover}
                <img src={r.cover} alt="" width="36" height="36">
              {/if}
              <div class="tad-res-txt">
                <span class="tad-res-t">{r.title}</span>
                <span class="tad-res-a">
                  {r.artist}{r.album ? ` · ${r.album}` : ''}{r.duration ? ` · ${duree(r.duration)}` : ''}
                </span>
              </div>
              <span class="tad-src">{r.source}</span>
              <!-- svelte-ignore a11y_media_has_caption -->
              <audio controls preload="none" src={r.previewUrl}></audio>
              <button class="tad-btn tad-btn-use" onclick={() => utiliser(r)} disabled={saving}>
                {saving ? '…' : 'Utiliser'}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="tad-note">Aucun extrait écoutable pour cette recherche.</p>
      {/if}
    {/if}

    {#if saved}
      <p class="tad-saved">
        Source remplacée{choisi ? ` par « ${choisi.title} » de ${choisi.artist}` : ''}.
      </p>
    {/if}
  {/if}
</section>

<style>
  .tad {
    --mono: 'JetBrains Mono', ui-monospace, monospace;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--c-border, rgba(255, 255, 255, 0.07));
    border-radius: 10px;
    padding: 14px 16px;
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .tad-top { display: flex; align-items: center; gap: 12px; }

  .tad-eyebrow {
    font-family: var(--mono);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--c-muted, #6b7280);
  }

  .tad-btn {
    background: none;
    border: 1px solid var(--c-border, rgba(255, 255, 255, 0.07));
    color: var(--c-text, #e2e8f0);
    font-family: inherit;
    font-size: 0.78rem;
    padding: 5px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .tad-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }
  .tad-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .tad-btn-run {
    margin-left: auto;
    border-color: rgba(99, 102, 241, 0.4);
    color: var(--c-indigo, #6366f1);
  }
  .tad-btn-run:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.6);
  }
  .tad-btn-use {
    border-color: rgba(34, 197, 94, 0.4);
    color: var(--c-green, #22c55e);
    flex-shrink: 0;
  }
  .tad-btn-use:hover:not(:disabled) {
    background: rgba(34, 197, 94, 0.08);
    border-color: rgba(34, 197, 94, 0.6);
  }

  .tad-track { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
  .tad-track-a { font-weight: 600; color: var(--c-text, #e2e8f0); font-size: 0.9rem; }
  .tad-track-t { color: var(--c-muted, #6b7280); font-size: 0.84rem; }

  .tad-verdict {
    font-size: 0.8rem;
    color: var(--c-green, #22c55e);
    border-left: 3px solid var(--c-green, #22c55e);
    padding-left: 10px;
  }
  .tad-verdict.ko {
    color: var(--c-red, #ef4444);
    border-left-color: var(--c-red, #ef4444);
  }

  /* Le rail suit l'ordre réel des tentatives : le filet montre jusqu'où ça tient. */
  .tad-chain { list-style: none; margin: 2px 0; padding: 0; }
  .tad-chain li {
    display: grid;
    grid-template-columns: 22px 12px 1fr;
    align-items: start;
    gap: 8px;
    position: relative;
    padding-bottom: 12px;
  }
  .tad-chain li::before {
    content: '';
    position: absolute;
    left: 27px;
    top: 14px;
    bottom: 0;
    width: 1px;
    background: var(--c-red, #ef4444);
    opacity: 0.35;
  }
  .tad-chain li.ok::before { background: var(--c-green, #22c55e); opacity: 0.4; }
  .tad-chain li.last { padding-bottom: 0; }
  .tad-chain li.last::before { display: none; }

  .tad-idx {
    font-family: var(--mono);
    font-size: 0.68rem;
    color: var(--c-muted, #6b7280);
    line-height: 1.5;
  }
  .tad-node {
    width: 9px;
    height: 9px;
    margin-top: 4px;
    border-radius: 50%;
    background: var(--c-red, #ef4444);
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
  }
  .tad-chain li.ok .tad-node {
    background: var(--c-green, #22c55e);
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
  }

  .tad-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .tad-step {
    font-family: var(--mono);
    font-size: 0.74rem;
    letter-spacing: 0.02em;
    color: var(--c-text, #e2e8f0);
  }
  .tad-detail {
    font-size: 0.76rem;
    color: var(--c-muted, #6b7280);
    word-break: break-word;
  }
  .tad-why {
    font-family: var(--mono);
    font-size: 0.7rem;
    color: var(--c-red, #ef4444);
  }

  /* Les cinq résultats de yt-dlp, celui que le jeu retient en tête de liste. */
  .tad-yt {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .tad-yt li {
    display: grid;
    grid-template-columns: 12px 1fr;
    gap: 6px;
    font-size: 0.73rem;
    color: var(--c-muted, #6b7280);
  }
  .tad-yt-mark {
    color: var(--c-green, #22c55e);
    font-family: var(--mono);
  }
  .tad-yt li.retenu a { color: var(--c-text, #e2e8f0); }
  .tad-yt a {
    color: var(--c-muted, #6b7280);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tad-yt a:hover { border-bottom-color: currentColor; }
  .tad-yt-meta {
    grid-column: 2;
    font-size: 0.68rem;
    color: var(--c-muted, #6b7280);
    opacity: 0.75;
  }

  .tad-audio { width: 100%; height: 32px; }
  .tad-sep {
    height: 1px;
    background: var(--c-border, rgba(255, 255, 255, 0.07));
    margin: 4px 0;
  }

  .tad-search { display: flex; flex-wrap: wrap; gap: 8px; }
  .tad-search input {
    flex: 1 1 240px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--c-border, rgba(255, 255, 255, 0.07));
    border-radius: 6px;
    color: var(--c-text, #e2e8f0);
    font-family: inherit;
    font-size: 0.8rem;
    padding: 6px 10px;
    outline: none;
  }
  .tad-search input:focus-visible {
    border-color: rgba(99, 102, 241, 0.6);
  }

  .tad-note { font-size: 0.75rem; color: var(--c-muted, #6b7280); }

  .tad-res {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .tad-res li {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 7px 9px;
    background: var(--c-panel, #13161e);
    border: 1px solid var(--c-border, rgba(255, 255, 255, 0.07));
    border-radius: 8px;
  }
  .tad-res li.chosen { border-color: rgba(34, 197, 94, 0.5); }
  .tad-res img { border-radius: 4px; flex-shrink: 0; }
  .tad-res-txt { display: flex; flex-direction: column; flex: 1 1 160px; min-width: 0; }
  .tad-res-t {
    font-size: 0.82rem;
    color: var(--c-text, #e2e8f0);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tad-res-a { font-size: 0.74rem; color: var(--c-muted, #6b7280); }
  .tad-src {
    font-family: var(--mono);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-muted, #6b7280);
    border: 1px solid var(--c-border, rgba(255, 255, 255, 0.07));
    border-radius: 4px;
    padding: 2px 6px;
    flex-shrink: 0;
  }
  .tad-res audio { width: 200px; height: 30px; flex-shrink: 0; }

  .tad-alert {
    font-size: 0.78rem;
    color: var(--c-red, #ef4444);
    border-left: 3px solid var(--c-red, #ef4444);
    padding-left: 10px;
  }
  .tad-saved {
    font-size: 0.78rem;
    color: var(--c-green, #22c55e);
    border-left: 3px solid var(--c-green, #22c55e);
    padding-left: 10px;
  }

  @media (max-width: 640px) {
    .tad-res audio { width: 100%; }
  }
</style>

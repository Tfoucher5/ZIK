<script>
  import AudioChain from './AudioChain.svelte';
  import AudioResults from './AudioResults.svelte';
  import { post } from './audioDebug.js';

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

  async function tester() {
    loading = true; erreur = ''; saved = false;
    try {
      const d = await post('track-audio-debug', token, { trackId }, 'Le diagnostic a échoué.');
      report = d;
      if (!query.trim()) query = `${d.track.artist} ${d.track.title}`.trim();
    } catch (e) { erreur = e.message; }
    finally { loading = false; }
  }

  async function chercher() {
    if (!query.trim()) return;
    searching = true; erreur = ''; saved = false; choisi = null;
    try {
      const d = await post('track-audio-search', token, { query }, 'La recherche a échoué.');
      results = d.results;
      searchErrors = d.errors ?? [];
    } catch (e) { erreur = e.message; }
    finally { searching = false; }
  }

  // On n'enregistre que ce qui a été écouté : la source vient d'une proposition.
  async function utiliser(r) {
    saving = true; erreur = '';
    try {
      await post('track-audio-fix', token, {
        trackId,
        previewUrl: r.previewUrl,
        externalId: r.externalId || undefined,
      }, "L'enregistrement a échoué.");
      saved = true;
      choisi = r;
      await tester();
    } catch (e) { erreur = e.message; }
    finally { saving = false; }
  }

  // Épingler force le jeu à utiliser cette vidéo ; épingler la vidéo déjà
  // épinglée la libère et rend la main à la recherche automatique.
  async function epingler(videoId) {
    saving = true; erreur = '';
    try {
      await post('track-audio-fix', token, {
        trackId,
        youtubeId: report?.track?.youtubeId === videoId ? '' : videoId,
      }, "L'épinglage a échoué.");
      await tester();
    } catch (e) { erreur = e.message; }
    finally { saving = false; }
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

    <AudioChain {report} {saving} onPin={epingler} />

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
      <AudioResults {results} {choisi} {saving} onUse={utiliser} />
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

  .tad :global(.tad-btn) {
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
  .tad :global(.tad-btn:hover:not(:disabled)) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }
  .tad :global(.tad-btn:disabled) { opacity: 0.4; cursor: not-allowed; }
  .tad :global(.tad-btn-run) {
    margin-left: auto;
    border-color: rgba(99, 102, 241, 0.4);
    color: var(--c-indigo, #6366f1);
  }
  .tad :global(.tad-btn-run:hover:not(:disabled)) {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.6);
  }
  .tad :global(.tad-btn-use) {
    border-color: rgba(34, 197, 94, 0.4);
    color: var(--c-green, #22c55e);
    flex-shrink: 0;
  }
  .tad :global(.tad-btn-use:hover:not(:disabled)) {
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

  .tad :global(.tad-note) { font-size: 0.75rem; color: var(--c-muted, #6b7280); }


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

</style>

<script>
  import { duree } from './audioDebug.js';

  /** Étapes de la chaîne audio, dans l'ordre réel des tentatives du jeu, et vidéos YouTube candidates. */
  let { report, saving, onPin } = $props();

  const ETAPES = [
    ['catalogue', 'Catalogue'],
    ['recherche', 'Recherche YouTube'],
    ['ytdlp', 'Extraction yt-dlp'],
    ['proxy', 'Flux audio'],
    ['deezer', 'Deezer'],
    ['itunes', 'iTunes'],
  ];

  const etapes = $derived(ETAPES.filter(([cle]) => report.steps[cle]));
</script>

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
              {@const epingle = report.track.youtubeId === c.id}
              <li class:retenu={epingle || (!report.track.youtubeId && c.retenu)}>
                <span class="tad-yt-mark">
                  {epingle ? '📌' : (!report.track.youtubeId && c.retenu) ? '▸' : ''}
                </span>
                <a href="https://www.youtube.com/watch?v={c.id}" target="_blank" rel="noopener noreferrer">
                  {c.titre}
                </a>
                <span class="tad-yt-meta">
                  {c.chaine}{c.topic ? ' · officielle' : ''}{c.duree ? ` · ${duree(c.duree)}` : ''}
                  <button class="tad-pin" onclick={() => onPin(c.id)} disabled={saving}>
                    {epingle ? 'Détacher' : 'Épingler'}
                  </button>
                </span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </li>
  {/each}
</ol>

<style>
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
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 0.68rem;
    color: var(--c-muted, #6b7280);
  }
  .tad-pin {
    background: none;
    border: 1px solid var(--c-border, rgba(255, 255, 255, 0.07));
    border-radius: 3px;
    color: var(--c-muted, #6b7280);
    font-family: inherit;
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 2px 7px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .tad-pin:hover:not(:disabled) {
    color: var(--c-text, #e2e8f0);
    border-color: rgba(255, 255, 255, 0.2);
  }
  .tad-pin:disabled { opacity: 0.4; cursor: not-allowed; }
</style>

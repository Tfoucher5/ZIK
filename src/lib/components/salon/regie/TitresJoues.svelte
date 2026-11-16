<script>
  import { RAISONS } from './reponse.js';
  /**
   * Titres joués, du plus récent au plus ancien. On peut en signaler un après
   * coup ; un titre remplacé (vidéo illisible sur la TV) apparaît barré, sans alerte.
   * @type {{ history: { answer: string, replaced?: string }[], onReport: (reason: string, round: number) => void }}
   */
  let { history, onReport } = $props();

  let signales = $state({});

  // Nouvelle partie : l'historique repart de zéro, les signalements aussi
  $effect(() => {
    if (!history.length) signales = {};
  });

  function signaler(e, manche, raison) {
    signales = { ...signales, [manche]: raison };
    e.currentTarget.closest('details').open = false;
    onReport(raison, manche);
  }
</script>

{#if history.length}
  <section class="tj">
    <p class="rg-k">Titres joués · {history.length}</p>
    <ol>
      {#each [...history].reverse() as h, i (history.length - i)}
        {@const manche = history.length - i}
        <li>
          <details class:fait={signales[manche]}>
            <summary>
              <span>{String(manche).padStart(2, '0')}</span>
              <p>{h.answer}</p>
              <em>{signales[manche] ? 'Signalé' : 'Signaler'}</em>
            </summary>
            {#if !signales[manche]}
              <div class="rg-chips">
                {#each RAISONS as r (r)}
                  <button type="button" onclick={(e) => signaler(e, manche, r)}>{r}</button>
                {/each}
              </div>
            {/if}
          </details>
          {#if h.replaced}<p class="tj-rempl"><s>{h.replaced}</s> · remplacé : illisible sur la TV</p>{/if}
        </li>
      {/each}
    </ol>
  </section>
{/if}

<style>
  .tj { display: grid; gap: 8px; min-width: 0; }
  ol { list-style: none; border-top: 1px solid var(--line-2); }
  li { border-bottom: 1px solid var(--line); }
  summary {
    display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 10px; align-items: center;
    min-height: 52px; list-style: none; cursor: pointer;
  }
  summary::-webkit-details-marker { display: none; }
  summary > span { font-family: var(--mono); font-size: 13px; color: var(--muted); }
  summary p { padding: 6px 0; font-size: 16px; line-height: 1.25; overflow-wrap: anywhere; }
  summary em {
    display: inline-flex; align-items: center; min-height: 44px;
    font-style: normal; font-size: 14px; color: var(--soft);
    text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 4px;
  }
  .fait summary { cursor: default; pointer-events: none; }
  .fait em { text-decoration: none; color: var(--muted); }
  .tj-rempl { margin-top: -6px; padding: 0 0 10px 32px; font-size: 14px; line-height: 1.35; color: var(--muted); }
</style>

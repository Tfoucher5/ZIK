<script>
  import { prepareStory, shareStory } from './podiumStory.js';

  let { data } = $props();

  let file = $state(null);
  let status = $state('');
  $effect(() => {
    const d = data;
    file = null;
    status = '';
    let off = false;
    prepareStory(d).then((f) => { if (!off) file = f; }).catch(() => { if (!off) status = 'unavailable'; });
    return () => (off = true);
  });
  async function partager() {
    const r = await shareStory(file).catch(() => 'error');
    status = r === 'downloaded' || r === 'error' ? r : '';
  }
</script>

<!-- Image impossible à préparer sur ce téléphone : pas de bouton qui ne mène à rien -->
{#if status !== 'unavailable'}
  <button class="story" onclick={partager} disabled={!file}>
    <span class="mini" aria-hidden="true" style="--mc:{data.rank <= 3 ? data.color : 'var(--text)'}"><i></i><i></i><i></i></span>
    <span>
      <b aria-live="polite">{status === 'downloaded' ? 'Image enregistrée' : status === 'error' ? "Le partage n'a pas marché, réessaie" : file ? 'Partager le podium en story' : "Préparation de l'image…"}</b>
      <small>« {data.line} »</small>
    </span>
    <em aria-hidden="true">↗</em>
  </button>
{/if}

<style>
  .story {
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
    width: 100%;
    margin-top: 18px;
    padding: 8px 18px 8px 8px;
    border-radius: 18px;
    border: 1px solid var(--border2);
    background: var(--surface);
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }
  .story:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .story:disabled {
    cursor: wait;
    opacity: 0.7;
  }
  .mini {
    width: 46px;
    aspect-ratio: 9 / 16;
    border-radius: 6px;
    background: var(--bg);
    border: 1px solid var(--border2);
    display: flex;
    align-items: flex-end;
    gap: 2px;
    overflow: hidden;
  }
  .mini i {
    width: 4px;
    height: 44%;
    background: var(--dim);
  }
  .mini i:first-child {
    flex: 1;
    height: 62%;
    background: var(--mc);
  }
  .mini i:nth-child(3) {
    height: 38%;
  }
  b {
    display: block;
    font-family: var(--s-cond);
    font-weight: 800;
    font-size: 22px;
    text-transform: uppercase;
    line-height: 1;
  }
  small {
    display: block;
    margin-top: 4px;
    font-size: 14px;
    line-height: 1.3;
    color: var(--mid);
  }
  em {
    font-style: normal;
    font-size: 22px;
    color: var(--mid);
  }
</style>

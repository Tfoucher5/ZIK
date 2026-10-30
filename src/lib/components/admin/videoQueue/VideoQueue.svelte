<script>
  import { onMount, untrack } from 'svelte';
  import { VideoQueue } from './videoQueue.svelte.js';
  import CandidateCard from './CandidateCard.svelte';

  let { token } = $props();

  const q = new VideoQueue(untrack(() => token));
  let preview = $state(null);
  let query = $state('');

  const track = $derived(q.current?.track);
  const res = $derived(q.candidates);
  const left = $derived(q.items ? q.items.length - q.index : 0);

  $effect(() => {
    query = res?.query ?? '';
    preview = null;
  });

  function onkey(e) {
    if (!q.current || e.target.closest?.('input') || e.ctrlKey || e.metaKey || e.altKey) return;
    const n = Number(e.key);
    if (n >= 1 && res?.videos?.[n - 1]) q.pick(res.videos[n - 1]);
    else if (e.key === 's') q.skip();
    else if (e.key === 'i') q.ignore();
  }

  onMount(() => q.load());
</script>

<svelte:window onkeydown={onkey} />

<div class="vq">
  <p class="count">
    {#if q.items}<b>{left}</b> à réparer · <b>{q.done}</b> réparés{:else}Chargement…{/if}
  </p>

  {#if q.loadErr}
    <p class="a-card bad">{q.loadErr}</p>
  {:else if q.items && !q.current}
    <p class="a-empty">Plus aucune vidéo à réparer.</p>
  {:else if track}
    <div class="track">
      {#if track.cover_url}<img src={track.cover_url} alt="" />{/if}
      <div>
        <p class="name"><b>{track.artist}</b> · {track.title}</p>
        {#if q.current.note}<p class="a-muted">« {q.current.note} »{q.current.count > 1 ? ` · ×${q.current.count}` : ''}</p>{/if}
      </div>
    </div>

    {#if preview}
      <div class="player">
        <iframe
          src="https://www.youtube-nocookie.com/embed/{preview}?start=30&autoplay=1&rel=0&playsinline=1"
          title="Aperçu de la vidéo"
          allow="autoplay; encrypted-media"
        ></iframe>
      </div>
    {/if}

    {#if !res?.videos}
      <p class="a-empty">Recherche des vidéos…</p>
    {:else}
      {#if res.err}<p class="a-err">{res.err}</p>{/if}
      <ul class="grid">
        {#each res.videos as v, i (v.id)}
          <li>
            <CandidateCard
              video={v}
              n={i + 1}
              reported={v.id === q.current.context?.videoId}
              previewing={preview === v.id}
              onpick={() => q.pick(v)}
              onpreview={() => (preview = preview === v.id ? null : v.id)}
            />
          </li>
        {:else}
          <li class="a-muted">Aucune vidéo trouvée. Essaie une autre recherche.</li>
        {/each}
      </ul>
    {/if}

    <form class="find" onsubmit={(e) => { e.preventDefault(); if (query.trim()) q.search(q.current, query.trim()); }}>
      <label class="a-sr" for="vq-q">Autre recherche</label>
      <input id="vq-q" class="a-input" bind:value={query} placeholder="Artiste - titre" />
      <button class="a-btn" type="submit">Chercher</button>
    </form>

    <div class="a-btns">
      <button class="a-btn" type="button" onclick={() => q.skip()}>Passer <kbd>S</kbd></button>
      <button class="a-btn" type="button" onclick={() => q.ignore()}>Ignorer <kbd>I</kbd></button>
    </div>
    <p class="help">Clique sur la bonne vidéo (ou touche 1 à 8) : elle est épinglée, le départ de l'extrait est choisi par le jeu, et le titre suivant s'affiche.</p>
  {/if}

  {#each q.failures as f, i (i)}
    <p class="a-err">Échec pour {f.issue.track.artist} · {f.issue.track.title} : {f.error}</p>
  {/each}
</div>

<style>
  .vq { display: grid; gap: 12px; }
  .count { font-size: 0.9rem; color: var(--a-dim); }
  .track { display: flex; align-items: center; gap: 12px; }
  .track img { flex: 0 0 56px; width: 56px; height: 56px; border-radius: 8px; object-fit: cover; }
  .name { font-size: 1.15rem; }
  .player { position: relative; aspect-ratio: 16 / 9; max-width: 560px; overflow: hidden; border-radius: 12px; background: #000; }
  .player iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; list-style: none; }
  @media (min-width: 900px) { .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
  .find { display: flex; gap: 8px; }
  kbd { margin-left: 4px; padding: 0 5px; border: 1px solid var(--a-line); border-radius: 4px; font-size: 0.7rem; color: var(--a-dim); }
  .help { font-size: 0.78rem; color: var(--a-dim); }
</style>

<script>
  import { getContext } from 'svelte';
  import TrackResult from './TrackResult.svelte';
  import { coverThumb } from '$lib/shared/playlist/input.js';

  let { q, store, onArtist, onAlbum } = $props();

  const _ctx = getContext('zik');
  const isAdmin = $derived(_ctx.user?.profile?.role === 'super_admin');

  let source = $state('deezer');
  let results = $state([]);
  let resultsFor = $state('');
  let wanted = $state('');
  let loading = $state(false);
  let error = $state('');
  let active = $state(0);
  let pendingEnter = false;
  const cache = {};

  // Artistes présents dans les résultats, pour explorer leur discographie.
  const artists = $derived.by(() => {
    const top = results.slice(0, 10).filter((t) => t.artist_id);
    return top.filter((t, i) => top.findIndex((u) => u.artist_id === t.artist_id) === i).slice(0, 3);
  });

  // Prochain résultat pas encore dans la playlist, à partir de `from`.
  function nextFree(from) {
    const i = results.findIndex((t, k) => k >= from && !store.find(t));
    return i === -1 ? Math.min(from, Math.max(results.length - 1, 0)) : i;
  }

  function show(ck, data) {
    results = data;
    resultsFor = ck;
    active = nextFree(0);
    // Entrée tapée avant l'arrivée des résultats
    if (pendingEnter) { pendingEnter = false; addActive(); }
  }

  $effect(() => {
    const query = q.trim();
    const ck = `${source}:${query}`;
    wanted = ck;
    error = '';
    if (query.length < 2) { results = []; resultsFor = ck; pendingEnter = false; return; }
    if (cache[ck]) { show(ck, cache[ck]); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      loading = true;
      try {
        const r = await fetch(`/api/${ck.split(':')[0]}/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || data.message || `HTTP ${r.status}`);
        cache[ck] = data;
        show(ck, data);
      } catch (e) {
        if (e.name !== 'AbortError') { error = e.message; pendingEnter = false; }
      }
      loading = false;
    }, 200);
    return () => { clearTimeout(timer); ctrl.abort(); };
  });

  async function addActive() {
    const t = results[active];
    if (!t || store.find(t)) return;
    const i = active;
    if (await store.add(t)) active = nextFree(i + 1);
    scrollToActive();
  }

  function scrollToActive() {
    document.getElementById(`sr-${active}`)?.scrollIntoView({ block: 'nearest' });
  }

  // Clavier depuis la barre : ↑ ↓ pour choisir, Entrée pour ajouter.
  export function key(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (resultsFor !== wanted || loading) pendingEnter = true;
      else addActive();
      return true;
    }
    if (!results.length || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return false;
    e.preventDefault();
    active = e.key === 'ArrowDown' ? Math.min(active + 1, results.length - 1) : Math.max(active - 1, 0);
    scrollToActive();
    return true;
  }
</script>

{#if isAdmin}
  <div class="sr-src" role="radiogroup" aria-label="Source de recherche">
    {#each ['deezer', 'spotify'] as s (s)}
      <button role="radio" aria-checked={source === s} class:on={source === s} onclick={() => source = s}>{s}</button>
    {/each}
  </div>
{/if}

{#if artists.length}
  <div class="sr-artists">
    {#each artists as a (a.artist_id)}
      <button class="sr-chip" onclick={() => onArtist(a.artist_id)}>
        {#if a.cover_url}<img src={coverThumb(a.cover_url, 56)} alt="" width="22" height="22">{/if}
        <span>Tout {a.artist}</span><span aria-hidden="true">›</span>
      </button>
    {/each}
  </div>
{/if}

<div class="sr-list" aria-busy={loading}>
  {#each results as t, i (t.external_id)}
    <div id="sr-{i}">
      <TrackResult track={t} {store} active={i === active} {onArtist} {onAlbum} onhover={() => { if (active !== i) active = i; }} />
    </div>
  {/each}
</div>

<div aria-live="polite">
{#if error}
  <p class="sr-msg err">{error}</p>
{:else if loading && !results.length}
  <p class="sr-msg">Recherche...</p>
{:else if !loading && q.trim().length >= 2 && !results.length}
  <p class="sr-msg">Rien trouvé sur {source === 'spotify' ? 'Spotify' : 'Deezer'}. Essaie « artiste titre », ou colle un lien YouTube.</p>
{/if}
</div>

<style>
  .sr-src { display: flex; gap: 4px; padding: 0 8px 8px; }
  .sr-src button {
    padding: 3px 10px;
    border: 1px solid var(--border2);
    border-radius: 999px;
    background: none;
    color: var(--dim);
    font: inherit;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .sr-src button.on { border-color: var(--accent); color: var(--accent); }
  .sr-artists { display: flex; gap: 6px; flex-wrap: wrap; padding: 4px 8px 10px; }
  .sr-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 4px 4px;
    border: 1px solid var(--border2);
    border-radius: 999px;
    background: transparent;
    color: var(--mid);
    font: inherit;
    font-size: 0.74rem;
    cursor: pointer;
    max-width: 100%;
  }
  .sr-chip span:first-of-type { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sr-chip img { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; }
  .sr-chip:hover { border-color: var(--accent); color: var(--accent); }
  .sr-list { display: flex; flex-direction: column; }
  .sr-msg { padding: 16px 8px; font-size: 0.8rem; color: var(--mid); }
  .sr-msg.err { color: var(--danger); }
</style>

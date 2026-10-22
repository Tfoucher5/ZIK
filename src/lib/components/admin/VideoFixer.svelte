<script>
  import { onMount, untrack } from 'svelte';

  let { track, reported = null, token } = $props();

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // Le parent recrée le composant à chaque titre : on fige les props.
  const t = untrack(() => track);
  const signaled = untrack(() => reported);
  // Ce qu'on a sous les yeux au départ : la vidéo signalée si on la connaît
  const first = signaled?.videoId
    ? { id: signaled.videoId, start: signaled.start ?? 0 }
    : t.youtube_id
      ? { id: t.youtube_id, start: t.youtube_start ?? 0 }
      : null;

  let playing = $state(first);
  let start = $state(first?.start ?? 0);
  let nonce = $state(0);
  let query = $state(`${t.artist} ${t.title}`);
  let videos = $state([]);
  let searching = $state(false);
  let saving = $state(false);
  let pinned = $state({ id: t.youtube_id, start: t.youtube_start });
  let msg = $state('');
  let err = $state('');

  const duration = $derived(videos.find((v) => v.id === playing?.id)?.duration || 600);
  const label = $derived(
    !playing ? '' :
    playing.id === signaled?.videoId ? 'Vidéo signalée' :
    playing.id === pinned.id ? 'Vidéo épinglée' : 'Proposition',
  );

  function watch(id, s = 0) {
    playing = { id, start: s };
    start = s;
    nonce++;
    msg = '';
  }

  function listenHere() {
    playing = { ...playing, start };
    nonce++;
  }

  async function search() {
    if (!query.trim()) return;
    searching = true; err = '';
    try {
      const r = await fetch(`/api/admin/track-video-search?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const d = await r.json();
      if (!r.ok) err = d.error || 'La recherche a échoué.';
      else videos = d.videos;
    } catch { err = 'Le serveur est injoignable.'; }
    finally { searching = false; }
  }

  async function save(youtubeId, youtubeStart) {
    saving = true; err = ''; msg = '';
    try {
      const r = await fetch(`/api/admin/track-audio-fix?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: t.id, youtubeId, youtubeStart }),
      });
      const d = await r.json();
      if (!r.ok) { err = d.error || "L'enregistrement a échoué."; return; }
      pinned = { id: youtubeId || null, start: youtubeStart };
      msg = youtubeId
        ? `Épinglée, départ à ${fmt(youtubeStart)}. Les prochains salons l'utiliseront.`
        : 'Vidéo détachée : le jeu reprend sa recherche automatique.';
    } catch { err = 'Le serveur est injoignable.'; }
    finally { saving = false; }
  }

  onMount(search);
</script>

<div class="vf">
  <div class="player">
    {#if playing}
      {#key nonce}
        <iframe
          src="https://www.youtube-nocookie.com/embed/{playing.id}?start={playing.start}&autoplay=1&rel=0&playsinline=1"
          title="Aperçu de la vidéo"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
        ></iframe>
      {/key}
    {:else}
      <p>Aucune vidéo connue pour ce titre. Choisis une proposition ci-dessous.</p>
    {/if}
  </div>

  {#if playing}
    <div class="now">
      <span class="a-tag {label === 'Vidéo signalée' ? 'bad' : label === 'Vidéo épinglée' ? 'good' : 'accent'}">{label}</span>
      <a href="https://www.youtube.com/watch?v={playing.id}&t={playing.start}s" target="_blank" rel="noopener noreferrer">Ouvrir sur YouTube</a>
    </div>

    <label class="a-label">
      <span>Départ de l'extrait : <b>{fmt(start)}</b></span>
      <input type="range" min="0" max={Math.max(30, duration - 20)} step="1" bind:value={start} />
    </label>
    <div class="a-btns">
      <button class="a-btn" type="button" onclick={listenHere}>▶ Écouter à partir de {fmt(start)}</button>
      <button class="a-btn primary" type="button" disabled={saving || (pinned.id === playing.id && pinned.start === start)} onclick={() => save(playing.id, start)}>
        {saving ? 'Enregistrement…' : pinned.id === playing.id ? 'Garder ce départ' : 'Épingler cette vidéo'}
      </button>
    </div>
  {/if}

  {#if msg}<p class="a-ok">{msg}</p>{/if}
  {#if err}<p class="a-err">{err}</p>{/if}

  {#if signaled?.videoId && playing?.id !== signaled.videoId}
    <button class="a-btn small" type="button" onclick={() => watch(signaled.videoId, signaled.start ?? 0)}>Revoir la vidéo signalée</button>
  {/if}

  <form class="find" onsubmit={(e) => { e.preventDefault(); search(); }}>
    <label class="a-sr" for="vf-q">Chercher une vidéo</label>
    <input id="vf-q" class="a-input" bind:value={query} placeholder="Artiste et titre" />
    <button class="a-btn" type="submit" disabled={searching}>{searching ? '…' : 'Chercher'}</button>
  </form>

  <ul class="cands">
    {#each videos as v (v.id)}
      <li>
        <button type="button" class="cand" class:on={playing?.id === v.id} onclick={() => watch(v.id, pinned.id === v.id ? pinned.start ?? 0 : 0)}>
          <img src={v.thumbnail} alt="" loading="lazy" />
          <span class="c-main">
            <span class="c-title">{v.title}</span>
            <span class="c-sub">
              {v.channel}{v.duration ? ` · ${fmt(v.duration)}` : ''}
              {#if v.topic}<em class="a-tag good">officielle</em>{/if}
              {#if pinned.id === v.id}<em class="a-tag good">épinglée</em>{/if}
              {#if signaled?.videoId === v.id}<em class="a-tag bad">signalée</em>{/if}
            </span>
          </span>
        </button>
      </li>
    {:else}
      {#if !searching}<li class="a-muted">Aucune proposition.</li>{/if}
    {/each}
  </ul>

  {#if pinned.id}
    <button class="a-btn small danger" type="button" disabled={saving} onclick={() => save('', null)}>Détacher la vidéo épinglée</button>
  {/if}
</div>

<style>
  .vf { display: grid; gap: 12px; }
  .player {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: 12px;
    background: #000;
  }
  .player iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  .player p { display: grid; place-items: center; height: 100%; padding: 16px; text-align: center; color: var(--a-dim); font-size: 0.9rem; }
  .now { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.82rem; }
  .now a { color: var(--a-cyan); }
  input[type='range'] { width: 100%; accent-color: var(--a-accent); }
  .find { display: flex; gap: 8px; }
  .cands { display: grid; gap: 6px; list-style: none; }
  .cand {
    display: flex;
    gap: 10px;
    width: 100%;
    padding: 6px;
    border: 1px solid var(--a-line);
    border-radius: 10px;
    background: var(--a-bg);
    color: var(--a-fg);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .cand.on { border-color: var(--a-accent); background: var(--a-accent-soft); }
  .cand img { flex: 0 0 96px; width: 96px; height: 54px; border-radius: 6px; object-fit: cover; }
  .c-main { display: grid; align-content: center; gap: 3px; min-width: 0; }
  .c-title { display: -webkit-box; overflow: hidden; font-size: 0.85rem; font-weight: 600; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
  .c-sub { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; font-size: 0.75rem; color: var(--a-dim); }
</style>

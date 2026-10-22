<script>
  import { onDestroy } from 'svelte';
  import { guessFromVideo } from '$lib/shared/playlist/input.js';
  import { player } from './previewPlayer.svelte.js';
  import { toast } from '$lib/client/toast.svelte.js';

  let { id, store, onDone } = $props();

  let video = $state(null);
  let error = $state('');
  let artist = $state('');
  let title = $state('');
  let adding = $state(false);

  const playing = $derived(player.current === `yt:${id}`);

  onDestroy(() => { if (playing) player.stop(); });

  $effect(() => {
    video = null;
    error = '';
    store.api(`/api/tracks/youtube?id=${id}`)
      .then((v) => {
        video = v;
        ({ artist, title } = guessFromVideo(v.title, v.channel));
      })
      .catch((e) => { error = e.message; });
  });

  async function add() {
    if (!artist.trim() || !title.trim()) return;
    adding = true;
    const ok = await store.add({ artist: artist.trim(), title: title.trim(), source: 'manual', youtube_id: id });
    adding = false;
    if (ok) { toast('Titre ajouté avec cette version', 'success'); onDone(); }
  }
</script>

<div class="yx">
  {#if error}
    <p class="yx-msg err">{error}</p>
  {:else if !video}
    <p class="yx-msg">Lecture de la vidéo...</p>
  {:else}
    <div class="yx-video">
      {#if playing}
        <iframe src="https://www.youtube-nocookie.com/embed/{id}?autoplay=1&rel=0" title={video.title}
          allow="autoplay; encrypted-media" allowfullscreen></iframe>
      {:else}
        <button class="yx-thumb" onclick={() => player.claim(`yt:${id}`)} aria-label="Écouter {video.title}">
          <img src="https://i.ytimg.com/vi/{id}/mqdefault.jpg" alt="" width="320" height="180">
          <span aria-hidden="true">▶</span>
        </button>
      {/if}
    </div>
    <p class="yx-src" title={video.title}>{video.title} · {video.channel}</p>
    <div class="yx-fields">
      <label>Artiste<input class="input-glass" bind:value={artist} maxlength="100"></label>
      <label>Titre<input class="input-glass" bind:value={title} maxlength="100"
        onkeydown={(e) => { if (e.key === 'Enter') add(); }}></label>
    </div>
    <p class="yx-hint">Ce sont les réponses attendues en partie. Version spéciale ? Précise-le dans le titre, ex. « One More Time (8-bit) ».</p>
    <button class="btn-accent" onclick={add} disabled={adding || !artist.trim() || !title.trim()}>
      {adding ? '...' : 'Ajouter avec cette version'}
    </button>
  {/if}
</div>

<style>
  .yx { display: flex; flex-direction: column; gap: 10px; padding: 4px 8px; }
  .yx-msg { font-size: 0.8rem; color: var(--mid); margin: 0; }
  .yx-msg.err { color: var(--danger); }
  .yx-video { aspect-ratio: 16 / 9; border-radius: 8px; overflow: hidden; background: #000; }
  .yx-video iframe { width: 100%; height: 100%; border: 0; display: block; }
  .yx-thumb { position: relative; width: 100%; height: 100%; padding: 0; border: none; background: none; cursor: pointer; }
  .yx-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .yx-thumb span {
    position: absolute;
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(0 0 0 / 0.6);
    color: #fff;
    font-size: 1.2rem;
  }
  .yx-src { font-size: 0.7rem; color: var(--dim); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .yx-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .yx-fields label { display: flex; flex-direction: column; gap: 4px; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); }
  .yx-fields input { min-height: 40px; }
  .yx-hint { font-size: 0.7rem; color: var(--dim); margin: 0; }
  @media (max-width: 600px) { .yx-fields { grid-template-columns: 1fr; } }
</style>

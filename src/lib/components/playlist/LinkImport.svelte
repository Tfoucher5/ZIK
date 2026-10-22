<script>
  import { getContext } from 'svelte';
  import { toast } from '$lib/client/toast.svelte.js';
  import { getSpotifyToken, clearSpotifyToken, connectSpotify } from './spotify.js';

  let { source, id, store, onDone } = $props();

  const _ctx = getContext('zik');
  const isAdmin = $derived(_ctx.user?.profile?.role === 'super_admin');

  let preview = $state(null);
  let error = $state('');
  let needsLogin = $state(false);
  let adding = $state(false);

  const fresh = $derived(preview ? preview.tracks.filter((t) => !store.find(t)).length : 0);

  $effect(() => {
    preview = null;
    error = '';
    needsLogin = false;
    if (source === 'spotify' && !isAdmin) { error = "L'import Spotify n'est pas encore ouvert. Colle un lien de playlist Deezer."; return; }
    const headers = {};
    if (source === 'spotify') {
      const token = getSpotifyToken();
      if (!token) { needsLogin = true; return; }
      headers['X-Spotify-Token'] = token;
    }
    const url = source === 'spotify' ? `/api/spotify/playlist-user/${id}` : `/api/deezer/playlist/${id}`;
    const ctrl = new AbortController();
    fetch(url, { headers, signal: ctrl.signal })
      .then(async (r) => {
        const data = await r.json();
        if (r.status === 401 && source === 'spotify') { clearSpotifyToken(); needsLogin = true; return; }
        if (!r.ok) throw new Error(data.error || data.message || `HTTP ${r.status}`);
        preview = data;
      })
      .catch((e) => { if (e.name !== 'AbortError') error = e.message; });
    return () => ctrl.abort();
  });

  async function importAll() {
    adding = true;
    const n = await store.addBatch(preview.tracks);
    adding = false;
    toast(n ? `${n} titre${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''} !` : 'Tous les titres sont déjà dans la playlist.', n ? 'success' : 'error');
    if (n) onDone();
  }
</script>

<div class="lx">
  {#if error}
    <p class="lx-msg err">{error}</p>
  {:else if needsLogin}
    <p class="lx-msg">Connecte ton compte Spotify pour lire cette playlist.</p>
    <button class="btn-accent sm" onclick={() => connectSpotify(_ctx.spotifyClientId)}>Connecter Spotify</button>
  {:else if !preview}
    <p class="lx-msg">Lecture de la playlist {source === 'spotify' ? 'Spotify' : 'Deezer'}...</p>
  {:else}
    <div class="lx-card">
      {#if preview.cover}<img src={preview.cover} alt="" width="72" height="72">{/if}
      <div class="lx-info">
        <span class="lx-kicker">Playlist {source === 'spotify' ? 'Spotify' : 'Deezer'}</span>
        <strong class="lx-name">{preview.name}</strong>
        <span class="lx-count">{preview.tracks.length} titres{fresh < preview.tracks.length ? ` · ${fresh} nouveaux` : ''}</span>
      </div>
    </div>
    <button class="btn-accent" onclick={importAll} disabled={adding || !fresh}>
      {adding ? 'Import...' : fresh ? `Importer ${fresh} titre${fresh > 1 ? 's' : ''}` : 'Déjà tout importé'}
    </button>
    <p class="lx-hint">Tu pourras écouter et corriger la version de chaque titre depuis la liste.</p>
  {/if}
</div>

<style>
  .lx { display: flex; flex-direction: column; gap: 12px; padding: 4px 8px; }
  .lx-msg { font-size: 0.8rem; color: var(--mid); margin: 0; }
  .lx-msg.err { color: var(--danger); }
  .lx-card { display: flex; gap: 12px; align-items: center; }
  .lx-card img { width: 72px; height: 72px; border-radius: 8px; object-fit: cover; }
  .lx-info { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
  .lx-kicker { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }
  .lx-name { font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lx-count { font-size: 0.74rem; color: var(--mid); }
  .lx-hint { font-size: 0.7rem; color: var(--dim); margin: 0; }
</style>

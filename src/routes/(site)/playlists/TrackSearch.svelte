<script>
  import { onMount, getContext } from 'svelte';
  import { toast } from '$lib/toast.svelte.js';

  let { onAdd, onAddBatch } = $props();

  const _ctx = getContext('zik');
  const spotifyClientId = _ctx.spotifyClientId;
  const user = $derived(_ctx.user);
  const isAdmin = $derived(user?.profile?.role === 'super_admin');

  let editorTab = $state('search');

  // Search
  let searchQuery = $state('');
  let searchSource = $state('deezer');
  let searchResults = $state([]);
  let searchLoading = $state(false);
  let _addingIdx = $state({});

  // Spotify
  let spotifyUrl = $state('');
  let spImportPreview = $state(null);
  let spLoading = $state(false);
  let spConnected = $state(false);

  // Deezer
  let deezerUrl = $state('');
  let dzImportPreview = $state(null);
  let dzLoading = $state(false);

  // Manual
  let manArtist = $state('');
  let manTitle = $state('');
  let manPreview = $state('');
  let manError = $state('');

  onMount(() => {
    spConnected = !!getSpotifyToken();
  });

  // ─── Spotify token helpers ─────────────────────────────────────────────────
  function getSpotifyToken() {
    const t = sessionStorage.getItem('sp_token');
    const exp = parseInt(sessionStorage.getItem('sp_token_exp') || '0');
    return (t && Date.now() < exp) ? t : null;
  }
  function clearSpotifyToken() {
    sessionStorage.removeItem('sp_token');
    sessionStorage.removeItem('sp_token_exp');
  }

  // ─── PKCE helpers ──────────────────────────────────────────────────────────
  function b64url(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  function genVerifier(len = 64) { return b64url(crypto.getRandomValues(new Uint8Array(len))); }
  async function genChallenge(v) { return b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))); }

  async function connectSpotify() {
    const clientId = spotifyClientId;
    if (!clientId) { toast('SPOTIFY_CLIENT_ID non configuré.', 'error'); return; }
    const verifier = genVerifier();
    const challenge = await genChallenge(verifier);
    sessionStorage.setItem('sp_verifier', verifier);
    const params = new URLSearchParams({
      response_type: 'code', client_id: clientId,
      scope: 'playlist-read-private playlist-read-collaborative user-read-private',
      redirect_uri: window.location.origin + '/playlists', code_challenge_method: 'S256',
      code_challenge: challenge, state: 'sp_import',
    });
    window.location.href = 'https://accounts.spotify.com/authorize?' + params;
  }

  function disconnectSpotify() {
    clearSpotifyToken();
    spConnected = false;
    toast('Spotify déconnecté.', 'success');
  }

  // ─── Search ────────────────────────────────────────────────────────────────
  async function doSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    searchLoading = true; searchResults = []; _addingIdx = {};
    try {
      const r = await fetch(`/api/${searchSource}/search?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      searchResults = data;
    } catch (e) { toast(e.message, 'error'); }
    searchLoading = false;
  }

  async function addFromSearch(i) {
    _addingIdx = { ..._addingIdx, [i]: true };
    const ok = await onAdd(searchResults[i]);
    _addingIdx = { ..._addingIdx, [i]: ok ? 'done' : false };
  }

  // ─── Spotify import ────────────────────────────────────────────────────────
  function extractSpotifyId(input) {
    const m = input.trim().match(/playlist\/([a-zA-Z0-9]+)/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9]{22}$/.test(input.trim())) return input.trim();
    return null;
  }

  async function importSpotify() {
    const id = extractSpotifyId(spotifyUrl);
    if (!id) { toast('URL ou ID Spotify invalide.', 'error'); return; }
    const token = getSpotifyToken();
    if (!token) { toast('Connecte ton compte Spotify d’abord.', 'error'); return; }
    spLoading = true; spImportPreview = null;
    try {
      const r = await fetch(`/api/spotify/playlist-user/${id}`, { headers: { 'X-Spotify-Token': token } });
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 401) clearSpotifyToken();
        throw new Error(data.error || `HTTP ${r.status}`);
      }
      spImportPreview = data;
    } catch (e) { toast(e.message, 'error'); }
    spLoading = false;
  }

  async function confirmSpotifyImport() {
    if (!spImportPreview) return;
    const { added } = await onAddBatch(spImportPreview.tracks);
    spImportPreview = null;
    if (added === 0) {
      toast('Tous les titres sont déjà dans la playlist.', 'error');
    } else {
      toast(`${added} titre${added !== 1 ? 's' : ''} importé${added !== 1 ? 's' : ''} !`, 'success');
    }
  }

  // ─── Deezer import ─────────────────────────────────────────────────────────
  function extractDeezerId(input) {
    const m = input.trim().match(/playlist\/(\d+)/);
    if (m) return m[1];
    if (/^\d+$/.test(input.trim())) return input.trim();
    return null;
  }

  async function importDeezer() {
    const id = extractDeezerId(deezerUrl);
    if (!id) { toast('URL ou ID Deezer invalide.', 'error'); return; }
    dzLoading = true; dzImportPreview = null;
    try {
      const r = await fetch(`/api/deezer/playlist/${id}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      dzImportPreview = data;
    } catch (e) { toast(e.message, 'error'); }
    dzLoading = false;
  }

  async function confirmDeezerImport() {
    if (!dzImportPreview) return;
    const { added } = await onAddBatch(dzImportPreview.tracks);
    dzImportPreview = null;
    if (added === 0) {
      toast('Tous les titres sont déjà dans la playlist.', 'error');
    } else {
      toast(`${added} titre${added !== 1 ? 's' : ''} importé${added !== 1 ? 's' : ''} !`, 'success');
    }
  }

  // ─── Manual add ────────────────────────────────────────────────────────────
  async function addManual() {
    const artist = manArtist.trim();
    const title = manTitle.trim();
    const preview = manPreview.trim();
    if (!artist || !title) { manError = 'Artiste et titre sont requis.'; return; }
    manError = '';
    const ok = await onAdd({ artist, title, preview_url: preview || null, source: 'manual' });
    if (ok) { manArtist = ''; manTitle = ''; manPreview = ''; toast('Titre ajouté !', 'success'); }
  }
</script>

<!-- Tabs nav -->
<div class="editor-tabs">
  {#each ['search', 'import-spotify', 'import-deezer', 'manual'] as t (t)}
    {@const labels = { search: 'Rechercher un titre', 'import-spotify': 'Importer Spotify', 'import-deezer': 'Importer Deezer', manual: 'Ajouter manuellement' }}
    <button class="etab" class:active={editorTab === t} onclick={() => editorTab = t}
      style={t === 'import-spotify' && !isAdmin ? 'display:none' : ''}>{labels[t]}</button>
  {/each}
</div>

<!-- Tab: search -->
{#if editorTab === 'search'}
<div class="tab-pane">
  <div class="search-bar">
    <div class="search-source-toggle">
      <button class="src-btn" class:active={searchSource === 'deezer'} onclick={() => searchSource = 'deezer'}>Deezer</button>
      <button class="src-btn" class:active={searchSource === 'spotify'} onclick={() => searchSource = 'spotify'}>Spotify</button>
    </div>
    <input type="text" bind:value={searchQuery} placeholder="Artiste, titre..." autocomplete="off" class="input-glass"
      onkeypress={e => { if (e.key === 'Enter') doSearch(); }}>
    <button class="btn-accent sm" onclick={doSearch} disabled={searchLoading}>{searchLoading ? '...' : 'Rechercher'}</button>
  </div>
  <div class="search-results">
    {#each searchResults as t, i (t.external_id || i)}
      <div class="track-row">
        {#if t.cover_url}<img class="track-cover" src={t.cover_url} alt="">{/if}
        <div class="track-info">
          <div class="track-title">{t.title}</div>
          <div class="track-artist">{t.artist}</div>
        </div>
        <span class="track-source">{t.source}</span>
        <button class="track-add-btn" class:added={_addingIdx[i] === 'done'}
          onclick={() => addFromSearch(i)} disabled={!!_addingIdx[i]}>
          {_addingIdx[i] === 'done' ? '✅ Ajouté' : _addingIdx[i] ? '...' : '+ Ajouter'}
        </button>
      </div>
    {/each}
  </div>
</div>

<!-- Tab: import-spotify -->
{:else if editorTab === 'import-spotify'}
<div class="tab-pane">
  {#if !spotifyClientId}
    <p class="import-hint" style="color:var(--danger)">Spotify non configuré. Ajoute <code>SPOTIFY_CLIENT_ID</code> dans ton fichier <code>.env</code>.</p>
  {:else if !spConnected}
    <p class="import-hint">Connecte ton compte Spotify pour importer tes playlists (publiques et privées).</p>
    <button class="btn-spotify" onclick={connectSpotify}>Connecter Spotify</button>
  {:else}
    <div class="spotify-connected-bar">
      <span class="spotify-connected-label">&#x2713; Spotify connecté</span>
      <button class="btn-link-sm" onclick={disconnectSpotify}>Déconnecter</button>
    </div>
    <p class="import-hint">Colle l'URL ou l'ID d'une playlist Spotify.</p>
    <div class="search-bar">
      <input type="text" bind:value={spotifyUrl} placeholder="https://open.spotify.com/playlist/... ou ID" class="input-glass"
        onkeypress={e => { if (e.key === 'Enter') importSpotify(); }}>
      <button class="btn-accent sm" onclick={importSpotify} disabled={spLoading}>{spLoading ? '...' : 'Importer'}</button>
    </div>
    {#if spImportPreview}
      <div class="import-preview">
        <div class="import-preview-header">
          {#if spImportPreview.cover}<img class="import-preview-cover" src={spImportPreview.cover} alt="">{/if}
          <div>
            <div class="import-preview-name">{spImportPreview.name}</div>
            <div class="import-preview-count">{spImportPreview.tracks.length} titres</div>
          </div>
        </div>
        <div class="import-actions">
          <button class="btn-accent sm" onclick={confirmSpotifyImport}>Tout importer ({spImportPreview.tracks.length} titres)</button>
          <button class="btn-ghost sm" onclick={() => spImportPreview = null}>Annuler</button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Tab: import-deezer -->
{:else if editorTab === 'import-deezer'}
<div class="tab-pane">
  <p class="import-hint">Colle l'URL ou l'ID d'une playlist Deezer publique.</p>
  <div class="search-bar">
    <input type="text" bind:value={deezerUrl} placeholder="https://www.deezer.com/playlist/... ou ID" class="input-glass"
      onkeypress={e => { if (e.key === 'Enter') importDeezer(); }}>
    <button class="btn-accent sm" onclick={importDeezer} disabled={dzLoading}>{dzLoading ? '...' : 'Importer'}</button>
  </div>
  {#if dzImportPreview}
    <div class="import-preview">
      <div class="import-preview-header">
        {#if dzImportPreview.cover}<img class="import-preview-cover" src={dzImportPreview.cover} alt="">{/if}
        <div>
          <div class="import-preview-name">{dzImportPreview.name}</div>
          <div class="import-preview-count">{dzImportPreview.tracks.length} titres</div>
        </div>
      </div>
      <div class="import-actions">
        <button class="btn-accent sm" onclick={confirmDeezerImport}>Tout importer ({dzImportPreview.tracks.length} titres)</button>
        <button class="btn-ghost sm" onclick={() => dzImportPreview = null}>Annuler</button>
      </div>
    </div>
  {/if}
</div>

<!-- Tab: manual -->
{:else if editorTab === 'manual'}
<div class="tab-pane">
  <div class="manual-form">
    <div class="pl-form-row">
      <div class="field" style="flex:1"><label for="artiste">Artiste</label><input type="text" bind:value={manArtist} placeholder="Ex: PNL" maxlength="100" class="input-glass"></div>
      <div class="field" style="flex:1"><label for="titre">Titre</label><input type="text" bind:value={manTitle} placeholder="Ex: Au DD" maxlength="100" class="input-glass"></div>
    </div>
    <div class="field">
      <label for="url">URL Preview (MP3, 30s) <span style="color:var(--dim);font-weight:400">&mdash; optionnel</span></label>
      <input type="url" bind:value={manPreview} placeholder="https://...mp3" class="input-glass">
    </div>
    {#if manError}<div class="alert-err">{manError}</div>{/if}
    <button class="btn-accent" onclick={addManual}>Ajouter à la playlist</button>
  </div>
</div>
{/if}

<style>
.editor-tabs {
  display: flex;
  margin: 14px 20px 0;
  border: 1px solid var(--border2);
  flex-shrink: 0;
}
.etab {
  background: transparent;
  border: none;
  border-right: 1px solid var(--border2);
  color: var(--dim);
  padding: 9px 14px;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  flex: 1;
  text-align: center;
  transition: color 0.12s, background 0.12s;
}
.etab:last-child { border-right: none; }
.etab:hover { color: var(--text); background: rgb(var(--c-glass) / 0.02); }
.etab.active { color: var(--accent); background: rgb(var(--accent-rgb) / 0.06); }

.tab-pane { padding: 14px 20px; }

.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  align-items: center;
  flex-wrap: wrap;
}
.search-bar input {
  flex: 1;
  min-width: 180px;
}
.search-source-toggle { display: flex; }
.src-btn {
  background: transparent;
  border: 1px solid var(--border2);
  border-right: none;
  color: var(--dim);
  padding: 6px 12px;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.12s, border-color 0.12s, background 0.12s;
}
.src-btn:last-child { border-right: 1px solid var(--border2); }
.src-btn.active { color: var(--accent); border-color: var(--accent); background: rgb(var(--accent-rgb) / 0.06); }

.search-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 260px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgb(var(--accent-rgb) / 0.35) transparent;
}
.search-results::-webkit-scrollbar { width: 3px; }
.search-results::-webkit-scrollbar-track { background: transparent; }
.search-results::-webkit-scrollbar-thumb { background: rgb(var(--accent-rgb) / 0.35); }

.track-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  background: transparent;
  border-bottom: 1px solid var(--border);
  transition: background 0.1s;
}
.track-row:hover { background: rgb(var(--c-glass) / 0.02); }
.track-cover {
  width: 36px;
  height: 36px;
  object-fit: cover;
  background: var(--border);
  flex-shrink: 0;
}
.track-info { flex: 1; min-width: 0; }
.track-title {
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.track-artist {
  font-size: 0.72rem;
  color: var(--mid);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.track-source {
  font-size: 0.58rem;
  color: var(--dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  flex-shrink: 0;
}
.track-add-btn {
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--mid);
  padding: 5px 10px;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.12s, color 0.12s;
}
.track-add-btn:hover { border-color: var(--accent); color: var(--accent); }
.track-add-btn:disabled { opacity: 0.4; cursor: default; }
.track-add-btn.added { border-color: var(--success); color: var(--success); }

.import-hint { font-size: 0.82rem; color: var(--mid); margin-bottom: 14px; }
.import-preview { margin-top: 14px; }
.import-preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px 14px;
  background: rgb(var(--c-glass) / 0.02);
  border: 1px solid var(--border);
}
.import-preview-cover { width: 44px; height: 44px; object-fit: cover; background: var(--border); flex-shrink: 0; }
.import-preview-name { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 1rem; text-transform: uppercase; }
.import-preview-count { font-size: 0.72rem; color: var(--mid); margin-top: 2px; }
.import-actions { display: flex; gap: 8px; margin-top: 10px; }

.manual-form { max-width: 520px; }
.pl-form-row { display: flex; gap: 12px; }

.btn-spotify {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #1db954;
  color: #000;
  font-weight: 700;
  font-size: 0.82rem;
  padding: 9px 18px;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-spotify:hover { opacity: 0.85; }

.spotify-connected-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(29, 185, 84, 0.08);
  border: 1px solid rgba(29, 185, 84, 0.25);
  padding: 8px 14px;
  margin-bottom: 10px;
  font-size: 0.8rem;
}
.spotify-connected-label { color: #1db954; font-weight: 600; flex: 1; }

.btn-link-sm {
  background: none;
  border: none;
  color: var(--dim);
  font-size: 0.75rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}
.btn-link-sm:hover { color: var(--text); }

@media (max-width: 600px) {
  .pl-form-row { flex-direction: column; }
  .etab { font-size: 0.64rem; padding: 8px 10px; }
}
</style>

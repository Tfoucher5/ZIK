<script>
  import { onMount, getContext } from 'svelte';
  import HeroSection from '$lib/components/HeroSection.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import TrackRow from './TrackRow.svelte';
  import TrackSearch from './TrackSearch.svelte';
  import { toast } from '$lib/toast.svelte.js';

  const _ctx = getContext('zik');
  const sb = _ctx.sb;
  const openAuthModal = _ctx.openAuthModal;
  const spotifyClientId = _ctx.spotifyClientId;
  const user = $derived(_ctx.user);
  const authReady = $derived(_ctx.authReady);

  const playlistsJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Playlists de Blind Test — ZIK",
    "description": "Créez et gérez vos playlists de blind test. Import Spotify et Deezer, ajout manuel de titres, partage avec d'autres joueurs.",
    "url": "https://www.zik-music.fr/playlists",
    "inLanguage": "fr-FR",
    "isPartOf": { "@type": "WebSite", "url": "https://www.zik-music.fr/", "name": "ZIK" }
  });

  // Playlists list
  let playlists = $state([]);
  let plLoading = $state(true);

  // Playlist modal (create/edit)
  let plModalOpen = $state(false);
  let editingPl   = $state(null);
  let plName      = $state('');
  let plEmoji     = $state('🎵');
  let plPublic    = $state(false);
  let plError     = $state('');
  let plSaving    = $state(false);

  // Editor modal
  let editorOpen   = $state(false);
  let editorPl     = $state(null);
  let editorTracks = $state([]);
  const isAdmin    = $derived(user?.profile?.role === 'super_admin');

  // Admin section
  let adminOfficials  = $state([]);
  let adminIsOfficial = $state(false);
  let adminLinkedRoom = $state('');

  // Éditeur de réponses par track
  let answersModalOpen = $state(false);
  let answersTrack     = $state(null);
  let customArtist     = $state('');
  let customTitle      = $state('');
  let customFeats      = $state([]);
  let extraAnswers     = $state([]);
  let answersSaving    = $state(false);

  const EXTRA_ANSWER_TYPES = [
    { id: 3, name: 'Film' },
    { id: 4, name: 'Série' },
    { id: 5, name: 'Personnage' },
    { id: 6, name: 'Jeu vidéo' },
    { id: 7, name: 'Animé' },
  ];

  // Room settings (ephemeral room from playlist)
  let rsOpen     = $state(false);
  let rsRounds   = $state(10);
  let rsDuration = $state(30);
  let rsBreak    = $state(7);
  let rsError    = $state('');
  let rsSaving   = $state(false);

  // Room code modal (after creation)
  let rcOpen = $state(false);
  let rcCode = $state('');

  // ─── Spotify callback (runs on page load, before editor opens) ─────────────
  async function handleSpotifyCallback() {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');
    const state  = params.get('state');
    if (params.get('error') || !code || state !== 'sp_import') {
      if (params.get('error')) history.replaceState({}, '', '/playlists');
      return;
    }
    history.replaceState({}, '', '/playlists');
    const verifier = sessionStorage.getItem('sp_verifier');
    const clientId = spotifyClientId;
    if (!verifier || !clientId) return;
    try {
      const r = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: window.location.origin + '/playlists', client_id: clientId, code_verifier: verifier }),
      });
      const json = await r.json();
      if (!json.access_token) throw new Error(json.error_description || 'Token exchange failed');
      sessionStorage.setItem('sp_token',     json.access_token);
      sessionStorage.setItem('sp_token_exp', Date.now() + json.expires_in * 1000);
      sessionStorage.removeItem('sp_verifier');
      toast('Spotify connecté !', 'success');
    } catch (e) { toast('Erreur Spotify : ' + e.message, 'error'); }
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  onMount(async () => {
    await handleSpotifyCallback();
    if (!sb || !user) { plLoading = false; return; }
    await loadPlaylists();
  });

  // Reload playlists when user logs in after page load (async auth resolution)
  let _lastLoadedUid = null;
  $effect(() => {
    const uid = user?.id;
    if (uid && uid !== _lastLoadedUid && sb) {
      _lastLoadedUid = uid;
      loadPlaylists();
    }
  });

  async function ensureSession() {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error || !session) throw new Error('Session expirée — reconnecte-toi.');
    const exp = session.expires_at * 1000;
    if (exp - Date.now() < 60_000) {
      const { data, error: rErr } = await sb.auth.refreshSession();
      if (rErr || !data.session) throw new Error('Session expirée — reconnecte-toi.');
    }
    return session;
  }

  async function loadPlaylists() {
    plLoading = true;
    const { data, error } = await sb.from('custom_playlists').select('*, custom_playlist_tracks!playlist_id(count)').eq('owner_id', user.id).order('updated_at', { ascending: false });
    if (data) data.forEach(pl => { pl.track_count = pl.custom_playlist_tracks?.[0]?.count ?? 0; });
    plLoading = false;
    playlists = error ? [] : (data || []);
  }

  // ─── Playlist create/edit modal ────────────────────────────────────────────
  function openPlModal(pl = null) {
    editingPl = pl;
    plName   = pl?.name   ?? '';
    plEmoji  = pl?.emoji  ?? '🎵';
    plPublic = pl?.is_public ?? false;
    plError  = '';
    plModalOpen = true;
    setTimeout(() => document.getElementById('pl-name-input')?.focus(), 80);
  }

  async function savePl() {
    const name  = plName.trim();
    const emoji = plEmoji.trim() || '🎵';
    if (!name) { plError = 'Le nom est requis.'; return; }
    plSaving = true; plError = '';
    try { await ensureSession(); } catch (e) { plError = e.message; plSaving = false; return; }

    if (editingPl) {
      const { error } = await sb.from('custom_playlists')
        .update({ name, emoji, is_public: plPublic, updated_at: new Date().toISOString() })
        .eq('id', editingPl.id);
      if (error) { plError = error.message; plSaving = false; return; }
      toast('Playlist mise à jour', 'success');
      if (editorOpen && editorPl?.id === editingPl.id) {
        editorPl = { ...editorPl, name, emoji, is_public: plPublic };
      }
    } else {
      const { data, error } = await sb.from('custom_playlists')
        .insert({ owner_id: user.id, name, emoji, is_public: plPublic })
        .select().single();
      if (error) { plError = error.message; plSaving = false; return; }
      toast('Playlist créée !', 'success');
      plModalOpen = false;
      await loadPlaylists();
      openEditor(data);
      plSaving = false;
      return;
    }
    plSaving = false;
    plModalOpen = false;
    await loadPlaylists();
  }

  // ─── Editor ────────────────────────────────────────────────────────────────
  async function openEditor(pl) {
    editorPl     = pl;
    editorTracks = [];
    editorOpen   = true;
    await loadEditorTracks();
    if (isAdmin) await loadAdminRooms();
    adminIsOfficial = !!pl.is_official;
    adminLinkedRoom = pl.linked_room_id || '';
  }

  async function loadEditorTracks() {
    const { data, error } = await sb.from('custom_playlist_tracks')
      .select('*, track_answers(answer_type_id, value, answer_types(name))')
      .eq('playlist_id', editorPl.id).order('position');
    if (error) { toast(error.message, 'error'); return; }
    editorTracks = data || [];
  }

  async function removeTrack(trackId) {
    const { error } = await sb.from('custom_playlist_tracks').delete().eq('id', trackId);
    if (error) { toast(error.message, 'error'); return; }
    editorTracks = editorTracks.filter(t => t.id !== trackId);
  }

  function normalize(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  async function addTrack(trackData) {
    const extId = trackData.external_id;
    const norm  = normalize(trackData.artist) + '|' + normalize(trackData.title);
    const isDup = editorTracks.some(t => (extId && t.external_id === extId) || (normalize(t.artist) + '|' + normalize(t.title)) === norm);
    if (isDup) { toast('Ce titre est déjà dans la playlist.', 'error'); return false; }
    try { await ensureSession(); } catch (e) { toast(e.message, 'error'); return false; }
    const { data, error } = await sb.from('custom_playlist_tracks').insert({
      playlist_id: editorPl.id, artist: trackData.artist, title: trackData.title,
      preview_url: trackData.preview_url || null, cover_url: trackData.cover_url || null,
      source: trackData.source || 'manual', external_id: trackData.external_id || null,
      position: editorTracks.length,
    }).select().single();
    if (error) { toast(error.message, 'error'); return false; }
    editorTracks = [...editorTracks, data];
    return true;
  }

  async function addBatch(tracks) {
    const existingIds = new Set(editorTracks.map(t => t.external_id).filter(Boolean));
    const newTracks   = tracks.filter(t => !existingIds.has(t.external_id));
    if (!newTracks.length) return { added: 0 };
    try { await ensureSession(); } catch (e) { toast(e.message, 'error'); return { added: 0 }; }
    const rows = newTracks.map((t, i) => ({
      playlist_id: editorPl.id, artist: t.artist, title: t.title,
      preview_url: t.preview_url || null, cover_url: t.cover_url || null,
      source: t.source, external_id: t.external_id || null,
      position: editorTracks.length + i,
    }));
    const { data, error } = await sb.from('custom_playlist_tracks').insert(rows).select();
    if (error) { toast(error.message, 'error'); return { added: 0 }; }
    editorTracks = [...editorTracks, ...data];
    return { added: data.length };
  }

  async function deletePl() {
    if (!editorPl) return;
    if (!confirm(`Supprimer "${editorPl.name}" ? Cette action est irréversible.`)) return;
    const deletedId = editorPl.id;
    editorOpen = false; editorPl = null;
    try {
      const { data: { session } } = await sb.auth.getSession();
      const r = await fetch(`/api/playlists/${deletedId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session?.access_token}` } });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
      toast('Playlist supprimée.', 'success');
      await loadPlaylists();
    } catch (e) { toast('Erreur suppression : ' + e.message, 'error'); }
  }

  // ─── Answers editor ────────────────────────────────────────────────────────
  async function openAnswersEditor(track) {
    answersTrack = track;
    customArtist = '';
    customTitle  = '';
    customFeats  = [];
    extraAnswers = [];
    answersModalOpen = true;
    const token = (await sb.auth.getSession()).data.session?.access_token;
    const res = await fetch(`/api/playlists/tracks/${track.id}/answers`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    customArtist = data.custom_artist ?? data.default_artist ?? '';
    customTitle  = data.custom_title  ?? data.default_title  ?? '';
    customFeats  = data.custom_feats  ?? data.default_feats  ?? [];
    extraAnswers = (data.extra_answers || []).map(a => ({ typeId: a.answer_type_id, value: a.value }));
  }

  function addCustomFeat() {
    customFeats = [...customFeats, ''];
  }

  function removeCustomFeat(i) {
    customFeats = customFeats.filter((_, idx) => idx !== i);
  }

  async function saveAnswers() {
    answersSaving = true;
    const token = (await sb.auth.getSession()).data.session?.access_token;
    const res = await fetch(`/api/playlists/tracks/${answersTrack.id}/answers`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        custom_artist: customArtist,
        custom_title:  customTitle,
        custom_feats:  customFeats.filter(f => f.trim()),
        extra_answers: extraAnswers.filter(a => a.typeId && a.value?.trim()).map(a => ({ type_id: a.typeId, value: a.value.trim() })),
      }),
    });
    answersSaving = false;
    if (res.ok) {
      toast('Réponses enregistrées', 'success');
      answersModalOpen = false;
    } else {
      const j = await res.json();
      toast(j.error || 'Erreur', 'error');
    }
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────
  async function loadAdminRooms() {
    try {
      const r = await fetch('/api/rooms/official');
      adminOfficials = r.ok ? await r.json() : [];
    } catch { adminOfficials = []; }
  }

  async function saveOfficial() {
    if (!isAdmin || !editorPl) return;
    const { data: { session } } = await sb.auth.getSession();
    try {
      const r = await fetch(`/api/playlists/${editorPl.id}/official`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ is_official: adminIsOfficial, linked_room_id: adminLinkedRoom || null }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
      toast('Statut officiel mis à jour.', 'success');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  }

  // ─── Room settings (ephemeral) ─────────────────────────────────────────────
  function openRoomSettings() {
    if (!editorPl) return;
    if (editorTracks.length < 3) { toast('Il faut au moins 3 titres dans la playlist.', 'error'); return; }
    rsRounds   = Math.min(10, editorTracks.length);
    rsDuration = 30; rsBreak = 7; rsError = '';
    rsOpen = true;
  }

  async function createRoom() {
    rsSaving = true; rsError = '';
    try {
      const r = await fetch('/api/rooms/custom', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editorPl.name, emoji: editorPl.emoji, tracks: editorTracks,
          maxRounds: rsRounds, roundDuration: rsDuration, breakDuration: rsBreak,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      rcCode = data.code; rsOpen = false; rcOpen = true;
    } catch (e) { rsError = e.message; }
    rsSaving = false;
  }

  function joinRoomNow() {
    const username = user?.profile?.username || user?.email?.split('@')[0] || 'Joueur';
    const uid      = user?.id || '';
    const p        = new URLSearchParams({ roomId: rcCode, username, userId: uid, isGuest: uid ? '0' : '1' });
    window.location.href = `/game?${p}`;
  }

  function copyLink() {
    const url = `${location.origin}/game?roomId=${rcCode}`;
    navigator.clipboard.writeText(url).then(() => toast('Lien copié !', 'success')).catch(() => toast('Copie échouée', 'error'));
  }
</script>

<svelte:head>
  <title>Playlists de Blind Test — Créer &amp; Importer depuis Spotify/Deezer | ZIK</title>
  <meta name="description" content="Créez vos playlists de blind test musical. Importez depuis Spotify ou Deezer, ajoutez des titres manuellement. Lancez une room depuis votre playlist en un clic. Gratuit." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/playlists" />

  <meta property="og:title" content="Playlists de Blind Test — Import Spotify/Deezer | ZIK" />
  <meta property="og:description" content="Créez vos playlists de blind test, importez depuis Spotify ou Deezer. Lancez une room directement. Gratuit, sans limite." />
  <meta property="og:url" content="https://www.zik-music.fr/playlists" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Playlists de Blind Test | ZIK" />
  <meta name="twitter:description" content="Importez vos playlists Spotify/Deezer et jouez au blind test avec vos musiques. Gratuit." />
  <meta name="twitter:image" content="https://www.zik-music.fr/og.png" />

  <script type="application/ld+json">{@html playlistsJsonLd}</script>
</svelte:head>

<HeroSection
  title="Tes"
  titleAccent="playlists."
  subtitle="Crée, importe, joue. Spotify, Deezer, ou manuellement."
/>

{#if user}
<div class="pl-toolbar">
  <button class="btn-accent sm" onclick={() => openPlModal()}>+ Nouvelle playlist</button>
</div>
{/if}

<div class="pl-main">
  {#if !authReady && !user}
    <div class="pl-loading">Chargement...</div>
  {:else if !user}
    <div class="auth-wall">
      <div class="auth-wall-icon">&#x1F3B5;</div>
      <h2>Connecte-toi pour accéder à tes playlists</h2>
      <p>Crée un compte gratuit pour sauvegarder et partager tes playlists.</p>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:20px">
        <button class="btn-ghost" onclick={() => openAuthModal('login')}>Se connecter</button>
        <button class="btn-accent" onclick={() => openAuthModal('register')}>Créer un compte</button>
      </div>
    </div>
  {:else if plLoading}
    <div class="pl-loading">Chargement...</div>
  {:else}
    <div id="playlists-grid" class="playlists-grid">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="pl-card pl-card-new" onclick={() => openPlModal()}>
        <span class="pl-card-new-icon">+</span>
        <span>Nouvelle playlist</span>
      </div>
      {#each playlists as pl (pl.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="pl-card" onclick={() => openEditor(pl)}>
          <span class="pl-card-emoji">{pl.emoji}</span>
          <div class="pl-card-name">{pl.name}</div>
          <div class="pl-card-meta">{pl.track_count ?? 0} titre{(pl.track_count ?? 0) !== 1 ? 's' : ''}</div>
          <div class="pl-card-footer">
            <span class="pl-card-badge {pl.is_public ? '' : 'private'}">{pl.is_public ? 'Publique' : 'Privée'}</span>
            <button class="pl-card-edit" onclick={e => { e.stopPropagation(); openEditor(pl); }}>Modifier &rarr;</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Playlist create/edit modal -->
{#if plModalOpen}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div id="modal-playlist" class="overlay" role="dialog" aria-modal="true" onclick={e => { if (e.target === e.currentTarget) plModalOpen = false; }}>
  <div class="modal modal-lg">
    <button class="close-btn" onclick={() => plModalOpen = false}>&#x2715;</button>
    <h2>{editingPl ? 'Modifier la playlist' : 'Nouvelle playlist'}</h2>
    <p class="mdesc">Donne un nom et un emoji à ta playlist.</p>
    <div class="pl-form-row">
      <div class="field" style="flex:0 0 80px"><label for="emoji">Emoji</label><input type="text" bind:value={plEmoji} maxlength="4" class="input-glass emoji-input"></div>
      <div class="field" style="flex:1"><label for="nom">Nom</label><input id="pl-name-input" type="text" bind:value={plName} placeholder="Ma playlist rap" maxlength="60" class="input-glass"
        onkeypress={e => { if (e.key === 'Enter') savePl(); }}></div>
    </div>
    <div class="field">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" bind:checked={plPublic} style="width:auto;accent-color:var(--accent)">
        Rendre cette playlist publique
      </label>
    </div>
    {#if plError}<div class="alert-err">{plError}</div>{/if}
    <div class="modal-footer">
      <button class="btn-ghost" onclick={() => plModalOpen = false}>Annuler</button>
      <button class="btn-accent" onclick={savePl} disabled={plSaving}>{plSaving ? '...' : editingPl ? 'Enregistrer' : 'Créer'}</button>
    </div>
  </div>
</div>
{/if}

<!-- Editor modal -->
{#if editorOpen && editorPl}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" role="dialog" aria-modal="true" onclick={e => { if (e.target === e.currentTarget) editorOpen = false; }}>
  <div class="modal modal-xl">
    <button class="close-btn" onclick={() => editorOpen = false}>&#x2715;</button>

    <div class="editor-header">
      <span class="editor-pl-emoji">{editorPl.emoji}</span>
      <div>
        <h2>{editorPl.name}</h2>
        <span class="pill">{editorTracks.length} titre{editorTracks.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="editor-header-actions">
        <button class="btn-ghost sm" onclick={() => openPlModal(editorPl)}>Modifier</button>
        <button class="btn-accent sm" onclick={openRoomSettings}>Lancer une room &rarr;</button>
        <button class="btn-danger sm" onclick={deletePl}>Supprimer</button>
      </div>
    </div>

    <!-- Admin section -->
    {#if isAdmin}
    <div class="admin-section">
      <div class="admin-section-title">Admin &mdash; Playlist officielle</div>
      <div class="admin-row">
        <label class="admin-label">
          <input type="checkbox" bind:checked={adminIsOfficial} style="width:auto;accent-color:var(--accent)">
          Marquer comme playlist officielle
        </label>
      </div>
      <div class="admin-row">
        <label class="admin-label" style="flex:1" for="linkedRoom">Room liée</label>
        <select bind:value={adminLinkedRoom} class="admin-select">
          <option value="">&mdash; Aucune &mdash;</option>
          {#each adminOfficials as r (r.id)}
            <option value={r.id}>{r.emoji || ''} {r.name}</option>
          {/each}
        </select>
      </div>
      <button class="btn-accent sm" onclick={saveOfficial}>Enregistrer</button>
    </div>
    {/if}

    <!-- Search / import tabs -->
    <TrackSearch onAdd={addTrack} onAddBatch={addBatch} />

    <!-- Tracks list -->
    <div class="tracks-section">
      <div class="tracks-section-head">
        <h3>Titres dans la playlist</h3>
      </div>
      {#if !editorTracks.length}
        <EmptyState icon="🎵" title="Aucun titre" description="Ajoute des titres via les onglets ci-dessus." />
      {:else}
        <div class="tracks-list">
          {#each editorTracks as t, i (t.id)}
            <TrackRow
              track={t}
              index={i + 1}
              onRemove={() => removeTrack(t.id)}
              onEditAnswers={() => openAnswersEditor(t)}
            />
          {/each}
        </div>
      {/if}
    </div>

  </div>
</div>
{/if}

<!-- Room settings modal -->
{#if rsOpen}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" role="dialog" aria-modal="true" onclick={e => { if (e.target === e.currentTarget) rsOpen = false; }}>
  <div class="modal modal-lg">
    <button class="close-btn" onclick={() => rsOpen = false}>&#x2715;</button>
    <div class="room-eph-header">
      <span class="room-eph-badge">&#x26A1; Room éphémère</span>
      <h2>Lancer une room</h2>
      <p class="mdesc">Playlist : {editorPl?.emoji} {editorPl?.name} &mdash; {editorTracks.length} titre{editorTracks.length !== 1 ? 's' : ''}</p>
    </div>
    <div class="room-eph-notice">
      <span class="room-eph-icon">&#x1F4A1;</span>
      <div>Cette room est <strong>temporaire</strong> &mdash; elle disparaîtra automatiquement après 4h d&apos;inactivité.
        Pour créer une room permanente, <a href="/rooms" class="room-eph-link">rendez-vous sur la page Rooms</a>.</div>
    </div>
    <div class="room-settings">
      <div class="room-setting-row">
        <label for="nbManches">Nombre de manches</label>
        <input type="range" bind:value={rsRounds} min="3" max={editorTracks.length} step="1">
        <span class="room-setting-val">{rsRounds}</span>
      </div>
      <div class="room-setting-row">
        <label for="dureeManche">Durée d'une manche (sec)</label>
        <input type="range" bind:value={rsDuration} min="10" max="60" step="5">
        <span class="room-setting-val">{rsDuration}s</span>
      </div>
      <div class="room-setting-row">
        <label for="pause">Pause entre titres (sec)</label>
        <input type="range" bind:value={rsBreak} min="3" max="15" step="1">
        <span class="room-setting-val">{rsBreak}s</span>
      </div>
    </div>
    {#if rsError}<div class="alert-err">{rsError}</div>{/if}
    <div class="modal-footer">
      <button class="btn-ghost" onclick={() => rsOpen = false}>Annuler</button>
      <button class="btn-accent" onclick={createRoom} disabled={rsSaving}>{rsSaving ? 'Création...' : 'Créer la room'}</button>
    </div>
  </div>
</div>
{/if}

<!-- Room code modal -->
{#if rcOpen}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" role="dialog" aria-modal="true" onclick={e => { if (e.target === e.currentTarget) rcOpen = false; }}>
  <div class="modal modal-lg">
    <button class="close-btn" onclick={() => rcOpen = false}>&#x2715;</button>
    <h2>Room créée !</h2>
    <p class="mdesc">Partage ce code à tes amis pour qu'ils rejoignent la room.</p>
    <div class="room-code-box">
      <div class="room-code-label">Code de la room</div>
      <div class="room-code">{rcCode}</div>
      <div class="room-share-url">{typeof window !== 'undefined' ? `${window.location.origin}/game?roomId=${rcCode}` : ''}</div>
      <div class="room-code-actions">
        <button class="btn-ghost sm" onclick={copyLink}>Copier le lien</button>
        <button class="btn-accent" onclick={joinRoomNow}>Rejoindre maintenant &rarr;</button>
      </div>
    </div>
  </div>
</div>
{/if}

<!-- Modal éditeur de réponses custom -->
{#if answersModalOpen && answersTrack}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" role="dialog" aria-modal="true" onclick={e => { if (e.target === e.currentTarget) answersModalOpen = false; }}>
  <div class="modal modal-lg">
    <button class="close-btn" onclick={() => answersModalOpen = false}>&#x2715;</button>
    <h2>Modifier les réponses</h2>
    <p class="mdesc">
      <strong>{answersTrack.artist} — {answersTrack.title}</strong><br>
      Corrige l'artiste, les feats ou le titre attendus pour cette track.
    </p>

    <div class="answer-field">
      <label class="answer-label">Artiste principal</label>
      <input type="text" bind:value={customArtist} class="answer-value-input" placeholder="Artiste principal…" maxlength="100">
    </div>

    <div class="answer-field">
      <label class="answer-label">Featuring</label>
      {#each customFeats as feat, i (i)}
        <div class="answer-row">
          <input type="text" value={feat} oninput={(e) => { customFeats[i] = e.currentTarget.value; }} class="answer-value-input" placeholder="Nom du feat…" maxlength="100">
          <button class="track-remove-btn" onclick={() => removeCustomFeat(i)}>&#x2715;</button>
        </div>
      {/each}
      <button class="btn-ghost sm" onclick={addCustomFeat}>+ Ajouter un feat</button>
    </div>

    <div class="answer-field">
      <label class="answer-label">Titre</label>
      <input type="text" bind:value={customTitle} class="answer-value-input" placeholder="Titre…" maxlength="100">
    </div>

    <div class="answer-field">
      <label class="answer-label">Réponses supplémentaires (Film, Série…)</label>
      {#each extraAnswers as ans, i (i)}
        <div class="answer-row">
          <select value={ans.typeId} onchange={(e) => { extraAnswers[i] = { ...extraAnswers[i], typeId: Number(e.currentTarget.value) }; }} class="answer-type-select">
            {#each EXTRA_ANSWER_TYPES as t (t.id)}
              <option value={t.id}>{t.name}</option>
            {/each}
          </select>
          <input type="text" value={ans.value} oninput={(e) => { extraAnswers[i] = { ...extraAnswers[i], value: e.currentTarget.value }; }} class="answer-value-input" placeholder="Ex : Le Roi Lion" maxlength="150">
          <button class="track-remove-btn" onclick={() => { extraAnswers = extraAnswers.filter((_, idx) => idx !== i); }}>&#x2715;</button>
        </div>
      {/each}
      <button class="btn-ghost sm" onclick={() => { extraAnswers = [...extraAnswers, { typeId: 3, value: '' }]; }}>+ Ajouter Film / Série…</button>
    </div>

    <div class="modal-actions">
      <button class="btn-ghost" onclick={() => answersModalOpen = false}>Annuler</button>
      <button class="btn-accent" onclick={saveAnswers} disabled={answersSaving}>
        {answersSaving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  </div>
</div>
{/if}

<style>
/* ── Toolbar ────────────────────────────────────────────────────────────────── */
.pl-toolbar {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px clamp(16px, 5vw, 80px) 0;
  display: flex;
  justify-content: flex-end;
}

/* ── Main ────────────────────────────────────────────────────────────────────── */
.pl-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px clamp(16px, 5vw, 80px) 80px;
}
.pl-loading {
  color: var(--dim);
  font-size: 0.9rem;
  padding: 40px 0;
}

/* ── Auth wall ───────────────────────────────────────────────────────────────── */
.auth-wall {
  text-align: center;
  padding: 80px 20px;
  background: rgb(var(--c-glass) / 0.03);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  border-radius: 20px;
}
.auth-wall-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}
.auth-wall h2 {
  font-family: "Bricolage Grotesque", sans-serif;
  font-size: 1.4rem;
  margin-bottom: 10px;
}
.auth-wall p {
  color: var(--mid);
  font-size: 0.9rem;
}

/* ── Playlists grid ──────────────────────────────────────────────────────────── */
.playlists-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  width: 100%;
}
@media (min-width: 480px) {
  .playlists-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 800px) {
  .playlists-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (min-width: 1100px) {
  .playlists-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.pl-card {
  background: rgb(var(--c-glass) / 0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 22px;
  cursor: pointer;
  transition:
    transform 0.2s,
    border-color 0.2s,
    box-shadow 0.2s,
    background 0.2s;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 150px;
}
.pl-card::before {
  content: "";
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgb(var(--c-glass) / 0.15), transparent);
}
.pl-card:hover {
  transform: translateY(-3px);
  border-color: rgb(var(--accent-rgb) / 0.2);
  background: rgb(var(--c-glass) / 0.07);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
}

.pl-card-emoji {
  font-size: 2rem;
  margin-bottom: 12px;
  display: block;
}
.pl-card-name {
  font-family: "Bricolage Grotesque", sans-serif;
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 6px;
}
.pl-card-meta {
  font-size: 0.75rem;
  color: var(--dim);
  margin-bottom: 8px;
}
.pl-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 12px;
}
.pl-card-badge {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgb(var(--accent-rgb) / 0.1);
  border: 1px solid rgb(var(--accent-rgb) / 0.15);
  color: var(--accent);
}
.pl-card-badge.private {
  background: rgb(var(--c-glass) / 0.05);
  border-color: var(--border);
  color: var(--dim);
}
.pl-card-edit {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--mid);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}
.pl-card-edit:hover {
  color: var(--text);
  border-color: rgb(var(--c-glass) / 0.2);
}

.pl-card-new {
  border-style: dashed;
  border-color: rgb(var(--c-glass) / 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 160px;
  color: var(--dim);
  font-size: 0.9rem;
  font-weight: 500;
  transition:
    color 0.2s,
    border-color 0.2s;
}
.pl-card-new:hover {
  color: var(--accent);
  border-color: rgb(var(--accent-rgb) / 0.3);
}
.pl-card-new-icon {
  font-size: 2rem;
}

/* ── Modals size overrides ───────────────────────────────────────────────────── */
.modal-lg {
  max-width: 620px;
}
.modal-xl {
  max-width: 960px;
  max-height: 92vh;
  overflow-y: auto;
}

#modal-playlist {
  z-index: 700;
}

/* ── Playlist form ───────────────────────────────────────────────────────────── */
.pl-form-row {
  display: flex;
  gap: 12px;
}
.emoji-input {
  text-align: center;
  font-size: 1.5rem;
  padding: 8px !important;
}
.modal-footer {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end;
}

/* ── Editor header ───────────────────────────────────────────────────────────── */
.editor-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
}
.editor-pl-emoji {
  font-size: 2.2rem;
  flex-shrink: 0;
}
.editor-header h2 {
  font-family: "Bricolage Grotesque", sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 4px;
}
.editor-header-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}
.btn-danger {
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--danger);
  padding: 8px 14px;
  border-radius: 50px;
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* ── Tracks list (in editor) ─────────────────────────────────────────────────── */
.tracks-section {
  margin-top: 28px;
  border-top: 1px solid var(--border);
  padding-top: 20px;
}
.tracks-section-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.tracks-section-head h3 {
  font-family: "Bricolage Grotesque", sans-serif;
  font-size: 1rem;
  font-weight: 700;
}

.tracks-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 320px;
  overflow-y: auto;
}

.track-remove-btn {
  background: transparent;
  border: none;
  color: var(--dim);
  width: 26px;
  height: 26px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.15s,
    background 0.15s;
  flex-shrink: 0;
}
.track-remove-btn:hover {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
}

/* ── Modal actions ── */
.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

/* ── Answer fields ───────────────────────────────────────────────────────────── */
.answer-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 10px 0;
}
.answer-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--mid);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.answer-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.answer-type-select {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.answer-value-input {
  flex: 1;
  background: rgb(var(--c-glass) / 0.04);
  border: 1px solid var(--border2);
  color: var(--text);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
}
.answer-value-input:focus {
  border-color: rgb(var(--accent-rgb) / 0.4);
  box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.08);
}

/* ── Room launch modal ───────────────────────────────────────────────────────── */
.room-eph-header {
  text-align: center;
  margin-bottom: 4px;
}
.room-eph-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.35);
  color: var(--gold);
  padding: 3px 10px;
  border-radius: 20px;
  margin-bottom: 8px;
}
.room-eph-notice {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: rgb(var(--accent-rgb) / 0.05);
  border: 1px solid rgb(var(--accent-rgb) / 0.15);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 0.78rem;
  color: var(--mid);
  line-height: 1.5;
  margin-bottom: 16px;
}
.room-eph-icon {
  flex-shrink: 0;
  font-size: 1rem;
  margin-top: 1px;
}
.room-eph-link {
  color: var(--accent);
  text-decoration: underline;
}

.room-settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0 0 16px;
}
.room-setting-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.room-setting-row label {
  font-size: 0.82rem;
  color: var(--mid);
  flex: 1;
  min-width: 0;
}
.room-setting-row input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 4px;
  cursor: pointer;
  border-radius: 99px;
  background: rgb(var(--c-glass) / 0.12);
  outline: none;
  border: none;
}
.room-setting-row input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 0 6px rgb(var(--accent-rgb) / 0.5);
}
.room-setting-row input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  cursor: pointer;
}
.room-setting-val {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent);
  min-width: 36px;
  text-align: right;
}
.room-code-box {
  text-align: center;
  padding: 24px 0 8px;
}
.room-code-label {
  font-size: 0.75rem;
  color: var(--dim);
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.room-code {
  font-family: "Bricolage Grotesque", monospace;
  font-size: 2.6rem;
  font-weight: 800;
  letter-spacing: 6px;
  color: var(--accent);
  background: rgb(var(--accent-rgb) / 0.07);
  border: 1px solid rgb(var(--accent-rgb) / 0.2);
  border-radius: 14px;
  padding: 14px 24px;
  display: inline-block;
  margin-bottom: 14px;
}
.room-share-url {
  font-size: 0.78rem;
  color: var(--dim);
  word-break: break-all;
  background: rgb(var(--c-glass) / 0.04);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 14px;
}
.room-code-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ── Admin section ───────────────────────────────────────────────────────────── */
.admin-section {
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
}
.admin-section-title {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 10px;
}
.admin-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.admin-label {
  font-size: 0.83rem;
  color: var(--mid);
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.admin-select {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--fg);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.83rem;
  flex: 1;
}

/* ── Responsive ──────────────────────────────────────────────────────────────── */
@media (max-width: 600px) {
  .pl-form-row {
    flex-direction: column;
  }
  .editor-header {
    flex-wrap: wrap;
  }
  .editor-header-actions {
    width: 100%;
  }
  .modal-xl {
    padding: 24px 18px;
  }
}
</style>

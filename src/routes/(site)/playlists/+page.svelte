<script>
  import { onMount, getContext } from 'svelte';
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

  // Editor (inline dans panneau droit)
  let editorOpen   = $state(false);
  let editorPl     = $state(null);
  let editorTracks = $state([]);

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
  }

  // Métadonnées canoniques du catalogue `tracks` aplaties sur la ligne de liaison
  // (fallback anciennes colonnes pour les lignes d'avant migration).
  function flattenTrackRow(row) {
    const { tracks: meta, ...rest } = row;
    if (!meta) return rest;
    return {
      ...rest,
      track_id: meta.id,
      artist: meta.artist,
      title: meta.title,
      preview_url: meta.preview_url,
      cover_url: meta.cover_url,
      external_id: meta.external_id,
      source: meta.source,
    };
  }

  async function loadEditorTracks() {
    const { data, error } = await sb.from('custom_playlist_tracks')
      .select('*, tracks(*), track_answers(answer_type_id, value, answer_types(name))')
      .eq('playlist_id', editorPl.id).order('position');
    if (error) { toast(error.message, 'error'); return; }
    editorTracks = (data || []).map(flattenTrackRow);
  }

  async function removeTrack(trackId) {
    const { error } = await sb.from('custom_playlist_tracks').delete().eq('id', trackId);
    if (error) { toast(error.message, 'error'); return; }
    editorTracks = editorTracks.filter(t => t.id !== trackId);
  }

  function normalize(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  // Upsert des titres dans le catalogue partagé → track_ids canoniques
  async function resolveTrackIds(trackList) {
    await ensureSession();
    const { data: { session } } = await sb.auth.getSession();
    const r = await fetch('/api/tracks/resolve', {
      method: 'POST',
      headers: { authorization: `Bearer ${session?.access_token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ tracks: trackList }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
    return body.ids;
  }

  // Les anciennes colonnes (artist, title, …) sont encore remplies pendant la
  // transition de migration (NOT NULL + rollback possible) — retirées en étape 3.
  function linkRow(t, trackId, position) {
    return {
      playlist_id: editorPl.id, track_id: trackId, position,
      artist: t.artist, title: t.title,
      preview_url: t.preview_url || null, cover_url: t.cover_url || null,
      source: t.source || 'manual', external_id: t.external_id || null,
    };
  }

  async function addTrack(trackData) {
    const extId = trackData.external_id;
    const norm  = normalize(trackData.artist) + '|' + normalize(trackData.title);
    const isDup = editorTracks.some(t => (extId && t.external_id === extId) || (normalize(t.artist) + '|' + normalize(t.title)) === norm);
    if (isDup) { toast('Ce titre est déjà dans la playlist.', 'error'); return false; }
    try {
      const [trackId] = await resolveTrackIds([trackData]);
      if (editorTracks.some(t => t.track_id === trackId)) {
        toast('Ce titre est déjà dans la playlist.', 'error');
        return false;
      }
      const { data, error } = await sb.from('custom_playlist_tracks')
        .insert(linkRow(trackData, trackId, editorTracks.length))
        .select('*, tracks(*)').single();
      if (error) throw new Error(error.message);
      editorTracks = [...editorTracks, flattenTrackRow(data)];
      return true;
    } catch (e) { toast(e.message, 'error'); return false; }
  }

  async function addBatch(tracks) {
    const existingIds = new Set(editorTracks.map(t => t.external_id).filter(Boolean));
    const newTracks   = tracks.filter(t => !existingIds.has(t.external_id));
    if (!newTracks.length) return { added: 0 };
    try {
      const ids = await resolveTrackIds(newTracks);
      const linkedIds = {};
      for (const t of editorTracks) if (t.track_id) linkedIds[t.track_id] = true;
      const rows = [];
      newTracks.forEach((t, i) => {
        if (linkedIds[ids[i]]) return;
        linkedIds[ids[i]] = true;
        rows.push(linkRow(t, ids[i], editorTracks.length + rows.length));
      });
      if (!rows.length) return { added: 0 };
      const { data, error } = await sb.from('custom_playlist_tracks').insert(rows).select('*, tracks(*)');
      if (error) throw new Error(error.message);
      editorTracks = [...editorTracks, ...data.map(flattenTrackRow)];
      return { added: data.length };
    } catch (e) { toast(e.message, 'error'); return { added: 0 }; }
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

<header class="page-head">
  <div class="page-head-inner">
    <h1 class="page-head-title">Playlists</h1>
    <p class="page-head-sub">Crée, importe, joue · Spotify, Deezer, ou manuellement</p>
  </div>
</header>

<div class="pl-split">
  <!-- ── Panneau gauche ── -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="pl-left" class:mobile-hidden={editorOpen}>
    <div class="pl-left-head">
      <span class="pl-left-title">Playlists</span>
      {#if user}
        <button class="pl-new-btn" onclick={() => openPlModal()}>+ Nouvelle</button>
      {/if}
    </div>

    {#if !authReady && !user}
      <div class="pl-loading">Chargement...</div>
    {:else if !user}
      <div class="pl-auth-wall">
        <p>Connecte-toi pour créer tes playlists</p>
        <div class="pl-auth-btns">
          <button class="btn-ghost" onclick={() => openAuthModal('login')}>Se connecter</button>
          <button class="btn-accent" onclick={() => openAuthModal('register')}>Créer un compte</button>
        </div>
      </div>
    {:else if plLoading}
      <div class="pl-loading">Chargement...</div>
    {:else if playlists.length === 0}
      <div class="pl-list-empty" onclick={() => openPlModal()}>
        <span class="pl-list-empty-plus">+</span>
        <span>Crée ta première playlist</span>
      </div>
    {:else}
      <div class="pl-list">
        {#each playlists as pl (pl.id)}
          <div class="pl-item" class:active={editorPl?.id === pl.id} onclick={() => openEditor(pl)}>
            <div class="pl-item-info">
              <div class="pl-item-name">{pl.name}</div>
              <div class="pl-item-count">{pl.track_count ?? 0} titre{(pl.track_count ?? 0) !== 1 ? 's' : ''}</div>
            </div>
            <span class="pl-badge {pl.is_public ? 'pl-badge-pub' : 'pl-badge-priv'}">{pl.is_public ? 'PUB' : 'PRIV'}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- ── Panneau droit ── -->
  <div class="pl-right" class:mobile-hidden={!editorOpen}>
    {#if !editorOpen || !editorPl}
      <div class="pl-right-empty">
        <div class="pl-right-empty-line"></div>
        <span class="pl-right-empty-msg">Sélectionne une playlist</span>
      </div>
    {:else}
      <button class="pl-back-mobile" onclick={() => { editorOpen = false; editorPl = null; }}>← Retour</button>

      <div class="pl-editor-head">
        <div class="pl-editor-title-block">
          <div class="pl-editor-title">{editorPl.name}</div>
          <div class="pl-editor-sub">{editorTracks.length} titre{editorTracks.length !== 1 ? 's' : ''} · {editorPl.is_public ? 'Publique' : 'Privée'}</div>
        </div>
        <div class="pl-editor-acts">
          <button class="pl-act-mod" onclick={() => openPlModal(editorPl)}>Modifier</button>
          <button class="pl-act-launch" onclick={openRoomSettings}>Lancer une room →</button>
          <button class="pl-act-del" onclick={deletePl}>Supprimer</button>
        </div>
      </div>

      <TrackSearch onAdd={addTrack} onAddBatch={addBatch} />

      <div class="pl-tracks-area">
        <div class="pl-tracks-head">
          <span class="pl-tracks-lbl">Titres dans la playlist — {editorTracks.length}</span>
        </div>
        {#if !editorTracks.length}
          <EmptyState icon="🎵" title="Aucun titre" description="Ajoute des titres via les onglets ci-dessus." />
        {:else}
          {#each editorTracks as t, i (t.id)}
            <TrackRow
              track={t}
              index={i + 1}
              onRemove={() => removeTrack(t.id)}
              onEditAnswers={() => openAnswersEditor(t)}
            />
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Playlist create/edit modal -->
{#if plModalOpen}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div id="modal-playlist" class="overlay" role="dialog" aria-modal="true" onclick={e => { if (e.target === e.currentTarget) plModalOpen = false; }}>
  <div class="modal modal-pl-create">
    <div class="plc-head">
      <span class="plc-eyebrow">{editingPl ? 'Modifier la playlist' : 'Nouvelle playlist'}</span>
      <button class="close-btn" onclick={() => plModalOpen = false}>&#x2715;</button>
    </div>

    <div class="plc-fields">
      <div class="plc-field">
        <label class="plc-label" for="pl-name-input">Nom</label>
        <input id="pl-name-input" type="text" bind:value={plName} placeholder="MA PLAYLIST" maxlength="60" class="plc-name-input"
          onkeypress={e => { if (e.key === 'Enter') savePl(); }}>
      </div>
      <div class="plc-field">
        <span class="plc-label">Visibilité</span>
        <div class="plc-seg">
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="plc-seg-btn" class:on={!plPublic} onclick={() => plPublic = false}>Privée</div>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="plc-seg-btn" class:on={plPublic} onclick={() => plPublic = true}>Publique</div>
        </div>
      </div>
    </div>

    {#if plError}<div class="alert-err">{plError}</div>{/if}
    <div class="modal-footer">
      <button class="btn-ghost" onclick={() => plModalOpen = false}>Annuler</button>
      <button class="btn-accent" onclick={savePl} disabled={plSaving}>{plSaving ? '...' : editingPl ? 'Enregistrer' : 'Créer'}</button>
    </div>
  </div>
</div>
{/if}


<!-- Room settings modal -->
{#if rsOpen}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" role="dialog" aria-modal="true" onclick={e => { if (e.target === e.currentTarget) rsOpen = false; }}>
  <div class="modal modal-lg modal-eph">
    <button class="close-btn" onclick={() => rsOpen = false}>&#x2715;</button>

    <div class="room-eph-header">
      <div class="room-eph-ico">&#x26A1;</div>
      <div>
        <div class="room-eph-kicker">Room éphémère</div>
        <h2 class="room-eph-title">Lancer une room</h2>
      </div>
    </div>

    <div class="room-eph-pl">
      <span class="room-eph-pl-tile">{editorPl?.emoji}</span>
      <div class="room-eph-pl-info">
        <div class="room-eph-pl-name">{editorPl?.name}</div>
        <div class="room-eph-pl-meta">{editorTracks.length} titre{editorTracks.length !== 1 ? 's' : ''}</div>
      </div>
    </div>

    <div class="room-eph-notice">
      <span class="room-eph-icon">&#x1F4A1;</span>
      <div>Cette room est <strong>temporaire</strong> &mdash; elle disparaîtra automatiquement après 4h d&apos;inactivité.
        Pour créer une room permanente, <a href="/rooms" class="room-eph-link">rendez-vous sur la page Rooms</a>.</div>
    </div>

    <div class="room-settings">
      <div class="room-setting">
        <div class="room-setting-head">
          <span class="room-setting-label">Nombre de manches</span>
          <span class="room-setting-val">{rsRounds}</span>
        </div>
        <input type="range" bind:value={rsRounds} min="3" max={editorTracks.length} step="1"
          style="--p:{editorTracks.length > 3 ? ((rsRounds - 3) / (editorTracks.length - 3)) * 100 : 100}%">
      </div>
      <div class="room-setting">
        <div class="room-setting-head">
          <span class="room-setting-label">Durée d'une manche</span>
          <span class="room-setting-val">{rsDuration}s</span>
        </div>
        <input type="range" bind:value={rsDuration} min="10" max="60" step="5"
          style="--p:{((rsDuration - 10) / 50) * 100}%">
      </div>
      <div class="room-setting">
        <div class="room-setting-head">
          <span class="room-setting-label">Pause entre titres</span>
          <span class="room-setting-val">{rsBreak}s</span>
        </div>
        <input type="range" bind:value={rsBreak} min="3" max="15" step="1"
          style="--p:{((rsBreak - 3) / 12) * 100}%">
      </div>
    </div>

    {#if rsError}<div class="alert-err">{rsError}</div>{/if}

    <div class="modal-footer">
      <button class="btn-ghost" onclick={() => rsOpen = false}>Annuler</button>
      <button class="room-eph-create" onclick={createRoom} disabled={rsSaving}>{rsSaving ? 'Création…' : 'Créer la room →'}</button>
    </div>
  </div>
</div>
{/if}

<!-- Room code modal -->
{#if rcOpen}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" role="dialog" aria-modal="true" onclick={e => { if (e.target === e.currentTarget) rcOpen = false; }}>
  <div class="modal modal-lg modal-eph">
    <button class="close-btn" onclick={() => rcOpen = false}>&#x2715;</button>

    <div class="room-eph-header">
      <div class="room-eph-ico is-ok">&#x2713;</div>
      <div>
        <div class="room-eph-kicker is-ok">Room créée</div>
        <h2 class="room-eph-title">C'est prêt !</h2>
      </div>
    </div>
    <p class="mdesc">Partage ce code à tes amis pour qu'ils rejoignent la room.</p>

    <div class="room-code-box">
      <div class="room-code-label">Code de la room</div>
      <div class="room-code">
        {#each rcCode.split('') as ch, i (i)}<b>{ch}</b>{/each}
      </div>
      <div class="room-share-url">{typeof window !== 'undefined' ? `${window.location.origin}/game?roomId=${rcCode}` : ''}</div>
      <div class="room-code-actions">
        <button class="btn-ghost sm" onclick={copyLink}>Copier le lien</button>
        <button class="room-eph-create" onclick={joinRoomNow}>Rejoindre maintenant &rarr;</button>
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
/* ── Split View ──────────────────────────────────────────────────────────── */
.pl-split {
  display: grid;
  grid-template-columns: 300px 1fr;
  border-top: 1px solid var(--border);
  min-height: calc(100vh - 140px);
}

/* ── Panneau gauche ──────────────────────────────────────────────────────── */
.pl-left {
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  background: var(--bg);
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
  overflow: hidden;
}
.pl-left-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.pl-left-title {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 900;
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.pl-new-btn {
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--mid);
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 7px 14px;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
}
.pl-new-btn:hover { border-color: var(--accent); color: var(--accent); }

.pl-loading { color: var(--dim); font-size: 0.82rem; padding: 24px 16px; }

.pl-auth-wall { padding: 24px 16px; display: flex; flex-direction: column; gap: 14px; }
.pl-auth-wall p { font-size: 0.8rem; color: var(--mid); }
.pl-auth-btns { display: flex; flex-direction: column; gap: 8px; }

.pl-list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 160px;
  cursor: pointer;
  color: var(--dim);
  font-size: 0.78rem;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: color 0.15s;
}
.pl-list-empty:hover { color: var(--accent); }
.pl-list-empty-plus { font-size: 1.6rem; line-height: 1; }

.pl-list {
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: rgb(var(--accent-rgb) / 0.35) transparent;
}
.pl-list::-webkit-scrollbar { width: 3px; }
.pl-list::-webkit-scrollbar-track { background: transparent; }
.pl-list::-webkit-scrollbar-thumb { background: rgb(var(--accent-rgb) / 0.35); }
.pl-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  position: relative;
  transition: background 0.1s;
}
.pl-item::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 0;
  background: var(--accent);
  transition: width 0.12s;
}
.pl-item:hover::before,
.pl-item.active::before { width: 2px; }
.pl-item:hover { background: rgb(var(--c-glass) / 0.02); }
.pl-item.active { background: rgb(var(--accent-rgb) / 0.04); }
.pl-item-info { flex: 1; min-width: 0; }
.pl-item-name {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pl-item.active .pl-item-name { color: var(--accent); }
.pl-item-count { font-size: 0.62rem; color: var(--dim); margin-top: 2px; }

.pl-badge {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 2px 5px;
  border: 1px solid;
  flex-shrink: 0;
}
.pl-badge-pub { color: var(--accent); border-color: rgb(var(--accent-rgb) / 0.3); }
.pl-badge-priv { color: var(--dim); border-color: var(--border2); }

/* ── Panneau droit ───────────────────────────────────────────────────────── */
.pl-right {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
}
.pl-right-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.pl-right-empty-line { width: 40px; height: 2px; background: var(--accent); }
.pl-right-empty-msg {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 900;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--dim);
}

.pl-back-mobile { display: none; }

.pl-editor-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 24px;
  border-bottom: 2px solid var(--accent);
  flex-shrink: 0;
}
.pl-editor-title-block { flex: 1; min-width: 0; }
.pl-editor-title {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 900;
  font-size: 2rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pl-editor-sub {
  font-size: 0.6rem;
  color: var(--mid);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: 3px;
}
.pl-editor-acts { display: flex; gap: 6px; flex-shrink: 0; }
.pl-act-mod {
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--mid);
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 7px 12px;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
}
.pl-act-mod:hover { border-color: var(--text); color: var(--text); }
.pl-act-launch {
  background: var(--accent);
  border: none;
  color: var(--on-accent);
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 900;
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 8px 14px;
  cursor: pointer;
  transition: opacity 0.12s;
}
.pl-act-launch:hover { opacity: 0.82; }
.pl-act-del {
  background: transparent;
  border: 1px solid rgba(239,68,68,0.3);
  color: var(--danger);
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 7px 12px;
  cursor: pointer;
  transition: background 0.12s;
}
.pl-act-del:hover { background: rgba(239,68,68,0.1); }

.pl-tracks-area {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px;
  scrollbar-width: thin;
  scrollbar-color: rgb(var(--accent-rgb) / 0.35) transparent;
}
.pl-tracks-area::-webkit-scrollbar { width: 3px; }
.pl-tracks-area::-webkit-scrollbar-track { background: transparent; }
.pl-tracks-area::-webkit-scrollbar-thumb { background: rgb(var(--accent-rgb) / 0.35); }
.pl-tracks-head {
  padding: 12px 0 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2px;
}
.pl-tracks-lbl {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--dim);
}

/* ── Modale création / modification ──────────────────────────────────────── */
.modal-pl-create { max-width: 480px; }
.plc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.plc-eyebrow {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
}
.plc-fields { display: flex; flex-direction: column; gap: 22px; margin-bottom: 4px; }
.plc-field { display: flex; flex-direction: column; gap: 8px; }
.plc-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--dim);
}
.plc-name-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border2);
  color: var(--text);
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 900;
  font-size: 1.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 0 10px;
  outline: none;
  transition: border-color 0.15s;
}
.plc-name-input::placeholder { color: var(--dim); }
.plc-name-input:focus { border-color: var(--accent); }
.plc-seg { display: flex; }
.plc-seg-btn {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 8px 20px;
  border: 1px solid var(--border2);
  border-right: none;
  background: transparent;
  color: var(--dim);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.plc-seg-btn:last-child { border-right: 1px solid var(--border2); }
.plc-seg-btn.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }

/* ── Modals size overrides ───────────────────────────────────────────────────── */
.modal-lg { max-width: 620px; }
.modal-xl {
  max-width: 960px;
  max-height: 92vh;
  overflow-y: auto;
}
#modal-playlist { z-index: 700; }

.modal-footer {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end;
}
.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.track-remove-btn {
  background: transparent;
  border: none;
  color: var(--dim);
  width: 26px;
  height: 26px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
  flex-shrink: 0;
}
.track-remove-btn:hover { color: var(--danger); }

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

/* ── Room launch modal — identité v3 (verre + liseré) ────────────────────────── */
.modal-eph {
  border-radius: 20px;
  background: color-mix(in srgb, var(--bg2) 88%, transparent);
  backdrop-filter: blur(22px) saturate(1.35);
  -webkit-backdrop-filter: blur(22px) saturate(1.35);
  border: 1px solid var(--border);
  box-shadow:
    0 30px 90px rgba(0, 0, 0, 0.65),
    inset 0 1px 0 rgb(var(--c-glass) / 0.06);
  overflow: hidden;
}
.modal-eph::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgb(var(--accent-rgb) / 0.8), transparent);
  opacity: 0.7;
}

.room-eph-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  padding-right: 28px;
}
.room-eph-ico {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.35);
  box-shadow: 0 0 24px rgba(251, 191, 36, 0.14);
  color: var(--gold);
}
.room-eph-ico.is-ok {
  background: rgba(74, 222, 128, 0.1);
  border-color: rgba(74, 222, 128, 0.4);
  box-shadow: 0 0 24px rgba(74, 222, 128, 0.18);
  color: var(--success);
}
.room-eph-kicker {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 4px;
}
.room-eph-kicker.is-ok {
  color: var(--success);
}
.room-eph-title {
  margin-bottom: 0 !important;
  line-height: 1.05;
}

.room-eph-pl {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgb(var(--c-glass) / 0.03);
  border: 1px solid var(--border);
  border-radius: 13px;
  margin-bottom: 12px;
}
.room-eph-pl-tile {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  background: rgb(var(--accent-rgb) / 0.1);
  border: 1px solid rgb(var(--accent-rgb) / 0.35);
}
.room-eph-pl-info {
  min-width: 0;
}
.room-eph-pl-name {
  font-weight: 700;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.room-eph-pl-meta {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--dim);
  margin-top: 2px;
}

.room-eph-notice {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: rgb(var(--accent-rgb) / 0.05);
  border: 1px solid rgb(var(--accent-rgb) / 0.18);
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 0.78rem;
  color: var(--mid);
  line-height: 1.5;
  margin-bottom: 18px;
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
  gap: 18px;
  margin: 0 0 20px;
}
.room-setting-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 9px;
}
.room-setting-label {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 800;
  font-size: 0.88rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.room-setting-val {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--accent);
  background: rgb(var(--accent-rgb) / 0.08);
  border: 1px solid rgb(var(--accent-rgb) / 0.3);
  border-radius: 7px;
  padding: 2px 9px;
}
.room-setting input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
  cursor: pointer;
  background: transparent;
  outline: none;
  border: none;
}
.room-setting input[type="range"]::-webkit-slider-runnable-track {
  height: 5px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--accent) var(--p, 50%),
    rgb(var(--c-glass) / 0.1) var(--p, 50%)
  );
}
.room-setting input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 17px;
  height: 17px;
  margin-top: -6px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid var(--accent);
  box-shadow: 0 0 12px rgb(var(--accent-rgb) / 0.7);
}
.room-setting input[type="range"]::-moz-range-track {
  height: 5px;
  border-radius: 999px;
  background: rgb(var(--c-glass) / 0.1);
}
.room-setting input[type="range"]::-moz-range-progress {
  height: 5px;
  border-radius: 999px;
  background: var(--accent);
}
.room-setting input[type="range"]::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid var(--accent);
  box-shadow: 0 0 12px rgb(var(--accent-rgb) / 0.7);
}

.room-eph-create {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 900;
  font-size: 0.92rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--on-accent);
  border: none;
  cursor: pointer;
  background: linear-gradient(120deg, var(--accent), var(--accent2));
  padding: 12px 26px;
  border-radius: 12px;
  box-shadow: 0 6px 22px rgb(var(--accent-rgb) / 0.35);
  transition:
    transform 0.12s,
    box-shadow 0.15s;
}
.room-eph-create:hover {
  transform: translateY(-1px);
  box-shadow: 0 9px 30px rgb(var(--accent-rgb) / 0.5);
}
.room-eph-create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.room-code-box {
  text-align: center;
  padding: 14px 0 4px;
}
.room-code-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--mid);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  margin-bottom: 14px;
}
.room-code-label::before,
.room-code-label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--border);
}
.room-code {
  display: flex;
  gap: 7px;
  justify-content: center;
  margin-bottom: 16px;
}
.room-code b {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-weight: 700;
  font-size: 1.7rem;
  width: 46px;
  height: 58px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--accent-rgb) / 0.08);
  border: 1px solid rgb(var(--accent-rgb) / 0.45);
  border-radius: 12px;
  color: var(--accent);
  text-shadow: 0 0 16px rgb(var(--accent-rgb) / 0.7);
  box-shadow: 0 0 20px rgb(var(--accent-rgb) / 0.1);
}
.room-share-url {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.68rem;
  color: var(--dim);
  word-break: break-all;
  background: rgb(var(--c-glass) / 0.04);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 9px 12px;
  margin-bottom: 16px;
}
.room-code-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

/* ── Responsive ──────────────────────────────────────────────────────────────── */
@media (max-width: 700px) {
  .pl-split { grid-template-columns: 1fr; }
  .pl-left { position: static; height: auto; max-height: none; }
  .pl-right { position: static; height: auto; }
  .mobile-hidden { display: none; }
  .pl-back-mobile {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border);
    color: var(--mid);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 700;
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 12px 16px;
    cursor: pointer;
    width: 100%;
    transition: color 0.12s;
  }
  .pl-back-mobile:hover { color: var(--text); }
  .pl-editor-acts { flex-wrap: wrap; }
  .modal-xl { padding: 24px 18px; }
}
</style>

<script>
  import { onMount, getContext } from 'svelte';
  import Toast from '$lib/components/Toast.svelte';
  import LoadMore from '$lib/components/LoadMore.svelte';
  import { toast } from '$lib/toast.svelte.js';

  const _ctx = getContext('zik');
  const sb = _ctx.sb;
  const openAuthModal = _ctx.openAuthModal;
  const user = $derived(_ctx.user);

  const roomsJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Rooms de Blind Test Multijoueur — ZIK",
    "description": "Parcourez les rooms de blind test multijoueur ZIK. Mode Classique avec classement ELO ou Mode QCM. Créez votre propre room en 30 secondes.",
    "url": "https://www.zik-music.fr/rooms",
    "inLanguage": "fr-FR",
    "isPartOf": { "@type": "WebSite", "url": "https://www.zik-music.fr/", "name": "ZIK" }
  });

  let tab             = $state('public');
  let pubSearch       = $state('');
  let filterAutoStart = $state(false);
  let filterActive    = $state(false);
  let filterQcm       = $state(false);
  let filterClassic   = $state(false);
  let filterOfficial  = $state(false);

  const filteredPublic = $derived.by(() => {
    let list = publicRooms;
    if (pubSearch.trim()) {
      const q = pubSearch.trim().toLowerCase();
      list = list.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.profiles?.username?.toLowerCase().includes(q)
      );
    }
    if (filterAutoStart) list = list.filter(r => r.auto_start);
    if (filterActive)    list = list.filter(r => r.last_active_at && (Date.now() - new Date(r.last_active_at).getTime()) < 3_600_000);
    if (filterQcm)       list = list.filter(r => r.game_mode === 'qcm');
    if (filterClassic)   list = list.filter(r => r.game_mode !== 'qcm');
    if (filterOfficial)  list = list.filter(r => r.is_official);
    return list;
  });

  const hasActiveFilters = $derived(filterAutoStart || filterActive || filterQcm || filterClassic || filterOfficial);

  let visibleCount = $state(24);
  const visibleRooms = $derived(filteredPublic.slice(0, visibleCount));
  const hasMore      = $derived(visibleCount < filteredPublic.length);

  $effect(() => {
    // Reset pagination quand les filtres/search changent
    pubSearch; filterAutoStart; filterActive; filterQcm; filterClassic; filterOfficial;
    visibleCount = 24;
  });

  const patchworkChunks = $derived.by(() => {
    const chunks = [];
    for (let i = 0; i < visibleRooms.length; i += 8) chunks.push(visibleRooms.slice(i, i + 8));
    return chunks;
  });

  let itunesCovers = $state({});

  const SLOT_CONFIGS = [
    { cls: 'pw-a', cgCls: 'cg-3x3', count: 9,  maxPl: 3, showDesc: true  },
    { cls: 'pw-b', cgCls: 'cg-2x2', count: 4,  maxPl: 2, showDesc: false },
    { cls: 'pw-c', cgCls: 'cg-3x2', count: 6,  maxPl: 3, showDesc: false },
    { cls: 'pw-d', cgCls: 'cg-4x2', count: 8,  maxPl: 2, showDesc: false },
    { cls: 'pw-e', cgCls: 'cg-2x2', count: 4,  maxPl: 0, showDesc: false },
    { cls: 'pw-f', cgCls: 'cg-5x2', count: 10, maxPl: 3, showDesc: false },
    { cls: 'pw-g', cgCls: 'cg-2x2', count: 4,  maxPl: 0, showDesc: false },
    { cls: 'pw-h', cgCls: 'cg-2x2', count: 4,  maxPl: 0, showDesc: false },
  ];

  function fillCovers(covers, n) {
    if (!covers?.length) return Array(n).fill(null);
    const out = [];
    for (let i = 0; i < n; i++) out.push(covers[i % covers.length]);
    return out;
  }

  function roomCovers(r) {
    return r.covers?.length ? r.covers : (itunesCovers[r.id] || []);
  }

  async function fetchItunesForRooms(rooms) {
    const missing = rooms.filter(r => !r.covers?.length && !itunesCovers[r.id]);
    await Promise.all(missing.map(async r => {
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(r.name)}&media=music&entity=album&limit=9&country=fr`
        );
        const d = await res.json();
        const urls = (d.results || [])
          .map(x => x.artworkUrl100?.replace('100x100bb', '300x300bb'))
          .filter(Boolean);
        if (urls.length) itunesCovers = { ...itunesCovers, [r.id]: urls };
      } catch { /* pas bloquant */ }
    }));
  }

  $effect(() => {
    if (visibleRooms.length) fetchItunesForRooms(visibleRooms);
  });

  let publicRooms  = $state([]);
  let myRooms      = $state([]);
  let pubLoading   = $state(true);
  let mineLoading  = $state(false);

  let roomModalOpen   = $state(false);
  let editingRoomId   = $state(null);
  let editingCode     = $state(null);
  let roomName        = $state('');
  let roomEmoji       = $state('🎵');
  let roomDesc        = $state('');
  let roomPlaylistIds = $state([]);
  let roomMaxRounds   = $state(10);
  let roomDuration    = $state(30);
  let roomBreak       = $state(7);
  let roomPublic      = $state(true);
  let roomAutoStart   = $state(false);
  let roomGameMode    = $state('classic');
  let roomError       = $state('');
  let roomSaving      = $state(false);

  let allPlaylists      = $state([]);
  let plSearch          = $state('');
  let filteredPlaylists = $derived(
    plSearch.trim()
      ? allPlaylists.filter(p => p.name.toLowerCase().includes(plSearch.trim().toLowerCase()))
      : allPlaylists
  );
  let selectedPlaylists = $derived(allPlaylists.filter(p => roomPlaylistIds.includes(p.id)));
  let totalTrackCount   = $derived(selectedPlaylists.reduce((s, p) => s + (p.track_count || 0), 0));

  let deleteModalOpen = $state(false);
  let deletingRoomId  = $state(null);
  let deleteLoading   = $state(false);

  let selectedMineIdx = $state(0);
  let mineW = $state(0);
  let mineH = $state(0);

  const COVERS = $derived.by(() => {
    const w = mineW || 620;
    const h = mineH || 450;
    const size = Math.max(72, Math.round(Math.min(w / 5, h / 3)));
    const step = size + 4;
    const cols = Math.ceil(w / step) + 2;
    const rows = Math.ceil(h / step) + 1;
    const pos = [];
    for (let row = 0; row < rows; row++) {
      const ox = row % 2 === 0 ? 0 : -(step / 2);
      for (let col = 0; col < cols; col++) pos.push({ x: ox + col * step, y: row * step });
    }
    return { pos, size };
  });

  onMount(() => { loadPublicRooms(); });

  let _lastRoomsUid = null;
  $effect(() => {
    const uid = user?.id;
    if (uid && uid !== _lastRoomsUid && sb) {
      _lastRoomsUid = uid;
      if (tab === 'mine') loadMyRooms();
    }
  });

  async function getToken() {
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token || null;
  }

  async function loadPublicRooms() {
    pubLoading = true;
    try {
      const token = user ? await getToken() : null;
      const r = await fetch('/api/rooms', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      publicRooms = r.ok ? await r.json() : [];
    } catch { publicRooms = []; }
    pubLoading = false;
  }

  async function loadMyRooms() {
    if (!user) return;
    mineLoading = true;
    try {
      const token = await getToken();
      const r = await fetch('/api/rooms/mine', { headers: { Authorization: `Bearer ${token}` } });
      myRooms = r.ok ? await r.json() : [];
    } catch { myRooms = []; }
    mineLoading = false;
  }

  function switchTab(t) {
    tab = t;
    if (t === 'mine' && !myRooms.length) loadMyRooms();
  }

  async function loadPlaylists() {
    if (!user || !sb) return;
    try {
      const [{ data: mine }, { data: shared }] = await Promise.all([
        sb.from('custom_playlists').select('id, name, emoji, track_count').eq('owner_id', user.id).order('name'),
        sb.from('custom_playlists').select('id, name, emoji, track_count, is_official').or('is_public.eq.true,is_official.eq.true').neq('owner_id', user.id).order('name'),
      ]);
      const flat = [];
      for (const p of mine || []) flat.push({ id: p.id, name: p.name, emoji: p.emoji || '🎵', track_count: p.track_count, group: 'Mes playlists' });
      for (const p of shared || []) {
        if (flat.some(f => f.id === p.id)) continue;
        flat.push({ id: p.id, name: p.name, emoji: p.emoji || '🎵', track_count: p.track_count, group: p.is_official ? 'Officielles' : 'Publiques' });
      }
      allPlaylists = flat;
    } catch { allPlaylists = []; }
  }

  function togglePlaylist(pl) {
    if (roomPlaylistIds.includes(pl.id)) {
      roomPlaylistIds = roomPlaylistIds.filter(id => id !== pl.id);
    } else {
      roomPlaylistIds = [...roomPlaylistIds, pl.id];
    }
  }

  function joinRoom(code, gameMode = 'classic') {
    const username = user?.profile?.username || user?.email?.split('@')[0] || 'Joueur';
    const userId   = user?.id || '';
    const isGuest  = user ? '0' : '1';
    const p = new URLSearchParams({ roomId: code, username, userId, isGuest, gameMode });
    window.location.href = `/game?${p}`;
  }

  async function openCreate() {
    if (!user) { openAuthModal('login'); return; }
    await loadPlaylists();
    editingRoomId = null; editingCode = null;
    roomName = ''; roomEmoji = '🎵'; roomDesc = '';
    roomPlaylistIds = []; plSearch = '';
    roomMaxRounds = 10; roomDuration = 30; roomBreak = 7; roomPublic = true; roomAutoStart = false; roomGameMode = 'classic';
    roomError = '';
    roomModalOpen = true;
  }

  async function openEdit(code, id) {
    if (!user) return;
    await loadPlaylists();
    editingRoomId = id; editingCode = code;
    plSearch = '';
    try {
      const token = await getToken();
      const r = await fetch(`/api/rooms/${code}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const room = await r.json();
      roomName = room.name || ''; roomEmoji = room.emoji || '🎵'; roomDesc = room.description || '';
      roomPlaylistIds = room.playlist_ids || [];
      roomMaxRounds = room.max_rounds || 10;
      roomDuration = room.round_duration || 30; roomBreak = room.break_duration || 7;
      roomPublic = room.is_public !== false;
      roomAutoStart = room.auto_start || false;
      roomGameMode = room.game_mode || 'classic';
      roomError = '';
      roomModalOpen = true;
    } catch (e) { toast('Impossible de charger la room : ' + e.message, 'error'); }
  }

  async function saveRoom() {
    if (!roomName.trim()) { roomError = 'Le nom est requis.'; return; }
    if (!roomPlaylistIds.length) { roomError = 'Sélectionne au moins une playlist.'; return; }
    roomSaving = true; roomError = '';
    try {
      const token = await getToken();
      if (!token) throw new Error('Session expirée, reconnecte-toi.');
      const body = {
        name: roomName, emoji: roomEmoji || '🎵', description: roomDesc,
        playlist_ids: roomPlaylistIds, is_public: roomPublic,
        max_rounds: roomMaxRounds, round_duration: roomDuration, break_duration: roomBreak,
        auto_start: roomAutoStart, game_mode: roomGameMode,
      };
      const r = editingRoomId
        ? await fetch(`/api/rooms/${editingRoomId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
        : await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      toast(editingRoomId ? 'Room mise à jour !' : `Room créée ! Code : ${d.code}`, 'success');
      roomModalOpen = false;
      loadPublicRooms();
      if (tab === 'mine') loadMyRooms();
    } catch (e) { roomError = e.message; }
    roomSaving = false;
  }

  function askDelete(id) { deletingRoomId = id; deleteModalOpen = true; }

  async function confirmDelete() {
    if (!deletingRoomId) return;
    deleteLoading = true;
    try {
      const token = await getToken();
      const r = await fetch(`/api/rooms/${deletingRoomId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
      toast('Room supprimée.', 'success');
      deleteModalOpen = false; deletingRoomId = null;
      loadPublicRooms(); loadMyRooms();
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
    deleteLoading = false;
  }
</script>

<svelte:head>
  <title>Rooms de Blind Test Multijoueur en Ligne — ZIK</title>
  <meta name="description" content="Rejoins une room de blind test multijoueur gratuit ou crée la tienne. Mode Classique avec classement ELO ou Mode QCM, playlists Spotify/Deezer. Jusqu'à 20 joueurs en temps réel." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.zik-music.fr/rooms" />
  <meta property="og:title" content="Rooms de Blind Test Multijoueur — ZIK" />
  <meta property="og:description" content="Rejoins une room de blind test en ligne ou crée la tienne. Mode Classique ELO ou QCM casual. Playlists Spotify & Deezer. Gratuit, sans inscription." />
  <meta property="og:url" content="https://www.zik-music.fr/rooms" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://www.zik-music.fr/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Rooms de Blind Test Multijoueur — ZIK" />
  <meta name="twitter:description" content="Rejoins ou crée une room de blind test en ligne. Mode Classique ELO ou QCM. Gratuit, sans inscription." />
  <meta name="twitter:image" content="https://www.zik-music.fr/og.png" />
  <script type="application/ld+json">{@html roomsJsonLd}</script>
</svelte:head>

<div class="rooms-page">

  <!-- HEAD : titre + sous-titre + bouton créer -->
  <div class="rp-head">
    <div>
      <h1>Rooms</h1>
      <p class="rp-sub">Classique ELO · QCM · Officiel &amp; Custom</p>
    </div>
    {#if user}
      <button class="btn-accent rp-btn-create" onclick={openCreate}>+ Créer une room</button>
    {/if}
  </div>

  <!-- TOOLBAR : tabs underline + search inline -->
  <div class="rp-toolbar">
    <div class="rp-tabs">
      <button class="rp-tab" class:on={tab === 'public'} onclick={() => switchTab('public')}>Rooms publiques</button>
      {#if user}
        <button class="rp-tab" class:on={tab === 'mine'} onclick={() => switchTab('mine')}>Mes rooms</button>
      {/if}
    </div>
    {#if tab === 'public'}
      <div class="rp-search-wrap">
        <span class="rp-search-icon">⌕</span>
        <input class="rp-search" type="search" bind:value={pubSearch} placeholder="Rechercher une room..." />
      </div>
    {/if}
  </div>

  <!-- FILTRES / CHIPS -->
  {#if tab === 'public'}
    <div class="rp-chips">
      <button class="chip" class:on={filterActive} onclick={() => filterActive = !filterActive}>● Live</button>
      <button class="chip" class:on={filterAutoStart} onclick={() => filterAutoStart = !filterAutoStart}>Auto-start</button>
      <button class="chip" class:on={filterQcm} onclick={() => { filterQcm = !filterQcm; if (filterQcm) filterClassic = false; }}>QCM</button>
      <button class="chip" class:on={filterClassic} onclick={() => { filterClassic = !filterClassic; if (filterClassic) filterQcm = false; }}>Classique</button>
      <button class="chip" class:on={filterOfficial} onclick={() => filterOfficial = !filterOfficial}>Officielles</button>
      {#if hasActiveFilters}
        <button class="chip chip-reset" onclick={() => { filterActive = false; filterAutoStart = false; filterQcm = false; filterClassic = false; filterOfficial = false; }}>✕</button>
      {/if}
    </div>
  {/if}

  <!-- TAB PUBLIC -->
  {#if tab === 'public'}
    {#if pubLoading}
      <div class="rp-inner"><div class="pl-loading">Chargement...</div></div>
    {:else if !publicRooms.length}
      <div class="rp-inner">
        <div class="rooms-empty"><p>Aucune room publique pour l'instant.<br>Sois le premier à en créer une !</p></div>
      </div>
    {:else}

      <!-- Patchwork — un bloc de 8 par chunk, se répète pour toutes les rooms -->
      {#each patchworkChunks as chunk, ci (ci)}
        <div class="patchwork">
          {#each SLOT_CONFIGS as cfg, i (i)}
            {#if chunk[i]}
              {@const r = chunk[i]}
              {@const gi = ci * 8 + i}
              <div
                class="pw-room {cfg.cls} {r.online > 0 ? 'is-live' : ''}"
                role="button" tabindex="0"
                onclick={() => joinRoom(r.code, r.game_mode)}
                onkeydown={e => (e.key === 'Enter' || e.key === ' ') && joinRoom(r.code, r.game_mode)}
              >
                {#if roomCovers(r).length}
                  <div class="covers-grid {cfg.cgCls}">
                    {#each fillCovers(roomCovers(r), cfg.count) as cover, j (j)}
                      {#if cover}
                        <img src={cover} alt="" loading="lazy" />
                      {:else}
                        <div class="cover-fallback" style="background:hsl({(j*47+gi*83)%360}deg,28%,10%)"></div>
                      {/if}
                    {/each}
                  </div>
                {:else}
                  <div class="pw-cover-empty" style="background:linear-gradient(135deg,hsl({gi*53%360}deg,30%,11%),hsl({(gi*53+120)%360}deg,25%,7%))"></div>
                {/if}
                <div class="pw-dim"></div>
                <div class="pw-grad"></div>

                <!-- Info permanente (repos) -->
                <div class="pw-info">
                  <div class="pw-top">
                    {#if r.online > 0}<span class="pw-live-tag"><span class="ldot"></span> Live</span>{/if}
                    {#if r.is_official}<span class="pw-badge pw-badge-official">✓ Officielle</span>{/if}
                    {#if r.game_mode === 'qcm'}<span class="pw-badge pw-badge-qcm">QCM</span>{:else}<span class="pw-badge pw-badge-classic">Classique</span>{/if}
                  </div>
                  <div class="pw-bottom">
                    <div class="pw-name {cfg.cls}">{r.name}</div>
                    {#if r.profiles?.username}<div class="pw-owner">par {r.profiles.username}</div>{/if}
                    <div class="pw-footer">
                      <span class="pw-code {cfg.cls}">{r.code}</span>
                    </div>
                  </div>
                </div>

                <!-- Overlay hover -->
                <div class="pw-hover" onclick={e => { e.stopPropagation(); joinRoom(r.code, r.game_mode); }}>
                  <div class="pwh-head">
                    <div class="pwh-name">{r.name}</div>
                    <div class="pwh-sub">
                      {#if r.profiles?.username}<span>par {r.profiles.username}</span><span class="pwh-dot">·</span>{/if}
                      <span>{r.max_rounds} manches</span>
                      <span class="pwh-dot">·</span>
                      <span>{r.round_duration}s</span>
                      {#if r.auto_start}<span class="pwh-dot">·</span><span>auto</span>{/if}
                      {#if r.track_count > 0}<span class="pwh-dot">·</span><span class="pwh-tcount">{r.track_count}</span><span class="pwh-titres"> titres</span>{/if}
                    </div>
                  </div>

                  {#if cfg.maxPl > 0 && r.playlists?.length}
                    <div class="pwh-setlist">
                      {#each r.playlists.slice(0, cfg.maxPl) as pl, pi (pi)}
                        <div class="pwh-setrow">
                          <span class="pwh-setn">{pl.name}</span>
                          <span class="pwh-setc">{pl.track_count}</span>
                        </div>
                      {/each}
                      {#if r.playlists.length > cfg.maxPl}
                        <div class="pwh-setmore">+{r.playlists.length - cfg.maxPl} playlist{r.playlists.length - cfg.maxPl > 1 ? 's' : ''}</div>
                      {/if}
                    </div>
                  {/if}

                  <div class="pwh-foot">
                    <div class="pwh-badges">
                      {#if r.online > 0}<span class="pw-live-tag"><span class="ldot"></span>{r.online} en jeu</span>{/if}
                      {#if r.is_official}<span class="pw-badge pw-badge-official">✓ Off.</span>{/if}
                      {#if r.game_mode === 'qcm'}<span class="pw-badge pw-badge-qcm">QCM</span>{:else}<span class="pw-badge pw-badge-classic">Classique</span>{/if}
                    </div>
                    <button class="{r.online > 0 ? 'btn-join' : 'btn-dispo'} pwh-btn">
                      {r.online > 0 ? 'Rejoindre →' : 'Entrer →'}
                    </button>
                  </div>
                </div>

              </div>
            {:else}
              <div class="pw-empty {cfg.cls}"></div>
            {/if}
          {/each}
        </div>
      {/each}

      <!-- Pagination -->
      {#if filteredPublic.length === 0}
        <div class="rp-end">Aucune room ne correspond à ta recherche.</div>
      {:else if hasMore}
        <div class="rp-loadmore">
          <LoadMore hasMore={true} loading={false} onLoad={() => visibleCount += 24} />
        </div>
      {:else}
        <div class="rp-end">{filteredPublic.length} room{filteredPublic.length > 1 ? 's' : ''} · Fin de la liste</div>
      {/if}
    {/if}

  <!-- TAB MES ROOMS -->
  {:else}
    {#if mineLoading}
      <div class="rp-inner"><div class="pl-loading">Chargement...</div></div>
    {:else if myRooms.length === 0}
      <div class="mine-empty">
        <p>Tu n'as pas encore de room.</p>
        <button class="btn-accent" onclick={openCreate}>+ Créer ma première room</button>
      </div>
    {:else}
      {@const sel = myRooms[Math.min(selectedMineIdx, myRooms.length - 1)]}
      <div class="mine-wrap">

        <!-- Panneau détail (droite desktop / haut mobile) -->
        <div class="mine-panel">
          <div class="mine-fan" bind:clientWidth={mineW} bind:clientHeight={mineH}>
            {#if sel.covers?.length}
              {#each COVERS.pos as pos, ci (ci)}
                <img class="mine-cov" src={sel.covers[ci % sel.covers.length]} alt="" loading="lazy"
                  style="width:{COVERS.size}px;height:{COVERS.size}px;top:{pos.y}px;left:{pos.x}px" />
              {/each}
            {:else}
              {#each COVERS.pos as pos, ci (ci)}
                {@const hue = ((sel.name?.charCodeAt(0) ?? 0) * 53 + ci * 37) % 360}
                <div class="mine-cov"
                  style="width:{COVERS.size}px;height:{COVERS.size}px;top:{pos.y}px;left:{pos.x}px;background:hsl({hue}deg,28%,10%)"></div>
              {/each}
            {/if}
          </div>
          <div class="mine-g1"></div>
          <div class="mine-g2"></div>
          {#if sel.online > 0}<div class="mine-livebar"></div>{/if}
          <div class="mine-pcontent">
            <div class="mine-ptop">
              {#if sel.online > 0}<span class="pw-live-tag" style="font-size:.58rem;padding:3px 10px"><span class="ldot"></span>{sel.online} en jeu</span>{/if}
              {#if sel.game_mode === 'qcm'}<span class="pw-badge pw-badge-qcm">QCM</span>{:else}<span class="pw-badge pw-badge-classic">Classique · ELO</span>{/if}
              {#if !sel.is_public}<span class="pw-badge" style="color:rgba(255,255,255,.22);border-color:rgba(255,255,255,.1)">Privée</span>{/if}
            </div>
            <div>
              <div class="mine-pname">{sel.name}</div>
              <div class="mine-pmeta">
                <span>{sel.max_rounds} manches</span>
                <span class="mine-pdot">·</span>
                <span>{sel.round_duration}s</span>
                {#if sel.track_count > 0}
                  <span class="mine-pdot">·</span>
                  <span class="mine-ptc">{sel.track_count}</span>
                  <span>titres</span>
                {/if}
              </div>
              <div class="mine-pactions">
                <button class="mine-pjoin" onclick={() => joinRoom(sel.code, sel.game_mode)}>→ Rejoindre</button>
                <button class="mine-pedit-btn" onclick={() => openEdit(sel.code, sel.id)}>Modifier</button>
                <button class="mine-pdel-btn" onclick={() => askDelete(sel.id)}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Index tickets (gauche desktop / bas mobile) -->
        <div class="mine-idx">
          <div class="mine-idx-head">
            <span class="mine-idx-title">Mes rooms</span>
            <span class="mine-idx-count">{myRooms.length} room{myRooms.length > 1 ? 's' : ''}</span>
          </div>
          <div class="mine-list">
            {#each myRooms as r, ti (r.id)}
              <button
                class="mine-ticket"
                class:active={selectedMineIdx === ti}
                onclick={() => selectedMineIdx = ti}
                type="button"
              >
                <div class="mine-perf">
                  <div class="mine-punch mine-punch-t"></div>
                  <div class="mine-pline"></div>
                  <div class="mine-punch mine-punch-b"></div>
                </div>
                <div class="mine-stub">
                  <span class="mine-snum">{String(ti + 1).padStart(2, '0')}</span>
                  <span class="mine-slabel">ZIK</span>
                </div>
                <div class="mine-tbody">
                  <div class="mine-tname">
                    {r.name}
                    {#if r.online > 0}<span class="mine-ldot"></span>{/if}
                  </div>
                  <div class="mine-tmeta">
                    {r.game_mode === 'qcm' ? 'QCM' : 'Classique'}
                    {#if r.track_count > 0} · <span class="mine-tc">{r.track_count} titres</span>{/if}
                  </div>
                </div>
              </button>
            {/each}
          </div>
          <button class="mine-add-btn" onclick={openCreate} type="button">
            <div class="mine-perf">
              <div class="mine-punch mine-punch-t"></div>
              <div class="mine-pline"></div>
            </div>
            <div class="mine-stub mine-add-stub"><span class="mine-add-plus">+</span></div>
            <div class="mine-tbody mine-add-body">
              <span class="mine-add-txt">Nouvelle room</span>
            </div>
          </button>
        </div>

      </div>
    {/if}
  {/if}

</div>

<!-- Room modal -->
{#if roomModalOpen}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" role="dialog" aria-modal="true" onclick={e => { if (e.target === e.currentTarget) roomModalOpen = false; }}>
  <div class="modal-m2">

    <div class="m2-bar">
      <div>
        <div class="m2-eyebrow">{editingRoomId ? 'Modifier la room' : 'Créer une room'}</div>
        <div class="m2-room-id">
          <span class="m2-room-name">{roomName || (editingRoomId ? '—' : 'Nouvelle room')}</span>
          {#if editingCode}<span class="m2-code">{editingCode}</span>{/if}
        </div>
      </div>
      <button class="m2-close" onclick={() => roomModalOpen = false}>✕</button>
    </div>

    <div class="m2-body">
      <div class="m2-col">
        <span class="m2-col-label">Infos</span>
        <label class="m2-label">Nom de la room</label>
        <input type="text" class="m2-input" bind:value={roomName} placeholder="Ma super room" maxlength="60" style="margin-bottom:12px">
        <label class="m2-label">Description <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--dim)">(optionnel)</span></label>
        <textarea class="m2-textarea" bind:value={roomDesc} placeholder="Un petit mot pour décrire la room..." maxlength="200" rows="2"></textarea>

        <span class="m2-col-label" style="margin-top:4px">Paramètres</span>
        <div class="m2-params-row">
          <div class="m2-param">
            <div class="m2-num">{roomMaxRounds}</div>
            <label class="m2-label">Manches</label>
            <input type="number" class="m2-input" bind:value={roomMaxRounds} min="3" max="50">
          </div>
          <div class="m2-param">
            <div class="m2-num">{roomDuration}<span class="m2-unit">s</span></div>
            <label class="m2-label">Durée/manche</label>
            <input type="number" class="m2-input" bind:value={roomDuration} min="10" max="60">
          </div>
          <div class="m2-param">
            <div class="m2-num">{roomBreak}<span class="m2-unit">s</span></div>
            <label class="m2-label">Pause</label>
            <input type="number" class="m2-input" bind:value={roomBreak} min="3" max="15">
          </div>
        </div>

        <span class="m2-col-label">Mode de jeu</span>
        <div class="m2-modes">
          <button class="m2-mode" class:active={roomGameMode === 'classic'} onclick={() => roomGameMode = 'classic'} type="button">
            <span class="m2-mode-name">⌨ Classique</span>
            <span class="m2-mode-sub">Saisie libre · Classement ELO</span>
          </button>
          <button class="m2-mode" class:active={roomGameMode === 'qcm'} onclick={() => roomGameMode = 'qcm'} type="button">
            <span class="m2-mode-name">🎯 QCM</span>
            <span class="m2-mode-sub">Choix multiple · Pas d'ELO</span>
          </button>
        </div>

        <div class="m2-check-row">
          <input type="checkbox" id="m2-public" bind:checked={roomPublic} style="width:13px;height:13px;accent-color:var(--accent);cursor:pointer;flex-shrink:0">
          <label for="m2-public" class="m2-check-label">Room publique (visible dans le browse)</label>
        </div>
        <div class="m2-check-row">
          <input type="checkbox" id="m2-auto" bind:checked={roomAutoStart} style="width:13px;height:13px;accent-color:var(--accent);cursor:pointer;flex-shrink:0;margin-top:2px">
          <div>
            <label for="m2-auto" class="m2-check-label">Lancement automatique</label>
            <div style="font-size:.68rem;color:var(--dim);margin-top:2px">
              {#if roomAutoStart}Démarre dès qu'un joueur rejoint (5 s).{:else}Lancement manuel par l'administrateur.{/if}
            </div>
          </div>
        </div>
      </div>

      <div class="m2-col m2-col-pl">
        <span class="m2-col-label">
          Playlists
          {#if roomPlaylistIds.length > 0}<span style="color:var(--accent)"> · {roomPlaylistIds.length} · {totalTrackCount} titres</span>{/if}
        </span>
        <input type="search" class="m2-input" bind:value={plSearch} placeholder="🔍 Rechercher une playlist..." style="margin-bottom:8px">
        <div class="m2-pl-list">
          {#if filteredPlaylists.length === 0}
            <div style="padding:10px 14px;font-size:.8rem;color:var(--dim)">Aucune playlist trouvée.</div>
          {:else}
            {#each filteredPlaylists as pl (pl.id)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_interactive_supports_focus -->
              <div
                role="option"
                aria-selected={roomPlaylistIds.includes(pl.id)}
                class="m2-pl-row"
                class:sel={roomPlaylistIds.includes(pl.id)}
                onclick={() => togglePlaylist(pl)}
              >
                <div class="m2-pl-ck" class:on={roomPlaylistIds.includes(pl.id)}>{roomPlaylistIds.includes(pl.id) ? '✓' : ''}</div>
                <span style="flex:1;font-size:.8rem">{pl.emoji} {pl.name}</span>
                {#if pl.group !== 'Mes playlists'}<span class="m2-pl-grp">{pl.group}</span>{/if}
                <span class="m2-pl-cnt">{pl.track_count ?? 0} titres</span>
              </div>
            {/each}
          {/if}
        </div>
        <p class="m2-note">Au moins 3 titres requis. <a href="/playlists" style="color:var(--accent)">Gérer mes playlists</a></p>
        {#if !editingRoomId}
          <div class="m2-info-box">
            <span>💡</span>
            <div>Room <strong style="color:var(--text)">permanente</strong>. Pour une partie rapide, <a href="/playlists" style="color:var(--accent)">lance une room éphémère</a>.</div>
          </div>
        {/if}
      </div>
    </div>

    {#if roomError}<div class="m2-alert">{roomError}</div>{/if}
    <div class="m2-footer">
      <button class="btn-ghost" onclick={() => roomModalOpen = false}>Annuler</button>
      <button class="btn-accent" onclick={saveRoom} disabled={roomSaving} style="margin:0">
        {roomSaving ? '...' : editingRoomId ? 'Enregistrer →' : 'Créer →'}
      </button>
    </div>
  </div>
</div>
{/if}

<!-- Delete modal -->
{#if deleteModalOpen}
<div class="overlay" onclick={e => { if (e.target === e.currentTarget) { deleteModalOpen = false; deletingRoomId = null; } }}>
  <div class="modal modal-sm" style="text-align:center">
    <h2>Supprimer la room ?</h2>
    <p class="mdesc">Cette action est irréversible.</p>
    <div class="modal-footer" style="justify-content:center">
      <button class="btn-ghost" onclick={() => { deleteModalOpen = false; deletingRoomId = null; }}>Annuler</button>
      <button class="btn-danger" onclick={confirmDelete} disabled={deleteLoading}>Supprimer</button>
    </div>
  </div>
</div>
{/if}

<Toast />

<style>
  /* ── Page layout ── */
  .rooms-page { width: 100%; padding-top: var(--nav-h); padding-bottom: 96px; }
  .rp-inner {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 clamp(16px, 3vw, 40px);
  }

  /* ── Head ── */
  .rp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 clamp(16px, 3vw, 40px);
    min-height: 80px;
    border-bottom: 2px solid rgba(255,255,255,0.07);
    gap: 20px;
  }
  .rp-head h1 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 3rem;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    line-height: 0.9;
    margin: 0;
  }
  .rp-sub {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.65rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.22);
    margin-top: 4px;
  }
  .rp-btn-create { flex-shrink: 0; }

  /* ── Toolbar tabs + search ── */
  .rp-toolbar {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    padding: 0 clamp(16px, 3vw, 40px);
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .rp-tabs { display: flex; }
  .rp-tab {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
    padding: 0 24px 0 0;
    height: 54px;
    display: flex;
    align-items: center;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    margin-bottom: -1px;
    transition: color 0.15s, border-color 0.15s;
  }
  .rp-tab.on { color: #fafafa; border-bottom-color: #ff00ff; }
  .rp-search-wrap { display: flex; align-items: center; gap: 8px; }
  .rp-search-icon { color: rgba(255,255,255,0.25); font-size: 1.1rem; line-height: 1; }
  .rp-search {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.82rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: none;
    border: none;
    border-bottom: 1px solid rgba(255,255,255,0.14);
    color: #fafafa;
    padding: 8px 0;
    outline: none;
    width: 240px;
  }
  .rp-search::placeholder { color: rgba(255,255,255,0.22); }

  /* ── Chips filtres ── */
  .rp-chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding: 14px clamp(16px, 3vw, 40px);
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .chip {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.74rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 7px 16px;
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 0;
    background: none;
    color: rgba(255,255,255,0.35);
    cursor: pointer;
    transition: all 0.15s;
  }
  .chip:hover { border-color: rgba(255,255,255,0.35); color: rgba(255,255,255,0.7); }
  .chip.on { border-color: #ff00ff; color: #ff00ff; background: rgba(255,0,255,0.05); }
  .chip-reset { color: #f87171; border-color: rgba(248,113,113,0.25); }

  /* ── Patchwork pleine largeur ── */
  .patchwork {
    display: grid;
    grid-template-columns: 2fr 1.4fr 1fr 1fr;
    grid-template-rows: 280px 220px 220px;
    gap: 5px;
    background: #303030;
    width: 100%;
  }
  .pw-a { grid-column: 1;   grid-row: 1 / 3; }
  .pw-b { grid-column: 2;   grid-row: 1; }
  .pw-c { grid-column: 3/5; grid-row: 1; }
  .pw-d { grid-column: 2/4; grid-row: 2; }
  .pw-e { grid-column: 4;   grid-row: 2; }
  .pw-f { grid-column: 1/3; grid-row: 3; }
  .pw-g { grid-column: 3;   grid-row: 3; }
  .pw-h { grid-column: 4;   grid-row: 3; }

  .pw-room {
    position: relative;
    overflow: hidden;
    cursor: pointer;
    background: #0a0a0a;
    outline: 2px solid rgba(255,255,255,0.14);
    outline-offset: -2px;
    transition: outline-color 0.18s, filter 0.22s;
    z-index: 1;
  }
  .pw-empty { background: #0a0a0a; opacity: 0.4; }

  .patchwork:has(.pw-room:hover) .pw-room:not(:hover) { filter: brightness(0.45) saturate(0.6); }
  .pw-room:hover {
    outline: 2px solid #ff00ff;
    outline-offset: -2px;
    z-index: 15;
    filter: brightness(1.06);
  }
  .pw-room:hover .covers-grid { transform: scale(1.03); }
  .pw-room.is-live::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0; width: 4px;
    background: #ff00ff; z-index: 20;
    box-shadow: 0 0 12px rgba(255,0,255,0.5);
  }

  .covers-grid {
    position: absolute; inset: 0;
    display: grid;
    transition: transform 0.35s;
  }
  .cg-3x3 { grid-template-columns: repeat(3,1fr); grid-template-rows: repeat(3,1fr); }
  .cg-2x2 { grid-template-columns: repeat(2,1fr); grid-template-rows: repeat(2,1fr); }
  .cg-3x2 { grid-template-columns: repeat(3,1fr); grid-template-rows: repeat(2,1fr); }
  .cg-4x2 { grid-template-columns: repeat(4,1fr); grid-template-rows: repeat(2,1fr); }
  .cg-5x2 { grid-template-columns: repeat(5,1fr); grid-template-rows: repeat(2,1fr); }
  .covers-grid img { width: 100%; height: 100%; object-fit: cover; display: block; background: #111; }
  .cover-fallback { width: 100%; height: 100%; }

  .pw-cover-empty {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.35s;
  }
  .pw-room:hover .pw-cover-empty { transform: scale(1.03); }

  .pw-dim { position: absolute; inset: 0; background: rgba(0,0,0,0.18); pointer-events: none; z-index: 4; }
  .pw-grad {
    position: absolute; inset: 0; pointer-events: none; z-index: 5;
    background: linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.88) 22%, rgba(0,0,0,0.5) 42%, rgba(0,0,0,0.08) 62%, rgba(0,0,0,0) 80%);
  }
  .pw-info {
    position: absolute; inset: 0; z-index: 10;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 14px 16px;
    pointer-events: none;
    transition: opacity 0.18s ease;
  }
  .pw-top { display: flex; gap: 7px; flex-wrap: wrap; align-items: flex-start; }
  .pw-bottom { display: flex; flex-direction: column; gap: 6px; }

  .pw-live-tag {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 0.64rem; letter-spacing: 0.2em; text-transform: uppercase;
    background: #ff00ff; color: #000;
    padding: 4px 12px;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .ldot { width: 7px; height: 7px; border-radius: 50%; background: #000; display: inline-block; flex-shrink: 0; }

  .pw-badge {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 0.64rem; letter-spacing: 0.2em; text-transform: uppercase;
    border: 1px solid; padding: 3px 10px;
  }
  .pw-badge-official { color: #ff00ff; border-color: rgba(255,0,255,0.55); background: rgba(0,0,0,0.7); }
  .pw-badge-qcm { color: #4ade80; border-color: rgba(74,222,128,0.55); background: rgba(0,0,0,0.7); }
  .pw-badge-classic { color: rgba(255,255,255,0.4); border-color: rgba(255,255,255,0.18); background: rgba(0,0,0,0.7); }
  .pw-badge-live { color: #ff00ff; border-color: rgba(255,0,255,0.5); background: rgba(0,0,0,0.7); }
  .pw-badge-auto { color: #fbbf24; border-color: rgba(251,191,36,0.45); background: rgba(0,0,0,0.7); }

  .pw-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; text-transform: uppercase; line-height: 0.92; letter-spacing: -0.01em;
    text-shadow: 0 2px 16px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,1);
    color: #fff;
  }
  .pw-name.pw-a { font-size: clamp(1.9rem, 3.2vw, 2.6rem); }
  .pw-name.pw-b { font-size: clamp(1.2rem, 2vw, 1.6rem); }
  .pw-name.pw-c,.pw-name.pw-d,.pw-name.pw-e,.pw-name.pw-f,.pw-name.pw-g,.pw-name.pw-h { font-size: clamp(1rem, 1.8vw, 1.45rem); }

  .pw-owner { font-size: 0.68rem; color: rgba(255,255,255,0.45); margin-top: 1px; text-shadow: 0 1px 6px rgba(0,0,0,1); }
  .pw-tags { display: flex; gap: 6px; flex-wrap: wrap; }

  .pw-meta {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 0.58rem; letter-spacing: 0.1em; text-transform: uppercase;
    color: rgba(255,255,255,0.42);
    display: flex; gap: 10px;
    text-shadow: 0 1px 5px rgba(0,0,0,1);
  }
  .pw-b .pw-meta,.pw-c .pw-meta,.pw-d .pw-meta,.pw-e .pw-meta,.pw-f .pw-meta,.pw-g .pw-meta,.pw-h .pw-meta { display: none; }

  .pw-footer {
    display: flex; align-items: center; justify-content: space-between;
    gap: 10px; margin-top: 4px; pointer-events: all;
  }
  .pw-code {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; letter-spacing: 0.22em;
    text-shadow: 0 2px 10px rgba(0,0,0,1);
  }
  .pw-code.pw-a { font-size: 1.4rem; color: #ff00ff; }
  .pw-code.pw-b,.pw-code.pw-c,.pw-code.pw-d,.pw-code.pw-e,.pw-code.pw-f,.pw-code.pw-g,.pw-code.pw-h { font-size: 0.88rem; color: rgba(255,255,255,0.3); }

  .btn-join {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 0.82rem; letter-spacing: 0.16em; text-transform: uppercase;
    color: #000; background: #ff00ff; border: none;
    padding: 13px 28px; cursor: pointer; white-space: nowrap; transition: background 0.15s;
  }
  .btn-join:hover { background: #cc00cc; }
  .btn-dispo {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 0.74rem; letter-spacing: 0.14em; text-transform: uppercase;
    color: #fafafa; background: rgba(255,255,255,0.09); border: 1px solid rgba(255,255,255,0.22);
    padding: 11px 22px; cursor: pointer; white-space: nowrap; transition: all 0.15s;
  }
  .btn-dispo:hover { background: rgba(255,255,255,0.16); border-color: rgba(255,255,255,0.4); }

  /* ── Hover overlay ── */
  .pw-hover {
    position: absolute; inset: 0; z-index: 25;
    background: rgba(4,4,4,0.95);
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 16px;
    opacity: 0;
    transition: opacity 0.18s ease;
    pointer-events: none;
    overflow: hidden;
    gap: 0;
  }
  .pw-room:hover .pw-hover { opacity: 1; pointer-events: all; }
  .pw-room:hover .pw-info  { opacity: 0; }

  /* Tête : nom + sous-ligne */
  .pwh-head { display: flex; flex-direction: column; gap: 5px; }

  .pwh-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; text-transform: uppercase;
    font-size: clamp(1.15rem, 2.2vw, 1.9rem);
    line-height: 0.92; letter-spacing: -0.01em;
    color: #fff;
  }
  .pwh-sub {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 0.62rem; letter-spacing: 0.14em; text-transform: uppercase;
    color: rgba(255,255,255,0.32);
    display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
  }
  .pwh-dot { color: rgba(255,255,255,0.15); }
  .pwh-tcount {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 0.78rem;
    color: #ff00ff;
  }
  .pwh-titres {
    font-size: 0.62rem; color: rgba(255,255,255,0.32);
    font-family: inherit; font-weight: 400; letter-spacing: 0.04em; text-transform: none;
  }

  /* Setlist playlists */
  .pwh-setlist {
    flex: 1;
    display: flex; flex-direction: column;
    border-top: 1px solid rgba(255,255,255,0.08);
    margin-top: 12px;
    padding-top: 10px;
    gap: 0;
    overflow: hidden;
  }
  .pwh-setrow {
    display: flex; align-items: baseline; gap: 8px;
    padding: 5px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .pwh-setrow:last-child { border-bottom: none; }
  .pwh-setn {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 0.75rem; letter-spacing: 0.04em; text-transform: uppercase;
    color: rgba(255,255,255,0.72);
    flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .pwh-setc {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 0.58rem; letter-spacing: 0.1em;
    color: rgba(255,255,255,0.22);
    white-space: nowrap; flex-shrink: 0;
  }
  .pwh-setmore {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 0.6rem; letter-spacing: 0.12em; text-transform: uppercase;
    color: rgba(255,255,255,0.22);
    padding-top: 6px;
  }

  /* Pied : badges + bouton */
  .pwh-foot {
    display: flex; align-items: center; gap: 8px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.08);
    margin-top: 12px;
  }
  .pwh-badges { display: flex; gap: 6px; align-items: center; flex: 1; flex-wrap: wrap; }

  .pwh-btn {
    flex-shrink: 0;
    font-size: 0.72rem; letter-spacing: 0.16em; padding: 10px 18px;
    white-space: nowrap;
  }

  /* ── Slots 220px : compact ── */
  .pw-d .pw-hover, .pw-f .pw-hover { padding: 12px 14px; }
  .pw-d .pwh-setlist, .pw-f .pwh-setlist { margin-top: 8px; padding-top: 8px; }
  .pw-d .pwh-foot, .pw-f .pwh-foot { padding-top: 8px; margin-top: 8px; }
  .pw-d .pwh-setrow, .pw-f .pwh-setrow { padding: 3px 0; }
  .pw-d .pwh-name, .pw-f .pwh-name { font-size: clamp(1rem, 1.8vw, 1.4rem); }

  /* pw-f large : setlist en 2 colonnes */
  .pw-f .pwh-setlist { display: grid; grid-template-columns: 1fr 1fr; column-gap: 16px; }
  .pw-f .pwh-setrow { border-bottom: none; }

  /* Slots ultra-petits 1fr × 220px : on cache la setlist */
  .pw-e .pw-hover, .pw-g .pw-hover, .pw-h .pw-hover { padding: 10px 12px; }
  .pw-e .pwh-setlist, .pw-g .pwh-setlist, .pw-h .pwh-setlist { display: none; }
  .pw-e .pwh-foot, .pw-g .pwh-foot, .pw-h .pwh-foot { flex-direction: column; align-items: flex-start; padding-top: 0; border-top: none; margin-top: auto; }
  .pw-e .pwh-name, .pw-g .pwh-name, .pw-h .pwh-name { font-size: clamp(0.9rem, 1.5vw, 1.15rem); }
  .pw-e .pwh-btn, .pw-g .pwh-btn, .pw-h .pwh-btn { width: 100%; text-align: center; padding: 8px; font-size: 0.68rem; }

  /* ── Fin de liste / LoadMore ── */
  .rp-end {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase;
    color: rgba(255,255,255,0.18);
    text-align: center;
    padding: 32px 0 48px;
    border-top: 1px solid rgba(255,255,255,0.06);
    margin-top: 5px;
  }
  .rp-loadmore { padding: 32px 0 48px; display: flex; justify-content: center; }
  /* ── Mes rooms : setlist + panel ── */
  .mine-empty {
    padding: 60px clamp(16px,3vw,40px);
    display: flex; flex-direction: column; align-items: center; gap: 20px;
    color: rgba(255,255,255,.3); font-size: .88rem; text-align: center;
  }

  .mine-wrap {
    display: flex; flex-direction: row;
    height: 450px;
    border-top: 1px solid rgba(255,255,255,.08);
  }

  /* ── Panel détail (droite desktop) ── */
  .mine-panel {
    flex: 1; order: 2;
    position: relative; overflow: hidden; min-width: 0;
  }
  .mine-fan { position: absolute; inset: 0; overflow: hidden; }
  .mine-cov { position: absolute; display: block; object-fit: cover; }
  .mine-g1 {
    position: absolute; inset: 0; z-index: 10;
    background: linear-gradient(to top,
      rgba(0,0,0,1) 0%, rgba(0,0,0,.95) 18%, rgba(0,0,0,.7) 35%,
      rgba(0,0,0,.1) 55%, rgba(0,0,0,0) 72%);
  }
  .mine-g2 {
    position: absolute; inset: 0; z-index: 10;
    background: linear-gradient(to right,
      rgba(0,0,0,.88) 0%, rgba(0,0,0,.45) 28%, rgba(0,0,0,0) 52%);
  }
  .mine-livebar {
    position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    background: #ff00ff; z-index: 20; box-shadow: 0 0 16px rgba(255,0,255,.7);
  }
  .mine-pcontent {
    position: relative; z-index: 15;
    display: flex; flex-direction: column; justify-content: space-between;
    height: 100%; padding: 22px clamp(16px,3vw,30px);
  }
  .mine-ptop { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-start; }
  .mine-pname {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: clamp(1.9rem, 4.5vw, 3.4rem);
    text-transform: uppercase; letter-spacing: -.02em; line-height: .88;
    color: #fff; text-shadow: 0 4px 24px rgba(0,0,0,1);
  }
  .mine-pmeta {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: .64rem; letter-spacing: .12em; text-transform: uppercase;
    color: rgba(255,255,255,.35); margin-top: 10px;
    display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
  }
  .mine-pdot { color: rgba(255,255,255,.14); }
  .mine-ptc { color: #ff00ff; font-size: .8rem; font-weight: 900; }
  .mine-pactions { display: flex; gap: 8px; margin-top: 18px; flex-wrap: wrap; }
  .mine-pjoin {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: .76rem; letter-spacing: .16em; text-transform: uppercase;
    background: #ff00ff; color: #000; border: none; padding: 12px 28px; cursor: pointer;
    transition: background .15s;
  }
  .mine-pjoin:hover { background: #cc00cc; }
  .mine-pedit-btn {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: .68rem; letter-spacing: .14em; text-transform: uppercase;
    background: none; border: 1px solid rgba(255,255,255,.18); color: rgba(255,255,255,.4);
    padding: 11px 20px; cursor: pointer; transition: all .15s;
  }
  .mine-pedit-btn:hover { border-color: rgba(255,255,255,.5); color: #fff; }
  .mine-pdel-btn {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: .68rem; letter-spacing: .14em; text-transform: uppercase;
    background: none; border: 1px solid rgba(248,113,113,.2); color: #f87171;
    padding: 11px 20px; cursor: pointer; transition: all .15s; margin-left: auto;
  }
  .mine-pdel-btn:hover { background: rgba(248,113,113,.08); border-color: rgba(248,113,113,.4); }

  /* ── Index tickets (gauche desktop) ── */
  .mine-idx {
    width: 280px; flex-shrink: 0; order: 1;
    display: flex; flex-direction: column;
    border-right: 1px solid rgba(255,255,255,.14);
  }
  .mine-idx-head {
    padding: 13px 16px 11px;
    border-bottom: 1px solid rgba(255,255,255,.08);
    display: flex; align-items: baseline; justify-content: space-between;
    background: #0a0a0a; flex-shrink: 0;
  }
  .mine-idx-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: .52rem; letter-spacing: .3em; text-transform: uppercase;
    color: rgba(255,0,255,.5);
  }
  .mine-idx-count {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: .5rem; letter-spacing: .1em;
    color: rgba(255,255,255,.18);
  }
  .mine-list {
    flex: 1; overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,0,255,.22) transparent;
  }
  .mine-list::-webkit-scrollbar { width: 3px; }
  .mine-list::-webkit-scrollbar-track { background: transparent; }
  .mine-list::-webkit-scrollbar-thumb { background: rgba(255,0,255,.28); }
  .mine-list::-webkit-scrollbar-thumb:hover { background: rgba(255,0,255,.55); }

  /* Ticket */
  .mine-ticket {
    display: flex; align-items: stretch;
    width: 100%; text-align: left; background: none; border: none;
    border-bottom: 1px solid rgba(255,255,255,.07);
    cursor: pointer; transition: background .12s; position: relative;
  }
  .mine-ticket:hover { background: rgba(255,255,255,.02); }
  .mine-ticket.active { background: rgba(255,0,255,.04); }
  .mine-ticket.active::after {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
    background: #ff00ff;
  }

  /* Perforation */
  .mine-perf {
    width: 18px; flex-shrink: 0;
    display: flex; flex-direction: column; align-items: center;
  }
  .mine-punch {
    width: 14px; height: 8px; flex-shrink: 0;
    background: #050505; border: 1px solid rgba(255,255,255,.12); z-index: 2;
  }
  .mine-punch-t { border-radius: 0 0 8px 8px; border-top: none; margin-top: -1px; }
  .mine-punch-b { border-radius: 8px 8px 0 0; border-bottom: none; margin-bottom: -1px; }
  .mine-pline { flex: 1; border-left: 1px dashed rgba(255,255,255,.14); }

  /* Stub */
  .mine-stub {
    width: 52px; flex-shrink: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px; background: #0a0a0a;
    border-right: 1px solid rgba(255,255,255,.07);
  }
  .mine-snum {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 1.22rem; letter-spacing: .04em;
    color: rgba(255,255,255,.16); transition: color .12s;
  }
  .mine-ticket.active .mine-snum { color: #ff00ff; }
  .mine-slabel {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: .36rem; letter-spacing: .2em; text-transform: uppercase;
    color: rgba(255,255,255,.1);
  }
  .mine-ticket.active .mine-slabel { color: rgba(255,0,255,.3); }

  /* Corps ticket */
  .mine-tbody {
    flex: 1; padding: 12px 12px 12px 10px;
    display: flex; flex-direction: column; justify-content: center; gap: 4px;
    min-width: 0;
  }
  .mine-tname {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 1.18rem; text-transform: uppercase; letter-spacing: -.01em;
    color: rgba(255,255,255,.3);
    display: flex; align-items: center; gap: 7px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mine-ticket.active .mine-tname { color: #fff; }
  .mine-ldot {
    width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    background: #ff00ff; box-shadow: 0 0 8px rgba(255,0,255,.9);
  }
  .mine-tmeta {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: .55rem; letter-spacing: .1em; text-transform: uppercase;
    color: rgba(255,255,255,.16);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mine-ticket.active .mine-tmeta { color: rgba(255,255,255,.36); }
  .mine-tc { color: rgba(255,0,255,.45); }
  .mine-ticket.active .mine-tc { color: #ff00ff; }

  /* Bouton créer */
  .mine-add-btn {
    display: flex; align-items: stretch;
    width: 100%; text-align: left; background: none; border: none;
    border-top: 1px solid rgba(255,255,255,.08);
    cursor: pointer; transition: background .12s; flex-shrink: 0;
  }
  .mine-add-btn:hover { background: rgba(255,0,255,.03); }
  .mine-add-stub {
    background: #0a0a0a; border-right: 1px solid rgba(255,255,255,.07);
  }
  .mine-add-plus {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 1.1rem; color: rgba(255,0,255,.25);
    transition: color .12s;
  }
  .mine-add-btn:hover .mine-add-plus { color: #ff00ff; }
  .mine-add-body { padding: 12px 12px 12px 10px; }
  .mine-add-txt {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: .58rem; letter-spacing: .18em; text-transform: uppercase;
    color: rgba(255,0,255,.28);
  }
  .mine-add-btn:hover .mine-add-txt { color: rgba(255,0,255,.65); }

  /* ── States ── */
  .pl-loading { padding: 48px 16px; text-align: center; color: var(--dim); font-size: 0.88rem; }
  /* ── Modales ── */
  .overlay {
    position: fixed; inset: 0; z-index: 400;
    background: rgba(0,0,0,0.7);
    display: flex; align-items: center; justify-content: center;
    padding: 16px; overflow-y: auto;
  }
  .modal {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 28px; width: 100%; max-width: 520px;
    position: relative;
  }
  .modal-sm { max-width: 380px; }
  .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); }

  /* ── Modal M2 ── */
  .modal-m2 {
    background: #0a0a0a; border: 1px solid rgba(255,255,255,0.14);
    width: 100%; max-width: 840px; position: relative;
    max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;
  }
  .m2-bar {
    padding: 14px 20px; border-bottom: 2px solid rgba(255,0,255,0.18);
    display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; gap: 12px;
  }
  .m2-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 0.55rem; letter-spacing: 0.28em; text-transform: uppercase;
    color: rgba(255,255,255,0.22); margin-bottom: 3px;
  }
  .m2-room-id { display: flex; align-items: baseline; gap: 10px; }
  .m2-room-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 1.25rem; text-transform: uppercase; color: var(--text);
  }
  .m2-code {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 0.7rem; letter-spacing: 0.22em; color: #ff00ff;
  }
  .m2-close {
    background: none; border: none; color: rgba(255,255,255,0.28);
    cursor: pointer; font-size: 0.95rem; padding: 4px 8px; flex-shrink: 0;
  }
  .m2-body {
    display: grid; grid-template-columns: 1fr 1fr;
    overflow-y: auto; flex: 1; min-height: 0;
  }
  .m2-col { padding: 16px 18px; overflow-y: auto; }
  .m2-col:first-child { border-right: 1px solid rgba(255,255,255,0.07); }
  .m2-col-pl { }
  .m2-col-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 0.54rem; letter-spacing: 0.28em; text-transform: uppercase;
    color: rgba(255,0,255,.5); display: block; margin-bottom: 11px;
  }
  .m2-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 0.54rem; letter-spacing: 0.18em; text-transform: uppercase;
    color: rgba(255,255,255,0.25); display: block; margin-bottom: 4px;
  }
  .m2-input {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
    padding: 8px 10px; color: var(--text); font-family: inherit; font-size: 0.82rem;
    outline: none; width: 100%;
  }
  .m2-input:focus { border-color: rgba(255,0,255,0.4); }
  .m2-textarea {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
    padding: 8px 10px; color: var(--text); font-family: inherit; font-size: 0.82rem;
    outline: none; width: 100%; resize: vertical; min-height: 54px; line-height: 1.5;
    margin-bottom: 12px;
  }
  .m2-textarea:focus { border-color: rgba(255,0,255,0.4); }
  .m2-params-row {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    border: 1px solid rgba(255,255,255,0.07); margin-bottom: 14px;
  }
  .m2-param { padding: 9px 10px; border-right: 1px solid rgba(255,255,255,0.07); }
  .m2-param:last-child { border-right: none; }
  .m2-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 1.5rem; line-height: 1; color: var(--text);
    padding-bottom: 4px; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .m2-unit { font-size: 0.72rem; color: rgba(255,255,255,0.22); }
  .m2-param .m2-input { padding: 5px 8px; font-size: 0.76rem; margin-top: 5px; }
  .m2-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 14px; }
  .m2-mode {
    padding: 9px 10px; border: 1px solid rgba(255,255,255,0.09); cursor: pointer;
    background: none; text-align: left; display: flex; flex-direction: column; gap: 2px;
    transition: border-color 0.12s, background 0.12s;
  }
  .m2-mode.active { border-color: rgba(255,0,255,0.45); background: rgba(255,0,255,0.04); }
  .m2-mode-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900; font-size: 0.74rem; letter-spacing: 0.06em; text-transform: uppercase;
    color: rgba(255,255,255,0.4);
  }
  .m2-mode.active .m2-mode-name { color: #ff00ff; }
  .m2-mode-sub { font-size: 0.64rem; color: rgba(255,255,255,0.2); }
  .m2-check-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
  .m2-check-label { font-size: 0.77rem; color: rgba(255,255,255,0.45); cursor: pointer; }
  .m2-pl-list {
    height: 220px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.07);
    margin-bottom: 8px; scrollbar-width: thin;
  }
  .m2-pl-row {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; cursor: pointer; transition: background 0.1s;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .m2-pl-row:last-child { border-bottom: none; }
  .m2-pl-row:hover { background: rgba(255,255,255,0.04); }
  .m2-pl-row.sel { background: rgba(255,0,255,0.04); }
  .m2-pl-ck {
    width: 13px; height: 13px; border: 1px solid rgba(255,255,255,0.12); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 0.54rem; color: #ff00ff;
  }
  .m2-pl-ck.on { background: rgba(255,0,255,0.1); border-color: rgba(255,0,255,0.5); }
  .m2-pl-grp { font-size: 0.64rem; color: rgba(255,255,255,0.2); white-space: nowrap; }
  .m2-pl-cnt { font-size: 0.64rem; color: rgba(255,255,255,0.22); white-space: nowrap; }
  .m2-note { font-size: 0.68rem; color: rgba(255,255,255,0.2); margin-bottom: 0; }
  .m2-info-box {
    display: flex; gap: 8px; background: rgba(255,0,255,.04); border: 1px solid rgba(255,0,255,.14);
    padding: 10px 12px; font-size: 0.74rem; color: rgba(255,255,255,0.38); line-height: 1.5;
    margin-top: 10px;
  }
  .m2-alert {
    background: rgba(248,113,113,.07); border-top: 1px solid rgba(248,113,113,.2);
    color: #f87171; padding: 10px 20px; font-size: .8rem; flex-shrink: 0;
  }
  .m2-footer {
    padding: 12px 20px; border-top: 1px solid rgba(255,255,255,0.07);
    display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0;
  }

  @media (max-width: 640px) {
    .m2-body { grid-template-columns: 1fr; }
    .m2-col:first-child { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.07); }
  }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .rp-head { padding: 0 16px; min-height: 60px; }
    .rp-head h1 { font-size: 2rem; }
    .rp-toolbar { padding: 0 16px; flex-wrap: wrap; }
    .rp-search { width: 160px; }
    .rp-chips { padding: 10px 16px; gap: 6px; }
    .chip { font-size: 0.68rem; padding: 6px 12px; }

    .patchwork { display: flex; flex-direction: column; gap: 0; background: transparent; }
    .pw-a,.pw-b,.pw-c,.pw-d,.pw-e,.pw-f,.pw-g,.pw-h { grid-column: unset; grid-row: unset; }
    .pw-room {
      display: flex; flex-direction: row;
      min-height: 100px; height: auto;
      outline: none;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .covers-grid {
      position: relative !important; inset: unset !important;
      flex-shrink: 0; width: 110px !important; height: 110px !important;
      transform: none !important; align-self: stretch;
    }
    .pw-grad, .pw-dim { display: none; }
    .pw-info {
      position: relative !important; inset: unset !important;
      flex: 1; padding: 10px 14px;
      background: var(--bg, #080808);
      pointer-events: all;
    }
    .pw-room.is-live::before { width: 3px; }
    .patchwork:has(.pw-room:hover) .pw-room:not(:hover) { filter: none; }
    .pw-room:hover { filter: none; }
    .pw-empty { display: none; }
  }

  @media (max-width: 700px) {
    .mine-wrap { flex-direction: column; height: auto; }
    .mine-panel { order: 1; height: 240px; width: 100%; }
    .mine-idx { order: 2; width: 100%; border-right: none; border-top: 1px solid rgba(255,255,255,.14); }
    .mine-list { max-height: 300px; }
    .mine-g2 { background: linear-gradient(to right, rgba(0,0,0,.7) 0%, rgba(0,0,0,0) 40%); }
    .mine-pname { font-size: clamp(1.7rem, 5.5vw, 2.6rem); }
    .mine-pactions { gap: 6px; }
    .mine-pjoin { padding: 10px 20px; font-size: .7rem; }
    .mine-pedit-btn, .mine-pdel-btn { padding: 9px 14px; font-size: .62rem; }
    .mine-pdel-btn { margin-left: 0; }
  }

  @media (max-width: 600px) {
    .modal { padding: 20px 16px; }
  }
</style>

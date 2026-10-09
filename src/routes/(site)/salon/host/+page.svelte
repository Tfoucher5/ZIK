<script>
  import { onMount, onDestroy } from 'svelte';
  import { io } from 'socket.io-client';
  import HostCenter from './HostCenter.svelte';
  import PlayerSidebar from './PlayerSidebar.svelte';
  import PlaylistModal from '$lib/components/salon/PlaylistModal.svelte';
  import SalonHelp from '$lib/components/salon/SalonHelp.svelte';
  import SupportBanner from '$lib/components/salon/SupportBanner.svelte';
  import { createSupabaseClient } from '$lib/supabase.js';
  import { loadSalonPlaylists } from '$lib/salonPlaylists.js';
  import { takeSalonKeyFromUrl, patchSalonPlaylists } from '$lib/salonClient.js';

  let { data } = $props();
  const sb = createSupabaseClient(data.env.supabaseUrl, data.env.supabaseAnonKey);

  let code = $state('');
  let key = null;
  // L'écran TV n'existe qu'avec la clé du salon : personne d'autre ne l'ouvre
  let joined = $state(false);
  let pro = $state(false);
  let socket;

  // Changement de playlist en cours de salon
  let allPlaylists   = $state([]);
  let pickerOpen     = $state(false);
  let pickerIds      = $state([]);
  let savingPlaylist = $state(false);
  let pickerError    = $state('');
  let playlistNotice = $state('');
  let canChangePlaylists = $state(false);

  // Game state
  let phase         = $state('lobby');
  let players       = $state([]);
  let round         = $state(0);
  let total         = $state(10);
  let timerVal      = $state(0);
  let timerMax      = $state(30);
  let timerStarted  = $state(false);
  let roundEnd      = $state(null);
  let gameOver      = $state(null);
  let teams         = $state(null);
  let paused        = $state(false);
  let settings      = $state({});
  let choices       = $state(null);
  let error         = $state('');
  let autoNextSec   = $state(0);
  let autoNextTimer = null;
  let volume        = $state(100);
  let helpOpen      = $state(false);
  let support       = $state(null);
  let userId        = $state(null);

  // La TV reste souvent sans personne devant : le message s'efface tout seul
  $effect(() => {
    if (!support) return;
    const id = setTimeout(() => (support = null), 90_000);
    return () => clearTimeout(id);
  });

  /** @type {HostCenter} */
  let hostCenter;

  let timerLevel = $derived(!timerMax || timerVal / timerMax >= 0.4 ? '' : timerVal / timerMax >= 0.2 ? 'warn' : 'danger');
  let deltas = $derived(Object.fromEntries((roundEnd?.scores ?? []).map(s => [s.username, s.delta])));

  function qrUrl(size = 200) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent('https://www.zik-music.fr/salon/play?code=' + code)}&bgcolor=ffffff&color=000000`;
  }

  function applyVolume(v) {
    volume = v;
    localStorage.setItem('zik_salon_vol', String(v));
    hostCenter?.setVolume(v);
  }

  function startAutoNextCountdown(s) {
    autoNextSec = s; clearAutoNext();
    autoNextTimer = setInterval(() => { if (--autoNextSec <= 0) clearAutoNext(); }, 1000);
  }
  function clearAutoNext() { clearInterval(autoNextTimer); autoNextTimer = null; autoNextSec = 0; }
  function startGame()   { socket?.emit('salon_start'); phase = 'starting'; }
  function nextRound()   { socket?.emit('salon_next_round'); clearAutoNext(); }
  function restartGame() { socket?.emit('salon_restart'); }
  function togglePause() { socket?.emit(paused ? 'salon_resume' : 'salon_pause'); }

  // Garde les indicateurs de la manche (A/T) quand la liste est renvoyée
  function mergeRoster(list) {
    const old = Object.fromEntries(players.map(p => [p.username, p]));
    players = list.map(p => ({ ...old[p.username], ...p })).sort((a, b) => b.score - a.score);
  }

  function openPicker() {
    pickerError = '';
    pickerIds = [...(settings.playlistIds || [])];
    pickerOpen = true;
  }

  async function savePlaylists() {
    if (pickerIds.length === 0) { pickerError = 'Sélectionne au moins une playlist.'; return; }
    savingPlaylist = true;
    pickerError = '';
    try {
      await patchSalonPlaylists(sb, code, pickerIds);
      pickerOpen = false;
    } catch (e) {
      pickerError = e.message;
    } finally {
      savingPlaylist = false;
    }
  }

  function connectSocket(roomCode) {
    socket = io({ transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000, reconnectionDelayMax: 5000 });

    socket.on('connect', () => socket.emit('salon_join_host', { code: roomCode, key }));

    socket.on('salon_host_joined', (data) => {
      joined   = true;
      pro      = data.pro;
      settings = data.settings || {};
      players  = data.players || [];
      teams    = data.teams;
      paused   = data.paused;
      phase    = data.phase || 'lobby';
      round    = data.currentRound || 0;
      total    = settings.maxRounds || 10;
      if (data.support) support = data.support;
    });

    socket.on('salon_support', (m) => { support = m; });
    socket.on('salon_pro', ({ pro: p }) => { pro = p; });

    socket.on('salon_roster', ({ players: p, teams: t }) => { mergeRoster(p); teams = t; });
    socket.on('salon_settings', ({ settings: s }) => { settings = s; total = s.maxRounds; });
    socket.on('salon_volume', ({ volume: v }) => applyVolume(v));
    socket.on('salon_paused', ({ paused: p }) => {
      paused = p;
      if (p) hostCenter?.pauseVideo();
      else hostCenter?.resumeVideo();
      if (p) clearAutoNext();
    });

    socket.on('salon_scores_update', ({ scores, teams: t }) => {
      if (t) teams = t;
      players = players.map(pl => {
        const s = scores.find(s => s.username === pl.username);
        return s ? { ...pl, score: s.score } : pl;
      }).sort((a, b) => b.score - a.score);
    });

    socket.on('salon_game_starting', () => { phase = 'starting'; });

    socket.on('salon_next_video', ({ videoId, startSeconds }) => hostCenter?.preloadVideo(videoId, startSeconds));

    socket.on('salon_round_start', (data) => {
      phase    = 'round';
      round    = data.round;
      total    = data.total;
      roundEnd = null;
      timerVal = 0;
      timerStarted = false;
      choices  = data.choices || null;
      clearAutoNext();
      players = players.map(p => ({
        ...p,
        foundThisRound: false, answeredThisRound: false,
        foundArtist: false, foundTitle: false,
        foundFeatCount: 0, totalFeatCount: data.featCount || 0,
      }));
      hostCenter?.loadVideo(data.videoId, data.startSeconds);
    });

    socket.on('salon_timer_started', ({ max }) => { timerVal = max; timerMax = max; timerStarted = true; });
    socket.on('salon_timer_update', ({ current, max }) => { timerVal = current; timerMax = max; timerStarted = true; });

    socket.on('salon_player_answered', ({ username, correct, answered, foundArtist, foundTitle, foundFeatCount, totalFeatCount }) => {
      players = players.map(p =>
        p.username === username
          ? {
              ...p,
              // QCM deferred: `answered` = clicked (no correct/wrong yet)
              // Free mode: `correct` = fully found
              answeredThisRound: answered === true ? true : (p.answeredThisRound || false),
              foundThisRound: correct !== undefined && correct !== null ? correct : p.foundThisRound,
              foundArtist: foundArtist ?? p.foundArtist,
              foundTitle: foundTitle ?? p.foundTitle,
              foundFeatCount: foundFeatCount ?? p.foundFeatCount ?? 0,
              totalFeatCount: totalFeatCount ?? p.totalFeatCount ?? 0,
            }
          : p
      );
    });

    socket.on('salon_round_end', (data) => {
      phase    = 'summary';
      choices  = null;
      roundEnd = data;
      teams    = data.teams;
      setTimeout(() => hostCenter?.revealVideo(), 200);
      if (data.scores) {
        const m = Object.fromEntries(data.scores.map(s => [s.username, s.score]));
        players = players.map(p => ({ ...p, score: m[p.username] ?? p.score })).sort((a, b) => b.score - a.score);
      }
      if (!settings.manualNext) startAutoNextCountdown(settings.showAnswerDuration || 7);
    });

    socket.on('salon_game_over', (data) => {
      phase = 'gameover'; gameOver = data; teams = data.teams; clearAutoNext();
    });

    socket.on('salon_restarted', ({ players: p }) => {
      mergeRoster(p); roundEnd = null; gameOver = null; clearAutoNext();
    });

    socket.on('salon_playlists_changed', ({ playlistIds, trackCount, appliedNow, remainingRounds }) => {
      settings = { ...settings, playlistIds };
      playlistNotice = appliedNow
        ? `Nouvelle sélection (${trackCount} titres) : elle démarre dès la manche suivante, ${remainingRounds} restante${remainingRounds > 1 ? 's' : ''}.`
        : `Nouvelle sélection (${trackCount} titres) : elle s'appliquera à la prochaine partie.`;
      setTimeout(() => { playlistNotice = ''; }, 8000);
    });

    socket.on('salon_error', ({ message }) => { error = message; });
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    code = params.get('code')?.toUpperCase() || '';
    if (!code) { window.location.href = '/salon'; return; }
    key = takeSalonKeyFromUrl(code);
    const savedVol = parseInt(localStorage.getItem('zik_salon_vol') ?? '100');
    volume = Number.isNaN(savedVol) ? 100 : savedVol;
    hostCenter?.setVolume(volume);
    connectSocket(code);

    const { data: { session } } = await sb.auth.getSession();
    userId = session?.user.id ?? null;
    if (session?.user || key) {
      canChangePlaylists = true;
      try {
        allPlaylists = await loadSalonPlaylists(sb, session?.user.id ?? null);
      } catch {
        canChangePlaylists = false;
      }
    }
  });

  onDestroy(() => {
    socket?.disconnect();
    clearAutoNext();
  });
</script>

<svelte:head>
  <title>ZIK Salon - Hôte {code}</title>
  <meta name="robots" content="noindex, nofollow">
</svelte:head>

{#if !joined && error}
  <main class="sh-locked">
    <p class="sx-kicker"><b>●</b> ZIK Salon</p>
    <h1>Écran réservé<br>à l'hôte.</h1>
    <p>{error} Pour rejoindre la partie, va sur <b>zik-music.fr/salon/play</b> et entre le code affiché sur la TV.</p>
    <a class="sx-btn sx-btn-primary" href="/salon/play?code={code}">Rejoindre comme joueur</a>
  </main>
{:else}
<div class="sh">
  <header class="sh-top">
    <a class="sh-brand" href="/" title="Retour au site">ZIK <span>Salon</span></a>
    <div class="sh-join">
      <img src={qrUrl(100)} alt="" width="44" height="44">
      <div>
        <div class="sh-join-url">zik-music.fr/salon/play</div>
        <div class="sh-join-code">{code}</div>
      </div>
    </div>
    <div class="sh-top-right">
      {#if phase === 'round' || phase === 'summary'}
        <span class="sh-round">Manche <b>{round} / {total}</b></span>
        {#if phase === 'summary' && !paused && (settings.manualNext || autoNextSec > 0)}
          {#if !settings.manualNext}<span class="sh-round">Suite dans <b>{autoNextSec} s</b></span>{/if}
          <button class="sx-btn sh-regie-btn" onclick={nextRound}>{settings.manualNext ? 'Manche suivante' : 'Maintenant'}</button>
        {/if}
        <button class="sh-icon-btn" onclick={togglePause} title={paused ? 'Reprendre' : 'Pause'} aria-label={paused ? 'Reprendre' : 'Pause'}>{paused ? '▶' : '❚❚'}</button>
      {/if}
      <div class="sh-vol">
        <button
          class="sh-icon-btn"
          aria-label={volume === 0 ? 'Réactiver le son' : 'Couper le son'}
          onclick={() => applyVolume(volume === 0 ? 100 : 0)}
        >{volume === 0 ? '🔇' : '🔊'}</button>
        <input
          type="range" min="0" max="100" step="5"
          value={volume}
          aria-label="Volume"
          oninput={(e) => applyVolume(parseInt(e.target.value))}
        />
      </div>
      {#if canChangePlaylists && phase !== 'starting'}
        <button class="sh-icon-btn" title="Changer de playlist" aria-label="Changer de playlist" onclick={openPicker}>♫</button>
      {/if}
      <button class="sh-icon-btn" title="Besoin d'aide ou un problème à signaler" aria-label="Besoin d'aide" onclick={() => (helpOpen = true)}>?</button>
      <a class="sx-btn sh-regie-btn" href="/salon/regie?code={code}" target="_blank" rel="noopener" title="Piloter la soirée depuis un autre écran">Régie</a>
    </div>
  </header>

  <div class="sh-progress {timerLevel}">
    {#if phase === 'round'}<i style="width:{timerMax ? (timerVal / timerMax) * 100 : 0}%"></i>{/if}
  </div>

  <div class="sh-body">
    <HostCenter
      bind:this={hostCenter}
      {phase} {code} {timerVal} {timerMax} {timerStarted}
      {players} {teams} {roundEnd} {gameOver}
      {paused} {pro}
      {round} {total}
      {choices}
      answerMode={settings.answerMode || 'free'}
      onRestart={restartGame}
      {settings}
      onSetting={(patch) => socket?.emit('salon_update_settings', patch)}
      onChangePlaylists={canChangePlaylists ? openPicker : null}
      onNewSalon={() => window.location.href = '/salon'}
      onMusicReady={() => socket?.emit('salon_music_ready')}
    />
    <PlayerSidebar {players} {teams} {phase} {deltas} answerMode={settings.answerMode || 'free'} />
  </div>

  {#if phase === 'lobby'}
    <footer class="sh-foot">
      <button class="sx-btn sx-btn-primary sx-btn-lg" onclick={startGame} disabled={players.length === 0}>
        {players.length === 0 ? 'En attente de joueurs' : 'Lancer la partie'}
      </button>
    </footer>
  {/if}
</div>

{/if}

{#if joined && (playlistNotice || error)}
  <p class="sh-toast" class:err={!!error} role="status">{error || playlistNotice}</p>
{/if}

{#if support}<SupportBanner message={support.message} onClose={() => (support = null)} />{/if}

<SalonHelp
  bind:open={helpOpen}
  {code}
  role="host"
  {pro}
  reporterId={userId}
  getState={() => ({
    connected: socket?.connected ?? false,
    error: error || null,
    phase, paused, round, maxRounds: total,
    players: players.length,
    offline: players.filter((p) => p.offline).length,
    timer: phase === 'round' ? timerVal : null,
    timerStarted,
    volume,
    settings: { answerMode: settings.answerMode, roundDuration: settings.roundDuration, manualNext: settings.manualNext },
  })}
/>

{#if pickerOpen}
  <PlaylistModal
    playlists={allPlaylists}
    bind:selectedIds={pickerIds}
    live={phase === 'round' || phase === 'summary'}
    remaining={Math.max(0, total - round)}
    saving={savingPlaylist}
    error={pickerError}
    onSave={savePlaylists}
    onClose={() => (pickerOpen = false)}
  />
{/if}


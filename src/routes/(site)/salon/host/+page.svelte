<script>
  import { onMount, onDestroy } from 'svelte';
  import { io } from 'socket.io-client';
  import HostCenter from './HostCenter.svelte';
  import PlayerSidebar from './PlayerSidebar.svelte';
  import PlaylistPicker from '$lib/components/salon/PlaylistPicker.svelte';
  import { createSupabaseClient } from '$lib/supabase.js';
  import { loadSalonPlaylists } from '$lib/salonPlaylists.js';

  let { data } = $props();
  const sb = createSupabaseClient(data.env.supabaseUrl, data.env.supabaseAnonKey);

  let code = $state('');
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
  let roundEnd      = $state(null);
  let finalScores   = $state([]);
  let settings      = $state({});
  let choices       = $state(null);
  let error         = $state('');
  let autoNextSec   = $state(0);
  let autoNextTimer = null;
  let currentPhrase = $state('');
  let volume        = $state(100);

  /** @type {HostCenter} */
  let hostCenter;

  const phrases = [
    'Écoutez bien… 👂', 'Vous le sentez ce titre ? 🎵', 'Chaud devant ! 🔥',
    'Qui sera le premier ? 🏆', 'Concentrez-vous ! 🧠', 'La pression monte… ⏰',
    "Un indice : c'est de la musique 😅", 'Même les pros suent là… 💦',
    'Ça commence à chauffer ! 🌡️', 'Tournée des grands ducs 👑',
    'Le premier qui trouve gagne tout ! 🎯', "C'est maintenant ou jamais… ⚡",
    "Vos oreilles valent de l'or 🪙", 'Top niveau ce soir ! 🎶',
    'Ça sent la victoire ! 🏅',
  ];

  function pickPhrase() {
    currentPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  }

  function timerPct()   { return timerMax ? Math.max(0, (timerVal / timerMax) * 100) : 100; }
  function timerColor() { const p = timerPct(); return p > 60 ? '#4ade80' : p > 30 ? '#fbbf24' : '#f87171'; }

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
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error('Session expirée, reconnecte-toi sur ce navigateur.');
      const res = await fetch('/api/salon', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ code, playlistIds: pickerIds }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Changement impossible');
      pickerOpen = false;
    } catch (e) {
      pickerError = e.message;
    } finally {
      savingPlaylist = false;
    }
  }

  function connectSocket(roomCode) {
    socket = io({ transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000, reconnectionDelayMax: 5000 });

    socket.on('connect', () => socket.emit('salon_join_host', { code: roomCode }));

    socket.on('salon_host_joined', (data) => {
      settings = data.settings || {};
      players  = data.players || [];
      phase    = data.phase || 'lobby';
      round    = data.currentRound || 0;
      total    = settings.maxRounds || 10;
    });

    socket.on('salon_player_joined', ({ players: p }) => { players = p; });
    socket.on('salon_player_left',   ({ players: p }) => { players = p; });

    socket.on('salon_scores_update', ({ scores }) => {
      players = players.map(pl => {
        const s = scores.find(s => s.username === pl.username);
        return s ? { ...pl, score: s.score } : pl;
      }).sort((a, b) => b.score - a.score);
    });

    socket.on('salon_game_starting', () => { phase = 'starting'; });

    socket.on('salon_round_start', (data) => {
      phase    = 'round';
      round    = data.round;
      total    = data.total;
      roundEnd = null;
      timerVal = 0;
      choices  = data.choices || null;
      clearAutoNext();
      pickPhrase();
      players = players.map(p => ({
        ...p,
        foundThisRound: false, answeredThisRound: false,
        foundArtist: false, foundTitle: false,
        foundFeatCount: 0, totalFeatCount: data.featCount || 0,
      }));
      hostCenter?.loadVideo(data.videoId, data.startSeconds);
    });

    socket.on('salon_timer_started', ({ max }) => { timerVal = max; timerMax = max; });
    socket.on('salon_timer_update', ({ current, max }) => { timerVal = current; timerMax = max; });

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
      setTimeout(() => hostCenter?.revealVideo(), 200);
      if (data.scores) {
        const m = Object.fromEntries(data.scores.map(s => [s.username, s.score]));
        players = players.map(p => ({ ...p, score: m[p.username] ?? p.score })).sort((a, b) => b.score - a.score);
      }
      if (!settings.manualNext) startAutoNextCountdown(settings.showAnswerDuration || 7);
    });

    socket.on('salon_game_over', ({ scores }) => {
      phase = 'gameover'; finalScores = scores; clearAutoNext();
    });

    socket.on('salon_restarted', ({ players: p }) => {
      players = p; roundEnd = null; finalScores = []; clearAutoNext();
    });

    socket.on('salon_playlists_changed', ({ playlistIds, trackCount }) => {
      settings = { ...settings, playlistIds };
      playlistNotice = `Playlists mises à jour : ${trackCount} titres disponibles.`;
      setTimeout(() => { playlistNotice = ''; }, 6000);
    });

    socket.on('salon_error', ({ message }) => { error = message; });
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    code = params.get('code')?.toUpperCase() || '';
    if (!code) { window.location.href = '/salon'; return; }
    const savedVol = parseInt(localStorage.getItem('zik_salon_vol') ?? '100');
    volume = Number.isNaN(savedVol) ? 100 : savedVol;
    hostCenter?.setVolume(volume);
    connectSocket(code);

    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      canChangePlaylists = true;
      try {
        allPlaylists = await loadSalonPlaylists(sb, session.user.id);
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
  <title>ZIK Salon — Hôte {code}</title>
  <meta name="robots" content="noindex, nofollow">
</svelte:head>

<div class="salon-blob b1"></div>
<div class="salon-blob b2"></div>

<div class="salon-host">

  <!-- Header -->
  <header class="salon-host-header">
    <a class="salon-host-home" href="/" title="Retour à l'accueil du site" aria-label="Retour à l'accueil du site">⌂</a>
    <div class="salon-host-brand">ZIK <span>Salon</span></div>
    <div class="salon-host-code">
      <img class="salon-host-qr-sm" src={qrUrl(100)} alt="QR" width="46" height="46">
      <div>
        <div class="salon-code-label">Rejoindre</div>
        <div class="salon-code-chars">
          {#each code.split('') as ch, i (i)}<b>{ch}</b>{/each}
        </div>
      </div>
    </div>
    <div class="salon-host-url-full">
      zik-music.fr/salon/play<br><span>→ entre le code sur ton tel</span>
    </div>
    <div class="salon-host-header-right">
      {#if phase === 'round' || phase === 'summary'}
        <div class="salon-host-round">Manche <b>{round} / {total}</b></div>
      {/if}
      <div class="salon-host-vol" title="Volume de la musique">
        <button
          class="salon-host-vol-btn"
          aria-label={volume === 0 ? 'Réactiver le son' : 'Couper le son'}
          onclick={() => applyVolume(volume === 0 ? 100 : 0)}
        >{volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}</button>
        <input
          class="salon-host-vol-range"
          type="range" min="0" max="100" step="5"
          value={volume}
          aria-label="Volume"
          oninput={(e) => applyVolume(parseInt(e.target.value))}
          style="--vol:{volume}%"
        />
      </div>
      <div class="salon-host-players-pill">
        <i></i>{players.length} joueur{players.length !== 1 ? 's' : ''}
      </div>
    </div>
  </header>

  <!-- Timer bar -->
  <div class="salon-timer-bar {phase === 'round' ? 'active' : ''}">
    <div class="salon-timer-fill" style="width:{timerPct()}%;background:{timerColor()}"></div>
  </div>

  <!-- Body -->
  <div class="salon-host-body">

    <HostCenter
      bind:this={hostCenter}
      {phase} {code} {timerVal} {timerMax}
      {currentPhrase}
      {players} {roundEnd} {finalScores}
      {round} {total}
      {choices}
      answerMode={settings.answerMode || 'free'}
      onRestart={restartGame}
      onChangePlaylists={canChangePlaylists ? openPicker : null}
      onNewSalon={() => window.location.href = '/salon'}
      onMusicReady={() => socket?.emit('salon_music_ready')}
    />

    <PlayerSidebar
      players={phase === 'gameover'
        ? players.filter(p => !finalScores.slice(0, 3).some(s => s.username === p.username))
        : players}
      {phase}
      answerMode={settings.answerMode || 'free'}
    />

  </div>

  <!-- Footer -->
  <footer class="salon-host-footer">
    {#if phase === 'lobby'}
      <button class="btn-salon-start" onclick={startGame} disabled={players.length === 0}>
        {players.length === 0 ? 'En attente de joueurs…' : '▶ Lancer la partie'}
      </button>
    {:else if phase === 'summary'}
      {#if settings.manualNext}
        <button class="btn-salon-next" onclick={nextRound}>Manche suivante →</button>
      {:else if autoNextSec > 0}
        <div class="salon-auto-next">
          Manche suivante dans <strong>{autoNextSec}s</strong>…
          <button class="btn-salon-next" onclick={nextRound} style="margin-left:12px">Maintenant →</button>
        </div>
      {/if}
    {/if}
    {#if playlistNotice}
      <p style="color:var(--accent);font-size:.9rem;text-align:center">{playlistNotice}</p>
    {/if}
    {#if error}
      <p style="color:var(--danger);font-size:.9rem;text-align:center">{error}</p>
    {/if}
  </footer>

</div>

{#if pickerOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="salon-picker-backdrop" onclick={() => (pickerOpen = false)}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="salon-picker-modal" onclick={(e) => e.stopPropagation()}>
      <h2>Changer de playlist</h2>
      <p class="salon-picker-sub">
        La sélection s'appliquera à la prochaine partie. Les scores actuels ne sont pas touchés.
      </p>

      <PlaylistPicker playlists={allPlaylists} bind:selectedIds={pickerIds} />

      {#if pickerError}
        <p style="color:var(--danger);font-size:.85rem;margin-top:10px">{pickerError}</p>
      {/if}

      <div class="salon-picker-actions">
        <button class="btn-salon-next" onclick={() => (pickerOpen = false)}>Annuler</button>
        <button class="btn-salon-start" onclick={savePlaylists} disabled={savingPlaylist || pickerIds.length === 0}>
          {savingPlaylist ? 'Chargement…' : 'Valider'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .salon-picker-backdrop {
    position: fixed;
    inset: 0;
    background: var(--overlay);
    backdrop-filter: blur(6px);
    display: grid;
    place-items: center;
    z-index: 60;
    padding: 20px;
  }
  .salon-picker-modal {
    background: var(--modal-bg);
    border: 1px solid var(--border2);
    border-radius: 18px;
    padding: 24px;
    width: min(560px, 100%);
    max-height: 80vh;
    overflow-y: auto;
  }
  .salon-picker-modal h2 {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.4rem;
    font-weight: 800;
    margin-bottom: 6px;
  }
  .salon-picker-sub {
    font-size: 0.85rem;
    color: var(--mid);
    margin-bottom: 18px;
    line-height: 1.6;
  }
  .salon-picker-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
  }
</style>

<script>
  import { onMount, onDestroy } from 'svelte';
  import { io } from 'socket.io-client';
  import PlaylistModal from '$lib/components/salon/PlaylistModal.svelte';
  import ProUpsell from '$lib/components/salon/ProUpsell.svelte';
  import RegieHeader from '$lib/components/salon/RegieHeader.svelte';
  import RegieTabs from '$lib/components/salon/RegieTabs.svelte';
  import RegieActions from '$lib/components/salon/RegieActions.svelte';
  import TabDirect from '$lib/components/salon/TabDirect.svelte';
  import TabPlayers from '$lib/components/salon/TabPlayers.svelte';
  import TabSettings from '$lib/components/salon/TabSettings.svelte';
  import { FREE_MAX_PLAYERS } from '$lib/proPlans.js';
  import { createSupabaseClient } from '$lib/supabase.js';
  import { loadSalonPlaylists } from '$lib/salonPlaylists.js';
  import { takeSalonKeyFromUrl, patchSalonPlaylists } from '$lib/salonClient.js';

  let { data } = $props();
  const sb = createSupabaseClient(data.env.supabaseUrl, data.env.supabaseAnonKey);

  const PHASES = { lobby: 'En attente', starting: 'Lancement', round: 'Manche en cours', summary: 'Réponse affichée', gameover: 'Partie terminée' };

  let code     = $state('');
  let key      = $state('');
  let socket;
  let error    = $state('');
  let ready    = $state(false);

  let phase    = $state('lobby');
  let paused   = $state(false);
  let round    = $state(0);
  let settings = $state({});
  let players  = $state([]);
  let teams    = $state(null);
  let timerVal = $state(0);
  let timerMax = $state(30);
  let timerOn  = $state(false);
  let track    = $state(null);
  let history  = $state([]);
  let volume   = $state(100);
  let notice   = $state('');
  let confirmKick = $state(null);
  let pro      = $state(false);
  let upsell   = $state(null);
  // null tant que le serveur n'a pas répondu : on n'alarme pas à tort.
  let screens  = $state(null);
  let onglet   = $state('direct');

  let allPlaylists = $state([]);
  let pickerIds    = $state([]);
  let pickerOpen   = $state(false);
  let saving       = $state(false);

  let idle = $derived(phase === 'lobby' || phase === 'gameover');
  let live = $derived(phase === 'round' || phase === 'summary');
  let step = $derived(settings.answerMode === 'multiple' ? 100 : 1);
  let answered = $derived(players.filter(p => p.answeredThisRound || p.foundThisRound).length);
  let origin = $derived(typeof window === 'undefined' ? '' : window.location.origin);
  // L'écran TV demande la clé : ce lien est privé, comme celui de la régie
  let tvUrl = $derived(`${origin}/salon/host?code=${code}&key=${key}`);
  let regieUrl = $derived(`${origin}/salon/regie?code=${code}&key=${key}`);

  const send = (ev, payload) => socket?.emit(ev, payload);
  // Fonction Pro : en gratuit, on montre l'offre au lieu d'envoyer
  const gate = (feature, fn) => (pro ? fn() : (upsell = feature));
  const setSetting = (patch) =>
    idle || pro ? send('salon_update_settings', patch) : (upsell = 'liveSettings');

  function flash(msg) {
    notice = msg;
    setTimeout(() => { if (notice === msg) notice = ''; }, 4000);
  }

  async function copy(text, what) {
    try { await navigator.clipboard.writeText(text); flash(`${what} copié.`); } catch { flash('Copie impossible.'); }
  }

  function mergeRoster(list) {
    const old = Object.fromEntries(players.map(p => [p.username, p]));
    players = list.map(p => ({ ...old[p.username], ...p })).sort((a, b) => b.score - a.score);
  }

  function kick(username) {
    if (confirmKick !== username) { confirmKick = username; return; }
    send('salon_kick', { username });
    confirmKick = null;
  }

  function setVolume(v) {
    if (!pro) { upsell = 'volume'; return; }
    volume = v;
    send('salon_volume', { volume: v });
  }

  async function savePlaylists() {
    saving = true;
    try {
      const d = await patchSalonPlaylists(sb, code, pickerIds);
      pickerOpen = false;
      flash(`Nouvelle sélection : ${d.trackCount} titres.`);
    } catch (e) {
      flash(e.message);
    } finally {
      saving = false;
    }
  }

  function connect() {
    socket = io({ transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity });
    socket.on('connect', () => send('salon_join_control', { code, key }));

    socket.on('salon_control_joined', (d) => {
      ready = true;
      pro = d.pro;
      error = '';
      settings = d.settings;
      mergeRoster(d.players);
      teams = d.teams;
      phase = d.phase;
      paused = d.paused;
      round = d.currentRound;
      timerVal = d.timerVal;
      timerMax = d.timerMax;
      timerOn = d.timerActive;
      track = d.track;
      history = d.history;
      pickerIds = [...(d.settings.playlistIds || [])];
    });

    socket.on('salon_roster', ({ players: p, teams: t }) => { mergeRoster(p); teams = t; });
    socket.on('salon_settings', ({ settings: s }) => { settings = s; });
    socket.on('salon_paused', ({ paused: p }) => { paused = p; });
    socket.on('salon_game_starting', () => { phase = 'starting'; history = []; });
    socket.on('salon_round_start', (d) => {
      phase = 'round';
      round = d.round;
      track = d.hostInfo;
      timerOn = false;
      timerVal = 0;
      players = players.map(p => ({ ...p, foundThisRound: false, answeredThisRound: false }));
    });
    socket.on('salon_timer_started', ({ max }) => { timerVal = max; timerMax = max; timerOn = true; });
    socket.on('salon_timer_update', ({ current, max }) => { timerVal = current; timerMax = max; timerOn = true; });
    socket.on('salon_player_answered', ({ username, correct, answered: a }) => {
      players = players.map(p => p.username === username
        ? { ...p, answeredThisRound: a === true || p.answeredThisRound, foundThisRound: correct ?? p.foundThisRound }
        : p);
    });
    socket.on('salon_scores_update', ({ scores, teams: t }) => {
      const m = Object.fromEntries(scores.map(s => [s.username, s.score]));
      players = players.map(p => ({ ...p, score: m[p.username] ?? p.score })).sort((a, b) => b.score - a.score);
      if (t) teams = t;
    });
    socket.on('salon_round_end', (d) => {
      phase = 'summary';
      timerOn = false;
      teams = d.teams;
      history = [...history, { answer: d.answer, cover: d.cover }];
      const m = Object.fromEntries(d.scores.map(s => [s.username, s.score]));
      players = players.map(p => ({ ...p, score: m[p.username] ?? p.score })).sort((a, b) => b.score - a.score);
    });
    socket.on('salon_game_over', (d) => { phase = 'gameover'; teams = d.teams; track = null; });
    socket.on('salon_restarted', ({ players: p }) => { mergeRoster(p); history = []; });
    socket.on('salon_playlists_changed', ({ trackCount, appliedNow }) =>
      flash(`Playlist changée (${trackCount} titres), ${appliedNow ? 'dès la manche suivante' : 'pour la prochaine partie'}.`));
    socket.on('salon_screens', ({ count }) => { screens = count; });
    socket.on('salon_pro_required', ({ feature }) => { upsell = feature; });
    socket.on('salon_error', ({ message }) => { error = message; });
  }

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    code = params.get('code')?.toUpperCase() || '';
    if (!code) { error = 'Code de salon manquant.'; return; }
    key = takeSalonKeyFromUrl(code) || '';
    if (!key) { error = "Ce navigateur n'a pas la clé de ce salon. Ouvre le lien de régie donné à la création du salon."; return; }
    connect();
    const { data: { session } } = await sb.auth.getSession();
    allPlaylists = await loadSalonPlaylists(sb, session?.user.id ?? null).catch(() => []);
  });

  onDestroy(() => socket?.disconnect());
</script>

<svelte:head>
  <title>Régie {code} - ZIK Salon</title>
  <meta name="robots" content="noindex, nofollow">
</svelte:head>

<div class="rg">
  <RegieHeader
    {code} {phase} phaseLabel={PHASES[phase]} {paused} {round} maxRounds={settings.maxRounds ?? 0}
    {timerVal} {timerMax} {timerOn} {screens}
    joueurs={players.length} repondu={answered}
    {pro} maxGratuit={FREE_MAX_PLAYERS} {tvUrl} {regieUrl}
    onCopy={copy}
    onUpsell={(f) => (upsell = f)}
  />

  {#if error}
    <div class="rg-vide">
      <p class="rg-error">{error}</p>
      <a class="sx-btn" href="/salon">Revenir à la préparation</a>
    </div>
  {:else if !ready}
    <div class="rg-vide"><p class="rg-muted">Connexion au salon…</p></div>
  {:else}
    <RegieTabs actif={onglet} joueurs={players.length} onChange={(id) => (onglet = id)} />

    <div class="rg-corps">
      <div class="rg-zone">
        {#if onglet === 'direct'}
          <TabDirect
            {phase} {code} {track} answerMode={settings.answerMode}
            {volume} {pro} {history}
            onVolume={setVolume}
          />
        {:else if onglet === 'joueurs'}
          <TabPlayers
            {players} {teams} {phase} {code} {pro} {step} {confirmKick}
            onScore={(username, delta) => gate('score', () => send('salon_adjust_score', { username, delta }))}
            onSetScore={(username, score) => gate('score', () => send('salon_adjust_score', { username, score }))}
            onKick={kick}
            onTeam={(username, team) => send('salon_set_player_team', { username, team })}
          />
        {:else}
          <TabSettings
            {settings} {phase} {round} {pro}
            onSet={setSetting}
            onRenameTeam={(team, name) => send('salon_rename_team', { team, name })}
            onUpsell={(f) => (upsell = f)}
            onOpenPlaylists={() => { pickerIds = [...(settings.playlistIds || [])]; pickerOpen = true; }}
          />
        {/if}
      </div>
    </div>

    <RegieActions
      {phase} {paused} {pro} joueurs={players.length}
      onAction={(ev) => send(ev)}
      onGate={gate}
    />
  {/if}

  {#if notice}<p class="rg-notice" role="status">{notice}</p>{/if}

  {#if upsell}<ProUpsell feature={upsell} onClose={() => (upsell = null)} />{/if}

  {#if pickerOpen}
    <PlaylistModal
      playlists={allPlaylists}
      bind:selectedIds={pickerIds}
      {live}
      remaining={Math.max(0, (settings.maxRounds ?? 0) - round)}
      {saving}
      onSave={savePlaylists}
      onClose={() => (pickerOpen = false)}
    />
  {/if}
</div>

<style>
  /* Console fixe : l'en-tête et la barre d'actions ne bougent jamais, seule
     la zone d'onglet défile. Même ossature du téléphone au second écran. */
  .rg {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .rg-corps { flex: 1; min-height: 0; overflow-y: auto; }
  /* Sur un grand écran, la zone reste centrée plutôt qu'étirée : la console
     se lit comme compacte et non comme une page à moitié vide. */
  .rg-zone {
    max-width: 900px;
    margin: 0 auto;
    padding: 22px 18px 32px;
  }

  .rg-vide {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 40px 20px;
    text-align: center;
  }
  .rg-muted { color: var(--mid); font-size: 0.88rem; line-height: 1.5; }
  .rg-error { max-width: 460px; color: var(--danger); font-size: 0.95rem; line-height: 1.6; margin: 0; }

  .rg-notice {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(86px + env(safe-area-inset-bottom, 0px));
    z-index: 70;
    padding: 12px 16px;
    background: var(--text);
    color: var(--bg);
    border-radius: 3px;
    font-weight: 600;
    font-size: 0.86rem;
  }

  @media (max-width: 640px) {
    .rg-zone { padding: 18px 12px 28px; }
  }
</style>

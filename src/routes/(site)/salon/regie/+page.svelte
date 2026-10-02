<script>
  import { onMount, onDestroy } from 'svelte';
  import { io } from 'socket.io-client';
  import PlaylistModal from '$lib/components/salon/PlaylistModal.svelte';
  import ProUpsell from '$lib/components/salon/ProUpsell.svelte';
  import { FREE_MAX_PLAYERS, FREE_MAX_TEAMS } from '$lib/proPlans.js';
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
  <header class="rg-top">
    <span class="sh-brand">ZIK <span>Régie</span></span>
    <span class="rg-code">{code}</span>
    <span class="rg-status" class:live={phase === 'round' && !paused} class:paused>
      {paused ? 'En pause' : PHASES[phase]}{live ? ` · ${round} / ${settings.maxRounds}` : ''}
    </span>
    {#if ready && !pro}
      <button class="rg-free" onclick={() => (upsell = 'players')}>
        Version gratuite · {players.length} / {FREE_MAX_PLAYERS} joueurs · <b>Passer à ZIK Pro</b>
      </button>
    {/if}
    <div class="rg-top-right">
      <a class="sx-btn rg-sm" href={tvUrl} target="_blank" rel="noopener">Ouvrir l'écran TV</a>
      <button class="sx-btn rg-sm" onclick={() => copy(tvUrl, 'Lien de l’écran TV')} title="Lien privé : à ouvrir sur l'ordinateur branché à la TV">Copier le lien TV</button>
      <button class="sx-btn rg-sm" onclick={() => copy(regieUrl, 'Lien de régie')} title="À garder pour toi : il donne le contrôle du salon">Copier le lien régie</button>
    </div>
  </header>

  {#if error}
    <p class="rg-error">{error}</p>
  {:else if !ready}
    <p class="rg-muted">Connexion…</p>
  {:else}
    <main class="rg-grid">
      <!-- Direct -->
      <section class="rg-col">
        <h2 class="sx-kicker">Direct</h2>

        <div class="rg-now">
          {#if phase === 'round' || phase === 'summary'}
            <div class="rg-timer" class:dim={!timerOn}>{timerOn ? timerVal : '--'}<small>/ {timerMax} s</small></div>
            <p class="rg-muted">{answered} / {players.length} ont répondu</p>
          {:else}
            <div class="rg-timer dim">{players.length}<small>joueur{players.length > 1 ? 's' : ''}</small></div>
          {/if}
        </div>

        {#if track}
          <div class="rg-track">
            {#if track.cover}<img src={track.cover} alt="">{/if}
            <div>
              <p class="sx-kicker">{phase === 'round' ? 'Titre en cours (visible ici seulement)' : 'Dernier titre'}</p>
              <b>{track.artist} - {track.title}</b>
              {#if settings.answerMode === 'multiple' && track.correctChoiceIndex != null}
                <small>Bonne réponse : choix {track.correctChoiceIndex + 1}</small>
              {/if}
            </div>
          </div>
        {/if}

        <div class="rg-actions">
          {#if phase === 'lobby'}
            <button class="sx-btn sx-btn-primary sx-btn-lg" onclick={() => send('salon_start')} disabled={!players.length}>Lancer la partie</button>
          {:else if phase === 'gameover'}
            <button class="sx-btn sx-btn-primary sx-btn-lg" onclick={() => send('salon_restart')}>Rejouer</button>
          {:else if live}
            <button class="sx-btn sx-btn-primary" onclick={() => send(paused ? 'salon_resume' : 'salon_pause')}>{paused ? 'Reprendre' : 'Pause'}</button>
            {#if phase === 'round'}
              <button class="sx-btn" class:rg-locked={!pro} onclick={() => gate('reveal', () => send('salon_reveal'))}>Révéler maintenant{#if !pro}<i class="rg-pro">Pro</i>{/if}</button>
            {:else}
              <button class="sx-btn" onclick={() => send('salon_next_round')}>Manche suivante</button>
            {/if}
            <button class="sx-btn" onclick={() => send('salon_restart')} disabled={phase !== 'summary'}>Recommencer</button>
            <button class="sx-btn rg-danger" class:rg-locked={!pro} onclick={() => gate('endGame', () => send('salon_end_game'))}>Terminer la partie{#if !pro}<i class="rg-pro">Pro</i>{/if}</button>
          {/if}
        </div>

        {#if phase === 'lobby'}
          <ol class="rg-help">
            <li><b>Ouvre l'écran TV</b> sur l'ordinateur branché à la télé (bouton en haut, ou copie le lien TV). Un seul écran TV, sinon la musique joue deux fois.</li>
            <li><b>Les joueurs scannent le QR code</b> affiché sur la TV, ou vont sur zik-music.fr/salon/play avec le code <b>{code}</b>.</li>
            <li><b>Lance la partie</b> quand tout le monde apparaît dans la liste.</li>
          </ol>
          <p class="rg-muted">Les liens TV et régie sont privés : ils donnent le contrôle du salon. Ne les partage pas avec les joueurs.</p>
        {:else}
          <p class="rg-muted">Garde un seul écran TV ouvert, sinon la musique joue deux fois.</p>
        {/if}

        <label class="rg-field">
          <span>Volume de la TV <b>{volume} %</b>{#if !pro}<i class="rg-pro">Pro</i>{/if}</span>
          <input type="range" min="0" max="100" step="5" value={volume} oninput={(e) => setVolume(+e.target.value)}>
        </label>

        {#if history.length}
          <h3 class="sx-kicker rg-sub">Titres joués</h3>
          <ol class="rg-history">
            {#each [...history].reverse() as h, i (history.length - i)}
              <li><span>{String(history.length - i).padStart(2, '0')}</span>{h.answer}</li>
            {/each}
          </ol>
        {/if}
      </section>

      <!-- Joueurs -->
      <section class="rg-col">
        <h2 class="sx-kicker">Joueurs · {players.length}</h2>

        {#if teams}
          <ol class="rg-teams">
            {#each teams as t (t.id)}
              <li style="--tc:var(--q{t.id})"><b>{t.name}</b><span>{t.members.length} j.</span><span class="pts">{t.score}</span></li>
            {/each}
          </ol>
        {/if}

        {#if players.length === 0}
          <p class="rg-muted">Personne pour l'instant. Les joueurs rejoignent avec le code {code} sur zik-music.fr/salon/play.</p>
        {:else}
          <ul class="rg-players">
            {#each players as p (p.username)}
              <li class:off={p.offline} class:done={phase === 'round' && (p.foundThisRound || p.answeredThisRound)}>
                <span class="rg-pname">
                  {#if teams && p.team != null}<i style="--tc:var(--q{p.team})"></i>{/if}{p.username}
                  {#if p.offline}<small>déconnecté</small>{/if}
                </span>
                {#if teams}
                  <select value={p.team} disabled={!pro} title={pro ? '' : 'ZIK Pro'} onchange={(e) => send('salon_set_player_team', { username: p.username, team: +e.target.value })} aria-label="Équipe de {p.username}">
                    {#each teams as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
                  </select>
                {/if}
                <span class="rg-score">
                  <button onclick={() => gate('score', () => send('salon_adjust_score', { username: p.username, delta: -step }))} aria-label="Retirer {step} point">−</button>
                  <b>{p.score}</b>
                  <button onclick={() => gate('score', () => send('salon_adjust_score', { username: p.username, delta: step }))} aria-label="Ajouter {step} point">+</button>
                </span>
                <button class="rg-kick" class:confirm={confirmKick === p.username} onclick={() => kick(p.username)}>
                  {confirmKick === p.username ? 'Confirmer' : 'Exclure'}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      <!-- Réglages -->
      <section class="rg-col">
        <h2 class="sx-kicker">Réglages</h2>
        <p class="rg-muted">Appliqués tout de suite, à partir de la prochaine manche.</p>

        <div class="rg-field">
          <span>Manches</span>
          <div class="rg-seg">
            {#each [5, 10, 15, 20] as n (n)}
              <button class:on={settings.maxRounds === n} disabled={!idle && n < round} onclick={() => setSetting({ maxRounds: n })}>{n}</button>
            {/each}
          </div>
        </div>
        <div class="rg-field">
          <span>Temps pour répondre</span>
          <div class="rg-seg">
            {#each [15, 20, 30, 45, 60] as n (n)}
              <button class:on={settings.roundDuration === n} onclick={() => setSetting({ roundDuration: n })}>{n} s</button>
            {/each}
          </div>
        </div>
        <div class="rg-field">
          <span>Manche suivante</span>
          <div class="rg-seg">
            <button class:on={!settings.manualNext} onclick={() => setSetting({ manualNext: false })}>Automatique</button>
            <button class:on={settings.manualNext} onclick={() => setSetting({ manualNext: true })}>Quand je clique</button>
          </div>
        </div>
        {#if !settings.manualNext}
          <div class="rg-field">
            <span>Réponse affichée</span>
            <div class="rg-seg">
              {#each [5, 7, 10, 15] as n (n)}
                <button class:on={settings.showAnswerDuration === n} onclick={() => setSetting({ showAnswerDuration: n })}>{n} s</button>
              {/each}
            </div>
          </div>
        {/if}
        <div class="rg-field">
          <span>Réponses {#if !idle}<small>(entre deux parties)</small>{/if}</span>
          <div class="rg-seg">
            <button class:on={settings.answerMode === 'free'} disabled={!idle} onclick={() => setSetting({ answerMode: 'free' })}>Texte libre</button>
            <button class:on={settings.answerMode === 'multiple'} disabled={!idle} onclick={() => setSetting({ answerMode: 'multiple' })}>4 choix</button>
          </div>
        </div>
        <div class="rg-field">
          <span>Équipes {#if !idle}<small>(entre deux parties)</small>{/if}</span>
          <div class="rg-seg">
            {#each [0, 2, 3, 4, 6, 8] as n (n)}
              {@const locked = !pro && n > FREE_MAX_TEAMS}
              <button class:on={(settings.teams?.length ?? 0) === n} class:rg-seg-locked={locked} disabled={!idle}
                onclick={() => (locked ? (upsell = 'teams') : setSetting({ teamCount: n }))}>{n || 'Aucune'}</button>
            {/each}
          </div>
        </div>
        {#if settings.teams}
          <div class="rg-field">
            <span>Noms des équipes</span>
            <div class="rg-teamnames">
            {#each settings.teams as t (t.id)}
              <input class="rg-input" style="--tc:var(--q{t.id})" value={t.name} maxlength="24" readonly={!pro} onclick={() => { if (!pro) upsell = 'teamEdit'; }}
                onchange={(e) => send('salon_rename_team', { team: t.id, name: e.target.value })}>
            {/each}
            </div>
          </div>
        {/if}

        <div class="rg-field">
          <span>Playlists</span>
          <button class="sx-btn rg-sm" onclick={() => { pickerIds = [...(settings.playlistIds || [])]; pickerOpen = true; }}>Changer de playlist</button>
        </div>
      </section>
    </main>
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
  /* Tableau de bord fixe : seules les listes défilent, jamais la page */
  .rg { height: 100dvh; display: grid; grid-template-rows: auto 1fr; overflow: hidden; }
  .rg-top {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 12px 24px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .rg-code { font-family: var(--s-mono); font-weight: 600; letter-spacing: 0.2em; }
  .rg-status {
    padding: 4px 10px;
    border: 1px solid var(--border2);
    border-radius: 2px;
    font-family: var(--s-mono);
    font-size: 0.78rem;
  }
  .rg-status.live { border-color: var(--success); color: var(--success); }
  .rg-status.paused { border-color: var(--warn); color: var(--warn); }
  .rg-top-right { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
  .rg-sm { padding: 7px 12px; font-size: 0.82rem; }

  .rg-grid {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr);
  }
  .rg-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px 22px;
    border-right: 1px solid var(--border);
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }
  .rg-col:last-child { border-right: 0; }
  .rg-sub { margin-top: 8px; }
  .rg-muted { color: var(--mid); font-size: 0.88rem; line-height: 1.5; }
  .rg-error { margin: 40px auto; max-width: 520px; color: var(--danger); text-align: center; }

  .rg-timer {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 4rem;
    line-height: 0.9;
  }
  .rg-timer small { margin-left: 8px; font-family: var(--s-mono); font-size: 0.9rem; font-weight: 400; color: var(--mid); }
  .rg-timer.dim { color: var(--mid); }
  .rg-track {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 12px;
    border: 1px dashed var(--border2);
  }
  .rg-track img { width: 56px; height: 56px; object-fit: cover; border-radius: 2px; }
  .rg-track b { display: block; margin-top: 3px; }
  .rg-track small { color: var(--success); }
  .rg-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .rg-danger { border-color: var(--danger); color: var(--danger); }
  .rg-free {
    padding: 5px 10px;
    background: none;
    border: 1px dashed var(--accent);
    border-radius: 2px;
    color: var(--mid);
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .rg-free b { color: var(--accent); }
  .rg-help { display: flex; flex-direction: column; gap: 8px; padding-left: 18px; font-size: 0.85rem; color: var(--mid); line-height: 1.45; }
  .rg-help b { color: var(--text); }
  .rg-pro {
    margin-left: 8px;
    padding: 1px 5px;
    border-radius: 2px;
    background: var(--accent);
    color: var(--on-accent);
    font-family: var(--s-mono);
    font-size: 0.6rem;
    font-style: normal;
    letter-spacing: 0.05em;
    vertical-align: 2px;
  }
  .rg-locked { opacity: 0.75; }
  .rg-seg .rg-seg-locked:not(.on) { color: var(--dim); }
  .rg-seg .rg-seg-locked::after { content: ' ●'; color: var(--accent); font-size: 0.6rem; }

  .rg-field { display: flex; flex-direction: column; gap: 6px; font-size: 0.82rem; color: var(--mid); }
  .rg-field b { color: var(--text); font-family: var(--s-mono); }
  .rg-field small { color: var(--dim); }
  .rg-field input[type='range'] { accent-color: var(--accent); }
  .rg-seg { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--border2); border-radius: 3px; align-self: flex-start; }
  .rg-seg button {
    padding: 6px 10px;
    background: none;
    border: 0;
    border-right: 1px solid var(--border2);
    color: var(--text);
    font: inherit;
    font-family: var(--s-mono);
    font-size: 0.78rem;
    cursor: pointer;
  }
  .rg-seg button:last-child { border-right: 0; }
  .rg-seg button.on { background: var(--text); color: var(--bg); }
  .rg-seg button:disabled { opacity: 0.35; cursor: not-allowed; }
  .rg-teamnames { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .rg-input {
    min-width: 0;
    padding: 8px 10px;
    background: none;
    border: 1px solid var(--border2);
    border-left: 4px solid var(--tc);
    border-radius: 2px;
    color: var(--text);
    font: inherit;
  }

  .rg-history { flex: 1; min-height: 0; list-style: none; font-size: 0.85rem; overflow-y: auto; }
  .rg-history li { padding: 6px 0; border-bottom: 1px solid var(--border); }
  .rg-history span { margin-right: 10px; font-family: var(--s-mono); color: var(--dim); }

  .rg-teams { list-style: none; border-bottom: 2px solid var(--text); }
  .rg-teams li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 12px;
    padding: 8px 0 8px 12px;
    border-left: 5px solid var(--tc);
    border-bottom: 1px solid var(--border);
  }
  .rg-teams b { font-family: var(--s-cond); font-size: 1.1rem; text-transform: uppercase; }
  .rg-teams span { color: var(--mid); font-size: 0.85rem; }
  .rg-teams .pts { font-family: var(--s-mono); color: var(--text); }

  .rg-players { flex: 1; min-height: 0; list-style: none; overflow-y: auto; }
  .rg-players li {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    align-items: center;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid var(--border);
  }
  .rg-players li.done { background: rgb(74 222 128 / 0.08); }
  .rg-players li.off { opacity: 0.45; }
  .rg-pname { display: flex; align-items: center; gap: 8px; min-width: 0; font-weight: 600; overflow: hidden; }
  .rg-pname i { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--tc); }
  .rg-pname small { color: var(--mid); font-weight: 400; }
  .rg-players select {
    background: var(--bg);
    border: 1px solid var(--border2);
    color: var(--text);
    font: inherit;
    font-size: 0.82rem;
    padding: 4px;
  }
  .rg-score { display: inline-flex; align-items: center; gap: 6px; }
  .rg-score b { min-width: 42px; text-align: center; font-family: var(--s-mono); }
  .rg-score button, .rg-kick {
    background: none;
    border: 1px solid var(--border2);
    border-radius: 2px;
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }
  .rg-score button { width: 26px; height: 26px; }
  .rg-kick { padding: 4px 8px; font-size: 0.78rem; color: var(--mid); }
  .rg-kick.confirm { border-color: var(--danger); color: var(--danger); }

  .rg-notice {
    position: fixed;
    right: 20px;
    bottom: 20px;
    padding: 12px 16px;
    background: var(--text);
    color: var(--bg);
    border-radius: 3px;
    font-weight: 600;
  }

  @media (max-width: 1100px) {
    .rg { height: auto; overflow: visible; }
    .rg-grid { grid-template-columns: 1fr; }
    .rg-col { overflow: visible; }
    .rg-col { border-right: 0; border-bottom: 1px solid var(--border); }
  }
</style>

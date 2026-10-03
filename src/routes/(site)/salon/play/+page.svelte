<script>
  import { onMount, onDestroy } from 'svelte';
  import { io } from 'socket.io-client';
  import JoinForm from './JoinForm.svelte';
  import RoundPlay from './RoundPlay.svelte';
  import SummaryView from './SummaryView.svelte';
  import FeedbackOverlay from './FeedbackOverlay.svelte';

  // Join form
  let codeInput     = $state('');
  let usernameInput = $state('');
  let joinError     = $state('');
  let joining       = $state(false);

  // Game state
  let joined       = $state(false);
  let username     = $state('');
  let code         = $state('');
  let answerMode   = $state('free');
  let phase        = $state('lobby');
  let round        = $state(0);
  let total        = $state(10);
  let myScore      = $state(0);
  let scores       = $state([]);
  let timerVal     = $state(0);
  let timerMax     = $state(30);
  let choices      = $state(null);

  // Per-element found state
  let foundArtist = $state(false);
  let foundTitle  = $state(false);
  let foundFeats  = $state([]);
  let foundExtras = $state([]);
  let extras      = $state([]); // labels des réponses supplémentaires du round
  let allFound    = $state(false);

  let timerStarted       = $state(false); // true once the host signals music is playing
  let chosenIndex        = $state(null);  // QCM: index clicked by this player
  let revealCorrectIndex = $state(null);  // QCM: index of correct answer (from round_end)
  let revealTimer        = null;          // delay before transitioning to summary

  let guess        = $state('');
  let roundEnd     = $state(null);
  let finalScores  = $state([]);
  let feedback      = $state(null);
  let feedbackTimer = null;
  let error         = $state('');
  let errorTimer    = null;

  let roster = $state([]);
  let teams  = $state(null);
  let myTeam = $state(null);
  let paused = $state(false);

  let socket;

  function showFeedback(data) {
    feedback = data;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { feedback = null; }, 2200);
  }

  function hue(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
  }

  let myRank = $derived(scores.findIndex(s => s.username === username) + 1);
  // Podium en cours de partie : les trois premiers, plus soi-même si on n'y est pas
  let board = $derived.by(() => {
    const list = (scores.length ? scores : roster).map((p, i) => ({ ...p, rank: i + 1 }));
    const top = list.slice(0, 3);
    const me = list.find(p => p.username === username);
    return me && me.rank > 3 ? [...top, me] : top;
  });
  let teamName = $derived(teams?.find(t => t.id === myTeam)?.name);

  function pickTeam(id) {
    myTeam = id;
    socket?.emit('salon_pick_team', { team: id });
  }

  function submitGuess() {
    if (allFound || !guess.trim()) return;
    socket.emit('salon_submit_guess', { guess: guess.trim() });
    guess = '';
  }

  function submitChoice(index) {
    if (allFound) return;
    chosenIndex = index;
    allFound = true;
    socket.emit('salon_submit_choice', { choiceIndex: index });
  }

  function connectAndJoin() {
    joinError = '';
    joining = true;

    const c = codeInput.trim().toUpperCase();
    const u = usernameInput.trim();
    if (!c || c.length < 6) { joinError = 'Le code fait 6 caractères : il est affiché sur la TV.'; joining = false; return; }
    if (!u) { joinError = 'Choisis un pseudo pour que les autres te reconnaissent.'; joining = false; return; }

    socket = io({ transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000, reconnectionDelayMax: 5000 });

    socket.on('connect', () => {
      // Jeton de ce téléphone : lui seul peut reprendre sa place après une coupure
      let token = null;
      try { token = localStorage.getItem('zik_salon_player_' + c); } catch { /* stockage indisponible */ }
      socket.emit('salon_join_player', { code: c, username: u, token });
    });

    socket.on('salon_joined', (data) => {
      joined     = true;
      username   = data.username;
      code       = c;
      answerMode = data.settings?.answerMode || 'free';
      total      = data.settings?.maxRounds || 10;
      joining    = false;
      error      = '';
      localStorage.setItem('salon_code', c);
      localStorage.setItem('salon_user', u);
      localStorage.setItem('zik_salon_player_' + c, data.token);
      roster = data.players || [];
      teams  = data.teams;
      myTeam = data.team;

      if (data.reconnecting) {
        // Restore server-side state after a disconnection
        phase    = data.phase || 'round';
        paused   = !!data.paused;
        round    = data.round ?? round;
        total    = data.settings?.maxRounds ?? total;
        myScore  = data.score ?? myScore;
        foundArtist = data.foundArtist ?? foundArtist;
        foundTitle  = data.foundTitle  ?? foundTitle;
        allFound    = data.allFound    ?? allFound;
        if (data.choices) choices = data.choices;
        if (typeof data.featCount === 'number') {
          foundFeats = Array(data.featCount).fill(false);
          for (let i = 0; i < (data.foundFeatCount || 0); i++) foundFeats[i] = true;
        }
        if (data.extras) {
          extras = data.extras.map(e => e.label);
          foundExtras = Array(extras.length).fill(false);
          for (let i = 0; i < (data.foundExtrasCount || 0); i++) foundExtras[i] = true;
        }
        timerVal     = data.timerVal ?? timerVal;
        timerMax     = data.timerMax ?? timerMax;
        timerStarted = data.timerActive ?? (data.timerVal > 0);
      } else {
        // Fresh join - reset everything
        phase       = 'lobby';
        myScore     = 0;
        scores      = [];
        foundArtist = false;
        foundTitle  = false;
        foundFeats  = [];
        foundExtras = [];
        extras      = [];
        allFound    = false;
      }
    });

    const resetScores = () => { scores = []; myScore = 0; finalScores = []; };
    socket.on('salon_game_starting', () => { phase = 'starting'; resetScores(); });
    socket.on('salon_restarted', resetScores);

    socket.on('salon_roster', ({ players, teams: t }) => {
      roster = players;
      teams  = t;
      myTeam = players.find(p => p.username === username)?.team ?? myTeam;
    });
    socket.on('salon_paused', ({ paused: p }) => { paused = p; });
    socket.on('salon_settings', ({ settings: st }) => { total = st.maxRounds; answerMode = st.answerMode; });
    socket.on('salon_kicked', () => {
      socket.disconnect();
      joined = false;
      joinError = "L'hôte t'a retiré du salon.";
    });

    socket.on('salon_round_start', (data) => {
      phase              = 'round';
      round              = data.round;
      total              = data.total;
      choices            = data.choices || null;
      roundEnd           = null;
      guess              = '';
      allFound           = false;
      chosenIndex        = null;
      revealCorrectIndex = null;
      timerStarted       = false;
      timerVal           = 0;
      clearTimeout(revealTimer);
      revealTimer        = null;
      foundArtist = false;
      foundTitle  = false;
      foundFeats  = Array(data.featCount || 0).fill(false);
      extras      = (data.extras || []).map(e => e.label);
      foundExtras = Array(extras.length).fill(false);
    });

    socket.on('salon_timer_started', ({ max }) => {
      timerVal     = max;
      timerMax     = max;
      timerStarted = true;
      if (answerMode === 'free') {
        setTimeout(() => { document.getElementById('salon-guess-input')?.focus(); }, 100);
      }
    });

    socket.on('salon_timer_update', ({ current, max }) => { timerVal = current; timerMax = max; });

    socket.on('salon_feedback', (data) => {
      showFeedback(data);
      if (data.correct) {
        myScore += data.points;
        if (data.type === 'success_artist') foundArtist = true;
        else if (data.type === 'success_title') {
          foundTitle = true;
          if (answerMode === 'multiple') foundArtist = true;
        } else if (data.type === 'success_feat') {
          const idx = foundFeats.findIndex(f => !f);
          if (idx !== -1) foundFeats = foundFeats.map((f, i) => i === idx ? true : f);
        } else if (data.type === 'success_extra') {
          const ei = data.extraIndex;
          if (ei !== undefined) foundExtras = foundExtras.map((f, i) => i === ei ? true : f);
        }
        allFound = foundArtist && foundTitle && foundFeats.every(Boolean) && foundExtras.every(Boolean);
      }
    });

    socket.on('salon_scores_update', ({ scores: s, teams: t }) => {
      scores = s;
      if (t) teams = t;
      const me = s.find(p => p.username === username);
      if (me) myScore = me.score;
    });

    socket.on('salon_round_end', (data) => {
      roundEnd = data;
      allFound = true;
      if (data.scores) scores = data.scores;
      teams = data.teams;

      if (answerMode === 'multiple' && data.correctChoiceIndex !== undefined) {
        // QCM: brief reveal of correct answer before transitioning to summary
        revealCorrectIndex = data.correctChoiceIndex;
        clearTimeout(revealTimer);
        revealTimer = setTimeout(() => {
          revealTimer        = null;
          revealCorrectIndex = null;
          phase              = 'summary';
        }, 2200);
      } else {
        phase = 'summary';
      }
    });

    socket.on('salon_game_over', ({ scores: s, teams: t }) => {
      phase       = 'gameover';
      finalScores = s;
      teams       = t;
    });

    socket.on('salon_error', ({ message }) => {
      joining = false;
      if (!joined) {
        joinError = message;
        socket?.disconnect();
        return;
      }
      // Mid-game error: show briefly then auto-dismiss
      error = message;
      clearTimeout(errorTimer);
      errorTimer = setTimeout(() => { error = ''; }, 6000);
    });
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code')?.toUpperCase() || '';
    if (urlCode) codeInput = urlCode;
    const savedUser = localStorage.getItem('salon_user');
    if (savedUser && !usernameInput) usernameInput = savedUser;
  });

  onDestroy(() => {
    socket?.disconnect();
    clearTimeout(feedbackTimer);
    clearTimeout(errorTimer);
    clearTimeout(revealTimer);
  });
</script>

<svelte:head>
  <title>Rejoindre un blind test en soirée - ZIK Salon</title>
  <meta name="robots" content="noindex, follow">
  <meta name="description" content="Entre le code affiché sur la TV et ton pseudo pour jouer au blind test depuis ton téléphone. Sans appli, sans compte.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</svelte:head>

{#if !joined}
  <a class="salon-back salon-play-backlink" href="/">← Accueil ZIK</a>
  <JoinForm
    bind:codeInput
    bind:usernameInput
    {joinError}
    {joining}
    onJoin={connectAndJoin}
  />
{:else}
  <main class="sp">
    <header class="sp-head">
      <span class="sp-av" style="--h:{hue(username)}">{username[0]?.toUpperCase() ?? '?'}</span>
      <div>
        <div class="sp-name">{username}</div>
        <div class="sp-salon">
          Salon {code}
          {#if teamName}<span class="sp-team-tag" style="--tc:var(--q{myTeam})">{teamName}</span>{/if}
        </div>
      </div>
      <div class="sp-score">{myScore}<small>points</small></div>
    </header>

    <div class="sp-body">
      {#if phase === 'lobby' || phase === 'starting'}
        <div>
          <p class="sx-kicker"><b>●</b> Connecté</p>
          <div class="sp-big">C'est bon,<br>tu es dedans.</div>
          <p class="sp-hint">Regarde la TV : la partie démarre quand l'hôte la lance.</p>
        </div>

        {#if teams}
          <section>
            <p class="sx-kicker">Choisis ton équipe</p>
            <div class="sp-teams">
              {#each teams as t (t.id)}
                <button class="sp-team" class:on={myTeam === t.id} style="--tc:var(--q{t.id})" onclick={() => pickTeam(t.id)}>
                  <b>{t.name}</b>
                  <small>{t.members.length} joueur{t.members.length > 1 ? 's' : ''}</small>
                </button>
              {/each}
            </div>
          </section>
        {/if}

        <section>
          <p class="sx-kicker">Dans le salon · {roster.length}</p>
          <ul class="sp-roster">
            {#each roster as p (p.username)}
              <li class:me={p.username === username}>
                {#if teams && p.team != null}<i style="--tc:var(--q{p.team})"></i>{/if}{p.username}
              </li>
            {/each}
          </ul>
        </section>

      {:else if phase === 'round'}
        <RoundPlay
          {round} {total}
          {timerVal} {timerMax} {timerStarted}
          {answerMode} {choices}
          {foundArtist} {foundTitle} {foundFeats}
          {extras} {foundExtras}
          {allFound}
          {chosenIndex}
          {revealCorrectIndex}
          bind:guess
          onSubmitGuess={submitGuess}
          onSubmitChoice={submitChoice}
        />

        {#if board.length > 1 && (answerMode === 'multiple' ? chosenIndex !== null && revealCorrectIndex === null : allFound)}
          <section class="sp-board">
            <p class="sx-kicker">{myRank > 0 ? `Tu es ${myRank}${myRank === 1 ? 'er' : 'e'} sur ${scores.length}` : 'Classement'}</p>
            <ol class="sp-list">
              {#each board as p (p.username)}
                <li class:me={p.username === username}>
                  <span class="r">{String(p.rank).padStart(2, '0')}</span>
                  <span class="n">{p.username}</span>
                  <span class="p">{p.score}</span>
                </li>
              {/each}
            </ol>
          </section>
        {/if}

      {:else if phase === 'summary' || phase === 'gameover'}
        <SummaryView
          {phase} {roundEnd} {finalScores} {scores} {username} {teams} {myTeam}
          {round} {total}
          onLeave={() => { joined = false; codeInput = ''; }}
        />
      {/if}

      {#if error}<p class="sp-error">{error}</p>{/if}
    </div>
  </main>

  {#if paused}
    <div class="sp-pause"><span>Pause</span><small>L'hôte a mis la partie en pause</small></div>
  {/if}

  <FeedbackOverlay {feedback} />
{/if}

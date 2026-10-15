<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import ReportModal from '$lib/components/report/ReportModal.svelte';
  import AchievementToast from '$lib/components/AchievementToast.svelte';
  import CardViewer from '$lib/components/card/CardViewer.svelte';
  import GameHeader from '$lib/components/game/GameHeader.svelte';
  import PlayerList from '$lib/components/game/PlayerList.svelte';
  import Deck from '$lib/components/game/Deck.svelte';
  import AnswerSlots from '$lib/components/game/AnswerSlots.svelte';
  import StartPanel from '$lib/components/game/StartPanel.svelte';
  import AnswerBar from '$lib/components/game/AnswerBar.svelte';
  import HistoryList from '$lib/components/game/HistoryList.svelte';
  import RoundReveal from '$lib/components/game/RoundReveal.svelte';
  import GameOver from '$lib/components/game/GameOver.svelte';
  import GameChat from '$lib/components/game/GameChat.svelte';
  import QuitModal from '$lib/components/game/QuitModal.svelte';
  import InviteFriendsModal from '$lib/components/game/InviteFriendsModal.svelte';
  import { GameAudio, savedVolume } from '$lib/components/game/gameAudio.js';
  import { joinRoom } from '$lib/components/game/gameSocket.js';
  import { createSupabaseClient } from '$lib/supabase.js';

  let { data } = $props();
  const sb = createSupabaseClient(data.env?.supabaseUrl, data.env?.supabaseAnonKey);

  // Paramètres d'URL, lus au montage
  let ROOM_ID = $state('pop');
  let USERNAME = $state('Joueur');
  let USER_ID = $state(null);
  let IS_GUEST = $state(true);

  const emptySlots = () => ({ artist: { val: '???', state: null }, title: { val: '???', state: null }, feats: [], extras: [] });
  const emptyQcm = () => ({ choices: [], chosen: null, reveal: null, result: null, answered: 0, total: 0 });

  // ── État de la partie ──
  let roomLabel = $state('');
  let roundInfo = $state('En attente…');
  let timerPct = $state(100);
  let timerSecs = $state(null);
  let deckSpin = $state(false);
  let players = $state([]);
  let history = $state([]);
  let currentRoundInfo = $state(null);
  let slots = $state(emptySlots());
  let coverSrc = $state('');
  let showCover = $state(false);
  let feedback = $state({ msg: '', cls: '' });
  let summaryShow = $state(false);
  let summaryReason = $state('');
  let summaryFinder = $state('');
  let errorMsg = $state('');
  let joinConflict = $state(null);
  let takenOver = $state(false);
  let gameMode = $state('classic');
  let qcm = $state(emptyQcm());
  let guessVal = $state('');
  let guessDisabled = $state(true);
  let showDcBanner = $state(false);
  let volume = $state(50);
  let roundLoading = $state(false);
  let syncWaiting = $state(false);
  let syncReady = $state(0);
  let syncTotal = $state(0);

  // Lancement et relance
  let showStart = $state(true);
  let startDisabled = $state(false);
  let startLoading = $state(false);
  let adminLocked = $state(false);
  let adminAnnounceMsg = $state('');
  let isAdmin = $state(false);
  let autoStart = $state(false);
  let hasOwner = $state(false);
  let countdownVal = $state(0);
  let showCountdown = $state(false);
  let gameoverShow = $state(false);
  let gameoverScores = $state([]);
  let shareResultId = $state(null);
  // Une partie relancée par un autre peut tourner pendant qu'on lit encore les
  // scores : on retient la manche au lieu d'y basculer de force
  const REJOIN_DELAY = 15;
  let heldRound = $state(null);
  let rejoinIn = $state(0);
  // 'replay' : la partie va se relancer ; 'rejoin' : une partie tourne déjà
  let countdownMode = $state(null);
  let iRequestedReplay = false;

  // Cartes : celle de la manche, celles gagnées depuis le début de la partie
  let roundCard = $state(null);
  let cardsInPlay = $state([]);
  let cardsResult = $state(null);
  let roundsSeen = $state(0);
  let roundTotal = $state(10);
  let cardsOff = $state(null);

  // Fenêtres
  let quitAsked = $state(false);
  let inviteOpen = $state(false);
  let canInviteFriends = $state(false);
  let reportOpen = $state(false);
  let reportType = $state('user');
  let reportUsername = $state('');
  let reportUserId = $state(null);
  let achToasts = $state([]);
  let chatOpen = $state(false);
  let chatMessages = $state([]);
  let chatUnread = $state(0);

  let socket = null;
  let player = null;
  let prevScores = {};
  const timers = {};

  const canReplay = $derived(!hasOwner || autoStart || isAdmin);
  const getToken = async () => (await sb.auth.getSession())?.data?.session?.access_token ?? null;

  function later(key, ms, fn) {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(fn, ms);
  }

  function showFeedback(msg, cls) {
    feedback = { msg, cls };
    later('feedback', 2600, () => { feedback = { msg: '', cls: '' }; });
  }

  // Départ en pleine partie d'une room qui donne des cartes
  function quitCase() {
    if (IS_GUEST || cardsOff || gameoverShow || roundsSeen === 0) return null;
    if (!cardsInPlay.length) return 'none';
    return roundsSeen < Math.ceil(roundTotal / 2) ? 'lose' : 'keep';
  }
  function onBack(e) {
    if (!quitCase()) return;
    e.preventDefault();
    quitAsked = true;
  }
  // Fermeture de l'onglet avec des cartes à perdre : alerte du navigateur
  function onBeforeUnload(e) {
    if (quitCase() === 'lose') e.preventDefault();
  }

  function setVolume(v) {
    volume = v;
    player?.setVolume(v);
  }

  function openUserReport(p) {
    reportType = 'user';
    reportUsername = p.name;
    reportUserId = p.userId || null;
    reportOpen = true;
  }
  function openBugReport() {
    reportType = 'bug';
    reportOpen = true;
  }

  let friendSending = false;
  async function addFriend(p) {
    if (friendSending) return;
    friendSending = true;
    try {
      const token = await getToken();
      if (!token) throw new Error('Connecte-toi pour ajouter des amis.');
      const r = await fetch('/api/friend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetId: p.userId, action: 'request' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      showFeedback(d.friendStatus === 'friends' ? `\u{1F91D} Vous êtes amis avec ${p.name} !` : `✅ Demande d'ami envoyée à ${p.name}`, 'good');
    } catch (e) {
      showFeedback(e.message, 'cold');
    }
    friendSending = false;
  }

  function requestGame() {
    if (!socket) return;
    iRequestedReplay = true;
    socket.emit('request_new_game');
    startDisabled = true;
    startLoading = true;
  }

  function stopRejoinCountdown() {
    clearInterval(timers.rejoin);
    rejoinIn = 0;
    countdownMode = null;
  }
  function startRejoinCountdown(mode) {
    stopRejoinCountdown();
    countdownMode = mode;
    rejoinIn = REJOIN_DELAY;
    timers.rejoin = setInterval(() => {
      rejoinIn -= 1;
      if (rejoinIn > 0) return;
      const m = countdownMode;
      stopRejoinCountdown();
      if (m === 'replay') requestGame();
      else joinRunningGame();
    }, 1000);
  }

  // Bascule vers la partie en cours et cale la lecture là où elle en est
  function joinRunningGame() {
    stopRejoinCountdown();
    const d = heldRound;
    heldRound = null;
    gameoverShow = false;
    if (!d) return;
    player.playRound(d);
    if (d.audioUrl && !player.waitingForSync) player.playSynced();
  }

  function startCountdownUI(seconds) {
    clearInterval(timers.countdown);
    countdownVal = seconds;
    showCountdown = true;
    timers.countdown = setInterval(() => {
      if (--countdownVal <= 0) stopCountdownUI();
    }, 1000);
  }
  function stopCountdownUI() {
    clearInterval(timers.countdown);
    showCountdown = false;
    countdownVal = 0;
  }

  function submitGuess(val) {
    if (!socket) return;
    socket.emit('submit_guess', val);
    tick().then(() => document.getElementById('guessInput')?.focus());
  }
  function submitChoice(index) {
    if (qcm.chosen !== null || guessDisabled || !socket) return;
    qcm.chosen = index;
    socket.emit('submit_choice', { choiceIndex: index });
  }

  function toggleChat() {
    chatOpen = !chatOpen;
    if (chatOpen) chatUnread = 0;
  }

  // Réactions aux événements de la partie, branchées par joinRoom()
  const handlers = {
    connected() { showDcBanner = false; },
    disconnected() {
      if (!takenOver) showDcBanner = true;
      if (player.roundActive) player.stop();
    },
    roomJoined(roomConfig) {
      const trackInfo = roomConfig.trackCount ? ` — ${roomConfig.trackCount} titres` : '';
      roomLabel = `${roomConfig.emoji || ''} ${roomConfig.name || ''}${trackInfo}`.trim();
      autoStart = roomConfig.autoStart || false;
      isAdmin = roomConfig.isAdmin || false;
      hasOwner = roomConfig.hasOwner || false;
      adminLocked = roomConfig.adminBlocked || false;
      if (adminLocked) startDisabled = true;
      if (roomConfig.gameMode) gameMode = roomConfig.gameMode;
      // Proposée en « Reprendre » sur l'accueil
      try {
        localStorage.setItem('zik_last_room', JSON.stringify({ id: ROOM_ID, name: roomConfig.name || ROOM_ID, emoji: roomConfig.emoji || '', gameMode }));
      } catch { /* stockage indisponible */ }
    },
    countdown: startCountdownUI,
    countdownCancelled: stopCountdownUI,
    trackCount(count) {
      roomLabel = roomLabel.replace(/ — \d+ titres$/, '') + ` — ${count} titres`;
    },
    players(ps) {
      const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
      players = [...ps].sort((a, b) => b.score - a.score).map((p, i) => ({
        ...p,
        rank: medals[i] || `#${i + 1}`,
        scored: prevScores[p.name] !== undefined && p.score > prevScores[p.name],
      }));
      ps.forEach(p => { prevScores[p.name] = p.score; });
    },
    history(h) { history = Array.isArray(h) ? [...h].reverse() : []; },
    gameStarting() {
      gameoverShow = false; showStart = false; stopCountdownUI();
      clearTimeout(timers.loading); roundLoading = false;
      shareResultId = null; cardsInPlay = []; cardsResult = null; roundsSeen = 0; roundCard = null;
    },
    cardsInPlay(list) { cardsInPlay = list; },
    cardsGranted(result) { cardsResult = result; },
    roundLoading() { later('loading', 1500, () => { roundLoading = true; }); },
    startRound(d) {
      clearTimeout(timers.loading);
      roundLoading = false;
      roundInfo = `Manche ${d.round} / ${d.total}`;
      roundTotal = d.total;
      cardsOff = d.cardsOff ?? null;
      roundCard = null;
      currentRoundInfo = { round: d.round, trackId: d.trackId ?? null, videoId: d.videoId ?? null };
      coverSrc = ''; showCover = false;
      // Une partie relancée par quelqu'un d'autre ne doit pas nous arracher aux scores
      const holdOnResults = gameoverShow && !iRequestedReplay;
      iRequestedReplay = false;
      summaryShow = false; feedback = { msg: '', cls: '' };
      if (!holdOnResults) gameoverShow = false;
      slots = {
        ...emptySlots(),
        feats: Array.from({ length: d.featCount || 0 }, () => ({ val: '???', state: null })),
        extras: (d.extraLabels || []).map(label => ({ val: '???', state: null, label })),
      };
      timerPct = 100; timerSecs = null; deckSpin = true;
      guessDisabled = true; guessVal = '';
      qcm = { ...emptyQcm(), choices: d.choices || [] };
      showStart = false; startDisabled = false; startLoading = false;
      player.roundActive = true;
      player.waitingForSync = true;
      player.syncAnchor = null;
      player.lastVideo = { videoId: d.videoId, startSeconds: d.startSeconds, startedAt: Date.now() };
      syncWaiting = true; syncReady = 0; syncTotal = 0;
      if (holdOnResults) {
        // Aucun chargement audio : on n'entend pas une partie qu'on ne regarde pas
        heldRound = d;
        startRejoinCountdown('rejoin');
        return;
      }
      player.playRound(d);
    },
    nextAudio(url) { player.prefetch(url); },
    roundStartSync(elapsed) {
      syncWaiting = false;
      guessDisabled = false;
      // L'ancre est toujours posée, pour caler la lecture si le joueur rejoint
      // plus tard, mais rien ne joue tant qu'il regarde les scores
      player.startSynced(elapsed, { play: !heldRound });
      if (!heldRound) tick().then(() => document.getElementById('guessInput')?.focus());
    },
    readyUpdate(ready, total) { syncReady = ready; syncTotal = total; },
    chatHistory(msgs) { chatMessages = msgs; },
    chatMessage(msg) {
      chatMessages = [...chatMessages, msg];
      if (!chatOpen) chatUnread++;
    },
    timer(current, max) {
      timerPct = (current / max) * 100;
      timerSecs = Math.max(0, current);
    },
    feedback(d) {
      if (d.type === 'success_artist') slots.artist = { val: d.val, state: 'found' };
      if (d.type === 'success_title') slots.title = { val: d.val, state: 'found' };
      if (d.type === 'success_feat') slots.feats[d.featIndex ?? 0] = { val: d.val, state: 'found' };
      if (d.type === 'success_extra') slots.extras[d.extraIndex ?? 0] = { ...slots.extras[d.extraIndex ?? 0], val: d.val, state: 'found' };
      showFeedback(d.msg, d.type === 'miss' ? 'cold' : d.type === 'close' ? 'hot' : 'good');
    },
    revealCover(cover) { if (cover) { coverSrc = cover; showCover = true; } },
    choiceResult(result) { qcm.result = result; },
    qcmAnswered(answered, total) { qcm.answered = answered; qcm.total = total; },
    roundEnd(d) {
      roundsSeen += 1;
      roundCard = d.card ?? null;
      if (d.card?.mode === 'won') cardsInPlay = [...cardsInPlay, { card: d.card.card, round: d.round }];
      if (gameMode === 'qcm' && d.correctChoiceIndex !== undefined) qcm.reveal = d.correctChoiceIndex;
      slots = answerSlots(d);
      if (d.cover) { coverSrc = d.cover; showCover = true; }
      summaryShow = true;
      summaryReason = d.reason;
      summaryFinder = d.totalFound > 0 ? `\u{1F3C6} 1er : ${d.firstFinder} — ${d.totalFound} joueur(s) ont tout trouvé` : '❌ Personne n’a trouvé';
      syncWaiting = false; guessDisabled = true; timerPct = 0; deckSpin = false;
      player.endRound();
      history = [d, ...history];
      currentRoundInfo = null;
    },
    gameOver(scores) {
      player.endRound();
      guessDisabled = true; timerPct = 0; deckSpin = false; summaryShow = false;
      gameoverScores = scores;
      gameoverShow = true;
      heldRound = null;
      iRequestedReplay = false;
      stopRejoinCountdown();
      // Relance automatique, sauf pour ceux qui ne peuvent pas lancer la partie
      if (canReplay) startRejoinCountdown('replay');
    },
    achievements(list) { if (Array.isArray(list)) achToasts = [...achToasts, ...list]; },
    resultId(id) { shareResultId = id; },
    serverError(msg) {
      errorMsg = msg;
      later('error', 4000, () => { errorMsg = ''; });
      startDisabled = false; startLoading = false;
    },
    joinRefused(info) { joinConflict = info; },
    // Un autre onglet a pris la main : ne pas se remettre dans la partie
    takenOver() { takenOver = true; },
    kicked() { goto('/rooms'); },
    adminPause() { player.pause(); },
    adminResume() { player.resume(); },
    announce(message) {
      adminAnnounceMsg = message;
      later('announce', 8000, () => { adminAnnounceMsg = ''; });
    },
    blocked(locked) { adminLocked = locked; startDisabled = locked; },
  };

  // Réponse complète de fin de manche, découpée en cases
  function answerSlots(d) {
    const dash = d.answer.indexOf(' - ');
    const fullArtist = dash > -1 ? d.answer.slice(0, dash) : d.answer;
    const title = dash > -1 ? d.answer.slice(dash + 3) : '—';
    const feats = d.featArtists || [];
    return {
      artist: { val: feats.length ? mainArtist(fullArtist) : fullArtist, state: d.foundArtist ? 'found' : 'missed' },
      title: { val: title || '—', state: d.foundTitle ? 'found' : 'missed' },
      feats: feats.map((fa, i) => ({ val: fa, state: (d.foundFeats || [])[i] ? 'found' : 'missed' })),
      extras: (d.extraAnswers || []).map((e, i) => ({ label: e.label, val: e.value, state: (d.foundExtras || [])[i] ? 'found' : 'missed' })),
    };
  }

  function mainArtist(artist) {
    const m = artist.match(/^(.+?)(?:\s*\((?:feat\.?|ft\.?|featuring)\s+[^)]+\)|\s+(?:feat\.?|ft\.?|featuring)\s+.+)$/i);
    if (m) return m[1].trim();
    const ci = artist.indexOf(', ');
    if (ci > 0) return artist.slice(0, ci).trim();
    const am = artist.match(/^(.+?)\s+&\s+.+$/);
    return am ? am[1].trim() : artist;
  }

  onMount(async () => {
    const P = new URLSearchParams(location.search);
    ROOM_ID = P.get('roomId') || 'pop';
    USERNAME = P.get('username') || sessionStorage.getItem('zik_uname') || 'Joueur';
    USER_ID = P.get('userId') || sessionStorage.getItem('zik_uid') || null;
    IS_GUEST = P.get('isGuest') === '1' || !USER_ID;
    gameMode = P.get('gameMode') || 'classic';
    canInviteFriends = !IS_GUEST && !!USER_ID && !!sb;

    player = new GameAudio({ onPlayerReady: () => socket?.emit('player_ready') });
    volume = savedVolume();
    player.startDriftGuard();

    // Le jeton de session prouve au serveur que userId est bien le nôtre :
    // sans lui, pas de carte
    socket = await joinRoom(handlers, async (extra = {}) => ({
      roomId: ROOM_ID, username: USERNAME, userId: USER_ID, isGuest: IS_GUEST,
      token: IS_GUEST ? null : await getToken(),
      ...extra,
    }));
  });

  onDestroy(() => {
    socket?.disconnect();
    player?.destroy();
    Object.values(timers).forEach((t) => { clearTimeout(t); clearInterval(t); });
  });
</script>

<svelte:head>
  <title>ZIK - En jeu</title>
  <meta name="robots" content="noindex, nofollow">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/game.css?v=3.18.0">
  <link rel="stylesheet" href="/css/cards.css?v=1">
</svelte:head>

{#if showDcBanner}
  <div class="g-dc-banner">Reconnexion en cours&hellip;</div>
{/if}

{#if joinConflict}
  <div class="g-session-overlay" role="alertdialog">
    <div class="g-session-card">
      <h2>Ce compte joue déjà</h2>
      <p>
        Tu es dans la room <strong>{joinConflict.roomName}</strong> sous le pseudo
        <strong>{joinConflict.playerName}</strong>. Un même compte ne peut pas jouer
        depuis deux onglets à la fois.
      </p>
      <button class="g-session-btn" onclick={() => { joinConflict = null; socket?.takeOver(); }}>Continuer ici</button>
      <a class="g-session-link" href="/rooms">Retour aux rooms</a>
      <p class="g-session-note">L'autre onglet sera déconnecté.</p>
    </div>
  </div>
{/if}

{#if takenOver}
  <div class="g-session-overlay" role="alertdialog">
    <div class="g-session-card">
      <h2>Partie reprise ailleurs</h2>
      <p>Ce compte a rejoint une partie depuis un autre onglet. Celui-ci a été déconnecté.</p>
      <a class="g-session-btn" href="/rooms">Retour aux rooms</a>
    </div>
  </div>
{/if}

<audio id="previewAudio" style="display:none" preload="auto"></audio>

{#if adminAnnounceMsg}
  <div class="g-admin-announce" role="alert">
    <span class="g-announce-icon">📢</span>
    <span class="g-announce-text">{adminAnnounceMsg}</span>
  </div>
{/if}

<div class="g-app">
  <GameHeader
    {roomLabel} {roundInfo} {cardsInPlay} {roundsSeen} {roundTotal}
    {chatOpen} {chatUnread} canInvite={canInviteFriends} {volume}
    {onBack} onToggleChat={toggleChat} onInvite={() => (inviteOpen = true)}
    onBugReport={openBugReport} onVolume={setVolume}
  />

  <div class="g-body">
    <PlayerList
      {players} username={USERNAME} isGuest={IS_GUEST} canAddFriends={!IS_GUEST && !!USER_ID}
      {cardsInPlay} {roundsSeen} {roundTotal} {cardsOff}
      onAddFriend={addFriend} onReport={openUserReport}
    />

    <div class="g-col-center">
      <main class="g-center">
        <Deck spinning={deckSpin} {timerPct} {timerSecs} cover={showCover ? coverSrc : ''} />
        <AnswerSlots {slots} {gameMode} />

        <div class="g-feedback {feedback.msg ? 'show ' + feedback.cls : ''}">{feedback.msg}</div>

        <!-- Chargement imprévu (yt-dlp lent, prefetch KO) -->
        {#if roundLoading}
          <div class="g-waiting">&#x23F3; Chargement de la prochaine manche&hellip;</div>
        {/if}
        {#if errorMsg}
          <div class="g-error">{errorMsg}</div>
        {/if}

        <StartPanel
          roomId={ROOM_ID} {adminLocked} {showStart} {showCountdown} {countdownVal}
          {hasOwner} {autoStart} {isAdmin} disabled={startDisabled} loading={startLoading}
          alone={players.length <= 1} onStart={requestGame}
        />
      </main>

      <AnswerBar
        {gameMode} disabled={guessDisabled} {syncWaiting} {syncReady} {syncTotal}
        {qcm} bind:guessVal onGuess={submitGuess} onChoice={submitChoice}
      />
    </div>

    <HistoryList {history} />
  </div>
</div>

{#if summaryShow && !gameoverShow}
  <RoundReveal
    {coverSrc} {roundCard} {roundInfo} {slots} finder={summaryFinder}
    reason={summaryReason} {roundsSeen} {roundTotal}
  />
{/if}

{#if gameoverShow}
  {#key gameoverScores}
    <GameOver
      scores={gameoverScores} username={USERNAME} isGuest={IS_GUEST} {roomLabel}
      {cardsInPlay} {cardsResult} resultId={shareResultId}
      {rejoinIn} {countdownMode} {heldRound} {canReplay}
      onJoin={joinRunningGame} onReplay={requestGame}
    />
  {/key}
{/if}

{#if chatOpen}
  <GameChat messages={chatMessages} username={USERNAME} onSend={(text) => socket?.emit('send_chat', text)} onClose={toggleChat} />
{/if}

<ReportModal
  bind:open={reportOpen}
  type={reportType}
  reportedUsername={reportUsername}
  reportedUserId={reportUserId}
  roomId={ROOM_ID}
  reporterId={USER_ID}
  reporterName={USERNAME}
  {history}
  currentRound={currentRoundInfo}
  getGameContext={() => ({
    room: roomLabel || ROOM_ID,
    mode: gameMode,
    round: roundInfo,
    timer: timerSecs,
    players: players.length,
    guest: IS_GUEST,
    connected: socket?.connected ?? false,
    screen: gameoverShow ? 'scores de fin' : summaryShow ? 'résumé de manche' : 'manche',
    answer: { artist: slots.artist.state, title: slots.title.state },
  })}
/>

<CardViewer />

<svelte:window onbeforeunload={onBeforeUnload} />

<QuitModal
  open={quitAsked} quitCase={quitCase()} {cardsInPlay} {roundTotal}
  onStay={() => (quitAsked = false)}
  onQuit={() => { quitAsked = false; goto('/'); }}
/>

{#if canInviteFriends}
  <InviteFriendsModal
    bind:open={inviteOpen} {getToken} userId={USER_ID} roomId={ROOM_ID} {roomLabel}
    onError={(msg) => showFeedback(msg, 'cold')}
  />
{/if}

<AchievementToast items={achToasts} onConsume={() => { achToasts = achToasts.slice(1); }} />

<!-- Lecteur YouTube caché (secours si le fichier audio manque) -->
<div id="yt-player" style="position:fixed;bottom:-1px;left:-1px;width:1px;height:1px;overflow:hidden;pointer-events:none"></div>

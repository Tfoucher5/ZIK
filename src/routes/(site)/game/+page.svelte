<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import ReportModal from '$lib/components/report/ReportModal.svelte';
  import AchievementToast from '$lib/components/achievements/AchievementToast.svelte';
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
  import SessionNotices from '$lib/components/game/SessionNotices.svelte';
  import { GameAudio, savedVolume } from '$lib/components/game/gameAudio.js';
  import { joinRoom } from '$lib/components/game/gameSocket.js';
  import { GameSession } from '$lib/components/game/gameSession.svelte.js';
  import { gameHandlers } from '$lib/components/game/gameHandlers.js';
  import { createSupabaseClient } from '$lib/client/supabase.js';

  let { data } = $props();
  const sb = createSupabaseClient(data.env?.supabaseUrl, data.env?.supabaseAnonKey);
  const g = new GameSession(sb);

  onMount(async () => {
    const P = new URLSearchParams(location.search);
    g.roomId = P.get('roomId') || 'pop';
    g.username = P.get('username') || sessionStorage.getItem('zik_uname') || 'Joueur';
    g.userId = P.get('userId') || sessionStorage.getItem('zik_uid') || null;
    g.isGuest = P.get('isGuest') === '1' || !g.userId;
    g.gameMode = P.get('gameMode') || 'classic';
    g.canInviteFriends = !g.isGuest && !!g.userId && !!sb;

    g.player = new GameAudio({ onPlayerReady: () => g.socket?.emit('player_ready') });
    g.volume = savedVolume();
    g.player.startDriftGuard();

    // Le jeton de session prouve au serveur que userId est bien le nôtre :
    // sans lui, pas de carte
    g.socket = await joinRoom(gameHandlers(g), async (extra = {}) => ({
      roomId: g.roomId, username: g.username, userId: g.userId, isGuest: g.isGuest,
      token: g.isGuest ? null : await g.getToken(),
      ...extra,
    }));
  });

  onDestroy(() => g.destroy());
</script>

<svelte:head>
  <title>ZIK - En jeu</title>
  <meta name="robots" content="noindex, nofollow">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  {#each ["shell", "sidebars", "history", "disc", "states", "splash", "gameover", "credits", "chat", "qcm", "responsive", "extras"] as f (f)}<link rel="stylesheet" href="/css/game/{f}.css?v=3.19.0">{/each}
  <link rel="stylesheet" href="/css/cards.css?v=1">
</svelte:head>

<SessionNotices {g} />

<audio id="previewAudio" style="display:none" preload="auto"></audio>

<div class="g-app">
  <GameHeader
    roomLabel={g.roomLabel} roundInfo={g.roundInfo} cardsInPlay={g.cardsInPlay} roundsSeen={g.roundsSeen} roundTotal={g.roundTotal}
    chatOpen={g.chatOpen} chatUnread={g.chatUnread} canInvite={g.canInviteFriends} volume={g.volume}
    onBack={g.onBack} onToggleChat={g.toggleChat} onInvite={() => (g.inviteOpen = true)}
    onBugReport={g.openBugReport} onVolume={g.setVolume}
  />

  <div class="g-body">
    <PlayerList
      players={g.players} username={g.username} isGuest={g.isGuest} canAddFriends={!g.isGuest && !!g.userId}
      cardsInPlay={g.cardsInPlay} roundsSeen={g.roundsSeen} roundTotal={g.roundTotal} cardsOff={g.cardsOff}
      onAddFriend={g.addFriend} onReport={g.openUserReport}
    />

    <div class="g-col-center">
      <main class="g-center">
        <Deck spinning={g.deckSpin} timerPct={g.timerPct} timerSecs={g.timerSecs} cover={g.showCover ? g.coverSrc : ''} />
        <AnswerSlots slots={g.slots} gameMode={g.gameMode} />

        <div class="g-feedback {g.feedback.msg ? 'show ' + g.feedback.cls : ''}">{g.feedback.msg}</div>

        <!-- Chargement imprévu (yt-dlp lent, prefetch KO) -->
        {#if g.roundLoading}
          <div class="g-waiting">&#x23F3; Chargement de la prochaine manche&hellip;</div>
        {/if}
        {#if g.errorMsg}
          <div class="g-error">{g.errorMsg}</div>
        {/if}

        <StartPanel
          roomId={g.roomId} adminLocked={g.adminLocked} showStart={g.showStart} showCountdown={g.showCountdown} countdownVal={g.countdownVal}
          hasOwner={g.hasOwner} autoStart={g.autoStart} isAdmin={g.isAdmin} disabled={g.startDisabled} loading={g.startLoading}
          alone={g.players.length <= 1} onStart={g.requestGame}
        />
      </main>

      <AnswerBar
        gameMode={g.gameMode} disabled={g.guessDisabled} syncWaiting={g.syncWaiting} syncReady={g.syncReady} syncTotal={g.syncTotal}
        qcm={g.qcm} bind:guessVal={g.guessVal} onGuess={g.submitGuess} onChoice={g.submitChoice}
      />
    </div>

    <HistoryList history={g.history} />
  </div>
</div>

{#if g.summaryShow && !g.gameoverShow}
  <RoundReveal
    coverSrc={g.coverSrc} roundCard={g.roundCard} roundInfo={g.roundInfo} slots={g.slots} finder={g.summaryFinder}
    reason={g.summaryReason} roundsSeen={g.roundsSeen} roundTotal={g.roundTotal}
  />
{/if}

{#if g.gameoverShow}
  {#key g.gameoverScores}
    <GameOver
      scores={g.gameoverScores} username={g.username} isGuest={g.isGuest} roomLabel={g.roomLabel}
      cardsInPlay={g.cardsInPlay} cardsResult={g.cardsResult} resultId={g.shareResultId}
      rejoinIn={g.rejoinIn} countdownMode={g.countdownMode} heldRound={g.heldRound} canReplay={g.canReplay}
      onJoin={g.joinRunningGame} onReplay={g.requestGame}
    />
  {/key}
{/if}

{#if g.chatOpen}
  <GameChat messages={g.chatMessages} username={g.username} onSend={(text) => g.socket?.emit('send_chat', text)} onClose={g.toggleChat} />
{/if}

<ReportModal
  bind:open={g.reportOpen}
  type={g.reportType}
  reportedUsername={g.reportUsername}
  reportedUserId={g.reportUserId}
  roomId={g.roomId}
  reporterId={g.userId}
  reporterName={g.username}
  history={g.history}
  currentRound={g.currentRoundInfo}
  getGameContext={() => ({
    room: g.roomLabel || g.roomId,
    mode: g.gameMode,
    round: g.roundInfo,
    timer: g.timerSecs,
    players: g.players.length,
    guest: g.isGuest,
    connected: g.socket?.connected ?? false,
    screen: g.gameoverShow ? 'scores de fin' : g.summaryShow ? 'résumé de manche' : 'manche',
    answer: { artist: g.slots.artist.state, title: g.slots.title.state },
  })}
/>

<CardViewer />

<svelte:window onbeforeunload={g.onBeforeUnload} />

<QuitModal
  open={g.quitAsked} quitCase={g.quitCase()} cardsInPlay={g.cardsInPlay} roundTotal={g.roundTotal}
  onStay={() => (g.quitAsked = false)}
  onQuit={() => { g.quitAsked = false; goto('/'); }}
/>

{#if g.canInviteFriends}
  <InviteFriendsModal
    bind:open={g.inviteOpen} getToken={g.getToken} userId={g.userId} roomId={g.roomId} roomLabel={g.roomLabel}
    onError={(msg) => g.showFeedback(msg, 'cold')}
  />
{/if}

<AchievementToast items={g.achToasts} onConsume={() => { g.achToasts = g.achToasts.slice(1); }} />

<!-- Lecteur YouTube caché (secours si le fichier audio manque) -->
<div id="yt-player" style="position:fixed;bottom:-1px;left:-1px;width:1px;height:1px;overflow:hidden;pointer-events:none"></div>

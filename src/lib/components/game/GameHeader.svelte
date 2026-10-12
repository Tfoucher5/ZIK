<script>
  import CardTray from '$lib/components/card/CardTray.svelte';

  let {
    roomLabel, roundInfo, cardsInPlay, roundsSeen, roundTotal,
    chatOpen, chatUnread, canInvite, volume,
    onBack, onToggleChat, onInvite, onBugReport, onVolume,
  } = $props();
</script>

<header class="g-header">
  <a href="/" class="g-back" onclick={onBack}>&#x2190; Rooms</a>
  <div class="g-header-room">
    <span class="g-live"></span>
    <span class="g-room-name">{roomLabel}</span>
  </div>
  <div class="g-round-info">{roundInfo}</div>
  {#if cardsInPlay.length}
    <div class="g-cards-pill">
      <CardTray entries={cardsInPlay} round={roundsSeen} maxRounds={roundTotal} variant="pill" />
    </div>
  {/if}
  <div class="g-header-spacer"></div>
  <div class="g-header-right">
    <button class="g-chat-toggle" onclick={onToggleChat} title="Chat" aria-label="Ouvrir le chat" class:g-chat-active={chatOpen}>
      &#x1F4AC;
      {#if chatUnread > 0}<span class="g-chat-badge">{chatUnread > 9 ? '9+' : chatUnread}</span>{/if}
    </button>
    {#if canInvite}
      <button class="g-bug-btn" onclick={onInvite} title="Inviter des amis dans cette room" aria-label="Inviter des amis dans cette room">👋</button>
    {/if}
    <button class="g-bug-btn" onclick={onBugReport} title="Signaler un bug" aria-label="Signaler un bug">🐛</button>
    <div class="g-vol">
      <span class="g-vol-label">VOL</span>
      <input
        type="range" id="volSlider" min="0" max="100" value={volume}
        style="--vol:{volume}%"
        oninput={e => onVolume(parseInt(e.target.value))}
        aria-label="Volume"
      >
      <span class="g-vol-pct">{volume}</span>
    </div>
  </div>
</header>

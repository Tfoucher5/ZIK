<script>
  import { onMount, onDestroy } from 'svelte';
  import HostGameOver from './HostGameOver.svelte';
  import { HostYoutube } from './hostYoutube.svelte.js';
  import { salonQrUrl } from '$lib/client/salonClient.js';

  let {
    phase = 'lobby', code = '', timerVal = 0, timerMax = 30, timerStarted = false,
    players = [], teams = null,
    roundEnd = null, gameOver = null,
    round = 0, total = 10,
    choices = null, answerMode = 'free',
    paused = false, pro = false, settings = {},
    onSetting,
    onRestart, onNewSalon, onMusicReady, onVideoError, onChangePlaylists = null,
  } = $props();

  let membersOf = (id) => players.filter(p => p.team === id);
  let answeredCount = $derived(players.filter(p => p.answeredThisRound || p.foundThisRound).length);
  let finders = $derived(players.filter(p => p.foundThisRound));
  let timerLevel = $derived(!timerMax || timerVal / timerMax >= 0.4 ? '' : timerVal / timerMax >= 0.2 ? 'warn' : 'danger');

  const yt = new HostYoutube(() => onMusicReady?.(), (videoId) => onVideoError?.(videoId));

  // Pilotées par la page (bind:this) au fil des événements du serveur
  export const setVolume = (v) => yt.setVolume(v);
  export const preloadVideo = (videoId, startSeconds) => yt.preloadVideo(videoId, startSeconds);
  export const loadVideo = (videoId, startSeconds) => yt.loadVideo(videoId, startSeconds);
  export const pauseVideo = () => yt.pauseVideo();
  export const resumeVideo = () => yt.resumeVideo();
  export const revealVideo = () => yt.revealVideo();

  onMount(() => yt.init());
  onDestroy(() => yt.destroy());
</script>

<div class="sh-stage">
  <div id="salon-yt-player">
    {#each [0, 1] as slot (slot)}
      <div class="salon-yt-slot" class:on={slot === yt.active}><div id="salon-yt-{slot}"></div></div>
    {/each}
  </div>

  <section class="sh-layer" class:on={phase === 'lobby' || phase === 'starting'}>
    <div class="sh-lobby">
      <div>
        <p class="sx-kicker"><b>●</b> {players.length} joueur{players.length !== 1 ? 's' : ''} connecté{players.length !== 1 ? 's' : ''}</p>
        <h1>Sortez vos<br><em>téléphones.</em></h1>
        <div class="sh-code" aria-label="Code {code}">
          {#each code.split('') as ch, i (i)}<b>{ch}</b>{/each}
        </div>
        <p class="sh-lobby-url">Scannez le QR code ou allez sur <b>zik-music.fr/salon/play</b></p>
      </div>
      <div class="sh-qr"><img src={salonQrUrl(code, 320)} alt="QR code pour rejoindre" width="320" height="320"></div>
    </div>
    {#if teams}
      <div class="sh-teams">
        {#each teams as t (t.id)}
          <div class="sh-team" style="--tc:var(--q{t.id})">
            <b>{t.name}</b>
            <span>{membersOf(t.id).map(p => p.username).join(', ') || 'Personne encore'}</span>
          </div>
        {/each}
      </div>
    {:else if players.length}
      <p class="sh-lobby-names">
        {#each players as p (p.username)}<span>{p.username}</span>{/each}
      </p>
    {/if}
  </section>

  <section class="sh-layer sh-roundview" class:on={phase === 'round'}>
    <p class="sx-kicker">Manche <b>{round}</b> / {total}</p>
    {#if timerStarted}
      <div class="sh-timer {timerLevel}">{timerVal}</div>
    {:else}
      <div class="sh-waiting"><span class="sx-dots"><i></i><i></i><i></i></span> La musique arrive</div>
    {/if}
    <p class="sh-answered"><b>{answeredCount}</b> / {players.length} ont répondu</p>
    <div class="sh-finders">
      {#each finders as p (p.username)}<span>{p.username}</span>{/each}
    </div>
    {#if answerMode === 'multiple' && choices && timerStarted}
      <div class="sx-choices">
        {#each choices as choice, i (i)}
          <div class="sx-choice c{i}"><span class="sx-shape"></span>{choice}</div>
        {/each}
      </div>
    {/if}
  </section>

  {#if phase === 'summary' && roundEnd}
    <div class="sh-reveal">
      {#if roundEnd.cover}<img src={roundEnd.cover} alt="">{/if}
      <div class="sh-reveal-txt">
        <p class="sx-kicker">{roundEnd.reason}</p>
        <div class="sh-reveal-answer">{roundEnd.answer}</div>
        {#if roundEnd.featArtists?.length}
          <div class="sh-reveal-feat">feat. {roundEnd.featArtists.join(', ')}</div>
        {/if}
      </div>
      {#if roundEnd.firstFinder}
        <div class="sh-reveal-first">Le plus rapide<b>{roundEnd.firstFinder}</b></div>
      {/if}
    </div>
  {/if}

  <HostGameOver {phase} {gameOver} {total} {settings} {pro} {onSetting} {onRestart} {onChangePlaylists} {onNewSalon} />

  {#if paused}
    <div class="sh-pause"><span>Pause</span><small>La partie reprend dans un instant</small></div>
  {/if}
</div>

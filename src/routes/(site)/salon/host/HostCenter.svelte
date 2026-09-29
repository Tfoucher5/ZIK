<script>
  import { onMount, onDestroy } from 'svelte';
  import { FREE_MAX_TEAMS } from '$lib/proPlans.js';

  let {
    phase = 'lobby', code = '', timerVal = 0, timerMax = 30, timerStarted = false,
    players = [], teams = null,
    roundEnd = null, gameOver = null,
    round = 0, total = 10,
    choices = null, answerMode = 'free',
    paused = false, pro = false, settings = {},
    onSetting,
    onRestart, onNewSalon, onMusicReady, onChangePlaylists = null,
  } = $props();

  // Fin de partie : en équipes, le podium est celui des équipes
  let finalScores = $derived(gameOver?.scores ?? []);
  let finalTeams = $derived(gameOver?.teams ?? null);
  let ranked = $derived(
    finalTeams
      ? finalTeams.map(t => ({ key: 't' + t.id, name: t.name, score: t.score, team: t.id, sub: `${t.members.length} joueur${t.members.length > 1 ? 's' : ''}` }))
      : finalScores.map(p => ({ key: p.username, name: p.username, score: p.score, team: p.team, sub: `${p.found} trouvé${p.found > 1 ? 's' : ''}` }))
  );
  let winner = $derived(ranked[0]);
  let podiumSlots = $derived([
    { e: ranked[1], pos: 2, step: 2 },
    { e: ranked[0], pos: 1, step: 3 },
    { e: ranked[2], pos: 3, step: 1 },
  ]);
  let bestPlayer = $derived(finalScores[0]);
  let fastest = $derived([...finalScores].sort((a, b) => b.first - a.first)[0]);
  let steadiest = $derived([...finalScores].sort((a, b) => b.found - a.found)[0]);
  let membersOf = (id) => players.filter(p => p.team === id);

  let revealStep = $state(0);
  let _revealTimers = [];

  $effect(() => {
    _revealTimers.forEach(clearTimeout);
    _revealTimers = [];
    revealStep = 0;
    if (phase === 'gameover') {
      _revealTimers = [500, 1500, 2700, 3900].map((ms, i) => setTimeout(() => { revealStep = i + 1; }, ms));
    }
  });

  let answeredCount = $derived(players.filter(p => p.answeredThisRound || p.foundThisRound).length);
  let finders = $derived(players.filter(p => p.foundThisRound));
  let timerLevel = $derived(!timerMax || timerVal / timerMax >= 0.4 ? '' : timerVal / timerMax >= 0.2 ? 'warn' : 'danger');

  // ─── YouTube ───────────────────────────────────────────────────────────────
  // Deux lecteurs : l'un joue la manche, l'autre charge en muet la vidéo de la
  // suivante. Au changement de manche on permute, sans attendre le réseau.
  let ytReady = false;
  const yt = [null, null];
  let active = $state(0);
  let preload = null;        // { videoId, startSeconds, slot, go }
  let activePlaying = false;
  let _preloadTimer = null;
  let currentStartSecs = 0;
  let _metaGuardInterval = null;
  let _volume = 100;

  function applyVolume(p) {
    try {
      if (_volume === 0) p?.mute?.();
      else { p?.unMute?.(); p?.setVolume?.(_volume); }
    } catch { /* YT pas prêt */ }
  }

  export function setVolume(v) {
    _volume = v;
    applyVolume(yt[active]);
  }

  function whenYT(fn) {
    if (ytReady) return fn();
    const check = setInterval(() => {
      if (!ytReady) return;
      clearInterval(check);
      fn();
    }, 200);
  }

  function makePlayer(slot, videoId, startSeconds) {
    yt[slot] = new window.YT.Player(`salon-yt-${slot}`, {
      height: '100%', width: '100%', videoId,
      // mute d'office pour le préchargement : pas un instant du titre suivant à voix haute
      playerVars: { autoplay: 1, mute: slot === active ? 0 : 1, controls: 1, enablejsapi: 1, start: startSeconds, rel: 0, modestbranding: 1 },
      events: {
        onReady: (e) => {
          if (slot === active) applyVolume(e.target);
          else e.target.mute();
          e.target.playVideo();
        },
        onStateChange: (e) => onState(slot, e.data),
      },
    });
  }

  function onState(slot, state) {
    if (slot !== active) {
      // Lecteur de préchargement : un instant de lecture muette lance la mise
      // en mémoire tampon, puis pause.
      if (state === 1) { try { yt[slot].pauseVideo(); } catch { /* YT pas prêt */ } }
      return;
    }
    if (state === 1 /* PLAYING */) {
      applyVolume(yt[slot]);
      startMediaGuard();
      onMusicReady?.();
      if (!activePlaying) {
        activePlaying = true;
        // Le titre en cours remplit son tampon avant qu'on charge le suivant
        clearTimeout(_preloadTimer);
        _preloadTimer = setTimeout(startPreload, 3000);
      }
    }
    if (state === 0 /* ENDED */ || state === 2 /* PAUSED */) stopMediaGuard();
  }

  function startPreload() {
    if (!preload || preload.go) return;
    preload.go = true;
    const { slot, videoId, startSeconds } = preload;
    whenYT(() => {
      if (!yt[slot]) return makePlayer(slot, videoId, startSeconds);
      yt[slot].mute();
      yt[slot].loadVideoById({ videoId, startSeconds, suggestedQuality: 'medium' });
    });
  }

  export function preloadVideo(videoId, startSeconds) {
    preload = { videoId, startSeconds, slot: 1 - active, go: false };
    // Au lobby rien ne joue : on charge tout de suite
    if (activePlaying || !yt[active]) startPreload();
  }

  const _FAKE_META = { title: '♪ ♪ ♪', artist: '???', album: 'ZIK - Blind Test', artwork: [{ src: '/favicon/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' }] };

  function startMediaGuard() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata(_FAKE_META);
    navigator.mediaSession.playbackState = 'playing';
    clearInterval(_metaGuardInterval);
    _metaGuardInterval = setInterval(() => {
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.metadata = new MediaMetadata(_FAKE_META);
      navigator.mediaSession.playbackState = 'playing';
    }, 500);
  }

  function stopMediaGuard() {
    clearInterval(_metaGuardInterval);
    _metaGuardInterval = null;
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
  }

  function initYT() {
    if (window.YT?.Player) { ytReady = true; return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => { ytReady = true; };
  }

  export function loadVideo(videoId, startSeconds) {
    currentStartSecs = startSeconds;
    activePlaying = false;
    clearTimeout(_preloadTimer);
    if (preload?.go && preload.videoId === videoId && yt[preload.slot]) {
      const old = active;
      active = preload.slot;
      preload = null;
      try { yt[old]?.pauseVideo(); } catch { /* YT pas prêt */ }
      const p = yt[active];
      try { applyVolume(p); p.seekTo(startSeconds, true); p.playVideo(); } catch { /* YT pas prêt */ }
      return;
    }
    if (preload?.videoId === videoId) preload = null;
    whenYT(() => {
      const p = yt[active];
      if (!p) return makePlayer(active, videoId, startSeconds);
      p.loadVideoById({ videoId, startSeconds, suggestedQuality: 'medium' });
      setTimeout(() => { try { p.playVideo(); } catch { /* YT pas prêt */ } }, 400);
    });
  }

  export function pauseVideo() {
    try { yt[active]?.pauseVideo(); } catch { /* YT pas prêt */ }
  }

  export function resumeVideo() {
    try { yt[active]?.playVideo(); } catch { /* YT pas prêt */ }
  }

  export function revealVideo() {
    const p = yt[active];
    if (!p) return;
    try { p.seekTo(currentStartSecs, true); p.playVideo(); } catch { /* YT pas prêt */ }
  }


  function qrUrl(size = 200) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent('https://www.zik-music.fr/salon/play?code=' + code)}&bgcolor=ffffff&color=000000`;
  }

  onMount(initYT);
  onDestroy(() => { yt.forEach(p => p?.destroy?.()); clearTimeout(_preloadTimer); stopMediaGuard(); _revealTimers.forEach(clearTimeout); });
</script>

<div class="sh-stage">
  <div id="salon-yt-player">
    {#each [0, 1] as slot (slot)}
      <div class="salon-yt-slot" class:on={slot === active}><div id="salon-yt-{slot}"></div></div>
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
      <div class="sh-qr"><img src={qrUrl(320)} alt="QR code pour rejoindre" width="320" height="320"></div>
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

  <section class="sh-layer sh-over" class:on={phase === 'gameover'}>
    {#if winner}
      <div class="sh-over-grid">
        <div class="sh-winner" class:on={revealStep >= 3} style="--tc:{winner.team != null ? `var(--q${winner.team})` : 'var(--accent)'}">
          <p class="sx-kicker">{finalTeams ? 'Équipe gagnante' : 'Vainqueur'} · {gameOver?.rounds ?? total} manches</p>
          <div class="sh-winner-name">{winner.name}</div>
          <div class="sh-winner-pts">{winner.score}<small>{finalTeams ? 'pts de moyenne' : 'pts'}</small></div>
          <dl class="sh-awards">
            {#if finalTeams && bestPlayer}
              <div><dt>Meilleur joueur</dt><dd>{bestPlayer.username} <small>{bestPlayer.score} pts</small></dd></div>
            {/if}
            {#if fastest?.first > 0}
              <div><dt>Le plus rapide</dt><dd>{fastest.username} <small>{fastest.first} fois premier</small></dd></div>
            {/if}
            {#if steadiest?.found > 0}
              <div><dt>Le plus régulier</dt><dd>{steadiest.username} <small>{steadiest.found} titre{steadiest.found > 1 ? 's' : ''} trouvé{steadiest.found > 1 ? 's' : ''}</small></dd></div>
            {/if}
          </dl>
        </div>

        <div class="sh-podium">
          {#each podiumSlots as slot (slot.pos)}
            <div class="sh-po p{slot.pos}" class:on={slot.e && revealStep >= slot.step} style="--tc:{slot.e?.team != null ? `var(--q${slot.e.team})` : 'var(--text)'}">
              {#if slot.e}
                <span class="sh-po-name">{slot.e.name}</span>
                <span class="sh-po-pts">{slot.e.score} pts · {slot.e.sub}</span>
              {/if}
              <div class="sh-po-block"><span>{slot.pos}</span></div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if gameOver?.history?.length}
      <div class="sh-tracks" class:on={revealStep >= 4}>
        <p class="sx-kicker">La playlist de la partie</p>
        <ol>
          {#each gameOver.history as h, i (i)}
            <li title={h.answer}>
              {#if h.cover}<img src={h.cover} alt="">{:else}<span></span>{/if}
              <small>{String(i + 1).padStart(2, '0')}</small>
            </li>
          {/each}
        </ol>
      </div>
    {/if}

    <div class="sh-next">
        <p class="sx-kicker">Prochaine partie</p>
        <div class="sh-next-row">
          <div class="sh-seg" role="radiogroup" aria-label="Réponses">
            <button class:on={settings.answerMode === 'free'} onclick={() => onSetting({ answerMode: 'free' })}>Texte libre</button>
            <button class:on={settings.answerMode === 'multiple'} onclick={() => onSetting({ answerMode: 'multiple' })}>4 choix</button>
          </div>
          <div class="sh-seg" role="radiogroup" aria-label="Équipes">
            <!-- Écran public : on ne montre que ce que le salon peut faire -->
            {#each [[0, 'Solo'], [2, '2 équipes'], [3, '3'], [4, '4'], [6, '6'], [8, '8']].filter(([n]) => pro || n <= FREE_MAX_TEAMS) as [n, label] (n)}
              <button class:on={(settings.teams?.length ?? 0) === n} onclick={() => onSetting({ teamCount: n })}>{label}</button>
            {/each}
          </div>
          <div class="sh-seg" role="radiogroup" aria-label="Manches">
            {#each [5, 10, 15, 20] as n (n)}
              <button class:on={settings.maxRounds === n} onclick={() => onSetting({ maxRounds: n })}>{n} manches</button>
            {/each}
          </div>
        </div>
      </div>
      <div class="sh-over-actions">
        <button class="sx-btn sx-btn-primary" onclick={onRestart}>Rejouer</button>
        {#if onChangePlaylists}
          <button class="sx-btn" onclick={onChangePlaylists}>Changer de playlist</button>
        {/if}
        <button class="sx-btn" onclick={onNewSalon}>Nouveau salon</button>
      </div>
  </section>

  {#if paused}
    <div class="sh-pause"><span>Pause</span><small>La partie reprend dans un instant</small></div>
  {/if}
</div>

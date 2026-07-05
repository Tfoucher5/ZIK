<script>
  import { onMount, onDestroy } from 'svelte';

  let {
    phase = 'lobby', code = '', timerVal = 0, timerMax = 30,
    currentPhrase = '', players = [],
    roundEnd = null, finalScores = [],
    round = 0, total = 10,
    choices = null, answerMode = 'free',
    onRestart, onNewSalon, onMusicReady,
  } = $props();

  const VIS_BARS = Array.from({ length: 18 }, (_, i) => i);
  const SIDE_BARS = Array.from({ length: 6 }, (_, i) => i);
  const TRUSS_LIGHTS = Array.from({ length: 10 }, (_, i) => i);

  function hue(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
  }

  // Podium : [2e, 1er, 3e] avec l'étape de reveal associée
  let podiumSlots = $derived([
    { p: finalScores[1], pos: 2, step: 2, medal: '🥈' },
    { p: finalScores[0], pos: 1, step: 3, medal: '🥇' },
    { p: finalScores[2], pos: 3, step: 1, medal: '🥉' },
  ]);

  // ─── Podium reveal ─────────────────────────────────────────────────────────
  let revealStep = $state(0);
  let _revealTimers = [];

  $effect(() => {
    if (phase === 'gameover') {
      revealStep = 0;
      _revealTimers.forEach(clearTimeout);
      _revealTimers = [];
      _revealTimers.push(setTimeout(() => { revealStep = 1; }, 600));
      _revealTimers.push(setTimeout(() => { revealStep = 2; }, 2100));
      _revealTimers.push(setTimeout(() => { revealStep = 3; launchConfetti(); }, 3900));
    } else {
      _revealTimers.forEach(clearTimeout);
      _revealTimers = [];
      revealStep = 0;
    }
  });

  function launchConfetti() {
    if (typeof document === 'undefined') return;
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    const colors = ['#fbbf24','#a855f7','#3b82f6','#10b981','#f43f5e','#06b6d4','#e879f9','#84cc16'];
    for (let i = 0; i < 160; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `left:${Math.random()*100}%;background:${colors[Math.floor(Math.random()*colors.length)]};animation-delay:${Math.random()*2}s;animation-duration:${2.5+Math.random()*3}s;width:${5+Math.random()*8}px;height:${6+Math.random()*10}px;transform:rotate(${Math.random()*360}deg);border-radius:${Math.random()>0.5?'50%':'2px'};`;
      container.appendChild(el);
    }
    setTimeout(() => { if (container.parentNode) container.remove(); }, 8000);
  }

  // ─── YouTube ───────────────────────────────────────────────────────────────
  let ytReady = false;
  let ytPlayer;
  let currentStartSecs = 0;
  let _metaGuardInterval = null;

  const _FAKE_META = { title: '♪ ♪ ♪', artist: '???', album: 'ZIK — Blind Test', artwork: [{ src: '/favicon/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' }] };

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
    if (ytReady && ytPlayer) {
      ytPlayer.loadVideoById({ videoId, startSeconds, suggestedQuality: 'medium' });
      setTimeout(() => { try { ytPlayer.playVideo(); } catch { /* YT not ready */ } }, 400);
    } else {
      const check = setInterval(() => {
        if (!ytReady) return;
        clearInterval(check);
        ytPlayer = new window.YT.Player('salon-yt-player', {
          height: '100%', width: '100%', videoId,
          playerVars: { autoplay: 1, controls: 1, enablejsapi: 1, start: startSeconds, rel: 0, modestbranding: 1 },
          events: {
            onReady: (e) => e.target.playVideo(),
            onStateChange: (e) => {
              if (e.data === 1 /* PLAYING */) {
                startMediaGuard();
                onMusicReady?.();
              }
              if (e.data === 0 /* ENDED */ || e.data === 2 /* PAUSED */) {
                stopMediaGuard();
              }
            },
          },
        });
      }, 200);
    }
  }

  export function revealVideo() {
    if (!ytPlayer) return;
    try { ytPlayer.seekTo(currentStartSecs, true); ytPlayer.playVideo(); } catch { /* YT not ready */ }
  }

  function timerPct() { return timerMax ? Math.max(0, (timerVal / timerMax) * 100) : 100; }

  function qrUrl(size = 200) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent('https://www.zik-music.fr/salon/play?code=' + code)}&bgcolor=ffffff&color=000000`;
  }

  onMount(initYT);
  onDestroy(() => { if (ytPlayer?.destroy) ytPlayer.destroy(); stopMediaGuard(); _revealTimers.forEach(clearTimeout); });
</script>

<div class="salon-host-center">

  <!-- Scène de festival ZIK : truss, faisceaux, 3 écrans, plancher -->
  <div
    class="salon-host-stage"
    class:warn={phase === 'round' && timerPct() < 40 && timerPct() >= 20}
    class:danger={phase === 'round' && timerPct() < 20}
  >

    <div class="fest-truss" aria-hidden="true">
      {#each TRUSS_LIGHTS as i (i)}<i style="--i:{i}"></i>{/each}
    </div>
    <div class="fest-beams" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>

    <div class="fest-row">

      <!-- Écran latéral gauche : rediffusion -->
      <div class="fest-side fest-side-l">
        <div class="fest-screen">
          {#if phase === 'summary' && roundEnd?.cover}
            <img src={roundEnd.cover} alt="" class="fest-side-cover">
          {:else}
            <div class="fest-side-eq" aria-hidden="true">
              {#each SIDE_BARS as i (i)}<i></i>{/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Enceintes gauches -->
      <div class="fest-speaker" aria-hidden="true"><i></i><i></i></div>

      <!-- Écran principal : le player vidéo vit ici en permanence -->
      <div class="fest-main">
        <div class="fest-screen fest-main-screen">
          <span class="fest-tag" class:live={phase === 'round'}>
            <i></i>{phase === 'summary' || phase === 'gameover' ? 'Replay' : phase === 'round' ? 'On air' : 'Backstage'}
          </span>

          <div id="salon-yt-player"></div>

          <!-- Lobby sur l'écran -->
          <div class="fest-content" class:active={phase === 'lobby' || phase === 'starting'}>
            <div class="fest-lobby">
              <div class="salon-lobby-qr-wrap">
                <img src={qrUrl(260)} alt="QR code" width="260" height="260" class="salon-lobby-qr">
              </div>
              <div class="fest-lobby-info">
                <div class="salon-code-label">Rejoindre</div>
                <div class="salon-lobby-code">
                  {#each code.split('') as ch, i (i)}<b>{ch}</b>{/each}
                </div>
                <div class="salon-lobby-url">zik-music.fr/salon/play?code={code}</div>
                <div class="salon-lobby-count">
                  <span class="salon-player-count">{players.length}</span>
                  <span class="salon-lobby-title">joueur{players.length !== 1 ? 's' : ''} connecté{players.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Visuels VJ pendant la manche -->
          <div class="fest-content" class:active={phase === 'round'}>
            <div class="salon-visualizer">
              {#each VIS_BARS as i (i)}<div class="salon-vis-bar"></div>{/each}
            </div>
            <div class="salon-notes" aria-hidden="true">
              <span>♪</span><span>♫</span><span>♪</span><span>♩</span><span>♫</span><span>♪</span>
            </div>
            <div class="fest-round">
              <div class="salon-deck" style="--t:{timerPct() / 100}">
                <div class="salon-deck-ring"></div>
                <div class="salon-deck-vinyl"></div>
                <div class="salon-deck-core">
                  <div class="salon-deck-time">{timerVal}</div>
                  <div class="salon-deck-sub">sec</div>
                </div>
              </div>
              <div class="fest-round-txt">
                <div class="salon-phrase">{currentPhrase}</div>
                <div class="salon-answered">
                  <b>{players.filter(p => p.answeredThisRound || p.foundThisRound).length}</b> / {players.length} ont répondu
                </div>
                {#if players.some(p => p.foundThisRound)}
                  <div class="salon-finders">
                    {#each players.filter(p => p.foundThisRound) as p (p.username)}
                      <span class="salon-finder-chip">✓ {p.username}</span>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <!-- Game over sur l'écran -->
          <div class="fest-content" class:active={phase === 'gameover'}>
            <div class="fest-go">
              <div class="fest-go-kicker">Partie terminée</div>
              <h2 class="fest-go-title">🏆 {finalScores[0]?.username ?? '—'} gagne !</h2>
              {#if finalScores.length > 3}
                <div class="fest-go-rest">
                  {#each finalScores.slice(3) as p, i (p.username)}
                    <div class="lb-row" style="--i:{i}">
                      <span class="lb-rank">{String(i + 4).padStart(2, '0')}</span>
                      <span class="lb-name">{p.username}</span>
                      <span class="lb-pts">{p.score}</span>
                    </div>
                  {/each}
                </div>
              {/if}
              <div class="salon-gameover-actions">
                <button class="btn-salon-start" onclick={onRestart}>🔄 Rejouer</button>
                <button class="btn-salon-next" onclick={onNewSalon}>Nouveau salon</button>
              </div>
            </div>
          </div>

          <!-- Reveal : lower third broadcast sur l'écran -->
          {#if phase === 'summary' && roundEnd}
            <div class="salon-lower-third">
              {#if roundEnd.cover}
                <img src={roundEnd.cover} alt="" class="lt-cover">
              {/if}
              <div class="lt-txt">
                <div class="lt-kicker">{roundEnd.reason} — Manche {round} / {total}</div>
                <div class="lt-answer">{roundEnd.answer}</div>
                {#if roundEnd.featArtists?.length}
                  <div class="lt-feat">feat. {roundEnd.featArtists.join(', ')}</div>
                {/if}
              </div>
              {#if roundEnd.firstFinder}
                <div class="lt-first">🏆 {roundEnd.firstFinder}</div>
              {/if}
            </div>
          {/if}
        </div>
      </div>

      <!-- Enceintes droites -->
      <div class="fest-speaker" aria-hidden="true"><i></i><i></i></div>

      <!-- Écran latéral droit : chrono géant / classement -->
      <div class="fest-side fest-side-r">
        <div class="fest-screen">
          {#if phase === 'summary' && roundEnd}
            <div class="fest-side-lb">
              <div class="lb-kicker">Classement</div>
              {#each (roundEnd.scores || players).slice(0, 5) as p, i (p.username)}
                <div class="lb-row" class:first={i === 0} style="--i:{i}">
                  <span class="lb-rank">{String(i + 1).padStart(2, '0')}</span>
                  <span class="lb-name">{p.username}</span>
                  <span class="lb-pts">
                    {p.score}
                    {#if p.delta > 0}<b>+{p.delta}</b>{/if}
                  </span>
                </div>
              {/each}
            </div>
          {:else if phase === 'round'}
            <div class="fest-side-timer">
              <b>{timerVal}</b>
              <span>sec</span>
            </div>
          {:else}
            <div class="fest-side-eq" aria-hidden="true">
              {#each SIDE_BARS as i (i)}<i></i>{/each}
            </div>
          {/if}
        </div>
      </div>

    </div>

    <!-- QCM sur le devant de scène -->
    {#if phase === 'round' && answerMode === 'multiple' && choices && timerVal > 0}
      <div class="salon-choices salon-host-choices">
        {#each choices as choice, i (i)}
          <div class="salon-choice-btn c{i}">
            <span class="choice-shape"></span>
            <span class="choice-text">{choice}</span>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Podium sur la scène : les gagnants y montent, personnages bras levés -->
    {#if phase === 'gameover'}
      <div class="fest-podium">
        {#each podiumSlots as slot (slot.pos)}
          <div class="fest-podium-slot">
            {#if slot.p}
              <div
                class="fest-podium-p"
                class:revealed={revealStep >= slot.step}
                style="--h:{hue(slot.p.username)}"
              >
                <span class="crowd-name">{slot.p.username}</span>
                <span class="crowd-pts">{slot.p.score}<small>pt</small></span>
                <div class="crowd-fig">
                  <i class="crowd-arm l"></i>
                  <i class="crowd-arm r"></i>
                  <i class="crowd-head"></i>
                  <i class="crowd-torso"></i>
                </div>
              </div>
            {/if}
            <div class="fest-podium-block pos-{slot.pos}">{slot.medal}</div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Devant de scène -->
    <div class="fest-stagefront" aria-hidden="true">
      <span>ZIK Festival</span>
    </div>
  </div>

</div>

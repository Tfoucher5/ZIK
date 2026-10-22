<script>
  /** Barre du haut de l'écran TV : QR code pour rejoindre, manche, pause, volume, régie. */
  import { salonQrUrl } from '$lib/client/salonClient.js';

  let { h } = $props();
</script>

<header class="sh-top">
  <a class="sh-brand" href="/" title="Retour au site">ZIK <span>Salon</span></a>
  <div class="sh-join">
    <img src={salonQrUrl(h.code, 100)} alt="" width="44" height="44">
    <div>
      <div class="sh-join-url">zik-music.fr/salon/play</div>
      <div class="sh-join-code">{h.code}</div>
    </div>
  </div>
  <div class="sh-top-right">
    {#if h.phase === 'round' || h.phase === 'summary'}
      <span class="sh-round">Manche <b>{h.round} / {h.total}</b></span>
      {#if h.phase === 'summary' && !h.paused && (h.settings.manualNext || h.autoNextSec > 0)}
        {#if !h.settings.manualNext}<span class="sh-round">Suite dans <b>{h.autoNextSec} s</b></span>{/if}
        <button class="sx-btn sh-regie-btn" onclick={h.nextRound}>{h.settings.manualNext ? 'Manche suivante' : 'Maintenant'}</button>
      {/if}
      <button class="sh-icon-btn" onclick={h.togglePause} title={h.paused ? 'Reprendre' : 'Pause'} aria-label={h.paused ? 'Reprendre' : 'Pause'}>{h.paused ? '▶' : '❚❚'}</button>
    {/if}
    <div class="sh-vol">
      <button
        class="sh-icon-btn"
        aria-label={h.volume === 0 ? 'Réactiver le son' : 'Couper le son'}
        onclick={() => h.applyVolume(h.volume === 0 ? 100 : 0)}
      >{h.volume === 0 ? '🔇' : '🔊'}</button>
      <input
        type="range" min="0" max="100" step="5"
        value={h.volume}
        aria-label="Volume"
        oninput={(e) => h.applyVolume(parseInt(e.target.value))}
      />
    </div>
    {#if h.canChangePlaylists && h.phase !== 'starting'}
      <button class="sh-icon-btn" title="Changer de playlist" aria-label="Changer de playlist" onclick={h.openPicker}>♫</button>
    {/if}
    <button class="sh-icon-btn" title="Appeler un admin ZIK" aria-label="Appeler un admin" onclick={() => (h.helpOpen = true)}>?</button>
    <a class="sx-btn sh-regie-btn" href="/salon/regie?code={h.code}" target="_blank" rel="noopener" title="Piloter la soirée depuis un autre écran">Régie</a>
  </div>
</header>

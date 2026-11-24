<script>
  /**
   * Barre du haut de l'écran TV : QR code pour rejoindre, manche, pause, volume, régie.
   * En lobby, pendant les manches et en fin de partie, les réglages de l'hôte se cachent après 5 s sans geste
   * (`calm`, remonté à la page pour cacher le curseur) ; QR, manche, aide et régie restent.
   */
  import { onDestroy } from 'svelte';
  import { salonPlayUrl } from '#lib/client/salonClient.js';
  import QrCode from '../QrCode.svelte';
  import HostSounds from './HostSounds.svelte';
  import { IDLE_MS, barCalm, calmable, isLive } from './hostCalm.js';

  let { h, calm = $bindable(false) } = $props();

  const HINT_MS = 6000;

  let idle = $state(false);
  let soundsOpen = $state(false);
  let hint = $state('');
  let hintDone = false;
  let idleTimer;
  let hintTimer;

  let live = $derived(isLive(h.phase));
  let regie = $derived(
    h.controls > 1 ? `${h.controls} régies connectées` : h.controls === 1 ? 'Régie connectée' : '',
  );

  function wake() {
    idle = false;
    clearTimeout(idleTimer);
    // Un panneau Sons oublié ne reste pas par-dessus la vidéo
    idleTimer = setTimeout(() => {
      idle = true;
      soundsOpen = false;
    }, IDLE_MS);
  }

  $effect(() => {
    if (calmable(h.phase)) wake();
  });

  $effect(() => {
    calm = barCalm(h, idle);
  });

  // Indice une fois par ouverture de la TV, au premier masquage
  $effect(() => {
    if (!calm) {
      hint = '';
      return;
    }
    if (hintDone) return;
    hintDone = true;
    hint = matchMedia('(pointer: coarse)').matches
      ? "Touchez l'écran pour afficher les réglages"
      : 'Bougez la souris ou appuyez sur une touche pour afficher les réglages';
    hintTimer = setTimeout(() => (hint = ''), HINT_MS);
  });

  onDestroy(() => {
    clearTimeout(idleTimer);
    clearTimeout(hintTimer);
  });
</script>

<svelte:window onmousemove={wake} onpointerdown={wake} onkeydown={wake} />

<header class="sh-top" class:calm>
  <a class="sh-brand sh-fade" href="/" title="Retour au site">ZIK <span>Soirée</span></a>
  {#if !['lobby', 'starting', 'gameover'].includes(h.phase)}
    <div class="sh-join">
      <QrCode text={salonPlayUrl(h.code)} size={44} />
      <div>
        <div class="sh-join-url">zik-music.fr</div>
        <div class="sh-join-code">{h.code}</div>
      </div>
    </div>
  {/if}
  <div class="sh-top-right">
    {#if live}
      <span class="sh-round">Manche <b>{h.round} / {h.total}</b></span>
      {#if h.phase === 'summary' && !h.paused && (h.settings.manualNext || h.nextSec > 0)}
        <button class="sx-btn sh-regie-btn" class:sh-fade={!h.settings.manualNext} onclick={h.nextRound}>Manche suivante</button>
      {/if}
      <button class="sh-icon-btn sh-fade" onclick={h.togglePause} title={h.paused ? 'Reprendre' : 'Pause'} aria-label={h.paused ? 'Reprendre' : 'Pause'}>{h.paused ? '▶' : '❚❚'}</button>
    {/if}
    <div class="sh-vol sh-fade">
      <button
        class="sh-icon-btn"
        aria-label={h.volume === 0 ? 'Remettre le son' : 'Couper le son'}
        onclick={h.toggleMute}
      >{h.volume === 0 ? '🔇' : '🔊'}</button>
      <input
        type="range" min="0" max="100" step="5"
        value={h.volume}
        aria-label="Volume de la TV"
        oninput={(e) => h.applyVolume(parseInt(e.target.value))}
      />
    </div>
    <div class="sh-fade">
      <HostSounds bind:open={soundsOpen} settings={h.settings} onSet={(patch) => h.socket?.emit('salon_update_settings', patch)} />
    </div>
    {#if h.canChangePlaylists && h.phase !== 'starting'}
      <button class="sh-icon-btn sh-fade" title="Changer de playlist" aria-label="Changer de playlist" onclick={h.openPicker}>♫</button>
    {/if}
    <button class="sh-icon-btn" title="Un admin ZIK répond en direct" aria-label="Appeler un admin ZIK" onclick={() => (h.helpOpen = true)}>?</button>
    {#if regie}<span class="sh-regie-ok">{regie}</span>{/if}
    <a
      class="sx-btn sh-regie-btn"
      href="/salon/regie?code={h.code}"
      target="_blank"
      rel="noopener"
      title="Piloter la soirée depuis un autre écran"
      aria-label={regie ? `Ouvrir la régie. ${h.controls > 1 ? `${h.controls} régies sont connectées` : 'Une régie est connectée'}.` : undefined}
    >Régie</a>
  </div>
</header>

{#if hint}<p class="sh-hint" role="status">{hint}</p>{/if}

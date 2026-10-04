<script>
  import { fly } from 'svelte/transition';
  import Card from './Card.svelte';
  import { viewer, stepCard, closeCard } from './cardViewer.svelte.js';
  import { requestGyro } from './cardTilt.js';
  import { shareCard } from './shareCard.js';

  let dialog = $state();
  let flipped = $state(false);
  let discOut = $state(false);
  let gyro = $state(false);
  let sharing = $state(false);
  let shareMsg = $state('');
  let returnFocus = null;
  let swipe = null;

  const card = $derived(viewer.list[viewer.index]);
  const many = $derived(viewer.list.length > 1);

  // La visionneuse ne s'ouvre que côté client : window existe alors toujours.
  const gyroAvailable =
    typeof window !== 'undefined' && 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches;

  $effect(() => {
    if (card && !dialog.open) {
      returnFocus = document.activeElement;
      dialog.showModal();
    } else if (!card && dialog.open) {
      dialog.close();
    }
  });

  function go(delta) {
    stepCard(delta);
    flipped = false;
    discOut = false;
  }

  function onClose() {
    closeCard();
    flipped = false;
    discOut = false;
    gyro = false;
    returnFocus?.focus();
  }

  function onKeydown(e) {
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === ' ' && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      flipped = !flipped;
    }
  }

  function onPointerDown(e) {
    swipe = e.target.closest('.zc') ? null : { x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e) {
    if (!swipe) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    else if (dy > 90) dialog.close();
    else if (Math.hypot(dx, dy) < 6 && (e.target === dialog || e.target.classList.contains('cv-stage')))
      dialog.close();
  }

  async function share() {
    sharing = true;
    const result = await shareCard(card);
    sharing = false;
    shareMsg = result === 'downloaded' ? 'Image téléchargée, texte copié pour la partager' : '';
    if (shareMsg) setTimeout(() => (shareMsg = ''), 4000);
  }

  async function toggleGyro() {
    gyro = gyro ? false : await requestGyro();
  }
</script>

<dialog
  bind:this={dialog}
  class="cv"
  aria-label="Carte en grand"
  onclose={onClose}
  onkeydown={onKeydown}
  onpointerdown={onPointerDown}
  onpointerup={onPointerUp}
>
  {#if card}
    <div class="cv-stage">
      {#key card.id}
        <div class="cv-card" class:disc-out={discOut} in:fly={{ x: viewer.dir * 80, duration: 260 }}>
          <Card {card} size="xl" motion="full" face={flipped ? 'back' : 'front'} {discOut} {gyro} />
        </div>
      {/key}
    </div>

    <div class="cv-bar">
      {#if many}
        <button type="button" class="cv-btn cv-icon" aria-label="Carte précédente" onclick={() => go(-1)}>‹</button>
      {/if}
      <button type="button" class="cv-btn" onclick={() => (flipped = !flipped)}>
        {flipped ? 'Voir le recto' : 'Retourner'}
      </button>
      <button type="button" class="cv-btn" disabled={flipped} onclick={() => (discOut = !discOut)}>
        {discOut ? 'Ranger le disque' : 'Sortir le disque'}
      </button>
      {#if card.shareImage}
        <button type="button" class="cv-btn cv-share" disabled={sharing} onclick={share}>
          {sharing ? 'Préparation…' : 'Partager'}
        </button>
      {/if}
      {#if gyroAvailable}
        <button type="button" class="cv-btn" aria-pressed={gyro} onclick={toggleGyro}>
          {gyro ? 'Gyroscope activé' : 'Incliner le téléphone'}
        </button>
      {/if}
      {#if many}
        <button type="button" class="cv-btn cv-icon" aria-label="Carte suivante" onclick={() => go(1)}>›</button>
      {/if}
    </div>

    {#if shareMsg}<p class="cv-toast" role="status">{shareMsg}</p>{/if}
    {#if many}<p class="cv-count">{viewer.index + 1} / {viewer.list.length}</p>{/if}
    <button type="button" class="cv-btn cv-icon cv-close" aria-label="Fermer" onclick={() => dialog.close()}>×</button>
  {/if}
</dialog>

<style>
  .cv {
    width: 100vw;
    max-width: none;
    height: 100dvh;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: #f5f3f8;
    overflow: hidden;
    touch-action: none;
  }

  .cv::backdrop {
    background: radial-gradient(circle at 50% 40%, rgb(30 24 40 / 0.82), rgb(4 4 6 / 0.94));
    backdrop-filter: blur(10px);
  }

  .cv[open] {
    display: grid;
    grid-template-rows: 1fr auto auto auto;
    justify-items: center;
    gap: 14px;
    padding: 24px 16px 22px;
  }

  :global(html:has(dialog.cv[open])) {
    overflow: hidden;
  }

  .cv-stage {
    display: grid;
    place-items: center;
    width: 100%;
    min-height: 0;
  }

  .cv-card {
    transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .cv-card.disc-out {
    transform: translateX(-17%);
  }

  .cv-bar {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .cv-btn {
    min-height: 40px;
    padding: 0 16px;
    border: 1px solid rgb(255 255 255 / 0.16);
    border-radius: 99px;
    background: rgb(255 255 255 / 0.07);
    color: inherit;
    font: 600 15px/1 'Barlow', sans-serif;
    cursor: pointer;
    transition: background 0.2s;
  }

  .cv-btn:hover:not(:disabled) {
    background: rgb(255 255 255 / 0.14);
  }

  .cv-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .cv-btn:focus-visible {
    outline: 2px solid var(--rarity-mythic);
    outline-offset: 2px;
  }

  .cv-btn[aria-pressed='true'] {
    background: rgb(255 79 200 / 0.25);
  }

  .cv-share {
    border-color: transparent;
    background: var(--rarity-mythic);
    color: #2a0420;
  }

  .cv-share:hover:not(:disabled) {
    background: color-mix(in oklab, var(--rarity-mythic) 85%, white);
  }

  .cv-toast {
    margin: 0;
    padding: 8px 14px;
    border-radius: 99px;
    background: rgb(255 255 255 / 0.1);
    font: 500 14px/1.2 'Barlow', sans-serif;
  }

  .cv-icon {
    width: 40px;
    padding: 0;
    font-size: 22px;
  }

  .cv-count {
    margin: 0;
    font: 500 13px/1 'Barlow', sans-serif;
    color: rgb(255 255 255 / 0.5);
    font-variant-numeric: tabular-nums;
  }

  .cv-close {
    position: absolute;
    top: 16px;
    right: 16px;
  }
</style>

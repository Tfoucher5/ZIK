<script>
  /**
   * QR en grand, demandé depuis la régie (ou la TV seule) : il remplace l'écran
   * jusqu'à ce que l'hôte le referme ou lance la partie. TV seule (`onClose`) :
   * Échap ou un clic sur le QR le referme.
   */
  import { salonPlayUrl } from '#lib/client/salonClient.js';
  import QrCode from '../QrCode.svelte';
  import CodeTiles from './CodeTiles.svelte';

  let { code, onClose = null } = $props();

  // Le focus suit l'écran qui s'ouvre (clavier de la TV seule, lecteur d'écran)
  const focus = (node) => (node.querySelector('button') ?? node).focus();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose?.()} />

<section class="qg sh-tv" aria-label="Rejoindre la partie" tabindex="-1" use:focus>
  {#if onClose}
    <button class="qr" type="button" onclick={onClose} aria-label="Refermer le QR">
      <QrCode text={salonPlayUrl(code)} />
    </button>
  {:else}
    <div class="qr"><QrCode text={salonPlayUrl(code)} label="QR code pour rejoindre la partie" /></div>
  {/if}
  <div>
    <p class="k"><i></i>Pour rejoindre la partie</p>
    <h1>Scannez<br />pour jouer</h1>
    <p class="u">ou tapez ce code sur <b>zik-music.fr</b></p>
    <div class="cm"><CodeTiles {code} size="5.4em" /></div>
  </div>
</section>

<style>
  .qg {
    position: absolute;
    inset: 0;
    z-index: 6;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 3.75em;
    align-items: center;
    padding: 1.4em 3.33em 1.8em;
    overflow: hidden;
    background: radial-gradient(90% 80% at 30% 0%, #1b0a20, #060608 70%);
  }
  .qr {
    height: min(43.8em, 100%);
    aspect-ratio: 1;
    padding: 2.3em;
    border: 0;
    border-radius: 1.45em;
    background: #fff;
    animation: monte 0.5s cubic-bezier(0.2, 1.3, 0.4, 1);
  }
  button.qr {
    cursor: pointer;
  }
  .k {
    display: flex;
    align-items: center;
    gap: 0.53em;
    font-family: var(--s-mono);
    font-size: 1.56em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--soft, #d6d7e4);
  }
  .k i {
    width: 0.47em;
    height: 0.47em;
    border-radius: 50%;
    background: var(--accent);
  }
  h1 {
    margin-top: 0.12em;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 9.4em;
    line-height: 0.86;
    text-transform: uppercase;
  }
  .u {
    margin-top: 0.68em;
    font-size: 2.3em;
    line-height: 1.2;
    color: var(--soft, #d6d7e4);
  }
  .u b {
    color: var(--text);
    font-weight: 600;
  }
  .cm {
    margin-top: 1.35em;
  }
  @keyframes monte {
    from {
      opacity: 0;
      transform: translateY(1.5em) scale(0.8);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .qr {
      animation: none;
    }
  }
  @media (max-aspect-ratio: 1/1) {
    .qg {
      grid-template-columns: 1fr;
      font-size: 2.4vw;
      padding: 1.5em;
    }
    .qr {
      width: 100%;
      height: auto;
    }
  }
</style>

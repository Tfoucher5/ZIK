<script>
  /**
   * Bande du bas de la fin de partie : « Gardez vos téléphones. », ou « Une autre ! »
   * avec sa jauge dès qu'un joueur en redemande ; le code et le QR pour les retardataires.
   * TV seule (`onQr`) : un clic sur le QR l'affiche en grand.
   */
  import { salonPlayUrl } from '#lib/client/salonClient.js';
  import QrCode from '../QrCode.svelte';
  import CodeTiles from './CodeTiles.svelte';

  let { code, encore, onQr = null } = $props();
</script>

<footer class="bd">
  <div class="g" aria-live="polite">
    {#if encore.n}
      <h2>Une autre&nbsp;!</h2>
      <!-- TV seule : le bouton de la partie suivante est le seul magenta -->
      <span class="jauge" class:sobre={onQr}><i style="--p:{encore.of ? encore.n / encore.of : 0}"></i></span>
      <p><b>{encore.n}</b> sur {encore.of} en redemandent. Gardez vos téléphones.</p>
    {:else}
      <h2>Gardez vos téléphones.</h2>
    {/if}
  </div>
  <div class="d">
    <p>Pas encore dans la partie&nbsp;? Scannez, ou tapez ce code sur <b>zik-music.fr</b>.</p>
    <CodeTiles {code} />
    {#if onQr}
      <button class="qr" type="button" onclick={onQr} aria-label="Afficher le QR en grand">
        <QrCode text={salonPlayUrl(code)} />
      </button>
    {:else}
      <div class="qr"><QrCode text={salonPlayUrl(code)} label="QR code pour rejoindre la partie" /></div>
    {/if}
  </div>
</footer>

<style>
  .bd {
    flex: none;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2.5em;
    align-items: center;
    height: 9em;
    padding-top: 1.15em;
    border-top: 2px solid rgb(255 255 255 / 0.16);
  }
  h2 {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 3.75em;
    line-height: 0.9;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .g p {
    margin-top: 0.4em;
    font-size: 1.56em;
    line-height: 1.2;
    color: var(--soft, #d6d7e4);
  }
  .g b {
    color: var(--text);
    font-family: var(--s-mono);
  }
  .jauge {
    display: block;
    width: 32em;
    max-width: 100%;
    height: 0.73em;
    margin-top: 0.8em;
    border-radius: 0.36em;
    background: rgb(255 255 255 / 0.16);
    overflow: hidden;
  }
  .jauge i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--violet, #7b5cff), var(--accent));
    transform-origin: 0 50%;
    transform: scaleX(var(--p, 0));
    transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .sobre i {
    background: var(--text);
  }
  .d {
    display: flex;
    align-items: center;
    gap: 1.45em;
  }
  .d p {
    max-width: 11.8em;
    text-align: right;
    font-size: 1.46em;
    line-height: 1.25;
    color: var(--soft, #d6d7e4);
  }
  .d p b {
    color: var(--text);
    font-weight: 600;
  }
  .qr {
    flex: none;
    width: 7.8em;
    padding: 0.52em;
    border: 0;
    border-radius: 0.62em;
    background: #fff;
  }
  button.qr {
    cursor: pointer;
  }
  @media (prefers-reduced-motion: reduce) {
    .jauge i {
      transition: none;
    }
  }
</style>

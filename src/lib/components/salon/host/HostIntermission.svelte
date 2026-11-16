<script>
  import { salonPlayUrl } from '$lib/client/salonClient.js';
  import QrCode from '../QrCode.svelte';
  import CodeTiles from './CodeTiles.svelte';

  /** Entracte : heure de reprise indicative (facultative) et code pour les retardataires. Le classement reste dans la colonne de droite. */
  let { intermission, code } = $props();

  let reprise = $derived(
    intermission.until
      ? new Date(intermission.until).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ')
      : null
  );
</script>

<section class="ent sh-tv" aria-label="Entracte">
  <p class="k"><i></i>On souffle un peu</p>
  <h2>Entracte</h2>
  <!-- Égaliseur à plat : la musique est en pause -->
  <div class="sh-eqz" aria-hidden="true">{#each { length: 30 }, i (i)}<i></i>{/each}</div>
  <p class="quand">{#if reprise}Reprise vers <b>{reprise}</b>{:else}On reprend très vite{/if}</p>
  <div class="suite">
    <div class="qr"><QrCode text={salonPlayUrl(code)} label="QR code pour rejoindre la partie" /></div>
    <div>
      <h3>Gardez vos téléphones.</h3>
      <p>Pas encore dans la partie ? Scannez, ou tapez ce code sur <b>zik-music.fr</b>.</p>
      <div class="cm"><CodeTiles {code} size="2.3em" /></div>
    </div>
  </div>
</section>

<style>
  .ent {
    position: absolute;
    inset: 0;
    z-index: 4;
    container-type: size;
    display: flex;
    flex-direction: column;
    padding: 1.5em 3.33em 3.33em;
    overflow: hidden;
    background: radial-gradient(90% 80% at 30% 0%, #1b0a20, #060608 70%);
  }
  .k {
    display: flex;
    align-items: center;
    gap: 0.5em;
    font-family: var(--s-mono);
    font-size: 1.56em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--soft);
  }
  .k i {
    width: 0.47em;
    height: 0.47em;
    border-radius: 50%;
    background: var(--accent);
    flex: none;
  }
  h2 {
    margin-top: 0.03em;
    padding-top: 0.06em;
    font-family: var(--s-cond);
    font-weight: 900;
    /* Sur un écran étroit, le mot rétrécit au lieu de déborder */
    font-size: min(15.6em, 19cqw);
    line-height: 0.86;
    letter-spacing: -0.015em;
    text-transform: uppercase;
    background: linear-gradient(180deg, #fff 40%, #a8aac0);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .sh-eqz {
    width: min(37.5em, 100%);
    height: 1.35em;
    margin-top: 1.35em;
    gap: 0.52em;
    opacity: 0.55;
  }
  .sh-eqz i {
    transform: scaleY(0.14);
  }
  .quand {
    margin-top: 0.27em;
    font-family: var(--s-cond);
    font-weight: 800;
    font-size: 5em;
    line-height: 1;
    text-transform: uppercase;
  }
  .quand b {
    font-weight: 900;
    font-variant-numeric: tabular-nums;
  }
  .suite {
    margin-top: auto;
    padding-top: 1.35em;
    border-top: 2px solid var(--line-2);
    display: grid;
    grid-template-columns: 10.4em minmax(0, 1fr);
    gap: 1.67em;
    align-items: start;
  }
  .qr {
    padding: 0.62em;
    border-radius: 0.73em;
    background: #fff;
  }
  h3 {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 2.4em;
    line-height: 1;
    text-transform: uppercase;
  }
  .suite p {
    margin-top: 0.3em;
    font-size: 1.46em;
    line-height: 1.25;
    color: var(--soft);
  }
  .suite p b {
    color: var(--text);
    font-weight: 600;
  }
  .cm {
    margin-top: 0.62em;
  }
</style>

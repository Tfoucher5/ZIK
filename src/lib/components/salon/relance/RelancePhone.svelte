<script>
  import Disque from '$lib/components/salon/relance/Disque.svelte';
  import Annonce from '$lib/components/salon/relance/Annonce.svelte';
  import { GARDE, etatDe, textePhone } from '$lib/components/salon/relance/textes.js';

  let { relance } = $props();

  let etat = $derived(etatDe(relance.mode, relance.essai));
  let pause = $derived(relance.mode !== 'auto');
  let t = $derived(textePhone(etat, relance.sec));
  let bouton = $state();

  $effect(() => {
    bouton?.focus({ preventScroll: true });
  });
</script>

<div class="sp">
  <div class="top">
    <span class="logo" aria-hidden="true">ZIK<i></i></span>
    {#if relance.code}<span class="mono">{relance.code}</span>{/if}
  </div>
  <div class="disc">
    <Disque sec={pause ? null : relance.sec} {pause} d="min(108vw, 56svh)" g="min(1.7vw, 0.9svh)" />
  </div>
  <div class="txt">
    <h1>{t.titre}</h1>
    <p>{t.texte}</p>
    {#if relance.joue}
      <p class="garde">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        <span>{GARDE}</span>
      </p>
    {/if}
  </div>
  <div class="act">
    <button
      type="button"
      class="sx-btn"
      class:sx-btn-primary={pause}
      bind:this={bouton}
      onclick={() => relance.maintenant()}>{t.bouton}</button
    >
  </div>
  <Annonce cle={etat} texte="{t.titre} {t.texte}" />
</div>

<style>
  .sp {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    padding: max(1.35em, env(safe-area-inset-top)) 1.35em max(1.7em, env(safe-area-inset-bottom));
    overflow: hidden;
    background: linear-gradient(180deg, #140c1b, #07070b);
    color: var(--text);
    font-size: 17px;
    line-height: 1.5;
  }
  .top {
    position: relative;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .logo {
    display: inline-flex;
    align-items: baseline;
    gap: 0.12em;
    font-family: var(--titre);
    font-weight: 900;
    font-size: 1.5em;
    line-height: 1;
    letter-spacing: 0.05em;
  }
  .logo i {
    width: 0.24em;
    height: 0.24em;
    border-radius: 50%;
    background: var(--text);
  }
  .mono {
    font-family: var(--mono);
    font-weight: 500;
    font-size: 0.76em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .disc {
    position: absolute;
    top: 12.5%;
    left: 50%;
    translate: -50% 0;
  }
  .txt {
    position: relative;
    z-index: 2;
    margin-top: auto;
  }
  h1 {
    font-family: var(--titre);
    font-weight: 900;
    font-size: 3.5em;
    line-height: 0.86;
    letter-spacing: -0.01em;
    text-transform: uppercase;
  }
  .txt p {
    margin-top: 0.75em;
    color: var(--mid);
    text-wrap: pretty;
  }
  .txt .garde {
    display: flex;
    gap: 0.55em;
    align-items: flex-start;
    margin-top: 0.8em;
    color: var(--soft);
    font-weight: 500;
  }
  svg {
    flex: none;
    width: 1.2em;
    height: 1.2em;
    margin-top: 0.16em;
    stroke: var(--success);
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .act {
    position: relative;
    z-index: 2;
    margin-top: 1.5em;
  }
  .sx-btn {
    width: 100%;
    min-height: 52px;
    padding: 0 1.4em;
  }
  .sx-btn:not(.sx-btn-primary) {
    border-color: var(--border2);
    background: rgb(255 255 255 / 0.05);
  }
</style>

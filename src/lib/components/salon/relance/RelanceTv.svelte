<script>
  import Disque from '#lib/components/salon/relance/Disque.svelte';
  import Annonce from '#lib/components/salon/relance/Annonce.svelte';
  import { etatDe, texteTv } from '#lib/components/salon/relance/textes.js';

  let { relance } = $props();

  let etat = $derived(etatDe(relance.mode, relance.essai));
  let t = $derived(texteTv(etat));
  let pause = $derived(relance.mode !== 'auto');
</script>

<div class="tv">
  <div class="tv-disc">
    <Disque sec={pause ? null : relance.sec} {pause} d="60vw" g="0.74vw" />
  </div>
  <div class="tv-in">
    <div class="logo" aria-hidden="true">ZIK<i></i></div>
    <div class="txt">
      <h1>{t.titre[0]}<br />{t.titre[1]}</h1>
      <p>{t.texte}</p>
      {#if t.ligne}<p class="hint">{t.ligne}</p>{/if}
    </div>
    {#if relance.code}
      <div class="code">
        <em>CODE</em>
        <span class="sr">{relance.code}</span>
        {#each [...relance.code] as c, i (i)}<b aria-hidden="true">{c}</b>{/each}
      </div>
    {/if}
  </div>
  <Annonce cle={etat} texte="{t.titre.join(' ')} {t.texte}" />
</div>

<style>
  .tv {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: radial-gradient(90% 80% at 30% 0%, #1b0a20, #060608 70%);
    color: var(--text);
  }
  .tv-disc {
    position: absolute;
    top: 50%;
    left: 75.5%;
    translate: -50% -50%;
  }
  .tv-in {
    position: absolute;
    inset: 3.33vw;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .logo {
    font-family: var(--titre);
    font-weight: 900;
    font-size: 2.7vw;
    line-height: 1;
    letter-spacing: 0.05em;
    display: flex;
    align-items: baseline;
    gap: 0.35vw;
  }
  .logo i {
    width: 0.62vw;
    height: 0.62vw;
    border-radius: 50%;
    background: var(--text);
  }
  h1 {
    margin: 0;
    font-family: var(--titre);
    font-weight: 900;
    font-size: 9.4vw;
    line-height: 0.84;
    letter-spacing: -0.012em;
    text-transform: uppercase;
    text-shadow: 0 0.3vw 2.4vw rgb(5 5 7 / 0.75);
  }
  .txt p {
    margin: 2.3vw 0 0;
    max-width: 19.5em;
    font-weight: 500;
    font-size: 2.2vw;
    line-height: 1.28;
    color: var(--soft);
    text-wrap: pretty;
  }
  .txt .hint {
    margin-top: 1.5vw;
    max-width: 23em;
    font-size: 1.75vw;
    color: var(--mid);
  }
  .code {
    display: flex;
    align-items: center;
    gap: 0.45vw;
    min-height: 3.4vw;
    font-family: var(--mono);
    font-weight: 700;
    font-size: 1.6vw;
    line-height: 1;
  }
  .code em {
    font-style: normal;
    font-weight: 500;
    font-size: 1.5vw;
    letter-spacing: 0.14em;
    color: var(--mid);
    margin-right: 0.7vw;
  }
  .code b {
    display: grid;
    place-items: center;
    width: 2.7vw;
    height: 3.4vw;
    border-radius: 0.5vw;
    border: 1px solid var(--border2);
    background: rgb(255 255 255 / 0.05);
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>

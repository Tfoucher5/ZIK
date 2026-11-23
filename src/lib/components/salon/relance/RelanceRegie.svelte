<script>
  import Disque from '$lib/components/salon/relance/Disque.svelte';
  import Annonce from '$lib/components/salon/relance/Annonce.svelte';
  import { ADMIN, etatDe, texteRegie } from '$lib/components/salon/relance/textes.js';

  let { relance } = $props();

  let etat = $derived(etatDe(relance.mode, relance.essai));
  let pause = $derived(relance.mode !== 'auto');
  let t = $derived(texteRegie(etat, relance.sec));
  let bouton = $state();

  $effect(() => {
    bouton?.focus({ preventScroll: true });
  });
</script>

<div class="rg" class:pause>
  <div class="top">
    <span class="label"><i></i>Régie{relance.code ? ` · ${relance.code}` : ''}</span>
    <span class="pill">{t.etiquette}</span>
  </div>
  <div class="main">
    <Disque sec={pause ? null : relance.sec} {pause} d="clamp(104px, 31vw, 150px)" g="clamp(7px, 2.2vw, 11px)" />
    <div>
      <h1>{t.titre}</h1>
      <p>{t.texte}</p>
    </div>
  </div>
  <ul class="faits">
    {#each t.faits as f (f)}
      <li>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        <span>{f}</span>
      </li>
    {/each}
  </ul>
  <div class="bas">
    <p class="meta"><span>{t.essai}</span>{#if relance.ref}<span>Réf. {relance.ref}</span>{/if}</p>
    <div class="act">
      <button
        type="button"
        class="sx-btn"
        class:sx-btn-primary={pause}
        bind:this={bouton}
        onclick={() => relance.maintenant()}>{t.bouton}</button
      >
      {#if etat === 'pause'}
        <button
          type="button"
          class="sx-btn"
          disabled={relance.adminPrevenu}
          onclick={() => relance.appelerAdmin()}
          >{relance.adminPrevenu ? ADMIN.prevenu : ADMIN.appeler}</button
        >
      {/if}
    </div>
  </div>
  <Annonce cle={etat} texte="{t.titre} {t.texte}" />
</div>

<style>
  .rg {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: 1.15em;
    width: 100%;
    max-width: 34rem;
    margin: 0 auto;
    padding: max(1.25em, env(safe-area-inset-top)) 1.2em max(1.3em, env(safe-area-inset-bottom));
    overflow: hidden;
    background: var(--bg);
    color: var(--text);
    font-size: 17px;
    line-height: 1.5;
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.6em;
    padding-bottom: 0.95em;
    border-bottom: 1px solid var(--border);
  }
  .label {
    display: inline-flex;
    align-items: center;
    gap: 0.6em;
    font-family: var(--mono);
    font-weight: 500;
    font-size: 0.72em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .label i {
    width: 0.65em;
    height: 0.65em;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 10px var(--accent);
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.32em 0.7em;
    border-radius: 999px;
    border: 1px solid var(--border2);
    font-family: var(--mono);
    font-weight: 700;
    font-size: 0.72em;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--soft);
    white-space: nowrap;
  }
  .pill::before {
    content: '';
    width: 0.55em;
    height: 0.55em;
    border-radius: 50%;
    background: var(--bleu);
  }
  .pause .pill::before {
    background: var(--warn);
  }
  .main {
    display: flex;
    align-items: center;
    gap: 1.05em;
  }
  h1 {
    font-family: var(--titre);
    font-weight: 800;
    font-size: 2em;
    line-height: 0.94;
    text-transform: uppercase;
    text-wrap: balance;
  }
  .main p {
    margin-top: 0.5em;
    color: var(--mid);
    font-size: 0.94em;
    line-height: 1.4;
    text-wrap: pretty;
  }
  .faits {
    list-style: none;
    display: grid;
    gap: 0.75em;
    padding: 1em 1.05em;
    border-radius: 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    font-size: 0.94em;
    line-height: 1.4;
    color: var(--soft);
  }
  .faits li {
    display: flex;
    gap: 0.6em;
    align-items: flex-start;
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
  .bas {
    margin-top: auto;
    display: grid;
    gap: 0.95em;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3em 1.2em;
    font-family: var(--mono);
    font-weight: 500;
    font-size: 0.72em;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .act {
    display: grid;
    gap: 0.6em;
  }
  .act .sx-btn {
    width: 100%;
    min-height: 52px;
    padding: 0 1.4em;
  }
  .act .sx-btn:not(.sx-btn-primary) {
    border-color: var(--border2);
    background: rgb(255 255 255 / 0.05);
  }
</style>

<script>
  import { flushSync } from 'svelte';
  import { PLANS, TESTED_LABEL } from '$lib/data/proPlans.js';
  import ProPlanStatus from './ProPlanStatus.svelte';
  import ProConfirm from './ProConfirm.svelte';
  import { calm } from './demos.js';

  let { checkout } = $props();

  const FILTERS = [
    ['all', 'Tout voir'],
    ['once', 'Pour une soirée'],
    ['often', 'Pour les lieux'],
  ];
  let filter = $state('all');
  const shown = $derived(PLANS.filter((p) => filter === 'all' || (p.id === 'night') === (filter === 'once')));

  function pick(f) {
    const apply = () => {
      filter = f;
      flushSync();
    };
    if (document.startViewTransition && !calm()) document.startViewTransition(apply);
    else apply();
  }
</script>

<section id="tarifs" class="offres" aria-labelledby="pro-offres">
  <div class="wrap">
    <div class="head rv">
      <span class="label"><i></i>Offres</span>
      <h2 class="grad" id="pro-offres">ZIK Pro, à votre rythme</h2>
      <p>Une date ou toutes les semaines : les trois formules débloquent les mêmes fonctions ZIK Pro.</p>
    </div>

    {#if checkout.activePro}<ProPlanStatus {checkout} />{/if}

    <div class="seg" role="group" aria-label="Filtrer les offres">
      {#each FILTERS as [f, txt] (f)}
        <button type="button" aria-pressed={filter === f} onclick={() => pick(f)}>{txt}</button>
      {/each}
    </div>

    <div class="plans" class:one={shown.length === 1} class:two={shown.length === 2}>
      {#each shown as p (p.id)}
        <article class="plan card" class:top={p.featured} style="view-transition-name:plan-{p.id}" aria-labelledby="plan-{p.id}">
          <span class="badge">{p.badge}</span>
          <h3 id="plan-{p.id}">{p.name}</h3>
          <div class="price">{p.price}<small>{p.period}</small></div>
          <p class="pitch">{p.pitch}</p>
          <ul>
            {#each p.perks as perk (perk)}<li>{perk}</li>{/each}
          </ul>
          <button
            type="button"
            class={p.featured ? 'btn-main' : 'btn-line'}
            onclick={() => checkout.buy(p.id)}
            disabled={checkout.busy !== null || checkout.subscribed}
          >
            {#if checkout.busy === p.id}Redirection vers le paiement…
            {:else if checkout.subscribed}Déjà abonné
            {:else if p.id === 'night' && checkout.nightActive}Prolonger de 24 h
            {:else}{p.cta}{/if}
          </button>
        </article>
      {/each}
    </div>

    {#if checkout.payError}<p class="err" role="alert">{checkout.payError}</p>{/if}

    <p class="note">Pas de limite de joueurs, {TESTED_LABEL} · <a href="#comparatif">Gratuit ou ZIK Pro ?</a></p>
    <p class="note">Prix en euros, TVA non applicable. En payant, vous acceptez les <a href="/cgv">conditions générales de vente</a>.</p>
  </div>
  <ProConfirm {checkout} />
</section>

<style>
  .offres {
    border-radius: 32px 32px 0 0;
    background: var(--surface-alt);
    border-top: 1px solid var(--line-2);
    box-shadow: 0 -40px 80px -20px rgba(0, 0, 0, 0.8);
  }
  .seg {
    display: flex;
    gap: 4px;
    width: fit-content;
    max-width: 100%;
    padding: 5px;
    margin-bottom: 24px;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid var(--line-2);
    overflow-x: auto;
  }
  .seg button {
    min-height: 44px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: none;
    color: var(--muted);
    font-family: var(--titre);
    font-weight: 700;
    font-size: 15px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    cursor: pointer;
  }
  .seg button[aria-pressed='true'] {
    background: var(--text);
    color: #000;
  }
  .plans {
    display: grid;
    gap: 14px;
  }
  .plan {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    padding: 24px;
  }
  .plan.top {
    background:
      linear-gradient(180deg, #1e0b24, var(--surface) 55%) padding-box,
      conic-gradient(from var(--ang), #ff00ff, #7b5cff, #2fb8ff, #ff00ff) border-box;
    animation: ang 6s linear infinite;
    box-shadow: 0 30px 90px -40px rgba(255, 0, 255, 0.7);
  }
  .badge {
    align-self: flex-start;
    padding: 4px 10px;
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.07);
    color: #d4d5e2;
    font-family: var(--mono);
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h3 {
    font-weight: 800;
    font-size: 1.7rem;
  }
  .price {
    font-family: var(--titre);
    font-weight: 900;
    font-size: 46px;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .price small {
    display: block;
    margin-top: 6px;
    font-family: var(--corps);
    font-weight: 500;
    font-size: 14px;
    color: var(--muted);
  }
  .pitch {
    color: var(--muted);
    font-size: 15px;
  }
  ul {
    display: grid;
    gap: 8px;
    margin: 0 0 8px;
    padding: 0;
    list-style: none;
    font-size: 15px;
    color: #c9cad8;
  }
  li::before {
    content: '✓ ';
    color: var(--ok);
  }
  .plan button {
    width: 100%;
    margin-top: auto;
  }
  .plan button:disabled {
    opacity: 0.55;
    cursor: default;
    transform: none;
    box-shadow: none;
  }
  .err {
    margin-top: 18px;
    text-align: center;
    color: var(--danger);
  }
  .note {
    margin-top: 18px;
    text-align: center;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--muted);
  }
  .note + .note {
    margin-top: 6px;
  }
  .note a {
    color: var(--text);
  }
  :global(::view-transition-group(*)) {
    animation-duration: 0.5s;
    animation-timing-function: var(--out);
  }
  @property --ang {
    syntax: '<angle>';
    inherits: false;
    initial-value: 0deg;
  }
  @keyframes ang {
    to {
      --ang: 360deg;
    }
  }
  @media (min-width: 900px) {
    .offres {
      border-radius: 40px 40px 0 0;
      padding-top: 96px;
    }
    .offres .head {
      justify-items: center;
      text-align: center;
    }
    .seg {
      margin: 0 auto 36px;
    }
    .plans {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      max-width: 1080px;
      margin-inline: auto;
    }
    .plans.one {
      grid-template-columns: minmax(0, 360px);
      justify-content: center;
    }
    .plans.two {
      grid-template-columns: repeat(2, minmax(0, 360px));
      justify-content: center;
    }
  }
</style>

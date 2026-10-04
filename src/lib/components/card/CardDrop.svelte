<script>
  import { RARITIES } from './rarity.js';

  /**
   * Panneau « carte de la manche » de l'écran de fin de manche.
   * mode : won (le joueur la gagne), taken (un autre joueur la gagne),
   *        missed (premier, mais condition d'exploit ratée), guest (invité premier).
   */
  let {
    card,
    mode = 'won',
    copies = 1,
    duplicate = false,
    delayed = false,
    winner = null,
    round = 1,
    maxRounds = 10,
    conditions = [],
    onsignup,
  } = $props();

  const label = $derived(RARITIES[card.rarity].label);
  const secureAt = $derived(Math.ceil(maxRounds / 2));
  const secured = $derived(round >= secureAt);
  const seconds = (ms) => `${(ms / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} s`;
</script>

<section class="cd" data-rarity={card.rarity} data-mode={mode} aria-label="Carte de la manche">
  <header class="cd-head">
    <span class="cd-eyebrow">Carte de la manche</span>
    <span class="cd-num">n° {String(card.number).padStart(4, '0')}</span>
  </header>

  {#if mode === 'won'}
    <p class="cd-rarity">
      {label}
      <span class="cd-status"
        >{copies > 1 ? `Doublon, ${copies} exemplaires` : duplicate ? 'Doublon' : 'Nouvelle carte'}</span
      >
    </p>

    {#if winner}
      <div class="cd-row">
        <span class="cd-label">Trouvée en</span>
        <span class="cd-value">{seconds(winner.ms)}</span>
      </div>
    {/if}

    <div class="cd-secure" class:is-secured={secured}>
      <div class="cd-track" role="img" aria-label={`Manche ${round} sur ${maxRounds}`}>
        {#each Array.from({ length: maxRounds }, (_, i) => i + 1) as n (n)}
          <span class="cd-seg" class:done={n <= round} class:goal={n === secureAt}></span>
        {/each}
      </div>
      <p class="cd-secure-text">
        {#if secured}
          <svg viewBox="0 0 16 16" aria-hidden="true"
            ><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg
          >
          Carte sécurisée{delayed ? ", disponible dans ta collection sous 24 h" : ""}
        {:else}
          Sécurisée à la manche {secureAt}, reste jusque-là pour la garder
        {/if}
      </p>
    </div>
  {:else if mode === 'taken'}
    <div class="cd-taken">
      <span class="cd-avatar" aria-hidden="true">{winner?.name?.[0]?.toUpperCase()}</span>
      <div>
        <p class="cd-taken-name">{winner?.name}</p>
        <p class="cd-taken-meta">
          remporte la carte <strong class="cd-tint">{label}</strong> en {seconds(winner?.ms ?? 0)}
        </p>
      </div>
    </div>
  {:else if mode === 'missed'}
    <p class="cd-rarity is-missed">
      <span class="cd-rarity-name">{label}</span>
      <span class="cd-status">Pas cette fois</span>
    </p>
    <ul class="cd-conditions">
      {#each conditions as c (c.label)}
        <li class:ok={c.ok}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            {#if c.ok}<path d="M3.5 8.5l3 3 6-7" />{:else}<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />{/if}
          </svg>
          <span class="cd-cond-label">{c.label}</span>
          <span class="cd-cond-value">{c.value}</span>
        </li>
      {/each}
    </ul>
    <p class="cd-hint">La carte reste à prendre la prochaine fois que ce titre passe.</p>
  {:else if mode === 'guest'}
    <p class="cd-rarity">
      {label}
      <span class="cd-status">Trouvée en premier</span>
    </p>
    <p class="cd-hint">Avec un compte, cette carte rejoindrait ta collection.</p>
    <button type="button" class="cd-cta" onclick={onsignup}>Créer un compte</button>
  {/if}
</section>

<style>
  .cd {
    position: relative;
    display: grid;
    gap: 14px;
    width: 100%;
    max-width: 420px;
    padding: 18px 20px 18px 24px;
    border: 1px solid rgb(255 255 255 / 0.12);
    border-radius: 14px;
    background: linear-gradient(135deg, color-mix(in oklab, var(--rc) 16%, transparent), rgb(255 255 255 / 0.03) 60%);
    backdrop-filter: blur(14px);
    color: #f5f3f8;
    font-family: 'Barlow', sans-serif;
    overflow: hidden;
  }

  .cd::before {
    content: '';
    position: absolute;
    top: 14px;
    bottom: 14px;
    left: 0;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, var(--rc-light), var(--rc));
  }

  .cd[data-mode='missed']::before {
    background: rgb(255 255 255 / 0.25);
  }

  .cd-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  .cd-eyebrow {
    font: 500 0.68rem/1 var(--g-mono, ui-monospace, monospace);
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgb(255 255 255 / 0.55);
  }

  .cd-num {
    font: 500 0.72rem/1 var(--g-mono, ui-monospace, monospace);
    color: rgb(255 255 255 / 0.4);
    font-variant-numeric: tabular-nums;
  }

  .cd-rarity {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px 12px;
    margin: 0;
    font: 700 2.1rem/0.95 'Barlow Condensed', sans-serif;
    color: var(--rc-light);
  }

  .cd-rarity.is-missed {
    color: rgb(255 255 255 / 0.4);
  }

  .cd-rarity.is-missed .cd-rarity-name {
    text-decoration: line-through;
    text-decoration-thickness: 2px;
    text-decoration-color: rgb(255 255 255 / 0.35);
  }

  .cd-status {
    font: 600 0.9rem/1 'Barlow', sans-serif;
    color: rgb(255 255 255 / 0.75);
  }

  .cd-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1px solid rgb(255 255 255 / 0.1);
  }

  .cd-label {
    font-size: 0.85rem;
    color: rgb(255 255 255 / 0.6);
  }

  .cd-value {
    font: 700 1.25rem/1 'Barlow Condensed', sans-serif;
    font-variant-numeric: tabular-nums;
  }

  /* Progression vers la manche où la carte devient définitive */
  .cd-secure {
    display: grid;
    gap: 8px;
  }

  .cd-track {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 4px;
  }

  .cd-seg {
    position: relative;
    height: 6px;
    border-radius: 3px;
    background: rgb(255 255 255 / 0.12);
  }

  .cd-seg.done {
    background: var(--rc);
  }

  .cd-seg.goal::after {
    content: '';
    position: absolute;
    top: -4px;
    right: -3px;
    width: 2px;
    height: 14px;
    border-radius: 1px;
    background: #f5f3f8;
  }

  .cd-secure-text {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 0.82rem;
    color: rgb(255 255 255 / 0.6);
  }

  .cd-secure.is-secured .cd-secure-text {
    color: var(--rc-light);
    font-weight: 600;
  }

  .cd svg {
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* Un autre joueur a la carte */
  .cd-taken {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cd-avatar {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: color-mix(in oklab, var(--rc) 35%, #15151a);
    box-shadow: 0 0 0 2px var(--rc);
    font: 700 1.2rem/1 'Barlow Condensed', sans-serif;
  }

  .cd-taken p {
    margin: 0;
  }

  .cd-taken-name {
    font: 700 1.35rem/1.05 'Barlow Condensed', sans-serif;
  }

  .cd-taken-meta {
    margin-top: 3px !important;
    font-size: 0.88rem;
    color: rgb(255 255 255 / 0.65);
  }

  .cd-tint {
    color: var(--rc-light);
  }

  /* Conditions d'exploit */
  .cd-conditions {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 12px 0 0;
    border-top: 1px solid rgb(255 255 255 / 0.1);
    list-style: none;
  }

  .cd-conditions li {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 8px;
    font-size: 0.88rem;
    color: #ff9b9b;
  }

  .cd-conditions li.ok {
    color: #86efac;
  }

  .cd-cond-label {
    color: rgb(255 255 255 / 0.8);
  }

  .cd-cond-value {
    font: 600 1rem/1 'Barlow Condensed', sans-serif;
    font-variant-numeric: tabular-nums;
  }

  .cd-hint {
    margin: 0;
    font-size: 0.82rem;
    color: rgb(255 255 255 / 0.55);
  }

  .cd-cta {
    justify-self: start;
    min-height: 40px;
    padding: 0 18px;
    border: 0;
    border-radius: 99px;
    background: var(--rc);
    color: var(--rc-ink);
    font: 700 0.95rem/1 'Barlow', sans-serif;
    cursor: pointer;
  }

  .cd-cta:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }
</style>

<script>
  import { PLANS } from '$lib/data/proPlans.js';

  let { checkout } = $props();

  // Apparition en cascade des cartes quand elles arrivent à l'écran
  function reveal(node) {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { node.classList.add('in'); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }
</script>

<div class="pro-offers">
  {#each PLANS as p, i (p.id)}
    <article class="pro-offer" class:featured={p.featured} style="--d:{i * 110}ms" use:reveal>
      {#if p.badge}<span class="pro-offer-badge">{p.badge}</span>{/if}
      <h3 class="pro-offer-name">{p.name}</h3>
      <p class="pro-offer-pitch">{p.pitch}</p>
      <div class="pro-offer-price">
        <strong>{p.price}</strong>
        <span>{p.period}</span>
      </div>
      <ul class="pro-offer-perks">
        {#each p.perks as perk (perk)}<li>{perk}</li>{/each}
        <li class="pro-offer-all">Tout ZIK Pro inclus</li>
      </ul>
      <button
        class="pro-offer-btn"
        onclick={() => checkout.buy(p.id)}
        disabled={checkout.busy !== null || checkout.subscribed}
      >
        {#if checkout.busy === p.id}Redirection vers le paiement…
        {:else if checkout.subscribed}Déjà abonné
        {:else if p.id === 'night' && checkout.nightActive}Prolonger de 24 h
        {:else if p.id === 'night'}Prendre la soirée
        {:else}Choisir {p.name.toLowerCase()}{/if}
      </button>
    </article>
  {/each}
</div>

<style>
  @property --pro-angle {
    syntax: "<angle>";
    initial-value: 0deg;
    inherits: false;
  }
  .pro-offers {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    align-items: stretch;
    margin-top: 8px;
  }
  .pro-offer {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 26px 22px 22px;
    border: 1px solid var(--border2);
    border-radius: 18px;
    background: rgb(var(--c-glass) / 0.04);
    opacity: 0;
    transform: translateY(24px);
    transition:
      opacity 0.6s ease var(--d),
      transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) var(--d),
      box-shadow 0.25s ease,
      border-color 0.25s ease;
  }
  .pro-offer:global(.in) {
    opacity: 1;
    transform: none;
  }
  .pro-offer:global(.in):hover {
    transform: translateY(-6px);
    border-color: rgb(var(--accent-rgb) / 0.6);
    box-shadow: 0 18px 40px -18px rgb(var(--accent-rgb) / 0.55);
  }
  .pro-offer.featured {
    border-color: transparent;
    background:
      linear-gradient(var(--bg), var(--bg)) padding-box,
      conic-gradient(
          from var(--pro-angle),
          var(--accent),
          rgb(var(--accent-rgb) / 0.15),
          #ff00ff,
          rgb(var(--accent-rgb) / 0.15),
          var(--accent)
        )
        border-box;
    border-width: 2px;
    animation: pro-spin 5s linear infinite;
  }
  .pro-offer.featured::before {
    content: "";
    position: absolute;
    inset: -1px;
    z-index: -1;
    border-radius: inherit;
    background: radial-gradient(
      60% 50% at 50% 0%,
      rgb(var(--accent-rgb) / 0.35),
      transparent
    );
    filter: blur(24px);
  }
  .pro-offer-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--accent);
    color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .pro-offer-name {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.4rem;
    font-weight: 900;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--text);
  }
  :global(.pro-section) .pro-offer-pitch {
    margin: -8px 0 0;
    font-size: 0.86rem;
    min-height: 3em;
  }
  .pro-offer-price {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .pro-offer-price strong {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 3.2rem;
    font-weight: 900;
    line-height: 1;
    color: var(--text);
  }
  .pro-offer.featured .pro-offer-price strong {
    background: linear-gradient(90deg, var(--accent), #ff00ff);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .pro-offer-price span {
    font-size: 0.8rem;
    color: var(--mid);
  }
  :global(.pro-section) ul.pro-offer-perks {
    flex: 1;
    margin: 0;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }
  :global(.pro-section) ul.pro-offer-perks li {
    font-size: 0.86rem;
    padding-left: 24px;
  }
  :global(.pro-section) ul.pro-offer-perks li::before {
    content: "✓";
  }
  :global(.pro-section) ul.pro-offer-perks li.pro-offer-all {
    color: var(--text);
    font-weight: 700;
  }
  .pro-offer-btn {
    width: 100%;
    padding: 13px 16px;
    border: 1px solid var(--border2);
    border-radius: 12px;
    background: rgb(var(--c-glass) / 0.06);
    color: var(--text);
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.02rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition:
      background 0.2s,
      color 0.2s,
      transform 0.15s;
  }
  .pro-offer-btn:hover:not(:disabled) {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .pro-offer-btn:active:not(:disabled) {
    transform: scale(0.98);
  }
  .pro-offer.featured .pro-offer-btn {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .pro-offer-btn:disabled {
    opacity: 0.55;
    cursor: default;
  }
  @keyframes pro-spin {
    to {
      --pro-angle: 360deg;
    }
  }
  @media (max-width: 760px) {
    .pro-offers {
      grid-template-columns: 1fr;
    }
    .pro-offer.featured {
      order: -1;
    }
    :global(.pro-section) .pro-offer-pitch {
      min-height: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pro-offer {
      opacity: 1;
      transform: none;
      transition: none;
    }
    .pro-offer.featured {
      animation: none;
    }
  }
</style>

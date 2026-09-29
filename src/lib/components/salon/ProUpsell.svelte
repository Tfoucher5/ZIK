<script>
  import { PLANS, PRO_FEATURES, PRO_COMING } from '$lib/proPlans.js';

  let { feature = null, onClose } = $props();
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onClose(); }} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="pu-backdrop" onclick={onClose}>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="pu" role="dialog" aria-modal="true" aria-labelledby="pu-title" onclick={(e) => e.stopPropagation()}>
    <button class="pu-close" onclick={onClose} aria-label="Fermer">×</button>
    <p class="sx-kicker"><b>●</b> ZIK Pro</p>
    <h2 id="pu-title">{PRO_FEATURES[feature] ?? 'Toute la régie, sans limite'}</h2>
    <p class="pu-lead">
      Cette fonction fait partie de ZIK Pro, pensé pour les bars, campings et événements :
      joueurs illimités, jusqu'à 8 équipes et la régie complète.
    </p>
    <ul class="pu-plans">
      {#each PLANS as p (p.id)}
        <li class:featured={p.featured}>
          <b>{p.name}</b>
          <span>{p.price}</span>
          <small>{p.period}</small>
        </li>
      {/each}
    </ul>
    <div class="pu-coming">
      <p class="sx-kicker">Bientôt dans ZIK Pro</p>
      <ul>{#each PRO_COMING as c (c)}<li>{c}</li>{/each}</ul>
    </div>
    <a class="sx-btn sx-btn-primary" href="/pro#tarifs" target="_blank" rel="noopener">Découvrir ZIK Pro</a>
  </div>
</div>

<style>
  .pu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: grid;
    place-items: center;
    padding: 20px;
    background: var(--overlay);
  }
  .pu {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: min(560px, 100%);
    padding: 28px;
    background: var(--bg);
    border: 2px solid var(--text);
    border-radius: 3px;
    box-shadow: 8px 8px 0 var(--accent);
  }
  .pu h2 {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 2rem;
    line-height: 1;
    text-transform: uppercase;
  }
  .pu-lead {
    color: var(--mid);
    line-height: 1.5;
  }
  .pu-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 34px;
    height: 34px;
    background: none;
    border: 1px solid var(--border2);
    border-radius: 3px;
    color: var(--text);
    font-size: 1.2rem;
    cursor: pointer;
  }
  .pu-plans {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    list-style: none;
  }
  .pu-plans li {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px;
    border: 1px solid var(--border2);
    border-radius: 3px;
  }
  .pu-plans li.featured {
    border-color: var(--accent);
  }
  .pu-plans b {
    font-size: 0.85rem;
    color: var(--mid);
  }
  .pu-plans span {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 1.6rem;
  }
  .pu-plans small {
    font-size: 0.72rem;
    color: var(--mid);
  }
  .pu-coming ul {
    margin-top: 6px;
    padding-left: 18px;
    font-size: 0.85rem;
    color: var(--mid);
    line-height: 1.5;
  }
  @media (max-width: 480px) {
    .pu-plans {
      grid-template-columns: 1fr;
    }
  }
</style>

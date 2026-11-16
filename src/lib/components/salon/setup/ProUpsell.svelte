<script>
  import { PLANS, PRO_FEATURES, PRO_COMING } from '$lib/data/proPlans.js';

  let { feature = null, onClose } = $props();
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onClose(); }} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="pu-backdrop" onclick={onClose}>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="pu" role="dialog" aria-modal="true" aria-labelledby="pu-title" onclick={(e) => e.stopPropagation()}>
    <button class="pu-close" onclick={onClose} aria-label="Fermer">×</button>
    <span class="pu-tag">ZIK Pro</span>
    <h2 id="pu-title">{PRO_FEATURES[feature] ?? 'Toute la régie, sans limite'}</h2>
    <p class="pu-lead">
      Cette fonction fait partie de ZIK Pro, pensé pour les bars, campings et événements :
      plus de joueurs et d'équipes, le classement de la soirée et la régie complète.
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
      <p class="pu-k">Bientôt dans ZIK Pro</p>
      <ul>{#each PRO_COMING as c (c)}<li>{c}</li>{/each}</ul>
    </div>
    <a class="pu-cta" href="/pro#tarifs" target="_blank" rel="noopener">Découvrir ZIK Pro</a>
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
    background: rgba(0, 0, 0, 0.66);
  }
  .pu {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    width: min(560px, 100%);
    max-height: 100%;
    overflow-y: auto;
    padding: 28px;
    border: 1px solid var(--line-2, rgba(255, 255, 255, 0.16));
    border-radius: 22px;
    background: var(--surface, #0f0f17);
    color: var(--text, #fafafa);
    box-shadow: 0 40px 90px -30px #000;
  }
  .pu-tag {
    padding: 4px 8px;
    border: 1px solid rgba(255, 0, 255, 0.45);
    border-radius: 999px;
    background: rgba(255, 0, 255, 0.14);
    color: #ff9cf7;
    font-family: var(--mono, monospace);
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  h2 {
    margin: 0;
    padding-right: 40px;
    font-family: var(--titre, 'Barlow Condensed', sans-serif);
    font-weight: 900;
    font-size: 2rem;
    line-height: 0.95;
    text-transform: uppercase;
  }
  .pu-lead { margin: 0; line-height: 1.5; color: var(--muted, #a3a6ba); }
  .pu-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 44px;
    height: 44px;
    border: 1px solid var(--line-2, rgba(255, 255, 255, 0.16));
    border-radius: 50%;
    background: none;
    color: inherit;
    font-size: 1.3rem;
    cursor: pointer;
  }
  .pu-plans {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    width: 100%;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .pu-plans li {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px;
    border: 1px solid var(--line-2, rgba(255, 255, 255, 0.16));
    border-radius: 14px;
  }
  .pu-plans li.featured { border-color: rgba(255, 0, 255, 0.45); }
  .pu-plans b { font-size: 0.85rem; color: var(--muted, #a3a6ba); }
  .pu-plans span { font-family: var(--titre, 'Barlow Condensed', sans-serif); font-weight: 900; font-size: 1.6rem; }
  .pu-plans small { font-size: 13px; line-height: 1.3; color: var(--muted, #a3a6ba); }
  .pu-k {
    margin: 0;
    font-family: var(--mono, monospace);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted, #a3a6ba);
  }
  .pu-coming ul { margin: 6px 0 0; padding-left: 18px; font-size: 14px; line-height: 1.5; color: var(--muted, #a3a6ba); }
  .pu-cta {
    display: inline-flex;
    align-items: center;
    min-height: 52px;
    padding: 0 26px;
    border-radius: 999px;
    background: var(--text, #fafafa);
    color: #000;
    font-family: var(--titre, 'Barlow Condensed', sans-serif);
    font-weight: 800;
    font-size: 18px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    text-decoration: none;
  }
  @media (max-width: 480px) {
    .pu { padding: 22px 18px; }
    .pu-plans { grid-template-columns: 1fr; }
    .pu-cta { align-self: stretch; justify-content: center; }
  }
</style>

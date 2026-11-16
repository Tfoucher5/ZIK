<script>
  import { OFFRES, OFFRES_NOTE } from '$lib/components/soiree/soireeContent.js';
  import { FREE_MAX_PLAYERS, FREE_MAX_TEAMS } from '$lib/data/proPlans.js';

  const FILTRES = [['all', 'Tout voir'], ['once', 'Une soirée'], ['often', 'Chaque semaine']];
  let filtre = $state('all');

  function choisir(f) {
    const calme = document.documentElement.classList.contains('rm');
    if (document.startViewTransition && !calme) document.startViewTransition(() => (filtre = f));
    else filtre = f;
  }
</script>

<section id="offres" class="offres" data-bg="calme" aria-labelledby="offres-t">
  <div class="wrap">
    <div class="head rv">
      <span class="label"><i></i>Offres</span>
      <h2 class="grad" id="offres-t">Gratuit pour commencer</h2>
      <p>Jusqu'à {FREE_MAX_PLAYERS} joueurs et {FREE_MAX_TEAMS} équipes sans payer. ZIK Pro débloque le reste.</p>
    </div>
    <div class="seg" role="group" aria-label="Filtrer les offres">
      {#each FILTRES as [f, l] (f)}<button type="button" aria-pressed={filtre === f} onclick={() => choisir(f)}>{l}</button>{/each}
    </div>
    <div class="plans" class:two={filtre !== 'all'}>
      {#each OFFRES as o (o.id)}
        <article class="plan" class:top={o.top} hidden={filtre !== 'all' && o.k !== filtre} style:view-transition-name="plan-{o.id}">
          <span class="badge">{o.badge}</span>
          <h3>{o.name}</h3>
          <div class="price">{o.price}<small>{o.period}</small></div>
          <ul>{#each o.perks as k (k)}<li>{k}</li>{/each}</ul>
          <a class={o.top ? 'btn-main' : 'btn-line'} href={o.href}>{o.cta}</a>
        </article>
      {/each}
    </div>
    <p class="note">{OFFRES_NOTE}</p>
  </div>
</section>

<style>
  .offres { margin-top: -40px; padding-top: 56px; border-radius: 32px 32px 0 0; background: var(--bg2); border-top: 1px solid var(--line-2); box-shadow: 0 -40px 80px -20px rgba(0, 0, 0, 0.8); }
  .seg { display: flex; gap: 4px; padding: 5px; margin-bottom: 24px; width: fit-content; max-width: 100%; border-radius: 999px; background: var(--surface); border: 1px solid var(--line-2); overflow-x: auto; }
  .seg button { border: 0; background: none; color: var(--muted); min-height: 44px; padding: 0 14px; border-radius: 999px; font-family: var(--titre); font-weight: 700; font-size: 15px; text-transform: uppercase; letter-spacing: 0.04em; cursor: pointer; white-space: nowrap; }
  .seg button[aria-pressed='true'] { background: var(--text); color: #000; }
  .plans { display: grid; grid-template-columns: 1fr; gap: 14px; }
  .plan { position: relative; border-radius: 22px; padding: 24px; display: grid; gap: 12px; min-width: 0; background: linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(170deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.03)) border-box; border: 1px solid transparent; }
  .plan[hidden] { display: none; }
  @property --soiree-ang { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
  .plan.top { background: linear-gradient(180deg, #1e0b24, var(--surface) 55%) padding-box, conic-gradient(from var(--soiree-ang), #ff00ff, #7b5cff, #2fb8ff, #ff00ff) border-box; animation: ang 6s linear infinite; box-shadow: 0 30px 90px -40px rgba(255, 0, 255, 0.7); }
  @keyframes ang { to { --soiree-ang: 360deg; } }
  .badge { justify-self: start; font-family: var(--mono); font-weight: 700; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border-radius: 99px; background: rgba(255, 255, 255, 0.07); color: var(--soft); }
  h3 { font-weight: 800; font-size: 1.7rem; }
  .price { font-family: var(--titre); font-weight: 900; font-size: 46px; line-height: 1; font-variant-numeric: tabular-nums; }
  .price small { text-wrap: balance; display: block; font-family: var(--corps); font-weight: 500; font-size: 14px; color: var(--muted); margin-top: 6px; }
  ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; font-size: 15px; color: #c9cad8; }
  li::before { content: '✓ '; color: var(--ok); }
  .plan a { width: 100%; padding: 8px 14px; line-height: 1.1; white-space: normal; text-align: center; }
  .note { margin-top: 18px; text-align: center; font-family: var(--mono); font-size: 13px; color: var(--muted); }
  @media (min-width: 900px) {
    .offres { margin-top: -60px; padding-top: 80px; border-radius: 40px 40px 0 0; }
    .plans { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .plans.two { grid-template-columns: repeat(2, minmax(0, 340px)); justify-content: center; }
    .seg { margin-inline: auto; margin-bottom: 36px; }
    .head { justify-items: center; text-align: center; }
  }
</style>

<script>
  import { KIT } from '$lib/components/soiree/soireeContent.js';

  const ICONES = {
    son: ['M4 9v6h4l5 4V5L8 9z', 'M16.5 8.5a5 5 0 0 1 0 7M19.5 5.5a9 9 0 0 1 0 13'],
    ecran: ['M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M8 21h8M12 17v4'],
    wifi: ['M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0', 'M12 19.5h.01'],
    tel: ['M9 2h6a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3z', 'M10 18h4'],
    regie: ['M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M7 10h4M7 14h10'],
  };
</script>

<section id="materiel" data-bg="materiel" aria-labelledby="materiel-t">
  <div class="wrap kit-wrap">
    <div class="head rv">
      <span class="label"><i></i>Le matériel</span>
      <h2 class="grad" id="materiel-t">Ce qu'il vous faut</h2>
      <p>Rien de plus que ce qu'un bar, une salle ou un salon a déjà. Aucun compte pour lancer une soirée : un compte sert seulement à importer votre playlist Deezer et à gérer ZIK Pro.</p>
    </div>
    <ul class="kit">
      {#each KIT as k (k.i)}
        <li class="item rv" class:key={k.key}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{#each ICONES[k.i] as d (d)}<path {d} />{/each}</svg>
          <div><h3>{k.t}</h3><p>{k.p}</p></div>
        </li>
      {/each}
    </ul>
  </div>
</section>

<style>
  .kit { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
  .item { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 14px; align-items: start; padding: 18px; border-radius: 18px; background: rgba(15, 15, 23, 0.6); border: 1px solid var(--line); }
  svg { width: 44px; height: 44px; padding: 9px; border-radius: 12px; background: rgba(255, 255, 255, 0.05); stroke: var(--text); fill: none; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  .item h3 { font-weight: 800; font-size: 1.35rem; }
  .item p { color: var(--muted); font-size: 15px; margin-top: 4px; }
  .key { border-color: rgba(47, 184, 255, 0.45); background: linear-gradient(135deg, rgba(47, 184, 255, 0.12), rgba(15, 15, 23, 0.6)); }
  .key svg { stroke: var(--bleu); }
  @media (min-width: 900px) {
    .kit-wrap { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 64px; align-items: start; }
    .kit { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .key { grid-column: 1 / -1; }
  }
</style>

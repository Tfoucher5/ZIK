<script>
  import { teamColor } from '#lib/data/salonOptions.js';
  import { prepChecks, videsTexte, manchesJouables } from './prep.js';
  import { textesFile } from './regiePro.svelte.js';

  /**
   * Avant la partie : effectif, quatre contrôles en mots, équipes.
   * `attente` : téléphones à l'entrée d'une soirée complète, `children` : la jauge et l'offre.
   * @type {{ screens: number|null, tvSound: boolean|null, mediaCheck: any, players: any[], teams: any[]|null, tvUrl: string,
   *   settings?: any, onPlaylists?: () => void, attente?: number, children?: import('svelte').Snippet }}
   */
  let { screens, tvSound, mediaCheck, players, teams, tvUrl, settings = {}, onPlaylists, attente = 0, children } = $props();

  const p = $derived(prepChecks({ screens, tvSound, mediaCheck, players, teams, settings }));
  const court = $derived(manchesJouables(settings, mediaCheck).court);
  const ICONES = { ok: '✓', non: '!', attente: '…' };
</script>

<section class="rp">
  {#if attente}<p class="rg-k"><b class="rp-plein" aria-hidden="true">●</b>Complet</p>{/if}
  <h2 class="rp-titre">
    {p.joueurs} joueur{p.joueurs > 1 ? 's' : ''}
    <span>{attente ? textesFile([], attente).sousTitre : p.equipes ? `${p.equipes.length} équipes` : 'Chacun pour soi'}</span>
  </h2>

  {@render children?.()}

  <ul class="rp-checks">
    {#each p.checks as c (c.id)}
      <li class={c.etat}>
        <i aria-hidden="true">{ICONES[c.etat]}</i>
        <b>{c.titre}</b>
        {#if c.detail}<small>{c.detail}</small>{/if}
        {#if c.id === 'tv' && screens === 0}<a class="rp-lien" href={tvUrl} target="_blank" rel="noopener">Ouvrir l'écran TV</a>{/if}
        {#if c.id === 'musique' && c.etat === 'non' && court && onPlaylists}<button type="button" class="rg-em rp-em" onclick={onPlaylists}>Ajouter une playlist</button>{/if}
      </li>
    {/each}
  </ul>

  {#if p.equipes}
    <ul class="rp-eqs">
      {#each p.equipes as e (e.id)}
        {@const vide = p.joueurs > 0 && !e.size}
        <li style="--tc:{teamColor(e.id)}" class:vide>
          <b>{e.name}</b><span>{vide ? 'vide' : e.size}</span>
        </li>
      {/each}
    </ul>
  {/if}

  {#if p.vides.length || p.sansEquipe}
    <p class="rp-alerte" role="status">
      {#if p.sansEquipe}<b>{p.sansEquipe} joueur{p.sansEquipe > 1 ? 's' : ''} sans équipe.</b> Le choix se fait sur leur téléphone.{/if}
      {#if p.vides.length}<b>{videsTexte(p.vides)}</b>{/if}
      Tu peux lancer quand même, ou attendre les retardataires.
    </p>
  {/if}
</section>

<style>
  .rp { display: grid; gap: 14px; margin-bottom: 26px; }
  .rp-plein { color: var(--warn); }

  .rp-titre {
    margin: 0;
    font-family: var(--s-cond); font-weight: 900;
    font-size: 4rem; line-height: 0.86; text-transform: uppercase;
  }
  .rp-titre span { display: block; font-size: 1.9rem; font-weight: 800; color: var(--mid); line-height: 1; }

  .rp-checks { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border2); }
  .rp-checks li {
    display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 2px 12px; align-items: center;
    min-height: 50px; padding: 7px 0; border-bottom: 1px solid var(--border);
  }
  .rp-checks i {
    grid-row: span 3; width: 26px; height: 26px; border-radius: 50%;
    display: grid; place-items: center; font-style: normal; font-weight: 700; font-size: 0.95rem;
    border: 1.6px solid var(--border2); color: var(--mid);
  }
  .rp-checks b { font-weight: 600; font-size: 1.06rem; line-height: 1.2; }
  .rp-checks small, .rp-lien { grid-column: 2; font-size: 0.88rem; color: var(--mid); line-height: 1.3; }
  .rp-em { grid-column: 2; justify-self: start; }
  .rp-lien { justify-self: start; min-height: 44px; display: inline-flex; align-items: center; color: var(--text); text-underline-offset: 4px; }
  .rp-checks .ok i { background: var(--success); border-color: var(--success); color: #000; }
  .rp-checks .non i { border-color: var(--warn); color: var(--warn); }
  .rp-checks .non b { color: var(--warn); }

  .rp-eqs {
    list-style: none; margin: 0; padding: 0;
    display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px;
  }
  .rp-eqs li {
    border-top: 4px solid var(--tc); border-radius: 0 0 12px 12px; background: var(--surface);
    padding: 8px 12px 10px; display: flex; align-items: baseline; justify-content: space-between; gap: 6px;
    min-width: 0;
  }
  .rp-eqs b {
    font-family: var(--s-cond); font-weight: 800; font-size: 1.25rem; text-transform: uppercase;
    min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .rp-eqs span {
    font-family: var(--s-cond); font-weight: 900; font-size: 2.1rem; line-height: 0.9;
    font-variant-numeric: tabular-nums;
  }
  .rp-eqs .vide span {
    font-family: var(--s-mono); font-weight: 700; font-size: 0.8rem; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--warn);
  }

  .rp-alerte {
    margin: 0; padding: 12px 14px; border-radius: 14px;
    border: 1px solid rgb(255 179 71 / 0.5); background: rgb(255 179 71 / 0.08);
    font-size: 0.94rem; line-height: 1.4;
  }
  .rp-alerte b { color: var(--warn); }
</style>

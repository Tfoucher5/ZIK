<script>
  import { teamColor } from '$lib/data/salonOptions.js';
  /**
   * Classement de la soirée (ZIK Pro) : le cumul des parties terminées. Replié
   * sur une ligne, déplié par « Voir ».
   *
   * @type {{ night: any, pro: boolean, onReset: () => void, onUpsell: () => void }}
   */
  let { night, pro, onReset, onUpsell } = $props();

  const TOP = 10;
  let confirme = $state(false);
  const liste = $derived(night ? (night.teams ?? night.players.slice(0, TOP)) : []);
  const tete = $derived(liste[0]?.name ?? liste[0]?.username);

  function reset(e) {
    e.stopPropagation();
    if (!confirme) { confirme = true; return; }
    confirme = false;
    onReset();
  }
</script>

<svelte:window onclick={() => (confirme = false)} />

<ul class="rg-g">
  <li>
    {#if !pro}
      <button class="rg-l" type="button" onclick={onUpsell}>
        <b>Classement de la soirée <span class="pro-tag">ZIK Pro</span></b>
        <small>Les points de chaque partie s'additionnent sur toute la soirée, et le classement s'affiche sur la TV entre deux parties.</small>
        <em>Débloquer</em>
      </button>
    {:else if !night}
      <div class="rg-l nb-info">
        <b>Classement de la soirée <span class="pro-tag">ZIK Pro</span></b>
        <small>Démarre à la fin de la première partie. Garde cette soirée d'une partie à l'autre : les joueurs n'ont rien à ressaisir.</small>
      </div>
    {:else}
      <details>
        <summary class="rg-l">
          <b>Classement de la soirée <span class="pro-tag">ZIK Pro</span></b>
          <small>{night.games} partie{night.games > 1 ? 's' : ''} jouée{night.games > 1 ? 's' : ''}{tete ? ` · ${tete} en tête` : ''}</small>
          <em>Voir</em>
        </summary>
        <ol class="nb-rangs">
          {#each liste as e, i (e.id ?? e.username)}
            <li style="--tc:{e.id != null ? teamColor(e.id) : e.team != null ? teamColor(e.team) : 'var(--line-2)'}">
              <span>{i + 1}</span><b>{e.name ?? e.username}{e.left ? ' · a quitté' : ''}</b><span class="nb-pts">{e.score}</span>
            </li>
          {/each}
        </ol>
        {#if !night.teams && night.players.length > TOP}
          <p class="nb-note">et {night.players.length - TOP} autres joueurs</p>
        {/if}
        <button class="nb-reset" class:confirme type="button" onclick={reset}>
          {confirme ? 'Confirmer la remise à zéro' : 'Remettre à zéro'}
        </button>
      </details>
    {/if}
  </li>
</ul>

<style>
  .nb-info { cursor: default; }
  .nb-rangs { list-style: none; display: grid; gap: 4px; padding-bottom: 4px; }
  .nb-rangs li {
    display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; gap: 10px; align-items: center;
    min-height: 44px; padding: 0 14px 0 10px;
    border-left: 4px solid var(--tc); border-radius: 0 10px 10px 0; background: rgb(255 255 255 / 0.045);
  }
  .nb-rangs span { font-family: var(--mono); font-size: 13px; color: var(--muted); }
  .nb-rangs b { overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .nb-rangs .nb-pts { font-weight: 700; font-size: 16px; color: var(--text); font-variant-numeric: tabular-nums; }
  .nb-note { padding: 4px 0; font-size: 14px; color: var(--muted); }
  .nb-reset {
    min-height: 44px; margin: 4px 0 8px; padding: 0 4px; border: 0; background: none; color: var(--soft);
    font: inherit; font-size: 15px; text-decoration: underline; text-decoration-color: var(--line-2);
    text-underline-offset: 4px; cursor: pointer;
  }
  .nb-reset.confirme { color: var(--danger); font-weight: 700; }
</style>

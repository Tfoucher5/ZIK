<script>
  import { teamColor } from '$lib/data/salonOptions.js';
  /**
   * Classement de la soirée (ZIK Pro), en tête de l'onglet Joueurs : le
   * cumul des parties terminées dans ce salon. La liste en dessous reste
   * celle de la partie en cours.
   *
   * @type {{ night: any, pro: boolean, onReset: () => void, onUpsell: () => void }}
   */
  let { night, pro, onReset, onUpsell } = $props();

  const TOP = 10;
  let confirme = $state(false);

  function reset() {
    if (!confirme) { confirme = true; return; }
    confirme = false;
    onReset();
  }
</script>

<svelte:window onclick={() => (confirme = false)} />

<section class="nb">
  <header class="nb-head">
    <b>Soirée{#if night} · {night.games} partie{night.games > 1 ? 's' : ''}{/if}</b>
    {#if !pro}
      <button class="nb-pro" onclick={onUpsell}>Débloquer<i>Pro</i></button>
    {:else if night}
      <button class="nb-reset" class:confirme onclick={(e) => { e.stopPropagation(); reset(); }}>
        {confirme ? 'Confirmer la remise à zéro' : 'Remettre à zéro'}
      </button>
    {/if}
  </header>

  {#if !pro}
    <p class="nb-note">Les points de chaque partie s'additionnent sur toute la soirée, et le classement s'affiche sur la TV entre deux parties.</p>
  {:else if !night}
    <p class="nb-note">Le classement de la soirée démarre à la fin de la première partie. Gardez ce salon d'une partie à l'autre : les joueurs n'ont rien à ressaisir.</p>
  {:else}
    <ol class="nb-list">
      {#each night.teams ?? night.players.slice(0, TOP) as e, i (e.id ?? e.username)}
        <li style="--tc:{e.id != null ? teamColor(e.id) : e.team != null ? teamColor(e.team) : 'var(--border2)'}">
          <span class="nb-rang">{i + 1}</span>
          <span class="nb-nom">{e.name ?? e.username}</span>
          <span class="nb-pts">{e.score}</span>
        </li>
      {/each}
    </ol>
    {#if !night.teams && night.players.length > TOP}
      <p class="nb-note">et {night.players.length - TOP} autres joueurs</p>
    {/if}
  {/if}
</section>

<p class="nb-kicker">Cette partie</p>

<style>
  .nb {
    margin-bottom: 24px;
    padding: 14px;
    border: 1px solid var(--border2);
    border-radius: 3px;
  }
  .nb-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .nb-head b { font-size: 0.95rem; }
  .nb-note { margin: 10px 0 0; font-size: 0.82rem; color: var(--mid); line-height: 1.5; }

  .nb-reset, .nb-pro {
    padding: 7px 12px; border-radius: 2px;
    border: 1px solid var(--border2); background: none; color: var(--mid);
    font: inherit; font-size: 0.76rem; cursor: pointer;
  }
  .nb-reset.confirme { border-color: var(--danger); color: var(--danger); font-weight: 700; }
  .nb-pro { display: inline-flex; align-items: center; gap: 7px; border-style: dashed; }
  .nb-pro i {
    font-style: normal; font-size: 0.58rem; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 2px 6px; border-radius: 2px;
    background: rgb(var(--accent-rgb) / 0.16); color: var(--accent);
  }

  .nb-list { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .nb-list li {
    display: flex; align-items: center; gap: 12px;
    padding: 8px 12px; border-left: 3px solid var(--tc); background: var(--surface);
    border-radius: 2px; font-size: 0.9rem;
  }
  .nb-rang { width: 22px; font-family: var(--s-mono); font-size: 0.78rem; color: var(--dim); }
  .nb-nom { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
  .nb-pts { font-family: var(--s-mono); font-weight: 700; color: var(--accent); }

  .nb-kicker {
    margin: 0 0 12px;
    font-family: var(--s-mono); font-size: 0.66rem;
    letter-spacing: 0.16em; text-transform: uppercase; color: var(--mid);
  }
</style>

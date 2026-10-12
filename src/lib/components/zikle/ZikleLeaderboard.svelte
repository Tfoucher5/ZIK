<script>
  import { scoreLabel } from "./history.js";

  let { leaderboard } = $props();

  // Le classement peut grandir : on n'en affiche qu'une tranche, dépliable, pour
  // que la mise en page ne bouge pas. Le rang vient du serveur (calculé sur tous
  // les participants), donc il reste juste même hors de la tranche affichée.
  const LB_STEP = 5;
  let lbShown = $state(LB_STEP);
  const lbRows = $derived(leaderboard.slice(0, lbShown));
  // Le serveur trie déjà les gagnants en premier : filtrer conserve cet ordre.
  const lbWinners = $derived(lbRows.filter((r) => r.won !== false));
  const lbLosers = $derived(lbRows.filter((r) => r.won === false));
  const lbTotal = $derived(leaderboard[0]?.total ?? leaderboard.length);
  const myRow = $derived(leaderboard.find((r) => r.is_me) ?? null);
  const showMyRow = $derived(!!myRow && !lbRows.includes(myRow));
</script>

{#snippet lbLine(row, index)}
  <!-- `won` et `rank` absents = ancienne version de la RPC, qui ne renvoyait
       que des gagnants sans rang : on ne marque perdant que sur un false
       explicite, et on retombe sur la position dans la liste. -->
  {@const rowWon = row.won !== false}
  <li class:zk-lb-me={row.is_me} class:zk-lb-lost={!rowWon}>
    <span class="zk-lb-rank">{row.rank ?? index + 1}</span>
    <span class="zk-lb-name">{row.username}</span>
    <span class="zk-lb-score">{scoreLabel(rowWon, row.attempts)}</span>
  </li>
{/snippet}

<div class="zk-lb">
  <h3 class="zk-lb-title">
    Classement du jour
    <span class="zk-lb-total">{lbTotal}</span>
  </h3>
  <ol class="zk-lb-list">
    {#each lbWinners as row, i (row.username)}
      {@render lbLine(row, i)}
    {/each}
  </ol>

  {#if lbLosers.length}
    <!-- Les deux groupes sont séparés explicitement : sinon un « X/6 » au
         milieu du podium se lit comme un score parmi les autres. -->
    <p class="zk-lb-split">Ont tenté</p>
    <ol class="zk-lb-list">
      {#each lbLosers as row, i (row.username)}
        {@render lbLine(row, lbWinners.length + i)}
      {/each}
    </ol>
  {/if}

  {#if showMyRow}
    <!-- Hors de la tranche affichée : on rappelle sa propre ligne, pour
         savoir où on se situe sans tout déplier. -->
    <ol class="zk-lb-list zk-lb-mine">
      {@render lbLine(myRow, 0)}
    </ol>
  {/if}

  {#if lbShown < leaderboard.length}
    <button class="zk-lb-more" onclick={() => (lbShown += LB_STEP)}>
      Voir plus
      <span class="zk-lb-more-n">+{Math.min(LB_STEP, leaderboard.length - lbShown)}</span>
    </button>
  {/if}
</div>

<style>
  .zk-lb {
    animation: zk-in 0.5s 0.28s ease both;
  }
  .zk-lb-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 8px;
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.64rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .zk-lb-total {
    font-family: var(--zk-mono);
    font-size: 0.68rem;
    letter-spacing: 0;
    color: var(--accent);
  }
  .zk-lb-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .zk-lb-list li {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-bottom: 1px solid var(--border);
  }
  .zk-lb-me {
    background: rgb(var(--accent-rgb) / 0.08);
    border-left: 2px solid var(--accent);
    padding-left: 8px;
  }
  .zk-lb-rank,
  .zk-lb-score {
    font-family: var(--zk-mono);
    font-size: 0.74rem;
    color: var(--dim);
  }
  /* Ceux qui ont joué sans trouver restent listés, en retrait : on voit qui a
     tenté sa chance sans que ça brouille la lecture du podium. Le :not(.zk-lb-me)
     laisse le liseré accent gagner quand c'est ta propre ligne. */
  .zk-lb-lost:not(.zk-lb-me) {
    border-left: 2px solid rgb(248 113 113 / 0.35);
    padding-left: 8px;
    background: rgb(248 113 113 / 0.03);
  }
  .zk-lb-lost .zk-lb-rank,
  .zk-lb-lost .zk-lb-name {
    color: var(--mid);
  }
  .zk-lb-lost .zk-lb-score {
    color: var(--danger);
  }
  /* Intertitre de bascule podium → tentatives, dans le même vocabulaire que
     les eyebrows du reste de la page. */
  .zk-lb-split {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 12px 0 6px;
    font-family: var(--zk-cond);
    font-weight: 900;
    font-size: 0.58rem;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--danger);
  }
  .zk-lb-split::after {
    content: "";
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, rgb(248 113 113 / 0.35), transparent);
  }
  /* minmax(0,1fr) + min-width:0 : sans ça l'ellipse ne coupe pas dans une grille
     et un pseudo très long ferait déborder la carte. */
  .zk-lb-name {
    min-width: 0;
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.86rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* Rappel de sa propre ligne quand elle est hors de la tranche affichée :
     détachée de la liste par un liseré, pour qu'on ne la lise pas comme 6e. */
  .zk-lb-mine {
    margin-top: 6px;
    border-top: 1px dashed var(--border2);
    padding-top: 6px;
  }
  .zk-lb-mine li {
    border-bottom: none;
  }
  .zk-lb-more {
    -webkit-appearance: none;
    appearance: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    margin-top: 8px;
    padding: 9px 14px;
    background: transparent;
    border: 1px solid var(--border2);
    border-radius: 2px;
    color: var(--mid);
    font-family: var(--zk-cond);
    font-weight: 700;
    font-size: 0.68rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
  }
  .zk-lb-more:hover {
    background: rgb(var(--c-glass) / 0.06);
    color: var(--text);
    border-color: var(--text);
  }
  .zk-lb-more-n {
    font-family: var(--zk-mono);
    font-size: 0.7rem;
    letter-spacing: 0;
    color: var(--accent);
  }

  @media (prefers-reduced-motion: reduce) {
    .zk-lb {
      animation: none !important;
    }
  }
</style>

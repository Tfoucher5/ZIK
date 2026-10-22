<script>
  /** Mini-classement pendant la manche : le podium, plus soi-même. */
  let { p } = $props();
</script>

<section class="sp-board">
  <p class="sx-kicker">{p.myRank > 0 ? `Tu es ${p.myRank}${p.myRank === 1 ? 'er' : 'e'} sur ${p.scores.length}` : 'Classement'}</p>
  <ol class="sp-list">
    {#each p.board as pl (pl.username)}
      <li class:me={pl.username === p.username}>
        <span class="r">{String(pl.rank).padStart(2, '0')}</span>
        <span class="n">{pl.username}</span>
        <span class="p">{pl.score}</span>
      </li>
    {/each}
  </ol>
</section>

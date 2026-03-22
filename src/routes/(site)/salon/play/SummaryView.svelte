<script>
  let {
    phase = 'summary',
    roundEnd = null,
    finalScores = [],
    scores = [],
    username = '',
    round = 0,
    total = 10,
    onLeave,
  } = $props();

  const medals = ['🥇', '🥈', '🥉'];
</script>

{#if phase === 'summary' && roundEnd}
  <div class="salon-summary-layout">

    <!-- Left: track answer -->
    <div class="salon-summary-track">
      {#if roundEnd.cover}
        <img src={roundEnd.cover} alt="" class="salon-summary-track-cover">
      {:else}
        <div class="salon-summary-track-placeholder">🎵</div>
      {/if}
      <div class="salon-summary-track-answer">{roundEnd.answer}</div>
      {#if roundEnd.featArtists?.length}
        <div class="salon-summary-track-feats">feat. {roundEnd.featArtists.join(', ')}</div>
      {/if}
      {#if roundEnd.firstFinder}
        <p class="salon-summary-track-first">🏆 {roundEnd.firstFinder}</p>
      {/if}
    </div>

    <!-- Right: leaderboard -->
    <div class="salon-summary-scores-col">
      <div class="salon-summary-round-label">
        Manche {round} <span class="salon-summary-round-of">/ {total}</span>
      </div>
      <div class="salon-play-scores">
        {#each (roundEnd.scores || scores) as p, i (p.username)}
          <div class="salon-play-score-row {p.username === username ? 'me' : ''}">
            <div class="salon-play-score-rank">{medals[i] || `#${i+1}`}</div>
            <div class="salon-play-score-name">{p.username}</div>
            <div class="salon-play-score-pts">
              {p.score}
              {#if p.delta > 0}<span class="salon-score-delta">+{p.delta}</span>{/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

  </div>

{:else if phase === 'gameover'}
  <p style="font-size:1.3rem;font-weight:800;text-align:center">🏆 Partie terminée !</p>
  <div class="salon-play-scores">
    {#each finalScores as p, i (p.username)}
      <div class="salon-play-score-row {p.username === username ? 'me' : ''}">
        <div class="salon-play-score-rank">{medals[i] || `#${i+1}`}</div>
        <div class="salon-play-score-name">{p.username}</div>
        <div class="salon-play-score-pts">{p.score} pts</div>
      </div>
    {/each}
  </div>
  <button class="btn-salon-join" onclick={onLeave} style="margin-top:8px">
    Rejoindre un autre salon
  </button>
{/if}

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
  <div class="salon-play-roundend">
    {#if roundEnd.cover}
      <img src={roundEnd.cover} alt="" class="cover">
    {/if}
    <div class="answer">{roundEnd.answer}</div>
    {#if roundEnd.featArtists?.length}
      <div style="font-size:.78rem;color:var(--mid);margin-top:2px">feat. {roundEnd.featArtists.join(', ')}</div>
    {/if}
    {#if roundEnd.firstFinder}
      <p style="font-size:.8rem;color:var(--accent2)">🏆 Premier : {roundEnd.firstFinder}</p>
    {/if}
  </div>

  <div class="salon-play-scores-header">
    <span class="salon-play-scores-round">Manche {round} <span class="salon-play-scores-round-of">/ {total}</span></span>
    <span class="salon-play-scores-label">Classement</span>
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
  <div class="salon-host-cta">
    <p>Ça t'a plu ? Organise ta propre soirée, avec <b>tes</b> playlists.</p>
    <a href="/salon" class="btn-salon-join">Créer mon salon →</a>
  </div>
  <button class="salon-join-link" onclick={onLeave}>
    Rejoindre un autre salon
  </button>
{/if}

<style>
  .salon-host-cta {
    margin-top: 12px;
    padding: 14px;
    border: 1px solid var(--border2);
    border-radius: 12px;
    text-align: center;
  }
  .salon-host-cta p {
    margin: 0 0 10px;
    font-size: 0.9rem;
    color: var(--mid);
  }
  .salon-host-cta a {
    display: block;
    text-decoration: none;
  }
  .salon-join-link {
    display: block;
    margin: 12px auto 0;
  }
</style>

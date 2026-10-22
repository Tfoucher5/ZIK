<script>
  import { flip } from 'svelte/animate';

  let { players = [], teams = null, phase = 'lobby', answerMode = 'free', deltas = {} } = $props();

  let inGame = $derived(phase === 'round' || phase === 'summary');
  // En équipes : chaque équipe suivie de ses joueurs, dans l'ordre du classement
  let groups = $derived(
    teams
      ? teams.map(t => ({ team: t, members: players.filter(p => p.team === t.id) }))
      : [{ team: null, members: players }]
  );
</script>

<aside class="sh-board">
  <div class="sh-board-head">
    <span class="sx-kicker">{inGame || phase === 'gameover' ? 'Classement' : 'Joueurs'}</span>
    <span class="sx-kicker">{players.length}</span>
  </div>
  {#if players.length === 0}
    <p class="sh-board-empty">Personne pour l'instant. Les joueurs apparaissent ici dès qu'ils entrent le code.</p>
  {:else}
    <div class="sh-board-list">
      {#each groups as g (g.team?.id ?? 'solo')}
        <section class="sh-group" animate:flip={{ duration: 500 }} style="--tc:{g.team ? `var(--q${g.team.id})` : 'transparent'}">
          {#if g.team}
            <header class="sh-group-head">
              <b>{g.team.name}</b>
              <small>{g.members.length} joueur{g.members.length > 1 ? 's' : ''}</small>
              <span class="pts">{g.team.score}</span>
            </header>
          {/if}
          <ol>
            {#each g.members as p, i (p.username)}
              <li animate:flip={{ duration: 500 }} class="sh-row" class:offline={p.offline} class:done={phase === 'round' && (p.foundThisRound || p.answeredThisRound)}>
                <span class="sh-row-rank">{String(i + 1).padStart(2, '0')}</span>
                <span class="sh-row-name">
                  {p.username}
                  {#if phase === 'round' && answerMode === 'free'}
                    <span class="sh-row-marks" aria-hidden="true">
                      <i class:ok={p.foundArtist}>A</i>
                      {#if (p.totalFeatCount || 0) > 0}<i class:ok={(p.foundFeatCount || 0) > 0}>F</i>{/if}
                      <i class:ok={p.foundTitle}>T</i>
                    </span>
                  {/if}
                </span>
                <span class="sh-row-pts">
                  {p.score ?? 0}
                  {#if phase === 'summary' && deltas[p.username] > 0}<small>+{deltas[p.username]}</small>{/if}
                </span>
              </li>
            {/each}
          </ol>
        </section>
      {/each}
    </div>
  {/if}
</aside>

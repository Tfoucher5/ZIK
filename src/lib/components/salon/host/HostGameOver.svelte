<script>
  import { FREE_MAX_TEAMS } from '$lib/data/proPlans.js';
  import { SALON_TEAMS, teamColor } from '$lib/data/salonOptions.js';

  /** Fin de partie sur la TV : vainqueur, podium révélé pas à pas, playlist et réglages de la suivante. */
  let {
    phase, gameOver, total, settings, pro,
    onSetting, onRestart, onChangePlaylists = null, onNewSalon,
  } = $props();

  // En équipes, le podium est celui des équipes
  let finalScores = $derived(gameOver?.scores ?? []);
  let finalTeams = $derived(gameOver?.teams ?? null);
  let ranked = $derived(
    finalTeams
      ? finalTeams.map(t => ({ key: 't' + t.id, name: t.name, score: t.score, team: t.id, sub: `${t.members.length} joueur${t.members.length > 1 ? 's' : ''}` }))
      : finalScores.map(p => ({ key: p.username, name: p.username, score: p.score, team: p.team, sub: `${p.found} trouvé${p.found > 1 ? 's' : ''}` }))
  );
  let winner = $derived(ranked[0]);
  let podiumSlots = $derived([
    { e: ranked[1], pos: 2, step: 2 },
    { e: ranked[0], pos: 1, step: 3 },
    { e: ranked[2], pos: 3, step: 1 },
  ]);
  let bestPlayer = $derived(finalScores[0]);
  let fastest = $derived([...finalScores].sort((a, b) => b.first - a.first)[0]);
  let steadiest = $derived([...finalScores].sort((a, b) => b.found - a.found)[0]);

  let revealStep = $state(0);
  let confirmNew = $state(false);

  $effect(() => {
    revealStep = 0;
    if (phase !== 'gameover') return;
    const timers = [500, 1500, 2700, 3900].map((ms, i) => setTimeout(() => { revealStep = i + 1; }, ms));
    return () => timers.forEach(clearTimeout);
  });
</script>

<section class="sh-layer sh-over" class:on={phase === 'gameover'}>
  {#if winner}
    <div class="sh-over-grid">
      <div class="sh-winner" class:on={revealStep >= 3} style="--tc:{winner.team != null ? teamColor(winner.team) : 'var(--accent)'}">
        <p class="sx-kicker">{finalTeams ? 'Équipe gagnante' : 'Vainqueur'} · {gameOver?.rounds ?? total} manches</p>
        <div class="sh-winner-name">{winner.name}</div>
        <div class="sh-winner-pts">{winner.score}<small>{finalTeams ? 'pts de moyenne' : 'pts'}</small></div>
        <dl class="sh-awards">
          {#if finalTeams && bestPlayer}
            <div><dt>Meilleur joueur</dt><dd>{bestPlayer.username} <small>{bestPlayer.score} pts</small></dd></div>
          {/if}
          {#if fastest?.first > 0}
            <div><dt>Le plus rapide</dt><dd>{fastest.username} <small>{fastest.first} fois 1re réponse</small></dd></div>
          {/if}
          {#if steadiest?.found > 0}
            <div><dt>Le plus régulier</dt><dd>{steadiest.username} <small>{steadiest.found} titre{steadiest.found > 1 ? 's' : ''} trouvé{steadiest.found > 1 ? 's' : ''}</small></dd></div>
          {/if}
        </dl>
      </div>

      <div class="sh-podium">
        {#each podiumSlots as slot (slot.pos)}
          <div class="sh-po p{slot.pos}" class:on={slot.e && revealStep >= slot.step} style="--tc:{slot.e?.team != null ? teamColor(slot.e.team) : 'var(--text)'}">
            {#if slot.e}
              <span class="sh-po-name">{slot.e.name}</span>
              <span class="sh-po-pts">{slot.e.score} pts · {slot.e.sub}</span>
            {/if}
            <div class="sh-po-block"><span>{slot.pos}</span></div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if gameOver?.history?.length}
    <div class="sh-tracks" class:on={revealStep >= 4}>
      <p class="sx-kicker">La playlist de la partie</p>
      <ol>
        {#each gameOver.history as h, i (i)}
          <li title={h.answer}>
            {#if h.cover}<img src={h.cover} alt="">{:else}<span></span>{/if}
            <small>{String(i + 1).padStart(2, '0')}</small>
          </li>
        {/each}
      </ol>
    </div>
  {/if}

  <div class="sh-next">
    <p class="sx-kicker">Prochaine partie</p>
    <div class="sh-next-row">
      <div class="sh-seg" role="radiogroup" aria-label="Réponses">
        <button class:on={settings.answerMode === 'free'} onclick={() => onSetting({ answerMode: 'free' })}>Texte libre</button>
        <button class:on={settings.answerMode === 'multiple'} onclick={() => onSetting({ answerMode: 'multiple' })}>4 choix</button>
        {#if pro}<button class:on={settings.answerMode === 'buzzer'} onclick={() => onSetting({ answerMode: 'buzzer' })}>Buzzer</button>{/if}
      </div>
      <div class="sh-seg" role="radiogroup" aria-label="Équipes">
        <!-- Écran public : on ne montre que ce que le salon peut faire -->
        {#each SALON_TEAMS.filter(n => pro || n <= FREE_MAX_TEAMS) as n (n)}
          <button class:on={(settings.teams?.length ?? 0) === n} onclick={() => onSetting({ teamCount: n })}>{n === 0 ? 'Solo' : n === 2 ? '2 équipes' : n}</button>
        {/each}
      </div>
      <div class="sh-seg" role="radiogroup" aria-label="Manches">
        {#each [5, 10, 15, 20] as n (n)}
          <button class:on={settings.maxRounds === n} onclick={() => onSetting({ maxRounds: n })}>{n} manches</button>
        {/each}
      </div>
    </div>
  </div>
  <div class="sh-over-actions">
    <button class="sx-btn sx-btn-primary" onclick={onRestart}>Lancer la partie suivante</button>
    {#if onChangePlaylists}
      <button class="sx-btn" onclick={onChangePlaylists}>Changer de playlist</button>
    {/if}
    <!-- Un nouveau salon fait ressaisir le code à tout le monde : on perd des joueurs -->
    <button class="sh-new-link" onclick={() => (confirmNew = true)}>Nouveau salon…</button>
  </div>

  {#if confirmNew}
    <div class="sh-new-confirm" role="alertdialog" aria-labelledby="sh-new-title">
      <p class="sx-kicker">Attention</p>
      <h2 id="sh-new-title">Fermer ce salon ?</h2>
      <ul>
        <li>Tous les joueurs devront <b>ressaisir un nouveau code</b>.</li>
        {#if gameOver?.night}<li>Le <b>classement de la soirée</b> repartira de zéro.</li>{/if}
      </ul>
      <p>Pour changer de playlist ou de réglages, inutile : « Lancer la partie suivante » garde tout le monde.</p>
      <div class="sh-new-actions">
        <button class="sx-btn sx-btn-primary sx-btn-lg" onclick={() => (confirmNew = false)}>Rester dans ce salon</button>
        <button class="sx-btn sx-btn-lg" onclick={onNewSalon}>Fermer et créer un nouveau salon</button>
      </div>
    </div>
  {/if}
</section>

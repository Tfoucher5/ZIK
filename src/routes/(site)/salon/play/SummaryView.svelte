<script>
  import { onMount } from 'svelte';
  import { flip } from 'svelte/animate';

  let {
    phase = 'summary',
    roundEnd = null,
    finalScores = [],
    scores = [],
    username = '',
    teams = null,
    myTeam = null,
    round = 0,
    total = 10,
    onLeave,
  } = $props();

  let rows = $derived(phase === 'gameover' ? finalScores : (roundEnd?.scores || scores));
  // Classement d'avant la manche : on l'affiche d'abord, puis les lignes
  // glissent vers leur nouvelle place et les points montent
  let before = $derived(
    [...rows].sort((a, b) => (b.score - (b.delta ?? 0)) - (a.score - (a.delta ?? 0)))
  );
  let settled = $state(false);
  let shown = $derived(phase === 'summary' && !settled ? before : rows);
  let oldRank = $derived(Object.fromEntries(before.map((p, i) => [p.username, i])));
  onMount(() => {
    const t = setTimeout(() => (settled = true), 900);
    return () => clearTimeout(t);
  });
  let myPos = $derived(finalScores.findIndex(p => p.username === username) + 1);
  let teamPos = $derived((teams?.findIndex(t => t.id === myTeam) ?? -1) + 1);
</script>

{#if phase === 'summary' && roundEnd}
  <div class="sp-answer">
    {#if roundEnd.cover}<img src={roundEnd.cover} alt="">{/if}
    <div>
      <p class="sx-kicker">Manche <b>{round}</b> / {total}</p>
      <div class="sp-answer-txt">{roundEnd.answer}</div>
      {#if roundEnd.featArtists?.length}
        <div class="sp-answer-sub">feat. {roundEnd.featArtists.join(', ')}</div>
      {/if}
      {#if roundEnd.firstFinder}
        <div class="sp-answer-sub">Le plus rapide : {roundEnd.firstFinder}</div>
      {/if}
    </div>
  </div>
{:else if phase === 'gameover'}
  <div>
    <p class="sx-kicker">Partie terminée</p>
    {#if teams}
      <div class="sp-big">{teamPos === 1 ? 'Ton équipe gagne !' : teamPos > 0 ? `Ton équipe finit ${teamPos}e` : 'Fin de partie'}</div>
    {:else}
      <div class="sp-big">{myPos === 1 ? 'Tu gagnes !' : myPos > 0 ? `${myPos}e sur ${finalScores.length}` : 'Fin de partie'}</div>
    {/if}
  </div>
{/if}

{#if teams}
  <ol class="sp-list sp-team-list">
    {#each teams as t, i (t.id)}
      <li class:me={t.id === myTeam} style="--tc:var(--q{t.id})">
        <span class="r">{String(i + 1).padStart(2, '0')}</span>
        <span class="n"><i></i>{t.name}</span>
        <span class="p">{t.score}</span>
      </li>
    {/each}
  </ol>
{/if}

<ol class="sp-list">
  {#each shown as p, i (p.username)}
    {@const moved = settled ? oldRank[p.username] - i : 0}
    <li class:me={p.username === username} animate:flip={{ duration: 600 }}>
      <span class="r">{String(i + 1).padStart(2, '0')}</span>
      <span class="n">
        {p.username}
        {#if moved > 0}<em class="up">▲{moved}</em>{:else if moved < 0}<em class="down">▼{-moved}</em>{/if}
      </span>
      <span class="p">
        {phase === 'summary' && !settled ? p.score - (p.delta ?? 0) : p.score}
        {#if phase === 'summary' && settled && p.delta > 0}<small>+{p.delta}</small>{/if}
      </span>
    </li>
  {/each}
</ol>

{#if phase === 'gameover'}
  <div class="salon-host-cta">
    <p>Ça t'a plu ? Avec un compte gratuit, importe <b>tes</b> playlists Spotify ou Deezer et organise ta propre soirée.</p>
    <a href="/?auth=register&ref=salon-invite" class="sx-btn sx-btn-primary">Créer mon compte</a>
    <a href="/salon?ref=invite" class="salon-join-link">Ou organiser un salon sans compte</a>
  </div>
  <button class="salon-join-link" onclick={onLeave}>Rejoindre un autre salon</button>
{/if}

<style>
  .sp-list em {
    margin-left: 6px;
    font-style: normal;
    font-family: var(--s-mono);
    font-size: 0.7rem;
    animation: sum-in 0.4s ease;
  }
  .sp-list em.up { color: var(--success); }
  .sp-list em.down { color: var(--danger); }
  .sp-list small { animation: sum-in 0.4s ease; }
  @keyframes sum-in {
    from { opacity: 0; transform: translateY(4px); }
  }
  .salon-host-cta {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px;
    border: 2px solid var(--text);
    border-radius: 3px;
  }
  .salon-host-cta p {
    font-size: 0.92rem;
    color: var(--mid);
    line-height: 1.5;
  }
  .salon-host-cta b {
    color: var(--text);
  }
  .salon-host-cta .salon-join-link {
    text-align: center;
  }
</style>

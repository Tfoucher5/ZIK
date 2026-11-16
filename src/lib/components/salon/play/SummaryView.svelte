<script>
  import { teamColor } from '$lib/data/salonOptions.js';
  import { onMount } from 'svelte';
  import { flip } from 'svelte/animate';
  import { podium } from './salonPlayer.svelte.js';

  /** Fin de manche : la réponse, puis le classement qui bouge. */
  let {
    roundEnd = null,
    ranking = null,
    username = '',
    teams = null,
    myTeam = null,
    round = 0,
    total = 10,
  } = $props();

  let rows = $derived(podium(roundEnd?.ranking || ranking));
  // Classement d'avant la manche : on l'affiche d'abord, puis les lignes
  // glissent vers leur nouvelle place et les points montent
  let settled = $state(false);
  let shown = $derived(
    !settled && rows.every(p => p.prevRank)
      ? [...rows].sort((a, b) => a.prevRank - b.prevRank)
      : rows
  );
  onMount(() => {
    const t = setTimeout(() => (settled = true), 900);
    return () => clearTimeout(t);
  });
</script>

{#if roundEnd}
  <div class="sp-answer">
    {#if roundEnd.cover}<img src={roundEnd.cover} alt="">{/if}
    <div>
      <p class="sx-kicker">Manche <b>{round}</b> / {total}</p>
      {#if roundEnd.work}
        <div class="sp-answer-sub">{roundEnd.work.label}</div>
      {/if}
      <div class="sp-answer-txt">{roundEnd.work?.value ?? roundEnd.answer}</div>
      {#if roundEnd.work}
        <div class="sp-answer-sub">{roundEnd.answer}</div>
      {/if}
      {#if roundEnd.featArtists?.length}
        <div class="sp-answer-sub">feat. {roundEnd.featArtists.join(', ')}</div>
      {/if}
      {#if roundEnd.firstFinder}
        <div class="sp-answer-sub">Le plus rapide : {roundEnd.firstFinder}</div>
      {/if}
    </div>
  </div>
{/if}

{#if teams}
  <ol class="sp-list sp-team-list">
    {#each teams as t, i (t.id)}
      <li class:me={t.id === myTeam} style="--tc:{teamColor(t.id)}">
        <span class="r">{String(i + 1).padStart(2, '0')}</span>
        <span class="n"><i></i>{t.name}</span>
        <span class="p">{t.score}</span>
      </li>
    {/each}
  </ol>
{/if}

<ol class="sp-list">
  {#each shown as p (p.username)}
    {@const moved = settled && p.prevRank ? p.prevRank - p.rank : 0}
    <li class:me={p.username === username} animate:flip={{ duration: 600 }}>
      <span class="r">{String(!settled && p.prevRank ? p.prevRank : p.rank).padStart(2, '0')}</span>
      <span class="n">
        {p.username}
        {#if p.left}<em>a quitté</em>{/if}
        {#if moved > 0}<em class="up">▲{moved}</em>{:else if moved < 0}<em class="down">▼{-moved}</em>{/if}
      </span>
      <span class="p">
        {settled ? p.score : p.score - (p.delta ?? 0)}
        {#if settled && p.delta > 0}<small>+{p.delta}</small>{/if}
      </span>
    </li>
  {/each}
</ol>

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
</style>

<script>
  /** Avant la partie : confirmation, choix d'équipe et joueurs présents. */
  let { p } = $props();
</script>

<div>
  <p class="sx-kicker"><b>●</b> Connecté</p>
  <div class="sp-big">C'est bon,<br>tu es dedans.</div>
  <p class="sp-hint">Regarde la TV : la partie démarre quand l'hôte la lance.</p>
</div>

{#if p.teams}
  <section>
    <p class="sx-kicker">Choisis ton équipe</p>
    <div class="sp-teams">
      {#each p.teams as t (t.id)}
        <button class="sp-team" class:on={p.myTeam === t.id} style="--tc:var(--q{t.id})" onclick={() => p.pickTeam(t.id)}>
          <b>{t.name}</b>
          <small>{t.members.length} joueur{t.members.length > 1 ? 's' : ''}</small>
        </button>
      {/each}
    </div>
  </section>
{/if}

<section>
  <p class="sx-kicker">Dans le salon · {p.roster.length}</p>
  <ul class="sp-roster">
    {#each p.roster as pl (pl.username)}
      <li class:me={pl.username === p.username}>
        {#if p.teams && pl.team != null}<i style="--tc:var(--q{pl.team})"></i>{/if}{pl.username}
      </li>
    {/each}
  </ul>
</section>

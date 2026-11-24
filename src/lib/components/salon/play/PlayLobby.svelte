<script>
  import { teamColor } from '#lib/data/salonOptions.js';
  import TeamPick from './TeamPick.svelte';
  import TeamBand from './TeamBand.svelte';
  /** Avant la partie : choix d'équipe, puis attente avec son équipe et le mode de réponse. */
  let { p } = $props();

  const MODES = {
    multiple: ['4 choix.', "Quatre réponses s'affichent ici : touche la bonne."],
    free: ['Texte libre.', "Tape l'artiste, puis le titre."],
    buzzer: ['Buzzer.', 'Buzze, puis réponds à voix haute.'],
  };
  const mode = $derived(MODES[p.answerMode] ?? MODES.free);
  const others = $derived(
    p.roster.recent.filter((pl) => pl.username !== p.username && (!p.team || pl.team === p.myTeam)),
  );
  // Équipe tout juste choisie : l'effectif du serveur n'a pas encore suivi
  const size = $derived(Math.max(p.team ? p.team.size : p.roster.count, others.length + 1));
  const steps = $derived(p.teams ? ['Pseudo', 'Équipe', 'La TV'] : ['Pseudo', 'La TV']);
</script>

{#if p.choosingTeam}
  <TeamPick {p} />
{:else}
  <div class="sp-wait" style:--tc={p.team ? teamColor(p.myTeam) : null}>
    {#if p.team}
      <TeamBand name={p.team.name} color={teamColor(p.myTeam)}>
        {#if p.phase === 'lobby'}<button class="sp-change" onclick={() => (p.teamOpen = true)}>Changer</button>{/if}
      </TeamBand>
    {/if}
    <p class="sx-kicker sp-ok"><b>●</b> {p.connLost ? 'Reconnexion…' : 'Connecté'} · {p.username}</p>
    <div>
      <h1 class="sp-h">C'est bon,<br>tu es dedans.</h1>
      <p class="sp-hint sp-lead">Regarde la TV : la partie démarre quand l'hôte la lance.</p>
    </div>
    <div class="sp-mode">
      <p class="sx-kicker">Comment répondre</p>
      {#if p.answerMode === 'multiple'}
        <div class="sp-formes" aria-hidden="true">
          {#each [0, 1, 2, 3] as i (i)}<i class="c{i}" style:--c="var(--q{i})"><span class="sx-shape"></span></i>{/each}
        </div>
      {/if}
      <p><b>{mode[0]}</b> {mode[1]}</p>
    </div>
    <section>
      <p class="sx-kicker">{p.team ? `Ton équipe · ${size}` : 'Déjà là'}</p>
      <ul class="sp-roster">
        <li class="me">{p.username} (toi)</li>
        {#each others as pl (pl.username)}<li>{pl.username}</li>{/each}
      </ul>
      {#if size > others.length + 1}<p class="sp-hint">et {size - others.length - 1} {size - others.length > 2 ? 'autres' : 'autre'}</p>{/if}
      <p class="sp-hint">{p.roster.count} joueur{p.roster.count > 1 ? 's' : ''} dans la soirée</p>
    </section>
    <ol class="sp-frise" style="--p:1">{#each steps as s (s)}<li class="on">{s}</li>{/each}</ol>
  </div>
{/if}

<style>
  .sp-wait {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .sp-change {
    margin-left: auto;
    min-height: 44px;
    padding: 0 4px;
    background: none;
    border: 0;
    color: #000;
    font: inherit;
    font-size: 1.1rem;
    text-transform: none;
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: pointer;
  }
  .sp-lead {
    font-size: 1.05rem;
  }
  .sp-mode {
    display: grid;
    gap: 10px;
    padding: 16px 18px;
    border-radius: 18px;
    background: var(--surface2);
    border: 1px solid var(--border);
  }
  .sp-mode p:last-child {
    line-height: 1.4;
  }
  .sp-formes {
    display: flex;
    gap: 8px;
  }
  .sp-formes i {
    flex: 1;
    height: 40px;
    border-radius: 10px;
    background: var(--c);
    display: grid;
    place-items: center;
  }
</style>

<script>
  /** Onglets ELO / Score / Cartes et filtres de l'onglet actif. */
  let { lb, loggedIn } = $props();

  const TABS = [
    ['elo', 'ELO'],
    ['score', 'Score'],
    ['cartes', 'Cartes'],
  ];
  const PERIODS = { semaine: 'Depuis lundi', mois: 'Depuis le 1er du mois', alltime: 'Depuis le 1er janvier' };

  const summary = $derived(
    lb.tab === 'cartes'
      ? 'Commune 1 pt · Peu commune 2 · Rare 4 · Épique 8 · Légendaire 16 · Mythique 32'
      : lb.tab === 'score'
        ? `${lb.scoreMode === 'classique' ? 'Mode Classique' : 'Mode QCM'} · ${lb.scoreRooms === 'officielles' ? 'Rooms officielles' : 'Toutes les rooms'} · ${PERIODS[lb.scorePeriod]}`
        : null,
  );
</script>

{#snippet chip(label, on, select)}
  <button class="chip" class:on aria-pressed={on} onclick={select}>{label}</button>
{/snippet}

<div class="toolbar">
  {#each TABS as [id, label] (id)}
    <button class="tab" class:active={lb.tab === id} aria-pressed={lb.tab === id} onclick={() => (lb.tab = id)}>{label}</button>
  {/each}
  <span class="sep"></span>

  {#if lb.tab === 'elo'}
    {#if loggedIn}
      <div class="chips">
        {@render chip('Global', lb.eloScope === 'global', () => (lb.eloScope = 'global'))}
        {@render chip('Amis', lb.eloScope === 'amis', () => (lb.eloScope = 'amis'))}
      </div>
      <span class="sep"></span>
    {/if}
    <span class="context">{lb.eloAmis ? 'Toi et tes amis · ELO' : 'Rooms officielles · Mode classique · Depuis toujours'}</span>
  {:else if lb.tab === 'cartes'}
    <span class="context">Collectionneurs · Score pondéré par rareté</span>
  {:else}
    <div class="chips">
      {@render chip('Classique', lb.scoreMode === 'classique', () => (lb.scoreMode = 'classique'))}
      {@render chip('QCM', lb.scoreMode === 'qcm', () => (lb.scoreMode = 'qcm'))}
      <span class="sep"></span>
      {@render chip('Officielles', lb.scoreRooms === 'officielles', () => (lb.scoreRooms = 'officielles'))}
      {@render chip('Toutes', lb.scoreRooms === 'toutes', () => (lb.scoreRooms = 'toutes'))}
      <span class="sep"></span>
      {@render chip('Semaine', lb.scorePeriod === 'semaine', () => (lb.scorePeriod = 'semaine'))}
      {@render chip('Mois', lb.scorePeriod === 'mois', () => (lb.scorePeriod = 'mois'))}
      {@render chip('Année', lb.scorePeriod === 'alltime', () => (lb.scorePeriod = 'alltime'))}
    </div>
  {/if}
</div>

{#if summary}
  <p class="summary">{summary}</p>
{/if}

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 24px 0 0;
    flex-wrap: wrap;
  }
  .tab {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 7px 20px;
    border: 1px solid var(--border2);
    border-radius: var(--r);
    color: var(--mid);
    cursor: pointer;
    background: none;
    transition: color 0.15s, background 0.15s, box-shadow 0.15s;
  }
  .tab:hover:not(.active) {
    color: var(--text);
  }
  .tab.active {
    color: var(--on-accent);
    background: var(--accent);
    border-color: var(--accent);
    box-shadow: 0 0 24px rgb(var(--accent-rgb) / 0.4);
  }
  .sep {
    width: 1px;
    height: 24px;
    background: var(--border2);
    margin: 0 6px;
    flex-shrink: 0;
  }
  .context,
  .summary {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .context {
    font-size: 0.76rem;
  }
  .summary {
    font-size: 0.7rem;
    padding-top: 12px;
  }
  .chips {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .chip {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.76rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 7px 13px;
    border: 1px solid var(--border);
    border-radius: var(--r);
    color: var(--mid);
    cursor: pointer;
    background: none;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .chip:hover:not(.on) {
    color: var(--text);
  }
  .chip.on {
    color: var(--text);
    border-color: rgb(var(--accent-rgb) / 0.6);
    background: rgb(var(--accent-rgb) / 0.08);
  }
</style>

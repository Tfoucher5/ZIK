<script>
  import { onMount } from 'svelte';
  import AchievementCard from './AchievementCard.svelte';

  let { sb, userId } = $props();

  let defs = $state([]);
  let unlocked = $state([]);
  let streaks = $state(null);
  let activeCat = $state('all');

  const CATEGORIES = [
    { id: 'all', label: 'Tous' },
    { id: 'streak', label: 'Séries' },
    { id: 'wins', label: 'Victoires' },
    { id: 'score', label: 'Score' },
    { id: 'social', label: 'Social' },
  ];

  const unlockedKeys = $derived(new Set(unlocked.map(u => `${u.achievement_id}:${u.tier || ''}`)));
  const repeatCounts = $derived(new Map(unlocked.map(u => [`${u.achievement_id}:${u.tier || ''}`, u.count])));
  const unlockedCount = $derived(new Set(unlocked.map(u => u.achievement_id)).size);
  const filteredDefs = $derived(activeCat === 'all' ? defs : defs.filter(d => d.category === activeCat));

  const COLLAPSED_COUNT = 6;
  let expanded = $state(false);
  const shownDefs = $derived(expanded ? filteredDefs : filteredDefs.slice(0, COLLAPSED_COUNT));

  onMount(async () => {
    if (!sb || !userId) return;
    const [{ data: d }, { data: u }, { data: p }] = await Promise.all([
      sb.from('achievements').select('*'),
      sb.from('user_achievements').select('achievement_id, tier, unlocked_at, count').eq('user_id', userId),
      sb.from('profiles').select('current_streak, best_streak, win_streak, best_win_streak').eq('id', userId).single(),
    ]);
    if (d?.length) defs = d;
    if (u) unlocked = u;
    if (p && p.current_streak !== undefined) streaks = p;
  });
</script>

{#if defs.length}
  <section class="ach-panel">
    {#if streaks}
      <div class="ach-streaks">
        <div class="ach-streak-card">
          <span class="ach-streak-icon">🔥</span>
          <div>
            <div class="ach-streak-value">{streaks.current_streak} jour{streaks.current_streak > 1 ? 's' : ''} d'affilée</div>
            <div class="ach-streak-record">Record : {streaks.best_streak}</div>
          </div>
        </div>
        <div class="ach-streak-card">
          <span class="ach-streak-icon">⚡</span>
          <div>
            <div class="ach-streak-value">{streaks.win_streak} victoire{streaks.win_streak > 1 ? 's' : ''} d'affilée</div>
            <div class="ach-streak-record">Record : {streaks.best_win_streak}</div>
          </div>
        </div>
      </div>
    {/if}

    <div class="ach-head">
      <h3 class="ach-title">Succès <span class="ach-count">{unlockedCount} / {defs.length}</span></h3>
      <div class="ach-filters">
        {#each CATEGORIES as c (c.id)}
          <button
            class="ach-filter"
            class:active={activeCat === c.id}
            onclick={() => { activeCat = c.id; expanded = false; }}
          >{c.label}</button>
        {/each}
      </div>
    </div>

    <div class="ach-grid">
      {#each shownDefs as def (def.id)}
        <AchievementCard {def} {unlockedKeys} {repeatCounts} />
      {/each}
    </div>

    {#if filteredDefs.length > COLLAPSED_COUNT}
      <div class="ach-toggle-row">
        <button class="ach-toggle" onclick={() => expanded = !expanded}>
          <span class="ach-toggle-car" class:open={expanded}>▾</span>
          {expanded ? 'Réduire' : `Voir les ${filteredDefs.length} badges`}
        </button>
      </div>
    {/if}
  </section>
{/if}

<style>
.ach-panel {
  margin: 0;
}

.ach-streaks {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}

.ach-streak-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgb(var(--c-glass, 255 255 255) / 0.04);
  border: 1px solid var(--border, rgb(var(--c-glass) / 0.1));
  border-radius: 14px;
  padding: 12px 18px;
  flex: 1;
  min-width: 220px;
}

.ach-streak-icon { font-size: 1.6rem; }
.ach-streak-value { font-weight: 800; font-size: 0.95rem; }
.ach-streak-record { font-size: 0.75rem; color: var(--dim, #9ca3af); }

.ach-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.ach-title {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0;
}

.ach-count {
  font-size: 0.78rem;
  color: var(--accent, #ff00ff);
  font-weight: 700;
  margin-left: 6px;
}

.ach-filters { display: flex; gap: 6px; flex-wrap: wrap; }

.ach-filter {
  background: transparent;
  border: 1px solid var(--border, rgb(var(--c-glass) / 0.12));
  color: var(--dim, #9ca3af);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ach-filter.active {
  border-color: rgb(var(--accent-rgb) / 0.4);
  color: var(--accent, #ff00ff);
  background: rgb(var(--accent-rgb) / 0.08);
}

.ach-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.ach-toggle-row { display: flex; justify-content: center; margin-top: 16px; }
.ach-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background: none;
  border: 1.5px dashed var(--border2, rgb(var(--c-glass) / 0.16));
  border-radius: 999px;
  color: var(--mid, rgb(var(--c-glass) / 0.46));
  padding: 8px 18px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.ach-toggle:hover { color: var(--accent, #ff00ff); border-color: rgb(var(--accent-rgb) / 0.5); }
.ach-toggle-car { display: inline-block; transition: transform 0.25s ease; }
.ach-toggle-car.open { transform: rotate(180deg); }

</style>

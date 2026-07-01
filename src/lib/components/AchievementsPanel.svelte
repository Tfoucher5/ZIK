<script>
  import { onMount } from 'svelte';

  let { sb, userId } = $props();

  let defs = $state([]);
  let unlocked = $state([]);
  let streaks = $state(null);
  let activeCat = $state('all');

  const TIER_LABELS = { bronze: 'Bronze', silver: 'Argent', gold: 'Or' };
  const CATEGORIES = [
    { id: 'all', label: 'Tous' },
    { id: 'streak', label: 'Séries' },
    { id: 'wins', label: 'Victoires' },
    { id: 'score', label: 'Score' },
    { id: 'social', label: 'Social' },
  ];

  const unlockedKeys = $derived(new Set(unlocked.map(u => `${u.achievement_id}:${u.tier || ''}`)));
  const unlockedCount = $derived(new Set(unlocked.map(u => u.achievement_id)).size);
  const filteredDefs = $derived(activeCat === 'all' ? defs : defs.filter(d => d.category === activeCat));

  function bestTier(def) {
    if (def.type !== 'tiered' || !Array.isArray(def.tiers)) return null;
    let best = null;
    for (const t of def.tiers) {
      if (unlockedKeys.has(`${def.id}:${t.level}`)) best = t.level;
    }
    return best;
  }

  function isUnlocked(def) {
    if (def.type === 'one_time') return unlockedKeys.has(`${def.id}:`);
    return bestTier(def) !== null;
  }

  onMount(async () => {
    if (!sb || !userId) return;
    const [{ data: d }, { data: u }, { data: p }] = await Promise.all([
      sb.from('achievements').select('*'),
      sb.from('user_achievements').select('achievement_id, tier, unlocked_at').eq('user_id', userId),
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
            onclick={() => activeCat = c.id}
          >{c.label}</button>
        {/each}
      </div>
    </div>

    <div class="ach-grid">
      {#each filteredDefs as def (def.id)}
        {@const won = isUnlocked(def)}
        {@const tier = bestTier(def)}
        <div class="ach-card" class:locked={!won} class:ach-card--legendary={won && def.rarity === 'legendary'}>
          <span class="ach-card-icon">{def.icon}</span>
          <div class="ach-card-body">
            <div class="ach-card-name">
              {def.name}
              {#if tier}
                <span class="ach-card-tier ach-card-tier--{tier}">{TIER_LABELS[tier]}</span>
              {/if}
            </div>
            <div class="ach-card-desc">{def.description}</div>
            {#if def.type === 'tiered' && Array.isArray(def.tiers)}
              <div class="ach-card-dots">
                {#each def.tiers as t (t.level)}
                  <span
                    class="ach-dot ach-dot--{t.level}"
                    class:on={unlockedKeys.has(`${def.id}:${t.level}`)}
                    title="{TIER_LABELS[t.level]} : {t.target}"
                  ></span>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </section>
{/if}

<style>
.ach-panel {
  max-width: 980px;
  margin: 28px auto 0;
  padding: 0 clamp(16px, 5vw, 60px);
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
  border: 1px solid var(--border, rgba(255,255,255,0.1));
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
  border: 1px solid var(--border, rgba(255,255,255,0.12));
  color: var(--dim, #9ca3af);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.ach-filter.active {
  border-color: rgba(255, 0, 255, 0.4);
  color: var(--accent, #ff00ff);
  background: rgba(255, 0, 255, 0.08);
}

.ach-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
  padding-bottom: 28px;
}

.ach-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: rgb(var(--c-glass, 255 255 255) / 0.04);
  border: 1px solid var(--border, rgba(255,255,255,0.1));
  border-radius: 14px;
  padding: 14px;
}

.ach-card.locked { opacity: 0.42; filter: grayscale(0.8); }

.ach-card--legendary {
  border-color: rgba(250, 204, 21, 0.45);
  box-shadow: 0 0 18px rgba(250, 204, 21, 0.08);
}

.ach-card-icon { font-size: 1.5rem; line-height: 1.2; }

.ach-card-body { min-width: 0; }

.ach-card-name {
  font-weight: 800;
  font-size: 0.88rem;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ach-card-tier {
  font-size: 0.62rem;
  font-weight: 800;
  padding: 1px 8px;
  border-radius: 999px;
  text-transform: uppercase;
}
.ach-card-tier--bronze { background: rgba(180, 100, 50, 0.25); color: #e8a97a; }
.ach-card-tier--silver { background: rgba(190, 195, 205, 0.22); color: #d8dde6; }
.ach-card-tier--gold   { background: rgba(250, 204, 21, 0.22); color: #fde68a; }

.ach-card-desc {
  font-size: 0.74rem;
  color: var(--dim, #9ca3af);
  margin-top: 3px;
  line-height: 1.4;
}

.ach-card-dots { display: flex; gap: 5px; margin-top: 8px; }

.ach-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.ach-dot--bronze.on { background: #b46432; border-color: #e8a97a; }
.ach-dot--silver.on { background: #bec3cd; border-color: #e5e9f0; }
.ach-dot--gold.on   { background: #facc15; border-color: #fde68a; }
</style>

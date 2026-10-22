<script>
  /** Carte d'un succès : débloqué ou non, palier atteint, nombre de fois. */
  let { def, unlockedKeys, repeatCounts } = $props();

  const TIER_LABELS = { bronze: 'Bronze', silver: 'Argent', gold: 'Or' };

  const tier = $derived.by(() => {
    if (def.type !== 'tiered' || !Array.isArray(def.tiers)) return null;
    let best = null;
    for (const t of def.tiers) {
      if (unlockedKeys.has(`${def.id}:${t.level}`)) best = t.level;
    }
    return best;
  });
  const won = $derived(def.type === 'one_time' ? unlockedKeys.has(`${def.id}:`) : tier !== null);
  const repeatCount = $derived(def.type === 'one_time' ? (repeatCounts.get(`${def.id}:`) ?? 0) : 0);
</script>

<div class="ach-card" class:locked={!won} class:ach-card--legendary={won && def.rarity === 'legendary'}>
  <span class="ach-card-icon">{def.icon}</span>
  <div class="ach-card-body">
    <div class="ach-card-name">
      {def.name}
      {#if tier}
        <span class="ach-card-tier ach-card-tier--{tier}">{TIER_LABELS[tier]}</span>
      {/if}
      {#if repeatCount > 1}
        <span class="ach-card-repeat">×{repeatCount}</span>
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

<style>
.ach-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: rgb(var(--c-glass, 255 255 255) / 0.04);
  border: 1px solid var(--border, rgb(var(--c-glass) / 0.1));
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

.ach-card-repeat {
  font-size: 0.62rem;
  font-weight: 800;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgb(var(--accent-rgb) / 0.16);
  color: var(--accent, #ff00ff);
}

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
  background: rgb(var(--c-glass) / 0.1);
  border: 1px solid rgb(var(--c-glass) / 0.15);
}
.ach-dot--bronze.on { background: #b46432; border-color: #e8a97a; }
.ach-dot--silver.on { background: #bec3cd; border-color: #e5e9f0; }
.ach-dot--gold.on   { background: #facc15; border-color: #fde68a; }
</style>

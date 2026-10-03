<script>
  import { fmtScore } from '$lib/profile/stats.js';

  /**
   * Meilleurs scores par room officielle, et répartition des parties par type
   * de room.
   *
   * @type {{
   *   itineraire: Array<{ room: { code: string, name: string, emoji?: string }, score: number }>,
   *   parType: { official: {count: number, totalScore: number}, public: {count: number, totalScore: number}, private: {count: number, totalScore: number} },
   * }}
   */
  let { itineraire, parType } = $props();

  const total = $derived(parType.official.count + parType.public.count + parType.private.count);
  const part = (c) => (total > 0 ? Math.round((c / total) * 100) : 0);
</script>

<div class="split">
  <div class="case tour-map">
    {#if itineraire.length}
      <div class="tour-line"></div>
      {#each itineraire as stop (stop.room.code)}
        <div class="tour-stop">
          <span class="tour-dot"></span>
          <div class="tour-city"><b>{stop.room.emoji ?? '🎵'} {stop.room.name}</b><small>Room officielle</small></div>
          <span class="tour-score">{stop.score}</span>
        </div>
      {/each}
    {:else}
      <p class="pv-empty">Aucune partie sur les rooms officielles.</p>
    {/if}
  </div>
  <div>
    <div class="tape" style="margin-bottom:14px">Répartition</div>
    <div class="case tiers">
      {#if total > 0}
        <div class="tier-bar">
          <i style="width:{part(parType.official.count)}%;background:var(--accent)"></i>
          <i style="width:{part(parType.public.count)}%;background:rgb(var(--accent-rgb) / 0.45)"></i>
          <i style="width:{part(parType.private.count)}%;background:rgb(var(--accent-rgb) / 0.18)"></i>
        </div>
        <div class="tier-row"><span class="tier-dot" style="background:var(--accent)"></span><span class="tier-name">Rooms officielles</span><span class="tier-count">{parType.official.count}</span><span class="tier-pts">{fmtScore(parType.official.totalScore)} pts</span></div>
        <div class="tier-row"><span class="tier-dot" style="background:rgb(var(--accent-rgb) / 0.6)"></span><span class="tier-name">Rooms publiques</span><span class="tier-count">{parType.public.count}</span><span class="tier-pts">{fmtScore(parType.public.totalScore)} pts</span></div>
        <div class="tier-row"><span class="tier-dot" style="background:rgb(var(--accent-rgb) / 0.3)"></span><span class="tier-name">Rooms privées</span><span class="tier-count">{parType.private.count}</span><span class="tier-pts">{fmtScore(parType.private.totalScore)} pts</span></div>
      {:else}
        <p class="pv-empty">Aucune partie jouée.</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
  .tour-map { padding: 22px 26px; position: relative; }
  .tour-line { position: absolute; left: 38px; top: 40px; bottom: 40px; width: 2px; background: var(--border2); }
  .tour-stop { display: flex; align-items: center; gap: 18px; padding: 11px 0; position: relative; z-index: 1; }
  .tour-dot { width: 16px; height: 16px; border-radius: 50%; background: var(--bg2); border: 2px solid var(--accent); flex-shrink: 0; margin-left: 6px; box-shadow: 0 0 0 4px var(--bg2); }
  .tour-stop:first-child .tour-dot { background: var(--accent); box-shadow: 0 0 0 4px var(--bg2), 0 0 14px rgb(var(--accent-rgb) / 0.6); }
  .tour-city { flex: 1; min-width: 0; }
  .tour-city b { font-weight: 600; font-size: 0.92rem; }
  .tour-city small { display: block; font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.58rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--dim); margin-top: 2px; }
  .tour-score { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 1rem; color: var(--accent); }

  .tiers { padding: 22px 24px; }
  .tier-bar { display: flex; gap: 3px; height: 10px; border-radius: 2px; overflow: hidden; margin-bottom: 18px; }
  .tier-bar i { display: block; height: 100%; }
  .tier-row { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-bottom: 1px dashed var(--border); font-size: 0.82rem; }
  .tier-row:last-child { border-bottom: none; padding-bottom: 0; }
  .tier-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .tier-name { flex: 1; color: var(--mid); }
  .tier-count { font-family: "JetBrains Mono", monospace; font-size: 0.66rem; color: var(--dim); }
  .tier-pts { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 0.78rem; }

  @media (max-width: 640px) {
    .split { grid-template-columns: 1fr; }
  }
</style>

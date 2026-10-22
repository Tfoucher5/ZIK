<script>
  import { modeRules } from '$lib/shared/rooms/room-content.js';

  /** Fiche d'une room : règles du mode, réglages, artistes et classement de la semaine. */
  let { room, trackCount, artists, leaderboard } = $props();

  const mode = $derived(modeRules(room.game_mode));
</script>

<section class="room-info">
  <div class="room-info-card">
    <h2>{mode.label}</h2>
    <p class="room-info-intro">{mode.intro}</p>
    <ul class="room-rules">
      {#each mode.rules as rule (rule)}
        <li>{rule}</li>
      {/each}
    </ul>
  </div>

  <div class="room-info-card">
    <h2>La partie en bref</h2>
    <dl class="room-specs">
      <div><dt>Manches</dt><dd>{room.max_rounds}</dd></div>
      <div><dt>Par manche</dt><dd>{room.round_duration} s</dd></div>
      {#if trackCount}
        <div><dt>Titres en jeu</dt><dd>{trackCount}</dd></div>
      {/if}
    </dl>
    <p class="room-info-foot">
      <a href="/docs">Comment ça marche ?</a>
    </p>
  </div>

  {#if artists.length}
    <div class="room-info-card">
      <h2>Artistes les plus présents</h2>
      <ul class="room-artists">
        {#each artists as a (a.artist)}
          <li><span class="ra-name">{a.artist}</span><span class="ra-count">{a.count}</span></li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if leaderboard.length}
    <div class="room-info-card">
      <h2>Classement de la semaine</h2>
      <ol class="room-lb">
        {#each leaderboard as p, i (p.username)}
          <li>
            <span class="lb-rank">{i + 1}</span>
            <span class="lb-name">{p.username}</span>
            <span class="lb-score">{p.weekly_score}</span>
          </li>
        {/each}
      </ol>
    </div>
  {/if}
</section>

<style>
  .room-info {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 clamp(16px, 5vw, 80px) 80px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
    align-items: start;
  }
  .room-info-card {
    background: var(--surface, rgb(var(--c-glass) / 0.04));
    border: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
    border-radius: 16px;
    padding: 22px;
  }
  .room-info-card h2 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 12px;
    color: var(--text, #f1f5f9);
  }
  .room-info-intro {
    font-size: 0.9rem;
    color: var(--mid, #94a3b8);
    line-height: 1.6;
    margin: 0 0 12px;
  }
  .room-rules {
    margin: 0;
    padding-left: 18px;
    color: var(--mid, #94a3b8);
    font-size: 0.88rem;
    line-height: 1.7;
  }
  .room-specs {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .room-specs > div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
    padding-bottom: 6px;
  }
  .room-specs dt {
    color: var(--dim, #64748b);
    font-size: 0.85rem;
  }
  .room-specs dd {
    margin: 0;
    color: var(--text, #f1f5f9);
    font-weight: 600;
    font-size: 0.9rem;
  }
  .room-info-foot {
    margin: 14px 0 0;
    font-size: 0.82rem;
  }
  .room-info-foot a {
    color: var(--accent);
    text-decoration: none;
  }
  .room-info-foot a:hover { text-decoration: underline; }

  .room-artists {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .room-artists li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 0.88rem;
  }
  .ra-name { color: var(--text, #f1f5f9); }
  .ra-count { color: var(--dim, #64748b); }

  .room-lb {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .room-lb li {
    display: grid;
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    gap: 10px;
    font-size: 0.88rem;
  }
  .lb-rank {
    color: var(--accent);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 800;
  }
  .lb-name {
    color: var(--text, #f1f5f9);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .lb-score { color: var(--mid, #94a3b8); font-weight: 600; }
</style>

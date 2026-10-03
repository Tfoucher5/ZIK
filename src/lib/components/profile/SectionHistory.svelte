<script>
  import { fmtDate } from '$lib/profile/stats.js';

  /** @type {{ parties: Array<{score: number, rank: number|null, endedAt: string, roomName: string, roomEmoji: string, gmode: 'cl'|'qcm'}> }} */
  let { parties } = $props();

  function rangLabel(r) {
    if (r == null) return '—';
    if (r === 1) return '🥇 1er';
    if (r === 2) return '🥈 2e';
    if (r === 3) return '🥉 3e';
    return `#${r}`;
  }
</script>

<div class="case log">
  {#if parties.length}
    <div class="log-head"><span>#</span><span>Room</span><span>Mode</span><span>Date</span><span style="text-align:right">Score</span><span style="text-align:right">Rang</span></div>
    {#each parties as g, i (i)}
      <div class="log-row" class:cl={g.gmode === 'cl'} class:qcm={g.gmode === 'qcm'}>
        <span class="log-num">{String(i + 1).padStart(2, '0')}</span>
        <div class="log-room">{g.roomEmoji} {g.roomName}</div>
        <span class="log-mode" class:m-cl={g.gmode === 'cl'} class:m-qcm={g.gmode === 'qcm'}>{g.gmode === 'qcm' ? 'QCM' : 'Classique'}</span>
        <span class="log-date">{fmtDate(g.endedAt)}</span>
        <span class="log-score">{g.score}</span>
        <span class="log-rank" class:r1={g.rank === 1}>{rangLabel(g.rank)}</span>
      </div>
    {/each}
  {:else}
    <p class="pv-empty" style="padding:20px">Aucune partie jouée pour le moment.</p>
  {/if}
</div>

<style>
  .log { padding: 6px 0 4px; }
  .log-head { display: grid; grid-template-columns: 40px 1fr 100px 100px 80px 60px; gap: 12px; padding: 10px 20px; border-bottom: 1px solid var(--border2); font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.58rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--dim); }
  .log-row { display: grid; grid-template-columns: 40px 1fr 100px 100px 80px 60px; gap: 12px; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--border); position: relative; }
  .log-row:last-child { border-bottom: none; }
  .log-row::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; }
  .log-row.cl::before { background: var(--accent); }
  .log-row.qcm::before { background: var(--success); }
  .log-num { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1rem; color: var(--dim); }
  .log-room { font-weight: 600; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .log-mode { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.66rem; letter-spacing: 0.14em; text-transform: uppercase; }
  .log-mode.m-cl { color: var(--accent); }
  .log-mode.m-qcm { color: var(--success); }
  .log-date { font-family: "JetBrains Mono", monospace; font-size: 0.68rem; color: var(--mid); }
  .log-score { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 0.85rem; text-align: right; }
  .log-rank { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 0.82rem; text-align: right; color: var(--mid); }
  .log-rank.r1 { color: var(--gold); }

  @media (max-width: 640px) {
    .log-head { display: none; }
    .log-row { grid-template-columns: 1fr 64px; }
    .log-num, .log-mode, .log-date, .log-rank { display: none; }
  }
</style>

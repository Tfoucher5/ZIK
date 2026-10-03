<script>
  import { eloRatio } from '$lib/profile/stats.js';

  /**
   * Chiffres du mode sélectionné : cadran ELO, tableau de valeurs, progression
   * de niveau et courbe d'évolution des scores.
   *
   * Le mode est piloté par le parent, qui s'en sert aussi pour le sous-titre
   * de la section.
   *
   * @type {{
   *   elo: number, niveau: number, xp: number, xpMax: number, xpPct: number,
   *   valeurs: Array<{ k: string, v: string|number }>,
   *   courbe: { line: string, area: string, last: number[]|null, min: number, max: number, lastScore: number|null },
   *   nbRecentes: number,
   *   qcm: boolean,
   *   onMode: (m: 'classic'|'qcm') => void,
   * }}
   */
  let { elo, niveau, xp, xpMax, xpPct, valeurs, courbe, nbRecentes, qcm, onMode } = $props();

  const SEGMENTS = 26;
  const allumes = $derived(Math.round((SEGMENTS * xpPct) / 100));

  // Arc du cadran : demi-cercle de rayon 96, soit ~311px de contour.
  const CIRC = 311;
  const ratio = $derived(eloRatio(elo));
  const offset = $derived(CIRC * (1 - ratio));
  const angle = $derived(-90 + ratio * 180);
</script>

<div class="case rider-body">
  <div class="mode-tabs" role="tablist">
    <button class:on={!qcm} role="tab" aria-selected={!qcm} onclick={() => onMode('classic')}>Classique</button>
    <button class:on={qcm} data-mode="qcm" role="tab" aria-selected={qcm} onclick={() => onMode('qcm')}>QCM</button>
  </div>
  <div class="rider-top">
    <div class="dial">
      <svg viewBox="0 0 220 128" aria-hidden="true">
        <path d="M22,118 A96,96 0 0,1 198,118" fill="none" stroke="var(--pv-track)" stroke-width="14" stroke-linecap="round"/>
        <path d="M22,118 A96,96 0 0,1 198,118" fill="none" stroke="url(#pvdg)" stroke-width="14" stroke-linecap="round"
          stroke-dasharray={CIRC} style="stroke-dashoffset:{offset}; transition:stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)"/>
        <defs><linearGradient id="pvdg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--success)"/><stop offset="55%" stop-color="var(--accent)"/><stop offset="100%" stop-color="var(--gold)"/>
        </linearGradient></defs>
        <line x1="110" y1="118" x2="110" y2="46" stroke="var(--text)" stroke-width="3" stroke-linecap="round"
          style="transform-origin:110px 118px; transform:rotate({angle}deg); transition:transform 1.2s cubic-bezier(.22,1.4,.36,1)"/>
        <circle cx="110" cy="118" r="7" fill="var(--bg2)" stroke="var(--text)" stroke-width="2.5"/>
      </svg>
      <div class="dial-read"><b>{elo || '—'}</b><span>points ELO</span></div>
    </div>
    <div class="dial-side">
      <div class="kv">
        {#each valeurs as st (st.k)}
          <div class="kv-row"><span class="k">{st.k}</span><span class="v">{st.v}</span></div>
        {/each}
      </div>
    </div>
  </div>
  <div class="power">
    <div class="power-top"><span class="lv">Niveau <b>{niveau}</b> → {niveau + 1}</span><span class="xp">{(xp ?? 0).toLocaleString('fr-FR')} / {xpMax.toLocaleString('fr-FR')} XP · {xpPct}&nbsp;%</span></div>
    <div class="power-bar">
      {#each Array(SEGMENTS), i (i)}<i class:on={i < allumes}></i>{/each}
    </div>
  </div>
</div>

{#if courbe.line}
  <div class="case form-wrap">
    <div class="eyebrow" style="margin-bottom:6px">Évolution des scores · <b>{nbRecentes} dernières</b></div>
    <svg viewBox="0 0 640 130" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="30" x2="640" y2="30" stroke="var(--pv-grid)"/>
      <line x1="0" y1="80" x2="640" y2="80" stroke="var(--pv-grid)"/>
      <defs><linearGradient id="pvfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgb(var(--accent-rgb) / 0.28)"/><stop offset="100%" stop-color="rgb(var(--accent-rgb) / 0)"/></linearGradient></defs>
      <polygon points={courbe.area} fill="url(#pvfg)"/>
      <polyline points={courbe.line} fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      {#if courbe.last}<circle cx={courbe.last[0]} cy={courbe.last[1]} r="4.5" fill="var(--accent)"/>{/if}
    </svg>
    <div class="form-caption">
      <span>plus ancien</span>
      <span class="form-range">min {courbe.min} · max {courbe.max}</span>
      <span>récent · {courbe.lastScore} pts</span>
    </div>
  </div>
{/if}

<style>
  .rider-body { padding: 24px; }
  .mode-tabs { display: inline-flex; border: 1.5px solid var(--border2); border-radius: 99px; overflow: hidden; margin-bottom: 18px; }
  .mode-tabs button { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; background: none; border: none; border-right: 1px solid var(--border); color: var(--mid); padding: 8px 16px; cursor: pointer; }
  .mode-tabs button:last-child { border-right: none; }
  .mode-tabs button.on { color: var(--on-accent); background: var(--accent); }
  .mode-tabs button[data-mode="qcm"].on { background: var(--success); }
  .rider-top { display: flex; align-items: center; gap: 34px; flex-wrap: wrap; margin-bottom: 20px; }
  .dial { width: 210px; flex-shrink: 0; text-align: center; }
  .dial svg { width: 100%; display: block; overflow: visible; }
  .dial-read { margin-top: 10px; }
  .dial-read b { display: block; font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 2rem; line-height: 1; color: var(--accent); font-variant-numeric: tabular-nums; }
  .dial-read span { display: block; font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.6rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--dim); margin-top: 7px; }
  .dial-side { flex: 1; min-width: 220px; }
  .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
  .kv-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px dotted var(--border2); }
  .kv-row .k { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.66rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); }
  .kv-row .v { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 0.92rem; font-variant-numeric: tabular-nums; }

  .power { margin-top: 6px; }
  .power-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  .power-top .lv { font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 0.95rem; letter-spacing: 0.08em; text-transform: uppercase; }
  .power-top .lv b { color: var(--accent); }
  .power-top .xp { font-family: "JetBrains Mono", monospace; font-size: 0.68rem; color: var(--mid); }
  .power-bar { height: 11px; border-radius: 2px; background: rgb(var(--c-glass) / 0.06); display: flex; gap: 2px; padding: 2px; }
  .power-bar i { flex: 1; border-radius: 1px; background: rgb(var(--c-glass) / 0.06); transition: background 0.4s ease; }
  .power-bar i.on { background: linear-gradient(180deg, var(--accent), var(--accent2)); box-shadow: 0 0 6px rgb(var(--accent-rgb) / 0.5); }

  .form-wrap { padding: 20px 24px 16px; margin-top: 16px; }
  .form-wrap svg { width: 100%; height: auto; display: block; }
  .form-range { color: var(--mid); }
  .form-caption { display: flex; justify-content: space-between; font-family: "JetBrains Mono", monospace; font-size: 0.6rem; color: var(--dim); margin-top: 4px; }

  @media (max-width: 640px) {
    .kv { grid-template-columns: 1fr; }
    .rider-top { flex-direction: column; gap: 20px; }
    .dial { align-self: center; }
    .dial-side { width: 100%; min-width: 0; }
  }
</style>

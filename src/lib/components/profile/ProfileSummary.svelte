<script>
  /**
   * Sommaire latéral du profil. Les sections lui sont fournies déjà filtrées :
   * il se contente de les afficher et de signaler la navigation.
   *
   * @type {{ sections: Array<{id: string, n: string, t: string}>, active: string, onGoTo: (id: string) => void }}
   */
  let { sections, active, onGoTo } = $props();
</script>

<aside class="rail">
  <div class="rail-card">
    <div class="rail-lbl">Sommaire</div>
    <nav class="rail-nav">
      {#each sections as s (s.id)}
        <button class="rail-link" class:active={active === s.id} onclick={() => onGoTo(s.id)}>
          <span class="n">{s.n}</span><span class="t">{s.t}</span>
        </button>
      {/each}
    </nav>
  </div>
</aside>

<style>
  .rail { position: sticky; top: calc(var(--nav-h) + 16px); }
  .rail-card { border: 1px solid var(--border2); border-radius: var(--radius); background: var(--bg2); padding: 14px; }
  .rail-lbl { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.58rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--dim); padding: 0 4px 12px; }
  .rail-nav { display: flex; flex-direction: column; }
  .rail-link { display: flex; align-items: center; gap: 11px; padding: 9px 8px; border-radius: var(--radius); background: none; border: none; border-left: 2px solid transparent; color: var(--mid); cursor: pointer; transition: all 0.18s; text-align: left; font-family: inherit; }
  .rail-link .n { font-family: "JetBrains Mono", monospace; font-size: 0.62rem; color: var(--dim); width: 18px; }
  .rail-link .t { font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.86rem; letter-spacing: 0.06em; text-transform: uppercase; }
  .rail-link:hover { color: var(--text); background: rgb(var(--c-glass) / 0.03); }
  .rail-link.active { color: var(--accent); border-left-color: var(--accent); background: rgb(var(--accent-rgb) / 0.07); }
  .rail-link.active .n { color: var(--accent); }

  @media (max-width: 1000px) {
    .rail { position: static; margin-bottom: 36px; }
    .rail-nav { flex-direction: row; flex-wrap: wrap; }
    .rail-link { border-left: none; border-bottom: 2px solid transparent; }
    .rail-link.active { border-left: none; border-bottom-color: var(--accent); }
  }
</style>

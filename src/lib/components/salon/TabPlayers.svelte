<script>
  /**
   * Onglet « Joueurs » : qui est là, qui a répondu, ajustement des scores.
   *
   * L'état « a répondu » existait déjà mais s'affichait par un fond vert à
   * 8 % d'opacité, imperceptible sur fond clair. Il devient une pastille
   * explicite, lisible d'un coup d'œil pendant une manche.
   *
   * @type {{
   *   players: any[], teams: any[]|null, phase: string, code: string,
   *   pro: boolean, step: number, confirmKick: string|null,
   *   onScore: (username: string, delta: number) => void,
   *   onKick: (username: string) => void,
   *   onTeam: (username: string, team: number) => void,
   * }}
   */
  let { players, teams, phase, code, pro, step, confirmKick, onScore, onKick, onTeam } = $props();

  const aRepondu = (p) => phase === 'round' && (p.foundThisRound || p.answeredThisRound);
</script>

{#if teams}
  <ol class="tp-teams">
    {#each teams as t (t.id)}
      <li style="--tc:var(--q{t.id})"><b>{t.name}</b><span>{t.members.length} j.</span><span class="pts">{t.score}</span></li>
    {/each}
  </ol>
{/if}

{#if players.length === 0}
  <div class="tp-vide">
    <p><b>Personne pour l'instant.</b></p>
    <p>Les joueurs rejoignent sur <b>zik-music.fr/salon/play</b> avec le code <b class="tp-code">{code}</b>, ou en scannant le QR code affiché sur la TV.</p>
  </div>
{:else}
  <ul class="tp-list">
    {#each players as p (p.username)}
      <li class:off={p.offline}>
        <span class="tp-nom">
          {#if teams && p.team != null}<i class="tp-pastille" style="--tc:var(--q{p.team})"></i>{/if}{p.username}
          {#if p.offline}<small>déconnecté</small>{/if}
        </span>

        {#if aRepondu(p)}
          <span class="tp-repondu">a répondu</span>
        {:else if phase === 'round'}
          <span class="tp-attente">en attente</span>
        {/if}

        {#if teams}
          <select value={p.team} disabled={!pro} title={pro ? '' : 'ZIK Pro'} onchange={(e) => onTeam(p.username, +e.target.value)} aria-label="Équipe de {p.username}">
            {#each teams as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
          </select>
        {/if}

        <span class="tp-score">
          <button onclick={() => onScore(p.username, -step)} aria-label="Retirer {step} point à {p.username}">−</button>
          <b>{p.score}</b>
          <button onclick={() => onScore(p.username, step)} aria-label="Ajouter {step} point à {p.username}">+</button>
        </span>

        <button class="tp-kick" class:confirm={confirmKick === p.username} onclick={() => onKick(p.username)}>
          {confirmKick === p.username ? 'Confirmer' : 'Exclure'}
        </button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .tp-teams { list-style: none; margin: 0 0 20px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .tp-teams li {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px; border-left: 3px solid var(--tc); background: var(--surface);
    border-radius: 2px; font-size: 0.9rem;
  }
  .tp-teams b { flex: 1; }
  .tp-teams span { font-family: var(--s-mono); font-size: 0.78rem; color: var(--mid); }
  .tp-teams .pts { color: var(--accent); font-weight: 700; }

  .tp-vide { padding: 28px 4px; color: var(--mid); font-size: 0.9rem; line-height: 1.6; }
  .tp-vide p { margin: 0 0 8px; }
  .tp-code { font-family: var(--s-mono); letter-spacing: 0.2em; color: var(--accent); }

  .tp-list { list-style: none; margin: 0; padding: 0; }
  .tp-list li {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    padding: 12px 4px; border-bottom: 1px solid var(--border);
  }
  .tp-list li:last-child { border-bottom: none; }
  .tp-list li.off { opacity: 0.5; }

  .tp-nom { flex: 1; min-width: 120px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; }
  .tp-nom small { font-size: 0.68rem; color: var(--dim); font-weight: 400; }
  .tp-pastille { width: 9px; height: 9px; border-radius: 50%; background: var(--tc); flex-shrink: 0; }

  /* Remplace un fond vert à 8 % d'opacité, invisible sur fond clair. */
  .tp-repondu, .tp-attente {
    font-family: "Barlow Condensed", sans-serif; font-weight: 700;
    font-size: 0.64rem; letter-spacing: 0.14em; text-transform: uppercase;
    padding: 3px 9px; border-radius: 99px; flex-shrink: 0;
  }
  .tp-repondu { background: rgb(74 222 128 / 0.18); color: var(--success); }
  .tp-attente { background: var(--surface2); color: var(--dim); }

  .tp-score { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .tp-score button {
    width: 36px; height: 36px; border-radius: 2px;
    border: 1px solid var(--border2); background: none; color: var(--text);
    font-size: 1rem; cursor: pointer;
  }
  .tp-score button:hover { border-color: var(--accent); color: var(--accent); }
  .tp-score b { min-width: 34px; text-align: center; font-family: var(--s-mono); }

  .tp-kick {
    padding: 7px 12px; border-radius: 2px;
    border: 1px solid var(--border2); background: none; color: var(--mid);
    font: inherit; font-size: 0.76rem; cursor: pointer; flex-shrink: 0;
  }
  .tp-kick:hover, .tp-kick.confirm { border-color: var(--danger); color: var(--danger); }
  .tp-kick.confirm { background: rgb(248 113 113 / 0.1); font-weight: 700; }

  select {
    padding: 7px 9px; border-radius: 2px;
    border: 1px solid var(--border2); background: var(--bg2); color: var(--text);
    font: inherit; font-size: 0.8rem; flex-shrink: 0;
  }
  select:disabled { opacity: 0.5; }

  @media (max-width: 520px) {
    .tp-nom { min-width: 100%; }
  }
</style>

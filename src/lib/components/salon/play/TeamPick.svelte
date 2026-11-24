<script>
  import { teamColor } from '#lib/data/salonOptions.js';
  /** Choix d'équipe plein écran : les boutons remplissent l'écran, la liste défile au-delà. */
  let { p } = $props();
</script>

<section class="sp-pick" aria-labelledby="sp-pick-h">
  <p class="sp-who">{p.username} · {p.code}</p>
  <p class="sx-kicker sp-ok"><b>●</b> {p.connLost ? 'Reconnexion…' : 'Connecté'}</p>
  <h1 class="sp-h" id="sp-pick-h">Choisis<br>ton équipe</h1>
  <div class="sp-camps">
    {#each p.teams as t (t.id)}
      <button
        class="sp-camp"
        style="--tc:{teamColor(t.id)}"
        aria-pressed={p.myTeam === t.id}
        onclick={() => p.pickTeam(t.id)}
      >
        <b>{t.name}</b>
        <span>{t.size} joueur{t.size > 1 ? 's' : ''}</span>
      </button>
    {/each}
  </div>
  <p class="sp-hint">Tu peux changer jusqu'au lancement.</p>
  <ol class="sp-frise" style="--p:.66"><li class="on">Pseudo</li><li class="on">Équipe</li><li>La TV</li></ol>
</section>

<style>
  .sp-pick {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .sp-who {
    font-family: var(--s-mono);
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--mid);
    text-align: right;
  }
  .sp-camps {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .sp-camp {
    flex: 1 0 72px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 0 22px;
    border: 0;
    border-radius: 22px;
    background: var(--tc);
    color: #000;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: transform 0.12s;
  }
  .sp-camp:active {
    transform: scale(0.97);
  }
  .sp-camp[aria-pressed='true'] {
    outline: 4px solid var(--text);
    outline-offset: -4px;
  }
  .sp-camp b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: clamp(2rem, 11vw, 3.2rem);
    line-height: 1.05;
    text-transform: uppercase;
  }
  .sp-camp span {
    font-family: var(--s-mono);
    font-weight: 700;
    font-size: 0.85rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .sp-hint {
    margin-top: 0;
  }
</style>

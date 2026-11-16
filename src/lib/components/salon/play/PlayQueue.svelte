<script>
  import { FREE_MAX_PLAYERS } from '$lib/data/proPlans.js';
  import { quitQueue } from './playerJoin.js';
  /** Soirée complète : le téléphone attend à l'entrée et entre seul dès qu'une place se libère. Aucun rang, aucun prix. */
  let { p } = $props();

  const seats = [...Array(FREE_MAX_PLAYERS).keys()];
  let confirming = $state(false);
  const quit = () => (confirming ? quitQueue(p) : (confirming = true));
  // Équipes connues seulement si ce téléphone était déjà entré dans la soirée
  const steps = $derived(p.teams ? ['Pseudo', 'Équipe', 'La TV'] : ['Pseudo', 'La TV']);
</script>

<section class="sp-queue" aria-labelledby="sp-queue-h">
  {#if p.connLost}
    <p class="sp-strip lost" role="status"><span><b>Réseau perdu.</b> On te reconnecte : ta place dans la file est gardée 10 minutes.</span></p>
  {/if}
  <p class="sp-who">{p.username} · {p.code}</p>
  <p class="sx-kicker sp-state" class:lost={p.connLost}><b>●</b> {p.connLost ? 'Reconnexion' : "En file d'attente"}</p>
  <h1 class="sp-h" id="sp-queue-h">Tu entres si une place se libère.</h1>
  <p class="sp-lead">La soirée est complète pour l'instant. Garde cette page ouverte : tu entres automatiquement, sans rescanner.</p>

  <div class="sp-places" role="img" aria-label="La soirée est complète, tu attends à l'entrée">
    <div class="row" aria-hidden="true">
      {#each seats as i (i)}<i></i>{/each}
      <span class="wall"></span>
      <i class="me">{p.username}</i>
    </div>
    <p class="labels" aria-hidden="true"><span>Complet</span><span>Toi, à l'entrée</span></p>
  </div>

  {#if !p.connLost}
    <div class="sp-mode">
      <p class="sx-kicker">Ton pseudo</p>
      <p class="name"><b>{p.username}</b><span>Réservé</span></p>
      <p>Personne ne peut te le prendre pendant que tu attends. Écran verrouillé ? Ta place t'attend 10 minutes.</p>
    </div>
  {/if}

  <div class="bottom">
    {#if !confirming && !p.connLost}<p class="sp-hint">En attendant, rien ne t'empêche de chanter.</p>{/if}
    <!-- Un seul bouton : le focus reste dessus au second appui -->
    <button class="quit" class:sure={confirming} onclick={quit} aria-describedby={confirming ? 'sp-queue-quit' : undefined}>
      {confirming ? 'Confirmer : quitter la file' : 'Quitter la file'}
    </button>
    {#if confirming}<small id="sp-queue-quit">Tu perds ta place dans la file et ton pseudo réservé.</small>{/if}
  </div>
  <ol class="sp-frise" style:--p={1 / steps.length}>
    {#each steps as s, i (s)}<li class:on={i === 0}>{s}</li>{/each}
  </ol>
</section>

<style>
  .sp-queue {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .sp-who {
    font-family: var(--s-mono);
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--mid);
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sp-strip.lost {
    background: color-mix(in srgb, var(--warn) 12%, transparent);
    box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--warn) 50%, transparent);
    color: var(--soft);
    font-weight: 500;
  }
  .sp-strip.lost b {
    color: var(--warn);
  }
  .sp-state b {
    color: var(--bleu);
  }
  .sp-state.lost b {
    color: var(--warn);
  }
  .sp-lead {
    font-size: 1.05rem;
    line-height: 1.45;
    color: var(--soft);
  }
  .sp-places {
    display: grid;
    gap: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .row i {
    flex: 1 1 0;
    min-width: 0;
    height: 30px;
    border-radius: 6px;
    background: rgb(255 255 255 / 0.22);
  }
  .row i.me {
    flex: 2.4 1 0;
    display: grid;
    place-items: center;
    padding: 0 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: none;
    border: 1.6px dashed var(--text);
    font-style: normal;
    font-weight: 600;
    font-size: 0.95rem;
  }
  .wall {
    flex: none;
    width: 3px;
    height: 46px;
    margin: 0 5px;
    border-radius: 2px;
    background: var(--text);
  }
  .labels {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-family: var(--s-mono);
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--mid);
  }
  .labels span:last-child {
    color: var(--text);
  }
  .sp-mode {
    display: grid;
    gap: 8px;
    padding: 14px 16px;
    border-radius: 18px;
    background: var(--surface2);
    border: 1px solid var(--border);
    line-height: 1.4;
  }
  .name {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .name b {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 2.25rem;
    line-height: 1;
    text-transform: uppercase;
  }
  .name span {
    flex: none;
    padding: 4px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--success) 16%, transparent);
    color: var(--success);
    font-family: var(--s-mono);
    font-weight: 700;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .bottom {
    margin-top: auto;
    display: grid;
    gap: 4px;
    justify-items: center;
    text-align: center;
  }
  .bottom .sp-hint {
    margin-top: 0;
  }
  .quit {
    min-height: 48px;
    padding: 0 20px;
    background: none;
    border: 0;
    color: var(--soft);
    font: inherit;
    font-size: 1rem;
    font-weight: 500;
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: pointer;
  }
  .quit.sure {
    border: 1px solid;
    border-radius: 999px;
    color: var(--text);
    font-weight: 600;
    text-decoration: none;
  }
  small {
    font-size: 0.875rem;
    color: var(--mid);
    line-height: 1.35;
  }
  .bottom + .sp-frise {
    margin-top: 0;
  }
</style>

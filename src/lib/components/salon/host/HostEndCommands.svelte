<script>
  /**
   * Commandes de fin de partie quand la TV est seule (aucune régie) : partie suivante,
   * playlist, réglages de la suivante, et fermeture de la soirée après confirmation.
   */
  import { FREE_MAX_TEAMS } from '#lib/data/proPlans.js';
  import { SALON_ROUNDS, SALON_TEAMS } from '#lib/data/salonOptions.js';

  let { h, night = false } = $props();

  let panel = $state(null);
  const set = (patch) => h.socket?.emit('salon_update_settings', patch);
  const modal = (node) => node.showModal();
</script>

<div class="cmd">
  <button class="tb m" type="button" onclick={h.restartGame}>Lancer la partie suivante</button>
  <div>
    {#if h.canChangePlaylists}<button class="tb s" type="button" onclick={h.openPicker}>Changer de playlist</button>{/if}
    <button class="tb s" type="button" onclick={() => (panel = 'reglages')}>Réglages</button>
  </div>
  <!-- Une nouvelle soirée fait ressaisir le code à tout le monde : on perd des joueurs -->
  <button class="lien" type="button" onclick={() => (panel = 'fermer')}>Fermer la soirée</button>
</div>

{#if panel === 'reglages'}
  <dialog class="pn sh-tv" aria-labelledby="fin-reg" use:modal onclose={() => (panel = null)}>
    <h2 id="fin-reg">Partie suivante</h2>
    <div class="seg" role="group" aria-label="Réponses">
      <button aria-pressed={h.settings.answerMode === 'free'} onclick={() => set({ answerMode: 'free' })}>Texte libre</button>
      <button aria-pressed={h.settings.answerMode === 'multiple'} onclick={() => set({ answerMode: 'multiple' })}>4 choix</button>
      {#if h.pro}<button aria-pressed={h.settings.answerMode === 'buzzer'} onclick={() => set({ answerMode: 'buzzer' })}>Buzzer</button>{/if}
    </div>
    <div class="seg" role="group" aria-label="Équipes">
      {#each SALON_TEAMS.filter((n) => h.pro || n <= FREE_MAX_TEAMS) as n (n)}
        <button aria-pressed={(h.settings.teams?.length ?? 0) === n} onclick={() => set({ teamCount: n })}>{n === 0 ? 'Solo' : `${n} équipes`}</button>
      {/each}
    </div>
    <div class="seg" role="group" aria-label="Manches">
      {#each SALON_ROUNDS as n (n)}
        <button aria-pressed={h.settings.maxRounds === n} onclick={() => set({ maxRounds: n })}>{n} manches</button>
      {/each}
    </div>
    <div class="act"><button class="tb" type="button" onclick={() => (panel = null)}>Fermer</button></div>
  </dialog>
{:else if panel === 'fermer'}
  <dialog class="pn sh-tv" role="alertdialog" aria-labelledby="fin-close" use:modal onclose={() => (panel = null)}>
    <h2 id="fin-close">Fermer la soirée&nbsp;?</h2>
    <ul>
      <li>Tous les joueurs devront ressaisir un nouveau code.</li>
      {#if night}<li>Le classement de la soirée repartira de zéro.</li>{/if}
    </ul>
    <p>Pour changer de playlist ou de réglages, inutile : « Lancer la partie suivante » garde tout le monde.</p>
    <div class="act">
      <!-- svelte-ignore a11y_autofocus -->
      <button class="tb" type="button" autofocus onclick={() => (panel = null)}>Rester</button>
      <button class="tb rouge" type="button" onclick={h.closeSalon}>Fermer la soirée</button>
    </div>
  </dialog>
{/if}

<style>
  .cmd {
    margin-top: auto;
    display: grid;
    gap: 0.62em;
    padding-bottom: 0.5em;
  }
  .cmd > div {
    display: flex;
    gap: 0.62em;
  }
  .cmd .s:first-child {
    flex: 1;
  }
  .cmd .m {
    font-size: 1.56em;
  }
  .tb {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    height: 2.8em;
    padding: 0 0.6em;
    border-radius: 999px;
    border: 2px solid rgb(255 255 255 / 0.16);
    background: rgb(255 255 255 / 0.05);
    color: var(--text);
    font-family: var(--s-cond);
    font-weight: 800;
    font-size: 1.77em;
    text-transform: uppercase;
    white-space: nowrap;
    cursor: pointer;
  }
  .tb.m {
    background: var(--accent);
    color: #000;
    border-color: transparent;
  }
  .tb.s {
    height: 2.57em;
    padding: 0 0.45em;
    font-size: 1.46em;
  }
  .tb.rouge {
    background: var(--danger);
    color: #000;
    border-color: transparent;
  }
  .lien {
    justify-self: start;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--mid);
    font: inherit;
    font-size: 1.46em;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    cursor: pointer;
  }
  /* Fenêtre modale native : focus dedans, Échap pour fermer, le reste inerte */
  .pn {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    margin: 0;
    border: 0;
    color: var(--text);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    gap: 1.2em;
    padding: 3.33em;
    background: rgb(5 5 7 / 0.97);
  }
  h2 {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 6em;
    line-height: 0.9;
    text-transform: uppercase;
  }
  .pn ul {
    display: grid;
    gap: 0.3em;
    padding-left: 1.2em;
    font-size: 2em;
  }
  .pn p {
    max-width: 40em;
    font-size: 1.56em;
    color: var(--soft, #d6d7e4);
  }
  .seg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
  }
  .seg button {
    height: 2.6em;
    padding: 0 0.9em;
    border-radius: 999px;
    border: 2px solid rgb(255 255 255 / 0.16);
    background: none;
    color: var(--text);
    font-family: var(--s-mono);
    font-weight: 700;
    font-size: 1.46em;
    cursor: pointer;
  }
  .seg button[aria-pressed='true'] {
    background: var(--text);
    color: #000;
  }
  .act {
    display: flex;
    gap: 0.8em;
    margin-top: 0.6em;
  }
</style>

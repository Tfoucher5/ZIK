<script>
  import Modal from '$lib/components/ui/Modal.svelte';
  import Card from '$lib/components/card/Card.svelte';

  // Départ en pleine partie : on dit ce que deviennent les cartes du joueur
  //   lose : cartes en jeu, pas encore sécurisées (perdues en partant)
  //   keep : cartes en jeu, déjà sécurisées
  //   none : pas encore de carte dans cette partie
  let { open, quitCase, cardsInPlay, roundTotal, onStay, onQuit } = $props();

  const n = $derived(cardsInPlay.length);
  const secureRound = $derived(Math.ceil(roundTotal / 2));
</script>

<Modal {open} onClose={onStay} maxWidth="440px">
  <h3 class="gi-title">Quitter la partie ?</h3>
  <p class="gi-sub">
    {#if quitCase === 'lose'}
      {n > 1 ? `Tu as ${n} cartes en jeu` : 'Tu as 1 carte en jeu'}, sécurisée{n > 1 ? 's' : ''} seulement à la manche {secureRound}.
      <strong>En partant maintenant, tu {n > 1 ? 'les' : 'la'} perds.</strong>
    {:else if quitCase === 'keep'}
      {n > 1 ? `Tes ${n} cartes sont sécurisées` : 'Ta carte est sécurisée'} : <strong>tu {n > 1 ? 'les' : 'la'} gardes</strong>, même en partant maintenant.
    {:else}
      Tu n'as pas encore gagné de carte dans cette partie. En restant, chaque titre trouvé en premier peut t'en rapporter une.
    {/if}
  </p>
  {#if n}
    <div class="g-quit-cards" class:is-lost={quitCase === 'lose'}>
      {#each cardsInPlay as entry (entry.card.id)}
        <Card card={entry.card} size="mini" motion="none" />
      {/each}
    </div>
  {/if}
  <div class="quit-actions">
    <button class="quit-btn quit-leave" class:is-lose={quitCase === 'lose'} onclick={onQuit}>
      {quitCase === 'lose' ? 'Quitter quand même' : 'Quitter'}
    </button>
    <button class="quit-btn quit-stay" onclick={onStay}>Rester</button>
  </div>
</Modal>

<style>
  .quit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }
  .quit-btn {
    font-family: var(--g-cond);
    font-weight: 800;
    font-size: 0.8rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 10px 18px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .quit-stay {
    background: var(--accent);
    color: var(--on-accent);
    border: 1px solid var(--accent);
  }
  .quit-stay:hover { filter: brightness(1.12); }
  .quit-leave {
    background: transparent;
    color: var(--mid);
    border: 1px solid rgb(var(--c-glass) / 0.2);
  }
  .quit-leave:hover {
    color: var(--text);
    border-color: rgb(var(--c-glass) / 0.45);
    background: rgb(var(--c-glass) / 0.06);
  }
  .quit-leave.is-lose:hover {
    color: var(--danger);
    border-color: var(--danger);
  }
  @media (max-width: 480px) {
    .quit-actions { flex-direction: column-reverse; }
  }
</style>

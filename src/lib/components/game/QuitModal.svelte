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
  <div class="g-quit-actions">
    <button class="g-start-btn" onclick={onStay}>Rester</button>
    <button class="g-go-back" onclick={onQuit}>{quitCase === 'lose' ? 'Quitter quand même' : 'Quitter'}</button>
  </div>
</Modal>

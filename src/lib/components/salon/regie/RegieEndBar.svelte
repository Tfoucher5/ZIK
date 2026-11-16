<script>
  import CloseEvening from './CloseEvening.svelte';
  /**
   * Barre du bas entre deux parties : « Lancer la partie suivante » (mêmes
   * joueurs, même code ; ferme l'entracte et le QR en grand), ou, au podium
   * de la soirée, « Fermer la soirée » avec confirmation.
   * @type {{ intermission: any, finale: any, countStart: boolean, onRestart: () => void, onClose: () => void }}
   */
  let { intermission, finale, countStart, onRestart, onClose } = $props();
</script>

<footer class="rg-bar">
  {#if finale}
    <CloseEvening barre {onClose} />
  {:else}
    <button class="rg-btn on rg-lance" type="button" onclick={onRestart}>Lancer la partie suivante</button>
    <p>
      {intermission
        ? "Lancer la partie termine l'entracte."
        : `Mêmes joueurs, même code.${countStart ? ' Décompte de 5 secondes.' : ''}`}
    </p>
  {/if}
</footer>

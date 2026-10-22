<script>
  /** Bouton d'envoi en deux temps : un clic arme, le second confirme. */
  let { label, danger = false, busy = false } = $props();
  let armed = $state(false);
</script>

{#if armed}
  <button type="button" class="a-btn small" onclick={() => (armed = false)}>Annuler</button>
  <button class="a-btn small {danger ? 'danger' : 'primary'}" disabled={busy} onclick={() => setTimeout(() => (armed = false))}>Confirmer</button>
{:else}
  <button type="button" class="a-btn small" class:danger onclick={() => (armed = true)}>{label}</button>
{/if}

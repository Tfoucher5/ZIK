<script>
  import AuthPanel from './AuthPanel.svelte';
  import YouLine from './YouLine.svelte';
  import AuthButton from './AuthButton.svelte';
  import Stamp from './Stamp.svelte';

  /** @type {{ username: string, nowLabel: string, onClose: () => void }} */
  let { username, nowLabel, onClose } = $props();
</script>

<AuthPanel title="Vérifie" em="tes mails" dot="." sub="Ton nom est noté — reste à le confirmer"
  head="Guest list" {nowLabel}>
  <YouLine live name={username || 'Toi'} hint="Ligne réservée" />
  <p class="confirm-txt">
    Un lien de confirmation t'a été envoyé. Clique dessus, reviens,
    et le videur te laisse passer direct.
  </p>
  <Stamp label="Réservé" on resa />
  <AuthButton ghost onclick={onClose}>Fermer</AuthButton>
</AuthPanel>

<style>
  .confirm-txt { color: var(--mid); font-size: 0.9rem; line-height: 1.6; margin-top: 14px; }
</style>

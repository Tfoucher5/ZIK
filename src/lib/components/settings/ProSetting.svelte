<script>
  import { getContext } from 'svelte';
  import { toast } from '$lib/toast.svelte.js';
  import { fetchPro, proActive, goToStripe } from '$lib/salonClient.js';
  import SettingsSection from './SettingsSection.svelte';

  const _ctx = getContext('zik');
  const sb = _ctx.sb;
  const user = $derived(_ctx.user);

  let proRow = $state(null);
  let portalBusy = $state(false);

  $effect(() => {
    if (!user) { proRow = null; return; }
    fetchPro(sb, user.id).then((r) => (proRow = r)).catch(() => {});
  });

  async function openPortal() {
    portalBusy = true;
    try { await goToStripe(sb, '/api/pro/portal'); }
    catch (e) { toast(e.message, 'error'); portalBusy = false; }
  }
</script>

{#if proRow}
<SettingsSection title="ZIK Pro">
  <div class="settings-row">
    <div class="settings-row-info">
      <div class="settings-row-label">{proActive(proRow) ? 'ZIK Pro actif' : 'ZIK Pro terminé'}</div>
      <div class="settings-row-desc">
        {proActive(proRow) ? "Actif jusqu'au" : 'Terminé le'}
        {new Date(proRow.current_period_end).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}.
      </div>
    </div>
    {#if proRow.stripe_customer_id}
      <button class="btn-unlink" onclick={openPortal} disabled={portalBusy}>
        {portalBusy ? 'Ouverture…' : 'Gérer mon abonnement'}
      </button>
    {:else}
      <a class="btn-unlink" href="/pro#tarifs">Voir les formules</a>
    {/if}
  </div>
</SettingsSection>
{/if}

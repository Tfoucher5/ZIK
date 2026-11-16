<script>
  import ProStatusDot from './ProStatusDot.svelte';

  let { checkout } = $props();
  const pro = $derived(checkout.pro);
</script>

<div class="pro-status">
  <ProStatusDot />
  <div>
    <b>ZIK Pro est actif sur votre compte</b>
    <span>
      {#if pro.plan === 'night'}Soirée 24 h valable jusqu'au {checkout.endLabel}.
      {:else if pro.plan === 'manual'}Accès offert jusqu'au {checkout.endLabel}.
      {:else}Formule {pro.plan === 'yearly' ? 'Annuel' : 'Mensuel'}, prochaine échéance le {checkout.endLabel}.{/if}
    </span>
  </div>
  {#if pro.stripe_customer_id}
    <button type="button" class="btn-line" onclick={checkout.openPortal} disabled={checkout.busy === 'portal'}>
      {checkout.busy === 'portal' ? 'Ouverture…' : checkout.subscribed ? 'Gérer mon abonnement' : 'Mes factures'}
    </button>
  {/if}
</div>

<style>
  .pro-status {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    max-width: 1080px;
    margin: 0 auto 24px;
    padding: 16px 20px;
    border: 1px solid var(--line-2);
    border-radius: 18px;
    background: var(--surface);
  }
  .pro-status > div {
    flex: 1;
    min-width: 200px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.88rem;
    color: var(--mid);
  }
  .pro-status b {
    color: var(--text);
  }
  .pro-status button:disabled {
    opacity: 0.55;
    cursor: default;
  }
</style>

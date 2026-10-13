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
      {#if pro.plan === 'night'}Passe Soirée valable jusqu'au {checkout.endLabel}.
      {:else if pro.plan === 'manual'}Accès offert jusqu'au {checkout.endLabel}.
      {:else}Formule {pro.plan === 'yearly' ? 'Annuel' : 'Mensuel'}, prochaine échéance le {checkout.endLabel}.{/if}
    </span>
    <a href="/profile">Mon espace organisateur : lieu, TV, classement du mois →</a>
  </div>
  {#if pro.stripe_customer_id}
    <button class="pro-status-btn" onclick={checkout.openPortal} disabled={checkout.busy === 'portal'}>
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
    margin: 0 0 20px;
    padding: 14px 18px;
    border: 1px solid rgb(var(--accent-rgb) / 0.4);
    border-radius: 14px;
    background: rgb(var(--accent-rgb) / 0.08);
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
  .pro-status a {
    color: var(--accent);
    font-weight: 700;
  }
  .pro-status-btn {
    padding: 9px 16px;
    border: 1px solid var(--accent);
    border-radius: 10px;
    background: none;
    color: var(--accent);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
</style>

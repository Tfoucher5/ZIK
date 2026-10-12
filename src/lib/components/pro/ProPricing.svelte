<script>
  import ProSection from './ProSection.svelte';
  import ProCompare from './ProCompare.svelte';
  import ProPlanStatus from './ProPlanStatus.svelte';
  import ProOffers from './ProOffers.svelte';
  import ProConfirm from './ProConfirm.svelte';
  import ProIncluded from './ProIncluded.svelte';

  let { checkout } = $props();
</script>

<ProSection title="Tarifs" id="tarifs">
  <p>
    La version gratuite suffit pour une soirée entre amis. ZIK Pro est fait
    pour les lieux qui animent : plus de joueurs, plus d'équipes, et une
    régie complète sur un second écran pendant que la TV montre le jeu.
  </p>

  <ProCompare />

  {#if checkout.activePro}<ProPlanStatus {checkout} />{/if}

  <ProOffers {checkout} />

  {#if checkout.payError}<p class="pro-pay-error" role="alert">{checkout.payError}</p>{/if}

  <ProConfirm {checkout} />

  <ProIncluded />
</ProSection>

<style>
  .pro-pay-error {
    margin-top: 14px;
    color: var(--danger);
  }
</style>

<script>
  let { venue, checkout } = $props();
</script>

<div class="ot">
  <a class="vn-card ot-item" href="/pro/lieu">
    <b>Mon lieu et la TV</b>
    <span>Infos, logo, couleur, message d'accueil, dates</span>
  </a>
  {#if venue}
    <a class="vn-card ot-item" href="/lieu/{venue.slug}" target="_blank">
      <b>Page publique ↗</b>
      <span>zik-music.fr/lieu/{venue.slug}</span>
    </a>
    <a class="vn-card ot-item" href="/lieu/{venue.slug}/affiche" target="_blank">
      <b>Affiche A4 ↗</b>
      <span>Avec QR code, prête à imprimer</span>
    </a>
  {/if}
  {#if checkout.pro?.stripe_customer_id}
    <button class="vn-card ot-item" onclick={checkout.openPortal} disabled={checkout.busy === 'portal'}>
      <b>{checkout.subscribed ? 'Mon abonnement' : 'Mes factures'}</b>
      <span>{checkout.busy === 'portal' ? 'Ouverture…' : 'Factures, moyen de paiement, résiliation'}</span>
    </button>
  {:else}
    <a class="vn-card ot-item" href="/pro#tarifs">
      <b>Mon accès</b>
      <span>Formules et renouvellement</span>
    </a>
  {/if}
</div>
{#if checkout.payError}<p class="ot-err">{checkout.payError}</p>{/if}

<style>
  .ot { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .ot-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px 18px;
    color: var(--text);
    font: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .ot-item:hover { border-color: var(--accent); }
  .ot-item b { font-size: 0.95rem; }
  .ot-item span { font-size: 0.8rem; color: var(--mid); overflow-wrap: anywhere; }
  .ot-err { margin-top: 10px; font-size: 0.85rem; color: var(--danger); }
</style>

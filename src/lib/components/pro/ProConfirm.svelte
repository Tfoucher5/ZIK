<script>
  let { checkout } = $props();
  const c = $derived(checkout.confirmed);
</script>

{#if c}
  <div class="pro-confirm-back" role="presentation" onclick={(e) => e.target === e.currentTarget && checkout.cancel()}>
    <div class="pro-confirm" role="dialog" aria-modal="true" aria-labelledby="pro-confirm-title" tabindex="-1">
      <h3 id="pro-confirm-title">Confirmer : ZIK Pro {c.name}</h3>
      <dl>
        <div><dt>Prix</dt><dd>{c.price} <span>{c.period}</span></dd></div>
        <div><dt>Compte</dt><dd>{checkout.zik.user?.email}</dd></div>
        {#if c.id === 'night'}
          <div><dt>ZIK Pro actif jusqu'au</dt><dd>{checkout.nightEnd}</dd></div>
        {/if}
      </dl>
      {#if c.id === 'night' && checkout.nightActive}
        <p class="pro-confirm-warn">
          Vous avez déjà un passe Soirée actif jusqu'au {checkout.endLabel}. Ce nouveau
          paiement ajoute 24 h à la suite : il n'est utile que si votre événement
          dure plus longtemps.
        </p>
      {:else if checkout.activePro && c.id !== 'night'}
        <p class="pro-confirm-warn">
          ZIK Pro est déjà actif jusqu'au {checkout.endLabel}. L'abonnement prend le relais
          dès le paiement.
        </p>
      {/if}
      <p class="pro-confirm-small">Vous allez être redirigé vers Stripe pour payer. Le reçu et la facture arrivent par e-mail.</p>
      <div class="pro-confirm-btns">
        <button class="pro-confirm-cancel" onclick={checkout.cancel} disabled={checkout.busy !== null}>Annuler</button>
        <button class="pro-confirm-pay" onclick={checkout.pay} disabled={checkout.busy !== null}>
          {checkout.busy ? 'Redirection…' : `Payer ${c.price}`}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .pro-confirm-back {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgb(0 0 0 / 0.6);
  }
  .pro-confirm {
    width: min(460px, 100%);
    padding: 26px 24px;
    border: 1px solid rgb(var(--accent-rgb) / 0.45);
    border-radius: 18px;
    background: var(--bg2);
    color: var(--text);
  }
  .pro-confirm h3 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.6rem;
    font-weight: 800;
    margin-bottom: 16px;
  }
  .pro-confirm dl {
    display: grid;
    gap: 10px;
    margin-bottom: 16px;
  }
  .pro-confirm dl div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border2);
    font-size: 0.92rem;
  }
  .pro-confirm dt {
    color: var(--mid);
  }
  .pro-confirm dd {
    font-weight: 700;
    text-align: right;
  }
  .pro-confirm dd span {
    display: block;
    font-weight: 400;
    font-size: 0.8rem;
    color: var(--mid);
  }
  .pro-confirm-warn {
    margin-bottom: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    background: rgb(245 158 11 / 0.12);
    border: 1px solid rgb(245 158 11 / 0.45);
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .pro-confirm-small {
    font-size: 0.8rem;
    color: var(--mid);
    margin-bottom: 18px;
  }
  .pro-confirm-btns {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }
  .pro-confirm-cancel,
  .pro-confirm-pay {
    padding: 11px 20px;
    border-radius: 10px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .pro-confirm-cancel {
    border: 1px solid var(--border2);
    background: none;
    color: var(--text);
  }
  .pro-confirm-pay {
    border: none;
    background: var(--accent);
    color: var(--on-accent, #fff);
  }
  .pro-confirm button:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>

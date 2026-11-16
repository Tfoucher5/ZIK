<script>
  let { user, pro, proRow, portalBusy, onPortal, onLogin } = $props();
</script>

<p class="compte">
  {#if !user}
    Ça marche sans compte. <button type="button" onclick={onLogin}>Se connecter</button> pour retrouver tes playlists et ZIK Pro.
  {:else if pro}
    <i aria-hidden="true"></i>Connecté : <b>ZIK Pro actif</b>
    {#if proRow?.stripe_customer_id}
      · <button type="button" disabled={portalBusy} onclick={onPortal}>
        {portalBusy ? 'Ouverture…' : proRow.plan === 'night' ? 'Mes factures' : 'Gérer mon abonnement'}
      </button>
    {/if}
  {:else}
    <i aria-hidden="true"></i>Connecté : tes playlists sont dans la liste.
  {/if}
</p>

<style>
  .compte {
    width: 100%;
    padding: 12px 0;
    border-block: 1px solid var(--line);
    font-size: 15px;
    line-height: 1.35;
    color: var(--muted);
  }
  b { color: var(--text); font-weight: 600; }
  i {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 8px;
    border-radius: 50%;
    background: var(--ok);
  }
  button {
    min-height: 32px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--text);
    font: inherit;
    font-weight: 600;
    text-decoration: underline;
    text-decoration-color: var(--line-2);
    text-underline-offset: 4px;
    cursor: pointer;
  }
</style>

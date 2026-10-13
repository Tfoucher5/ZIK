<script>
  import ProStatusDot from './ProStatusDot.svelte';

  let { checkout } = $props();

  let plan = $derived.by(() => {
    const p = checkout.pro;
    if (p.plan === 'night') return `Passe Soirée, valable jusqu'au ${checkout.endLabel}`;
    if (p.plan === 'manual') return `Accès offert jusqu'au ${checkout.endLabel}`;
    return `Formule ${p.plan === 'yearly' ? 'annuelle' : 'mensuelle'}, prochaine échéance le ${checkout.endLabel}`;
  });

  const LINKS = [
    { href: '/profile', title: 'Tableau de bord', text: 'Vos soirées, votre classement du mois, vos chiffres' },
    { href: '/pro/lieu', title: 'Mon lieu et la TV', text: 'Logo, couleur, message d\'accueil, dates, affiche' },
    { href: '/salon', title: 'Lancer une soirée', text: 'Ouvrez l\'écran TV, pilotez depuis la régie' },
  ];
</script>

<header class="pm">
  <span class="pm-tag">Votre ZIK Pro</span>
  <h1>Tout est prêt pour vos soirées</h1>
  <p class="pm-status"><ProStatusDot /> {plan}.</p>

  <div class="pm-links">
    {#each LINKS as l (l.href)}
      <a href={l.href}><b>{l.title} →</b><span>{l.text}</span></a>
    {/each}
    {#if checkout.pro.stripe_customer_id}
      <button onclick={checkout.openPortal} disabled={checkout.busy === 'portal'}>
        <b>{checkout.subscribed ? 'Mon abonnement' : 'Mes factures'} →</b>
        <span>{checkout.busy === 'portal' ? 'Ouverture…' : 'Factures, moyen de paiement, résiliation'}</span>
      </button>
    {/if}
  </div>
</header>

<style>
  .pm { margin-bottom: 48px; }
  .pm-tag {
    display: inline-block;
    margin-bottom: 16px;
    padding: 5px 14px;
    border-radius: 999px;
    background: var(--accent);
    color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif;
    font-size: 0.78rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .pm h1 { font-family: "Barlow Condensed", sans-serif; font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 900; letter-spacing: -1px; line-height: 1.1; }
  .pm-status { display: flex; align-items: center; gap: 10px; margin: 12px 0 24px; font-weight: 600; color: var(--mid); }
  .pm-links { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
  .pm-links a, .pm-links button {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px 18px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .pm-links a:first-child { border-color: rgb(var(--accent-rgb) / 0.5); }
  .pm-links a:hover, .pm-links button:hover { border-color: var(--accent); }
  .pm-links b { font-size: 0.95rem; }
  .pm-links span { font-size: 0.8rem; line-height: 1.45; color: var(--mid); }
</style>

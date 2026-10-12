<script>
  import ProCtaLink from './ProCtaLink.svelte';
  import ProStatusDot from './ProStatusDot.svelte';

  let { checkout } = $props();
</script>

<header class="pro-header">
  <span class="pro-tag">Mode Salon</span>
  <h1>Organisez votre blind test sans animateur</h1>
  <p class="pro-intro">
    Un écran, du son, et les téléphones que vos invités ont déjà dans la
    poche. ZIK s'occupe du reste : les extraits, les points, le classement
    et le suspense. Il n'y a rien à installer et vos invités n'ont pas
    besoin de créer un compte.
  </p>
  <div class="pro-header-ctas">
    <ProCtaLink href="/salon">Essayer gratuitement</ProCtaLink>
    <a class="pro-cta-ghost" href="#tarifs">{checkout.activePro ? 'Mon accès ZIK Pro' : 'Voir les tarifs'}</a>
  </div>
  {#if checkout.activePro}
    <p class="pro-header-active">
      <ProStatusDot />
      {checkout.subscribed ? `ZIK Pro est actif sur votre compte, formule ${checkout.pro.plan === 'yearly' ? 'annuelle' : 'mensuelle'}.` : `ZIK Pro est actif sur votre compte jusqu'au ${checkout.endLabel}.`}
    </p>
  {/if}
</header>

<style>
  .pro-header {
    margin-bottom: 48px;
  }
  .pro-tag {
    display: inline-block;
    font-family: "Barlow Condensed", sans-serif;
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent);
    background: rgb(var(--accent-rgb) / 0.12);
    border: 1px solid rgb(var(--accent-rgb) / 0.35);
    border-radius: 999px;
    padding: 5px 14px;
    margin-bottom: 16px;
  }
  .pro-header h1 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: clamp(1.8rem, 4vw, 2.8rem);
    font-weight: 900;
    letter-spacing: -1px;
    line-height: 1.1;
    margin-bottom: 16px;
  }
  .pro-intro {
    font-size: 0.98rem;
    color: var(--mid);
    line-height: 1.7;
    margin-bottom: 24px;
  }
  .pro-header-ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }
  .pro-cta-ghost {
    font-size: 0.9rem;
    color: var(--text);
    text-underline-offset: 3px;
  }
  .pro-header-active :global(.pro-status-dot) {
    flex: none;
  }
  .pro-header-active {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 18px;
    font-weight: 600;
    color: var(--text);
  }
</style>

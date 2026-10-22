<script>
  import { getContext } from 'svelte';
  import ProSpaceTabs from './ProSpaceTabs.svelte';

  // Cadre des pages de l'espace organisateur : onglets, accès, chargement, messages
  let { admin, active, title, lead, children } = $props();
  const zik = getContext('zik');
</script>

<svelte:head>
  <title>{title} - ZIK Pro</title>
  <meta name="robots" content="noindex" />
  <link rel="stylesheet" href="/css/venue.css?v=3.18.0" />
</svelte:head>

<main class="vn-page">
  {#if zik.user?.pro}
    <ProSpaceTabs {active} />
  {:else}
    <nav class="vn-crumbs" aria-label="Fil d'Ariane">
      <a href="/pro">ZIK Pro</a> › <span>{title}</span>
    </nav>
  {/if}

  <header class="ps-head">
    <h1 class="vn-title">{title}</h1>
    <p class="vn-lead">{lead}</p>
  </header>

  {#if zik.authReady && !zik.user}
    <div class="vn-card ps-gate">
      <h2>Connectez-vous</h2>
      <p class="vn-card-sub">Utilisez le compte de votre abonnement ZIK Pro.</p>
      <button class="vn-btn" onclick={() => zik.openAuthModal('login')}>Se connecter</button>
    </div>
  {:else if admin.ready && !admin.pro}
    <div class="vn-card ps-gate">
      <h2>L'espace organisateur fait partie de ZIK Pro</h2>
      <p class="vn-card-sub">Page publique, classement de vos habitués, logo et couleur sur la TV, affiche avec QR code, notifications à ceux qui suivent votre lieu.</p>
      <a class="vn-btn" href="/pro#tarifs">Voir les formules</a>
    </div>
  {:else if admin.ready}
    {@render children()}
  {:else}
    <div class="ps-loading" aria-label="Chargement"></div>
  {/if}

  {#if admin.message || admin.error}
    <p class="ps-toast" class:err={!!admin.error} role="status">{admin.error || admin.message}</p>
  {/if}
</main>

<style>
  .ps-head { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; margin-bottom: 32px; }
  .ps-gate { max-width: 560px; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
  .ps-loading { height: 320px; border-radius: 16px; background: var(--surface); animation: ps-pulse 1.2s ease-in-out infinite alternate; }
  @keyframes ps-pulse { to { opacity: 0.5; } }
  .ps-toast {
    position: fixed;
    left: 50%;
    top: calc(var(--nav-h) + 16px);
    z-index: 50;
    transform: translateX(-50%);
    padding: 12px 18px;
    border-radius: 12px;
    background: var(--success);
    color: #000;
    font-weight: 700;
    box-shadow: 0 10px 30px rgb(0 0 0 / 0.25);
  }
  .ps-toast.err { background: var(--danger); color: #fff; }
</style>

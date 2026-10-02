<script>
  import { getContext } from 'svelte';
  import { fetchIsPro } from '$lib/salonClient.js';

  const zik = getContext('zik');
  let active = $state(false);
  let waitedTooLong = $state(false);

  // Stripe prévient ZIK par webhook : on attend l'activation quelques secondes
  $effect(() => {
    const user = zik.user;
    if (!user) return;
    let tries = 0;
    let timer;
    const check = async () => {
      if (await fetchIsPro(zik.sb, user.id).catch(() => false)) { active = true; return; }
      if (++tries >= 15) { waitedTooLong = true; return; }
      timer = setTimeout(check, 1500);
    };
    check();
    return () => clearTimeout(timer);
  });
</script>

<svelte:head>
  <title>Merci ! - ZIK Pro</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="merci">
  <div class="merci-card">
    <div class="merci-check" class:on={active} aria-hidden="true">
      <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" /></svg>
    </div>
    <h1>Merci, paiement reçu !</h1>
    {#if active}
      <p>ZIK Pro est actif sur votre compte. Ouvrez un salon en restant connecté : joueurs illimités, 8 équipes et la régie complète sont débloqués.</p>
    {:else if waitedTooLong}
      <p>Le paiement est bien passé, l'activation prend un peu plus de temps que prévu. Rechargez la page dans une minute. Si rien ne bouge, écrivez à <a href="mailto:theo@zik-music.fr">theo@zik-music.fr</a> : c'est réglé dans la journée.</p>
    {:else if zik.authReady && !zik.user}
      <p>Connectez-vous avec le compte utilisé pour le paiement pour retrouver ZIK Pro.</p>
    {:else}
      <p>Activation de ZIK Pro sur votre compte…</p>
    {/if}
    <p class="merci-small">Le reçu et la facture arrivent par e-mail, envoyés par Stripe.</p>
    <div class="merci-ctas">
      <a class="merci-btn" href="/salon">Ouvrir un salon</a>
      <a class="merci-ghost" href="/pro#tarifs">Mon abonnement</a>
    </div>
  </div>
</main>

<style>
  .merci {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: calc(var(--nav-h) + 24px) 20px 60px;
  }
  .merci-card {
    width: min(520px, 100%);
    text-align: center;
    padding: 40px 28px;
    border: 1px solid rgb(var(--accent-rgb) / 0.4);
    border-radius: 20px;
    background: rgb(var(--c-glass) / 0.04);
    animation: merci-in 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .merci-check svg {
    width: 76px;
    height: 76px;
    margin-bottom: 18px;
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .merci-check circle {
    stroke-dasharray: 151;
    stroke-dashoffset: 151;
    animation: merci-draw 0.8s ease forwards;
  }
  .merci-check path {
    stroke-dasharray: 40;
    stroke-dashoffset: 40;
  }
  .merci-check.on path {
    animation: merci-draw 0.45s ease forwards;
  }
  h1 {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 2.2rem;
    font-weight: 900;
    margin-bottom: 12px;
  }
  p {
    color: var(--mid);
    line-height: 1.7;
    margin-bottom: 12px;
  }
  p a {
    color: var(--accent);
  }
  .merci-small {
    font-size: 0.82rem;
    color: var(--dim);
  }
  .merci-ctas {
    display: flex;
    gap: 16px;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 20px;
  }
  .merci-btn {
    background: var(--accent);
    color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif;
    font-weight: 800;
    padding: 12px 28px;
    border-radius: 10px;
  }
  .merci-ghost {
    color: var(--text);
    font-size: 0.9rem;
  }
  @keyframes merci-draw {
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes merci-in {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.98);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .merci-card {
      animation: none;
    }
    .merci-check circle,
    .merci-check path {
      stroke-dashoffset: 0;
      animation: none;
    }
  }
</style>

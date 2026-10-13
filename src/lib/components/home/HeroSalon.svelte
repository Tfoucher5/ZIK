<script>
  import { getContext } from 'svelte';

  const zik = getContext('zik');
</script>

<!-- Le Mode Salon, cœur de ZIK : visible dès l'arrivée, sur tous les écrans -->
<aside class="hero-salon" aria-labelledby="hero-salon-title">
  <div class="hs-screen" aria-hidden="true">
    <div class="hs-screen-top"><b>ZIK Salon</b><span>7F3K2Q</span></div>
    <div class="hs-timer">12</div>
    <div class="hs-choices"><i></i><i></i><i></i><i></i></div>
  </div>
  <p class="hs-kicker">Mode Salon · Blind test de soirée</p>
  <h2 id="hero-salon-title">La TV diffuse.<br>Les téléphones répondent.</h2>
  <ul class="hs-points">
    <li>Un QR code, un pseudo : aucune appli, aucun compte pour les joueurs</li>
    <li>Équipes, classement en direct et podium sur grand écran</li>
    <li>Pour une soirée entre amis, un bar, un camping ou un team building</li>
  </ul>
  <a class="hs-link" href="/salon/play">Rejoindre une soirée avec un code →</a>
  {#if zik?.user?.pro}
    <a class="hs-pro" href="/profile">Mon espace organisateur ZIK Pro →</a>
  {:else}
    <a class="hs-pro" href="/pro">Bar, camping, entreprise ? Découvrir ZIK Pro</a>
  {/if}
</aside>

<style>
  /* ── Panneau Mode Salon ── */
  .hero-salon {
    position: absolute;
    z-index: 3;
    right: clamp(24px, 5vw, 80px);
    top: 50%;
    transform: translateY(-46%);
    width: min(400px, 34vw);
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 22px;
    background: rgb(var(--bg-rgb) / 0.92);
    border: 2px solid var(--text);
    box-shadow: 8px 8px 0 var(--accent);
  }
  .hs-screen {
    padding: 12px;
    background: #000;
    border: 1px solid rgb(255 255 255 / 0.25);
  }
  .hs-screen-top {
    display: flex;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.15em;
    color: rgb(255 255 255 / 0.6);
  }
  .hs-screen-top b { color: #ff4fff; font-weight: 600; }
  .hs-timer {
    color: #fff;
    margin: 4px 0 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 3.4rem;
    line-height: 1;
    text-align: center;
  }
  .hs-choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }
  .hs-choices i { height: 14px; border-radius: 2px; }
  .hs-choices i:nth-child(1) { background: #ff4f9a; }
  .hs-choices i:nth-child(2) { background: #5bc0eb; }
  .hs-choices i:nth-child(3) { background: #f4e04d; }
  .hs-choices i:nth-child(4) { background: #3ddc84; }
  .hs-kicker {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .hero-salon h2 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(1.6rem, 2.2vw, 2.1rem);
    line-height: 0.95;
    text-transform: uppercase;
  }
  .hs-points {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-left: 16px;
    font-size: 0.85rem;
    color: var(--mid);
    line-height: 1.4;
  }
  .hs-link {
    margin-top: 4px;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .hs-pro {
    font-size: 0.85rem;
    color: var(--mid);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .hs-pro:hover { color: var(--text); }

  /* Tablette et mobile : le panneau passe sous le titre, dans le flux */
  @media (max-width: 1100px) {
    .hero-salon {
      position: relative;
      right: auto;
      top: auto;
      transform: none;
      width: auto;
      margin: 0 clamp(24px, 5vw, 80px);
      max-width: 520px;
    }
  }
</style>

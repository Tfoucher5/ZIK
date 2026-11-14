<!-- Le Mode Salon, cœur de ZIK : visible dès l'arrivée, sur tous les écrans -->
<script>
  import MiniTv from '$lib/components/soiree/MiniTv.svelte';
</script>

<aside class="hero-salon" aria-labelledby="hero-salon-title">
  <MiniTv />
  <p class="hs-kicker">Mode Salon · Blind test de soirée</p>
  <h2 id="hero-salon-title">La TV diffuse.<br>Les téléphones répondent.</h2>
  <ul class="hs-points">
    <li>Un QR code, un pseudo : aucune appli, aucun compte pour les joueurs</li>
    <li>Équipes, classement en direct et podium sur grand écran</li>
    <li>Pour une soirée entre amis, un bar, un camping ou un team building</li>
  </ul>
  <a class="hs-link" href="/salon/play">Rejoindre une soirée avec un code →</a>
  <a class="hs-pro" href="/pro">Bar, camping, entreprise ? Découvrir ZIK Pro</a>
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

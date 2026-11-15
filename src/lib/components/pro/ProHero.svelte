<script>
  import HeroDevices from './HeroDevices.svelte';
  import { DESCRIPTION } from './proContent.js';
</script>

<section class="hero" aria-labelledby="pro-h1">
  <div class="wrap hero-in">
    <div>
      <span class="label"><i></i>ZIK Pro · organisateurs</span>
      <h1 class="grad" id="pro-h1">Le blind test qui fait la soirée, chez vous</h1>
      <p class="lead">{DESCRIPTION}</p>
      <div class="ctas">
        <a class="btn-main" href="#tarifs">Voir les offres</a>
        <a class="btn-line" href="/salon">Créer une soirée gratuite</a>
      </div>
    </div>
    <HeroDevices />
  </div>
</section>

<style>
  .hero {
    padding-block: calc(var(--top) + 42px) 56px;
  }
  .hero-in {
    display: grid;
    gap: 44px;
  }
  h1 {
    margin-top: 14px;
    font-weight: 900;
    font-size: clamp(2.7rem, 12.4vw, 6rem);
    line-height: 0.88;
    letter-spacing: -0.015em;
  }
  .lead {
    margin-top: 16px;
    color: var(--muted);
    font-size: 1.08rem;
    max-width: 32em;
  }
  .ctas {
    margin-top: 24px;
  }
  @media (min-width: 900px) {
    .hero {
      padding-block: calc(var(--top) + 92px) 100px;
    }
    .hero-in {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 56px;
      align-items: center;
    }
    h1 {
      font-size: clamp(3rem, 5.2vw, 5.2rem);
    }
    .lead {
      font-size: 1.2rem;
    }
  }
</style>

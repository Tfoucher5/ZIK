<!-- Dernier appel avant le pied de page -->
<script>
  import { band } from '$lib/components/layout/topBand.svelte.js';
</script>

<section class="final" aria-labelledby="t-final">
  <div class="acc-wrap">
    <h2 id="t-final" class="fill">La porte est ouverte</h2>
    <div class="acc-ctas">
      <a class="btn-main" href="/salon">Créer une soirée</a>
      <a class="btn-line" href="/jouer">Jouer en ligne</a>
    </div>
    <a
      class="acc-lien"
      href="/salon/play"
      onclick={(e) => {
        e.preventDefault();
        band.code = true;
      }}><u>J'ai un code</u> <span aria-hidden="true">→</span></a
    >
  </div>
</section>

<style>
  @property --g {
    syntax: '<percentage>';
    inherits: false;
    initial-value: 100%;
  }
  .final {
    padding-block: 110px 96px;
    text-align: center;
  }
  h2 {
    font-weight: 900;
    font-size: clamp(3rem, 13vw, 7.4rem);
  }
  .acc-ctas {
    justify-content: center;
    margin-top: 26px;
  }
  .fill {
    background: linear-gradient(90deg, #fff var(--g), rgba(255, 255, 255, 0.18) 0);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  @supports (animation-timeline: view()) {
    @media (prefers-reduced-motion: no-preference) {
      :global(html:not(.rm)) .fill {
        animation: fill linear both;
        animation-timeline: view();
        animation-range: entry 30% cover 50%;
      }
    }
  }
  @keyframes fill {
    from {
      --g: 0%;
    }
    to {
      --g: 100%;
    }
  }
</style>

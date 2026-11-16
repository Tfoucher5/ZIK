<span class="label"><i></i>Créer une soirée</span>
<h1>Ce soir,<br>c'est <span class="mag">blind&nbsp;test.</span></h1>
<p class="lead">Choisis la musique, affiche le code sur la TV, tout le monde joue sur son téléphone.</p>

<style>
  h1 {
    font-weight: 900;
    font-size: clamp(3rem, 15vw, 6rem);
    line-height: 0.84;
    letter-spacing: -0.015em;
  }
  .mag {
    background: linear-gradient(90deg, #ff00ff, #ff8af5, #ff00ff);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: sheen 6s linear infinite;
  }
  @keyframes sheen {
    to { background-position: -200% 0; }
  }
  .lead { max-width: 32em; font-size: 1.08rem; line-height: 1.5; color: var(--muted); }

  @media (min-width: 900px) {
    h1 { font-size: clamp(3rem, 5vw, 5rem); }
    .lead { font-size: 1.2rem; }
  }
</style>

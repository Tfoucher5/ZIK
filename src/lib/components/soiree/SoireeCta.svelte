<!-- Dernier appel, en forme de billet à talon -->
<section class="sc">
  <div class="ticket">
    <div class="t-main">
      <h2>Votre prochaine soirée, c'est sur la TV.</h2>
      <p>Lancez un salon gratuit et faites un essai avec deux téléphones avant le jour J.</p>
      <a href="/salon" class="btn-accent">Lancer une soirée</a>
    </div>
    <div class="t-stub">
      <p>Vous êtes invité&nbsp;?</p>
      <a href="/salon/play">Rejoindre avec un code</a>
    </div>
  </div>
</section>

<style>
  .sc {
    max-width: 1240px;
    margin: 0 auto;
    padding: clamp(48px, 8vh, 96px) clamp(16px, 5vw, 64px) clamp(64px, 10vh, 120px);
  }
  .ticket {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    border: 2px solid var(--text);
    box-shadow: 8px 8px 0 var(--accent);
    background: var(--bg);
  }
  .t-main { padding: clamp(24px, 4vw, 48px); }
  h2 {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(2rem, 4.4vw, 3.8rem);
    line-height: 0.9;
    text-transform: uppercase;
    max-width: 16ch;
  }
  .t-main p { margin: 16px 0 24px; color: var(--mid); max-width: 48ch; }
  .t-main .btn-accent { padding: 14px 26px; }
  .t-stub {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    padding: clamp(20px, 3vw, 40px);
    border-left: 2px dashed var(--border2);
    min-width: 220px;
  }
  .t-stub p { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--mid); }
  .t-stub a {
    font-weight: 700;
    color: var(--text);
    text-decoration: underline;
    text-underline-offset: 4px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
  .t-stub a:hover { color: var(--accent); }

  @media (max-width: 760px) {
    .ticket { grid-template-columns: minmax(0, 1fr); }
    .t-stub { border-left: 0; border-top: 2px dashed var(--border2); min-width: 0; }
  }
</style>

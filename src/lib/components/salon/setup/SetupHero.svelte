<header class="st-top">
  <a class="st-top-link" href="/">← ZIK</a>
  <a class="st-top-link st-top-join" href="/salon/play">Invité ? <b>Entrer le code</b></a>
</header>

<section class="st-hero">
  <p class="st-kicker">Mode salon</p>
  <h1>Ce soir,<br>c'est <em>blind test.</em></h1>
  <ol class="st-how">
    <li><b>La TV</b> diffuse la musique</li>
    <li><b>Les téléphones</b> servent de buzzer</li>
    <li><b>Personne</b> n'a besoin de compte</li>
  </ol>
</section>

<style>
  .st-top { display: flex; justify-content: space-between; align-items: center; }
  .st-top-link {
    font-size: 0.85rem;
    color: var(--mid);
    text-decoration: none;
  }
  .st-top-link:hover { color: var(--text); }
  .st-top-join b { color: var(--text); font-weight: 600; border-bottom: 1px solid currentColor; }

  .st-hero {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: end;
    gap: 24px 48px;
    padding: 56px 0 44px;
    border-bottom: 2px solid var(--text);
  }
  .st-kicker {
    grid-column: 1 / -1;
    font-family: var(--s-mono);
    font-size: 0.72rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--accent);
  }
  h1 {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: clamp(3rem, 9vw, 6.4rem);
    line-height: 0.86;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }
  h1 em { font-style: normal; color: var(--accent); }
  .st-how {
    list-style: none;
    counter-reset: how;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 8px;
  }
  .st-how li {
    counter-increment: how;
    font-size: 0.95rem;
    color: var(--mid);
  }
  .st-how li::before {
    content: counter(how);
    display: inline-block;
    width: 22px;
    font-family: var(--s-mono);
    font-size: 0.75rem;
    color: var(--dim);
  }
  .st-how b { color: var(--text); font-weight: 600; }

  @media (max-width: 760px) {
    .st-hero { grid-template-columns: 1fr; padding: 36px 0 30px; }
  }
</style>

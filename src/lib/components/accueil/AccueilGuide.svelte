<!-- Contenu lisible par les moteurs sous les portes : les deux univers et leurs pages -->
<script>
  import { UNIVERS } from './guide.js';
</script>

<section class="ag-guide" aria-labelledby="ag-guide-t">
  <h2 id="ag-guide-t">Le blind test musical, gratuit et sans appli</h2>
  <p class="ag-intro">
    ZIK est un blind test musical qui se joue dans le navigateur, sur ordinateur, tablette ou téléphone.
    Un extrait tombe, il faut trouver le titre et l'artiste avant les autres : plus la réponse est rapide, plus elle rapporte de points.
  </p>
  <div class="ag-univers">
    {#each UNIVERS as u (u.titre)}
      <div>
        <h3>{u.titre}</h3>
        <p>{u.texte}</p>
        <ul>
          {#each u.liens as [href, label] (href)}<li><a {href}>{label}</a></li>{/each}
        </ul>
      </div>
    {/each}
  </div>
</section>

<style>
  .ag-guide {
    max-width: 1240px;
    margin: 0 auto;
    padding: clamp(48px, 8vh, 96px) clamp(16px, 5vw, 64px);
  }
  h2 {
    margin: 0 0 16px;
    max-width: 18ch;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: clamp(1.8rem, 3vw, 2.6rem);
    line-height: 0.95;
    text-transform: uppercase;
  }
  .ag-intro { margin: 0; max-width: 68ch; color: var(--mid); line-height: 1.6; }
  .ag-univers {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(24px, 5vw, 72px);
    margin-top: 40px;
  }
  .ag-univers > div { border-top: 1px solid var(--border2); padding-top: 20px; }
  h3 {
    margin: 0 0 10px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.4rem;
    text-transform: uppercase;
  }
  .ag-univers p { margin: 0; color: var(--mid); line-height: 1.6; max-width: 60ch; }
  ul { display: flex; flex-wrap: wrap; gap: 0 20px; margin: 14px 0 0; padding: 0; list-style: none; }
  li a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: var(--text);
    font-weight: 700;
    text-underline-offset: 3px;
  }

  @media (max-width: 760px) {
    .ag-univers { grid-template-columns: 1fr; }
  }
</style>

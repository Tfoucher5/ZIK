<!-- En bas : ZIK Soirée, et ses chiffres lus dans l'offre -->
<script>
  import { FREE_MAX_PLAYERS, FREE_MAX_TEAMS, PLANS, TESTED_PLAYERS } from '#lib/data/proPlans.js';

  const SOIREE = PLANS.find((p) => p.id === 'night').price.replace(' ', ' ');
</script>

<section class="collee" aria-labelledby="t-soiree">
  <div class="acc-wrap">
    <div class="acc-duo">
      <div class="acc-copy rv">
        <span class="label"><i></i>ZIK Soirée · en bas</span>
        <h2 id="t-soiree" class="acc-h2 grad">Chez toi ou devant tout un bar</h2>
        <p class="acc-lead">
          Entre amis, c'est gratuit jusqu'à {FREE_MAX_PLAYERS} joueurs. Pour une salle entière, ZIK Pro lève les limites dès
          {SOIREE} la soirée.
        </p>
        <div class="acc-ctas">
          <a class="btn-main" href="/salon">Créer une soirée</a>
          <a class="btn-line" href="/soiree">Voir comment ça marche</a>
        </div>
        <a class="acc-lien" href="/pro"><u>ZIK Pro pour les bars, campings et entreprises</u> <span aria-hidden="true">→</span></a>
      </div>
      <figure class="acc-vis rv">
        <img
          src="/media/accueil/podium.v1.webp"
          alt="Dans un bar, les joueurs lèvent les bras devant la TV qui affiche le podium"
          loading="lazy"
          decoding="async"
          width="1600"
          height="900"
        />
        <figcaption>Fin de partie · le podium</figcaption>
      </figure>
    </div>
    <ul>
      <li class="rv"><b>{FREE_MAX_PLAYERS}</b><span>joueurs en gratuit, en solo ou en {FREE_MAX_TEAMS} équipes</span></li>
      <li class="rv"><b>0</b><span>appli à installer, tout passe par le navigateur</span></li>
      <li class="rv"><b>{SOIREE}</b><span>la soirée de 24&nbsp;h <span class="pro-tag">ZIK Pro</span></span></li>
      <li class="rv"><b>{TESTED_PLAYERS}</b><span>joueurs simulés tenus dans une même soirée, au test de charge</span></li>
    </ul>
  </div>
</section>

<style>
  ul {
    list-style: none;
    margin: 44px 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 1px solid var(--line-2);
  }
  li {
    display: grid;
    align-content: start;
    gap: 6px;
    padding: 20px 0 18px;
    border-bottom: 1px solid var(--line);
  }
  li:nth-child(odd) {
    padding-right: 14px;
  }
  li:nth-child(even) {
    padding-left: 14px;
    border-left: 1px solid var(--line);
  }
  b {
    margin-bottom: 4px;
    font-family: var(--titre);
    font-weight: 900;
    font-size: clamp(2.8rem, 13vw, 5rem);
    line-height: 0.85;
    font-variant-numeric: tabular-nums;
  }
  li > span {
    font-size: 14px;
    line-height: 1.35;
    color: var(--muted);
  }
  .pro-tag {
    margin-left: 0;
    font-size: 10.5px;
  }
  @media (min-width: 900px) {
    ul {
      grid-template-columns: repeat(4, 1fr);
      margin-top: 72px;
    }
    li,
    li:nth-child(odd),
    li:nth-child(even) {
      padding: 26px 22px 24px;
      border-left: 1px solid var(--line);
      border-bottom: 0;
    }
    li:first-child {
      border-left: 0;
      padding-left: 0;
    }
    b {
      font-size: clamp(3.4rem, 5.6vw, 5.2rem);
    }
  }
</style>

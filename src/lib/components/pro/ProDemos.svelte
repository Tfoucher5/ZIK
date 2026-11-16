<script>
  import { FREE_MAX_PLAYERS } from '$lib/data/proPlans.js';
  import DemoPlayers from './DemoPlayers.svelte';
  import DemoBuzzer from './DemoBuzzer.svelte';
  import DemoSpecials from './DemoSpecials.svelte';
  import DemoNight from './DemoNight.svelte';

  const DEMOS = [
    {
      id: 'joueurs',
      label: 'Joueurs',
      titre: 'Toute la salle joue',
      texte: `En gratuit, le salon s'arrête à ${FREE_MAX_PLAYERS} joueurs. Avec ZIK Pro, pas de limite : chaque arrivée s'affiche sur la TV.`,
      Demo: DemoPlayers,
    },
    {
      id: 'buzzer',
      label: 'Buzzer',
      titre: 'Le premier qui buzze répond',
      texte: 'À voix haute, devant toute la salle. Vous validez depuis la régie, les points tombent.',
      Demo: DemoBuzzer,
    },
    {
      id: 'speciales',
      label: 'Manches spéciales',
      titre: 'Ça relance la partie',
      texte: 'Environ une manche sur quatre, annoncée 4 secondes en grand sur la TV.',
      Demo: DemoSpecials,
    },
    {
      id: 'soiree',
      label: 'Soirée',
      titre: 'Un classement pour toute la soirée',
      texte: 'Partie après partie, les points se cumulent. À la fin, le podium s\'affiche en grand sur la TV.',
      Demo: DemoNight,
    },
  ];
</script>

<section id="demos" aria-labelledby="pro-demos">
  <div class="wrap">
    <div class="head rv">
      <span class="label"><i></i>En soirée</span>
      <h2 class="grad" id="pro-demos">Ce que ZIK Pro change dans votre soirée</h2>
      <p>Ce que vos clients verront, en version animée.</p>
    </div>
    <div class="demos">
      {#each DEMOS as d (d.id)}
        <article class="demo card rv" aria-labelledby="demo-{d.id}">
          <div>
            <span class="label"><i></i>{d.label} <span class="pro-tag">ZIK Pro</span></span>
            <h3 id="demo-{d.id}">{d.titre}</h3>
            <p>{d.texte}</p>
          </div>
          <div class="stage" aria-hidden="true"><d.Demo /></div>
        </article>
      {/each}
    </div>
    <div class="more"><a class="btn-line" href="/soiree#deroule">Voir tout le déroulé →</a></div>
  </div>
</section>

<style>
  .demos {
    display: grid;
    gap: 18px;
  }
  .demo {
    display: grid;
    gap: 20px;
    align-content: start;
    min-width: 0;
    padding: 22px 18px 24px;
  }
  h3 {
    margin-top: 8px;
    font-weight: 800;
    font-size: 1.6rem;
  }
  p {
    margin-top: 6px;
    color: var(--muted);
    font-size: 15px;
  }
  .stage {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 0;
  }
  .stage :global(.scr) {
    font-size: 3.2cqw;
  }
  .more {
    margin-top: 28px;
  }
  @media (min-width: 900px) {
    .demos {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 22px;
    }
    .demo {
      padding: 30px 28px 32px;
    }
    .stage :global(.scr) {
      font-size: 2.6cqw;
    }
  }
</style>

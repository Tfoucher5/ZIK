<script>
  import StatusPill from '#lib/components/layout/StatusPill.svelte';

  let { onContact } = $props();

  const cols = [
    {
      titre: 'ZIK Soirée',
      liens: [
        ['/soiree', 'Découvrir ZIK Soirée'],
        ['/salon', 'Créer une soirée'],
        ['/salon/play', 'Rejoindre une soirée'],
        ['/blind-test/soiree', 'Soirée entre amis'],
        ['/blind-test/bar', 'Bar et restaurant'],
        ['/blind-test/camping', 'Camping'],
        ['/blind-test/entreprise', 'Team building'],
        ['/pro', 'ZIK Pro'],
      ],
    },
    {
      titre: 'Jouer en ligne',
      liens: [
        ['/jouer', 'Jouer en ligne'],
        ['/rooms', 'Rooms'],
        ['/playlists', 'Playlists'],
        ['/classements', 'Classements'],
        ['/zikle', 'Zikle'],
        ['/cartes', 'Cartes musicales'],
      ],
    },
    {
      titre: 'Blind test par thème',
      liens: [
        ['/blind-test/annees-80', 'Années 80'],
        ['/blind-test/annees-2000', 'Années 2000'],
        ['/blind-test/rap-fr', 'Rap français'],
        ['/blind-test/disney', 'Disney'],
        ['/blind-test/anniversaire', 'Anniversaire'],
        ['/blind-test/artistes', 'Par artiste'],
        ['/blind-test', 'Tous les thèmes'],
      ],
    },
    {
      titre: 'ZIK',
      liens: [
        ['/docs', 'Aide et règles du jeu'],
        ['/nouveautes', 'Nouveautés'],
        ['/soutenir', 'Soutenir ZIK'],
        ['/statut', 'État du service'],
        ['/vs/kahoot', 'ZIK vs Kahoot'],
        ['/vs/blinest', 'ZIK vs Blinest'],
        ['/vs/blindtest-io', 'ZIK vs Blindtest.io'],
        ['https://discord.gg/Xkr9aUEKYf', 'Discord'],
      ],
    },
    {
      titre: 'Légal',
      liens: [
        ['/cgu', 'CGU'],
        ['/cgv', 'CGV'],
        ['/confidentialite', 'Confidentialité'],
        ['/mentions-legales', 'Mentions légales'],
      ],
    },
  ];
</script>

<footer class="f2">
  <div class="in">
    <div class="cols">
      {#each cols as c (c.titre)}
        <div>
          <h2>{c.titre}</h2>
          {#each c.liens as [href, txt] (href)}
            {#if href.startsWith('http')}<a {href} target="_blank" rel="noopener">{txt}</a>{:else}<a {href}>{txt}</a>{/if}
          {/each}
          {#if c.titre === 'Légal'}<button type="button" onclick={onContact}>Contact</button>{/if}
        </div>
      {/each}
    </div>
    <StatusPill />
    <div class="bas">
      <a class="logo" href="/" aria-label="ZIK, accueil">ZIK<i aria-hidden="true"></i></a>
      <span>Le blind test qui fait la soirée · zik-music.fr · v3.35.0</span>
    </div>
  </div>
</footer>

<style>
  .f2 {
    position: relative;
    z-index: 3;
    background: var(--surface-alt);
    border-top: 1px solid var(--line);
    padding: 48px 0 calc(28px + env(safe-area-inset-bottom, 0px));
    font-family: var(--corps);
    font-size: 14px;
    color: var(--muted);
  }
  .in {
    max-width: 1200px;
    margin: 0 auto;
    padding-inline: var(--gut);
  }
  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px 20px;
  }
  h2 {
    margin: 0 0 8px;
    font-family: var(--mono);
    font-weight: 500;
    font-size: 12px;
    letter-spacing: 0.14em;
    line-height: 1.4;
    color: var(--text);
  }
  a,
  button {
    display: flex;
    align-items: center;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: var(--muted);
    text-decoration: none;
    cursor: pointer;
  }
  a:hover,
  button:hover {
    color: var(--text);
  }
  .bas {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 20px;
    align-items: center;
    justify-content: space-between;
    margin-top: 36px;
    padding-top: 20px;
    border-top: 1px solid var(--line);
    font-size: 13px;
  }
  .logo {
    display: inline-flex;
    align-items: baseline;
    font-family: var(--titre);
    font-weight: 900;
    font-size: 26px;
    line-height: 1;
    color: var(--text);
  }
  .logo i {
    width: 7px;
    height: 7px;
    margin-left: 3px;
    border-radius: 50%;
    background: var(--accent);
  }
  @media (min-width: 900px) {
    .cols {
      grid-template-columns: repeat(5, 1fr);
    }
    .in {
      padding-inline: 20px;
    }
  }
</style>

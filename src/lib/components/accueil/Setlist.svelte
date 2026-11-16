<!-- « Tu viens pour quoi ? » : trois entrées, trois lignes de setlist -->
<script>
  import { band } from '$lib/components/layout/topBand.svelte.js';
  import { FREE_MAX_PLAYERS } from '$lib/data/proPlans.js';

  const PISTES = [
    ['/salon', 'Créer une soirée', "Une TV, un code à l'écran, et la première musique part en deux minutes.", `Gratuit jusqu'à ${FREE_MAX_PLAYERS} joueurs`],
    ['/jouer', 'Jouer en ligne', "Des rooms par thème et le Zikle du jour, contre d'autres joueurs, tout de suite.", 'Gratuit, avec ou sans compte'],
    ['/salon/play', "J'ai un code", "Rejoins la partie affichée sur la TV, ou la room privée qu'on t'a partagée.", '6 caractères'],
  ];

  // Sans script, « J'ai un code » reste un lien vers /salon/play ; avec, il ouvre le digicode
  const code = (e) => {
    e.preventDefault();
    band.code = true;
  };
</script>

<section aria-labelledby="t-entree">
  <div class="acc-wrap">
    <div class="acc-head rv">
      <span class="label"><i></i>Ton entrée</span>
      <h2 id="t-entree" class="acc-h2 grad">Tu viens pour quoi&nbsp;?</h2>
    </div>
    <ol>
      {#each PISTES as [href, t, d, m], i (href)}
        <li class="rv">
          <a class="trk" {href} onclick={href === '/salon/play' ? code : undefined}>
            <span class="n">0{i + 1}</span><span class="t">{t}</span><span class="go" aria-hidden="true">→</span>
            <span class="d">{d}</span><span class="m">{m}</span>
          </a>
        </li>
      {/each}
    </ol>
  </div>
</section>

<style>
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--line-2);
  }
  li {
    border-bottom: 1px solid var(--line-2);
  }
  .trk {
    position: relative;
    isolation: isolate;
    display: grid;
    grid-template-columns: auto 1fr auto;
    column-gap: 14px;
    row-gap: 6px;
    align-items: center;
    padding: 22px 4px;
    color: var(--text);
    text-decoration: none;
    transition:
      color 0.3s var(--out),
      padding 0.3s var(--out);
  }
  .trk::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: var(--text);
    transform: scaleY(0);
    transform-origin: 50% 100%;
    transition: transform 0.35s var(--out);
  }
  .n {
    align-self: start;
    padding-top: 0.55em;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--muted);
    transition: color 0.3s;
  }
  .t {
    font-family: var(--titre);
    font-weight: 900;
    font-size: clamp(2.3rem, 10.6vw, 4.6rem);
    line-height: 0.9;
    text-transform: uppercase;
  }
  .go {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--line-2);
    font-size: 20px;
    transition:
      transform 0.35s var(--out),
      background 0.3s,
      color 0.3s,
      border-color 0.3s;
  }
  .d {
    grid-column: 2 / -1;
    max-width: 30em;
    font-size: 15px;
    line-height: 1.45;
    color: var(--muted);
    transition: color 0.3s;
  }
  .m {
    grid-column: 2 / -1;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--soft);
    transition: color 0.3s;
  }
  /* Survol, appui et focus clavier : la ligne se remplit de blanc, tout le texte passe en noir */
  .trk:focus-visible {
    outline-offset: -3px;
  }
  .trk:is(:focus-visible, :active) {
    color: #000;
  }
  .trk:is(:focus-visible, :active)::before {
    transform: none;
  }
  .trk:is(:focus-visible, :active) :is(.n, .d, .m) {
    color: #33343d;
  }
  .trk:is(:focus-visible, :active) .go {
    background: #000;
    color: #fff;
    border-color: #000;
  }
  @media (hover: hover) {
    .trk:hover {
      color: #000;
      padding-inline: 18px;
    }
    .trk:hover::before {
      transform: none;
    }
    .trk:hover :is(.n, .d, .m) {
      color: #33343d;
    }
    .trk:hover .go {
      transform: translateX(6px);
      background: #000;
      color: #fff;
      border-color: #000;
    }
  }
  @media (min-width: 900px) {
    .trk {
      grid-template-columns: 56px minmax(0, 1fr) 270px 230px 52px;
      column-gap: 24px;
      padding: 30px 8px;
    }
    .trk > * {
      grid-row: 1;
    }
    .n {
      grid-column: 1;
      align-self: center;
      padding: 0;
    }
    .t {
      grid-column: 2;
      font-size: clamp(2.6rem, 4.5vw, 4rem);
      white-space: nowrap;
    }
    .d {
      grid-column: 3;
    }
    .m {
      grid-column: 4;
      text-align: right;
    }
    .go {
      grid-column: 5;
      width: 52px;
      height: 52px;
    }
  }
</style>

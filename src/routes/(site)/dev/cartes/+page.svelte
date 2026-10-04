<script>
  import Card from '$lib/components/card/Card.svelte';
  import CardViewer from '$lib/components/card/CardViewer.svelte';
  import CardDrop from '$lib/components/card/CardDrop.svelte';
  import RarityBadge from '$lib/components/card/RarityBadge.svelte';
  import { RARITIES } from '$lib/components/card/rarity.js';
  import { demoCards } from './demo.js';

  const faces = [
    ['front', 'Recto'],
    ['back', 'Verso'],
    ['silhouette', 'Silhouette'],
  ];
  const sizes = [
    ['sm', 'Petite'],
    ['md', 'Moyenne'],
    ['lg', 'Grande'],
  ];

  let face = $state('front');
  let size = $state('md');
  let showCopies = $state(false);
  let revealRun = $state(0);
  let wonIndex = $state(3);
  let situation = $state('won');

  const situations = [
    ['won', 'Nouvelle carte'],
    ['duplicate', 'Doublon'],
    ['secured', 'Sécurisée'],
    ['missed', 'Ratée de peu'],
    ['taken', 'Vue des autres'],
    ['guest', 'Invité'],
  ];

  // Conditions d'exploit de la spec (section 1) : temps max et comptes actifs
  const exploit = {
    common: { players: 2 },
    uncommon: { players: 2 },
    rare: { players: 2 },
    epic: { seconds: 15, players: 3 },
    legendary: { seconds: 10, players: 3 },
    mythic: { seconds: 6, players: 4 },
  };

  const won = $derived(demoCards[wonIndex]);
  const round = $derived(situation === 'secured' ? 6 : 3);
  const mode = $derived(
    situation === 'taken' ? 'taken' : situation === 'missed' ? 'missed' : situation === 'guest' ? 'guest' : 'won',
  );
  const conditions = $derived.by(() => {
    const rule = exploit[won.rarity];
    const timeFails = rule.seconds && rule.seconds < 8.2;
    return [
      ...(rule.seconds
        ? [{ label: `Trouvée en moins de ${rule.seconds} s`, value: '8,2 s', ok: !timeFails }]
        : []),
      {
        label: `${rule.players} joueurs connectés`,
        value: `${timeFails ? rule.players : rule.players - 1} / ${rule.players}`,
        ok: !!timeFails,
      },
    ];
  });
</script>

<svelte:head>
  <title>Cartes - prototype | ZIK</title>
  <meta name="robots" content="noindex, nofollow" />
  <link rel="stylesheet" href="/css/cards.css?v=1" />
</svelte:head>

<main class="proto">
  <header class="proto-head">
    <h1>Cartes ZIK</h1>
    <p>
      Prototype des six pressages avec de vraies données Deezer. Survole une carte pour voir le reflet des sillons,
      clique dessus pour l'ouvrir en grand.
    </p>
  </header>

  <div class="proto-tools">
    <div class="seg" role="group" aria-label="Face">
      {#each faces as [value, text] (value)}
        <button type="button" aria-pressed={face === value} onclick={() => (face = value)}>{text}</button>
      {/each}
    </div>
    <div class="seg" role="group" aria-label="Taille">
      {#each sizes as [value, text] (value)}
        <button type="button" aria-pressed={size === value} onclick={() => (size = value)}>{text}</button>
      {/each}
    </div>
    <label class="check"><input type="checkbox" bind:checked={showCopies} /> Doublons</label>
    <button type="button" class="proto-btn" onclick={() => revealRun++}>Rejouer les révélations</button>
  </div>

  <section class="grid">
    {#each demoCards as card (card.id)}
      <figure>
        {#key revealRun}
          <Card
            {card}
            {face}
            {size}
            copies={showCopies ? 3 : 1}
            inspectable
            list={demoCards}
            reveal={revealRun > 0}
          />
        {/key}
        <figcaption>
          <RarityBadge rarity={card.rarity} />
          <span>rank {card.rank.toLocaleString('fr-FR')}</span>
        </figcaption>
      </figure>
    {/each}
  </section>

  <section class="block">
    <h2>Fin de manche</h2>
    <p class="hint">
      Reproduction de l'écran de fin de manche du jeu, avec le panneau de carte. Choisis la carte puis la situation.
    </p>
    <div class="round-tools">
      <div class="seg" role="group" aria-label="Carte de la manche">
        {#each demoCards as card, i (card.id)}
          <button
            type="button"
            aria-pressed={wonIndex === i}
            onclick={() => {
              wonIndex = i;
              revealRun++;
            }}
          >
            {RARITIES[card.rarity].label}
          </button>
        {/each}
      </div>
      <div class="seg" role="group" aria-label="Situation">
        {#each situations as [value, text] (value)}
          <button
            type="button"
            aria-pressed={situation === value}
            onclick={() => {
              situation = value;
              revealRun++;
            }}
          >
            {text}
          </button>
        {/each}
      </div>
    </div>

    <div class="rv">
      <div class="rv-bg" style:background-image={`url("${won.coverXl}")`}></div>
      <div class="rv-inner">
        <div class="rv-card" class:is-missed={situation === 'missed'}>
          {#key `${wonIndex}-${situation}-${revealRun}`}
            <Card card={won} size="lg" reveal inspectable list={[won]} copies={situation === 'duplicate' ? 3 : 1} />
          {/key}
        </div>
        <div class="rv-info">
          <p class="rv-eyebrow">Manche {round} sur 10, réponse</p>
          <h3 class="rv-artist">{won.artist}</h3>
          <p class="rv-title">{won.title}</p>
          {#key `${wonIndex}-${situation}-${revealRun}`}
            <div class="rv-drop">
              <CardDrop
                card={won}
                {mode}
                copies={situation === 'duplicate' ? 3 : 1}
                winner={situation === 'taken' ? { name: 'mehdi13', ms: 3100 } : { name: 'toi', ms: 4200 }}
                {round}
                maxRounds={10}
                {conditions}
              />
            </div>
          {/key}
          <p class="rv-next">Manche suivante dans 5 s</p>
        </div>
      </div>
    </div>
  </section>

  <section class="block">
    <h2>Tailles</h2>
    <div class="sizes">
      {#each ['mini', 'sm', 'md', 'lg'] as s (s)}
        <div class="size-item">
          <Card card={demoCards[3]} size={s} />
          <span>{s}</span>
        </div>
      {/each}
    </div>
  </section>

  <section class="block">
    <h2>Pastilles</h2>
    <div class="badges">
      {#each Object.keys(RARITIES) as r (r)}
        <RarityBadge rarity={r} />
      {/each}
    </div>
  </section>
</main>

<CardViewer />

<style>
  .proto {
    max-width: 1180px;
    margin: 0 auto;
    padding: calc(var(--nav-h) + 32px) 16px 80px;
    color: var(--text);
  }

  .proto-head h1 {
    margin: 0;
    font: 700 clamp(40px, 6vw, 64px) / 1 'Barlow Condensed', sans-serif;
  }

  .proto-head p,
  .hint {
    max-width: 62ch;
    margin: 10px 0 0;
    color: var(--mid);
  }

  .proto-tools {
    position: sticky;
    top: calc(var(--nav-h) + 8px);
    z-index: 10;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin: 28px 0 32px;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--nav-bg);
    backdrop-filter: blur(12px);
  }

  .seg {
    display: inline-flex;
    flex-wrap: wrap;
    padding: 3px;
    border: 1px solid var(--border);
    border-radius: 99px;
    background: var(--surface);
  }

  .seg button,
  .proto-btn {
    min-height: 34px;
    padding: 0 14px;
    border: 0;
    border-radius: 99px;
    background: none;
    color: var(--mid);
    font: 600 14px/1 'Barlow', sans-serif;
    cursor: pointer;
  }

  .seg button[aria-pressed='true'] {
    background: var(--text);
    color: var(--bg);
  }

  .proto-btn {
    border: 1px solid var(--border2);
    color: var(--text);
  }

  .check {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font: 600 14px/1 'Barlow', sans-serif;
    color: var(--mid);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr));
    gap: 40px 24px;
    justify-items: center;
  }

  figure {
    display: grid;
    justify-items: center;
    gap: 12px;
    margin: 0;
  }

  figcaption {
    display: flex;
    align-items: center;
    gap: 10px;
    font: 500 13px/1 'Barlow', sans-serif;
    color: var(--dim);
    font-variant-numeric: tabular-nums;
  }

  .block {
    margin-top: 72px;
  }

  .block h2 {
    margin: 0;
    font: 700 32px/1 'Barlow Condensed', sans-serif;
  }

  .block > .seg {
    margin-top: 18px;
  }

  .round-tools {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 18px;
  }

  /* Reprend l'écran de fin de manche de static/css/game.css (.g-reveal) */
  .rv {
    position: relative;
    margin-top: 20px;
    border-radius: 18px;
    background: #050505;
    color: #f5f3f8;
    overflow: hidden;
  }

  .rv-bg {
    position: absolute;
    inset: -10%;
    background-position: center;
    background-size: cover;
    filter: blur(70px) brightness(0.32) saturate(1.5);
    transform: scale(1.1);
  }

  .rv-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 30%, rgb(0 0 0 / 0.55));
  }

  .rv-inner {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: clamp(28px, 6vw, 72px);
    padding: clamp(28px, 5vw, 56px) 20px;
  }

  .rv-card {
    transition: filter 0.4s;
  }

  .rv-card.is-missed {
    filter: grayscale(0.85) brightness(0.6);
  }

  .rv-info {
    display: grid;
    width: min(100%, 420px);
  }

  .rv-info > * {
    animation: rv-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  }

  .rv-info > :nth-child(2) {
    animation-delay: 0.1s;
  }

  .rv-info > :nth-child(3) {
    animation-delay: 0.2s;
  }

  .rv-info > :nth-child(4) {
    animation-delay: 1.4s;
  }

  .rv-info > :nth-child(5) {
    animation-delay: 1.6s;
  }

  @keyframes rv-up {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
  }

  .rv-eyebrow {
    margin: 0 0 12px;
    font: 500 0.66rem/1 ui-monospace, monospace;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: #ff4fd8;
  }

  .rv-artist {
    margin: 0;
    font: 900 clamp(2.4rem, 5vw, 3.8rem) / 0.9 'Barlow Condensed', sans-serif;
    letter-spacing: -0.01em;
    text-transform: uppercase;
  }

  .rv-title {
    margin: 10px 0 0;
    font: 500 1rem/1.3 ui-monospace, monospace;
    letter-spacing: 0.04em;
    color: rgb(255 255 255 / 0.75);
  }

  .rv-drop {
    margin-top: 24px;
  }

  .rv-next {
    margin: 18px 0 0;
    font: 700 0.72rem/1 'Barlow Condensed', sans-serif;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: rgb(255 255 255 / 0.4);
  }

  .sizes {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 28px;
    margin-top: 20px;
  }

  .size-item {
    display: grid;
    justify-items: center;
    gap: 8px;
    font: 500 13px/1 'Barlow', sans-serif;
    color: var(--dim);
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 20px;
    font-size: 17px;
  }
</style>

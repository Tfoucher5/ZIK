<script>
  import Card from '$lib/components/card/Card.svelte';
  import CardViewer from '$lib/components/card/CardViewer.svelte';
  import CardDrop from '$lib/components/card/CardDrop.svelte';
  import CardTray from '$lib/components/card/CardTray.svelte';
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

  // Partie simulée : manches où le joueur gagne une carte
  const gameWins = [
    { round: 2, index: 0 },
    { round: 3, index: 3 },
    { round: 6, index: 2 },
    { round: 8, index: 4 },
  ];
  let gameRound = $state(3);
  let quitAsked = $state(false);
  const trayEntries = $derived(
    gameWins.filter((w) => w.round <= gameRound).map((w) => ({ card: demoCards[w.index], round: w.round })),
  );
  const atRisk = $derived(gameRound < 5 ? trayEntries.length : 0);
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
    <h2>Suivi pendant la partie</h2>
    <p class="hint">
      Les cartes gagnées s'accumulent à côté du classement. Elles restent éteintes tant que la partie n'a pas passé la
      moitié, puis s'allument toutes ensemble. Avance manche par manche.
    </p>
    <div class="round-tools">
      <div class="seg" role="group" aria-label="Manche">
        <button type="button" onclick={() => (gameRound = Math.max(1, gameRound - 1))}>Manche précédente</button>
        <button type="button" aria-pressed="true">Manche {gameRound} sur 10</button>
        <button type="button" onclick={() => (gameRound = Math.min(10, gameRound + 1))}>Manche suivante</button>
      </div>
      <button type="button" class="proto-btn" onclick={() => (quitAsked = true)}>Quitter la partie</button>
    </div>

    <div class="hud">
      <aside class="hud-side">
        <p class="hud-label">Classement</p>
        <ol class="hud-board">
          <li><span>toi</span><strong>{gameRound * 3 + 2}</strong></li>
          <li><span>mehdi13</span><strong>{gameRound * 3 - 1}</strong></li>
          <li><span>nina_vinyle</span><strong>{gameRound * 2}</strong></li>
        </ol>
        <CardTray entries={trayEntries} round={gameRound} maxRounds={10} />
      </aside>

      <div class="hud-main">
        <div class="hud-phone">
          <div class="hud-phone-top">
            <span class="hud-phone-round">{gameRound} / 10</span>
            {#if trayEntries.length}
              <CardTray entries={trayEntries} round={gameRound} maxRounds={10} variant="pill" />
            {/if}
          </div>
          <p class="hud-phone-hint">Sur téléphone : bandeau compact en haut de l'écran de jeu.</p>
        </div>

        {#if quitAsked}
          <div class="quit" role="alertdialog" aria-labelledby="quit-title">
            <p id="quit-title" class="quit-title">Quitter la partie ?</p>
            {#if atRisk}
              <p class="quit-text">
                {atRisk > 1
                  ? `Tu as ${atRisk} cartes en jeu, sécurisées seulement à la manche 5 : en partant maintenant, tu les perds.`
                  : 'Tu as 1 carte en jeu, sécurisée seulement à la manche 5 : en partant maintenant, tu la perds.'}
              </p>
              <div class="quit-cards">
                {#each trayEntries as e (e.card.id)}
                  <Card card={e.card} size="mini" motion="none" />
                {/each}
              </div>
            {:else}
              <p class="quit-text">Tes cartes de la partie sont sécurisées, tu les gardes.</p>
            {/if}
            <div class="quit-actions">
              <button type="button" class="quit-stay" onclick={() => (quitAsked = false)}>Rester</button>
              <button type="button" class="quit-leave" onclick={() => (quitAsked = false)}>Quitter quand même</button>
            </div>
          </div>
        {/if}
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

  .hud {
    display: grid;
    grid-template-columns: minmax(0, 280px) minmax(0, 1fr);
    gap: 20px;
    margin-top: 20px;
    padding: 20px;
    border-radius: 18px;
    background: #08080b;
    color: #f5f3f8;
  }

  @media (max-width: 720px) {
    .hud {
      grid-template-columns: 1fr;
    }
  }

  .hud-side {
    display: grid;
    align-content: start;
    gap: 12px;
  }

  .hud-label {
    margin: 0;
    font: 500 0.66rem/1 ui-monospace, monospace;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgb(255 255 255 / 0.55);
  }

  .hud-board {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .hud-board li {
    display: flex;
    justify-content: space-between;
    padding: 9px 12px;
    border-radius: 8px;
    background: rgb(255 255 255 / 0.04);
    font-size: 0.92rem;
  }

  .hud-board strong {
    font: 700 1.05rem/1 'Barlow Condensed', sans-serif;
    font-variant-numeric: tabular-nums;
  }

  .hud-main {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 320px;
    border-radius: 12px;
    background: radial-gradient(circle at 50% 30%, #1a1424, #08080b 70%);
  }

  .hud-phone {
    display: grid;
    gap: 10px;
    width: min(100%, 320px);
    padding: 12px;
    border: 1px solid rgb(255 255 255 / 0.1);
    border-radius: 22px;
    background: #0e0e13;
  }

  .hud-phone-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .hud-phone-round {
    font: 700 1rem/1 'Barlow Condensed', sans-serif;
    color: rgb(255 255 255 / 0.7);
  }

  .hud-phone-hint {
    margin: 0;
    font-size: 0.78rem;
    color: rgb(255 255 255 / 0.45);
  }

  .quit {
    position: absolute;
    inset: auto 16px 16px;
    display: grid;
    gap: 12px;
    max-width: 420px;
    margin: 0 auto;
    padding: 18px;
    border: 1px solid rgb(255 255 255 / 0.14);
    border-radius: 14px;
    background: #15151c;
    box-shadow: 0 20px 60px rgb(0 0 0 / 0.6);
  }

  .quit-title {
    margin: 0;
    font: 700 1.5rem/1 'Barlow Condensed', sans-serif;
  }

  .quit-text {
    margin: 0;
    font-size: 0.92rem;
    color: rgb(255 255 255 / 0.75);
  }

  .quit-cards {
    display: flex;
    gap: 8px;
  }

  .quit-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .quit-actions button {
    min-height: 40px;
    padding: 0 16px;
    border-radius: 99px;
    font: 600 0.92rem/1 'Barlow', sans-serif;
    cursor: pointer;
  }

  .quit-stay {
    border: 0;
    background: #f5f3f8;
    color: #111;
  }

  .quit-leave {
    border: 1px solid rgb(255 255 255 / 0.2);
    background: none;
    color: #f5f3f8;
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

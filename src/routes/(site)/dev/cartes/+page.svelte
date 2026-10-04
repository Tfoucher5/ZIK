<script>
  import Card from '$lib/components/card/Card.svelte';
  import CardViewer from '$lib/components/card/CardViewer.svelte';
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
  let wonIndex = $state(5);

  const won = $derived(demoCards[wonIndex]);
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
    <p class="hint">Ce que voient le gagnant et les autres joueurs pendant la pause entre deux manches.</p>
    <div class="seg" role="group" aria-label="Carte gagnée">
      {#each demoCards as card, i (card.id)}
        <button type="button" aria-pressed={wonIndex === i} onclick={() => { wonIndex = i; revealRun++; }}>
          {RARITIES[card.rarity].label}
        </button>
      {/each}
    </div>

    <div class="round">
      <div class="round-card">
        {#key `${wonIndex}-${revealRun}`}
          <Card card={won} size="sm" reveal inspectable list={[won]} />
        {/key}
      </div>
      <div class="round-text">
        <p class="round-kicker">Nouvelle carte</p>
        <p class="round-title">{won.title}</p>
        <p class="round-sub">Reste jusqu'à la manche 5 pour la garder.</p>
        <ul class="round-lines">
          <li>🏆 1er : toi, 4,2 s</li>
          <li>🃏 Les autres voient : <strong>pseudo</strong> remporte la carte <RarityBadge rarity={won.rarity} /></li>
          <li class="missed">
            Raté de peu : <RarityBadge rarity="mythic" /> ratée, il fallait trouver en moins de 6 s (8,2 s)
          </li>
        </ul>
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

  .round {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 28px;
    margin-top: 20px;
    padding: 28px;
    border: 1px solid var(--border);
    border-radius: 16px;
    --text: #f5f3f8;
    background: #0d0c12;
    color: #f5f3f8;
  }

  .round-kicker {
    margin: 0;
    font: 600 15px/1 'Barlow', sans-serif;
    color: rgb(255 255 255 / 0.6);
  }

  .round-title {
    margin: 6px 0 0;
    font: 700 40px/1 'Barlow Condensed', sans-serif;
  }

  .round-sub {
    margin: 8px 0 0;
    color: rgb(255 255 255 / 0.7);
  }

  .round-lines {
    display: grid;
    gap: 10px;
    margin: 20px 0 0;
    padding: 0;
    list-style: none;
    font-size: 15px;
  }

  .round-lines li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .missed {
    color: rgb(255 255 255 / 0.6);
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

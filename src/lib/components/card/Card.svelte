<script>
  import { RARITIES } from './rarity.js';
  import { cardTilt } from './cardTilt.js';
  import { openCard } from './cardViewer.svelte.js';

  let {
    card,
    size = 'md',
    face = 'front',
    motion = 'hover',
    inspectable = false,
    list = null,
    reveal = false,
    discOut = false,
    gyro = false,
  } = $props();

  const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

  const silhouette = $derived(face === 'silhouette');
  const label = $derived(RARITIES[card.rarity].label);
  const cover = $derived(size === 'lg' || size === 'xl' ? card.coverXl : card.coverMd);
  const popularity = $derived(
    (card.rank / 10_000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  );
  const found = $derived(card.successRate == null ? '-' : `${Math.round(card.successRate * 100)} %`);
  const obtained = $derived(card.obtainedAt ? new Date(card.obtainedAt).toLocaleDateString('fr-FR') : '-');
  const name = $derived(silhouette ? 'Carte à découvrir' : `Carte ${label} : ${card.title}, ${card.artist}`);
</script>

{#snippet body()}
  <div
    class="zc"
    data-rarity={silhouette ? 'none' : card.rarity}
    data-size={size}
    data-motion={motion}
    class:is-back={face === 'back'}
    class:is-silhouette={silhouette}
    class:is-revealing={reveal}
    class:disc-out={discOut}
    style:--tone={card.color}
    style:--cover={`url("${card.coverMd}")`}
    role="img"
    aria-label={name}
    use:cardTilt={{ enabled: motion !== 'none', strength: motion === 'full' ? 1 : 0.45, gyro }}
  >
    <div class="zc-inner">
      <div class="zc-flip">
        <div class="zc-face zc-front">
          <div class="zc-bg"></div>
          <div class="zc-foil"></div>
          <div class="zc-flakes"></div>
          {#if !silhouette}
            <div class="zc-disc">
              <div class="zc-vinyl"><div class="zc-label"></div></div>
              <div class="zc-sheen"></div>
            </div>
          {/if}
          <img class="zc-cover" src={cover} alt="" loading="lazy" draggable="false" />
          <div class="zc-gloss"></div>
          <div class="zc-glare"></div>
          <div class="zc-obi">
            <span class="zc-obi-num">n° {card.number}</span>
            <span class="zc-obi-rarity">{silhouette ? '?' : label}</span>
          </div>
          <div class="zc-info">
            {#if silhouette}
              <p class="zc-title">Carte à découvrir</p>
            {:else}
              <p class="zc-title">{card.title}</p>
              <p class="zc-artist">{card.artist}</p>
              <p class="zc-album">{card.album}, {card.year}</p>
            {/if}
          </div>
          {#if !silhouette}
            <dl class="zc-stats">
              <div><dt>popularité</dt><dd class="zc-pop">{popularity}</dd></div>
              <div><dt>fans</dt><dd>{compact.format(card.fans)}</dd></div>
              <div><dt>trouvée</dt><dd>{found}</dd></div>
            </dl>
          {/if}
          <span class="zc-url">zik-music.fr</span>
        </div>

        <div class="zc-face zc-back">
          <div class="zc-bg"></div>
          <div class="zc-vinyl zc-back-vinyl"><div class="zc-label"></div></div>
          {#if !silhouette}
            <dl class="zc-details">
              <div><dt>Album</dt><dd>{card.album}</dd></div>
              <div><dt>Genre</dt><dd>{card.genre}</dd></div>
              <div><dt>Fans de l'artiste</dt><dd>{card.fans.toLocaleString('fr-FR')}</dd></div>
              <div><dt>Obtenue le</dt><dd>{obtained}</dd></div>
              <div><dt>Premier à l'avoir</dt><dd>{card.firstOwner ?? '-'}</dd></div>
            </dl>
          {/if}
          <p class="zc-url-back">zik-music.fr</p>
          <p class="zc-source">Données et pochettes : Deezer</p>
          <div class="zc-glare"></div>
        </div>
      </div>
    </div>
  </div>
{/snippet}

{#if inspectable}
  <button type="button" class="zc-hit" aria-label={`Voir en grand : ${name}`} onclick={() => openCard(card, list)}>
    {@render body()}
  </button>
{:else}
  {@render body()}
{/if}

<style>
  /* ── Gabarit ───────────────────────────────────────────────────────────── */
  .zc {
    --w: 230px;
    --rx: 0deg;
    --ry: 0deg;
    --disc: radial-gradient(circle, #34363b 0 30%, #17181b 72%);
    --groove: 0.05;
    --rim: rgb(255 255 255 / 0.09);
    --bg-art:
      radial-gradient(120% 80% at 75% 18%, color-mix(in oklab, var(--tone) 32%, #1c1d20), transparent 70%),
      linear-gradient(165deg, #1e1f22, #0d0d0f);
    --foil: none;
    --foil-o: 0;
    --foil-on: 0;
    --foil-size: 300% 300%;
    --foil-blend: color-dodge;
    --sheen-c: #fff;
    --sheen-soft: color-mix(in srgb, var(--sheen-c) 22%, transparent);
    --bowtie: conic-gradient(
      from var(--sheen),
      transparent 0deg,
      var(--sheen-soft) 9deg,
      var(--sheen-c) 21deg,
      var(--sheen-soft) 33deg,
      transparent 44deg 180deg,
      var(--sheen-soft) 189deg,
      var(--sheen-c) 201deg,
      var(--sheen-soft) 213deg,
      transparent 224deg 360deg
    );
    --bowtie-rainbow: conic-gradient(
      from var(--sheen),
      transparent 0deg,
      rgb(255 106 213 / 0.4) 8deg,
      #ff6ad5 14deg,
      #ffe36a 20deg,
      #6affc1 26deg,
      #6ac8ff 32deg,
      transparent 44deg 180deg,
      rgb(255 106 213 / 0.4) 188deg,
      #ff6ad5 194deg,
      #ffe36a 200deg,
      #6affc1 206deg,
      #6ac8ff 212deg,
      transparent 224deg 360deg
    );
    /* Bruit fin seuillé : paillettes irrégulières, sans motif répété visible */
    --noise: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' seed='5' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 14 0 0 0 -9.4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)'/%3E%3C/svg%3E");
    position: relative;
    display: block;
    width: var(--w);
    aspect-ratio: 5 / 7;
    container-type: inline-size;
    perspective: 1100px;
    /* Le reflet suit l'inclinaison avec un léger temps de retard, comme une vraie lumière */
    transition:
      --mx 0.3s ease-out,
      --my 0.3s ease-out,
      --sheen 0.3s ease-out;
    font-family: 'Barlow', sans-serif;
    color: #f5f3f8;
    text-align: left;
    user-select: none;
    -webkit-user-select: none;
  }

  .zc[data-size='mini'] { --w: 64px; }
  .zc[data-size='sm'] { --w: 150px; }
  .zc[data-size='md'] { --w: 230px; }
  .zc[data-size='lg'] { --w: 300px; }
  .zc[data-size='xl'] { --w: min(400px, 76vw, calc(62dvh * 5 / 7)); }

  .zc-inner,
  .zc-flip {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
  }

  .zc-inner {
    transform: rotateX(var(--rx)) rotateY(var(--ry));
    transition: transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  :global(.zc.is-tilting) .zc-inner {
    transition: transform 0.08s linear;
  }

  .zc-flip {
    transition: transform 0.65s cubic-bezier(0.3, 0.7, 0.2, 1);
  }

  .zc.is-back .zc-flip {
    transform: rotateY(180deg);
  }

  .zc-face {
    position: absolute;
    inset: 0;
    border-radius: 4.5cqw;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  .zc-back {
    transform: rotateY(180deg);
  }

  /* ── Fond : teinte tirée de la pochette ───────────────────────────────── */
  .zc-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    background: var(--bg-art);
    box-shadow:
      0 2.5cqw 7cqw rgb(0 0 0 / 0.5),
      inset 0 0 0 1px var(--rim);
  }

  .zc-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(
      --grain,
      repeating-linear-gradient(35deg, rgb(255 255 255 / 0.018) 0 1px, transparent 1px 4px)
    );
  }

  /* ── Brillance : feuille métallisée sous la pochette ──────────────────── */
  .zc-foil {
    position: absolute;
    z-index: 1;
    inset: 0;
    border-radius: inherit;
    background: var(--foil);
    background-size: var(--foil-size);
    background-position: var(--mx) var(--my);
    mix-blend-mode: var(--foil-blend);
    opacity: var(--foil-o);
    /* Brillance atténuée derrière les textes pour garder leur lisibilité */
    mask: linear-gradient(180deg, #000 52%, rgb(0 0 0 / 0.3) 70%);
    transition: opacity 0.35s;
    pointer-events: none;
  }

  :global(.zc.is-tilting) .zc-foil {
    opacity: var(--foil-on);
  }

  /* Reflet de pochette plastifiée, visible seulement quand on bouge la carte */
  .zc-gloss {
    position: absolute;
    z-index: 2;
    top: 5cqw;
    left: 14cqw;
    width: 70cqw;
    aspect-ratio: 1;
    border-radius: 1cqw;
    background: linear-gradient(
      115deg,
      transparent 38%,
      rgb(255 255 255 / 0.05) 44%,
      rgb(255 255 255 / 0.15) 49%,
      rgb(255 255 255 / 0.05) 54%,
      transparent 60%
    );
    background-size: 260% 260%;
    background-position: var(--mx) var(--my);
    mix-blend-mode: screen;
    opacity: 0;
    transition: opacity 0.35s;
    pointer-events: none;
  }

  :global(.zc.is-tilting) .zc-gloss {
    opacity: 1;
  }

  /* ── Pochette ─────────────────────────────────────────────────────────── */
  .zc-cover {
    position: absolute;
    z-index: 2;
    top: 5cqw;
    left: 14cqw;
    width: 70cqw;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 1cqw;
    box-shadow:
      1.2cqw 1.6cqw 3.5cqw rgb(0 0 0 / 0.55),
      0 0 0 1px rgb(255 255 255 / 0.06);
  }

  /* ── Disque ───────────────────────────────────────────────────────────── */
  .zc-disc {
    position: absolute;
    z-index: 1;
    top: 8cqw;
    left: 31cqw;
    width: 64cqw;
    aspect-ratio: 1;
    transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .zc.disc-out .zc-disc {
    transform: translateX(44cqw);
  }

  .zc-vinyl {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: var(--disc);
    box-shadow:
      0 1.5cqw 4cqw rgb(0 0 0 / 0.55),
      inset 0 0 0 0.3cqw rgb(255 255 255 / 0.08),
      inset 0 0 0 0.75cqw rgb(0 0 0 / 0.32);
  }

  /* Sillons fins + trois plages plus sombres entre les morceaux, zone lisse
     autour de l'étiquette et sur le bord, comme sur un vrai disque */
  .zc-vinyl::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background:
      radial-gradient(
        circle closest-side,
        transparent 0 57%,
        rgb(0 0 0 / 0.22) 57.8% 58.3%,
        transparent 59% 71%,
        rgb(0 0 0 / 0.22) 71.8% 72.3%,
        transparent 73% 84%,
        rgb(0 0 0 / 0.22) 84.8% 85.3%,
        transparent 86%
      ),
      repeating-radial-gradient(
        circle closest-side,
        rgb(255 255 255 / var(--groove)) 0 0.1cqw,
        transparent 0.1cqw 0.42cqw
      );
    mask: radial-gradient(circle closest-side, transparent 0 46%, #000 47% 95%, transparent 96%);
  }

  .zc.disc-out .zc-vinyl {
    animation: zc-spin 1.8s linear 0.8s infinite;
  }

  /* Étiquette : la pochette en rond, cerclée de la couleur de la rareté */
  .zc-label {
    position: absolute;
    inset: 31%;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--cover) center / cover;
    box-shadow:
      0 0 0 0.5cqw var(--rc),
      0 0 0 0.9cqw rgb(0 0 0 / 0.45),
      inset 0 0 2cqw rgb(0 0 0 / 0.35);
  }

  .zc-label::after {
    content: '';
    width: 2.4cqw;
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle, #050506 55%, #2a2a2e);
    box-shadow: 0 0 0 0.35cqw rgb(255 255 255 / 0.25);
  }

  .zc-sheen {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: var(--sheen-img);
    opacity: var(--sheen-o);
    mix-blend-mode: screen;
    mask: radial-gradient(circle closest-side, transparent 0 40%, #000 44% 95%, transparent 97%);
    pointer-events: none;
  }

  /* ── Obi ──────────────────────────────────────────────────────────────── */
  .zc-obi {
    position: absolute;
    z-index: 3;
    top: 0;
    bottom: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    width: 11cqw;
    padding: 4.5cqw 0;
    border-radius: 4.5cqw 0 0 4.5cqw;
    background: linear-gradient(180deg, var(--rc-light), var(--rc) 55%, var(--rc-dark));
    box-shadow: 0.6cqw 0 1.8cqw rgb(0 0 0 / 0.35);
    color: var(--rc-ink);
  }

  .zc-obi span {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    white-space: nowrap;
  }

  .zc-obi-rarity {
    font: 700 5.4cqw/1 'Barlow Condensed', sans-serif;
    letter-spacing: 0.04em;
  }

  .zc-obi-num {
    font: 600 3.3cqw/1 'Barlow Condensed', sans-serif;
    font-variant-numeric: tabular-nums;
    opacity: 0.75;
  }


  /* ── Textes ───────────────────────────────────────────────────────────── */
  .zc-info,
  .zc-stats {
    text-shadow: 0 0.3cqw 1.4cqw rgb(0 0 0 / 0.6);
  }

  .zc-info {
    position: absolute;
    z-index: 3;
    top: 81cqw;
    right: 5cqw;
    left: 15cqw;
  }

  .zc-info p {
    margin: 0;
    overflow: hidden;
  }

  .zc-title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    font: 700 9.6cqw/0.95 'Barlow Condensed', sans-serif;
    letter-spacing: -0.01em;
    text-wrap: balance;
  }

  .zc-artist {
    margin-top: 1.4cqw !important;
    font: 600 4.6cqw/1.15 'Barlow', sans-serif;
    color: rgb(255 255 255 / 0.9);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .zc-album {
    margin-top: 0.4cqw !important;
    font: 400 3.6cqw/1.25 'Barlow', sans-serif;
    color: rgb(255 255 255 / 0.72);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .zc-stats {
    position: absolute;
    z-index: 3;
    right: 5cqw;
    bottom: 4.5cqw;
    left: 15cqw;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2cqw;
    margin: 0;
    padding-top: 2.6cqw;
    border-top: 1px solid rgb(255 255 255 / 0.14);
  }

  .zc-stats div {
    display: flex;
    flex-direction: column-reverse;
    gap: 0.6cqw;
  }

  .zc-stats dd {
    margin: 0;
    font: 600 5.8cqw/1 'Barlow Condensed', sans-serif;
    font-variant-numeric: tabular-nums;
  }

  .zc-stats dt {
    font: 500 2.9cqw/1 'Barlow', sans-serif;
    color: rgb(255 255 255 / 0.68);
  }

  .zc-pop {
    color: var(--rc-light);
  }

  /* ── Lumière ──────────────────────────────────────────────────────────── */
  .zc-glare {
    position: absolute;
    z-index: 2;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      115deg,
      transparent 35%,
      color-mix(in oklab, var(--rc-light) 45%, transparent) 50%,
      transparent 65%
    );
    background-size: 250% 250%;
    background-position: var(--mx) var(--my);
    mix-blend-mode: soft-light;
    opacity: 0;
    transition: opacity 0.35s;
    pointer-events: none;
  }

  :global(.zc.is-tilting) .zc-glare {
    opacity: 1;
  }

  .zc-flakes {
    display: none;
  }

  /* ── Verso ────────────────────────────────────────────────────────────── */
  .zc-back .zc-bg {
    background: radial-gradient(circle at 50% 28%, #1e1f24, #08080a 72%);
  }

  .zc-back-vinyl {
    inset: auto;
    top: 7cqw;
    left: 14cqw;
    width: 72cqw;
    height: 72cqw;
  }

  .zc-details {
    position: absolute;
    top: 86cqw;
    right: 8cqw;
    left: 8cqw;
    display: grid;
    gap: 1.8cqw;
    margin: 0;
  }

  .zc-details div {
    display: flex;
    justify-content: space-between;
    gap: 3cqw;
    padding-bottom: 1.4cqw;
    border-bottom: 1px solid rgb(255 255 255 / 0.08);
  }

  .zc-details dt {
    font: 400 3.4cqw/1.2 'Barlow', sans-serif;
    color: rgb(255 255 255 / 0.55);
    white-space: nowrap;
  }

  .zc-details dd {
    overflow: hidden;
    margin: 0;
    font: 600 3.6cqw/1.2 'Barlow', sans-serif;
    text-align: right;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .zc-url {
    position: absolute;
    z-index: 3;
    right: 5cqw;
    bottom: 1.3cqw;
    font: 600 2.4cqw/1 'Barlow', sans-serif;
    letter-spacing: 0.03em;
    color: rgb(255 255 255 / 0.4);
  }

  .zc-url-back {
    position: absolute;
    right: 0;
    bottom: 8cqw;
    left: 0;
    margin: 0;
    font: 700 4.4cqw/1 'Barlow Condensed', sans-serif;
    letter-spacing: 0.04em;
    color: var(--rc-light);
    text-align: center;
  }

  .zc-source {
    position: absolute;
    right: 0;
    bottom: 3.5cqw;
    left: 0;
    margin: 0;
    font: 400 2.8cqw/1 'Barlow', sans-serif;
    color: rgb(255 255 255 / 0.35);
    text-align: center;
  }

  /* ── Pressages ────────────────────────────────────────────────────────── */
  .zc[data-rarity='common'] {
    --disc: radial-gradient(circle, #3d4046 0 30%, #1d1f23 72%, #141518);
    --groove: 0.05;
    --sheen-img: var(--bowtie);
    --sheen-o: 0.2;
    --foil: linear-gradient(115deg, transparent 40%, rgb(255 255 255 / 0.5) 50%, transparent 60%);
    --foil-blend: soft-light;
    --foil-on: 0.5;
  }

  .zc[data-rarity='uncommon'] {
    --disc: radial-gradient(circle, #45d48c 0 30%, #1c8c54 70%, #106a3d);
    --groove: 0.08;
    --sheen-img: var(--bowtie);
    --sheen-o: 0.32;
    --rim: rgb(47 191 113 / 0.35);
    --bg-art:
      radial-gradient(85% 55% at 82% 26%, rgb(47 191 113 / 0.3), transparent 70%),
      radial-gradient(110% 70% at 15% 100%, color-mix(in oklab, var(--tone) 30%, transparent), transparent 70%),
      linear-gradient(165deg, #10251b, #060f0a);
    --foil: linear-gradient(
      115deg,
      transparent 38%,
      rgb(134 239 172 / 0.55) 48%,
      rgb(220 252 231 / 0.8) 50%,
      rgb(134 239 172 / 0.55) 52%,
      transparent 62%
    );
    --foil-blend: screen;
    --foil-o: 0.12;
    --foil-on: 0.4;
  }

  .zc[data-rarity='rare'] {
    --disc: radial-gradient(
      circle,
      rgb(147 197 253 / 0.5) 0 30%,
      rgb(37 99 235 / 0.55) 66%,
      rgb(30 64 175 / 0.78) 95%
    );
    --groove: 0.13;
    --sheen-img: var(--bowtie);
    --sheen-o: 0.48;
    --rim: rgb(96 165 250 / 0.45);
    --bg-art:
      radial-gradient(85% 55% at 82% 26%, rgb(59 130 246 / 0.42), transparent 70%),
      linear-gradient(
        115deg,
        transparent 42%,
        rgb(147 197 253 / 0.07) 46%,
        transparent 50% 62%,
        rgb(147 197 253 / 0.05) 65%,
        transparent 69%
      ),
      radial-gradient(110% 70% at 15% 100%, color-mix(in oklab, var(--tone) 28%, transparent), transparent 70%),
      linear-gradient(165deg, #0c1a36, #050913);
    --foil:
      repeating-linear-gradient(
        115deg,
        rgb(255 255 255 / 0) 0 1.2cqw,
        rgb(191 219 254 / 0.35) 1.4cqw,
        rgb(255 255 255 / 0) 1.6cqw 3cqw
      ),
      linear-gradient(
        115deg,
        transparent 35%,
        rgb(147 197 253 / 0.6) 48%,
        rgb(239 246 255 / 0.85) 50%,
        rgb(147 197 253 / 0.6) 52%,
        transparent 65%
      );
    --foil-blend: screen;
    --foil-o: 0.15;
    --foil-on: 0.5;
  }

  .zc[data-rarity='rare'] .zc-vinyl {
    backdrop-filter: blur(1.5px) saturate(1.4);
  }

  .zc[data-rarity='epic'] {
    --disc:
      radial-gradient(ellipse 42% 24% at 28% 30%, rgb(233 213 255 / 0.85), transparent 70%),
      radial-gradient(ellipse 34% 46% at 74% 66%, rgb(76 29 149 / 0.95), transparent 70%),
      radial-gradient(ellipse 30% 18% at 62% 24%, rgb(244 114 182 / 0.65), transparent 70%),
      radial-gradient(ellipse 26% 36% at 30% 72%, rgb(192 132 252 / 0.8), transparent 70%),
      conic-gradient(from 20deg, #6d28d9, #a855f7, #4c1d95, #c084fc, #7e22ce, #6d28d9);
    --groove: 0.1;
    --sheen-img: var(--bowtie);
    --sheen-c: var(--rc-light);
    --sheen-o: 0.6;
    --rim: rgb(192 132 252 / 0.5);
    --bg-art:
      radial-gradient(85% 55% at 82% 26%, rgb(155 92 246 / 0.5), transparent 70%),
      radial-gradient(80% 60% at 8% 96%, rgb(236 72 153 / 0.26), transparent 70%),
      linear-gradient(165deg, #1e0f36, #090514);
    --foil:
      repeating-linear-gradient(115deg, rgb(0 0 0 / 0) 0 0.7cqw, rgb(0 0 0 / 0.35) 0.8cqw 1cqw),
      repeating-linear-gradient(115deg, #6d28d9 0%, #a78bfa 3.5%, #e9d5ff 7%, #c084fc 10.5%, #7c3aed 14%, #6d28d9 17.5%);
    --foil-o: 0.2;
    --foil-on: 0.5;
  }

  .zc[data-rarity='legendary'] {
    /* Or poli : le dégradé conique imite le reflet en éventail d'un métal tourné */
    --disc: conic-gradient(
      from 15deg,
      #7a5212,
      #e9c66a 8%,
      #fff0bd 14%,
      #c99a3a 22%,
      #7f5715 30%,
      #d9b057 40%,
      #fff4cc 47%,
      #b88a2c 55%,
      #6e4a10 64%,
      #d6ab4f 74%,
      #fff0bd 82%,
      #a87a22 90%,
      #7a5212
    );
    --groove: 0.2;
    --sheen-img: var(--bowtie);
    --sheen-c: #fff6d8;
    --sheen-o: 0.9;
    --flake-c: #ffe7a3;
    --flake-o: 0.5;
    --flake-disc-o: 0.45;
    --rim: rgb(232 184 74 / 0.6);
    --bg-art:
      radial-gradient(85% 55% at 82% 26%, rgb(232 184 74 / 0.38), transparent 70%),
      radial-gradient(110% 70% at 15% 100%, rgb(120 80 20 / 0.45), transparent 70%),
      linear-gradient(165deg, #2b200b, #0d0903);
    --grain: repeating-linear-gradient(90deg, rgb(255 228 160 / 0.045) 0 1px, transparent 1px 2.5px);
    --foil: linear-gradient(
      115deg,
      transparent 30%,
      rgb(180 130 40 / 0.6) 42%,
      rgb(255 236 170 / 0.95) 48%,
      #fffbe8 50%,
      rgb(255 236 170 / 0.95) 52%,
      rgb(180 130 40 / 0.6) 58%,
      transparent 70%
    );
    --foil-size: 250% 250%;
    --foil-o: 0.3;
    --foil-on: 0.75;
  }

  .zc[data-rarity='legendary'] .zc-front .zc-bg {
    box-shadow:
      0 2.5cqw 7cqw rgb(0 0 0 / 0.5),
      inset 0 0 0 0.7cqw #c9972f,
      inset 0 0 0 1.1cqw rgb(0 0 0 / 0.45);
  }

  .zc[data-rarity='legendary'] .zc-cover {
    outline: 0.5cqw solid #e2b24c;
    outline-offset: 0.6cqw;
  }

  .zc[data-rarity='legendary'] .zc-obi-rarity {
    text-shadow: 0 0.25cqw 0 rgb(255 255 255 / 0.45);
  }

  .zc[data-rarity='mythic'] {
    --disc:
      radial-gradient(ellipse 45% 28% at 30% 32%, rgb(255 190 240 / 0.9), transparent 70%),
      radial-gradient(ellipse 38% 50% at 72% 64%, rgb(176 30 140 / 0.9), transparent 70%),
      radial-gradient(ellipse 30% 22% at 65% 26%, rgb(199 116 255 / 0.7), transparent 70%),
      conic-gradient(from 30deg, #ff4fc8, #ff8fe0, #d01e93, #ff6ad5, #b8128a, #ff4fc8);
    --groove: 0.14;
    --flake-c: linear-gradient(115deg, #fff, #ffc6ee, #c4f0ff, #fff);
    --flake-o: 0.55;
    --flake-disc-o: 0.6;
    --sheen-img: var(--bowtie-rainbow);
    --sheen-o: 0.85;
    --rim: rgb(255 138 222 / 0.65);
    --foil:
      repeating-linear-gradient(115deg, rgb(0 0 0 / 0) 0 0.7cqw, rgb(0 0 0 / 0.3) 0.8cqw 1cqw),
      repeating-linear-gradient(115deg, #ff6ad5 0%, #c774ff 3.5%, #6ad8ff 7%, #6affc8 10.5%, #fff06a 14%, #ff6ad5 17.5%);
    --foil-o: 0.3;
    --foil-on: 0.65;
  }

  .zc[data-rarity='mythic'] .zc-front .zc-bg {
    background: #22061b;
  }

  .zc[data-rarity='mythic'] .zc-front .zc-bg::before {
    content: '';
    position: absolute;
    inset: -20%;
    background: var(--cover) center / cover;
    filter: blur(6cqw) saturate(1.7) brightness(0.8);
  }

  .zc[data-rarity='mythic'] .zc-front .zc-bg::after {
    background:
      conic-gradient(
        from calc(var(--sheen) * 2) at 70% 30%,
        rgb(255 106 213 / 0.25),
        rgb(106 216 255 / 0.18),
        rgb(199 116 255 / 0.25),
        rgb(255 106 213 / 0.25)
      ),
      linear-gradient(180deg, rgb(255 79 200 / 0.2), rgb(24 2 18 / 0.88) 72%);
  }

  .zc[data-rarity='mythic'] .zc-obi {
    background: linear-gradient(calc(var(--sheen) + 90deg), #ff8ade, #d4a5ff, #8ff0ff, #ffc6ee, #ff8ade);
  }

  .zc[data-rarity='legendary'] .zc-flakes,
  .zc[data-rarity='mythic'] .zc-flakes {
    display: block;
    position: absolute;
    z-index: 1;
    inset: 0;
    border-radius: inherit;
    background: var(--flake-c);
    opacity: var(--flake-o);
    mask:
      var(--noise) 0 0 / 200px 200px,
      linear-gradient(115deg, rgb(0 0 0 / 0.2) 30%, #000 50%, rgb(0 0 0 / 0.2) 70%) var(--mx) var(--my) / 250% 250%;
    mask-composite: intersect;
    pointer-events: none;
  }

  .zc[data-rarity='legendary'] .zc-vinyl::after,
  .zc[data-rarity='mythic'] .zc-vinyl::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: var(--flake-c);
    opacity: var(--flake-disc-o);
    mask:
      var(--noise) 0 0 / 160px 160px,
      radial-gradient(circle closest-side, transparent 0 46%, #000 47% 95%, transparent 96%);
    mask-composite: intersect;
    mix-blend-mode: screen;
  }

  /* ── Silhouette ───────────────────────────────────────────────────────── */
  .zc.is-silhouette .zc-bg {
    background: linear-gradient(165deg, #2a2c31, #111215);
  }

  .zc.is-silhouette .zc-cover {
    filter: grayscale(1) blur(2.2cqw) brightness(0.5);
  }

  .zc.is-silhouette .zc-label {
    background: #2a2c31;
  }

  .zc.is-silhouette .zc-title {
    color: rgb(255 255 255 / 0.45);
  }

  /* ── Petites tailles ──────────────────────────────────────────────────── */
  @container (max-width: 120px) {
    .zc-info,
    .zc-stats,
    .zc-url,
    .zc-obi-num {
      display: none;
    }

    .zc-cover {
      top: 30cqw;
    }

    .zc-disc {
      top: 32cqw;
    }
  }

  /* ── Révélation de fin de manche ──────────────────────────────────────── */
  .zc.is-revealing .zc-inner {
    animation: zc-pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.25) backwards;
  }

  .zc.is-revealing .zc-obi {
    animation: zc-obi 0.45s ease-out 0.15s backwards;
  }

  .zc.is-revealing .zc-disc {
    animation: zc-disc-in 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s backwards;
  }

  .zc.is-revealing .zc-vinyl {
    animation: zc-spin 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s backwards;
  }

  .zc.is-revealing {
    animation: zc-sheen-sweep 0.75s ease-in-out 1.35s backwards;
  }

  .zc.is-revealing .zc-glare {
    animation: zc-flash 0.75s ease-in-out 1.35s backwards;
  }

  @keyframes zc-pop {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(4cqw);
    }
  }

  @keyframes zc-obi {
    from {
      clip-path: inset(0 0 100% 0);
    }
    to {
      clip-path: inset(0);
    }
  }

  @keyframes zc-disc-in {
    from {
      transform: translateX(-17cqw);
    }
  }

  @keyframes zc-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes zc-sheen-sweep {
    from {
      --sheen: -90deg;
      --mx: -15%;
      --my: 10%;
    }
    to {
      --sheen: 150deg;
      --mx: 115%;
      --my: 70%;
    }
  }

  @keyframes zc-flash {
    0%,
    100% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .zc,
    .zc * {
      animation: none !important;
      transition: none !important;
    }
  }

  /* ── Carte cliquable ──────────────────────────────────────────────────── */
  .zc-hit {
    display: inline-block;
    padding: 0;
    border: 0;
    border-radius: 12px;
    background: none;
    color: inherit;
    font: inherit;
    cursor: zoom-in;
  }

  .zc-hit:focus-visible {
    outline: 2px solid var(--rarity-mythic);
    outline-offset: 6px;
  }
</style>

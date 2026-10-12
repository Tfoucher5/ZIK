<div class="zc-foil"></div>
<div class="zc-flakes"></div>

<style>
  /* Variables de pressage posées sur .zc (Card.svelte) : globales car lues par
     toutes les couches de la carte, réparties dans plusieurs composants */
  :global(.zc) {
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

  .zc-flakes {
    display: none;
  }

  /* ── Pressages ────────────────────────────────────────────────────────── */
  :global(.zc[data-rarity='common']) {
    --disc: radial-gradient(circle, #3d4046 0 30%, #1d1f23 72%, #141518);
    --groove: 0.05;
    --sheen-img: var(--bowtie);
    --sheen-o: 0.2;
    --foil: linear-gradient(115deg, transparent 40%, rgb(255 255 255 / 0.5) 50%, transparent 60%);
    --foil-blend: soft-light;
    --foil-on: 0.5;
  }

  :global(.zc[data-rarity='uncommon']) {
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

  :global(.zc[data-rarity='rare']) {
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

  :global(.zc[data-rarity='epic']) {
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

  :global(.zc[data-rarity='legendary']) {
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

  :global(.zc[data-rarity='mythic']) {
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

  :global(.zc[data-rarity='legendary']) .zc-flakes,
  :global(.zc[data-rarity='mythic']) .zc-flakes {
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
</style>

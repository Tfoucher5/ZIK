<script>
  /** @type {{ entering: boolean }} */
  let { entering } = $props();
</script>

<section class="street" class:entering aria-hidden="true">
  <div class="neon">ZIK<small>Blind test club</small></div>
  <div class="doors">
    <div class="door l">
      <div class="hublot"></div>
      <div class="bar"></div>
      <div class="poster">
        <div class="p1">Blind test — ce soir</div>
        <div class="p2">Entrée libre · ELO en jeu</div>
      </div>
    </div>
    <div class="door r">
      <div class="hublot"></div>
      <div class="bar"></div>
      <div class="sticker">Complet chaque soir</div>
    </div>
  </div>
  <div class="doorlight"></div>
</section>

<style>
  .street {
    position: relative; overflow: hidden;
    background:
      radial-gradient(700px 400px at 30% 12%, rgb(var(--accent-rgb, 255 0 255) / 0.09), transparent 60%),
      linear-gradient(180deg, #0d0d0d 0%, #080808 100%);
    display: flex; align-items: flex-end; justify-content: center;
  }
  .street::before {
    content: ""; position: absolute; inset: 0; opacity: 0.35;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  .neon {
    position: absolute; top: 9%; left: 50%; transform: translate(-50%);
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
    font-size: clamp(70px, 9vw, 130px);
    letter-spacing: 0.1em; line-height: 1; color: var(--accent);
    text-shadow: 0 0 14px rgb(var(--accent-rgb) / 0.9), 0 0 50px rgb(var(--accent-rgb) / 0.55), 0 0 110px rgb(var(--accent-rgb) / 0.35);
    animation: neon-flicker 7s linear infinite;
    user-select: none;
  }
  .neon small {
    display: block; font-size: 0.16em; letter-spacing: 0.85em; color: #fafafa;
    text-shadow: 0 0 10px rgb(var(--c-glass) / 0.7); text-align: center; margin-top: 8px;
  }
  @keyframes neon-flicker {
    0%, 8.5%, 9.5%, 23%, 23.8%, 55%, 55.6%, 100% { opacity: 1; }
    9%, 23.4%, 55.3% { opacity: 0.35; }
    9.2% { opacity: 0.7; }
  }

  .doors {
    position: relative; width: min(420px, 60%); height: 62%;
    display: flex; perspective: 1400px;
    filter: drop-shadow(0 0 60px rgba(0, 0, 0, 0.8));
    animation: thump 1.9s ease-in-out infinite;
  }
  .doors::before {
    content: ""; position: absolute; inset: 0; z-index: -1;
    background:
      radial-gradient(60% 90% at 50% 100%, rgb(var(--accent-rgb) / 0.55), rgb(var(--accent-rgb) / 0.12) 60%, transparent),
      #16000f;
    opacity: 0; transition: opacity 1s ease 0.25s;
  }
  .entering .doors::before { opacity: 1; }
  @keyframes thump {
    0%, 100% { transform: scale(1); }
    12% { transform: scale(1.006); }
    24% { transform: scale(1); }
    36% { transform: scale(1.004); }
  }

  .door {
    flex: 1; position: relative;
    background: linear-gradient(170deg, #1a1a1a, #101010);
    border: 1px solid #262626; border-bottom: none;
    transition: transform 1.2s cubic-bezier(0.6, 0, 0.2, 1);
  }
  .door.l { border-radius: 6px 0 0 0; transform-origin: left center; }
  .door.r { border-radius: 0 6px 0 0; transform-origin: right center; }
  .entering .door.l { transform: rotateY(-72deg); }
  .entering .door.r { transform: rotateY(72deg); }
  .hublot {
    position: absolute; top: 14%; left: 50%; transform: translateX(-50%);
    width: 38%; aspect-ratio: 1; border-radius: 50%;
    background: radial-gradient(circle at 50% 42%, rgb(var(--accent-rgb) / 0.55), rgb(var(--accent-rgb) / 0.16) 52%, #0a0a0a 80%);
    border: 4px solid #262626;
    box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.65), 0 0 26px rgb(var(--accent-rgb) / 0.22);
    animation: hublot-pulse 1.9s ease-in-out infinite;
  }
  /* faisceau : la lumière du club traverse le hublot, orientée vers le bas/extérieur */
  .hublot::after {
    content: ""; position: absolute; top: 84%; left: 50%;
    width: 230%; height: 340%;
    background: linear-gradient(to bottom, rgb(var(--accent-rgb) / 0.16), transparent 72%);
    clip-path: polygon(38% 0, 62% 0, 100% 100%, 0 100%);
    pointer-events: none;
    filter: blur(4px);
    transform-origin: top center;
  }
  .door.l .hublot::after { transform: translateX(-50%) rotate(-9deg); }
  .door.r .hublot::after { transform: translateX(-50%) rotate(9deg); }
  @keyframes hublot-pulse {
    0%, 100% { box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.65), 0 0 20px rgb(var(--accent-rgb) / 0.18); }
    12% { box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.65), 0 0 42px rgb(var(--accent-rgb) / 0.5); }
    24% { box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.65), 0 0 24px rgb(var(--accent-rgb) / 0.24); }
    36% { box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.65), 0 0 36px rgb(var(--accent-rgb) / 0.4); }
  }
  .door .bar {
    position: absolute; top: 52%; left: 12%; right: 12%; height: 4.5%;
    background: linear-gradient(180deg, #3a3a3a, #222); border-radius: 6px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.6);
  }
  .poster {
    position: absolute; bottom: 13%; left: 14%; width: 72%;
    background: var(--accent); color: var(--on-accent); padding: 10px 12px 12px;
    transform: rotate(-3deg); border-radius: 2px;
    font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  }
  .poster .p1 { font-weight: 900; font-size: 1.05rem; letter-spacing: 0.04em; line-height: 1; }
  .poster .p2 { font-weight: 700; font-size: 0.56rem; letter-spacing: 0.22em; margin-top: 4px; }
  .sticker {
    position: absolute; bottom: 30%; right: 10%; transform: rotate(6deg);
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 0.72rem;
    letter-spacing: 0.2em; text-transform: uppercase; color: #fafafa;
    border: 2px solid rgb(var(--c-glass) / 0.5); border-radius: 3px; padding: 5px 9px; opacity: 0.75;
  }

  .doorlight {
    position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
    width: min(420px, 60%); height: 10px; border-radius: 50% 50% 0 0;
    background: var(--accent);
    animation: bass 1.9s ease-in-out infinite;
  }
  @keyframes bass {
    0%, 100% { opacity: 0.5; box-shadow: 0 -4px 24px 4px rgb(var(--accent-rgb) / 0.5), 0 -14px 60px 14px rgb(var(--accent-rgb) / 0.22); }
    12% { opacity: 1; box-shadow: 0 -6px 40px 10px rgb(var(--accent-rgb) / 0.85), 0 -26px 110px 30px rgb(var(--accent-rgb) / 0.4); }
    24% { opacity: 0.65; }
    36% { opacity: 0.95; box-shadow: 0 -6px 36px 9px rgb(var(--accent-rgb) / 0.75), 0 -22px 95px 26px rgb(var(--accent-rgb) / 0.35); }
  }

  @media (max-width: 920px) {
    .street { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .neon, .doorlight, .doors, .hublot { animation: none !important; }
    .door { transition: none !important; }
  }
  :global(.no-animations) .neon,
  :global(.no-animations) .doorlight,
  :global(.no-animations) .hublot,
  :global(.no-animations) .doors { animation: none !important; }
  :global(.no-animations) .door { transition: none !important; }
</style>

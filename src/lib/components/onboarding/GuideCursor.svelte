<script>
  /** @type {{ x: number, y: number, show: boolean, tap: boolean, press: boolean }} */
  let { x, y, show, tap, press } = $props();
</script>

<div class="gc" class:show class:tap class:press style="transform:translate({x}px, {y}px)" aria-hidden="true">
  <span class="gc-ripple"></span>
  <svg class="gc-arrow" viewBox="0 0 24 24" width="30" height="30">
    <path d="M4 2l15 11.5-6.6.9 3.9 7.4-3 1.6-3.9-7.5L4 20.5z" />
  </svg>
  <span class="gc-finger"></span>
</div>

<style>
  .gc {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1003;
    pointer-events: none;
    opacity: 0;
    transition:
      transform 0.9s cubic-bezier(0.65, 0, 0.35, 1),
      opacity 0.3s ease;
  }
  .gc.show {
    opacity: 1;
  }

  .gc-arrow {
    display: block;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.6));
    transform-origin: 4px 2px;
    transition: transform 0.12s ease;
  }
  .gc-arrow path {
    fill: #fff;
    stroke: #000;
    stroke-width: 1.4;
    stroke-linejoin: round;
  }
  .gc-finger {
    display: none;
    width: 34px;
    height: 34px;
    margin: -17px 0 0 -17px;
    border-radius: 50%;
    background: rgb(255 255 255 / 0.35);
    border: 2px solid #fff;
    box-shadow: 0 0 18px rgb(var(--accent-rgb) / 0.7);
    transition: transform 0.12s ease;
  }

  .gc-ripple {
    position: absolute;
    top: -22px;
    left: -22px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 3px solid var(--accent);
    opacity: 0;
  }

  .gc.tap .gc-arrow,
  .gc.tap .gc-finger {
    animation: gc-tap 1.6s ease-in-out infinite;
  }
  .gc.tap .gc-ripple {
    animation: gc-ripple 1.6s ease-out infinite;
  }
  .gc.press .gc-arrow,
  .gc.press .gc-finger {
    animation: none;
    transform: scale(0.78);
  }
  .gc.press .gc-ripple {
    animation: gc-ripple 0.5s ease-out;
  }

  @keyframes gc-tap {
    0%, 55%, 100% { transform: scale(1); }
    65% { transform: scale(0.78); }
  }
  @keyframes gc-ripple {
    0%, 60% { opacity: 0; transform: scale(0.3); }
    65% { opacity: 1; }
    100% { opacity: 0; transform: scale(1.4); }
  }

  @media (pointer: coarse) {
    .gc-arrow { display: none; }
    .gc-finger { display: block; }
  }
  @media (prefers-reduced-motion: reduce) {
    .gc { transition: opacity 0.3s ease; }
    .gc.tap .gc-arrow, .gc.tap .gc-finger, .gc.tap .gc-ripple { animation: none; }
  }
</style>

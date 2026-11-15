<script>
  import { buzzerAt, clock, BUZZER_CYCLE, BUZZER_STILL } from './demos.js';

  let t = $state(BUZZER_STILL);
  const s = $derived(buzzerAt(t));
</script>

<div class="bst" {@attach clock(BUZZER_CYCLE, BUZZER_STILL, (v) => (t = v))}>
  <div class="ph">
    <div class="phs">
      <div class="ptr"><span class="k">Manche <b>2</b> / 10</span><span class="k">Buzzer</span></div>
      <div class="phl">
        <div class="lay" class:on={s.lay === 0}>
          <div class="bz" class:press={s.press}>Buzz</div>
          <p class="hint">Buzze dès que tu sais</p>
        </div>
        <div class="lay" class:on={s.lay === 1}>
          <div class="big">À toi !</div>
          <p class="hint">Réponds à voix haute</p>
        </div>
        <div class="lay" class:on={s.lay === 2}>
          <div class="big ok">Bien joué !</div>
          <p class="hint">+3 points</p>
        </div>
      </div>
    </div>
  </div>
  <div class="rgt" class:on={s.regie}><span>Régie</span><b>Bonne réponse · Léa</b></div>
</div>

<style>
  .bst {
    position: relative;
    width: min(100%, 220px);
  }
  .phs {
    font-size: 8.2cqw;
  }
  .phl {
    position: relative;
    flex: 1;
    min-height: 0;
    display: grid;
  }
  .lay {
    justify-content: center;
    text-align: center;
  }
  .ok {
    color: var(--ok);
  }
  .bz {
    width: 82%;
    aspect-ratio: 1;
    margin: 0.4em auto 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: radial-gradient(circle at 35% 30%, #ff8af5, #ff00ff 50%, #8a0a8a);
    box-shadow:
      inset 0 -0.5em 1.2em rgba(0, 0, 0, 0.35),
      0 0.4em 0 #5a055a;
    font-family: var(--titre);
    font-weight: 900;
    font-size: 1.7em;
    text-transform: uppercase;
    color: #fff;
    transition:
      transform 0.12s,
      box-shadow 0.12s;
  }
  .bz.press {
    transform: translateY(0.3em) scale(0.95);
    box-shadow:
      inset 0 -0.3em 0.8em rgba(0, 0, 0, 0.35),
      0 0.1em 0 #5a055a;
  }
  .rgt {
    position: absolute;
    right: -34%;
    bottom: 18%;
    z-index: 3;
    display: grid;
    gap: 2px;
    padding: 8px 12px;
    border-radius: 12px;
    background: #15151c;
    border: 1px solid var(--line-2);
    box-shadow: 0 20px 40px -10px #000;
    font-size: 13px;
    opacity: 0;
    transform: translateY(10px);
    transition:
      opacity 0.3s,
      transform 0.3s;
  }
  .rgt.on {
    opacity: 1;
    transform: none;
  }
  .rgt span {
    font-family: var(--mono);
    font-size: 13px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .rgt b {
    font-family: var(--titre);
    text-transform: uppercase;
    color: var(--ok);
    font-size: 16px;
  }
  @media (min-width: 900px) {
    .bst {
      width: 190px;
    }
  }
</style>

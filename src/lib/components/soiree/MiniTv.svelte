<!-- Réplique miniature d'une manche sur la TV : en-tête, chrono, 4 choix -->
<script>
  let { code = '7F3K2Q', timer = 12, labels = null } = $props();
</script>

<div class="mtv" aria-hidden="true">
  <div class="mtv-top"><b>ZIK Soirée</b><span>{code}</span></div>
  <div class="mtv-timer">{timer}</div>
  <div class="mtv-choices" class:named={labels}>
    {#each labels ?? ['', '', '', ''] as l, i (i)}<i>{l}</i>{/each}
  </div>
</div>

<style>
  .mtv {
    padding: 12px;
    background: #000;
    border: 1px solid rgb(255 255 255 / 0.25);
  }
  .mtv-top {
    display: flex;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.15em;
    color: rgb(255 255 255 / 0.6);
  }
  .mtv-top b { color: #ff4fff; font-weight: 600; }
  .mtv-timer {
    color: #fff;
    margin: 4px 0 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 3.4rem;
    line-height: 1;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .mtv-choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }
  .mtv-choices i { height: 14px; border-radius: 2px; }
  .mtv-choices.named i {
    height: auto;
    padding: 8px 10px;
    font-style: normal;
    font-family: 'Barlow', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    color: #000;
  }
  .mtv-choices i:nth-child(1) { background: #ff4f9a; }
  .mtv-choices i:nth-child(2) { background: #5bc0eb; }
  .mtv-choices i:nth-child(3) { background: #f4e04d; }
  .mtv-choices i:nth-child(4) { background: #3ddc84; }
</style>

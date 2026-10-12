<script>
  // Platine-chrono : le disque tourne pendant la manche, l'anneau suit le temps
  let { spinning, timerPct, timerSecs, cover } = $props();

  const clock = $derived(
    timerSecs === null
      ? '--:--'
      : `${String(Math.floor(timerSecs / 60)).padStart(2, '0')}:${String(timerSecs % 60).padStart(2, '0')}`
  );
</script>

<div class="g-deck" class:spinning style="--t:{timerPct / 100}">
  <div class="g-deck-ring" class:warn={timerSecs !== null && timerPct < 30}></div>
  <div class="g-vinyl"></div>
  <div class="g-tonearm">
    <div class="g-tonearm-arm"><div class="g-tonearm-head"></div></div>
    <div class="g-tonearm-pivot"></div>
  </div>
  <div class="g-deck-label">
    {#if cover}
      <img class="g-deck-cover" src={cover} alt="Pochette">
    {:else if timerSecs !== null}
      <div class="g-deck-clock">
        <div class="t" class:warn={timerPct < 30}>{clock}</div>
        <div class="l">Restant</div>
      </div>
    {:else}
      <div class="g-deck-idle">ZIK<span>.</span></div>
    {/if}
  </div>
</div>

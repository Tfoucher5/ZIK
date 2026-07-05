<script>
  let { players = [], phase = 'lobby', answerMode = 'free' } = $props();

  function hue(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
  }
</script>

<!-- La fosse : les joueurs en personnages devant la scène.
     Bras levés + téléphone qui flashe quand ils ont répondu. -->
<div class="salon-crowd">
  {#if players.length === 0}
    <div class="salon-crowd-empty">
      {phase === 'gameover' ? 'Tout le monde est sur le podium ! 🎉' : 'La fosse est vide… scannez le QR pour entrer !'}
    </div>
  {:else}
    {#each players as p, i (p.username)}
      {@const active = p.answeredThisRound || p.foundThisRound}
      {@const inGame = phase === 'round' || phase === 'summary'}
      {@const h = hue(p.username)}
      <div
        class="crowd-p"
        class:hot={active && inGame}
        style="--h:{h};--d:{(i % 7) * 0.4}s;--sz:{0.88 + ((h + i) % 4) * 0.06}"
      >
        <span class="crowd-name">{p.username}</span>
        <span class="crowd-pts">{p.score ?? 0}<small>pt</small></span>
        <div class="crowd-fig">
          <i class="crowd-arm l"></i>
          <i class="crowd-arm r"></i>
          <i class="crowd-phone"></i>
          <i class="crowd-head"></i>
          <i class="crowd-torso"></i>
        </div>
        {#if inGame && answerMode === 'free'}
          <div class="salon-crowd-badges">
            <span class:ok={p.foundArtist}>A</span>
            {#if (p.totalFeatCount || 0) > 0}<span class:ok={(p.foundFeatCount || 0) > 0}>F</span>{/if}
            <span class:ok={p.foundTitle}>T</span>
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>

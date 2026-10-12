<script>
  let { player } = $props();
</script>

<div class="zk-volume">
  <button
    class="zk-vol-btn"
    onclick={() => player.toggleMute()}
    aria-label={player.muted || player.volume === 0 ? "Réactiver le son" : "Couper le son"}
  >
    {player.muted || player.volume === 0 ? "🔇" : player.volume < 0.45 ? "🔉" : "🔊"}
  </button>
  <input
    class="zk-vol-slider"
    type="range"
    min="0"
    max="1"
    step="0.05"
    value={player.volume}
    oninput={(e) => player.setVolume(Number(e.currentTarget.value))}
    aria-label="Volume"
    style="--fill: {(player.muted ? 0 : player.volume) * 100}%"
  />
  <span class="zk-vol-val">{Math.round((player.muted ? 0 : player.volume) * 100)}</span>
</div>

<style>
  .zk-volume {
    display: flex;
    align-items: center;
    gap: 10px;
    animation: zk-in 0.5s 0.5s ease both;
  }
  .zk-vol-btn {
    -webkit-appearance: none;
    appearance: none;
    background: none;
    border: none;
    padding: 0;
    font-size: 0.98rem;
    line-height: 1;
    cursor: pointer;
    filter: grayscale(1);
    opacity: 0.7;
    transition: opacity 0.15s;
  }
  .zk-vol-btn:hover {
    opacity: 1;
  }
  .zk-vol-slider {
    -webkit-appearance: none;
    appearance: none;
    flex: 1;
    height: 4px;
    border-radius: 0;
    background: linear-gradient(
      to right,
      var(--accent) 0 var(--fill),
      rgb(var(--c-glass) / 0.12) var(--fill) 100%
    );
    outline: none;
    cursor: pointer;
  }
  .zk-vol-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 13px;
    height: 13px;
    background: var(--text);
    border: none;
    cursor: pointer;
  }
  .zk-vol-slider::-moz-range-thumb {
    width: 13px;
    height: 13px;
    background: var(--text);
    border: none;
    border-radius: 0;
    cursor: pointer;
  }
  .zk-vol-slider:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
  .zk-vol-val {
    font-family: var(--zk-mono);
    font-size: 0.68rem;
    color: var(--dim);
    width: 22px;
    text-align: right;
  }
</style>

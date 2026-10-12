<script>
  import { onMount } from 'svelte';

  let volVal = $state(50);

  function changeVol(e) {
    volVal = parseInt(e.target.value);
    e.target.style.setProperty('--vol', volVal + '%');
    localStorage.setItem('zik_vol', volVal);
  }

  onMount(() => {
    volVal = parseInt(localStorage.getItem('zik_vol') ?? '50');
    const el = document.getElementById('pref-volume');
    if (el) el.style.setProperty('--vol', volVal + '%');
  });
</script>

<div class="settings-row">
  <div class="settings-row-info">
    <div class="settings-row-label">Volume par d&eacute;faut</div>
    <div class="settings-row-desc">Volume de la musique au d&eacute;marrage d&apos;une partie.</div>
  </div>
  <div class="settings-vol-wrap">
    <input id="pref-volume" type="range" min="0" max="100" step="5" value={volVal} oninput={changeVol}>
    <span class="settings-vol-val">{volVal}%</span>
  </div>
</div>

<style>
.settings-vol-wrap { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
#pref-volume {
  -webkit-appearance: none; appearance: none;
  width: 140px; height: 4px; cursor: pointer; border-radius: 99px;
  background: linear-gradient(to right, var(--accent) var(--vol, 50%), rgb(var(--c-glass) / 0.12) var(--vol, 50%));
  outline: none; border: none;
}
#pref-volume::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--accent); cursor: pointer;
  box-shadow: 0 0 6px rgb(var(--accent-rgb) / 0.5);
}
#pref-volume::-moz-range-thumb {
  width: 14px; height: 14px; border-radius: 50%;
  border: none; background: var(--accent); cursor: pointer;
}
.settings-vol-val { font-size: 0.82rem; font-weight: 600; color: var(--accent); min-width: 36px; text-align: right; }
</style>

<script>
  import { onMount } from 'svelte';
  import { THEMES, DEFAULT_THEME, getTheme, setTheme } from '$lib/client/theme.js';

  let animOn      = $state(true);
  let activeTheme = $state(DEFAULT_THEME);

  function pickTheme(t) {
    activeTheme = t;
    setTheme(t);
  }

  function toggleAnim(e) {
    animOn = e.target.checked;
    localStorage.setItem('zik_animations', animOn ? 'on' : 'off');
    document.documentElement.classList.toggle('no-animations', !animOn);
  }

  onMount(() => {
    animOn = localStorage.getItem('zik_animations') !== 'off';
    activeTheme = getTheme();
  });
</script>

<div class="settings-row settings-row-theme">
  <div class="settings-row-info">
    <div class="settings-row-label">Th&egrave;me</div>
    <div class="settings-row-desc">Choisis l&apos;apparence de l&apos;interface.</div>
  </div>
  <div class="theme-picker">
    {#each THEMES as theme (theme.id)}
      <button
        class="theme-swatch {activeTheme === theme.id ? 'active' : ''}"
        style="--swatch-bg:{theme.bg};--swatch-accent:{theme.accent}"
        onclick={() => pickTheme(theme.id)}
        aria-label="Th&egrave;me {theme.label}"
        aria-pressed={activeTheme === theme.id}
        title={theme.label}
      >
        <span class="swatch-preview">
          <span class="swatch-bar"></span>
          <span class="swatch-dot"></span>
        </span>
        <span class="swatch-label">{theme.label}</span>
      </button>
    {/each}
  </div>
</div>
<div class="settings-row">
  <div class="settings-row-info">
    <div class="settings-row-label">Animations</div>
    <div class="settings-row-desc">Active ou d&eacute;sactive les animations de l&apos;interface (cartes, scores, transitions). D&eacute;sactivez si vous ressentez des ralentissements.</div>
  </div>
  <label class="toggle-switch" aria-label="Activer les animations">
    <input type="checkbox" checked={animOn} onchange={toggleAnim}>
    <span class="toggle-track"><span class="toggle-thumb"></span></span>
  </label>
</div>

<style>
/* Doit l'emporter sur `.settings-section .settings-row` de SettingsSection */
:global(.settings-section) .settings-row.settings-row-theme { flex-direction: column; align-items: stretch; gap: 14px; }
.theme-picker { display: flex; gap: 10px; flex-shrink: 0; flex-wrap: wrap; }
.theme-swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: none;
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 8px;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
  font-family: inherit;
}
.theme-swatch:hover { border-color: var(--mid); transform: translateY(-2px); }
.theme-swatch.active { border-color: var(--accent); }
.swatch-preview {
  width: 52px; height: 36px; border-radius: 7px;
  background: var(--swatch-bg);
  position: relative; overflow: hidden;
  display: flex; align-items: flex-end; padding: 5px;
}
.swatch-bar {
  position: absolute; top: 0; left: 0; right: 0; height: 8px;
  background: var(--swatch-accent); opacity: 0.55;
}
.swatch-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--swatch-accent);
  box-shadow: 0 0 6px var(--swatch-accent);
  margin-left: auto;
}
.swatch-label { font-size: 0.72rem; font-weight: 600; color: var(--mid); letter-spacing: 0.3px; }
.theme-swatch.active .swatch-label { color: var(--accent); }

@media (max-width: 640px) {
  :global(.settings-section) .settings-row.settings-row-theme { gap: 12px; }
  .theme-picker { display: grid; grid-template-columns: repeat(3, 1fr); width: 100%; }
  .theme-swatch { min-width: 0; }
  .swatch-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
</style>

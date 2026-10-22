<script>
  /** Étape 1 : playlist choisie, avertissement « temporaire » et réglages de la partie. */
  let {
    playlist,
    tracks,
    rounds = $bindable(),
    duration = $bindable(),
    pause = $bindable(),
    error,
    saving,
    oncancel,
    oncreate,
  } = $props();
</script>

<div class="room-eph-pl">
  <span class="room-eph-pl-tile">{playlist.emoji}</span>
  <div class="room-eph-pl-info">
    <div class="room-eph-pl-name">{playlist.name}</div>
    <div class="room-eph-pl-meta">{tracks.length} titre{tracks.length !== 1 ? 's' : ''}</div>
  </div>
</div>

<div class="room-eph-notice">
  <span class="room-eph-icon">&#x1F4A1;</span>
  <div>Cette room est <strong>temporaire</strong> &mdash; elle disparaîtra automatiquement après 4h d&apos;inactivité.
    Pour créer une room permanente, <a href="/rooms" class="room-eph-link">rendez-vous sur la page Rooms</a>.</div>
</div>

<div class="room-settings">
  <div class="room-setting">
    <div class="room-setting-head">
      <span class="room-setting-label">Nombre de manches</span>
      <span class="room-setting-val">{rounds}</span>
    </div>
    <input type="range" bind:value={rounds} min="3" max={tracks.length} step="1"
      style="--p:{tracks.length > 3 ? ((rounds - 3) / (tracks.length - 3)) * 100 : 100}%">
  </div>
  <div class="room-setting">
    <div class="room-setting-head">
      <span class="room-setting-label">Durée d'une manche</span>
      <span class="room-setting-val">{duration}s</span>
    </div>
    <input type="range" bind:value={duration} min="10" max="60" step="5"
      style="--p:{((duration - 10) / 50) * 100}%">
  </div>
  <div class="room-setting">
    <div class="room-setting-head">
      <span class="room-setting-label">Pause entre titres</span>
      <span class="room-setting-val">{pause}s</span>
    </div>
    <input type="range" bind:value={pause} min="3" max="15" step="1"
      style="--p:{((pause - 3) / 12) * 100}%">
  </div>
</div>

{#if error}<div class="alert-err">{error}</div>{/if}

<div class="modal-footer">
  <button class="btn-ghost" onclick={oncancel}>Annuler</button>
  <button class="room-eph-create" onclick={oncreate} disabled={saving}>{saving ? 'Création…' : 'Créer la room →'}</button>
</div>

<style>
.modal-footer {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end;
}

.room-eph-pl {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgb(var(--c-glass) / 0.03);
  border: 1px solid var(--border);
  border-radius: 13px;
  margin-bottom: 12px;
}
.room-eph-pl-tile {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  background: rgb(var(--accent-rgb) / 0.1);
  border: 1px solid rgb(var(--accent-rgb) / 0.35);
}
.room-eph-pl-info {
  min-width: 0;
}
.room-eph-pl-name {
  font-weight: 700;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.room-eph-pl-meta {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--dim);
  margin-top: 2px;
}

.room-eph-notice {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: rgb(var(--accent-rgb) / 0.05);
  border: 1px solid rgb(var(--accent-rgb) / 0.18);
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 0.78rem;
  color: var(--mid);
  line-height: 1.5;
  margin-bottom: 18px;
}
.room-eph-icon {
  flex-shrink: 0;
  font-size: 1rem;
  margin-top: 1px;
}
.room-eph-link {
  color: var(--accent);
  text-decoration: underline;
}

.room-settings {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin: 0 0 20px;
}
.room-setting-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 9px;
}
.room-setting-label {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 800;
  font-size: 0.88rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.room-setting-val {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--accent);
  background: rgb(var(--accent-rgb) / 0.08);
  border: 1px solid rgb(var(--accent-rgb) / 0.3);
  border-radius: 7px;
  padding: 2px 9px;
}
.room-setting input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
  cursor: pointer;
  background: transparent;
  outline: none;
  border: none;
}
.room-setting input[type="range"]::-webkit-slider-runnable-track {
  height: 5px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--accent) var(--p, 50%),
    rgb(var(--c-glass) / 0.1) var(--p, 50%)
  );
}
.room-setting input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 17px;
  height: 17px;
  margin-top: -6px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid var(--accent);
  box-shadow: 0 0 12px rgb(var(--accent-rgb) / 0.7);
}
.room-setting input[type="range"]::-moz-range-track {
  height: 5px;
  border-radius: 999px;
  background: rgb(var(--c-glass) / 0.1);
}
.room-setting input[type="range"]::-moz-range-progress {
  height: 5px;
  border-radius: 999px;
  background: var(--accent);
}
.room-setting input[type="range"]::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid var(--accent);
  box-shadow: 0 0 12px rgb(var(--accent-rgb) / 0.7);
}
</style>

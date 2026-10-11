<script>
  import { toast } from '$lib/toast.svelte.js';

  let { open, playlist, tracks, user, onClose } = $props();

  let rsOpen = $state(false);
  let rsRounds = $state(10);
  let rsDuration = $state(30);
  let rsBreak = $state(7);
  let rsError = $state('');
  let rsSaving = $state(false);
  let rcOpen = $state(false);
  let rcCode = $state('');

  $effect(() => {
    if (!open) return;
    rsRounds = Math.min(10, tracks.length);
    rsDuration = 30; rsBreak = 7; rsError = '';
    rcOpen = false;
    rsOpen = true;
  });

  $effect(() => { if (open && !rsOpen && !rcOpen) onClose(); });

  async function createRoom() {
    rsSaving = true; rsError = '';
    try {
      const r = await fetch('/api/rooms/custom', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playlist.name, emoji: playlist.emoji, tracks,
          maxRounds: rsRounds, roundDuration: rsDuration, breakDuration: rsBreak,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      rcCode = data.code; rcOpen = true; rsOpen = false;
    } catch (e) { rsError = e.message; }
    rsSaving = false;
  }

  function joinRoomNow() {
    const username = user?.profile?.username || user?.email?.split('@')[0] || 'Joueur';
    const uid = user?.id || '';
    const p = new URLSearchParams({ roomId: rcCode, username, userId: uid, isGuest: uid ? '0' : '1' });
    window.location.href = `/game?${p}`;
  }

  function copyLink() {
    const url = `${location.origin}/game?roomId=${rcCode}`;
    navigator.clipboard.writeText(url).then(() => toast('Lien copié !', 'success')).catch(() => toast('Copie échouée', 'error'));
  }
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') { rsOpen = false; rcOpen = false; } }} />

{#if rsOpen}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" role="dialog" aria-modal="true" onclick={e => { if (e.target === e.currentTarget) rsOpen = false; }}>
  <div class="modal modal-lg modal-eph">
    <button class="close-btn" onclick={() => rsOpen = false}>&#x2715;</button>

    <div class="room-eph-header">
      <div class="room-eph-ico">&#x26A1;</div>
      <div>
        <div class="room-eph-kicker">Room éphémère</div>
        <h2 class="room-eph-title">Lancer une room</h2>
      </div>
    </div>

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
          <span class="room-setting-val">{rsRounds}</span>
        </div>
        <input type="range" bind:value={rsRounds} min="3" max={tracks.length} step="1"
          style="--p:{tracks.length > 3 ? ((rsRounds - 3) / (tracks.length - 3)) * 100 : 100}%">
      </div>
      <div class="room-setting">
        <div class="room-setting-head">
          <span class="room-setting-label">Durée d'une manche</span>
          <span class="room-setting-val">{rsDuration}s</span>
        </div>
        <input type="range" bind:value={rsDuration} min="10" max="60" step="5"
          style="--p:{((rsDuration - 10) / 50) * 100}%">
      </div>
      <div class="room-setting">
        <div class="room-setting-head">
          <span class="room-setting-label">Pause entre titres</span>
          <span class="room-setting-val">{rsBreak}s</span>
        </div>
        <input type="range" bind:value={rsBreak} min="3" max="15" step="1"
          style="--p:{((rsBreak - 3) / 12) * 100}%">
      </div>
    </div>

    {#if rsError}<div class="alert-err">{rsError}</div>{/if}

    <div class="modal-footer">
      <button class="btn-ghost" onclick={() => rsOpen = false}>Annuler</button>
      <button class="room-eph-create" onclick={createRoom} disabled={rsSaving}>{rsSaving ? 'Création…' : 'Créer la room →'}</button>
    </div>
  </div>
</div>
{/if}

{#if rcOpen}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" role="dialog" aria-modal="true" onclick={e => { if (e.target === e.currentTarget) rcOpen = false; }}>
  <div class="modal modal-lg modal-eph">
    <button class="close-btn" onclick={() => rcOpen = false}>&#x2715;</button>

    <div class="room-eph-header">
      <div class="room-eph-ico is-ok">&#x2713;</div>
      <div>
        <div class="room-eph-kicker is-ok">Room créée</div>
        <h2 class="room-eph-title">C'est prêt !</h2>
      </div>
    </div>
    <p class="mdesc">Partage ce code à tes amis pour qu'ils rejoignent la room.</p>

    <div class="room-code-box">
      <div class="room-code-label">Code de la room</div>
      <div class="room-code">
        {#each rcCode.split('') as ch, i (i)}<b>{ch}</b>{/each}
      </div>
      <div class="room-share-url">{typeof window !== 'undefined' ? `${window.location.origin}/game?roomId=${rcCode}` : ''}</div>
      <div class="room-code-actions">
        <button class="btn-ghost sm" onclick={copyLink}>Copier le lien</button>
        <button class="room-eph-create" onclick={joinRoomNow}>Rejoindre maintenant &rarr;</button>
      </div>
    </div>
  </div>
</div>
{/if}

<style>
.modal-lg { max-width: 620px; }
.modal-footer {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: flex-end;
}
/* ── Room launch modal — identité v3 (verre + liseré) ────────────────────────── */
.modal-eph {
  border-radius: 20px;
  background: color-mix(in srgb, var(--bg2) 88%, transparent);
  backdrop-filter: blur(22px) saturate(1.35);
  -webkit-backdrop-filter: blur(22px) saturate(1.35);
  border: 1px solid var(--border);
  box-shadow:
    0 30px 90px rgba(0, 0, 0, 0.65),
    inset 0 1px 0 rgb(var(--c-glass) / 0.06);
  overflow: hidden;
}
.modal-eph::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgb(var(--accent-rgb) / 0.8), transparent);
  opacity: 0.7;
}

.room-eph-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  padding-right: 28px;
}
.room-eph-ico {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.35);
  box-shadow: 0 0 24px rgba(251, 191, 36, 0.14);
  color: var(--gold);
}
.room-eph-ico.is-ok {
  background: rgba(74, 222, 128, 0.1);
  border-color: rgba(74, 222, 128, 0.4);
  box-shadow: 0 0 24px rgba(74, 222, 128, 0.18);
  color: var(--success);
}
.room-eph-kicker {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 4px;
}
.room-eph-kicker.is-ok {
  color: var(--success);
}
.room-eph-title {
  margin-bottom: 0 !important;
  line-height: 1.05;
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

.room-eph-create {
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 900;
  font-size: 0.92rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--on-accent);
  border: none;
  cursor: pointer;
  background: linear-gradient(120deg, var(--accent), var(--accent2));
  padding: 12px 26px;
  border-radius: 12px;
  box-shadow: 0 6px 22px rgb(var(--accent-rgb) / 0.35);
  transition:
    transform 0.12s,
    box-shadow 0.15s;
}
.room-eph-create:hover {
  transform: translateY(-1px);
  box-shadow: 0 9px 30px rgb(var(--accent-rgb) / 0.5);
}
.room-eph-create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.room-code-box {
  text-align: center;
  padding: 14px 0 4px;
}
.room-code-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--mid);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  margin-bottom: 14px;
}
.room-code-label::before,
.room-code-label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--border);
}
.room-code {
  display: flex;
  gap: 7px;
  justify-content: center;
  margin-bottom: 16px;
}
.room-code b {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-weight: 700;
  font-size: 1.7rem;
  width: 46px;
  height: 58px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--accent-rgb) / 0.08);
  border: 1px solid rgb(var(--accent-rgb) / 0.45);
  border-radius: 12px;
  color: var(--accent);
  text-shadow: 0 0 16px rgb(var(--accent-rgb) / 0.7);
  box-shadow: 0 0 20px rgb(var(--accent-rgb) / 0.1);
}
.room-share-url {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.68rem;
  color: var(--dim);
  word-break: break-all;
  background: rgb(var(--c-glass) / 0.04);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 9px 12px;
  margin-bottom: 16px;
}
.room-code-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

</style>

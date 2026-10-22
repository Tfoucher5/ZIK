<script>
  /** Cadre des fenêtres « room éphémère » : verre, liseré et en-tête icône + titre. */
  let { icon, kicker, title, ok = false, onclose, children } = $props();
</script>

<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" role="dialog" aria-modal="true" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
  <div class="modal modal-lg modal-eph">
    <button class="close-btn" onclick={onclose}>&#x2715;</button>

    <div class="room-eph-header">
      <div class="room-eph-ico" class:is-ok={ok}>{icon}</div>
      <div>
        <div class="room-eph-kicker" class:is-ok={ok}>{kicker}</div>
        <h2 class="room-eph-title">{title}</h2>
      </div>
    </div>

    {@render children()}
  </div>
</div>

<style>
.modal-lg { max-width: 620px; }
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

/* Bouton principal, partagé par les deux étapes */
.modal-eph :global(.room-eph-create) {
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
.modal-eph :global(.room-eph-create:hover) {
  transform: translateY(-1px);
  box-shadow: 0 9px 30px rgb(var(--accent-rgb) / 0.5);
}
.modal-eph :global(.room-eph-create:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>

<script>
  let { title, id = undefined, danger = false, children } = $props();
</script>

<section class="settings-section" class:settings-section-danger={danger} {id}>
  <h2 class="settings-section-title" class:danger-title={danger}>{title}</h2>
  {@render children()}
</section>

<style>
.settings-section {
  margin-bottom: 24px;
  background: rgb(var(--c-glass) / 0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  position: relative;
}
.settings-section::before {
  content: "";
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgb(var(--c-glass) / 0.08), transparent);
  pointer-events: none;
}
.settings-section-title {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--dim);
  padding: 14px 20px 10px;
  border-bottom: 1px solid var(--border);
}
.settings-section :global(.settings-row) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.settings-section :global(.settings-row:last-child) { border-bottom: none; }
.settings-section :global(.settings-row-info) { flex: 1; min-width: 0; }
.settings-section :global(.settings-row-label) { font-size: 0.88rem; font-weight: 500; margin-bottom: 2px; }
.settings-section :global(.settings-row-desc) { font-size: 0.82rem; color: var(--mid); line-height: 1.45; }

/* -- Toggle switch -- */
.settings-section :global(.toggle-switch) { position: relative; display: inline-block; flex-shrink: 0; cursor: pointer; }
.settings-section :global(.toggle-switch input) { position: absolute; opacity: 0; width: 0; height: 0; }
.settings-section :global(.toggle-track) {
  display: block; width: 44px; height: 24px;
  background: rgb(var(--c-glass) / 0.12);
  border-radius: 99px; transition: background 0.2s; position: relative;
}
.settings-section :global(.toggle-switch input:checked + .toggle-track) { background: var(--accent); }
.settings-section :global(.toggle-thumb) {
  position: absolute; top: 3px; left: 3px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; transition: transform 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}
.settings-section :global(.toggle-switch input:checked + .toggle-track .toggle-thumb) { transform: translateX(20px); }

/* Bouton secondaire partagé par plusieurs sections */
.settings-section :global(.btn-unlink) {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid var(--clr-border, rgb(var(--c-glass) / 0.12));
  color: var(--text);
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}
.settings-section :global(.btn-unlink:hover:not(:disabled)) { background: rgb(var(--c-glass) / 0.08); }
.settings-section :global(.btn-unlink:disabled) { opacity: 0.6; cursor: not-allowed; }
.settings-section :global(a.btn-unlink) { text-decoration: none; white-space: nowrap; }

/* -- Danger zone -- */
.settings-section-danger { border-color: rgba(239,68,68,0.35); }
.settings-section-danger .danger-title { color: var(--danger); border-bottom-color: rgba(239,68,68,0.2); }

@media (max-width: 640px) {
  .settings-section :global(.settings-row) { flex-wrap: wrap; gap: 12px; }
}
</style>

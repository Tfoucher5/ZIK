<script>
  import ReportButton from './ReportButton.svelte';

  let { onclose } = $props();
</script>

<div class="rm-success">
  <div class="rm-success-icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path class="rm-check" d="M4 12.5 9.5 18 20 6.5"/>
    </svg>
  </div>
  <h2>Signalement envoyé</h2>
  <p>Merci ! Un modérateur va examiner ça rapidement.</p>
  <ReportButton onclick={onclose} compact>Fermer</ReportButton>
</div>

<style>
.rm-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 14px 0 4px;
}
.rm-success-icon {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(74, 222, 128, 0.12);
  border: 2px solid rgba(74, 222, 128, 0.45);
  box-shadow: 0 0 34px rgba(74, 222, 128, 0.3);
  color: var(--success, #4ade80);
  margin-bottom: 8px;
  animation: rm-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.rm-success-icon svg { width: 30px; height: 30px; }
.rm-check {
  stroke-dasharray: 30;
  stroke-dashoffset: 30;
  animation: rm-draw 0.4s ease 0.15s forwards;
}
@keyframes rm-pop {
  from { opacity: 0; transform: scale(0.5); }
}
@keyframes rm-draw {
  to { stroke-dashoffset: 0; }
}
.rm-success h2 {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 1.35rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.rm-success p { color: var(--mid, #8896aa); font-size: 0.85rem; }
</style>

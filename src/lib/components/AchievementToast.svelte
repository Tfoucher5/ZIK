<script>
  let { items = [], onConsume } = $props();

  const current = $derived(items[0] || null);

  const TIER_LABELS = { bronze: 'Bronze', silver: 'Argent', gold: 'Or' };
  const RARITY_LABELS = { common: 'Commun', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire' };

  $effect(() => {
    if (!current) return;
    const t = setTimeout(() => onConsume?.(), 4200);
    return () => clearTimeout(t);
  });
</script>

{#if current}
  <div class="ach-toast ach-toast--{current.rarity}" role="status">
    <span class="ach-toast-icon">{current.icon}</span>
    <div class="ach-toast-body">
      <span class="ach-toast-label">Succès débloqué !</span>
      <span class="ach-toast-name">
        {current.name}
        {#if current.tier}
          <span class="ach-toast-tier ach-toast-tier--{current.tier}">{TIER_LABELS[current.tier]}</span>
        {/if}
      </span>
    </div>
    <span class="ach-toast-rarity">{RARITY_LABELS[current.rarity] || current.rarity}</span>
  </div>
{/if}

<style>
.ach-toast {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-radius: 14px;
  background: rgba(17, 17, 27, 0.95);
  border: 1px solid rgba(124, 58, 237, 0.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  animation: ach-slide-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2);
  max-width: min(92vw, 420px);
}

@keyframes ach-slide-in {
  from { transform: translate(-50%, -120%); opacity: 0; }
  to   { transform: translate(-50%, 0); opacity: 1; }
}

.ach-toast--rare      { border-color: rgba(37, 99, 235, 0.6); }
.ach-toast--epic      { border-color: rgba(168, 85, 247, 0.7); }
.ach-toast--legendary {
  border-color: rgba(250, 204, 21, 0.7);
  box-shadow: 0 8px 32px rgba(250, 204, 21, 0.18);
}

.ach-toast-icon { font-size: 1.8rem; line-height: 1; }

.ach-toast-body { display: flex; flex-direction: column; min-width: 0; }

.ach-toast-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #a78bfa;
  font-weight: 700;
}

.ach-toast-name {
  color: #fff;
  font-weight: 700;
  font-size: 0.98rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ach-toast-tier {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 1px 8px;
  border-radius: 999px;
  text-transform: uppercase;
}
.ach-toast-tier--bronze { background: rgba(180, 100, 50, 0.25); color: #e8a97a; }
.ach-toast-tier--silver { background: rgba(190, 195, 205, 0.22); color: #d8dde6; }
.ach-toast-tier--gold   { background: rgba(250, 204, 21, 0.22); color: #fde68a; }

.ach-toast-rarity {
  font-size: 0.7rem;
  font-weight: 700;
  color: #9ca3af;
  white-space: nowrap;
}
.ach-toast--rare .ach-toast-rarity      { color: #93c5fd; }
.ach-toast--epic .ach-toast-rarity      { color: #d8b4fe; }
.ach-toast--legendary .ach-toast-rarity { color: #fde68a; }
</style>

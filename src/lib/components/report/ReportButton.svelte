<script>
  let { onclick, disabled = false, compact = false, children } = $props();
</script>

<button class="rm-btn" class:compact {onclick} {disabled}>{@render children()}</button>

<style>
.rm-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, var(--accent, #ff00ff), var(--accent2, #cc00cc));
  color: var(--on-accent);
  border: none;
  border-radius: 12px;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 900;
  font-size: 0.95rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 6px 22px rgb(var(--accent-rgb, 255 0 255) / 0.3);
  transition: box-shadow 0.15s, transform 0.12s;
}
.rm-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgb(var(--accent-rgb, 255 0 255) / 0.45);
}
.rm-btn:active { transform: translateY(0); }
.rm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.rm-btn.compact { width: auto; padding: 12px 30px; margin-top: 10px; }
</style>

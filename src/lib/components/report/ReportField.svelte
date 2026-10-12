<script>
  let { label, forId = null, required = false, children } = $props();
</script>

<div class="rm-field">
  {#if forId}
    <label class="rm-label" for={forId}>
      {label} {#if required}<span class="rm-req">*</span>{/if}
    </label>
  {:else}
    <span class="rm-label">{label}</span>
  {/if}
  {@render children()}
</div>

<style>
.rm-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  position: relative;
}
.rm-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mid, #8896aa);
}
.rm-label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--border, rgb(var(--c-glass) / 0.1));
}
.rm-req { color: var(--accent, #ff00ff); }
</style>

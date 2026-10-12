<script>
  /**
   * @type {{
   *   children: import('svelte').Snippet, onclick?: () => void, href?: string,
   *   disabled?: boolean, ghost?: boolean, block?: boolean
   * }}
   */
  let { children, onclick, href, disabled = false, ghost = false, block = false } = $props();
</script>

{#if href}
  <a class="submit block" class:ghost {href}>{@render children()}</a>
{:else}
  <button class="submit" class:ghost class:block {onclick} {disabled}>{@render children()}</button>
{/if}

<style>
  .submit {
    width: 100%; font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.05rem;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--on-accent); background: var(--accent);
    border: none; border-radius: var(--r, 5px); padding: 13px; cursor: pointer;
    box-shadow: 0 0 26px rgb(var(--accent-rgb) / 0.35); transition: transform 0.15s;
  }
  .submit:hover:not(:disabled) { transform: translateY(-2px); }
  .submit:disabled { opacity: 0.75; cursor: default; }
  .submit.ghost { background: none; color: var(--text); border: 1px solid var(--border2); box-shadow: none; margin-top: 16px; }
  .submit.ghost:hover { border-color: var(--accent); color: var(--accent); }
  .block { display: block; text-align: center; text-decoration: none; }
</style>

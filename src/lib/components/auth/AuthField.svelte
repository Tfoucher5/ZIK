<script>
  /**
   * @type {{
   *   id: string, label: string, value: string,
   *   type?: string, placeholder?: string, autocomplete?: any, maxlength?: number,
   *   toggle?: boolean, show?: boolean, onEnter?: () => void
   * }}
   */
  let {
    id, label, value = $bindable(), type = 'text', placeholder, autocomplete, maxlength,
    toggle = false, show = $bindable(false), onEnter,
  } = $props();

  function onkeypress(e) { if (e.key === 'Enter') onEnter?.(); }
</script>

<div class="field">
  <label for={id}>{label}</label>
  {#if toggle}
    <div class="pwd-wrap">
      <input {id} type={show ? 'text' : 'password'} bind:value {placeholder} {autocomplete} {onkeypress} />
      <button type="button" class="pwd-eye" onclick={() => show = !show} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
        {#if show}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><circle cx="12" cy="12" r="3"/></svg>
        {:else}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        {/if}
      </button>
    </div>
  {:else}
    <input {id} {type} bind:value {placeholder} {autocomplete} {maxlength} {onkeypress} />
  {/if}
</div>

<style>
  .field { margin-bottom: 12px; }
  .field label {
    display: block; font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
    font-size: 0.62rem; letter-spacing: 0.26em; text-transform: uppercase;
    color: var(--mid); margin-bottom: 5px;
  }
  .field input {
    width: 100%; background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r, 5px); color: var(--text); font-size: 0.92rem; padding: 10px 12px;
    outline: none; transition: border-color 0.15s; font-family: 'Barlow', sans-serif;
  }
  .field input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.12); }
  .pwd-wrap { position: relative; display: flex; align-items: center; }
  .pwd-wrap input { width: 100%; padding-right: 42px; }
  .pwd-eye {
    position: absolute; right: 6px; background: none; border: none; cursor: pointer;
    color: var(--dim); padding: 6px; display: flex; align-items: center;
    transition: color 0.15s;
  }
  .pwd-eye:hover { color: var(--accent); }
</style>

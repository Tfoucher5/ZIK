<script>
  let {
    codeInput = $bindable(''),
    usernameInput = $bindable(''),
    joinError = '',
    joining = false,
    resume = null,
    onForget,
    onJoin,
  } = $props();
</script>

<main class="sp sp-join">
{#if resume}
  <div>
    <p class="sx-kicker"><b>●</b> ZIK Salon {resume.code}</p>
    <h1>Re-bonjour<br><em>{resume.username}.</em></h1>
  </div>
  <p class="sp-resume">Reprends ta place dans la partie.</p>
  {#if joinError}<p class="sp-error">{joinError}</p>{/if}
  <button class="sx-btn sx-btn-primary sx-btn-lg" onclick={onJoin} disabled={joining}>
    {joining ? 'Connexion…' : 'Reprendre ma place'}
  </button>
  <button class="salon-join-link" onclick={onForget}>Ce n'est pas moi</button>
{:else}
  <div>
    <p class="sx-kicker"><b>●</b> ZIK Salon</p>
    <h1>Entre dans<br><em>la partie.</em></h1>
  </div>
  <label class="sp-field">
    <span class="sx-kicker">Code affiché sur la TV</span>
    <input
      class="sp-code-input"
      type="text"
      bind:value={codeInput}
      placeholder="······"
      autocapitalize="characters"
      enterkeyhint="next"
      maxlength="6"
      autocomplete="off"
      spellcheck="false"
      oninput={e => { codeInput = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); }}
      onkeydown={e => { if (e.key === 'Enter') { if (usernameInput.trim()) onJoin(); else document.getElementById('sp-username')?.focus(); } }}
    >
  </label>
  <label class="sp-field">
    <span class="sx-kicker">Ton pseudo</span>
    <input
      type="text"
      id="sp-username"
      bind:value={usernameInput}
      placeholder="Ex. : Julie"
      enterkeyhint="go"
      maxlength="20"
      autocomplete="off"
      onkeydown={e => { if (e.key === 'Enter') onJoin(); }}
    >
  </label>
  {#if joinError}<p class="sp-error">{joinError}</p>{/if}
  <button class="sx-btn sx-btn-primary sx-btn-lg" onclick={onJoin} disabled={joining}>
    {joining ? 'Connexion…' : 'Rejoindre'}
  </button>
{/if}
</main>

<style>
  .sp-resume {
    margin: 0;
    color: var(--mid);
  }
</style>

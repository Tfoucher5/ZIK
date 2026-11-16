<script>
  import QrScanner from './QrScanner.svelte';

  let {
    codeInput = $bindable(''),
    usernameInput = $bindable(''),
    joinError = '',
    joining = false,
    resume = null,
    nameTaken = null,
    reclaimPending = false,
    onForget,
    onJoin,
    onReclaim,
    onChangeName,
    codeKnown = false,
  } = $props();

  // Code lu dans le QR ou tapé dans le bandeau : affiché en tuiles, un seul champ à remplir
  let editCode = $state(false);
  const tiles = $derived(codeKnown && !editCode && codeInput.length === 6);

  function changeCode() {
    editCode = true;
    setTimeout(() => document.querySelector('.sp-code-input')?.focus());
  }
</script>

<main class="sp sp-join">
{#if nameTaken}
  <div>
    <p class="sx-kicker"><b>●</b> ZIK Soirée</p>
    <h1>{nameTaken},<br><em>c'est toi ?</em></h1>
  </div>
  {#if reclaimPending}
    <p class="sp-resume" role="status">L'hôte doit confirmer sur la régie. Ta place et tes points t'attendent.</p>
  {:else}
    <p class="sp-resume">Ce pseudo joue déjà dans la soirée. Si c'est toi sur un autre téléphone ou un autre navigateur, demande à l'hôte de te rendre ta place.</p>
    <button class="sx-btn sx-btn-primary sx-btn-lg" onclick={onReclaim}>Demander ma place à l'hôte</button>
  {/if}
  <button class="salon-join-link" onclick={onChangeName}>Ce n'est pas moi, changer de pseudo</button>
{:else if resume}
  <div>
    <p class="sx-kicker"><b>●</b> ZIK Soirée {resume.code}</p>
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
    <p class="sx-kicker"><b>●</b> ZIK Soirée</p>
    <h1>Entre dans<br><em>la partie.</em></h1>
  </div>
  {#if tiles}
  <div class="sp-code-tiles">
    <span class="sx-kicker">Code</span>
    <span class="sp-tuiles" aria-label="Code {codeInput}">{#each [...codeInput] as c, i (i)}<b>{c}</b>{/each}</span>
    <button class="salon-join-link" onclick={changeCode}>Changer</button>
  </div>
  {:else}
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
  <QrScanner onCode={(code) => { codeInput = code; document.getElementById('sp-username')?.focus(); }} />
  {/if}
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
  <p class="sp-hint">Sans appli, sans compte.</p>
  <ol class="sp-frise" style="--p:.33"><li class="on">Pseudo</li><li>Équipe</li><li>La TV</li></ol>
{/if}
</main>

<style>
  .sp-resume {
    margin: 0;
    color: var(--mid);
  }
  .sp-code-tiles {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .sp-code-tiles button {
    margin-left: auto;
    min-height: 44px;
    font-size: 0.95rem;
    color: var(--text);
  }
  .sp-tuiles {
    display: flex;
    gap: 0.16em;
    font-family: var(--s-mono);
    font-weight: 700;
    font-size: 1.25rem;
  }
  .sp-tuiles b {
    display: grid;
    place-items: center;
    width: 1.22em;
    height: 1.5em;
    border-radius: 0.14em;
    background: rgb(255 255 255 / 0.09);
    border-bottom: 0.06em solid rgb(255 255 255 / 0.45);
  }
  .sp-hint {
    margin-top: -14px;
  }
</style>

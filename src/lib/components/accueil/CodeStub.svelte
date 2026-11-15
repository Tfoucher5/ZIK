<!-- Un seul champ pour les deux codes : soirée ou room en ligne -->
<script>
  import { goto } from '$app/navigation';
  import GuestModal from '$lib/components/auth/GuestModal.svelte';
  import { HomeState } from '$lib/components/home/home.svelte.js';
  import { cleanCode, joinCode, CODE_AIDE } from './code.js';

  const home = new HomeState({});
  let code = $state('');
  let err = $state('');
  let busy = $state(false);

  async function submit(e) {
    e.preventDefault();
    busy = true;
    err = await joinCode(code, { joinRoom: home.joinRoom, goto });
    busy = false;
  }
</script>

<form class="cs" onsubmit={submit} novalidate>
  <div class="cs-stub" aria-hidden="true">ZIK</div>
  <div class="cs-main">
    <label class="cs-label" for="cs-code">J'ai un code</label>
    <div class="cs-row">
      <div class="cs-field">
        <div class="cs-cases" aria-hidden="true">
          {#each [0, 1, 2, 3, 4, 5] as i (i)}<b class:cur={i === code.length}>{code[i] ?? ''}</b>{/each}
        </div>
        <input
          id="cs-code"
          bind:value={code}
          oninput={() => { code = cleanCode(code); err = ''; }}
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          aria-describedby="cs-aide"
          aria-invalid={err ? 'true' : undefined}
        />
      </div>
      <button class="cs-go" disabled={busy}>{busy ? '…' : 'Rejoindre'}</button>
    </div>
    <p id="cs-aide" class="cs-aide" class:cs-err={err} aria-live="polite">
      {err || CODE_AIDE}
    </p>
  </div>
</form>

<GuestModal open={home.guestOpen} onClose={() => (home.guestOpen = false)} onConfirm={home.confirmGuest} />

<style>
  .cs {
    display: flex;
    background: var(--bg2);
    border: 2px solid var(--text);
    color: var(--text);
  }
  .cs-stub {
    display: grid;
    place-items: center;
    padding: 0 14px;
    border-right: 2px dashed rgb(var(--c-glass) / 0.3);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.6rem;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }
  .cs-main { flex: 1; min-width: 0; padding: 14px 18px; }
  .cs-label {
    display: block;
    margin-bottom: 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .cs-row { display: flex; gap: 10px; align-items: stretch; }
  .cs-field { position: relative; flex: 1; min-width: 0; }
  .cs-cases { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; height: 100%; }
  .cs-cases b {
    display: grid;
    place-items: center;
    min-height: 48px;
    border: 1px solid rgb(var(--c-glass) / 0.25);
    background: var(--bg);
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.4rem;
    font-weight: 700;
  }
  .cs-field:focus-within .cs-cases b.cur { border: 2px solid var(--text); }
  .cs-field input {
    position: absolute;
    inset: 0;
    width: 100%;
    border: 0;
    background: transparent;
    color: transparent;
    caret-color: transparent;
    font-size: 16px;
    outline: none;
  }
  .cs-field input::selection { background: transparent; }
  .cs-field:focus-within { outline: 2px solid var(--text); outline-offset: 3px; }
  .cs-go {
    min-height: 48px;
    padding: 0 22px;
    border: 0;
    background: var(--accent);
    color: var(--on-accent);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 1.05rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
  }
  .cs-go:disabled { opacity: 0.6; cursor: wait; }
  .cs-go:focus-visible { outline: 2px solid var(--text); outline-offset: 3px; }
  .cs-aide { margin: 8px 0 0; font-size: 0.8rem; color: var(--mid); }
  .cs-err { color: var(--danger); font-weight: 600; }

  @media (max-width: 520px) {
    .cs-stub { display: none; }
    .cs-row { flex-direction: column; }
    .cs-cases b { font-size: 1.2rem; }
  }
</style>

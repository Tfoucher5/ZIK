<!-- Digicode du bandeau : un seul champ pour les deux codes, soirée ou room en ligne -->
<script>
  import { goto } from '$app/navigation';
  import GuestModal from '$lib/components/auth/GuestModal.svelte';
  import { HomeState } from '$lib/components/home/home.svelte.js';
  import { cleanCode, codeTarget } from '$lib/components/accueil/code.js';

  let { open = $bindable(false) } = $props();

  const AIDE = "Le code de 6 caractères affiché sur la TV de la soirée, ou celui qu'on t'a envoyé pour une partie en ligne.";
  const home = new HomeState({});
  let dlg;
  let input;
  let code = $state('');
  let err = $state('');
  let busy = $state(false);

  $effect(() => {
    if (open && !dlg.open) {
      dlg.showModal();
      input.focus();
    } else if (!open && dlg.open) dlg.close();
  });

  async function submit(e) {
    e.preventDefault();
    if (code.length !== 6) {
      err = 'Le code fait 6 caractères. Recopie-le depuis la TV ou le message reçu.';
      input.focus();
      return;
    }
    busy = true;
    const target = await codeTarget(code);
    busy = false;
    open = false;
    if (target === 'room') home.joinRoom(code);
    else goto(`/salon/play?code=${code}`);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dlg}
  aria-labelledby="dg-t"
  onclose={() => (open = false)}
  onclick={(e) => e.target === dlg && (open = false)}
>
  <form onsubmit={submit} novalidate>
    <div class="head">
      <h2 id="dg-t">J'ai un code</h2>
      <button class="x" type="button" aria-label="Fermer" onclick={() => (open = false)}>×</button>
    </div>
    <div class="field" class:ok={code.length === 6}>
      <div class="cases" aria-hidden="true">
        {#each [0, 1, 2, 3, 4, 5] as i (i)}<b class:plein={code[i]} class:cur={i === code.length}>{code[i] ?? ''}</b>{/each}
      </div>
      <input
        bind:this={input}
        bind:value={code}
        oninput={() => { code = cleanCode(code); err = ''; }}
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        maxlength="12"
        aria-labelledby="dg-t"
        aria-describedby="dg-aide"
        aria-invalid={err ? 'true' : undefined}
      />
    </div>
    <p class="etat" aria-hidden="true"><i></i>{code.length === 6 ? 'Code complet' : `${code.length} / 6`}</p>
    <p id="dg-aide" class="aide" class:err aria-live="polite">{err || AIDE}</p>
    <button class="go" type="submit" disabled={busy}>{busy ? '…' : 'Rejoindre'}</button>
  </form>
</dialog>

<GuestModal open={home.guestOpen} onClose={() => (home.guestOpen = false)} onConfirm={home.confirmGuest} />

<style>
  dialog {
    width: 100%;
    max-width: 100%;
    margin: auto 0 0;
    padding: 22px var(--gut) calc(22px + env(safe-area-inset-bottom, 0px));
    border: 0;
    border-top: 1px solid var(--line-2);
    border-radius: 22px 22px 0 0;
    background: var(--surface);
    color: var(--text);
    font-family: var(--corps);
    opacity: 0;
    translate: 0 40px;
    transition:
      opacity 0.35s var(--out),
      translate 0.45s var(--out),
      display 0.45s allow-discrete,
      overlay 0.45s allow-discrete;
  }
  dialog[open] {
    opacity: 1;
    translate: 0 0;
  }
  @starting-style {
    dialog[open] {
      opacity: 0;
      translate: 0 40px;
    }
  }
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.66);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  h2 {
    margin: 0;
    font-family: var(--titre);
    font-weight: 900;
    font-size: 2.2rem;
    line-height: 0.92;
    text-transform: uppercase;
  }
  .x {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--line-2);
    background: none;
    color: inherit;
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
  }
  .field {
    position: relative;
    margin-top: 18px;
  }
  .cases {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }
  .cases b {
    aspect-ratio: 1 / 1.16;
    display: grid;
    place-items: center;
    border-radius: 12px;
    border: 1px solid var(--line-2);
    background: #07070b;
    font-family: var(--mono);
    font-weight: 700;
    font-size: clamp(1.5rem, 7vw, 2.2rem);
    transition:
      border-color 0.25s,
      transform 0.25s var(--pop);
  }
  .cases b.plein {
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
  }
  .field:focus-within .cases b.cur {
    border-color: var(--accent);
  }
  .field.ok .cases b {
    border-color: var(--ok);
    background: rgba(61, 220, 132, 0.08);
  }
  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    font-size: 16px;
    cursor: text;
  }
  .etat {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 14px 0 0;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .etat i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #55576a;
  }
  .field.ok + .etat {
    color: var(--ok);
  }
  .field.ok + .etat i {
    background: var(--ok);
  }
  .aide {
    margin: 8px 0 0;
    min-height: 3em;
    font-size: 14px;
    color: var(--muted);
  }
  .aide.err {
    color: var(--danger);
  }
  .go {
    width: 100%;
    margin-top: 14px;
    min-height: 56px;
    border-radius: 999px;
    border: 0;
    background: var(--accent);
    color: #000;
    font-family: var(--titre);
    font-weight: 900;
    font-size: 20px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
  }
  @media (min-width: 900px) {
    dialog {
      max-width: 480px;
      margin: auto;
      padding: 28px;
      border: 1px solid var(--line-2);
      border-radius: 22px;
    }
  }
</style>

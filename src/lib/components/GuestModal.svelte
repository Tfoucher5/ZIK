<script>
  import { getContext } from 'svelte';
  import Modal from '$lib/components/Modal.svelte';

  /** @type {{ open: boolean, onClose: () => void, onConfirm: (name: string) => void }} */
  let { open, onClose, onConfirm } = $props();

  const { openAuthModal } = getContext('zik');

  let name = $state('');
  let error = $state('');

  $effect(() => {
    if (!open) return;
    name = localStorage.getItem('zik_guest') || '';
    error = '';
    setTimeout(() => document.getElementById('guestUsernameInput')?.focus(), 80);
  });

  function confirm() {
    const u = name.trim();
    if (u.length < 2) { error = 'Ton pseudo doit faire au moins 2 caractères.'; return; }
    localStorage.setItem('zik_guest', u);
    onConfirm(u);
  }

  function login() {
    onClose();
    openAuthModal('login');
  }
</script>

<Modal {open} {onClose} maxWidth="380px">
  <h2 class="guest-h2">Jouer en invité</h2>
  <p class="mdesc">
    Choisis un pseudo et c'est parti. Sans compte, ton score et ton classement ne sont pas sauvegardés.
  </p>
  <div class="field">
    <label for="guestUsernameInput">Ton pseudo</label>
    <input id="guestUsernameInput" type="text" bind:value={name}
      placeholder="Ex. : Julie" maxlength="20" autocomplete="nickname" enterkeyhint="go"
      onkeydown={(e) => { if (e.key === 'Enter') confirm(); }} />
    {#if error}<p class="guest-err" role="alert">{error}</p>{/if}
  </div>
  <div class="modal-btns">
    <button class="btn-ghost" onclick={login}>Me connecter</button>
    <button class="btn-accent" onclick={confirm}>Jouer →</button>
  </div>
</Modal>

<style>
  .guest-h2 {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 1.4rem; font-weight: 900; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.02em;
  }
  .mdesc { font-size: 0.9rem; color: var(--mid); margin-bottom: 20px; line-height: 1.5; }
  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
  .field label { font-size: 0.85rem; font-weight: 600; color: var(--mid); }
  .field input {
    background: rgb(var(--c-glass) / 0.03); border: 1px solid var(--border2);
    border-radius: 3px; padding: 12px 14px; color: var(--text);
    font-size: 1rem; font-family: inherit; outline: none;
  }
  .field input:focus { border-color: rgb(var(--accent-rgb) / 0.6); box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.12); }
  .guest-err { font-size: 0.85rem; color: var(--danger); }
  .modal-btns { display: flex; gap: 8px; justify-content: flex-end; }
</style>

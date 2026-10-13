<script>
  import { onMount } from 'svelte';

  let { title = 'Rejoindre la room', gameMode = 'classic', getCode, children } = $props();

  let loggedUser = $state(null);
  let guestName  = $state('');
  let guestError = $state('');
  let joining    = $state(false);

  onMount(() => {
    const uid   = sessionStorage.getItem('zik_uid');
    const uname = sessionStorage.getItem('zik_uname');
    if (uid && uname) loggedUser = { uid, uname };
  });

  async function go(username, userId, isGuest) {
    joining = true;
    try {
      const roomId = await getCode();
      const p = new URLSearchParams({ roomId, username, userId, isGuest, gameMode });
      window.location.href = `/game?${p}`;
    } catch (e) {
      guestError = e.message;
      joining = false;
    }
  }

  function joinAsLogged() {
    if (loggedUser) go(loggedUser.uname, loggedUser.uid, '0');
  }

  function joinAsGuest() {
    const name = guestName.trim();
    if (!name) { guestError = 'Entre un pseudo pour jouer.'; return; }
    if (name.length < 2 || name.length > 20) { guestError = 'Le pseudo doit faire entre 2 et 20 caractères.'; return; }
    guestError = '';
    localStorage.setItem('zik_guest', name);
    const uid = 'guest_' + Date.now();
    sessionStorage.setItem('zik_uid', uid);
    sessionStorage.setItem('zik_uname', name);
    go(name, uid, '1');
  }
</script>

<div class="room-join-card">
  <h2 class="room-join-title">{title}</h2>

  {#if loggedUser}
    <p class="room-join-sub">Connecté en tant que <strong>{loggedUser.uname}</strong></p>
    <button class="btn-room-join" onclick={joinAsLogged} disabled={joining}>
      {joining ? 'Connexion…' : '▶ Jouer maintenant'}
    </button>
    <p class="room-join-or">ou jouer en tant qu'invité ↓</p>
  {/if}

  <div class="room-guest-form">
    {#if !loggedUser}
      <p class="room-join-sub">Aucune inscription requise — entre juste un pseudo !</p>
    {/if}
    <input
      type="text"
      class="room-guest-input"
      bind:value={guestName}
      placeholder="Ton pseudo…"
      maxlength="20"
      disabled={joining}
      onkeydown={e => { if (e.key === 'Enter') joinAsGuest(); }}
    >
    {#if guestError}
      <p class="room-guest-error">{guestError}</p>
    {/if}
    <button class="btn-room-guest" onclick={joinAsGuest} disabled={joining || !guestName.trim()}>
      {joining ? 'Connexion…' : '→ Jouer en invité'}
    </button>
  </div>

  {@render children?.()}
</div>

<style>
  .room-join-card {
    background: var(--surface, rgb(var(--c-glass) / 0.04));
    border: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
    border-radius: 20px;
    padding: 32px;
    width: 100%;
    max-width: 420px;
    text-align: center;
  }
  .room-join-title {
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 20px;
  }
  .room-join-sub {
    font-size: 0.85rem;
    color: var(--mid, #94a3b8);
    margin-bottom: 14px;
  }
  .room-join-or {
    font-size: 0.78rem;
    color: var(--dim, #64748b);
    margin: 12px 0 16px;
  }
  .btn-room-join {
    width: 100%;
    background: var(--accent);
    border: none;
    color: var(--on-accent);
    font-size: 1rem;
    font-weight: 700;
    padding: 13px;
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 0.15s, filter 0.15s;
    margin-bottom: 4px;
  }
  .btn-room-join:hover:not(:disabled) { filter: brightness(1.08); }
  .btn-room-join:disabled { opacity: 0.5; cursor: not-allowed; }

  .room-guest-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .room-guest-input {
    width: 100%;
    background: rgb(var(--c-glass) / 0.05);
    border: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
    border-radius: 10px;
    color: var(--text, #f1f5f9);
    font-size: 0.95rem;
    font-family: inherit;
    padding: 11px 14px;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  .room-guest-input:focus {
    border-color: rgb(var(--accent-rgb) / 0.45);
    box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.1);
  }
  .room-guest-error {
    font-size: 0.78rem;
    color: var(--danger);
    margin: 0;
  }
  .btn-room-guest {
    width: 100%;
    background: rgb(var(--c-glass) / 0.06);
    border: 1px solid rgb(var(--c-glass) / 0.12);
    color: var(--text, #f1f5f9);
    font-size: 0.9rem;
    font-weight: 600;
    padding: 11px;
    border-radius: 12px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .btn-room-guest:hover:not(:disabled) { background: rgb(var(--c-glass) / 0.1); }
  .btn-room-guest:disabled { opacity: 0.4; cursor: not-allowed; }
</style>

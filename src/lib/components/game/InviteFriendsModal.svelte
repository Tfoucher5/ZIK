<script>
  import Modal from '$lib/components/Modal.svelte';
  import { dicebear } from '$lib/utils.js';

  // Invite ses amis dans la room en cours
  let { open = $bindable(false), getToken, userId, roomId, roomLabel, onError } = $props();

  let friends = $state([]);
  let loading = $state(false);
  let invitedIds = $state([]);
  let invitingId = $state(null);

  $effect(() => {
    if (open) load();
  });

  async function load() {
    loading = true;
    invitedIds = [];
    try {
      const r = await fetch(`/api/social/${userId}`, { headers: { Authorization: `Bearer ${await getToken()}` } });
      friends = (await r.json()).friends || [];
    } catch {
      friends = [];
    }
    loading = false;
  }

  async function invite(f) {
    if (invitingId) return;
    invitingId = f.id;
    try {
      const r = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({ targetId: f.id, roomId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      invitedIds = [...invitedIds, f.id];
    } catch (e) {
      onError(e.message);
    }
    invitingId = null;
  }
</script>

<Modal {open} onClose={() => (open = false)} maxWidth="440px">
  <h3 class="gi-title">Inviter des amis</h3>
  <p class="gi-sub">Ils recevront une invitation pour <b>{roomLabel || roomId}</b>.</p>

  {#if loading}
    <p class="gi-dim">Chargement de tes amis…</p>
  {:else if friends.length === 0}
    <p class="gi-dim">Tu n'as pas encore d'amis sur ZIK. Ajoute des joueurs depuis leur profil ou le menu ⋯ du classement.</p>
  {:else}
    <div class="gi-list">
      {#each friends as f (f.id)}
        <div class="gi-row">
          <img class="gi-av" src={f.avatar_url || dicebear(f.username)} alt="" width="34" height="34" loading="lazy" />
          <div class="gi-info">
            <span class="gi-name">{f.username}</span>
            <span class="gi-elo">{f.elo} ELO</span>
          </div>
          {#if invitedIds.includes(f.id)}
            <span class="gi-sent">✓ Envoyée</span>
          {:else}
            <button class="gi-btn" onclick={() => invite(f)} disabled={invitingId !== null}>
              {invitingId === f.id ? '…' : 'Inviter'}
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</Modal>

<style>
  .gi-dim { color: var(--dim); font-size: 0.82rem; padding: 6px 0; }
  .gi-list {
    max-height: min(50vh, 380px);
    overflow-y: auto;
    padding-right: 6px;
    scrollbar-width: thin;
    scrollbar-color: rgb(var(--c-glass) / 0.18) transparent;
  }
  .gi-list::-webkit-scrollbar { width: 5px; }
  .gi-list::-webkit-scrollbar-track { background: transparent; }
  .gi-list::-webkit-scrollbar-thumb {
    background: rgb(var(--c-glass) / 0.18);
    border-radius: 99px;
  }
  .gi-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 2px;
    border-bottom: 1px solid var(--border);
  }
  .gi-row:last-child { border-bottom: none; }
  .gi-av {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    object-fit: cover;
    background: rgb(var(--c-glass) / 0.06);
    flex-shrink: 0;
  }
  .gi-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  }
  .gi-name {
    font-size: 0.86rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .gi-elo {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.58rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--dim);
  }
  .gi-btn {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.64rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 6px 16px;
    border-radius: 99px;
    cursor: pointer;
    flex-shrink: 0;
    border: 1.5px solid rgb(var(--accent-rgb) / 0.5);
    background: rgb(var(--accent-rgb) / 0.08);
    color: var(--accent);
    transition: background 0.15s, border-color 0.15s;
  }
  .gi-btn:hover { border-color: var(--accent); background: rgb(var(--accent-rgb) / 0.15); }
  .gi-btn:disabled { opacity: 0.55; cursor: default; }
  .gi-sent {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--success);
    flex-shrink: 0;
  }
</style>

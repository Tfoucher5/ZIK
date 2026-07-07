<script>
  import Modal from '$lib/components/Modal.svelte';
  import { toast } from '$lib/toast.svelte.js';

  let { open = false, onClose = () => {}, sb, viewerId = null, targetId, targetName = '' } = $props();

  let loading = $state(false);
  let sendingCode = $state(null);
  let myRoom = $state(null);
  let myRooms = $state([]);
  let publicRooms = $state([]);
  let search = $state('');

  const filteredPublic = $derived.by(() => {
    const mine = new Set(myRooms.map((r) => r.code));
    let list = publicRooms.filter((r) => !mine.has(r.code) && r.code !== myRoom?.roomId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.name?.toLowerCase().includes(q));
    }
    return list.slice(0, 15);
  });

  async function getToken() {
    return (await sb?.auth.getSession())?.data?.session?.access_token;
  }

  $effect(() => {
    if (open) load();
  });

  async function load() {
    loading = true;
    search = '';
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [presRes, mineRes, pubRes] = await Promise.all([
        viewerId ? fetch(`/api/presence?ids=${viewerId}`, { headers }) : null,
        fetch('/api/rooms/mine', { headers }),
        fetch('/api/rooms', { headers }),
      ]);
      myRoom = presRes?.ok ? (await presRes.json())[viewerId]?.room || null : null;
      myRooms = mineRes.ok ? await mineRes.json() : [];
      publicRooms = pubRes.ok ? await pubRes.json() : [];
    } catch {
      myRooms = [];
      publicRooms = [];
    }
    loading = false;
  }

  async function invite(code) {
    if (sendingCode) return;
    sendingCode = code;
    try {
      const token = await getToken();
      const r = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetId, roomId: code }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      toast(`Invitation envoyée à ${targetName} !`, 'success');
      onClose();
    } catch (e) {
      toast(e.message, 'error');
    }
    sendingCode = null;
  }
</script>

<Modal {open} {onClose} maxWidth="480px">
  <h3 class="im-title">Inviter <b>{targetName}</b> à jouer</h3>

  {#if loading}
    <p class="im-dim">Chargement des rooms…</p>
  {:else}
    {#if myRoom}
      <div class="im-label">Ta room actuelle</div>
      <div class="im-row im-current">
        <span class="im-name">🎧 {myRoom.roomName}</span>
        <button class="im-btn accent" onclick={() => invite(myRoom.roomId)} disabled={sendingCode !== null}>Inviter</button>
      </div>
    {/if}

    {#if myRooms.length}
      <div class="im-label">Tes rooms</div>
      {#each myRooms as r (r.code)}
        <div class="im-row">
          <span class="im-name">{r.emoji || '🎵'} {r.name}</span>
          <span class="im-mode">{r.game_mode === 'qcm' ? 'QCM' : 'Classique'}</span>
          <button class="im-btn" onclick={() => invite(r.code)} disabled={sendingCode !== null}>Inviter</button>
        </div>
      {/each}
    {/if}

    <div class="im-label">Rooms publiques</div>
    <input class="im-search" type="text" placeholder="Rechercher une room…" bind:value={search} />
    {#if filteredPublic.length}
      <div class="im-list">
        {#each filteredPublic as r (r.code)}
          <div class="im-row">
            <span class="im-name">{r.emoji || '🎵'} {r.name}</span>
            <span class="im-mode">{r.game_mode === 'qcm' ? 'QCM' : 'Classique'}</span>
            <button class="im-btn" onclick={() => invite(r.code)} disabled={sendingCode !== null}>Inviter</button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="im-dim">Aucune room trouvée.</p>
    {/if}
  {/if}
</Modal>

<style>
  .im-title {
    font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1.5rem;
    text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 16px;
  }
  .im-title b { color: var(--accent); }

  .im-label {
    font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.62rem;
    letter-spacing: 0.24em; text-transform: uppercase; color: var(--dim);
    margin: 16px 0 8px;
  }

  .im-search {
    width: 100%; padding: 9px 14px; margin-bottom: 8px;
    background: rgb(var(--c-glass) / 0.04); border: 1px solid var(--border2);
    border-radius: 99px; color: var(--text); font-size: 0.82rem; outline: none;
  }
  .im-search:focus { border-color: rgb(var(--accent-rgb) / 0.6); }

  .im-list { max-height: 220px; overflow-y: auto; }

  .im-row {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 4px; border-bottom: 1px solid var(--border);
  }
  .im-row:last-child { border-bottom: none; }
  .im-current {
    border: 1px solid rgb(var(--accent-rgb) / 0.4); border-radius: var(--radius);
    padding: 10px 14px; background: rgb(var(--accent-rgb) / 0.06);
  }

  .im-name { flex: 1; min-width: 0; font-size: 0.86rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .im-mode {
    font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.6rem;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); flex-shrink: 0;
  }

  .im-btn {
    font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.64rem;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 5px 14px; border-radius: 99px; cursor: pointer; flex-shrink: 0;
    border: 1.5px solid var(--border2); background: none; color: var(--mid);
    transition: all 0.15s;
  }
  .im-btn:hover { color: var(--text); border-color: rgb(var(--c-glass) / 0.4); }
  .im-btn.accent { border-color: var(--accent); color: var(--accent); background: rgb(var(--accent-rgb) / 0.08); }
  .im-btn:disabled { opacity: 0.55; cursor: default; }

  .im-dim { color: var(--dim); font-size: 0.8rem; padding: 6px 0; }
</style>

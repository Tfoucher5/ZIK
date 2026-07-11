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
    return list.slice(0, 16);
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

<Modal {open} {onClose} maxWidth="640px">
  <h3 class="im-title">Inviter <b>{targetName}</b> à jouer</h3>

  {#if loading}
    <p class="im-dim">Chargement des rooms…</p>
  {:else}
    <div class="im-scroll">
      {#if myRoom}
        <div class="im-label">Ta room actuelle</div>
        <button class="im-card im-current" onclick={() => invite(myRoom.roomId)} disabled={sendingCode !== null}>
          <span class="im-name">🎧 {myRoom.roomName}</span>
          <span class="im-go accent">Inviter →</span>
        </button>
      {/if}

      {#if myRooms.length}
        <div class="im-label">Tes rooms</div>
        <div class="im-grid">
          {#each myRooms as r (r.code)}
            <button class="im-card" onclick={() => invite(r.code)} disabled={sendingCode !== null}>
              <span class="im-name">{r.emoji || '🎵'} {r.name}</span>
              <span class="im-meta">
                <span class="im-mode">{r.game_mode === 'qcm' ? 'QCM' : 'Classique'}</span>
                <span class="im-go">Inviter →</span>
              </span>
            </button>
          {/each}
        </div>
      {/if}

      <div class="im-label">Rooms publiques</div>
      <input class="im-search" type="text" placeholder="Rechercher une room…" bind:value={search} />
      {#if filteredPublic.length}
        <div class="im-grid">
          {#each filteredPublic as r (r.code)}
            <button class="im-card" onclick={() => invite(r.code)} disabled={sendingCode !== null}>
              <span class="im-name">{r.emoji || '🎵'} {r.name}</span>
              <span class="im-meta">
                <span class="im-mode">{r.game_mode === 'qcm' ? 'QCM' : 'Classique'}</span>
                <span class="im-go">Inviter →</span>
              </span>
            </button>
          {/each}
        </div>
      {:else}
        <p class="im-dim">Aucune room trouvée.</p>
      {/if}
    </div>
  {/if}
</Modal>

<style>
  .im-title {
    font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1.5rem;
    text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 12px;
  }
  .im-title b { color: var(--accent); }

  .im-scroll {
    max-height: min(58vh, 480px);
    overflow-y: auto;
    padding-right: 6px;
    scrollbar-width: thin;
    scrollbar-color: rgb(var(--c-glass) / 0.18) transparent;
  }
  .im-scroll::-webkit-scrollbar { width: 5px; }
  .im-scroll::-webkit-scrollbar-track { background: transparent; }
  .im-scroll::-webkit-scrollbar-thumb {
    background: rgb(var(--c-glass) / 0.18);
    border-radius: 99px;
  }
  .im-scroll::-webkit-scrollbar-thumb:hover { background: rgb(var(--c-glass) / 0.3); }

  .im-label {
    font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.62rem;
    letter-spacing: 0.24em; text-transform: uppercase; color: var(--dim);
    margin: 16px 0 8px;
  }
  .im-label:first-child { margin-top: 0; }

  .im-search {
    width: 100%; padding: 9px 14px; margin-bottom: 10px;
    background: rgb(var(--c-glass) / 0.04); border: 1px solid var(--border2);
    border-radius: 99px; color: var(--text); font-size: 0.82rem; outline: none;
  }
  .im-search:focus { border-color: rgb(var(--accent-rgb) / 0.6); }

  .im-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .im-card {
    display: flex; flex-direction: column; gap: 8px;
    padding: 11px 13px;
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    background: rgb(var(--c-glass) / 0.03);
    color: var(--text);
    cursor: pointer;
    text-align: left;
    min-width: 0;
    transition: border-color 0.15s, background 0.15s;
  }
  .im-card:hover {
    border-color: rgb(var(--accent-rgb) / 0.55);
    background: rgb(var(--accent-rgb) / 0.05);
  }
  .im-card:hover .im-go { color: var(--accent); }
  .im-card:disabled { opacity: 0.55; cursor: default; }

  .im-current {
    width: 100%;
    flex-direction: row; align-items: center; justify-content: space-between;
    border-color: rgb(var(--accent-rgb) / 0.4);
    background: rgb(var(--accent-rgb) / 0.06);
  }

  .im-name {
    font-size: 0.86rem; font-weight: 600; min-width: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .im-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .im-mode {
    font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.58rem;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim);
  }
  .im-go {
    font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.62rem;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--mid);
    transition: color 0.15s; flex-shrink: 0;
  }
  .im-go.accent { color: var(--accent); }

  .im-dim { color: var(--dim); font-size: 0.8rem; padding: 6px 0; }

  @media (max-width: 560px) {
    .im-grid { grid-template-columns: 1fr; }
    .im-scroll { max-height: 62vh; }
  }
</style>

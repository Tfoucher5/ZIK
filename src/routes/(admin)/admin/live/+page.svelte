<script>
  import { getContext, onDestroy, tick } from 'svelte';

  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let rooms = $state([]);
  let selected = $state(null); // roomId sélectionnée
  let sseStatus = $state('connecting'); // 'connecting' | 'ok' | 'error'
  let es = null;
  let actionMsg = $state(null);
  let actionMsgTimer = null;
  let announceText = $state('');
  let confirmClose = $state(false);
  let chatBoxEl = null;
  let chatInput = $state('');
  let _prevChatLen = 0;

  const selectedRoom = $derived(rooms.find(r => r.roomId === selected) ?? null);

  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  $effect(() => {
    const len = selectedRoom?.chatMessages?.length ?? 0;
    if (len !== _prevChatLen) {
      _prevChatLen = len;
      tick().then(() => { if (chatBoxEl) chatBoxEl.scrollTop = chatBoxEl.scrollHeight; });
    }
  });

  function sendAdminChat() {
    if (!chatInput.trim() || !selectedRoom) return;
    doAction(selectedRoom.roomId, 'chat', null, chatInput.trim());
    chatInput = '';
  }

  function connectSSE(tok) {
    if (es) { es.close(); es = null; }
    if (!tok) return;
    sseStatus = 'connecting';
    es = new EventSource(`/api/admin/rooms/live?token=${encodeURIComponent(tok)}`);
    es.onopen = () => { sseStatus = 'ok'; };
    es.onmessage = (e) => {
      const d = JSON.parse(e.data);
      rooms = d.rooms ?? [];
      sseStatus = 'ok';
    };
    es.onerror = () => {
      sseStatus = 'error';
    };
  }

  $effect(() => {
    if (token) connectSSE(token);
  });

  onDestroy(() => { if (es) es.close(); });

  function showMsg(msg, ok = true) {
    clearTimeout(actionMsgTimer);
    actionMsg = { text: msg, ok };
    actionMsgTimer = setTimeout(() => { actionMsg = null; }, 3000);
  }

  async function doAction(roomId, action, username = null, message = null) {
    const body = { _token: token, action };
    if (username) body.username = username;
    if (message) body.message = message;
    try {
      const res = await fetch(`/api/admin/rooms/${encodeURIComponent(roomId)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) showMsg(`${action} → ${roomId}`);
      else showMsg(`${action} non applicable`, false);
    } catch {
      showMsg('Requête échouée', false);
    }
  }

  function timerPct(room) {
    if (!room.roundDuration || room.roundDuration === 0) return 0;
    return Math.max(0, Math.min(100, (room.timer / room.roundDuration) * 100));
  }
</script>

<div class="zk">
  <div class="zk-head">
    <h1>Live</h1>
    <span class="sse-dot" class:ok={sseStatus === 'ok'} class:err={sseStatus === 'error'}></span>
    <span class="sse-label">{sseStatus === 'ok' ? 'Connecté' : sseStatus === 'error' ? 'Erreur' : 'Connexion…'}</span>
    <span class="zk-date">{rooms.length} room(s) active(s)</span>
  </div>

  {#if actionMsg}
    <div class="alert" class:alert-ok={actionMsg.ok} class:alert-err={!actionMsg.ok}>{actionMsg.text}</div>
  {/if}

  <div class="layout">
    <!-- Liste rooms -->
    <div class="panel room-list">
      <div class="panel-label">Rooms</div>
      {#if rooms.length === 0}
        <p class="hint">Aucune room active.</p>
      {:else}
        {#each rooms as r (r.roomId)}
          <button
            class="room-item"
            class:selected={selected === r.roomId}
            onclick={() => selected = r.roomId}
          >
            <span class="ri-id">{r.roomId}</span>
            <span class="ri-meta">
              {r.playerCount}p · {r.isActive ? `R${r.currentRound}/${r.maxRounds}` : 'Lobby'}
              {#if r.isPaused}<span class="badge-paused">⏸</span>{/if}
              {#if r.adminBlocked}<span class="badge-blocked">🔒</span>{/if}
            </span>
          </button>
        {/each}
      {/if}
    </div>

    <!-- Détail room sélectionnée -->
    <div class="panel room-detail">
      {#if !selectedRoom}
        <div class="no-select">← Sélectionner une room</div>
      {:else}
        <div class="detail-header">
          <span class="detail-id">{selectedRoom.roomId}</span>
          <div class="detail-actions">
            {#if selectedRoom.isActive && !selectedRoom.isPaused}
              <button class="btn" onclick={() => doAction(selectedRoom.roomId, 'pause')}>⏸ Pause</button>
            {/if}
            {#if selectedRoom.isPaused}
              <button class="btn btn-ok" onclick={() => doAction(selectedRoom.roomId, 'resume')}>▶ Reprendre</button>
            {/if}
            {#if selectedRoom.isActive}
              <button class="btn" onclick={() => doAction(selectedRoom.roomId, 'skip_round')}>⏭ Passer le round</button>
            {/if}
            <button class="btn btn-danger" onclick={() => doAction(selectedRoom.roomId, 'end_game')}>■ Terminer</button>
            {#if !selectedRoom.adminBlocked}
              <button class="btn btn-amber" onclick={() => doAction(selectedRoom.roomId, 'block')}>🔒 Verrouiller</button>
            {:else}
              <button class="btn btn-ok" onclick={() => doAction(selectedRoom.roomId, 'unblock')}>🔓 Déverrouiller</button>
            {/if}
            {#if !confirmClose}
              <button class="btn btn-danger" onclick={() => confirmClose = true}>✕ Fermer la room</button>
            {:else}
              <button class="btn btn-danger" onclick={() => { doAction(selectedRoom.roomId, 'close_room'); confirmClose = false; selected = null; }}>Confirmer la fermeture</button>
              <button class="btn" onclick={() => confirmClose = false}>Annuler</button>
            {/if}
          </div>
        </div>

        <!-- État du round -->
        <div class="round-state">
          {#if selectedRoom.isActive}
            <div class="rs-row">
              <span class="rs-label">Round</span>
              <span class="rs-val">{selectedRoom.currentRound} / {selectedRoom.maxRounds}</span>
            </div>
            {#if selectedRoom.isPaused}
              <div class="rs-row"><span class="tag tag-amber">⏸ En pause</span></div>
            {:else if selectedRoom.isSyncWaiting}
              <div class="rs-row">
                <span class="rs-label">Sync</span>
                <span class="rs-val">En attente ({selectedRoom.readyCount} prêts)</span>
              </div>
            {:else}
              <div class="rs-row">
                <span class="rs-label">Timer</span>
                <span class="rs-val">{selectedRoom.timer}s</span>
              </div>
              <div class="timer-bar">
                <div class="timer-fill" style="width: {timerPct(selectedRoom)}%"></div>
              </div>
            {/if}
            {#if selectedRoom.currentTrack}
              <div class="rs-row">
                <span class="rs-label">Track</span>
                <span class="rs-track-val">{selectedRoom.currentTrack.artist} — {selectedRoom.currentTrack.title}</span>
              </div>
            {/if}
          {:else}
            <div class="rs-row"><span class="rs-label">État</span><span class="rs-val td-dim">Lobby</span></div>
          {/if}
        </div>

        <!-- Annonce -->
        <div class="section">
          <div class="panel-label">Annonce</div>
          <div class="row-input">
            <input
              class="field-input"
              type="text"
              maxlength="200"
              placeholder="Message affiché sur les écrans…"
              bind:value={announceText}
              onkeydown={(e) => { if (e.key === 'Enter' && announceText.trim()) { doAction(selectedRoom.roomId, 'announce', null, announceText); announceText = ''; } }}
            />
            <button
              class="btn btn-amber"
              disabled={!announceText.trim()}
              onclick={() => { doAction(selectedRoom.roomId, 'announce', null, announceText); announceText = ''; }}
            >Envoyer</button>
          </div>
        </div>

        <div class="section">
          <div class="panel-label">Joueurs ({selectedRoom.playerCount})</div>
          {#if selectedRoom.players.length === 0}
            <p class="hint">Aucun joueur.</p>
          {:else}
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pseudo</th>
                    <th>Score</th>
                    <th>Artiste</th>
                    <th>Titre</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {#each selectedRoom.players as p (p.name)}
                    <tr>
                      <td class="td-strong">{p.name}</td>
                      <td class="td-num">{p.score}</td>
                      <td class:found={p.foundArtist}>{p.foundArtist ? '✓' : '✗'}</td>
                      <td class:found={p.foundTitle}>{p.foundTitle ? '✓' : '✗'}</td>
                      <td class="td-actions">
                        <button class="link link-danger" onclick={() => doAction(selectedRoom.roomId, 'kick', p.name)}>Exclure</button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>

        <!-- Chat en direct -->
        <div class="section">
          <div class="panel-label">Chat ({selectedRoom.chatMessages?.length ?? 0})</div>
          <div class="chat-box" bind:this={chatBoxEl}>
            {#if !selectedRoom.chatMessages?.length}
              <p class="hint">Aucun message pour l'instant.</p>
            {:else}
              {#each selectedRoom.chatMessages as m (m.ts + m.name)}
                <div class="chat-msg" class:chat-admin={m.name.endsWith(' - admin')}>
                  <span class="chat-ts">{fmtTime(m.ts)}</span>
                  <span class="chat-name">{m.name}</span>
                  <span class="chat-sep">›</span>
                  <span class="chat-text">{m.text}</span>
                </div>
              {/each}
            {/if}
          </div>
          <div class="row-input">
            <input
              class="field-input"
              type="text"
              maxlength="120"
              placeholder="Message dans le chat de la room…"
              bind:value={chatInput}
              onkeydown={(e) => { if (e.key === 'Enter') sendAdminChat(); }}
            />
            <button
              class="btn btn-primary"
              disabled={!chatInput.trim()}
              onclick={sendAdminChat}
            >Envoyer</button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .zk {
    --c-panel: #13161e;
    --c-border: rgba(255, 255, 255, 0.07);
    --c-text: #e2e8f0;
    --c-muted: #6b7280;
    --c-green: #22c55e;
    --c-red: #ef4444;
    --c-amber: #f59e0b;
    --c-indigo: #6366f1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--c-text);
  }

  .zk-head { display: flex; align-items: center; gap: 10px; }
  .zk-head h1 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; }
  .zk-date { font-size: 0.78rem; color: var(--c-muted); margin-left: 4px; }

  .sse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c-muted); flex-shrink: 0; }
  .sse-dot.ok { background: var(--c-green); box-shadow: 0 0 6px rgba(34, 197, 94, 0.6); animation: pulse 2s infinite; }
  .sse-dot.err { background: var(--c-red); box-shadow: 0 0 6px rgba(239, 68, 68, 0.6); }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  .sse-label { font-size: 0.75rem; color: var(--c-muted); }

  .panel {
    background: var(--c-panel);
    border: 1px solid var(--c-border);
    border-radius: 10px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .panel-label { font-size: 0.82rem; font-weight: 600; color: var(--c-text); }

  .layout { display: grid; grid-template-columns: 220px 1fr; gap: 12px; min-height: 400px; }

  .room-list { gap: 6px; }
  .room-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: transparent;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    color: var(--c-muted);
    font-family: inherit;
    font-size: 0.78rem;
    padding: 8px 10px;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
    width: 100%;
  }
  .room-item:hover { border-color: rgba(255, 255, 255, 0.2); color: var(--c-text); background: rgba(255, 255, 255, 0.03); }
  .room-item.selected { border-color: rgba(99, 102, 241, 0.4); color: var(--c-text); background: rgba(99, 102, 241, 0.06); }
  .ri-id { font-family: 'JetBrains Mono', monospace; font-weight: 600; }
  .ri-meta { font-size: 0.7rem; color: var(--c-muted); }
  .badge-paused { color: var(--c-amber); font-size: 0.75rem; }
  .badge-blocked { font-size: 0.75rem; }

  .hint { font-size: 0.8rem; color: var(--c-muted); }

  .room-detail { gap: 18px; }
  .no-select { font-size: 0.85rem; color: var(--c-muted); margin: auto; }

  .detail-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .detail-id { font-family: 'JetBrains Mono', monospace; font-size: 1rem; font-weight: 600; }
  .detail-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; }

  .btn {
    background: transparent;
    border: 1px solid var(--c-border);
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 500;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.15); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-primary { border-color: rgba(99, 102, 241, 0.4); color: var(--c-indigo); }
  .btn-primary:hover:not(:disabled) { background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.6); }
  .btn-ok { border-color: rgba(34, 197, 94, 0.4); color: var(--c-green); }
  .btn-ok:hover:not(:disabled) { background: rgba(34, 197, 94, 0.08); border-color: rgba(34, 197, 94, 0.6); }
  .btn-amber { border-color: rgba(245, 158, 11, 0.4); color: var(--c-amber); }
  .btn-amber:hover:not(:disabled) { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.6); }
  .btn-danger { border-color: rgba(239, 68, 68, 0.3); color: var(--c-red); }
  .btn-danger:hover:not(:disabled) { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.5); }

  .section { display: flex; flex-direction: column; gap: 10px; }

  .row-input { display: flex; gap: 8px; }
  .field-input {
    flex: 1;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--c-border);
    border-radius: 6px;
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.84rem;
    padding: 7px 12px;
    outline: none;
  }
  .field-input::placeholder { color: var(--c-muted); }
  .field-input:focus { border-color: rgba(255, 255, 255, 0.2); }

  .round-state { display: flex; flex-direction: column; gap: 8px; }
  .rs-row { display: flex; align-items: center; gap: 12px; font-size: 0.84rem; }
  .rs-label { font-size: 0.72rem; color: var(--c-muted); width: 60px; }
  .rs-val { font-family: 'JetBrains Mono', monospace; color: var(--c-text); }
  .rs-track-val { color: var(--c-amber); font-size: 0.82rem; }

  .tag { font-size: 0.72rem; font-weight: 500; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--c-border); color: var(--c-muted); }
  .tag-amber { color: var(--c-amber); border-color: rgba(245, 158, 11, 0.3); }

  .timer-bar {
    height: 3px;
    background: var(--c-border);
    border-radius: 2px;
    overflow: hidden;
    width: 100%;
    max-width: 300px;
  }
  .timer-fill {
    height: 100%;
    background: var(--c-indigo);
    border-radius: 2px;
    transition: width 0.9s linear;
  }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  th {
    text-align: left;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--c-muted);
    padding: 6px 10px;
    border-bottom: 1px solid var(--c-border);
  }
  td { padding: 9px 10px; border-bottom: 1px solid var(--c-border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255, 255, 255, 0.02); }

  .td-strong { font-weight: 500; }
  .td-dim { color: var(--c-muted); }
  .td-num { font-family: 'JetBrains Mono', monospace; }
  .td-actions { text-align: right; }
  td.found { color: var(--c-green); }
  td:not(.found) { color: var(--c-muted); }

  .link { background: none; border: none; font-family: inherit; font-size: 0.78rem; color: var(--c-muted); cursor: pointer; padding: 0; transition: color 0.15s; }
  .link:hover { color: var(--c-text); }
  .link-danger { color: rgba(239, 68, 68, 0.6); }
  .link-danger:hover { color: var(--c-red); }

  .chat-box {
    max-height: 220px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 3px;
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 8px 10px;
    scrollbar-width: thin;
  }
  .chat-msg { display: flex; align-items: baseline; gap: 8px; font-size: 0.78rem; line-height: 1.6; }
  .chat-ts { color: var(--c-muted); flex-shrink: 0; font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; }
  .chat-name { color: var(--c-text); font-weight: 600; flex-shrink: 0; }
  .chat-sep { color: var(--c-muted); flex-shrink: 0; }
  .chat-text { color: var(--c-text); word-break: break-word; }
  .chat-admin .chat-name { color: var(--c-amber); }
  .chat-admin .chat-text { color: var(--c-amber); }

  .alert { font-size: 0.84rem; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--c-border); }
  .alert-err { color: var(--c-red); border-color: rgba(239, 68, 68, 0.3); }
  .alert-ok { color: var(--c-green); border-color: rgba(34, 197, 94, 0.3); }
</style>

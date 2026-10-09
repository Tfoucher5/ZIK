<script>
  import { getContext, tick } from 'svelte';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';

  let { data } = $props();

  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  const DONE = {
    pause: 'Partie mise en pause.',
    resume: 'Partie relancée.',
    skip_round: 'Manche passée.',
    end_game: 'Partie terminée.',
    kick: 'Joueur exclu.',
    block: 'Room verrouillée.',
    unblock: 'Room déverrouillée.',
    announce: 'Annonce envoyée.',
    close_room: 'Room fermée.',
    chat: 'Message envoyé.',
  };

  let rooms = $state([]);
  let selected = $state(null);
  let status = $state('connecting');
  let toast = $state(null);
  let announceText = $state('');
  let chatInput = $state('');
  let confirming = $state(null);
  let wide = $state(false);
  let sheetOpen = $state(false);
  let chatBoxEl = $state();
  let toastTimer;
  let confirmTimer;
  let prevChatLen = 0;

  const room = $derived(rooms.find((r) => r.roomId === selected) ?? null);
  const totals = $derived({
    players: rooms.reduce((n, r) => n + r.playerCount, 0),
    playing: rooms.filter((r) => r.isActive).length,
    held: rooms.filter((r) => r.isPaused || r.adminBlocked).length,
  });
  const ranked = $derived(room ? [...room.players].sort((a, b) => b.score - a.score) : []);

  $effect(() => {
    const m = matchMedia('(min-width: 1000px)');
    const sync = () => (wide = m.matches);
    sync();
    m.addEventListener('change', sync);
    return () => m.removeEventListener('change', sync);
  });

  $effect(() => {
    if (!token) return;
    status = 'connecting';
    const es = new EventSource(`/api/admin/rooms/live?token=${encodeURIComponent(token)}`);
    es.onopen = () => (status = 'ok');
    es.onmessage = (e) => {
      rooms = JSON.parse(e.data).rooms ?? [];
      status = 'ok';
    };
    es.onerror = () => (status = 'error');
    return () => es.close();
  });

  $effect(() => {
    if (wide && !room && rooms.length) selected = rooms[0].roomId;
  });

  $effect(() => {
    const len = room?.chatMessages?.length ?? 0;
    if (len !== prevChatLen) {
      prevChatLen = len;
      tick().then(() => chatBoxEl && (chatBoxEl.scrollTop = chatBoxEl.scrollHeight));
    }
  });

  $effect(() => () => {
    clearTimeout(toastTimer);
    clearTimeout(confirmTimer);
  });

  function info(code) {
    return data.names[code] ?? { name: code, emoji: '🎵', official: false };
  }

  function stateOf(r) {
    if (r.adminBlocked) return { label: 'Verrouillée', tone: 'bad' };
    if (r.isPaused) return { label: 'En pause', tone: 'warn' };
    if (r.isActive) return { label: `Manche ${r.currentRound}/${r.maxRounds}`, tone: 'good' };
    return { label: 'En attente', tone: '' };
  }

  function pick(r) {
    selected = r.roomId;
    confirming = null;
    if (!wide) sheetOpen = true;
  }

  function flash(text, ok = true) {
    clearTimeout(toastTimer);
    toast = { text, ok };
    toastTimer = setTimeout(() => (toast = null), 3000);
  }

  function ask(key, run) {
    clearTimeout(confirmTimer);
    if (confirming === key) {
      confirming = null;
      run();
      return;
    }
    confirming = key;
    confirmTimer = setTimeout(() => (confirming = null), 4000);
  }

  async function act(action, extra = {}) {
    if (!room) return;
    const roomId = room.roomId;
    try {
      const res = await fetch(`/api/admin/rooms/${encodeURIComponent(roomId)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _token: token, action, ...extra }),
      });
      const d = await res.json();
      if (d.success) flash(DONE[action]);
      else flash('Action impossible dans l’état actuel de la room.', false);
      if (d.success && action === 'close_room') {
        selected = null;
        sheetOpen = false;
      }
    } catch {
      flash('La demande n’a pas abouti.', false);
    }
  }

  function sendChat() {
    if (!chatInput.trim()) return;
    act('chat', { message: chatInput.trim() });
    chatInput = '';
  }

  function sendAnnounce() {
    if (!announceText.trim()) return;
    act('announce', { message: announceText.trim() });
    announceText = '';
  }

  const time = (ts) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const timerPct = (r) => (r.roundDuration ? Math.max(0, Math.min(100, (r.timer / r.roundDuration) * 100)) : 0);
</script>

{#snippet detail(r)}
  {@const st = stateOf(r)}
  {@const meta = info(r.roomId)}
  <div class="detail">
    <header class="d-head">
      <span class="emo">{meta.emoji}</span>
      <div class="d-title">
        <b>{meta.name}</b>
        <span class="a-muted">{r.roomId} · {r.playerCount} joueur{r.playerCount > 1 ? 's' : ''}</span>
      </div>
      <em class="a-tag {st.tone}">{st.label}</em>
    </header>

    <section class="a-card now">
      {#if r.isActive}
        <div class="now-row">
          <span class="a-muted">Manche</span>
          <b class="big">{r.currentRound}<small>/{r.maxRounds}</small></b>
          {#if r.isPaused}
            <em class="a-tag warn">En pause</em>
          {:else if r.isSyncWaiting}
            <span class="a-muted">Chargement · {r.readyCount} prêt{r.readyCount > 1 ? 's' : ''}</span>
          {:else}
            <span class="timer">{r.timer} s</span>
          {/if}
        </div>
        {#if !r.isPaused && !r.isSyncWaiting}
          <div class="a-meter"><i class="tick" style="width:{timerPct(r)}%"></i></div>
        {/if}
        {#if r.currentTrack}
          <p class="track"><span class="a-muted">Titre en cours</span><b>{r.currentTrack.artist} · {r.currentTrack.title}</b></p>
        {/if}
      {:else}
        <p class="a-muted">Pas de partie en cours : les joueurs attendent le lancement.</p>
      {/if}
    </section>

    <div class="a-btns">
      {#if r.isActive && !r.isPaused}
        <button class="a-btn small" type="button" onclick={() => act('pause')}>Mettre en pause</button>
      {/if}
      {#if r.isPaused}
        <button class="a-btn small good" type="button" onclick={() => act('resume')}>Reprendre</button>
      {/if}
      {#if r.isActive}
        <button class="a-btn small" type="button" onclick={() => act('skip_round')}>Passer la manche</button>
      {/if}
      {#if r.adminBlocked}
        <button class="a-btn small good" type="button" onclick={() => act('unblock')}>Déverrouiller</button>
      {:else}
        <button class="a-btn small" type="button" title="Empêche de nouveaux joueurs d’entrer" onclick={() => act('block')}>Verrouiller</button>
      {/if}
      {#if r.isActive}
        <button class="a-btn small danger" type="button" onclick={() => ask('end', () => act('end_game'))}>
          {confirming === 'end' ? 'Confirmer la fin ?' : 'Terminer la partie'}
        </button>
      {/if}
      <button class="a-btn small danger" type="button" onclick={() => ask('close', () => act('close_room'))}>
        {confirming === 'close' ? 'Confirmer la fermeture ?' : 'Fermer la room'}
      </button>
    </div>

    <section class="block">
      <h3 class="a-h2">Joueurs</h3>
      {#if ranked.length}
        <ul class="players">
          {#each ranked as p, i (p.name)}
            <li>
              <span class="rank" class:gold={i === 0 && p.score > 0}>{i + 1}</span>
              <span class="p-name">{p.name}</span>
              {#if r.isActive}
                <span class="found">
                  <em class="a-tag" class:good={p.foundArtist}>Artiste</em>
                  <em class="a-tag" class:good={p.foundTitle}>Titre</em>
                </span>
              {/if}
              <b class="score">{p.score}</b>
              <button class="a-btn small danger kick" type="button" onclick={() => ask(`kick:${p.name}`, () => act('kick', { username: p.name }))}>
                {confirming === `kick:${p.name}` ? 'Confirmer' : 'Exclure'}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="a-muted">Personne dans la room.</p>
      {/if}
    </section>

    <section class="block">
      <h3 class="a-h2">Annonce à l’écran</h3>
      <form class="send" onsubmit={(e) => { e.preventDefault(); sendAnnounce(); }}>
        <input class="a-input" maxlength="200" placeholder="Message affiché en grand chez tous les joueurs" bind:value={announceText} />
        <button class="a-btn" type="submit" disabled={!announceText.trim()}>Annoncer</button>
      </form>
    </section>

    <section class="block">
      <h3 class="a-h2">Chat <span class="a-muted">({r.chatMessages?.length ?? 0})</span></h3>
      <div class="chat" bind:this={chatBoxEl}>
        {#each r.chatMessages ?? [] as m, i (i)}
          <p class="msg" class:admin={m.name.endsWith(' - admin')}>
            <span class="ts">{time(m.ts)}</span>
            <b>{m.name}</b>
            <span class="txt">{m.text}</span>
          </p>
        {:else}
          <p class="a-muted">Aucun message pour l’instant.</p>
        {/each}
      </div>
      <form class="send" onsubmit={(e) => { e.preventDefault(); sendChat(); }}>
        <input class="a-input" maxlength="120" placeholder="Écrire dans le chat en tant qu’admin" bind:value={chatInput} />
        <button class="a-btn primary" type="submit" disabled={!chatInput.trim()}>Envoyer</button>
      </form>
    </section>
  </div>
{/snippet}

<div class="adm-page">
  <PageHeader title="En direct">
    <span class="conn {status}">
      <i></i>{status === 'ok' ? 'En direct' : status === 'error' ? 'Coupé, reconnexion…' : 'Connexion…'}
    </span>
  </PageHeader>

  <div class="a-stack">
    <div class="a-kpis">
      <div class="a-kpi"><span class="a-kpi-label">Rooms ouvertes</span><span class="a-kpi-value">{rooms.length}</span></div>
      <div class="a-kpi"><span class="a-kpi-label">Joueurs connectés</span><span class="a-kpi-value">{totals.players}</span></div>
      <div class="a-kpi"><span class="a-kpi-label">Parties en cours</span><span class="a-kpi-value">{totals.playing}</span></div>
      <div class="a-kpi"><span class="a-kpi-label">En pause ou verrouillées</span><span class="a-kpi-value">{totals.held}</span></div>
    </div>

    {#if rooms.length === 0}
      <p class="a-card a-empty">
        {status === 'ok' ? 'Aucune room ouverte en ce moment.' : 'Connexion au serveur de jeu…'}
      </p>
    {:else}
      <div class="live">
        <ul class="a-list rooms">
          {#each rooms as r (r.roomId)}
            {@const st = stateOf(r)}
            {@const meta = info(r.roomId)}
            <li>
              <button class="a-row" class:sel={wide && selected === r.roomId} type="button" onclick={() => pick(r)}>
                <span class="emo">{meta.emoji}</span>
                <span class="a-row-main">
                  <span class="a-row-title">{meta.name}</span>
                  <span class="a-row-sub">{r.roomId}{r.currentTrack ? ` · ${r.currentTrack.artist}` : ''}</span>
                  {#if r.isActive}
                    <span class="a-meter thin"><i style="width:{(r.currentRound / Math.max(1, r.maxRounds)) * 100}%"></i></span>
                  {/if}
                </span>
                <span class="side">
                  <b>{r.playerCount}</b>
                  <em class="a-tag {st.tone}">{st.label}</em>
                </span>
              </button>
            </li>
          {/each}
        </ul>

        {#if wide}
          <div class="a-section pane">
            {#if room}
              {@render detail(room)}
            {:else}
              <p class="a-empty">Choisis une room dans la liste.</p>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

{#if toast}
  <p class="toast" class:bad={!toast.ok} role="status">{toast.text}</p>
{/if}

{#if !wide}
  <Sheet bind:open={sheetOpen} title="Room en direct">
    {#if room}
      {@render detail(room)}
    {:else}
      <p class="a-empty">Cette room vient de se fermer.</p>
    {/if}
  </Sheet>
{/if}

<style>
  .conn { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--a-muted); white-space: nowrap; }
  .conn i { width: 8px; height: 8px; border-radius: 50%; background: var(--a-dim); }
  .conn.ok i { background: var(--a-good); animation: pulse 2s infinite; }
  .conn.error i { background: var(--a-bad); }
  @keyframes pulse { 50% { opacity: 0.35; } }

  .live { display: grid; gap: 14px; align-items: start; }
  @media (min-width: 1000px) {
    .live { grid-template-columns: 340px minmax(0, 1fr); gap: 20px; }
    .rooms { position: sticky; top: 80px; max-height: calc(100vh - 100px); overflow-y: auto; }
  }
  .a-row.sel { border-color: var(--a-accent); background: var(--a-accent-soft); }
  .emo { flex: 0 0 auto; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; background: var(--a-surface2); font-size: 1.2rem; }
  .side { display: grid; justify-items: end; gap: 4px; }
  .side b { font-family: var(--a-display); font-size: 1.3rem; line-height: 1; }
  .thin { height: 4px; margin-top: 3px; }

  .detail { display: grid; gap: 14px; min-width: 0; }
  .d-head { display: flex; align-items: center; gap: 12px; }
  .d-title { flex: 1; min-width: 0; display: grid; }
  .d-title b { overflow: hidden; font-family: var(--a-display); font-size: 1.4rem; text-overflow: ellipsis; white-space: nowrap; }
  .d-title span { font-size: 0.82rem; }

  .now { display: grid; gap: 10px; background: var(--a-bg); }
  .now-row { display: flex; align-items: baseline; gap: 10px; }
  .big { font-family: var(--a-display); font-size: 2rem; line-height: 1; }
  .big small { font-size: 1.1rem; color: var(--a-dim); }
  .timer { margin-left: auto; font-family: var(--a-display); font-size: 1.4rem; color: var(--a-cyan); font-variant-numeric: tabular-nums; }
  .tick { background: var(--a-cyan); transition: width 1.9s linear; }
  .track { display: grid; gap: 2px; font-size: 0.9rem; }
  .track span { font-size: 0.78rem; }

  .block { display: grid; gap: 8px; }
  .block .a-h2 { margin-top: 0; }
  .players { display: grid; gap: 6px; list-style: none; }
  .players li { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--a-line); border-radius: 12px; background: var(--a-bg); }
  .rank { width: 22px; font-family: var(--a-display); font-weight: 800; text-align: center; color: var(--a-dim); }
  .rank.gold { color: var(--a-warn); }
  .p-name { flex: 1; min-width: 0; overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .found { display: none; gap: 4px; }
  .score { min-width: 36px; font-family: var(--a-display); font-size: 1.2rem; text-align: right; font-variant-numeric: tabular-nums; }
  @media (min-width: 600px) { .found { display: flex; } }

  .send { display: flex; gap: 8px; }
  .send .a-input { flex: 1; min-width: 0; }

  .chat { display: grid; gap: 4px; align-content: start; max-height: 260px; min-height: 80px; overflow-y: auto; padding: 10px 12px; border: 1px solid var(--a-line); border-radius: 12px; background: var(--a-bg); }
  .msg { font-size: 0.86rem; line-height: 1.45; overflow-wrap: anywhere; }
  .msg .ts { margin-right: 6px; font-size: 0.72rem; color: var(--a-dim); font-variant-numeric: tabular-nums; }
  .msg b { margin-right: 6px; }
  .msg.admin b, .msg.admin .txt { color: var(--a-warn); }

  .toast {
    position: fixed; left: 50%; bottom: calc(84px + env(safe-area-inset-bottom, 0px)); z-index: 300;
    max-width: calc(100vw - 32px); padding: 10px 16px; border-radius: 12px; transform: translateX(-50%);
    background: var(--a-good); color: #032a10; font-weight: 700; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  }
  .toast.bad { background: var(--a-bad); color: #2a0303; }
  @media (min-width: 900px) { .toast { bottom: 24px; } }
</style>

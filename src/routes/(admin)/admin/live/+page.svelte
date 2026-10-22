<script>
  import { getContext } from 'svelte';
  import PageHeader from '$lib/components/admin/PageHeader.svelte';
  import Sheet from '$lib/components/admin/Sheet.svelte';
  import LiveRoomDetail from '$lib/components/admin/live/LiveRoomDetail.svelte';
  import { stateOf } from '$lib/components/admin/live/liveRooms.js';

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
  let wide = $state(false);
  let sheetOpen = $state(false);
  let toastTimer;

  const room = $derived(rooms.find((r) => r.roomId === selected) ?? null);
  const totals = $derived({
    players: rooms.reduce((n, r) => n + r.playerCount, 0),
    playing: rooms.filter((r) => r.isActive).length,
    held: rooms.filter((r) => r.isPaused || r.adminBlocked).length,
  });

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

  $effect(() => () => clearTimeout(toastTimer));

  function info(code) {
    return data.names[code] ?? { name: code, emoji: '🎵', official: false };
  }


  function pick(r) {
    selected = r.roomId;
    if (!wide) sheetOpen = true;
  }

  function flash(text, ok = true) {
    clearTimeout(toastTimer);
    toast = { text, ok };
    toastTimer = setTimeout(() => (toast = null), 3000);
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
</script>

{#snippet detail(r)}
  {#key r.roomId}<LiveRoomDetail {r} meta={info(r.roomId)} {act} />{/key}
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


  .toast {
    position: fixed; left: 50%; bottom: calc(84px + env(safe-area-inset-bottom, 0px)); z-index: 300;
    max-width: calc(100vw - 32px); padding: 10px 16px; border-radius: 12px; transform: translateX(-50%);
    background: var(--a-good); color: #032a10; font-weight: 700; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  }
  .toast.bad { background: var(--a-bad); color: #2a0303; }
  @media (min-width: 900px) { .toast { bottom: 24px; } }
</style>

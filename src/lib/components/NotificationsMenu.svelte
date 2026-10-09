<script>
  import { getContext } from 'svelte';
  import { dicebear } from '$lib/utils.js';
  import { RARITIES } from '$lib/components/card/rarity.js';
  import { notifState, markAllRead, dismissNotif } from '$lib/notifications.svelte.js';
  import { push, enablePush } from '$lib/push.svelte.js';
  import { toast } from '$lib/toast.svelte.js';
  import { sendFriend } from '$lib/components/player/social.js';

  const ctx = getContext('zik');
  const sb = ctx.sb;
  const user = $derived(ctx.user);

  let open = $state(false);
  let busyId = $state(null);

  function toggle(e) {
    e.stopPropagation();
    open = !open;
    if (open) markAllRead();
  }

  function timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "à l'instant";
    if (diff < 60) return `il y a ${diff} min`;
    const h = Math.floor(diff / 60);
    return `il y a ${h} h`;
  }

  async function friendAction(n, action) {
    if (busyId) return;
    busyId = n.id;
    try {
      if (await sendFriend(sb, n.actor_id, action)) dismissNotif(n.id);
    } finally {
      busyId = null;
    }
  }

  async function enableDevicePush() {
    try {
      await enablePush(async () => (await sb.auth.getSession())?.data?.session?.access_token);
      if (push.subscribed) toast('Notifications activées sur cet appareil', 'success');
    } catch {
      toast("Impossible d'activer les notifications sur cet appareil", 'error');
    }
  }

  function joinRoom(n) {
    const username = user?.profile?.username || user?.email?.split('@')[0] || 'Joueur';
    const p = new URLSearchParams({
      roomId: n.payload.roomId,
      username,
      userId: user?.id || '',
      isGuest: '0',
      gameMode: n.payload.gameMode || 'classic',
    });
    window.location.href = `/game?${p}`;
  }
</script>

<svelte:window onclick={() => { open = false; }} />

<div class="notif-wrap">
  <button class="notif-bell" onclick={toggle} aria-haspopup="true" aria-label="Notifications">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>
    </svg>
    {#if notifState.unread > 0}
      <span class="notif-badge">{notifState.unread > 9 ? '9+' : notifState.unread}</span>
    {/if}
  </button>

  {#if open}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="notif-panel" onclick={(e) => e.stopPropagation()}>
      <div class="notif-head">Notifications</div>
      {#if push.supported && !push.subscribed && push.permission !== 'denied'}
        <button class="notif-push" onclick={enableDevicePush} disabled={push.busy}>
          🔔 Être prévenu même quand ZIK est fermé
        </button>
      {/if}
      {#if notifState.list.length === 0}
        <p class="notif-empty">Aucune notification.</p>
      {:else}
        {#each notifState.list as n (n.id)}
          {@const uname = n.actor?.username || 'Un joueur'}
          {@const fromZik = n.type === 'announcement' || n.type === 'news'}
          <div class="notif-item">
            {#if fromZik}
              <span class="notif-av notif-zik" aria-hidden="true">Z</span>
            {:else}
              <a class="notif-av" href={n.actor ? `/user/${uname}` : '/collection'}>
                <img src={n.payload?.cover || n.actor?.avatar_url || dicebear(uname)} alt="" width="32" height="32" loading="lazy" decoding="async" referrerpolicy="no-referrer">
              </a>
            {/if}
            <div class="notif-body">
              {#if n.type === 'news'}
                <p><b>Nouveau sur ZIK</b> : {n.payload?.title}</p>
                <div class="notif-actions">
                  <a class="notif-btn accept" href="/nouveautes">Voir</a>
                </div>
              {:else if n.type === 'announcement'}
                <p><b>{n.payload?.title}</b>{#if n.payload?.body}<br>{n.payload.body}{/if}</p>
                {#if n.payload?.url}
                  <div class="notif-actions">
                    <a class="notif-btn accept" href={n.payload.url}>Voir</a>
                  </div>
                {/if}
              {:else if n.type === 'friend_request'}
                <p><a href="/user/{uname}"><b>{uname}</b></a> t'a envoyé une demande d'ami</p>
                <div class="notif-actions">
                  <button class="notif-btn accept" onclick={() => friendAction(n, 'accept')} disabled={busyId === n.id}>Accepter</button>
                  <button class="notif-btn" onclick={() => friendAction(n, 'remove')} disabled={busyId === n.id}>Refuser</button>
                </div>
              {:else if n.type === 'friend_accept'}
                <p><a href="/user/{uname}"><b>{uname}</b></a> a accepté ta demande d'ami</p>
              {:else if n.type === 'room_invite'}
                <p><a href="/user/{uname}"><b>{uname}</b></a> t'invite dans <b>{n.payload?.roomName || 'une room'}</b></p>
                <div class="notif-actions">
                  <button class="notif-btn accept" onclick={() => joinRoom(n)}>Rejoindre</button>
                </div>
              {:else if n.type === 'card_mythic'}
                <p><a href="/user/{uname}"><b>{uname}</b></a> a décroché la carte Mythique <a href="/carte/{n.payload?.number}"><b>{n.payload?.title}</b></a> 🌟</p>
              {:else if n.type === 'card_up'}
                <p>Ta carte <a href="/carte/{n.payload?.number}"><b>{n.payload?.title}</b></a> est passée <b>{RARITIES[n.payload?.rarity]?.label ?? ''}</b></p>
              {:else if n.type === 'card_set_near'}
                <p>
                  Plus qu'une carte pour finir {n.payload?.kind === 'artist' ? "l'artiste" : "l'album"} <b>{n.payload?.setName}</b>
                  {#if n.payload?.roomName}. Elle passe dans <b>{n.payload.roomName}</b>{/if}
                </p>
                {#if n.payload?.roomId}
                  <div class="notif-actions">
                    <button class="notif-btn accept" onclick={() => joinRoom(n)}>Aller la chercher</button>
                  </div>
                {/if}
              {/if}
              <span class="notif-time">{timeAgo(n.created_at)}</span>
            </div>
            {#if !n.read}<span class="notif-dot" aria-hidden="true"></span>{/if}
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .notif-wrap { position: relative; }

  .notif-bell {
    position: relative; display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 50%;
    background: none; border: 1px solid var(--border2); color: var(--mid);
    cursor: pointer; transition: color 0.15s, border-color 0.15s;
  }
  .notif-bell:hover { color: var(--text); border-color: rgb(var(--c-glass) / 0.4); }
  .notif-bell svg { width: 17px; height: 17px; }

  .notif-badge {
    position: absolute; top: -4px; right: -4px; min-width: 16px; height: 16px;
    padding: 0 4px; border-radius: 99px; background: var(--accent); color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 0.62rem;
    line-height: 16px; text-align: center;
  }

  .notif-panel {
    position: absolute; right: 0; top: calc(100% + 10px); z-index: 200;
    width: 330px; max-height: 420px; overflow-y: auto;
    background: var(--bg2); border: 1px solid var(--border2); border-radius: var(--radius);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
  }
  .notif-head {
    font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.66rem;
    letter-spacing: 0.24em; text-transform: uppercase; color: var(--dim);
    padding: 12px 16px 8px; border-bottom: 1px solid var(--border);
  }
  .notif-push {
    display: block; width: 100%; text-align: left; cursor: pointer;
    padding: 11px 16px; border: none; border-bottom: 1px solid var(--border);
    background: rgb(var(--accent-rgb) / 0.08); color: var(--text);
    font-family: inherit; font-size: 0.8rem; font-weight: 600;
    transition: background 0.15s;
  }
  .notif-push:hover { background: rgb(var(--accent-rgb) / 0.16); }
  .notif-empty { color: var(--dim); font-size: 0.82rem; padding: 20px 16px; }

  .notif-item {
    display: flex; align-items: flex-start; gap: 11px;
    padding: 12px 16px; border-bottom: 1px solid var(--border);
  }
  .notif-item:last-child { border-bottom: none; }

  .notif-av {
    width: 32px; height: 32px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
    border: 1px solid rgb(var(--accent-rgb) / 0.4); display: block;
  }
  .notif-zik {
    display: grid; place-items: center; background: var(--accent); color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1rem;
  }
  .notif-av img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .notif-body { flex: 1; min-width: 0; }
  .notif-body p { font-size: 0.82rem; line-height: 1.35; color: var(--mid); }
  .notif-body p a { color: var(--text); text-decoration: none; }
  .notif-body p a:hover { color: var(--accent); }
  .notif-body b { color: var(--text); font-weight: 600; }

  .notif-actions { display: flex; gap: 8px; margin-top: 8px; }
  .notif-btn {
    font-family: "Barlow Condensed", sans-serif; font-weight: 700; font-size: 0.64rem;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 5px 12px; border-radius: 99px; cursor: pointer;
    border: 1.5px solid var(--border2); background: none; color: var(--mid);
    transition: all 0.15s; text-decoration: none;
  }
  .notif-btn:hover { color: var(--text); border-color: rgb(var(--c-glass) / 0.4); }
  .notif-btn.accept { border-color: var(--accent); color: var(--accent); background: rgb(var(--accent-rgb) / 0.08); }
  .notif-btn:disabled { opacity: 0.55; cursor: default; }

  .notif-time {
    display: block; font-family: "JetBrains Mono", monospace; font-size: 0.58rem;
    color: var(--dim); margin-top: 6px;
  }

  .notif-dot {
    width: 7px; height: 7px; border-radius: 50%; background: var(--accent);
    flex-shrink: 0; margin-top: 5px; box-shadow: 0 0 8px rgb(var(--accent-rgb) / 0.6);
  }

  @media (max-width: 640px) {
    .notif-panel { position: fixed; left: 12px; right: 12px; top: calc(var(--nav-h) + 6px); width: auto; }
  }
</style>

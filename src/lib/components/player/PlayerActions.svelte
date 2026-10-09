<script>
  /**
   * Bouton « ⋯ » d'un joueur : voir le profil, ami, suivi, signalement.
   * Menu déroulant sur PC, feuille du bas sur mobile. Rendu dans <body> pour
   * échapper aux conteneurs qui coupent les débordements (content-visibility).
   */
  import { getContext, tick } from 'svelte';
  import ReportModal from '$lib/components/ReportModal.svelte';
  import { fetchPlayerId, fetchSocial, sendFollow, sendFriend } from './social.js';
  import { toast } from '$lib/toast.svelte.js';

  /** @type {{ username: string, userId?: string|null }} */
  let { username, userId = null } = $props();

  const ctx = getContext('zik');
  const viewer = $derived(ctx.user);
  const isSelf = $derived(!!viewer && (viewer.id === userId || viewer.profile?.username === username));

  let open = $state(false);
  let sheet = $state(false);
  let pos = $state('');
  let reportOpen = $state(false);
  let targetId = $state(null);
  let social = $state(null);
  let busy = $state(false);
  let trigger = $state();
  let menu = $state();

  const FRIEND = {
    none: { label: 'Ajouter en ami', icon: '+', action: 'request' },
    pending_in: { label: 'Accepter sa demande', icon: '✓', action: 'accept' },
    pending_out: { label: 'Demande envoyée', icon: '⏳', action: null },
    friends: { label: 'Déjà ami', icon: '★', action: null },
  };
  const friend = $derived(social ? FRIEND[social.friendStatus] ?? FRIEND.none : null);

  function portal(node) {
    document.body.appendChild(node);
    return () => node.remove();
  }

  async function loadSocial() {
    if (social || !viewer) return;
    try {
      targetId ??= userId ?? (await fetchPlayerId(ctx.sb, username));
      if (targetId) social = await fetchSocial(ctx.sb, targetId);
    } catch { /* réseau indisponible */ }
  }

  async function show() {
    sheet = matchMedia('(max-width: 640px)').matches;
    if (!sheet) {
      const r = trigger.getBoundingClientRect();
      const right = `right:${Math.max(8, innerWidth - r.right)}px`;
      pos = r.bottom + 240 > innerHeight
        ? `${right};bottom:${innerHeight - r.top + 6}px`
        : `${right};top:${r.bottom + 6}px`;
    }
    open = true;
    loadSocial();
    await tick();
    items()[0]?.focus();
  }

  function close(refocus = true) {
    if (!open) return;
    open = false;
    if (refocus) trigger?.focus();
  }

  const items = () => [...(menu?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])') ?? [])];

  function onMenuKey(e) {
    const list = items();
    const i = list.indexOf(document.activeElement);
    const go = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[e.key];
    if (go !== undefined) {
      e.preventDefault();
      list[(go + list.length) % list.length]?.focus();
    } else if (e.key === 'Tab') close(false);
  }

  function onWindowKey(e) {
    if (open && e.key === 'Escape') { e.preventDefault(); close(); }
  }

  function onOutside(e) {
    if (open && !sheet && !menu?.contains(e.target) && !trigger?.contains(e.target)) close(false);
  }

  async function run(fn, done) {
    if (busy || !targetId) return;
    busy = true;
    try {
      const res = await fn();
      if (!res) throw new Error();
      done(res);
    } catch {
      toast('Action impossible, réessaie', 'error');
    } finally {
      busy = false;
    }
  }

  function onFriend() {
    if (!friend?.action) return;
    run(() => sendFriend(ctx.sb, targetId, friend.action), (res) => {
      social = { ...social, friendStatus: res.friendStatus };
      toast(res.friendStatus === 'friends' ? `Vous êtes amis avec ${username}` : `Demande envoyée à ${username}`, 'success');
    });
  }

  function onFollow() {
    run(() => sendFollow(ctx.sb, targetId), (res) => {
      social = { ...social, viewerFollows: res.following };
      toast(res.following ? `Tu suis ${username}` : `Tu ne suis plus ${username}`, 'success');
    });
  }

  function onReport() {
    close(false);
    reportOpen = true;
  }

  function onLogin() {
    close(false);
    ctx.openAuthModal('login');
  }
</script>

<svelte:window
  onkeydown={onWindowKey}
  onpointerdown={onOutside}
  onresize={() => close(false)}
  onscroll={() => { if (!sheet) close(false); }}
/>

{#if !isSelf}
<div class="pa">
  <button
    bind:this={trigger}
    class="pa-trigger"
    class:on={open}
    onclick={() => (open ? close() : show())}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label="Actions pour {username}"
    title="Actions"
  >⋯</button>

  <div class="pa-layer" {@attach portal}>
    {#if open}
      {#if sheet}
        <button class="pa-backdrop" aria-label="Fermer le menu" tabindex="-1" onclick={() => close()}></button>
      {/if}
      <div bind:this={menu} class="pa-menu" class:sheet style={sheet ? '' : pos} role="menu" tabindex="-1" aria-label="Actions pour {username}" onkeydown={onMenuKey}>
        {#if sheet}<div class="pa-head"><span class="pa-grip"></span>{username}</div>{/if}
        <a class="pa-item" role="menuitem" href="/user/{encodeURIComponent(username)}" onclick={() => close(false)}><i>👤</i>Voir le profil</a>
        {#if viewer}
          {#if !social}
            <span class="pa-item pa-wait" role="menuitem" aria-disabled="true"><i>…</i>Chargement</span>
          {:else}
            <button class="pa-item" class:pa-state={!friend.action} role="menuitem" aria-disabled={!friend.action || busy} onclick={onFriend}><i>{friend.icon}</i>{friend.label}</button>
            <button class="pa-item" role="menuitem" aria-disabled={busy} onclick={onFollow}><i>{social.viewerFollows ? '✓' : '+'}</i>{social.viewerFollows ? 'Ne plus suivre' : 'Suivre'}</button>
          {/if}
          <button class="pa-item pa-danger" role="menuitem" onclick={onReport}><i>⚑</i>Signaler</button>
        {:else}
          <button class="pa-item pa-login" role="menuitem" onclick={onLogin}><i>→</i>Se connecter pour ajouter en ami, suivre ou signaler</button>
        {/if}
      </div>
    {/if}
    {#if viewer}
      <ReportModal
        bind:open={reportOpen}
        type="user"
        reportedUsername={username}
        reportedUserId={targetId}
        reporterId={viewer.id}
        reporterName={viewer.profile?.username ?? ''}
      />
    {/if}
  </div>
</div>
{/if}

<style>
  .pa { display: flex; }
  .pa-trigger {
    width: 34px; height: 34px; display: grid; place-items: center;
    background: none; border: 1px solid transparent; border-radius: var(--r);
    color: var(--mid); font-size: 1.3rem; line-height: 1; cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .pa-trigger:hover, .pa-trigger.on { color: var(--text); border-color: var(--border2); background: var(--surface2); }
  .pa-trigger:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .pa-layer { display: contents; }
  .pa-menu {
    position: fixed; z-index: 950; min-width: 220px; max-width: calc(100vw - 16px);
    display: flex; flex-direction: column; padding: 6px;
    background: var(--modal-bg); border: 1px solid var(--border2); border-radius: 10px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
    animation: pa-in 0.14s ease;
  }
  .pa-menu:focus { outline: none; }
  .pa-menu.sheet {
    left: 0; right: 0; bottom: 0; max-width: none;
    padding: 6px 12px calc(14px + env(safe-area-inset-bottom));
    border-radius: 16px 16px 0 0; border-bottom: none;
    animation: pa-up 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .pa-head {
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    padding: 4px 0 10px; margin-bottom: 4px; border-bottom: 1px solid var(--border);
    font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 1.15rem;
    text-transform: uppercase; letter-spacing: 0.04em; color: var(--text);
  }
  .pa-grip { width: 38px; height: 4px; border-radius: 4px; background: var(--border2); }
  .pa-backdrop {
    position: fixed; inset: 0; z-index: 949; border: none; padding: 0;
    background: var(--overlay); animation: pa-fade 0.15s ease;
  }

  .pa-item {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 9px 10px; border: none; border-radius: 7px; background: none;
    font: inherit; font-size: 0.88rem; font-weight: 600; text-align: left;
    color: var(--text); text-decoration: none; cursor: pointer;
  }
  .pa-item i { width: 18px; flex-shrink: 0; text-align: center; font-style: normal; color: var(--mid); }
  .pa-item:hover, .pa-item:focus-visible { background: var(--surface2); outline: none; }
  .pa-item[aria-disabled='true'] { cursor: default; }
  .pa-item[aria-disabled='true']:hover { background: none; }
  .pa-state, .pa-wait { color: var(--mid); }
  .pa-state i { color: var(--gold); }
  .pa-danger, .pa-danger i { color: var(--danger); }
  .pa-login { font-size: 0.82rem; color: var(--accent); }
  .pa-login i { color: var(--accent); }
  .sheet .pa-item { padding: 14px 10px; font-size: 0.98rem; }

  @keyframes pa-in { from { opacity: 0; transform: translateY(-4px); } }
  @keyframes pa-up { from { transform: translateY(100%); } }
  @keyframes pa-fade { from { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .pa-menu, .pa-backdrop { animation: none; }
  }
</style>

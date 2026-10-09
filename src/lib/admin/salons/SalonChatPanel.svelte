<script>
  import { tick, untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import { ago } from '$lib/admin/stats-utils.js';
  import { since } from './since.js';

  /** Chat en direct avec l'organisateur du salon, rafraîchi toutes les 2 s. */
  let { code, initial = null, busy, submit, onUnread = () => {} } = $props();

  const QUICK = [
    'Je regarde ton salon, je reviens vers toi.',
    "C'est réglé, tu peux reprendre.",
    "Peux-tu recharger l'écran TV ?",
  ];

  let support = $state(untrack(() => initial));
  let text = $state('');
  let sending = $state(false);
  let error = $state('');
  let list = $state();

  const time = (t) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const status = $derived(
    !support ? "Pas encore d'échange. Écris le premier message : il s'affiche sur la régie et l'écran TV."
    : !support.open ? `Demande close ${ago(new Date(support.closedAt).toISOString())}.`
    : support.requestedAt ? `Appelle un admin ${since(support.requestedAt)}.`
    : 'Échange en cours.',
  );
  const lastHost = $derived(support?.messages.findLast((m) => m.from === 'host')?.id ?? 0);
  $effect(() => onUnread(lastHost));

  async function refresh() {
    const r = await fetch(`/admin/salons/chat?code=${encodeURIComponent(code)}`).catch(() => null);
    if (r?.ok) support = (await r.json()).support;
  }

  $effect(() => {
    if (!code) return;
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  });

  $effect(() => {
    if (!support?.messages.length) return;
    tick().then(() => list?.scrollTo({ top: list.scrollHeight }));
  });

  async function send(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    sending = true;
    error = '';
    const r = await fetch('/admin/salons/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, text }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    sending = false;
    if (r?.ok) {
      support = d.support;
      text = '';
    } else error = d?.error ?? "L'envoi a échoué.";
  }

  const close = (opts) => {
    const after = submit(opts);
    return async (res) => {
      await after(res);
      refresh();
    };
  };
</script>

<section class="a-card chat">
  <header>
    <h3>Chat avec l'organisateur</h3>
    {#if support?.open}
      <form method="POST" action="?/closeSupport" use:enhance={close}>
        <input type="hidden" name="code" value={code} />
        <button class="a-btn small" disabled={busy}>Clore la demande</button>
      </form>
    {/if}
  </header>
  <p class="a-muted st" class:call={support?.open && support.requestedAt}>{status}</p>

  <ol bind:this={list}>
    {#each support?.messages ?? [] as m (m.id)}
      <li class={m.from}>
        <small>{m.from === 'admin' ? 'Toi' : 'Organisateur'} · {time(m.at)}</small>
        <p>{m.text}</p>
      </li>
    {/each}
  </ol>

  <div class="a-chips">
    {#each QUICK as q (q)}
      <button type="button" class="a-chip" onclick={() => (text = q)}>{q}</button>
    {/each}
  </div>
  <form class="send" onsubmit={send}>
    <input class="a-input" bind:value={text} maxlength="500" placeholder="Ton message…" aria-label="Message à l'organisateur" />
    <button class="a-btn primary" disabled={sending || !text.trim()}>Envoyer</button>
  </form>
  {#if error}<p class="a-err">{error}</p>{/if}
</section>

<style>
  .chat { display: grid; gap: 10px; min-width: 0; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  h3 { font-size: 0.8rem; font-weight: 700; color: var(--a-dim); text-transform: uppercase; letter-spacing: 0.04em; }
  .st { font-size: 0.85rem; }
  .st.call { color: var(--a-bad); font-weight: 600; }
  ol {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 340px;
    min-height: 120px;
    overflow-y: auto;
    padding: 10px;
    border-radius: 10px;
    background: var(--a-bg);
  }
  li { display: grid; gap: 3px; max-width: 85%; }
  li.admin { align-self: flex-end; text-align: right; }
  small { font-size: 0.72rem; color: var(--a-dim); }
  li p { padding: 8px 10px; border-radius: 10px; background: var(--a-surface2); overflow-wrap: anywhere; font-size: 0.9rem; }
  li.admin p { background: var(--a-accent-soft); }
  .send { display: flex; gap: 8px; }
  .send input { flex: 1; min-width: 0; }
</style>

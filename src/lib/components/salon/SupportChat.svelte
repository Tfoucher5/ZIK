<script>
  import { tick } from 'svelte';

  /**
   * Bulle du chat avec le support ZIK, repliable dans un coin de l'écran.
   * @type {{ chat: import('./supportChat.svelte.js').SupportChat, role: 'host'|'regie', onCall: () => void }}
   */
  let { chat, role, onCall } = $props();

  let text = $state('');
  let sending = $state(false);
  let error = $state('');
  let list = $state();

  const s = $derived(chat.state);
  const status = $derived(
    !s?.open ? 'Support terminé'
    : s.adminJoined ? 'Un admin est connecté'
    : s.requestedAt ? 'Demande envoyée, un admin va te répondre ici'
    : 'Le support ZIK te contacte',
  );
  const time = (at) => new Date(at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  $effect(() => {
    if (!chat.expanded || !s?.messages.length) return;
    tick().then(() => list?.scrollTo({ top: list.scrollHeight }));
  });

  // L'écran TV reste souvent sans personne devant : un échange clos s'efface
  $effect(() => {
    if (!s || s.open || chat.dismissed) return;
    const id = setTimeout(() => chat.dismiss(), 60_000);
    return () => clearTimeout(id);
  });

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    sending = true;
    error = '';
    const res = await chat.send(text);
    sending = false;
    if (res.ok) text = '';
    else error = res.error;
  }
</script>

{#if chat.visible}
  <div class="sc {role}">
    {#if chat.expanded}
      <section class="sc-panel" aria-label="Chat avec le support ZIK">
        <header>
          <div>
            <b>Support ZIK</b>
            <span class:live={s.open && s.adminJoined}>{status}</span>
          </div>
          {#if s.open}
            <button onclick={() => chat.toggle()} aria-label="Réduire le chat">–</button>
          {:else}
            <button onclick={() => chat.dismiss()} aria-label="Fermer le chat">×</button>
          {/if}
        </header>

        <ol bind:this={list} aria-live="polite">
          {#each s.messages as m (m.id)}
            <li class={m.from}>
              <small>{m.from === 'admin' ? 'Admin ZIK' : 'Toi'} · {time(m.at)}</small>
              <p>{m.text}</p>
            </li>
          {:else}
            <li class="sc-empty">Écris ce qui se passe, l'admin le lira ici.</li>
          {/each}
        </ol>

        {#if s.open}
          <form onsubmit={submit}>
            <input bind:value={text} maxlength="500" placeholder="Ta réponse…" aria-label="Message au support" />
            <button class="sx-btn sx-btn-primary" disabled={sending || !text.trim()}>Envoyer</button>
          </form>
          {#if error}<p class="sc-err" role="alert">{error}</p>{/if}
        {:else}
          <button class="sx-btn sc-recall" onclick={onCall}>Rappeler un admin</button>
        {/if}
      </section>
    {:else}
      <button class="sc-bubble" onclick={() => chat.toggle()} aria-label="Ouvrir le chat du support{chat.unread ? `, ${chat.unread} message${chat.unread > 1 ? 's' : ''} non lu${chat.unread > 1 ? 's' : ''}` : ''}">
        <span aria-hidden="true">💬</span> Support
        {#if chat.unread}<em>{chat.unread}</em>{/if}
      </button>
    {/if}
  </div>
{/if}

<style>
  .sc {
    position: fixed;
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    z-index: 95;
    display: flex;
    justify-content: flex-end;
    max-width: calc(100% - 32px);
  }
  .sc.regie { bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
  .sc-panel {
    display: flex;
    flex-direction: column;
    width: min(380px, calc(100vw - 32px));
    max-height: min(460px, 60dvh);
    background: var(--bg);
    color: var(--text);
    border: 2px solid var(--text);
    border-radius: 3px;
    box-shadow: 6px 6px 0 var(--accent);
    animation: sc-in 0.25s ease-out;
  }
  .host .sc-panel { width: min(440px, calc(100vw - 32px)); font-size: 1.08rem; }
  header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 12px 10px 14px;
    border-bottom: 1px solid var(--border2);
  }
  header div { flex: 1; display: grid; gap: 3px; min-width: 0; }
  header b {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 1.2rem;
    text-transform: uppercase;
  }
  header span { font-family: var(--s-mono); font-size: 0.74rem; color: var(--mid); }
  header span.live { color: var(--success); }
  header button {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    background: none;
    border: 1px solid var(--border2);
    border-radius: 3px;
    color: var(--text);
    font-size: 1.1rem;
    cursor: pointer;
  }
  ol {
    flex: 1;
    min-height: 60px;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  li { display: grid; gap: 3px; max-width: 85%; }
  li.host { align-self: flex-end; text-align: right; }
  li small { font-family: var(--s-mono); font-size: 0.68rem; color: var(--dim); }
  li p {
    margin: 0;
    padding: 8px 11px;
    border-radius: 3px;
    background: var(--bg2);
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  li.admin p { background: var(--accent); color: #000; font-weight: 600; }
  .sc-empty { max-width: none; color: var(--mid); font-size: 0.88rem; }
  form { display: flex; gap: 8px; padding: 10px 12px 12px; border-top: 1px solid var(--border2); }
  input {
    flex: 1;
    min-width: 0;
    padding: 10px 11px;
    border: 1px solid var(--border2);
    border-radius: 3px;
    background: var(--bg2);
    color: var(--text);
    font: inherit;
  }
  input:focus { outline: none; border-color: var(--accent); }
  form .sx-btn:disabled { opacity: 0.5; cursor: default; }
  .sc-err { margin: 0; padding: 0 12px 10px; color: var(--danger); font-size: 0.82rem; }
  .sc-recall { margin: 10px 12px 12px; }
  .sc-bubble {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--accent);
    color: #000;
    border: 2px solid #000;
    border-radius: 99px;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 10px 30px rgb(0 0 0 / 0.35);
  }
  .sc-bubble em {
    position: absolute;
    top: -8px;
    right: -6px;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    display: grid;
    place-items: center;
    border-radius: 99px;
    background: var(--danger);
    color: #fff;
    font-style: normal;
    font-size: 0.78rem;
  }
  @keyframes sc-in {
    from { opacity: 0; transform: translateY(10px); }
  }
</style>

<script>
  import { onMount, tick } from 'svelte';

  // Chat de la room. Sur ordinateur, la fenêtre se déplace et se redimensionne
  let { messages, username, onSend, onClose } = $props();

  const W_MIN = 260, W_MAX = 560, W_DEFAULT = 300;
  let input = $state('');
  let pos = $state(null); // { x, y } — null : ancré en bas à droite
  let width = $state(W_DEFAULT);
  let isMobile = $state(false);
  let listEl = $state(null);
  let drag = null;
  let resize = null;

  const panelStyle = $derived(
    isMobile ? '' :
    pos ? `left:${pos.x}px;top:${pos.y}px;right:auto;bottom:auto;width:${width}px;` :
    width !== W_DEFAULT ? `width:${width}px;` : ''
  );

  function clampPos(p) {
    const maxX = Math.max(0, window.innerWidth - 80);
    const maxY = Math.max(0, window.innerHeight - 60);
    return { x: Math.min(Math.max(0, p.x), maxX), y: Math.min(Math.max(0, p.y), maxY) };
  }

  function savePrefs() {
    try {
      localStorage.setItem('zik_chat_w', String(width));
      if (pos) localStorage.setItem('zik_chat_pos', JSON.stringify(pos));
    } catch { /* localStorage indisponible */ }
  }

  onMount(() => {
    isMobile = window.innerWidth <= 640;
    try {
      const w = parseInt(localStorage.getItem('zik_chat_w'));
      if (w >= W_MIN && w <= W_MAX) width = w;
      const p = JSON.parse(localStorage.getItem('zik_chat_pos') || 'null');
      if (p && typeof p.x === 'number' && typeof p.y === 'number') pos = clampPos(p);
    } catch { /* localStorage indisponible */ }
    const onResize = () => { isMobile = window.innerWidth <= 640; if (pos) pos = clampPos(pos); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  // Toujours sur le dernier message
  $effect(() => {
    messages.length;
    tick().then(() => { if (listEl) listEl.scrollTop = listEl.scrollHeight; });
  });

  function dragStart(e) {
    if (isMobile || e.target.closest('.g-chat-close')) return;
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function dragMove(e) {
    if (!drag) return;
    pos = clampPos({ x: e.clientX - drag.dx, y: e.clientY - drag.dy });
  }
  function dragEnd() {
    if (!drag) return;
    drag = null;
    savePrefs();
  }

  function resizeStart(e) {
    if (isMobile) return;
    resize = { startX: e.clientX, startW: width, startPosX: pos?.x ?? null };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function resizeMove(e) {
    if (!resize) return;
    const w = Math.min(W_MAX, Math.max(W_MIN, resize.startW - (e.clientX - resize.startX)));
    if (resize.startPosX !== null) pos = { x: resize.startPosX + (resize.startW - w), y: pos.y };
    width = w;
  }
  function resizeEnd() {
    if (!resize) return;
    resize = null;
    savePrefs();
  }

  function hue(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
  }
  function time(ts) {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    input = '';
  }
</script>

<div class="g-chat-panel" style={panelStyle}>
  {#if !isMobile}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="g-chat-resize"
      title="Redimensionner"
      onpointerdown={resizeStart}
      onpointermove={resizeMove}
      onpointerup={resizeEnd}
      onpointercancel={resizeEnd}
    ></div>
  {/if}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="g-chat-head"
    class:g-chat-head--draggable={!isMobile}
    onpointerdown={dragStart}
    onpointermove={dragMove}
    onpointerup={dragEnd}
    onpointercancel={dragEnd}
  >
    <span class="g-chat-head-title"><span class="g-chat-live"></span>Chat</span>
    <button class="g-chat-close" onclick={onClose} aria-label="Fermer le chat">&#x2715;</button>
  </div>
  <div class="g-chat-msgs" bind:this={listEl}>
    {#if messages.length === 0}
      <div class="g-chat-empty">
        <span class="g-chat-empty-ico">&#x1F4AC;</span>
        <span>Aucun message pour l&apos;instant</span>
        <small>Lance la conversation !</small>
      </div>
    {/if}
    {#each messages as m, i (m.ts + m.name)}
      {@const mine = !m.system && m.name === username}
      {@const admin = m.name.endsWith(' - admin')}
      {@const system = !!m.system}
      {@const grouped = i > 0 && messages[i - 1].name === m.name}
      <div
        class="g-chat-msg"
        class:g-chat-mine={mine}
        class:g-chat-admin={admin || system}
        class:g-chat-grouped={grouped}
        style="--h:{hue(m.name)}"
      >
        {#if !mine}
          <span class="g-chat-avatar">{system ? '🃏' : admin ? '★' : m.name[0].toUpperCase()}</span>
        {/if}
        <div class="g-chat-body">
          {#if !grouped && !mine}
            <span class="g-chat-author">{m.name}<span class="g-chat-time">{time(m.ts)}</span></span>
          {/if}
          <span class="g-chat-text" title={time(m.ts)}>{m.text}</span>
        </div>
      </div>
    {/each}
  </div>
  <div class="g-chat-input-row">
    <input
      class="g-chat-input"
      type="text"
      placeholder="Message&hellip;"
      maxlength="120"
      bind:value={input}
      autocomplete="off" autocorrect="off" spellcheck="false"
      onkeydown={e => { if (e.key === 'Enter') send(); }}
    >
    <button class="g-chat-send" onclick={send} aria-label="Envoyer">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .g-chat-resize {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 9px;
    cursor: ew-resize;
    touch-action: none;
    z-index: 1;
  }
  .g-chat-head--draggable {
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .g-chat-head--draggable:active { cursor: grabbing; }
</style>

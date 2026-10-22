<script>
  import { toast } from '$lib/client/toast.svelte.js';

  let { room, onClose, onJoin } = $props();

  const link = $derived(typeof location !== 'undefined' ? `${location.origin}/game?roomId=${room.code}` : '');

  function copy() {
    navigator.clipboard.writeText(link)
      .then(() => toast('Lien copié !', 'success'))
      .catch(() => toast('Copie impossible', 'error'));
  }
</script>

<div class="rc">
  <button class="rc-x" onclick={onClose} aria-label="Fermer">✕</button>
  <span class="rc-ok" aria-hidden="true">✓</span>
  <span class="rc-kicker">Room créée</span>
  <h2 id="rm-title" class="rc-name">{room.name}</h2>
  <p class="rc-sub">Partage ce code à tes amis pour qu'ils te rejoignent.</p>
  <div class="rc-code" aria-label="Code de la room {room.code}">
    {#each room.code.split('') as ch, i (i)}<b>{ch}</b>{/each}
  </div>
  <div class="rc-acts">
    <button class="btn-ghost" onclick={copy}>Copier le lien</button>
    <button class="btn-accent" onclick={onJoin}>Rejoindre maintenant →</button>
  </div>
</div>

<style>
  .rc { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 24px 26px; text-align: center; }
  .rc-x { position: absolute; top: 8px; right: 8px; width: 44px; height: 44px; border: none; background: none; color: var(--dim); cursor: pointer; }
  .rc-x:hover { color: var(--text); }
  .rc-ok {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    background: color-mix(in srgb, var(--success) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--success) 45%, transparent);
    color: var(--success);
    font-size: 1.3rem;
  }
  .rc-kicker { margin-top: 6px; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--success); }
  .rc-name { margin: 0; font-family: "Barlow Condensed", sans-serif; font-weight: 900; font-size: 1.7rem; text-transform: uppercase; line-height: 1.05; }
  .rc-sub { margin: 0; font-size: 0.82rem; color: var(--mid); }
  .rc-code { display: flex; gap: 6px; margin: 12px 0 8px; }
  .rc-code b {
    width: 44px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgb(var(--accent-rgb) / 0.45);
    border-radius: 11px;
    background: rgb(var(--accent-rgb) / 0.08);
    color: var(--accent);
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 1.6rem;
  }
  .rc-acts { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 6px; }
  .rc-acts button { min-height: 44px; }
  @media (max-width: 380px) { .rc-code b { width: 38px; height: 50px; font-size: 1.35rem; } }
</style>

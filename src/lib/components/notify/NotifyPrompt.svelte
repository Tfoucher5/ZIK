<script>
  import { getContext, onMount } from 'svelte';
  import { push, enablePush } from '$lib/client/push.svelte.js';
  import { notifPrefs, tokenGetter } from './notifPrefs.svelte.js';

  /**
   * Invitation à activer les notifications, posée là où elles ont du sens.
   * embedded : dans la visite guidée, ni « Plus tard » ni mémoire du refus.
   * @type {{ categories: string[], title: string, text: string, embedded?: boolean }}
   */
  let { categories, title, text, embedded = false } = $props();

  const SNOOZE_MS = 21 * 24 * 60 * 60 * 1000;
  // svelte-ignore state_referenced_locally
  const KEY = 'zik_notify_later_' + categories.join('_');

  const ctx = getContext('zik');
  const getToken = tokenGetter(ctx.sb);

  let snoozed = $state(true);
  let phase = $state('idle');

  const prefs = $derived(notifPrefs.value);
  const allOn = $derived(!!prefs && push.subscribed && categories.every((c) => prefs[c]));
  const visible = $derived(
    phase === 'done' ||
      (!!ctx.user && !!prefs && !allOn && (embedded || !snoozed) && push.permission !== 'denied' && (push.supported || push.needsInstall)),
  );

  onMount(() => {
    try {
      snoozed = Date.now() - Number(localStorage.getItem(KEY) || 0) < SNOOZE_MS;
    } catch {
      snoozed = false;
    }
  });

  $effect(() => {
    if (ctx.user) notifPrefs.load(getToken);
  });

  async function activate() {
    phase = 'busy';
    try {
      if (!push.subscribed) await enablePush(getToken);
      if (!push.subscribed) {
        phase = 'idle';
        return;
      }
      await notifPrefs.set(getToken, Object.fromEntries(categories.map((c) => [c, true])));
      phase = 'done';
    } catch {
      phase = 'idle';
    }
  }

  function later() {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* stockage indisponible */
    }
    snoozed = true;
  }
</script>

{#if visible}
  <aside class="np" class:embedded class:done={phase === 'done'}>
    <span class="np-bell" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" /></svg>
    </span>
    <div class="np-body">
      {#if phase === 'done'}
        <p class="np-title">C'est activé !</p>
        <p class="np-text">Tu changes ça quand tu veux dans <a href="/settings#notifications">Paramètres › Notifications</a>.</p>
      {:else if push.needsInstall}
        <p class="np-title">{title}</p>
        <p class="np-text">
          Sur iPhone, ajoute d'abord ZIK à l'écran d'accueil : <strong>Partager</strong> puis <strong>Sur l'écran d'accueil</strong>, et
          ouvre ZIK depuis l'icône.
        </p>
      {:else}
        <p class="np-title">{title}</p>
        <p class="np-text">{text}</p>
        <p class="np-note">Modifiable à tout moment dans <a href="/settings#notifications">Paramètres</a>.</p>
      {/if}
    </div>
    {#if phase !== 'done'}
      <div class="np-actions">
        {#if !push.needsInstall}
          <button class="btn-accent sm" onclick={activate} disabled={phase === 'busy'}>
            {phase === 'busy' ? '…' : 'Activer'}
          </button>
        {/if}
        {#if !embedded}
          <button class="np-later" onclick={later}>{push.needsInstall ? 'Compris' : 'Plus tard'}</button>
        {/if}
      </div>
    {/if}
  </aside>
{/if}

<style>
  .np {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 18px 0;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1px solid rgb(var(--accent-rgb) / 0.35);
    background: linear-gradient(120deg, rgb(var(--accent-rgb) / 0.14), rgb(var(--accent-rgb) / 0.04));
    color: var(--text);
    text-align: left;
    animation: np-in 0.4s ease;
  }
  .np.embedded {
    margin: 14px 0 0;
    padding: 12px;
  }
  .np.done {
    border-color: rgb(34 197 94 / 0.45);
    background: rgb(34 197 94 / 0.1);
  }

  .np-bell {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--on-accent, #fff);
  }
  .np-bell svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transform-origin: 50% 10%;
    animation: np-ring 2.6s ease-in-out infinite;
  }
  .np.done .np-bell {
    background: var(--success);
  }
  .np.done .np-bell svg {
    animation: none;
  }

  .np-body {
    flex: 1;
    min-width: 0;
  }
  .np-title {
    margin: 0;
    font-weight: 700;
    font-size: 0.95rem;
  }
  .np-text {
    margin: 2px 0 0;
    font-size: 0.85rem;
    line-height: 1.45;
    color: var(--mid);
  }
  .np-note {
    margin: 4px 0 0;
    font-size: 0.75rem;
    color: var(--dim);
  }
  .np a {
    color: var(--accent);
    font-weight: 600;
  }

  .np-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .np-later {
    background: none;
    border: none;
    padding: 4px;
    font: inherit;
    font-size: 0.82rem;
    color: var(--dim);
    cursor: pointer;
  }
  .np-later:hover {
    color: var(--text);
  }

  @keyframes np-in {
    from { opacity: 0; transform: translateY(8px); }
  }
  @keyframes np-ring {
    0%, 70%, 100% { transform: rotate(0); }
    74% { transform: rotate(16deg); }
    80% { transform: rotate(-14deg); }
    86% { transform: rotate(10deg); }
    92% { transform: rotate(-6deg); }
  }

  @media (max-width: 560px) {
    .np {
      flex-wrap: wrap;
    }
    .np-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .np, .np-bell svg { animation: none; }
  }
</style>

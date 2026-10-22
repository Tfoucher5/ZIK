<script>
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { toast } from '$lib/client/toast.svelte.js';
  import { push, enablePush, disablePush } from '$lib/client/push.svelte.js';
  import { notifPrefs, NOTIF_CATEGORIES } from '$lib/components/notify/notifPrefs.svelte.js';

  /** Réglages des notifications : cet appareil, puis chaque catégorie dans un menu dépliant. */
  let { getToken } = $props();

  // Arrivée depuis une invitation (lien /settings#notifications) : menu déjà ouvert.
  let open = $state(page.url.hash === '#notifications');

  const prefs = $derived(notifPrefs.value);
  const activeCount = $derived(prefs ? NOTIF_CATEGORIES.filter((c) => prefs[c.id]).length : 0);

  onMount(() => notifPrefs.load(getToken));

  async function toggleDevice(e) {
    try {
      if (e.currentTarget.checked) await enablePush(getToken);
      else await disablePush();
      if (push.permission === 'denied') toast('Notifications bloquées dans ton navigateur', 'error');
    } catch {
      toast("Impossible d'activer les notifications sur cet appareil", 'error');
    }
  }

  async function toggleCategory(id, on) {
    try {
      await notifPrefs.set(getToken, { [id]: on });
    } catch {
      toast('Réglage non enregistré, réessaie', 'error');
    }
  }
</script>

<div class="settings-row">
  <div class="settings-row-info">
    <div class="settings-row-label">Notifications sur cet appareil</div>
    <div class="settings-row-desc">
      {#if push.needsInstall}
        Sur iPhone et iPad : touche <strong>Partager</strong> puis <strong>Sur l'écran d'accueil</strong>, ouvre ZIK depuis
        l'icône, et reviens ici.
      {:else if !push.supported}
        Ton navigateur ne gère pas les notifications.
      {:else if push.permission === 'denied'}
        Bloquées dans ton navigateur : autorise les notifications pour zik-music.fr dans ses réglages.
      {:else if push.subscribed}
        Activées : tu es prévenu même quand ZIK est fermé.
      {:else}
        Reçois tes notifications même quand ZIK est fermé.
      {/if}
    </div>
  </div>
  {#if push.supported}
    <label class="toggle-switch" aria-label="Notifications sur cet appareil">
      <input
        type="checkbox"
        checked={push.subscribed}
        onchange={toggleDevice}
        disabled={push.busy || push.permission === 'denied'}
      />
      <span class="toggle-track"><span class="toggle-thumb"></span></span>
    </label>
  {/if}
</div>

{#if prefs}
  <details class="ns" bind:open>
    <summary class="ns-sum">
      <span class="ns-sum-info">
        <span class="settings-row-label">Choisir mes notifications</span>
        <span class="settings-row-desc">{activeCount} sur {NOTIF_CATEGORIES.length} activées</span>
      </span>
      <span class="ns-chevron" aria-hidden="true"></span>
    </summary>
    <div class="ns-list">
      {#each NOTIF_CATEGORIES as c (c.id)}
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">{c.label}</div>
            <div class="settings-row-desc">{c.desc}</div>
          </div>
          <label class="toggle-switch" aria-label={c.label}>
            <input type="checkbox" checked={!!prefs[c.id]} onchange={(e) => toggleCategory(c.id, e.currentTarget.checked)} />
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
          </label>
        </div>
      {/each}
    </div>
  </details>
{/if}

<style>
  .ns {
    border-bottom: 1px solid var(--border);
  }
  .ns-sum {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 16px 20px;
    cursor: pointer;
    list-style: none;
  }
  .ns-sum::-webkit-details-marker {
    display: none;
  }
  .ns-sum-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .ns-chevron {
    width: 10px;
    height: 10px;
    margin-right: 6px;
    border-right: 2px solid var(--mid);
    border-bottom: 2px solid var(--mid);
    transform: rotate(45deg) translateY(-3px);
    transition: transform 0.25s ease;
  }
  .ns[open] .ns-chevron {
    transform: rotate(-135deg) translateY(-3px);
  }
  .ns-list {
    margin: 0 20px 14px;
    border-left: 2px solid rgb(var(--accent-rgb) / 0.35);
    animation: ns-in 0.25s ease;
  }
  @keyframes ns-in {
    from { opacity: 0; transform: translateY(-6px); }
  }
</style>

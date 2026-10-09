<script>
  import { onMount } from 'svelte';
  import { toast } from '$lib/toast.svelte.js';
  import { push, enablePush, disablePush } from '$lib/push.svelte.js';

  /** Réglages des notifications : cet appareil, puis chaque catégorie. */
  let { getToken } = $props();

  const CATEGORIES = [
    { id: 'social', label: 'Amis et invitations', desc: "Demandes d'ami et invitations à rejoindre une room." },
    { id: 'cards', label: 'Cartes', desc: 'Carte qui monte de rareté, Mythique d’un ami, set presque terminé.' },
    { id: 'challenge', label: 'Défi de la semaine', desc: 'Nouveau défi le lundi, dernier jour le dimanche.' },
    { id: 'zikle', label: 'Rappel Zikle', desc: "Vers 18 h, si tu n'as pas encore fait le Zikle du jour." },
  ];

  let prefs = $state(null);

  async function api(method, body) {
    const r = await fetch('/api/push/prefs', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error();
    return r.json();
  }

  onMount(async () => {
    prefs = await api('GET').catch(() => null);
  });

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
    const before = prefs[id];
    prefs[id] = on;
    try {
      prefs = await api('PUT', { [id]: on });
    } catch {
      prefs[id] = before;
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
  {#each CATEGORIES as c (c.id)}
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
{/if}

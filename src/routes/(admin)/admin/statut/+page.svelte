<script>
  import { getContext, onMount } from 'svelte';
  import PageHeader from '$lib/components/admin/PageHeader.svelte';
  import HistoryBar from '$lib/components/statut/HistoryBar.svelte';
  import IncidentList from '$lib/components/statut/IncidentList.svelte';
  import { LEVEL_TEXT } from '$lib/shared/health/levels.js';

  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  // Unité de la valeur mesurée par chaque sonde
  const UNIT = { site: 'ms', db: 'ms', database: 'Mo', auth: 'ms', realtime: 'ms', deezer: 'ms', youtube: 'ms', spotify: 'ms', stripe: 'ms', mail: 'ms', eventLoop: 'ms', memory: 'Mo', errors: 'en 5 min', media: 'en 5 min', snapshots: 'en échec en 15 min', load: 'salons' };

  function depuis(s) {
    const h = Math.floor(s / 3600);
    return h >= 48 ? `${Math.floor(h / 24)} jours` : h ? `${h} h` : `${Math.floor(s / 60)} min`;
  }

  let status = $state(null);
  let failed = $state(false);
  let loading = $state(false);

  async function charger() {
    if (!token) return;
    loading = true;
    try {
      const res = await fetch(`/api/admin/health?token=${encodeURIComponent(token)}`);
      if (!res.ok) throw new Error();
      status = await res.json();
      failed = false;
    } catch {
      failed = true;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (token) charger();
  });
  onMount(() => {
    const t = setInterval(charger, 60_000);
    return () => clearInterval(t);
  });
</script>

<svelte:head><title>Statut - Admin ZIK</title></svelte:head>

<PageHeader title="Statut">
  <button class="a-btn small" type="button" onclick={charger} disabled={loading}>{loading ? '…' : 'Actualiser'}</button>
</PageHeader>

<div class="a-stack">
  {#if failed}
    <p class="ast-note">Impossible de lire l'état du serveur. <button class="a-btn small" type="button" onclick={charger}>Réessayer</button></p>
  {:else if !status}
    <p class="ast-note">Chargement…</p>
  {:else}
    <p class="ast-global {status.level}">État global : <b>{LEVEL_TEXT[status.level]}</b> · page publique <a href="/statut">/statut</a> · serveur démarré depuis {depuis(status.uptime)}{#if status.version} · v{status.version}{/if}</p>
    {#if !status.historyAvailable}
      <p class="ast-note">Historique illisible (base injoignable, ou migration <code>ops</code> pas encore appliquée) : les frises restent grises.</p>
    {/if}
    <ul class="ast-sondes">
      {#each status.probes as p (p.id)}
        <li>
          <div class="ast-ligne">
            <b>{p.label}</b>
            {#if p.level}
              <span class="ast-etat {p.level}">{LEVEL_TEXT[p.level]}</span>
            {:else}
              <span class="ast-etat">Pas encore mesuré</span>
            {/if}
          </div>
          {#if p.level}
            <p class="ast-detail">
              {#if p.value != null}{p.value} {UNIT[p.id] ?? ''}{/if}{#if p.detail} · {p.detail}{/if}{#if p.availability != null} · {p.availability.toLocaleString('fr-FR')} % sur 30 jours{/if}
            </p>
          {/if}
          <HistoryBar days={status.days} levels={p.history} />
        </li>
      {/each}
    </ul>
    <IncidentList incidents={status.incidents} />
    <p class="ast-note">Sondes toutes les 60 s. Perturbé : 2 échecs sur les 5 dernières mesures, ou 3 mesures lentes de suite. Incident : 3 échecs sur 5, jamais pour une simple lenteur (push et mail). Fin d’incident : 3 mesures de suite sans échec.</p>
  {/if}
</div>

<style>
  .ast-global b { color: var(--success); }
  .ast-global.suspect b { color: var(--warn); }
  .ast-global.incident b { color: var(--danger); }
  .ast-sondes {
    display: grid;
    gap: 18px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .ast-ligne {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .ast-etat { color: var(--mid); font-weight: 600; }
  .ast-etat.ok { color: var(--success); }
  .ast-etat.suspect { color: var(--warn); }
  .ast-etat.incident { color: var(--danger); }
  .ast-detail {
    margin: 4px 0 8px;
    color: var(--mid);
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }
  .ast-note { color: var(--mid); font-size: 0.85rem; }
</style>

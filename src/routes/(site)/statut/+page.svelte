<script>
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import NoticeBanner from '$lib/components/ui/NoticeBanner.svelte';
  import StatusTiles from '$lib/components/statut/StatusTiles.svelte';
  import StatusGroup from '$lib/components/statut/StatusGroup.svelte';
  import IncidentList from '$lib/components/statut/IncidentList.svelte';
  import { worst } from '$lib/shared/health/levels.js';

  let { data } = $props();
  const s = $derived(data.status);
  const global = $derived(worst(s.groups.map((g) => g.level)));
  const TITRE = {
    ok: 'Tout fonctionne normalement',
    suspect: 'Perturbations en cours',
    incident: 'Incident en cours',
  };

  // Serveur injoignable : on garde les dernières données, un rechargement direct
  // remplacerait la page par l'écran d'erreur, au pire moment pour cette page
  async function rafraichir() {
    const res = await fetch('/api/statut').catch(() => null);
    if (res?.ok) invalidateAll();
  }

  onMount(() => {
    const t = setInterval(rafraichir, 60_000);
    return () => clearInterval(t);
  });
</script>

<svelte:head>
  <title>État des services - ZIK</title>
  <meta name="description" content="État en direct du site ZIK, des soirées, de la musique, des paiements et des mails, avec la disponibilité et les incidents des 30 derniers jours.">
</svelte:head>

<main class="stt">
  <p class="sx-kicker">État des services</p>
  {#if s.checked}
    <h1 class="stt-titre {global}">{TITRE[global]}</h1>
  {:else}
    <h1 class="stt-titre">Vérification en cours</h1>
    <p class="stt-note">Le serveur vient de redémarrer : la première vérification arrive dans moins d'une minute.</p>
  {/if}

  {#if data.notice}<div class="stt-annonce"><NoticeBanner message={data.notice} /></div>{/if}

  <StatusTiles status={s} />

  <div class="stt-groupes">
    {#each s.groups as g (g.id)}
      <StatusGroup group={g} days={s.days} checked={s.checked} historyAvailable={s.historyAvailable} />
    {/each}
  </div>

  <IncidentList incidents={s.incidents} />

  {#if s.historyAvailable}
    <p class="stt-note">Chaque service est vérifié toutes les minutes. Chaque carré est une journée, de la plus ancienne (à gauche) à aujourd'hui : vert sans incident, jaune pour moins de 20 min d'incident, orange jusqu'à 1 h, rouge au-delà ou si le site est tombé, gris sans mesure. Un ralentissement n'est pas compté comme un incident. La disponibilité compte le temps hors incident.</p>
  {:else}
    <p class="stt-note">L'historique est momentanément indisponible.</p>
  {/if}
</main>

<style>
  .stt {
    max-width: 960px;
    margin: 0 auto;
    padding: 96px 16px 80px;
  }
  .stt-titre {
    margin: 8px 0 28px;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: clamp(2rem, 5vw, 3.2rem);
    text-transform: uppercase;
    line-height: 1;
  }
  .stt-titre.ok { color: var(--success); }
  .stt-titre.suspect { color: var(--warn); }
  .stt-titre.incident { color: var(--danger); }
  .stt-annonce { margin-bottom: 24px; }
  .stt-groupes {
    display: grid;
    gap: 16px;
    margin-bottom: 32px;
  }
  .stt-note {
    color: var(--mid);
    font-size: 0.9rem;
  }
</style>

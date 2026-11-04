<script>
  import HistoryBar from '$lib/components/statut/HistoryBar.svelte';
  import NoticeBanner from '$lib/components/ui/NoticeBanner.svelte';
  import { worst, LEVEL_TEXT } from '$lib/shared/health/levels.js';

  let { data } = $props();
  const s = $derived(data.status);
  const global = $derived(worst(s.groups.map((g) => g.level)));
  const TITRE = {
    ok: 'Tout fonctionne normalement',
    suspect: 'Perturbations en cours',
    incident: 'Incident en cours',
  };
</script>

<svelte:head>
  <title>État des services - ZIK</title>
  <meta name="description" content="État en direct du site ZIK, des soirées et de la musique, et historique des 30 derniers jours.">
</svelte:head>

<main class="stt">
  <p class="sx-kicker">État des services</p>
  {#if s.checked}
    <h1 class="stt-titre {global}">{TITRE[global]}</h1>
  {:else}
    <h1 class="stt-titre">Vérification en cours</h1>
    <p class="stt-note">Le serveur vient de redémarrer : la première vérification arrive dans moins d'une minute.</p>
  {/if}

  <div class="stt-annonce"><NoticeBanner message={data.notice} /></div>

  <ul class="stt-groupes">
    {#each s.groups as g (g.id)}
      <li>
        <div class="stt-ligne">
          <h2>{g.label}</h2>
          {#if s.checked}
            <span class="stt-etat {g.level}"><i aria-hidden="true"></i>{LEVEL_TEXT[g.level]}</span>
          {/if}
        </div>
        {#if s.historyAvailable}<HistoryBar days={s.days} levels={g.history} />{/if}
      </li>
    {/each}
  </ul>

  {#if s.historyAvailable}
    <p class="stt-note">Chaque carré est une journée, de la plus ancienne (à gauche) à aujourd'hui. Gris : pas encore de mesure.</p>
  {:else}
    <p class="stt-note">L'historique est momentanément indisponible.</p>
  {/if}
</main>

<style>
  .stt {
    max-width: 860px;
    margin: 0 auto;
    padding: 48px 16px 80px;
  }
  .stt-titre {
    margin: 8px 0 32px;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: clamp(2rem, 5vw, 3.2rem);
    text-transform: uppercase;
    line-height: 1;
  }
  .stt-titre.suspect { color: var(--warn); }
  .stt-titre.incident { color: var(--danger); }
  .stt-annonce:not(:empty) {
    margin-bottom: 32px;
  }
  .stt-groupes {
    display: grid;
    gap: 28px;
    margin: 0 0 24px;
    padding: 0;
    list-style: none;
  }
  .stt-ligne {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
  }
  .stt-ligne h2 {
    margin: 0;
    font-size: 1.1rem;
  }
  .stt-etat {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }
  .stt-etat i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--success);
  }
  .stt-etat.suspect i { background: var(--warn); }
  .stt-etat.incident i { background: var(--danger); }
  .stt-note {
    color: var(--mid);
    font-size: 0.9rem;
  }
</style>

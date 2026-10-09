<script>
  import { getContext, untrack } from 'svelte';
  import { invalidateAll, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import SalonLiveCard from '$lib/admin/salons/SalonLiveCard.svelte';
  import SalonFiche from '$lib/admin/salons/SalonFiche.svelte';
  import { ago } from '$lib/admin/stats-utils.js';
  import { FREE_MAX_PLAYERS } from '$lib/proPlans.js';

  let { data, form } = $props();

  const adminCtx = getContext('adminToken');
  const alerts = getContext('adminAlerts');
  const token = $derived(adminCtx?.token ?? '');

  const wanted = untrack(() => page.url.searchParams.get('code')?.toUpperCase() ?? null);
  let ficheCode = $state(wanted);
  let ficheOpen = $state(!!wanted);
  let fixer = $state(false);
  let busy = $state(false);

  const fiche = $derived(data.live.find((s) => s.code === ficheCode) ?? null);
  const calls = $derived(data.live.filter((s) => s.support?.open && s.support.requestedAt).length);

  // Les salons en cours bougent vite : rechargement toutes les 15 s, 5 s sur une fiche ouverte
  $effect(() => {
    const ms = ficheOpen ? 5_000 : 15_000;
    const id = setInterval(() => { if (!busy) invalidateAll(); }, ms);
    return () => clearInterval(id);
  });

  // Le badge de l'onglet suit les appels vus ici
  $effect(() => {
    if (alerts?.value && alerts.value.live.calls !== calls) untrack(() => alerts.refresh());
  });

  $effect(() => {
    if (ficheOpen) return;
    untrack(() => {
      fixer = false;
      if (page.url.searchParams.has('code')) {
        const url = new URL(page.url);
        url.searchParams.delete('code');
        replaceState(url, {});
      }
    });
  });

  function open(s, withFixer = false) {
    ficheCode = s.code;
    fixer = withFixer;
    ficheOpen = true;
    const url = new URL(page.url);
    url.searchParams.set('code', s.code);
    replaceState(url, {});
  }

  const submit = () => {
    busy = true;
    return async ({ update }) => {
      busy = false;
      await update({ reset: false });
    };
  };

  const feedback = $derived(form?.code && form.code === ficheCode ? form : null);
</script>

<div class="adm-page">
  <PageHeader title="Salons" />

  <div class="a-stack">
    <h2 class="a-h2">En direct{#if calls} · <span class="calling">{calls} appel{calls > 1 ? 's' : ''} à l'aide</span>{/if}</h2>
    <div class="live-grid">
    {#each data.live as s (s.code)}
      <SalonLiveCard {s} selected={ficheOpen && ficheCode === s.code} onOpen={(withFixer) => open(s, withFixer)} />
    {:else}
      <p class="a-card a-empty">Aucun salon en cours.</p>
    {/each}
    </div>
    {#if wanted && !data.live.some((s) => s.code === wanted)}
      <p class="a-card warn">Le salon {wanted} n'est plus en cours.</p>
    {/if}

    {#if data.videoIssues}
      <a class="a-card warn issues" href="/admin/reparer">
        <b>{data.videoIssues} vidéo{data.videoIssues > 1 ? 's' : ''} de salon à réparer</b>
        <span class="a-btn small">Réparer</span>
      </a>
    {/if}

    <div class="a-cols">
    <div>
    <h2 class="a-h2">Hôtes</h2>
    <p class="a-muted hint">Les hôtes gratuits qui butent sur la limite sont les meilleurs candidats au Pro.</p>
    <ul class="a-list">
      {#each data.hosts as h (h.id)}
        <li>
          <a class="a-row" href="/admin/users/{h.id}">
            <span class="a-row-main">
              <span class="a-row-title">{h.username}</span>
              <span class="a-row-sub">{h.games} partie{h.games > 1 ? 's' : ''} · jusqu'à {h.max} joueurs · {ago(h.last)}</span>
            </span>
            {#if h.pro}
              <em class="a-tag accent">Pro</em>
            {:else if h.limitHits}
              <em class="a-tag bad">{h.limitHits} refusé{h.limitHits > 1 ? 's' : ''}</em>
            {/if}
          </a>
        </li>
      {:else}
        <li class="a-empty">Aucun salon avec un hôte connecté ce mois-ci.</li>
      {/each}
    </ul>
    </div>
    <div>
    <h2 class="a-h2">Ces 30 derniers jours</h2>
    <div class="a-grid2">
      <div class="a-card stat"><span class="a-big">{data.month.games}</span><span class="lbl">parties de salon</span></div>
      <div class="a-card stat"><span class="a-big">{String(data.month.avgPlayers).replace('.', ',')}</span><span class="lbl">joueurs en moyenne</span></div>
      <div class="a-card stat" class:bad={data.month.limitHits}><span class="a-big">{data.month.limitHits}</span><span class="lbl">refusés par la limite de {FREE_MAX_PLAYERS}</span></div>
      <div class="a-card stat"><span class="a-big">{data.month.guests}</span><span class="lbl">parties d'hôtes sans compte</span></div>
    </div>
    </div>
    </div>

  </div>
</div>

<Sheet bind:open={ficheOpen} title="Salon {ficheCode ?? ''}" wide>
  {#if fiche}
    {#key ficheCode}
      <SalonFiche s={fiche} {token} {feedback} {busy} {submit} bind:fixer />
    {/key}
  {:else}
    <p class="a-empty">Ce salon est terminé ou fermé.</p>
  {/if}
</Sheet>

<style>
  .live-grid { display: grid; gap: 12px; }
  @media (min-width: 900px) { .live-grid { grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); } }
  .calling { color: var(--a-bad); }
  .issues { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .stat { display: grid; gap: 6px; }
  .stat.bad { border-color: rgba(248, 113, 113, 0.4); background: var(--a-bad-soft); }
  .lbl { font-size: 0.8rem; color: var(--a-muted); }
  .hint { margin-top: -6px; font-size: 0.82rem; }
</style>

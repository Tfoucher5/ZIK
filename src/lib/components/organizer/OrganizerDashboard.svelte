<script>
  import { getContext } from 'svelte';
  import ProSpaceTabs from './ProSpaceTabs.svelte';
  import OrganizerTools from './OrganizerTools.svelte';
  import OrganizerChecklist from './OrganizerChecklist.svelte';
  import OrganizerHelp from './OrganizerHelp.svelte';
  import VenueEvents from '$lib/components/venue/VenueEvents.svelte';
  import VenueLeague from '$lib/components/venue/VenueLeague.svelte';
  import { VenueAdmin } from '$lib/components/venue/venueAdmin.svelte.js';
  import { ProCheckout } from '$lib/components/pro/proCheckout.svelte.js';
  import { seasonLabel, venueTheme } from '$lib/venues.js';

  const zik = getContext('zik');
  const admin = new VenueAdmin(zik);
  const checkout = new ProCheckout(zik);
  const season = seasonLabel();

  let v = $derived(admin.venue);
  let plan = $derived.by(() => {
    const p = zik.user?.pro;
    if (!p) return '';
    if (p.plan === 'night') return `Passe Soirée jusqu'au ${checkout.endLabel}`;
    if (p.plan === 'manual') return `Accès offert jusqu'au ${checkout.endLabel}`;
    return `Formule ${p.plan === 'yearly' ? 'annuelle' : 'mensuelle'} · échéance le ${checkout.endLabel}`;
  });
</script>

<svelte:head>
  <link rel="stylesheet" href="/css/venue.css?v=3.18.0" />
</svelte:head>

<div class="vn-page" style={venueTheme(v?.color)}>
  <ProSpaceTabs active="dashboard" />

  <header class="od-head">
    {#if v?.logo}<img class="od-logo" src={v.logo} alt="" />{/if}
    <div class="od-id">
      <p class="od-hello">Espace organisateur</p>
      <h1 class="vn-title">{v?.name ?? zik.user?.profile?.username ?? 'Mon espace'}</h1>
      {#if plan}<p class="od-plan"><i></i>{plan}</p>{/if}
    </div>
    <div class="od-actions">
      <a class="vn-btn" href="/salon">Lancer une soirée</a>
      <a class="vn-btn vn-btn-ghost" href="/pro/lieu">Modifier mon lieu</a>
    </div>
  </header>

  {#if !admin.ready}
    <div class="od-loading" aria-label="Chargement"></div>
  {:else}
    <OrganizerChecklist {admin} />
  {/if}

  {#if admin.ready && v}
    <div class="od-stats">
      <div class="vn-card"><b>{admin.stats?.nights ?? 0}</b><span>soirée{admin.stats?.nights > 1 ? 's' : ''} en {season}</span></div>
      <div class="vn-card"><b>{admin.stats?.games ?? 0}</b><span>partie{admin.stats?.games > 1 ? 's' : ''} jouée{admin.stats?.games > 1 ? 's' : ''}</span></div>
      <div class="vn-card"><b>{admin.ranking.length}</b><span>joueur{admin.ranking.length > 1 ? 's' : ''} au classement</span></div>
      <div class="vn-card"><b>{admin.followers}</b><span>joueur{admin.followers > 1 ? 's' : ''} sui{admin.followers > 1 ? 'vent' : 't'} votre lieu</span></div>
    </div>

    <div class="od-grid">
      <section class="vn-card">
        <div class="vn-card-head">
          <h2>Prochaines soirées</h2>
          <a class="od-more" href="/pro/lieu#soirees">Gérer</a>
        </div>
        <VenueEvents events={admin.events.slice(0, 3)} empty="Aucune date annoncée. Ajoutez vos prochaines soirées pour qu'elles apparaissent sur votre page." />
      </section>

      <section class="vn-card">
        <div class="vn-card-head">
          <h2>Classement de {season}</h2>
          <a class="od-more" href="/lieu/{v.slug}" target="_blank">Tout voir</a>
        </div>
        <VenueLeague ranking={admin.ranking.slice(0, 6)} {season} />
      </section>
    </div>
  {/if}

  <section class="od-tools">
    <h2>Outils</h2>
    <OrganizerTools venue={v} {checkout} />
  </section>

  <OrganizerHelp />
</div>

<style>
  .od-head { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; margin-bottom: 28px; }
  .od-logo { width: 76px; height: 76px; padding: 8px; border-radius: 18px; background: #fff; object-fit: contain; }
  .od-id { flex: 1; min-width: 220px; }
  .od-hello { font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); margin-bottom: 4px; }
  .od-plan { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 0.85rem; color: var(--mid); }
  .od-plan i { width: 8px; height: 8px; border-radius: 50%; background: var(--success); }
  .od-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .od-loading { height: 280px; border-radius: 16px; background: var(--surface); animation: od-pulse 1.2s ease-in-out infinite alternate; }
  @keyframes od-pulse { to { opacity: 0.5; } }
  .od-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
  .od-stats .vn-card { display: flex; flex-direction: column; gap: 2px; padding: 18px 20px; }
  .od-stats b { font-family: "Barlow Condensed", sans-serif; font-size: 2.2rem; font-weight: 900; line-height: 1; color: var(--text); }
  .od-stats span { font-size: 0.8rem; color: var(--mid); }
  .od-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-items: start; }
  .od-more { font-size: 0.85rem; font-weight: 700; color: var(--accent); text-decoration: none; }
  .od-tools { margin-top: 32px; }
  .od-tools h2 { font-family: "Barlow Condensed", sans-serif; font-size: 1.35rem; font-weight: 800; margin-bottom: 14px; }
  @media (max-width: 860px) {
    .od-grid { grid-template-columns: 1fr; }
    .od-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 600px) {
    .od-actions, .od-actions .vn-btn { width: 100%; }
  }
</style>

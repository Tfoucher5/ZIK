<script>
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/components/admin/PageHeader.svelte';
  import Sheet from '$lib/components/admin/Sheet.svelte';
  import CardsTodo from '$lib/components/admin/cards/CardsTodo.svelte';
  import CardsGrants from '$lib/components/admin/cards/CardsGrants.svelte';
  import CardsRarities from '$lib/components/admin/cards/CardsRarities.svelte';
  import CardsSearch from '$lib/components/admin/cards/CardsSearch.svelte';
  import CardsWatch from '$lib/components/admin/cards/CardsWatch.svelte';
  import CardDetail from '$lib/components/admin/cards/CardDetail.svelte';
  import CorrectCardForm from '$lib/components/admin/cards/CorrectCardForm.svelte';
  import { CardsAdmin, nf } from '$lib/components/admin/cards/cardsAdmin.svelte.js';

  let { data, form } = $props();

  const c = new CardsAdmin(() => data);

  const catalog = $derived(data.stats.rarity.reduce((s, r) => s + r.catalog, 0));
  const todo = $derived(data.stats.reports + data.stats.signals);
</script>

<!-- display: contents, racine des styles partagés par les sections et les fenêtres -->
<div class="cards-adm">
<div class="adm-page">
  <PageHeader title="Cartes" />

  <div class="a-stack">
    {#if form?.message}<p class="a-card good flash">{form.message}</p>{/if}
    {#if form?.error && !c.fixOpen}<p class="a-card bad flash">{form.error}</p>{/if}

    <div class="a-kpis">
      <div class="a-kpi">
        <span class="a-kpi-label">Cartes en circulation</span>
        <span class="a-kpi-value">{nf(data.stats.owned)}</span>
        <span class="a-kpi-sub">{nf(catalog)} au catalogue · {nf(data.stats.sets)} sets</span>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Gains en attente</span>
        <span class="a-kpi-value">{nf(data.stats.grants.pending)}</span>
        <span class="a-kpi-sub">{nf(data.stats.grants.granted)} déjà données</span>
      </div>
      <div class="a-kpi">
        <span class="a-kpi-label">Gains retirés</span>
        <span class="a-kpi-value">{nf(data.stats.grants.revoked)}</span>
        <span class="a-kpi-sub">{nf(data.stats.grants.lost)} perdues en jeu</span>
      </div>
      <a class="a-kpi" class:hot={data.stats.signals} href="#a-traiter">
        <span class="a-kpi-label">Signaux de triche</span>
        <span class="a-kpi-value">{nf(data.stats.signals)}</span>
        <span class="a-kpi-sub">à revoir</span>
      </a>
      <a class="a-kpi" class:hot={data.stats.reports} href="#a-traiter">
        <span class="a-kpi-label">Cartes signalées</span>
        <span class="a-kpi-value">{nf(data.stats.reports)}</span>
        <span class="a-kpi-sub">par les joueurs</span>
      </a>
    </div>

    <div class="a-cols">
      <div>
        <CardsTodo {c} reports={data.reports} signals={data.signals} {todo} />
        <CardsGrants {c} grants={data.grants} filters={data.filters} />
      </div>

      <div>
        <CardsRarities {c} rarity={data.stats.rarity} {catalog} provisional={data.stats.provisional} />
        <CardsSearch {c} results={data.search.results} rarity={data.search.rarity} cardNumber={data.cardNumber} card={data.card} />
        <CardsWatch {c} pairs={data.pairs} audit={form?.audit} />
      </div>
    </div>
  </div>
</div>

<Sheet bind:open={c.confirmOpen} title={c.confirm?.title ?? ''}>
  {#if c.confirm}
    <p class="sheet-text">{c.confirm.text}</p>
    <p class="a-muted sheet-text">L'action est enregistrée dans le journal.</p>
    <form method="POST" action="?/{c.confirm.action}" use:enhance={c.submitting} class="a-btns">
      {#each Object.entries(c.confirm.fields) as [name, value] (name)}<input type="hidden" {name} {value} />{/each}
      <button type="button" class="a-btn" onclick={() => (c.confirmOpen = false)}>Annuler</button>
      <button class="a-btn danger" disabled={c.busy}>Confirmer</button>
    </form>
  {/if}
</Sheet>

<Sheet bind:open={c.fixOpen} title="Corriger la carte">
  {#if c.fixing}
    <CorrectCardForm {c} card={c.fixing.card} reportId={c.fixing.reportId} error={form?.error} />
  {/if}
</Sheet>

<Sheet bind:open={() => !!data.card, (v) => !v && c.go({ card: null })} title={data.card ? `Carte n° ${data.card.number}` : ''} wide>
  {#if data.card}
    <CardDetail {c} card={data.card} error={form?.error} />
  {/if}
</Sheet>
</div>

<style>
  .cards-adm { display: contents; }
  .cards-adm :global([data-r]) { --rc: #8b9099; }
  .cards-adm :global([data-r='uncommon']) { --rc: #2fbf71; }
  .cards-adm :global([data-r='rare']) { --rc: #3b82f6; }
  .cards-adm :global([data-r='epic']) { --rc: #9b5cf6; }
  .cards-adm :global([data-r='legendary']) { --rc: #e8b84a; }
  .cards-adm :global([data-r='mythic']) { --rc: #ff4fc8; }

  .cards-adm :global(.dot) { display: inline-block; flex: 0 0 auto; width: 9px; height: 9px; margin-right: 6px; border-radius: 50%; background: var(--rc); vertical-align: 1px; }
  .cards-adm :global(.bar) { flex: 0 0 4px; align-self: stretch; border-radius: 4px; background: var(--rc); }

  .flash { font-size: 0.9rem; font-weight: 600; }
  a.a-kpi { color: inherit; text-decoration: none; }
  .a-kpi.hot { border-color: rgba(251, 191, 36, 0.45); background: var(--a-warn-soft); }
  .cards-adm :global(.count) { font-size: 0.82rem; }
  .cards-adm :global(.note) { font-size: 0.82rem; line-height: 1.45; }
  .cards-adm :global(.sub) { margin-top: 4px; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--a-dim); }

  .cards-adm :global(.item) { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; padding: 12px 14px; border: 1px solid var(--a-line); border-radius: 14px; background: var(--a-bg); }
  .cards-adm :global(.item-main) { flex: 1 1 240px; min-width: 0; display: grid; gap: 4px; font-size: 0.9rem; }
  .cards-adm :global(.item .a-btns) { flex: 0 1 auto; }
  .cards-adm :global(.item .a-btns form) { display: contents; }
  .cards-adm :global(.card-name) { overflow: hidden; color: var(--a-fg); text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
  .cards-adm :global(a.card-name:hover b) { color: var(--a-accent); }
  .cards-adm :global(.who) { color: var(--a-cyan); font-weight: 700; text-decoration: none; }
  .cards-adm :global(.who:hover) { text-decoration: underline; }

  .cards-adm :global(.mini) { display: grid; gap: 6px; padding: 12px; }
  .cards-adm :global(.mini .a-big) { font-size: 1.6rem; }
  .cards-adm :global(.mini .a-muted) { font-size: 0.78rem; }
  .cards-adm :global(.sheet-text) { margin-bottom: 10px; }
</style>

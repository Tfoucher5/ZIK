<script>
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import ZikleTrackSearch from '$lib/admin/ZikleTrackSearch.svelte';
  import { pct } from '$lib/admin/stats-utils.js';

  let { data, form } = $props();

  const dateLabel = $derived(new Date(`${data.date}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  const time = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
  const dec = (n) => (n == null ? '—' : String(n).replace('.', ','));
  const avg = (arr) => (arr.length ? Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10 : null);

  const won = $derived(data.results.filter((r) => r.won));
  const stats = $derived({
    players: data.results.length,
    winRate: pct(won.length, data.results.length),
    attempts: avg(won.map((r) => r.attempts)),
    seconds: avg(won.filter((r) => r.solve_time_seconds).map((r) => r.solve_time_seconds)),
  });
  const dist = $derived.by(() => {
    const rows = [1, 2, 3, 4, 5, 6].map((n) => ({ label: `${n} essai${n > 1 ? 's' : ''}`, n: won.filter((r) => r.attempts === n).length, good: true }));
    rows.push({ label: 'Pas trouvé', n: data.results.length - won.length, good: false });
    return rows;
  });
  const distMax = $derived(Math.max(1, ...dist.map((d) => d.n)));

  let pickOpen = $state(false);
  let wipeOpen = $state(false);
  let toDelete = $state(null);
  let delOpen = $state(false);
  let busy = $state(false);

  const submit = () => {
    busy = true;
    return async ({ result, update }) => {
      await update({ reset: false });
      busy = false;
      if (result.type === 'success') {
        pickOpen = false;
        wipeOpen = false;
        delOpen = false;
      }
    };
  };
</script>

<div class="adm-page">
  <PageHeader title="Zikle n°{data.dayNumber}">
    <a class="a-btn small" href="/admin/zikle">Calendrier</a>
  </PageHeader>

  <div class="a-stack">
    <nav class="daynav" aria-label="Autres jours">
      {#if data.prev}<a class="a-btn small" href="/admin/zikle/{data.prev}">← Veille</a>{:else}<span></span>{/if}
      <b>{dateLabel}</b>
      {#if data.next}<a class="a-btn small" href="/admin/zikle/{data.next}">Lendemain →</a>{:else}<span></span>{/if}
    </nav>

    {#if form?.done}<p class="a-card good">{form.done}</p>{/if}
    {#if form?.error}<p class="a-card bad">{form.error}</p>{/if}

    <div class="a-cols">
      <div>
        <section class="a-section song">
          {#if data.daily.tracks?.cover_url}<img class="big-cover" src={data.daily.tracks.cover_url} alt="" />{/if}
          <div class="song-txt">
            <span class="a-kpi-label">Titre à deviner</span>
            <b>{data.daily.tracks?.title}</b>
            <span>{data.daily.tracks?.artist}</span>
            <button class="a-btn small" type="button" onclick={() => (pickOpen = true)}>Changer le titre</button>
          </div>
        </section>

        <div class="a-kpis">
          <div class="a-kpi"><span class="a-kpi-label">Joueurs</span><span class="a-kpi-value">{stats.players}</span></div>
          <div class="a-kpi"><span class="a-kpi-label">Ont trouvé</span><span class="a-kpi-value">{dec(stats.winRate)} %</span></div>
          <div class="a-kpi"><span class="a-kpi-label">Essais pour trouver</span><span class="a-kpi-value">{dec(stats.attempts)}</span></div>
          <div class="a-kpi"><span class="a-kpi-label">Temps pour trouver</span><span class="a-kpi-value">{stats.seconds == null ? '—' : `${Math.round(stats.seconds)} s`}</span></div>
        </div>
      </div>

      <section class="a-section">
        <div class="a-section-head"><h2>Répartition des essais</h2></div>
        {#if data.results.length}
          <ul class="dist">
            {#each dist as d (d.label)}
              <li>
                <span class="dl">{d.label}</span>
                <span class="bar"><i class:lost={!d.good} style:width="{(d.n / distMax) * 100}%"></i></span>
                <span class="dn"><b>{d.n}</b> <small>{pct(d.n, data.results.length)} %</small></span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="a-empty">Personne n'a encore joué ce jour-là.</p>
        {/if}
      </section>
    </div>

    <div class="a-section-head">
      <h2 class="a-h2">Résultats</h2>
      {#if data.results.length}
        <button class="a-btn small danger" type="button" onclick={() => (wipeOpen = true)}>Tout effacer</button>
      {/if}
    </div>
    <ul class="a-list results">
      {#each data.results as r (r.id)}
        <li class="a-row">
          <span class="a-row-main">
            <a class="a-row-title" href="/admin/users/{r.user_id}">{r.profiles?.username ?? 'Joueur supprimé'}</a>
            <span class="a-row-sub">joué à {time(r.created_at)}{r.won && r.solve_time_seconds ? ` · trouvé en ${r.solve_time_seconds} s` : ''}</span>
          </span>
          {#if r.won}
            <em class="a-tag good">{r.attempts}/6</em>
          {:else}
            <em class="a-tag bad">Raté</em>
          {/if}
          <button class="a-btn small" type="button" aria-label="Supprimer le résultat de {r.profiles?.username ?? 'ce joueur'}" onclick={() => { toDelete = r; delOpen = true; }}>Supprimer</button>
        </li>
      {:else}
        <li class="a-empty">Aucun résultat.</li>
      {/each}
    </ul>
  </div>
</div>

<Sheet bind:open={pickOpen} title="Changer le titre">
  <p class="hint a-muted">Les joueurs qui ont déjà joué gardent leur résultat.</p>
  <form method="POST" action="?/setTrack" use:enhance={submit}>
    <ZikleTrackSearch disabled={busy} />
  </form>
</Sheet>

<Sheet bind:open={wipeOpen} title="Effacer les résultats">
  <p>Supprimer les <b>{data.results.length}</b> résultats de ce jour ? Les joueurs pourront rejouer.</p>
  <form method="POST" action="?/deleteAllResults" class="a-btns confirm" use:enhance={submit}>
    <button class="a-btn danger" type="submit" disabled={busy}>Oui, tout effacer</button>
  </form>
</Sheet>

<Sheet bind:open={delOpen} title="Supprimer un résultat">
  {#if toDelete}
    <p>Supprimer le résultat de <b>{toDelete.profiles?.username ?? 'ce joueur'}</b> ? Il pourra rejouer ce Zikle.</p>
    <form method="POST" action="?/deleteResult" class="a-btns confirm" use:enhance={submit}>
      <input type="hidden" name="id" value={toDelete.id} />
      <button class="a-btn danger" type="submit" disabled={busy}>Supprimer</button>
    </form>
  {/if}
</Sheet>

<style>
  .daynav { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .daynav b { font-size: 0.9rem; text-align: center; text-transform: capitalize; }
  .song { display: flex; align-items: center; gap: 16px; background: linear-gradient(160deg, var(--a-accent-soft), var(--a-surface) 55%); }
  .big-cover { width: 96px; height: 96px; border-radius: 12px; object-fit: cover; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4); }
  .song-txt { display: grid; gap: 4px; justify-items: start; min-width: 0; }
  .song-txt b { font-family: var(--a-display); font-size: 1.7rem; line-height: 1.05; overflow-wrap: anywhere; }
  .song-txt > span:not(.a-kpi-label) { color: var(--a-muted); }
  .song-txt .a-btn { margin-top: 6px; }

  .dist { display: grid; gap: 8px; list-style: none; }
  .dist li { display: grid; grid-template-columns: 78px 1fr 72px; align-items: center; gap: 10px; font-size: 0.85rem; }
  .dl { color: var(--a-muted); }
  .bar { height: 18px; border-radius: 5px; background: var(--a-surface2); overflow: hidden; }
  .bar i { display: block; height: 100%; min-width: 2px; border-radius: 5px; background: var(--a-good); }
  .bar i.lost { background: var(--a-bad); }
  .dn { text-align: right; font-variant-numeric: tabular-nums; }
  .dn small { color: var(--a-dim); }

  .results .a-row-title { color: var(--a-fg); }
  .results .a-row-title:hover { color: var(--a-accent); }
  .hint { margin-bottom: 12px; font-size: 0.85rem; }
  .confirm { margin-top: 14px; }
</style>

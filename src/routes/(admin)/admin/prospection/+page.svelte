<script>
  import { getContext } from 'svelte';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import { ago } from '$lib/admin/stats-utils.js';

  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let data = $state(null);
  let error = $state('');
  let loading = $state(true);
  let showHandled = $state(false);
  let copied = $state(null);
  let W = $state(600);

  const CAT = {
    interested: { label: 'Intéressé', tone: 'good', rank: 0 },
    question: { label: 'Question', tone: 'accent', rank: 1 },
    todo: { label: 'À trier', tone: 'warn', rank: 2 },
    feedback: { label: 'Retour', tone: '', rank: 3 },
    other: { label: 'Autre', tone: '', rank: 4 },
    not_interested: { label: 'Pas intéressé', tone: 'bad', rank: 5 },
    stop: { label: 'Stop', tone: 'bad', rank: 6 },
  };
  const KIND = { bar: 'Bar', camping: 'Camping', association: 'Association' };
  const SIDE = [
    ['new', 'À contacter'],
    ['sent', 'Contactés, sans réponse'],
    ['followed_up', 'Relancés'],
    ['unsubscribed', 'Ont dit stop'],
    ['bounced', 'Adresse invalide'],
  ];

  const f = $derived(data?.funnel ?? {});
  const total = $derived(Object.values(f).reduce((n, v) => n + v, 0));
  const steps = $derived.by(() => {
    const sent = total - (f.new ?? 0);
    const answered = (f.replied ?? 0) + (f.interested ?? 0) + (f.unsubscribed ?? 0);
    return [
      { label: 'Prospects', value: total, color: 'var(--a-violet)' },
      { label: 'Emails envoyés', value: sent, color: 'var(--a-cyan)' },
      { label: 'Réponses', value: answered, color: 'var(--a-accent)' },
      { label: 'Intéressés', value: f.interested ?? 0, color: 'var(--a-warn)' },
      { label: 'Clients', value: data?.clients.length ?? 0, color: 'var(--a-good)' },
    ];
  });
  const width = (v) => (total ? 22 + (78 * Math.log1p(v)) / Math.log1p(total) : 22);
  const rate = (a, b) => (b ? `${String(Math.round((a / b) * 1000) / 10).replace('.', ',')} %` : '—');

  const catOf = (r) => CAT[r.category ?? 'todo'] ?? CAT.other;
  const replies = $derived(
    (data?.replies ?? [])
      .filter((r) => showHandled || !r.handled)
      .sort((a, b) => a.handled - b.handled || catOf(a).rank - catOf(b).rank || b.received_at.localeCompare(a.received_at)),
  );
  const todo = $derived((data?.replies ?? []).filter((r) => !r.handled).length);
  const hot = $derived((data?.replies ?? []).filter((r) => !r.handled && ['interested', 'question'].includes(r.category)).length);

  const days = $derived.by(() => {
    const by = Object.fromEntries((data?.perDay ?? []).map((d) => [d.day, d]));
    return Array.from({ length: 30 }, (_, i) => {
      const day = new Date(Date.now() - (29 - i) * 86400_000).toISOString().slice(0, 10);
      return { day, contacts: by[day]?.contacts ?? 0, relances: by[day]?.relances ?? 0 };
    });
  });
  const sent30 = $derived(days.reduce((n, d) => n + d.contacts + d.relances, 0));
  const maxDay = $derived(Math.max(1, ...days.map((d) => d.contacts + d.relances)));
  const CH = 100;
  const bw = $derived(W / 30);
  const yh = (v) => (v / maxDay) * (CH - 12);

  async function load() {
    if (!token) return;
    loading = true;
    try {
      const r = await fetch(`/api/admin/prospection?token=${encodeURIComponent(token)}`);
      const d = await r.json();
      if (r.ok) {
        data = d;
        error = '';
      } else error = d.error ?? 'Chargement impossible.';
    } catch {
      error = 'Chargement impossible.';
    }
    loading = false;
  }

  async function toggle(reply) {
    reply.handled = !reply.handled;
    const res = await fetch('/api/admin/prospection', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, id: reply.id, handled: reply.handled }),
    }).catch(() => null);
    if (!res?.ok) reply.handled = !reply.handled;
  }

  async function copy(r) {
    try {
      await navigator.clipboard.writeText(r.suggested_reply);
      copied = r.id;
      setTimeout(() => copied === r.id && (copied = null), 1500);
    } catch {
      copied = null;
    }
  }

  const mailto = (r) =>
    `mailto:${r.from_email}?subject=${encodeURIComponent('Re: ' + (r.subject ?? ''))}${r.suggested_reply ? `&body=${encodeURIComponent(r.suggested_reply)}` : ''}`;
  const where = (p) => [KIND[p?.kind], p?.city].filter(Boolean).join(' · ');
  const date = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  $effect(() => {
    if (token) load();
  });
</script>

<div class="adm-page">
  <PageHeader title="Prospection">
    <button class="a-btn small" type="button" onclick={load} disabled={loading}>{loading ? '…' : 'Actualiser'}</button>
  </PageHeader>

  <div class="a-stack">
    <p class="a-muted intro">Mails envoyés depuis theo@zik-music.fr par la routine, du lundi au vendredi. Les réponses sont triées par Claude chaque matin.</p>

    {#if loading && !data}
      <p class="a-card a-empty">Chargement…</p>
    {:else if error}
      <p class="a-card bad">{error}</p>
    {:else if data}
      <div class="a-kpis">
        <div class="a-kpi" class:hot>
          <span class="a-kpi-label">Réponses à traiter</span>
          <span class="a-kpi-value">{todo}</span>
          <span class="a-kpi-sub">{hot ? `dont ${hot} intéressé${hot > 1 ? 's' : ''} ou question${hot > 1 ? 's' : ''}` : 'rien d’urgent'}</span>
        </div>
        <div class="a-kpi">
          <span class="a-kpi-label">Taux de réponse</span>
          <span class="a-kpi-value">{rate(steps[2].value, steps[1].value)}</span>
          <span class="a-kpi-sub">{steps[2].value} sur {steps[1].value} emails</span>
        </div>
        <div class="a-kpi">
          <span class="a-kpi-label">Envois sur 30 jours</span>
          <span class="a-kpi-value">{sent30}</span>
          <span class="a-kpi-sub">premiers contacts et relances</span>
        </div>
        <div class="a-kpi">
          <span class="a-kpi-label">Devenus clients</span>
          <span class="a-kpi-value">{data.clients.length}</span>
          <span class="a-kpi-sub">{rate(data.clients.length, steps[1].value)} des contactés</span>
        </div>
      </div>

      <div class="a-cols">
        <section class="a-section">
          <div class="a-section-head"><h2>Entonnoir</h2></div>
          <ol class="funnel">
            {#each steps as s, i (s.label)}
              <li>
                <div class="f-bar" style="width:{width(s.value)}%; background:{s.color}">
                  <b>{s.value.toLocaleString('fr-FR')}</b>
                </div>
                <span class="f-label">{s.label}</span>
                {#if i > 0}<span class="f-rate">{rate(s.value, steps[i - 1].value)}</span>{/if}
              </li>
            {/each}
          </ol>
          <p class="a-muted note">Le pourcentage compare chaque étape à la précédente.</p>
        </section>

        <section class="a-section">
          <div class="a-section-head"><h2>Détail des prospects</h2></div>
          <ul class="side">
            {#each SIDE as [key, label] (key)}
              <li><span>{label}</span><b>{(f[key] ?? 0).toLocaleString('fr-FR')}</b></li>
            {/each}
          </ul>
        </section>
      </div>

      <section class="a-section">
        <div class="a-section-head">
          <h2>Réponses</h2>
          <label class="a-check small"><input type="checkbox" bind:checked={showHandled} /> Voir les traitées</label>
        </div>
        {#if replies.length}
          <ul class="replies">
            {#each replies as r (r.id)}
              {@const c = catOf(r)}
              <li class="reply" class:done={r.handled} class:prio={!r.handled && c.rank < 2}>
                <header>
                  <em class="a-tag {c.tone}">{c.label}</em>
                  <span class="who">
                    <b>{r.prospects?.name ?? r.from_email}</b>
                    <span class="a-muted">{[where(r.prospects), ago(r.received_at)].filter(Boolean).join(' · ')}</span>
                  </span>
                </header>

                {#if r.summary}<p class="summary">{r.summary}</p>{/if}

                {#if r.suggested_reply}
                  <div class="suggest">
                    <span class="lbl">Réponse suggérée</span>
                    <p>{r.suggested_reply}</p>
                  </div>
                {/if}

                <details>
                  <summary>Leur message</summary>
                  <pre>{r.excerpt}</pre>
                </details>

                <div class="a-btns">
                  {#if r.suggested_reply}
                    <button class="a-btn small" type="button" onclick={() => copy(r)}>{copied === r.id ? 'Copiée' : 'Copier la réponse'}</button>
                  {/if}
                  <a class="a-btn small" href={mailto(r)}>Répondre par mail</a>
                  <button class="a-btn small" class:good={!r.handled} type="button" onclick={() => toggle(r)}>
                    {r.handled ? 'Remettre à traiter' : 'Marquer comme traitée'}
                  </button>
                </div>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="a-empty">Aucune réponse à traiter. 👌</p>
        {/if}
      </section>

      <section class="a-section">
        <div class="a-section-head">
          <h2>Envois par jour</h2>
          <span class="legend"><i class="c"></i>premiers contacts <i class="r"></i>relances</span>
        </div>
        <div class="chart" bind:clientWidth={W}>
          <svg viewBox="0 0 {W} {CH + 16}" role="img" aria-label="Emails envoyés par jour sur 30 jours">
            <line x1="0" x2={W} y1={CH} y2={CH} class="axis" />
            {#each days as d, i (d.day)}
              {@const x = i * bw + bw * 0.15}
              {@const w = bw * 0.7}
              <rect {x} y={CH - yh(d.contacts)} width={w} height={yh(d.contacts)} class="c"><title>{date(d.day)} : {d.contacts} contact(s), {d.relances} relance(s)</title></rect>
              <rect {x} y={CH - yh(d.contacts) - yh(d.relances)} width={w} height={yh(d.relances)} class="r"><title>{date(d.day)} : {d.contacts} contact(s), {d.relances} relance(s)</title></rect>
              {#if i % 7 === 2}<text x={x + w / 2} y={CH + 13} text-anchor="middle">{date(d.day)}</text>{/if}
            {/each}
            <text x={W} y="10" text-anchor="end">max {maxDay}</text>
          </svg>
        </div>
      </section>

      {#if data.clients.length}
        <section class="a-section">
          <div class="a-section-head"><h2>Devenus clients</h2></div>
          <ul class="a-list">
            {#each data.clients as c (c.email)}
              <li class="a-row">
                <span class="a-row-main">
                  <span class="a-row-title">{c.name}</span>
                  <span class="a-row-sub">{where(c)} · contacté le {date(c.first_sent_at)}</span>
                </span>
                <em class="a-tag good">{c.plan}</em>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    {/if}
  </div>
</div>

<style>
  .intro { font-size: 0.85rem; }
  .note { font-size: 0.78rem; }
  .small { font-size: 0.85rem; color: var(--a-muted); }
  .a-kpi.hot { border-color: var(--a-accent); background: var(--a-accent-soft); }

  .funnel { display: grid; gap: 8px; list-style: none; }
  .funnel li { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'bar rate' 'label label'; align-items: center; gap: 2px 10px; }
  .f-bar { grid-area: bar; display: flex; align-items: center; min-height: 36px; padding: 0 12px; border-radius: 10px; color: #0b0a10; transition: width 0.4s; }
  .f-bar b { font-family: var(--a-display); font-size: 1.3rem; font-weight: 800; }
  .f-label { grid-area: label; font-size: 0.82rem; color: var(--a-muted); }
  .f-rate { grid-area: rate; font-size: 0.82rem; font-weight: 700; color: var(--a-fg); font-variant-numeric: tabular-nums; }

  .side { display: grid; list-style: none; }
  .side li { display: flex; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--a-line); font-size: 0.9rem; }
  .side li:last-child { border-bottom: 0; }
  .side b { font-variant-numeric: tabular-nums; }

  .replies { display: grid; gap: 10px; list-style: none; }
  @media (min-width: 1100px) { .replies { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; } }
  .reply { display: grid; gap: 10px; min-width: 0; padding: 14px; border: 1px solid var(--a-line); border-radius: 14px; background: var(--a-bg); }
  .reply.prio { border-color: var(--a-accent); }
  .reply.done { opacity: 0.55; }
  .reply header { display: flex; align-items: flex-start; gap: 10px; }
  .who { flex: 1; min-width: 0; display: grid; }
  .who b { overflow-wrap: anywhere; }
  .who span { font-size: 0.8rem; }
  .summary { font-size: 0.92rem; line-height: 1.45; }
  .suggest { display: grid; gap: 4px; padding: 10px 12px; border-left: 3px solid var(--a-cyan); border-radius: 8px; background: var(--a-surface2); }
  .suggest p { font-size: 0.88rem; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
  .lbl { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--a-cyan); }
  details summary { font-size: 0.82rem; color: var(--a-muted); cursor: pointer; }
  pre { margin-top: 6px; max-height: 240px; overflow: auto; padding: 10px; border-radius: 8px; background: var(--a-surface); font-family: inherit; font-size: 0.84rem; white-space: pre-wrap; overflow-wrap: anywhere; }

  .legend { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--a-muted); }
  .legend i { width: 10px; height: 10px; margin-left: 6px; border-radius: 3px; }
  .legend i.c, rect.c { background: var(--a-cyan); fill: var(--a-cyan); }
  .legend i.r, rect.r { background: var(--a-warn); fill: var(--a-warn); }
  .chart { min-width: 0; }
  svg { display: block; width: 100%; height: auto; overflow: visible; }
  svg text { fill: var(--a-dim); font-size: 11px; font-family: inherit; }
  .axis { stroke: var(--a-line); }
</style>

<script>
  import { getContext } from 'svelte';

  const adminCtx = getContext('adminToken');
  const token = $derived(adminCtx?.token ?? '');

  let data = $state(null);
  let error = $state('');
  let loading = $state(true);
  let showHandled = $state(false);

  const FUNNEL = [
    ['new', 'À contacter'],
    ['sent', 'Contactés'],
    ['followed_up', 'Relancés'],
    ['replied', 'Ont répondu'],
    ['interested', 'Intéressés'],
    ['unsubscribed', 'Stop'],
    ['bounced', 'Adresse invalide'],
  ];
  const CAT = {
    interested: 'Intéressé',
    question: 'Question',
    feedback: 'Retour',
    not_interested: 'Pas intéressé',
    stop: 'Stop',
    other: 'Autre',
  };
  const KIND = { bar: 'Bar', camping: 'Camping', association: 'Asso' };

  const contacted = $derived(
    data ? data.funnel.sent + data.funnel.followed_up + data.funnel.replied + data.funnel.interested + data.funnel.unsubscribed : 0,
  );
  const answered = $derived(data ? data.funnel.replied + data.funnel.interested : 0);
  const rate = $derived(contacted ? Math.round((answered / contacted) * 100) : 0);
  const maxDay = $derived(Math.max(1, ...(data?.perDay ?? []).map((d) => d.contacts + d.relances)));
  const replies = $derived((data?.replies ?? []).filter((r) => showHandled || !r.handled));

  async function load() {
    if (!token) return;
    loading = true;
    const r = await fetch(`/api/admin/prospection?token=${encodeURIComponent(token)}`);
    const d = await r.json();
    if (r.ok) { data = d; error = ''; } else error = d.error;
    loading = false;
  }

  async function toggle(reply) {
    reply.handled = !reply.handled;
    await fetch('/api/admin/prospection', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, id: reply.id, handled: reply.handled }),
    });
  }

  const fmt = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  $effect(() => {
    void token;
    load();
  });
</script>

<div class="pr">
  <div class="pr-head">
    <h1>Prospection</h1>
    <p>Mails envoyés depuis theo@zik-music.fr par la routine, du lundi au vendredi. Les réponses sont triées par Claude chaque matin.</p>
  </div>

  {#if loading}
    <p class="pr-muted">Chargement…</p>
  {:else if error}
    <p class="pr-error">{error}</p>
  {:else}
    <section class="pr-box">
      <h2>Entonnoir</h2>
      <div class="pr-funnel">
        {#each FUNNEL as [key, label] (key)}
          <div class="pr-stat"><b>{data.funnel[key]}</b><span>{label}</span></div>
        {/each}
        <div class="pr-stat accent"><b>{rate} %</b><span>Taux de réponse</span></div>
        <div class="pr-stat accent"><b>{data.clients.length}</b><span>Devenus clients</span></div>
      </div>
    </section>

    <section class="pr-box">
      <h2>Envois des 30 derniers jours</h2>
      {#if data.perDay.length}
        <div class="pr-days">
          {#each data.perDay as d (d.day)}
            <div class="pr-day" title="{d.day} : {d.contacts} contact(s), {d.relances} relance(s)">
              <span class="bar relance" style="--h:{d.relances / maxDay}"></span>
              <span class="bar contact" style="--h:{d.contacts / maxDay}"></span>
              <small>{d.day.slice(8)}</small>
            </div>
          {/each}
        </div>
        <p class="pr-muted"><span class="dot contact"></span> premiers contacts <span class="dot relance"></span> relances</p>
      {:else}
        <p class="pr-muted">Aucun envoi pour l'instant.</p>
      {/if}
    </section>

    {#if data.clients.length}
      <section class="pr-box">
        <h2>Devenus clients</h2>
        <ul class="pr-clients">
          {#each data.clients as c (c.email)}
            <li><b>{c.name}</b> {KIND[c.kind]}{c.city ? `, ${c.city}` : ''} · {c.plan} · contacté le {fmt(c.first_sent_at)}</li>
          {/each}
        </ul>
      </section>
    {/if}

    <section class="pr-box">
      <div class="pr-row">
        <h2>Réponses</h2>
        <label class="pr-muted"><input type="checkbox" bind:checked={showHandled} /> voir les réponses traitées</label>
      </div>
      {#each replies as r (r.id)}
        <article class="pr-reply" class:done={r.handled}>
          <header>
            <span class="pr-cat {r.category ?? 'todo'}">{r.category ? CAT[r.category] : 'À trier'}</span>
            <b>{r.prospects?.name ?? r.from_email}</b>
            <span class="pr-muted">{KIND[r.prospects?.kind] ?? ''}{r.prospects?.city ? `, ${r.prospects.city}` : ''} · {fmt(r.received_at)}</span>
            <button onclick={() => toggle(r)}>{r.handled ? 'Rouvrir' : 'Traité'}</button>
          </header>
          {#if r.summary}<p class="pr-summary">{r.summary}</p>{/if}
          <details>
            <summary>Leur message · <a href="mailto:{r.from_email}?subject={encodeURIComponent('Re: ' + (r.subject ?? ''))}">répondre à {r.from_email}</a></summary>
            <pre>{r.excerpt}</pre>
            {#if r.suggested_reply}
              <h3>Réponse proposée</h3>
              <pre>{r.suggested_reply}</pre>
            {/if}
          </details>
        </article>
      {:else}
        <p class="pr-muted">Aucune réponse à traiter.</p>
      {/each}
    </section>
  {/if}
</div>

<style>
  .pr { display: flex; flex-direction: column; gap: 20px; font-family: 'Inter', system-ui, sans-serif; color: #e2e8f0; }
  .pr-head h1 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; }
  .pr-head p, .pr-muted { margin-top: 6px; font-size: 0.82rem; color: #6b7280; }
  .pr-error { color: #ef4444; font-size: 0.9rem; }
  .pr-box { background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 10px; padding: 16px 18px; }
  .pr-box h2 { margin-bottom: 12px; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; }
  .pr-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .pr-funnel { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
  .pr-stat { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 8px; background: rgba(255, 255, 255, 0.03); }
  .pr-stat b { font-family: 'JetBrains Mono', monospace; font-size: 1.3rem; }
  .pr-stat span { font-size: 0.75rem; color: #94a3b8; }
  .pr-stat.accent b { color: #a5b4fc; }
  .pr-days { display: flex; align-items: flex-end; gap: 4px; height: 120px; }
  .pr-day { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; min-width: 14px; }
  .pr-day small { font-size: 0.62rem; color: #6b7280; margin-top: 4px; }
  .bar { width: 100%; height: calc(var(--h) * 100px); border-radius: 2px 2px 0 0; }
  .bar.contact, .dot.contact { background: #6366f1; }
  .bar.relance, .dot.relance { background: #f59e0b; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin: 0 4px 0 10px; }
  .pr-clients { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; }
  .pr-reply { padding: 12px 0; border-top: 1px solid rgba(255, 255, 255, 0.06); }
  .pr-reply.done { opacity: 0.5; }
  .pr-reply header { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 0.88rem; }
  .pr-reply header button { margin-left: auto; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.15); background: none; color: #e2e8f0; font-size: 0.75rem; cursor: pointer; }
  .pr-cat { padding: 2px 8px; border-radius: 999px; font-size: 0.7rem; font-weight: 600; background: rgba(255, 255, 255, 0.08); }
  .pr-cat.interested { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
  .pr-cat.question, .pr-cat.feedback { background: rgba(99, 102, 241, 0.2); color: #a5b4fc; }
  .pr-cat.todo { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
  .pr-summary { margin: 6px 0; font-size: 0.85rem; color: #cbd5e1; }
  details { font-size: 0.82rem; color: #94a3b8; }
  details a { color: #a5b4fc; }
  details h3 { margin: 10px 0 4px; font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; }
  pre { white-space: pre-wrap; font-family: inherit; margin-top: 6px; padding: 10px; border-radius: 6px; background: rgba(0, 0, 0, 0.25); color: #e2e8f0; }
</style>

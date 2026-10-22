<script>
  let { admin } = $props();

  let steps = $derived([
    { done: !!admin.venue, label: 'Créer la page de votre lieu', hint: 'Nom, ville, rendez-vous : deux minutes.', href: '/pro/lieu' },
    { done: !!(admin.venue?.logo || admin.venue?.color), label: 'Ajouter votre logo et votre couleur', hint: 'Ils remplacent ceux de ZIK sur la TV.', href: '/pro/lieu' },
    { done: admin.events.length > 0, label: 'Programmer votre prochaine soirée', hint: 'Elle apparaît sur votre page et dans Google.', href: '/pro/soirees' },
    { done: admin.followers > 0, label: 'Faire suivre votre lieu', hint: "Imprimez l'affiche : vos clients scannent le QR code et s'abonnent.", href: admin.venue ? `/lieu/${admin.venue.slug}/affiche` : '/pro/lieu' },
    { done: (admin.stats?.games ?? 0) > 0, label: 'Lancer une soirée', hint: 'Connecté avec ce compte, votre logo s\'affiche tout seul.', href: '/salon' },
  ]);
  let done = $derived(steps.filter((s) => s.done).length);
</script>

{#if done < steps.length}
  <section class="vn-card oc">
    <div class="vn-card-head">
      <h2>Bien démarrer</h2>
      <span class="oc-count">{done} / {steps.length}</span>
    </div>
    <div class="oc-bar"><i style="width:{(done / steps.length) * 100}%"></i></div>
    <ol>
      {#each steps as s (s.label)}
        <li class:done={s.done}>
          <span class="oc-check" aria-hidden="true">{s.done ? '✓' : ''}</span>
          <div>
            {#if s.done}<b>{s.label}</b>{:else}<a href={s.href}><b>{s.label}</b></a>{/if}
            <small>{s.hint}</small>
          </div>
        </li>
      {/each}
    </ol>
  </section>
{/if}

<style>
  .oc { margin-bottom: 20px; }
  .oc-count { font-size: 0.85rem; font-weight: 800; color: var(--accent); }
  .oc-bar { height: 6px; border-radius: 99px; background: var(--surface2); overflow: hidden; margin-bottom: 18px; }
  .oc-bar i { display: block; height: 100%; background: var(--accent); border-radius: 99px; transition: width 0.4s; }
  ol { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px 20px; }
  li { display: flex; gap: 12px; align-items: flex-start; }
  li div { display: flex; flex-direction: column; gap: 2px; }
  li a { color: var(--text); text-decoration: none; }
  li a:hover b { color: var(--accent); }
  li b { font-size: 0.92rem; }
  li small { font-size: 0.78rem; line-height: 1.45; color: var(--mid); }
  li.done b { color: var(--dim); text-decoration: line-through; }
  .oc-check {
    flex: none;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    margin-top: 1px;
    border: 2px solid var(--border2);
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: 900;
  }
  .done .oc-check { border-color: var(--success); background: var(--success); color: #000; }
</style>

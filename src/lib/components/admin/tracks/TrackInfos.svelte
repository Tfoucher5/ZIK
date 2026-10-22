<script>
  import { enhance } from '$app/forms';
  import { ago, pct } from '$lib/shared/admin/stats-utils.js';

  /** Onglet Infos de la fiche : statistiques, playlists qui l'utilisent, modification et suppression. */
  let { detail, form, busy, saved, afterEdit, afterDelete } = $props();

  let armDelete = $state(false);

  const t = $derived(detail.track);
  const s = $derived(detail.stats);
  const fmt = (n) => n.toLocaleString('fr-FR');

  const deleting = () => {
    const after = afterDelete();
    return async (args) => {
      armDelete = false;
      await after(args);
    };
  };
</script>

<div class="f-grid">
  <section class="f-block">
    <h3 class="a-h2">Statistiques</h3>
    {#if s && s.rounds_played}
      <div class="stats">
        <div><span class="a-big">{fmt(s.rounds_played)}</span><small>manches jouées</small></div>
        <div><span class="a-big">{pct(s.found_full, s.players_exposed)} %</span><small>des joueurs trouvent</small></div>
        <div><span class="a-big">{fmt(s.players_exposed)}</span><small>joueurs l'ont entendu</small></div>
      </div>
      <div class="a-meter"><i class={pct(s.found_full, s.players_exposed) < 20 ? 'bad' : pct(s.found_full, s.players_exposed) < 50 ? 'warn' : 'good'} style="width:{pct(s.found_full, s.players_exposed)}%"></i></div>
      {#if s.last_played_at}<p class="a-muted small">Dernière fois joué {ago(s.last_played_at)}</p>{/if}
    {:else}
      <p class="a-muted">Pas encore de statistiques pour ce titre.</p>
    {/if}

    <h3 class="a-h2">Où il est utilisé</h3>
    {#if detail.entries.length}
      <ul class="where">
        {#each detail.entries as e (e.id)}
          <li>
            <a href="/admin/playlists/{e.playlist_id}">{e.custom_playlists?.emoji} {e.custom_playlists?.name}</a>
            {#if e.custom_playlists?.is_official}<em class="a-tag warn">★</em>{/if}
            {#if e.custom_artist || e.custom_title}<em class="a-tag" title="Nom modifié dans cette playlist">✎ {e.custom_title || t.title}</em>{/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="a-muted">Dans aucune playlist.</p>
    {/if}
    {#if detail.zikle.length}
      <p class="small">Zikle : {detail.zikle.length} jour{detail.zikle.length > 1 ? 's' : ''} (dernier le {new Date(detail.zikle[0]).toLocaleDateString('fr-FR')})</p>
    {/if}
  </section>

  <section class="f-block">
    <h3 class="a-h2">Modifier</h3>
    {#key t.id + t.artist + t.title + t.cover_url}
      <form class="a-form" method="POST" action="?/editTrack" use:enhance={afterEdit}>
        <input type="hidden" name="id" value={t.id} />
        <label class="a-label">Artiste<input class="a-input" name="artist" value={t.artist} required /></label>
        <label class="a-label">Titre<input class="a-input" name="title" value={t.title} required /></label>
        <label class="a-label">Image de couverture (lien)<input class="a-input" name="cover_url" value={t.cover_url ?? ''} placeholder="https://…" /></label>
        {#if form?.error}<p class="a-err">{form.error}</p>{/if}
        {#if saved}<p class="a-ok">Enregistré. Le changement vaut pour toutes les playlists.</p>{/if}
        <button class="a-btn primary" type="submit" disabled={busy}>Enregistrer</button>
      </form>
    {/key}

    <form class="danger-zone" method="POST" action="?/deleteTrack" use:enhance={deleting}>
      <input type="hidden" name="id" value={t.id} />
      {#if detail.entries.length || detail.zikle.length}
        <p class="a-muted small">Pour supprimer ce titre du catalogue, retire-le d'abord de ses playlists et de l'historique Zikle.</p>
      {/if}
      <button
        class="a-btn small danger"
        disabled={busy}
        onclick={(e) => { if (!armDelete) { e.preventDefault(); armDelete = true; } }}
      >{armDelete ? 'Confirmer la suppression' : 'Supprimer du catalogue'}</button>
    </form>
  </section>
</div>

<style>
  .f-grid { display: grid; gap: 18px; }
  @media (min-width: 760px) {
    .f-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  .f-block { display: grid; gap: 10px; align-content: start; }
  .f-block .a-h2:first-child { margin-top: 0; }
  .stats { display: flex; flex-wrap: wrap; gap: 18px; }
  .stats div { display: grid; gap: 2px; }
  .stats small, .small { font-size: 0.78rem; color: var(--a-dim); }
  .where { display: grid; gap: 6px; list-style: none; }
  .where li { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 0.9rem; }
  .where a { color: var(--a-cyan); }
  .danger-zone { display: grid; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--a-line); }
  .danger-zone .a-btn { justify-self: start; }
</style>

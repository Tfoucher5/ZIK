<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import Sheet from '$lib/components/admin/Sheet.svelte';
  import TrackAnswers from '$lib/components/admin/TrackAnswers.svelte';

  /** Noms affichés et réponses acceptées d'un titre, propres à cette playlist. */
  let { open = $bindable(), editing, playlistName, types, token, busy, closing } = $props();
</script>

<Sheet bind:open title="Modifier le titre" wide>
  {#if editing}
    <div class="edit">
      <p class="who">
        {#if editing.track?.cover_url}<img class="a-cover" src={editing.track.cover_url} alt="" />{/if}
        <span><b>{editing.track?.title}</b><br /><span class="a-muted">{editing.track?.artist}</span></span>
        {#if editing.track}<a class="a-btn small" href="/admin/tracks?open={editing.track.id}">Fiche du titre</a>{/if}
      </p>
      <h3 class="a-h2">Dans cette playlist</h3>
      <form class="a-form" method="POST" action="?/editTrackMeta" use:enhance={closing(() => (open = false))}>
        <input type="hidden" name="track_id" value={editing.id} />
        <div class="a-form-row">
          <label class="a-label">Artiste affiché<input class="a-input" name="custom_artist" value={editing.custom_artist ?? ''} placeholder={editing.track?.artist} /></label>
          <label class="a-label">Titre affiché<input class="a-input" name="custom_title" value={editing.custom_title ?? ''} placeholder={editing.track?.title} /></label>
        </div>
        <label class="a-label">
          Artistes en featuring (séparés par des virgules)
          <input class="a-input" name="custom_feats" value={editing.custom_feats?.join(', ') ?? ''} placeholder="ex : Nekfeu, Damso" />
        </label>
        <p class="a-muted small">Laisse vide pour garder le nom du catalogue.</p>
        <button class="a-btn primary" type="submit" disabled={busy}>Enregistrer</button>
      </form>
      <h3 class="a-h2">Réponses acceptées en plus</h3>
      <TrackAnswers
        trackId={editing.track?.id}
        entries={[{ id: editing.id, label: playlistName, answers: editing.answers }]}
        {types}
        {token}
        onchange={invalidateAll}
      />
    </div>
  {/if}
</Sheet>

<style>
  .small { font-size: 0.78rem; font-weight: 400; }
  .edit { display: grid; gap: 14px; }
  .who { display: flex; align-items: center; gap: 12px; }
  .who > span { flex: 1; min-width: 0; }
</style>

<script>
  import { enhance } from '$app/forms';

  /** Nom, emoji et room liée d'une playlist. */
  let { pl, action, submit, busy, error = null } = $props();
</script>

<form class="a-form" method="POST" {action} use:enhance={submit}>
  <input type="hidden" name="id" value={pl.id} />
  <div class="edit-name">
    <label class="a-label emoji">Emoji<input class="a-input" name="emoji" value={pl.emoji} maxlength="4" /></label>
    <label class="a-label">Nom<input class="a-input" name="name" value={pl.name} required /></label>
  </div>
  <label class="a-label">
    Room liée (code)
    <input class="a-input" name="linked_room_id" value={pl.linked_room_id ?? ''} placeholder="ex : KDP2G9" maxlength="12" />
    <span class="a-muted small">La room du site qui joue cette playlist. Sert aussi à compter ses parties.</span>
  </label>
  {#if error}<p class="a-err">{error}</p>{/if}
  <button class="a-btn primary" type="submit" disabled={busy}>Enregistrer</button>
</form>

<style>
  .edit-name { display: grid; grid-template-columns: 84px 1fr; gap: 10px; }
  .emoji input { text-align: center; font-size: 1.2rem; }
  .small { font-size: 0.75rem; font-weight: 400; }
</style>

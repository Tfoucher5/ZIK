<script>
  import { enhance } from '$app/forms';

  /** Remplace une carte par la bonne version Deezer, pour tous ceux qui l'ont. */
  let { c, card, reportId = null, error = null } = $props();
</script>

<form method="POST" action="?/correctCard" use:enhance={c.submitting} class="a-form">
  <p class="sheet-text"><b>{card.title}</b> · {card.artist}</p>
  <p class="a-muted note">Colle le lien Deezer du bon titre. La bonne carte remplace celle-ci pour tous les joueurs qui l'ont, et sa rareté peut changer.</p>
  <input type="hidden" name="card_id" value={card.id} />
  {#if reportId}<input type="hidden" name="report_id" value={reportId} />{/if}
  <label class="a-label">
    Lien ou numéro Deezer
    <input class="a-input" name="deezer" placeholder="https://www.deezer.com/track/…" required />
  </label>
  {#if error}<p class="a-err">{error}</p>{/if}
  <button class="a-btn primary" disabled={c.busy}>{c.busy ? 'Correction…' : 'Corriger la carte'}</button>
</form>

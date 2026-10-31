<script>
  import { enhance } from '$app/forms';

  let { mailing, form } = $props();

  let scope = $state('active');
  let choisi = $state(null);
  let confirm = $state(false);
  let busy = $state('');

  const submit = (name) => () => {
    busy = name;
    return async ({ update }) => {
      await update({ reset: false });
      busy = '';
      confirm = false;
    };
  };
</script>

<section class="a-section">
  <div class="a-section-head"><h2>Mail aux clients Pro</h2></div>
  <p class="a-muted small">Chaque client ne reçoit un mail donné qu'une fois, même si tu relances l'envoi.</p>
  {#await mailing}
    <p class="a-muted small">Calcul des destinataires…</p>
  {:then campagnes}
    {@const m = campagnes.find((c) => c.id === choisi) ?? campagnes[0]}
    <div class="a-chips" role="group" aria-label="Mail">
      {#each campagnes as c (c.id)}
        <button class="a-chip" type="button" aria-pressed={c.id === m.id} onclick={() => { choisi = c.id; confirm = false; }}>{c.label}</button>
      {/each}
    </div>
    <p class="small">Objet : <b>{m.subject}</b></p>
    <div class="a-chips" role="group" aria-label="Destinataires">
      <button class="a-chip" type="button" aria-pressed={scope === 'active'} onclick={() => (scope = 'active')}>Pro actifs <b>{m.active.pending}</b></button>
      <button class="a-chip" type="button" aria-pressed={scope === 'all'} onclick={() => (scope = 'all')}>Tous ceux qui ont eu Pro <b>{m.all.pending}</b></button>
    </div>
    <form method="POST" class="a-btns" action="?/mailSend" use:enhance={submit('send')}>
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="campaign" value={m.id} />
      <button class="a-btn" formaction="?/mailTest" disabled={!!busy}>{busy === 'send' ? '…' : 'M’envoyer un test'}</button>
      {#if confirm}
        <button class="a-btn primary" disabled={!!busy}>{busy === 'send' ? 'Envoi…' : `Oui, envoyer à ${m[scope].pending}`}</button>
        <button class="a-btn" type="button" onclick={() => (confirm = false)}>Annuler</button>
      {:else}
        <button class="a-btn primary" type="button" disabled={!m[scope].pending} onclick={() => (confirm = true)}>Envoyer…</button>
      {/if}
    </form>
    {#if m[scope].total > m[scope].pending}<p class="a-muted small">{m[scope].total - m[scope].pending} l'ont déjà reçu.</p>{/if}
  {/await}
  {#if form?.mailTestSent}<p class="a-ok">Test envoyé sur ton adresse.</p>{/if}
  {#if form?.mailSent !== undefined}<p class="a-ok">Envoyé à {form.mailSent} client{form.mailSent > 1 ? 's' : ''}.</p>{/if}
  {#if form?.mailError}<p class="a-err">{form.mailError}</p>{/if}
</section>

<style>
  .small { font-size: 0.82rem; }
</style>

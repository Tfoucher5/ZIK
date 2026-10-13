<script>
  import VenueEvents from './VenueEvents.svelte';
  import ConfirmDialog from '$lib/components/organizer/ConfirmDialog.svelte';
  import { eventWhen, venueEventText } from '$lib/venues.js';

  let { admin } = $props();
  let startsAt = $state('');
  let theme = $state('');
  let ask = $state(null);

  async function add(e) {
    e.preventDefault();
    await admin.addEvent(startsAt, theme);
    if (!admin.error) { startsAt = ''; theme = ''; }
  }

  const plural = (n) => `${n} joueur${n > 1 ? 's' : ''}`;

  function askNotify(ev) {
    ask = { kind: 'notify', ev, title: `Prévenir ${plural(admin.followers)} ?`, confirm: 'Envoyer la notification', run: () => admin.notifyEvent(ev.id) };
  }

  function askRemove(ev) {
    ask = { kind: 'remove', ev, title: 'Retirer cette soirée ?', confirm: 'Retirer la soirée', danger: true, run: () => admin.removeEvent(ev.id) };
  }
</script>

{#snippet actions(ev)}
  <div class="vee-actions">
    {#if ev.notified_at}
      <span class="vee-sent" title="Ceux qui suivent votre lieu ont été prévenus">✓ Annoncée</span>
    {:else if admin.followers}
      <button class="vee-notify" onclick={() => askNotify(ev)} disabled={admin.busy}>🔔 Prévenir</button>
    {/if}
    <button class="vee-del" onclick={() => askRemove(ev)} disabled={admin.busy} aria-label="Retirer la soirée du {eventWhen(ev.starts_at)}">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
    </button>
  </div>
{/snippet}

<p class="vee-help">
  {#if admin.followers}
    <b>{plural(admin.followers)}</b> {admin.followers > 1 ? 'suivent' : 'suit'} votre lieu. Après avoir ajouté une soirée,
    cliquez sur <b>Prévenir</b> pour leur envoyer une notification (une seule fois par soirée).
  {:else}
    Vos dates s'affichent sur votre page publique. Quand des joueurs suivront votre lieu, vous pourrez les prévenir de chaque soirée.
  {/if}
</p>

<VenueEvents
  events={admin.events}
  empty="Aucune soirée programmée. Ajoutez vos prochaines dates : elles apparaissent sur votre page et dans Google."
  {actions}
/>

<form class="ve-add" onsubmit={add}>
  <label class="vn-field">
    <span>Date et heure</span>
    <input class="vn-input" type="datetime-local" bind:value={startsAt} required />
  </label>
  <label class="vn-field">
    <span>Thème <small>facultatif</small></span>
    <input class="vn-input" bind:value={theme} maxlength="60" placeholder="Années 80, rap, Disney…" />
  </label>
  <button class="vn-btn vn-btn-ghost" disabled={admin.busy || !startsAt}>+ Ajouter</button>
</form>

<ConfirmDialog bind:ask busy={admin.busy}>
  {#if ask?.kind === 'notify'}
    <p>Tous ceux qui suivent <b>{admin.venue.name}</b> recevront ce message dans ZIK et sur leur téléphone :</p>
    <blockquote>{venueEventText({ name: admin.venue.name, startsAt: ask.ev.starts_at, theme: ask.ev.theme })}</blockquote>
    <p class="vee-warn">Une notification envoyée ne peut pas être annulée. Vérifiez bien la date.</p>
  {:else if ask?.kind === 'remove'}
    <p>La soirée du <b>{eventWhen(ask.ev.starts_at)}</b> disparaîtra de votre page publique.</p>
    {#if ask.ev.notified_at}<p class="vee-warn">Vos abonnés ont déjà été prévenus de cette date : ils ne recevront pas d'annulation, pensez à les informer.</p>{/if}
  {/if}
</ConfirmDialog>

<style>
  .vee-help { margin-bottom: 14px; font-size: 0.85rem; line-height: 1.6; color: var(--mid); }
  .vee-help b { color: var(--text); }
  .vee-actions { display: flex; align-items: center; gap: 8px; flex: none; }
  .vee-notify {
    padding: 7px 12px;
    border: 1px solid rgb(var(--accent-rgb) / 0.5);
    border-radius: 8px;
    background: rgb(var(--accent-rgb) / 0.1);
    color: var(--accent);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 800;
    cursor: pointer;
  }
  .vee-notify:hover:not(:disabled) { background: var(--accent); color: var(--on-accent); }
  .vee-sent { font-size: 0.78rem; font-weight: 800; color: var(--success); white-space: nowrap; }
  .vee-del {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: none;
    color: var(--dim);
    cursor: pointer;
  }
  .vee-del:hover:not(:disabled) { color: var(--danger); border-color: var(--danger); }
  .vee-warn { margin-top: 12px; font-size: 0.84rem; color: var(--warn); }
  .ve-add {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr) auto;
    gap: 12px;
    align-items: end;
    margin-top: 18px;
    padding-top: 18px;
    border-top: 1px solid var(--border);
  }
  @media (max-width: 640px) {
    .ve-add { grid-template-columns: 1fr; }
  }
</style>

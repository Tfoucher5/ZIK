<script>
  import { enhance } from '$app/forms';
  import { ago } from '$lib/shared/admin/stats-utils.js';

  /** Gestion d'une room : chiffres, visibilité, réglages et suppression. */
  let { room, msg, busy, submit, onDeleted } = $props();

  let confirmDelete = $state(false);
</script>

  <div class="detail">
    <p class="a-muted">
      Code <b class="code">{room.code}</b> · créée {ago(room.created_at)}
      {#if room.owner_id}· par <a href="/admin/users/{room.owner_id}">{room.owner ?? '?'}</a>{/if}
    </p>

    <div class="a-grid2 mini">
      <div class="a-card"><span class="a-big">{room.plays7}</span><span class="a-muted">parties sur 7 jours</span></div>
      <div class="a-card">
        <span class="a-big">{room.plays7 ? Math.round((room.players7 / room.plays7) * 10) / 10 : 0}</span>
        <span class="a-muted">joueurs par partie</span>
      </div>
    </div>

    {#if msg}<p class={msg.ok ? 'a-ok' : 'a-err'}>{msg.text}</p>{/if}

    <h3 class="a-h2">Visibilité</h3>
    <div class="flags">
      {#each [['is_public', 'Publique', 'Visible dans la liste des rooms du site.'], ['is_official', 'Officielle', 'Mise en avant comme room ZIK.']] as [field, label, hint] (field)}
        <form method="POST" action="?/toggleFlag" use:enhance={submit(room[field] ? `${label} : désactivé.` : `${label} : activé.`)}>
          <input type="hidden" name="id" value={room.id} />
          <input type="hidden" name="field" value={field} />
          <input type="hidden" name="value" value={String(!room[field])} />
          <button class="flag" class:on={room[field]} type="submit" disabled={busy} aria-pressed={room[field]}>
            <span class="switch"></span>
            <span><b>{label}</b><small>{hint}</small></span>
          </button>
        </form>
      {/each}
    </div>

    <h3 class="a-h2">Modifier</h3>
    {#key room.id}
      <form class="a-form" method="POST" action="?/editRoom" use:enhance={submit('Room enregistrée.')}>
        <input type="hidden" name="id" value={room.id} />
        <div class="name-row">
          <label class="a-label emo-field">Emoji<input class="a-input" name="emoji" value={room.emoji} maxlength="4" /></label>
          <label class="a-label">Nom<input class="a-input" name="name" value={room.name} maxlength="60" required /></label>
        </div>
        <label class="a-label">Description<textarea class="a-textarea" name="description" rows="2">{room.description ?? ''}</textarea></label>
        <div class="a-form-row">
          <label class="a-label">Nombre de manches<input class="a-input" type="number" name="max_rounds" value={room.max_rounds} min="3" max="50" /></label>
          <label class="a-label">Durée d’une manche (s)<input class="a-input" type="number" name="round_duration" value={room.round_duration} min="10" max="60" /></label>
          <label class="a-label">Pause entre manches (s)<input class="a-input" type="number" name="break_duration" value={room.break_duration} min="3" max="15" /></label>
        </div>
        <label class="a-check"><input type="checkbox" name="auto_start" checked={room.auto_start} /> Lancer la partie automatiquement</label>
        <button class="a-btn primary" type="submit" disabled={busy}>Enregistrer</button>
      </form>
    {/key}

    <h3 class="a-h2">Zone dangereuse</h3>
    {#if !confirmDelete}
      <button class="a-btn danger" type="button" onclick={() => (confirmDelete = true)}>Supprimer cette room</button>
    {:else}
      <form class="a-card bad confirm" method="POST" action="?/deleteRoom" use:enhance={submit('Room supprimée.', onDeleted)}>
        <input type="hidden" name="id" value={room.id} />
        <p>Supprimer <b>{room.name}</b> ({room.code}) ? C’est définitif.</p>
        <div class="a-btns">
          <button class="a-btn" type="button" onclick={() => (confirmDelete = false)}>Annuler</button>
          <button class="a-btn danger" type="submit" disabled={busy}>Oui, supprimer</button>
        </div>
      </form>
    {/if}
  </div>

<style>
  .detail { display: grid; gap: 12px; }
  .detail a { color: var(--a-cyan); }
  .code { font-family: var(--a-display); letter-spacing: 0.06em; color: var(--a-fg); }
  .mini .a-card { display: grid; gap: 4px; }
  .flags { display: grid; gap: 8px; }
  @media (min-width: 700px) { .flags { grid-template-columns: 1fr 1fr; } }
  .flag {
    display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px;
    border: 1px solid var(--a-line); border-radius: 12px; background: var(--a-bg); color: var(--a-fg); font: inherit; text-align: left; cursor: pointer;
  }
  .flag small { display: block; font-size: 0.78rem; color: var(--a-dim); }
  .flag.on { border-color: var(--a-accent); background: var(--a-accent-soft); }
  .switch { position: relative; flex: 0 0 40px; height: 22px; border-radius: 99px; background: var(--a-surface2); transition: background 0.15s; }
  .switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: var(--a-muted); transition: transform 0.15s; }
  .flag.on .switch { background: var(--a-accent); }
  .flag.on .switch::after { transform: translateX(18px); background: #fff; }
  .name-row { display: grid; grid-template-columns: 80px 1fr; gap: 10px; }
  .confirm { display: grid; gap: 10px; }
</style>

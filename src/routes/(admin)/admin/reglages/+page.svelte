<script>
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/admin/PageHeader.svelte';

  let { data, form } = $props();

  let maintEnabled = $derived(data.maintenance?.enabled ?? false);
  let maintMessage = $derived(data.maintenance?.message ?? '');
  let busy = $state('');
  let confirmSend = $state(false);
  let title = $state('');
  let body = $state('');
  let url = $state('');

  const submit = (name) => () => {
    busy = name;
    return async ({ update }) => {
      await update({ reset: false });
      busy = '';
      confirmSend = false;
    };
  };
</script>

<div class="adm-page">
  <PageHeader title="Réglages" />

  <div class="a-stack">
    <h2 class="a-h2">Prévenir tout le monde</h2>
    <form method="POST" action="?/broadcast" class="a-card grid" use:enhance={submit('broadcast')}>
      <p class="a-muted small">Une notification dans la cloche de chaque joueur inscrit. Elle disparaît au bout de 24 h. Les nouveautés de /nouveautes sont déjà annoncées toutes seules à chaque mise en ligne.</p>
      <label class="a-label">Titre<input class="a-input" name="title" maxlength="80" required bind:value={title} placeholder="Ex. Soirée blind test ce vendredi" /></label>
      <label class="a-label">Message (optionnel)<textarea class="a-textarea" name="body" rows="2" maxlength="240" bind:value={body}></textarea></label>
      <label class="a-label">Lien (optionnel)<input class="a-input" name="url" bind:value={url} placeholder="/salon" /></label>
      {#if title.trim()}
        <div class="preview" aria-label="Aperçu">
          <span class="z">Z</span>
          <p><b>{title}</b>{#if body.trim()}<br>{body}{/if}</p>
        </div>
      {/if}
      {#if confirmSend}
        <div class="a-btns">
          <button class="a-btn primary" type="submit" disabled={busy === 'broadcast'}>{busy === 'broadcast' ? 'Envoi…' : 'Oui, envoyer à tout le monde'}</button>
          <button class="a-btn" type="button" onclick={() => (confirmSend = false)}>Annuler</button>
        </div>
      {:else}
        <button class="a-btn primary" type="button" disabled={!title.trim()} onclick={() => (confirmSend = true)}>Envoyer…</button>
      {/if}
      {#if form?.broadcastSent !== undefined}<p class="a-ok">Envoyée à {form.broadcastSent} joueurs.</p>{/if}
      {#if form?.broadcastError}<p class="a-err">{form.broadcastError}</p>{/if}
    </form>

    <h2 class="a-h2">Vidéos des salons</h2>
    <form method="POST" action="?/video" class="a-card grid" use:enhance={submit('video')}>
      <p class="a-muted small">Quand un titre n'a pas de vidéo épinglée, le salon cherche sur YouTube. Ces réglages évitent les mauvaises versions.</p>
      <label class="a-label">
        Mots à éviter dans le titre de la vidéo (séparés par des virgules)
        <input class="a-input" name="exclude" value={data.video.exclude.join(', ')} />
      </label>
      <label class="a-label">
        Ne jamais démarrer avant (secondes)
        <input class="a-input narrow" type="number" name="minStart" min="0" max="90" value={data.video.minStart} />
      </label>
      <button class="a-btn primary" type="submit" disabled={busy === 'video'}>{busy === 'video' ? 'Enregistrement…' : 'Enregistrer'}</button>
      {#if form?.videoSaved}<p class="a-ok">Enregistré : appliqué dès la prochaine manche.</p>{/if}
      {#if form?.videoError}<p class="a-err">{form.videoError}</p>{/if}
    </form>

    <h2 class="a-h2">Maintenance</h2>
    <form method="POST" action="?/maintenance" class="a-card grid maint" class:on={data.maintenance?.enabled} use:enhance={submit('maintenance')}>
      <div class="m-head">
        <div>
          <b>Mode maintenance</b>
          <p class="a-muted small">{data.maintenance?.enabled ? "Actif : le site est fermé sauf l'admin" : 'Le site est ouvert'}</p>
        </div>
        <label class="switch">
          <input type="checkbox" name="enabled" role="switch" bind:checked={maintEnabled} />
          <span aria-hidden="true"></span>
          <span class="a-sr">Activer le mode maintenance</span>
        </label>
      </div>
      {#if maintEnabled || data.maintenance?.enabled}
        <label class="a-label">Message affiché aux visiteurs<textarea class="a-textarea" name="message" rows="2" maxlength="500" bind:value={maintMessage}></textarea></label>
      {/if}
      {#if maintEnabled !== !!data.maintenance?.enabled || maintMessage !== (data.maintenance?.message ?? '')}
        <button class="a-btn primary" type="submit" disabled={busy === 'maintenance'}>{busy === 'maintenance' ? 'Enregistrement…' : 'Appliquer'}</button>
      {/if}
      {#if form?.maintenanceSaved}<p class="a-ok">Enregistré.</p>{/if}
      {#if form?.maintenanceError}<p class="a-err">{form.maintenanceError}</p>{/if}
    </form>
  </div>
</div>

<style>
  .grid { display: grid; gap: 12px; }
  .grid > .a-btn { justify-self: start; }
  .small { font-size: 0.82rem; }
  .narrow { max-width: 120px; }
  .preview { display: flex; gap: 10px; padding: 12px; border-radius: 10px; background: var(--a-bg); font-size: 0.85rem; }
  .z { flex: 0 0 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; background: var(--a-accent); color: #1a0018; font-family: var(--a-display); font-weight: 900; }

  .maint.on { border-color: var(--a-bad); background: var(--a-bad-soft); }
  .m-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .switch { position: relative; flex: 0 0 auto; cursor: pointer; }
  .switch input { position: absolute; opacity: 0; inset: 0; cursor: pointer; }
  .switch span[aria-hidden] { display: block; position: relative; width: 46px; height: 26px; border: 1px solid var(--a-line); border-radius: 99px; background: var(--a-surface2); }
  .switch span[aria-hidden]::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--a-muted); transition: transform 0.2s; }
  .switch input:checked + span { background: var(--a-bad); border-color: var(--a-bad); }
  .switch input:checked + span::after { transform: translateX(20px); background: #2a0606; }
  .switch input:focus-visible + span { outline: 2px solid var(--a-accent); outline-offset: 2px; }
</style>

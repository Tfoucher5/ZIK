<script>
  import { getContext } from 'svelte';
  import PageHeader from '$lib/admin/PageHeader.svelte';
  import Sheet from '$lib/admin/Sheet.svelte';
  import VideoFixer from '$lib/admin/VideoFixer.svelte';
  import TrackAudioDebugger from '$lib/components/admin/TrackAudioDebugger.svelte';
  import { ago } from '$lib/admin/stats-utils.js';

  const adminCtx = getContext('adminToken');
  const alertsCtx = getContext('adminAlerts');
  const token = $derived(adminCtx?.token ?? '');

  const KINDS = {
    video: { label: 'Vidéo salon', hint: 'Mauvaise vidéo ou mauvais départ en mode salon' },
    audio: { label: 'Audio room', hint: 'Pas de son ou mauvais extrait en room' },
    answer: { label: 'Infos du titre', hint: 'Artiste ou titre faux, réponse refusée' },
  };
  const SOURCES = { auto: 'Détecté', host: 'Hôte de salon', player: 'Joueur' };

  let view = $state('open');
  let kind = $state('all');
  let issues = $state(null);
  let err = $state('');
  let current = $state(null);
  let sheetOpen = $state(false);
  let busy = $state(false);
  let actionErr = $state('');

  let artist = $state('');
  let title = $state('');
  let metaMsg = $state('');

  const counts = $derived(
    (issues ?? []).reduce((c, i) => ({ ...c, [i.kind]: (c[i.kind] ?? 0) + 1 }), {}),
  );
  const shown = $derived((issues ?? []).filter((i) => kind === 'all' || i.kind === kind));

  async function load() {
    if (!token) return;
    err = '';
    const r = await fetch(`/api/admin/issues?status=${view}&token=${encodeURIComponent(token)}`);
    const d = await r.json();
    if (!r.ok) { err = d.error || 'Chargement impossible.'; issues = []; return; }
    issues = d.issues;
  }

  $effect(() => { view; load(); });

  function open(issue) {
    current = issue;
    artist = issue.track.artist;
    title = issue.track.title;
    metaMsg = '';
    actionErr = '';
    sheetOpen = true;
  }

  async function act(action) {
    busy = true; actionErr = '';
    const r = await fetch(`/api/admin/issues?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: current.id, action }),
    });
    busy = false;
    if (!r.ok) { actionErr = (await r.json()).error; return; }
    sheetOpen = false;
    await load();
    alertsCtx?.refresh();
  }

  async function saveMeta(e) {
    e.preventDefault();
    busy = true; metaMsg = ''; actionErr = '';
    const r = await fetch(`/api/admin/track-audio-fix?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId: current.track.id, artist, title }),
    });
    busy = false;
    if (!r.ok) { actionErr = (await r.json()).error; return; }
    current.track.artist = artist.trim();
    current.track.title = title.trim();
    metaMsg = 'Titre corrigé.';
  }

  function where(ctx) {
    if (ctx.salon) return `salon ${ctx.salon}`;
    if (ctx.room) return 'room';
    return '';
  }
</script>

<div class="adm-page">
  <PageHeader title="Réparer">
    <div class="a-chips seg" role="group" aria-label="État">
      <button class="a-chip" aria-pressed={view === 'open'} onclick={() => (view = 'open')}>À faire</button>
      <button class="a-chip" aria-pressed={view === 'done'} onclick={() => (view = 'done')}>Réglés</button>
    </div>
  </PageHeader>

  <div class="a-stack">
    <div class="a-chips" role="group" aria-label="Type de problème">
      <button class="a-chip" aria-pressed={kind === 'all'} onclick={() => (kind = 'all')}>Tout<b>{issues?.length ?? ''}</b></button>
      {#each Object.entries(KINDS) as [k, v] (k)}
        <button class="a-chip" aria-pressed={kind === k} onclick={() => (kind = k)}>{v.label}{#if counts[k]}<b>{counts[k]}</b>{/if}</button>
      {/each}
    </div>

    {#if err}
      <p class="a-card bad">{err}</p>
    {:else if !issues}
      <p class="a-empty">Chargement…</p>
    {:else if !shown.length}
      <p class="a-empty">{view === 'open' ? 'Rien à réparer. Tout tourne.' : 'Aucun problème réglé récemment.'}</p>
    {:else}
      <ul class="a-list">
        {#each shown as i (i.id)}
          <li>
            <button class="a-row" type="button" onclick={() => open(i)}>
              {#if i.track.cover_url}
                <img class="cover" src={i.track.cover_url} alt="" loading="lazy" />
              {:else}
                <span class="cover"></span>
              {/if}
              <span class="a-row-main">
                <span class="a-row-title">{i.track.artist} · {i.track.title}</span>
                <span class="a-row-sub">
                  {KINDS[i.kind].label} · {SOURCES[i.source]}{where(i.context) ? ` · ${where(i.context)}` : ''} · {ago(view === 'open' ? i.updated_at : i.resolved_at)}
                </span>
                {#if i.note}<span class="a-row-sub note">« {i.note} »</span>{/if}
              </span>
              {#if view === 'open'}
                {#if i.count > 1}<em class="a-tag bad">×{i.count}</em>{/if}
              {:else}
                <em class="a-tag {i.status === 'fixed' ? 'good' : ''}">{i.status === 'fixed' ? 'réglé' : 'ignoré'}</em>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<Sheet bind:open={sheetOpen} title={current ? KINDS[current.kind].label : ''}>
  {#if current}
    {#key current.id}
      <div class="fix">
        <p class="who"><b>{current.track.artist}</b> · {current.track.title}</p>
        <p class="ctx">
          {SOURCES[current.source]}{where(current.context) ? ` · ${where(current.context)}` : ''}
          {current.count > 1 ? ` · signalé ${current.count} fois` : ''} · {ago(current.updated_at)}
        </p>
        {#if current.note}<p class="a-card note">« {current.note} »</p>{/if}

        {#if current.kind === 'video'}
          <VideoFixer track={current.track} reported={current.context.videoId ? current.context : null} {token} />
        {:else if current.kind === 'audio'}
          <TrackAudioDebugger trackId={current.track.id} {token} />
        {:else}
          {#if current.track.preview_url}
            <!-- svelte-ignore a11y_media_has_caption -->
            <audio controls preload="none" src={current.track.preview_url}></audio>
          {/if}
          <form class="meta" onsubmit={saveMeta}>
            <label class="a-label">Artiste<input class="a-input" bind:value={artist} required /></label>
            <label class="a-label">Titre<input class="a-input" bind:value={title} required /></label>
            <button class="a-btn primary" type="submit" disabled={busy || (artist === current.track.artist && title === current.track.title)}>Corriger le titre</button>
            {#if metaMsg}<p class="a-ok">{metaMsg}</p>{/if}
          </form>
          <details>
            <summary>L'extrait ne correspond pas au titre ?</summary>
            <TrackAudioDebugger trackId={current.track.id} {token} />
          </details>
        {/if}

        {#if actionErr}<p class="a-err">{actionErr}</p>{/if}
        <div class="a-btns end">
          {#if current.status === 'open'}
            <button class="a-btn good" type="button" disabled={busy} onclick={() => act('fix')}>✓ C'est réglé</button>
            <button class="a-btn" type="button" disabled={busy} onclick={() => act('ignore')}>Ignorer</button>
          {:else}
            <button class="a-btn" type="button" disabled={busy} onclick={() => act('reopen')}>Rouvrir</button>
          {/if}
        </div>
      </div>
    {/key}
  {/if}
</Sheet>

<style>
  .seg { flex: 0 0 auto; }
  .cover { flex: 0 0 44px; width: 44px; height: 44px; border-radius: 8px; background: var(--a-surface2); object-fit: cover; }
  .note { white-space: normal; font-style: italic; }
  .fix { display: grid; gap: 12px; }
  .who { font-size: 1.05rem; }
  .ctx { margin-top: -8px; font-size: 0.82rem; color: var(--a-dim); }
  p.note { font-size: 0.9rem; }
  audio { width: 100%; }
  .meta { display: grid; gap: 10px; }
  details summary { cursor: pointer; font-size: 0.85rem; color: var(--a-muted); }
  details[open] summary { margin-bottom: 10px; }
  .end { padding-top: 6px; border-top: 1px solid var(--a-line); }
</style>

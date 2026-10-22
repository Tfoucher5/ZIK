<script>
  import { untrack } from 'svelte';
  import { page } from '$app/state';
  import Sheet from '$lib/components/admin/Sheet.svelte';
  import VideoFixer from '$lib/components/admin/VideoFixer.svelte';
  import TrackAnswers from '$lib/components/admin/TrackAnswers.svelte';
  import TrackAudioDebugger from '$lib/components/admin/audio/TrackAudioDebugger.svelte';
  import { ago } from '$lib/shared/admin/stats-utils.js';
  import TrackCover from './TrackCover.svelte';
  import TrackFlags from './TrackFlags.svelte';
  import TrackInfos from './TrackInfos.svelte';

  /** Fiche d'un titre du catalogue, chargée à l'ouverture : infos, réponses, vidéo et extrait. */
  let { token, form, sheetOpen = $bindable(false) } = $props();

  const TABS = [
    ['infos', 'Infos'],
    ['answers', 'Réponses'],
    ['video', 'Vidéo salon'],
    ['audio', 'Extrait room'],
  ];
  const ISSUE = { video: 'Vidéo de salon', audio: 'Extrait de room', answer: 'Infos du titre' };

  let openId = $state(null);
  let tab = $state('infos');
  let detail = $state(null);
  let detailErr = $state('');
  let busy = $state(false);
  let saved = $state(false);

  const entries = $derived(
    (detail?.entries ?? []).map((e) => ({
      id: e.id,
      label: `${e.custom_playlists?.emoji ?? ''} ${e.custom_playlists?.name ?? 'Playlist'}`.trim(),
      answers: e.track_answers ?? [],
    })),
  );

  async function loadDetail() {
    const id = openId;
    detailErr = '';
    try {
      const r = await fetch(`/api/admin/tracks-detail?id=${id}&token=${encodeURIComponent(token)}`);
      const d = await r.json();
      if (id !== openId) return;
      if (!r.ok) detailErr = d.error || 'Chargement impossible.';
      else detail = d;
    } catch {
      detailErr = 'Le serveur est injoignable.';
    }
  }

  export function open(id, startTab = 'infos') {
    openId = id;
    detail = null;
    tab = startTab;
    saved = false;
    sheetOpen = true;
    if (token) loadDetail();
  }

  // Lien direct vers une fiche : /admin/tracks?open=<id>
  $effect(() => {
    const id = page.url.searchParams.get('open');
    if (id && token) untrack(() => openId !== id && open(id));
  });

  const afterEdit = () => {
    busy = true;
    saved = false;
    return async ({ result, update }) => {
      busy = false;
      await update({ reset: false });
      if (result.type === 'success' && result.data?.success) {
        saved = true;
        loadDetail();
      }
    };
  };
  const afterDelete = () => {
    busy = true;
    return async ({ result, update }) => {
      busy = false;
      await update({ reset: false });
      if (result.type === 'success' && result.data?.deleted) sheetOpen = false;
    };
  };
</script>

<Sheet bind:open={sheetOpen} title="Fiche du titre" wide>
  {#if detailErr}
    <p class="a-card bad">{detailErr}</p>
  {:else if !detail}
    <p class="a-empty">Chargement…</p>
  {:else}
    {@const t = detail.track}
    <div class="fiche">
      <header class="f-head">
        <TrackCover {t} size="xl" />
        <div class="f-main">
          <b class="f-title">{t.title}</b>
          <span class="a-muted">{t.artist}</span>
          <span class="tags">
            <TrackFlags t={{ ...t, reported: detail.issues.length }} />
            <em class="a-tag">{t.source}</em>
          </span>
          {#if t.preview_url}
            <!-- svelte-ignore a11y_media_has_caption -->
            <audio controls preload="none" src={t.preview_url}></audio>
          {/if}
        </div>
      </header>

      {#if detail.issues.length}
        <div class="a-card bad issues">
          {#each detail.issues as i (i.kind)}
            <p><b>{ISSUE[i.kind] ?? i.kind}</b> signalé{i.count > 1 ? ` ${i.count} fois` : ''} · {ago(i.updated_at)}{i.note ? ` · « ${i.note} »` : ''}</p>
          {/each}
          <a class="a-btn small" href="/admin/reparer">Ouvrir Réparer</a>
        </div>
      {/if}

      <div class="a-chips" role="group" aria-label="Rubriques">
        {#each TABS as [k, l] (k)}
          <button class="a-chip" type="button" aria-pressed={tab === k} onclick={() => (tab = k)}>
            {l}{#if k === 'answers' && entries.some((e) => e.answers.length)}<b>{entries.reduce((n, e) => n + e.answers.length, 0)}</b>{/if}
          </button>
        {/each}
      </div>

      {#if tab === 'infos'}
        <TrackInfos {detail} {form} {busy} {saved} {afterEdit} {afterDelete} />
      {:else if tab === 'answers'}
        <TrackAnswers trackId={t.id} {entries} types={detail.types} {token} onchange={loadDetail} />
      {:else if tab === 'video'}
        {#key t.id}<VideoFixer track={t} {token} />{/key}
      {:else}
        {#key t.id}<TrackAudioDebugger trackId={t.id} {token} />{/key}
      {/if}
    </div>
  {/if}
</Sheet>

<style>
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }

  .fiche { display: grid; gap: 14px; min-width: 0; }
  .f-head { display: flex; gap: 14px; align-items: flex-start; }
  .f-main { flex: 1; display: grid; gap: 4px; min-width: 0; }
  .f-title { font-family: var(--a-display); font-size: 1.5rem; font-weight: 800; line-height: 1.1; overflow-wrap: anywhere; }
  .f-main audio { width: 100%; height: 36px; margin-top: 6px; }
  .issues { display: grid; gap: 6px; font-size: 0.85rem; }
  .issues .a-btn { justify-self: start; }
</style>

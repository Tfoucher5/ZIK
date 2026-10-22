<script>
  /**
   * ReportModal — signalement joueur ou bug en jeu
   * Props:
   *   open            — bindable, contrôle l'affichage
   *   type            — 'user' | 'bug'
   *   reportedUsername — pré-rempli pour type='user'
   *   reportedUserId  — id Supabase du joueur signalé
   *   roomId          — code de la room courante
   *   reporterId      — userId de celui qui signale (null si invité)
   *   reporterName    — username de celui qui signale
   *   history         — manches terminées de la partie en cours
   *   currentRound    — { round, trackId, videoId } de la manche active, ou null
   *   getGameContext  — renvoie l'état de la partie au moment du signalement
   */
  import { BUG_MOTIFS, buildTrackChoices, motifCibleUnTitre, MIN_REPORT_MESSAGE } from '$lib/shared/reports/bug-report.js';
  import { collectReportContext } from '$lib/shared/reports/context.js';
  import { buildReportBody } from './reportBody.js';
  import ReportButton from './ReportButton.svelte';
  import ReportField from './ReportField.svelte';
  import ReportHead from './ReportHead.svelte';
  import ReportMotifs from './ReportMotifs.svelte';
  import ReportSuccess from './ReportSuccess.svelte';
  import ReportTracks from './ReportTracks.svelte';

  let {
    open            = $bindable(false),
    type            = 'user',
    reportedUsername = '',
    reportedUserId  = null,
    roomId          = null,
    reporterId      = null,
    reporterName    = '',
    history         = [],
    currentRound    = null,
    getGameContext  = null,
  } = $props();

  const MOTIFS_USER = [
    { value: 'insultes',  label: 'Insultes / harcèlement' },
    { value: 'triche',    label: 'Triche / jeu déloyal' },
    { value: 'spam',      label: 'Spam / flood' },
    { value: 'autre',     label: 'Autre' },
  ];

  let motif   = $state('insultes');
  let message = $state('');
  let loading = $state(false);
  let success = $state(false);
  let error   = $state('');

  let bugMotif = $state('audio');
  let checked  = $state({});
  const choices = $derived(buildTrackChoices({ history, current: currentRound }));
  const cibleUnTitre = $derived(motifCibleUnTitre(bugMotif));
  const selection = $derived(
    cibleUnTitre ? choices.filter(c => checked[c.key]) : [],
  );

  // La manche en cours est cochée d'office : c'est le cas le plus fréquent.
  $effect(() => {
    const first = choices[0];
    if (open && first?.locked && checked[first.key] === undefined) {
      checked = { ...checked, [first.key]: true };
    }
  });

  async function submit() {
    if (message.trim().length < MIN_REPORT_MESSAGE) {
      error = `Explique le problème en quelques mots (${MIN_REPORT_MESSAGE} caractères minimum).`;
      return;
    }
    error = '';
    loading = true;
    try {
      const context = collectReportContext({ game: getGameContext?.() ?? null });
      const body = buildReportBody({
        type, reporterId, reporterName, reportedUserId, reportedUsername, roomId,
        subject: type === 'user' ? motif : bugMotif,
        message: message.trim(),
        context,
        tracks: cibleUnTitre ? selection : null,
      });

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); error = d.error || 'Erreur.'; }
      else { success = true; message = ''; motif = 'insultes'; }
    } catch { error = 'Erreur réseau.'; }
    finally { loading = false; }
  }

  function close() {
    open    = false;
    success = false;
    error   = '';
    message = '';
    motif   = 'insultes';
  }
</script>

<svelte:window onkeydown={e => { if (open && e.key === 'Escape') close(); }} />

{#if open}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="rm-overlay"
  role="dialog"
  aria-modal="true"
  onclick={e => { if (e.target === e.currentTarget) close(); }}
>
  <div class="rm-box" class:rm-bug={type === 'bug'}>
    <button class="rm-close" onclick={close} aria-label="Fermer">✕</button>

    {#if success}
      <ReportSuccess onclose={close} />
    {:else}
      <ReportHead {type} {reportedUsername} />

      {#if type === 'user'}
        <ReportField label="Motif">
          <ReportMotifs options={MOTIFS_USER} bind:value={motif} />
        </ReportField>
      {:else}
        <ReportField label="Que se passe-t-il ?">
          <ReportMotifs options={BUG_MOTIFS} bind:value={bugMotif} />
        </ReportField>

        {#if cibleUnTitre}
          <ReportField label="Sur quel titre ?">
            <ReportTracks {choices} bind:checked />
          </ReportField>
        {/if}
      {/if}

      <ReportField label="Description" forId="rm-message" required>
        <textarea
          id="rm-message"
          class="rm-textarea"
          bind:value={message}
          placeholder={type === 'user' ? 'Décris ce que ce joueur a fait…' : 'Que s\'est-il passé ? Depuis quand ? Sur quelle manche ?'}
          rows="4"
          maxlength="1000"
        ></textarea>
        <span class="rm-count">{message.length}/1000</span>
      </ReportField>

      {#if error}<p class="rm-error">⚠ {error}</p>{/if}

      <ReportButton onclick={submit} disabled={loading}>
        {loading ? 'Envoi…' : 'Envoyer le signalement'}
      </ReportButton>
    {/if}
  </div>
</div>
{/if}

<style>
.rm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--overlay);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: rm-fade 0.15s ease;
}
@keyframes rm-fade {
  from { opacity: 0; }
}

.rm-box {
  --rm-c: 248 113 113;
  position: relative;
  width: 100%;
  max-width: 440px;
  padding: 28px;
  border-radius: 16px;
  overflow: hidden;
  background: color-mix(in srgb, var(--bg2, #0f0f0f) 88%, transparent);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  border: 1px solid var(--border, rgb(var(--c-glass) / 0.1));
  box-shadow:
    0 30px 80px rgba(0, 0, 0, 0.6),
    0 0 60px rgb(var(--rm-c) / 0.1),
    inset 0 1px 0 rgb(var(--c-glass) / 0.06);
  animation: rm-pop-in 0.22s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.rm-box.rm-bug { --rm-c: 251 191 36; }
@keyframes rm-pop-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.96);
  }
}
.rm-box::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgb(var(--rm-c) / 0.9), transparent);
  pointer-events: none;
}
.rm-box::after {
  content: "";
  position: absolute;
  top: -70px;
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  height: 140px;
  background: radial-gradient(closest-side, rgb(var(--rm-c) / 0.14), transparent);
  pointer-events: none;
}

.rm-close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 1;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgb(var(--c-glass, 255 255 255) / 0.05);
  border: 1px solid var(--border, rgb(var(--c-glass) / 0.1));
  color: var(--mid, #8896aa);
  font-size: 0.72rem;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}
.rm-close:hover {
  color: var(--text, #fafafa);
  background: rgb(var(--rm-c) / 0.15);
  border-color: rgb(var(--rm-c) / 0.4);
}

.rm-textarea {
  background: rgb(var(--c-glass, 255 255 255) / 0.05);
  border: 1px solid var(--border, rgb(var(--c-glass) / 0.1));
  border-radius: 12px;
  padding: 12px 14px 28px;
  color: var(--text, #fafafa);
  font-family: inherit;
  font-size: 0.88rem;
  outline: none;
  resize: vertical;
  min-height: 110px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.rm-textarea:focus {
  border-color: rgb(var(--accent-rgb, 255 0 255) / 0.5);
  box-shadow: 0 0 0 3px rgb(var(--accent-rgb, 255 0 255) / 0.1);
}
.rm-count {
  position: absolute;
  bottom: 9px;
  right: 13px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.6rem;
  color: var(--dim, #4a5568);
  pointer-events: none;
}

.rm-error {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.8rem;
  color: var(--danger, #f87171);
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.25);
  border-radius: 10px;
  padding: 9px 12px;
  margin-bottom: 14px;
}
</style>

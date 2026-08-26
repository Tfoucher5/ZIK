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
   */
  import { BUG_MOTIFS, buildTrackChoices, motifCibleUnTitre } from '$lib/reports/bug-report.js';

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
    // Un titre muet désigné vaut description. Pour une mauvaise réponse, le
    // titre ne dit pas ce qui est faux : le message reste nécessaire.
    const messageRequis = type !== 'bug' || bugMotif !== 'audio' || selection.length === 0;
    if (messageRequis && !message.trim()) { error = 'Décris le problème.'; return; }
    error = '';
    loading = true;
    try {
      const body = type === 'user'
        ? {
            type: 'user',
            reporter_id: reporterId || null,
            reporter_name: reporterName || null,
            reported_user_id: reportedUserId || null,
            reported_username: reportedUsername || null,
            room_id: roomId || null,
            subject: motif,
            message: message.trim(),
          }
        : {
            type: 'bug',
            reporter_id: reporterId || null,
            reporter_name: reporterName || null,
            room_id: roomId || null,
            subject: bugMotif,
            message: message.trim(),
            metadata: cibleUnTitre
              ? {
                  tracks: selection.map(c => ({
                    trackId: c.trackId,
                    videoId: c.videoId,
                    round: c.round,
                    answer: c.answer,
                  })),
                }
              : {},
          };

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
      <div class="rm-success">
        <div class="rm-success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path class="rm-check" d="M4 12.5 9.5 18 20 6.5"/>
          </svg>
        </div>
        <h2>Signalement envoyé</h2>
        <p>Merci ! Un modérateur va examiner ça rapidement.</p>
        <button class="rm-btn" onclick={close}>Fermer</button>
      </div>
    {:else}
      <div class="rm-head">
        <div class="rm-ico">{type === 'user' ? '🚨' : '🐛'}</div>
        <div class="rm-head-txt">
          <div class="rm-kicker">{type === 'user' ? 'Modération' : 'Rapport technique'}</div>
          {#if type === 'user'}
            <h2 class="rm-title">Signaler <span class="rm-username">{reportedUsername}</span></h2>
          {:else}
            <h2 class="rm-title">Signaler un bug</h2>
          {/if}
        </div>
      </div>
      <p class="rm-subtitle">
        {type === 'user'
          ? 'Le signalement est anonyme et sera examiné par un modérateur.'
          : "Décris ce qui s'est passé pour nous aider à corriger le problème."}
      </p>

      {#if type === 'user'}
        <div class="rm-field">
          <span class="rm-label">Motif</span>
          <div class="rm-motifs">
            {#each MOTIFS_USER as m (m.value)}
              <button type="button" class="rm-motif" class:on={motif === m.value} onclick={() => motif = m.value}>
                {m.label}
              </button>
            {/each}
          </div>
        </div>
      {:else}
        <div class="rm-field">
          <span class="rm-label">Que se passe-t-il ?</span>
          <div class="rm-motifs">
            {#each BUG_MOTIFS as m (m.value)}
              <button type="button" class="rm-motif" class:on={bugMotif === m.value} onclick={() => bugMotif = m.value}>
                {m.label}
              </button>
            {/each}
          </div>
        </div>

        {#if cibleUnTitre}
          <div class="rm-field">
            <span class="rm-label">Sur quel titre ?</span>
            {#if choices.length}
              <div class="rm-tracks">
                {#each choices as c (c.key)}
                  <label class="rm-track" class:locked={c.locked}>
                    <input
                      type="checkbox"
                      checked={Boolean(checked[c.key])}
                      onchange={e => checked = { ...checked, [c.key]: e.currentTarget.checked }}
                    >
                    <span class="rm-track-lbl">{c.label}</span>
                    {#if c.locked}<span class="rm-track-lock" title="Titre masqué pendant la manche">🔒</span>{/if}
                  </label>
                {/each}
              </div>
            {:else}
              <p class="rm-empty">Aucun titre joué pour l'instant.</p>
            {/if}
          </div>
        {/if}
      {/if}

      <div class="rm-field">
        <label class="rm-label" for="rm-message">
          Description
          {#if type === 'bug' && bugMotif === 'audio' && selection.length}
            <span class="rm-opt">(facultatif)</span>
          {:else}
            <span class="rm-req">*</span>
          {/if}
        </label>
        <textarea
          id="rm-message"
          bind:value={message}
          placeholder={type === 'user' ? 'Décris ce que ce joueur a fait…' : 'Que s\'est-il passé ? Depuis quand ? Sur quelle manche ?'}
          rows="4"
          maxlength="1000"
        ></textarea>
        <span class="rm-count">{message.length}/1000</span>
      </div>

      {#if error}<p class="rm-error">⚠ {error}</p>{/if}

      <button class="rm-btn" onclick={submit} disabled={loading}>
        {loading ? 'Envoi…' : 'Envoyer le signalement'}
      </button>
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

.rm-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
  padding-right: 30px;
}
.rm-ico {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  background: rgb(var(--rm-c) / 0.12);
  border: 1px solid rgb(var(--rm-c) / 0.35);
  box-shadow: 0 0 28px rgb(var(--rm-c) / 0.25);
}
.rm-kicker {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgb(var(--rm-c) / 0.95);
  margin-bottom: 4px;
}
.rm-title {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 1.5rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.05;
  color: var(--text, #fafafa);
}
.rm-username { color: var(--accent, #ff00ff); }
.rm-subtitle {
  font-size: 0.8rem;
  color: var(--mid, #8896aa);
  margin-bottom: 20px;
}

.rm-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  position: relative;
}
.rm-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mid, #8896aa);
}
.rm-label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--border, rgb(var(--c-glass) / 0.1));
}
.rm-req { color: var(--accent, #ff00ff); }
.rm-opt { color: var(--dim, #64748b); font-weight: 400; }

.rm-tracks {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 190px;
  overflow-y: auto;
}
.rm-track {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border: 1px solid var(--border, rgb(var(--c-glass) / 0.08));
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--mid, #94a3b8);
  transition: border-color 0.15s;
}
.rm-track:hover { border-color: rgb(var(--accent-rgb) / 0.4); }
.rm-track.locked { border-style: dashed; }
.rm-track input { flex-shrink: 0; accent-color: var(--accent); }
.rm-track-lbl {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rm-track-lock { flex-shrink: 0; font-size: 0.78rem; }
.rm-empty { color: var(--dim, #64748b); font-size: 0.83rem; margin: 0; }

.rm-motifs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.rm-motif {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 12px;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  text-align: left;
  background: rgb(var(--c-glass, 255 255 255) / 0.04);
  border: 1px solid var(--border, rgb(var(--c-glass) / 0.1));
  border-radius: 10px;
  color: var(--mid, #8896aa);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.rm-motif::before {
  content: "";
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 2px;
  border: 1px solid var(--border2, rgb(var(--c-glass) / 0.18));
  background: transparent;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.rm-motif:hover {
  border-color: var(--border2, rgb(var(--c-glass) / 0.18));
  color: var(--text, #fafafa);
}
.rm-motif.on {
  background: rgb(var(--accent-rgb, 255 0 255) / 0.1);
  border-color: rgb(var(--accent-rgb, 255 0 255) / 0.5);
  color: var(--text, #fafafa);
  box-shadow: 0 0 16px rgb(var(--accent-rgb, 255 0 255) / 0.12);
}
.rm-motif.on::before {
  background: var(--accent, #ff00ff);
  border-color: var(--accent, #ff00ff);
  box-shadow: 0 0 8px rgb(var(--accent-rgb, 255 0 255) / 0.6);
}

.rm-field textarea {
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
.rm-field textarea:focus {
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

.rm-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, var(--accent, #ff00ff), var(--accent2, #cc00cc));
  color: var(--on-accent);
  border: none;
  border-radius: 12px;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 900;
  font-size: 0.95rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 6px 22px rgb(var(--accent-rgb, 255 0 255) / 0.3);
  transition: box-shadow 0.15s, transform 0.12s;
}
.rm-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgb(var(--accent-rgb, 255 0 255) / 0.45);
}
.rm-btn:active { transform: translateY(0); }
.rm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.rm-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 14px 0 4px;
}
.rm-success-icon {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(74, 222, 128, 0.12);
  border: 2px solid rgba(74, 222, 128, 0.45);
  box-shadow: 0 0 34px rgba(74, 222, 128, 0.3);
  color: var(--success, #4ade80);
  margin-bottom: 8px;
  animation: rm-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.rm-success-icon svg { width: 30px; height: 30px; }
.rm-check {
  stroke-dasharray: 30;
  stroke-dashoffset: 30;
  animation: rm-draw 0.4s ease 0.15s forwards;
}
@keyframes rm-pop {
  from { opacity: 0; transform: scale(0.5); }
}
@keyframes rm-draw {
  to { stroke-dashoffset: 0; }
}
.rm-success h2 {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 1.35rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.rm-success p { color: var(--mid, #8896aa); font-size: 0.85rem; }
.rm-success .rm-btn { width: auto; padding: 12px 30px; margin-top: 10px; }
</style>

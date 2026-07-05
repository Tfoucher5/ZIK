<script>
  import Modal from '$lib/components/Modal.svelte';

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
   */
  let {
    open            = $bindable(false),
    type            = 'user',
    reportedUsername = '',
    reportedUserId  = null,
    roomId          = null,
    reporterId      = null,
    reporterName    = '',
  } = $props();

  const MOTIFS_USER = [
    { value: 'insultes',  label: 'Insultes / harcèlement' },
    { value: 'triche',    label: 'Triche / comportement déloyal' },
    { value: 'spam',      label: 'Spam / flood' },
    { value: 'autre',     label: 'Autre' },
  ];

  let motif   = $state('insultes');
  let message = $state('');
  let loading = $state(false);
  let success = $state(false);
  let error   = $state('');

  async function submit() {
    if (!message.trim()) { error = 'Décris le problème.'; return; }
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
            message: message.trim(),
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

<Modal {open} onClose={close} maxWidth="440px">
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
          <div class="rm-ico" class:rm-ico-bug={type === 'bug'}>{type === 'user' ? '🚨' : '🐛'}</div>
          <div class="rm-head-txt">
            {#if type === 'user'}
              <h2 class="rm-title">Signaler <span class="rm-username">{reportedUsername}</span></h2>
              <p class="rm-subtitle">Anonyme, examiné par un modérateur.</p>
            {:else}
              <h2 class="rm-title">Signaler un bug</h2>
              <p class="rm-subtitle">Décris ce qui s'est passé pour nous aider à corriger le problème.</p>
            {/if}
          </div>
        </div>

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
        {/if}

        <div class="rm-field">
          <label class="rm-label" for="rm-message">Description <span class="rm-req">*</span></label>
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
</Modal>

<style>
.rm-head {
  display: flex; align-items: flex-start; gap: 14px;
  margin-bottom: 20px; padding-right: 24px;
}
.rm-ico {
  width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.25rem;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.3);
  box-shadow: 0 0 24px rgba(248, 113, 113, 0.15);
}
.rm-ico-bug {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.3);
  box-shadow: 0 0 24px rgba(251, 191, 36, 0.12);
}
.rm-title {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 1.35rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.04em;
  line-height: 1.1;
}
.rm-username { color: var(--accent, #ff00ff); }
.rm-subtitle { font-size: 0.8rem; color: var(--mid, #8896aa); margin-top: 3px; }

.rm-field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; position: relative; }
.rm-label {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--mid, #8896aa);
}
.rm-req { color: var(--accent, #ff00ff); }

.rm-motifs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rm-motif {
  padding: 10px 12px;
  font-family: inherit; font-size: 0.78rem; font-weight: 600;
  text-align: left;
  background: rgb(var(--c-glass, 255 255 255) / 0.04);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  color: var(--mid, #8896aa);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.rm-motif:hover { border-color: var(--border2, rgba(255, 255, 255, 0.18)); color: var(--text, #fafafa); }
.rm-motif.on {
  background: rgb(var(--accent-rgb, 255 0 255) / 0.12);
  border-color: rgb(var(--accent-rgb, 255 0 255) / 0.5);
  color: var(--text, #fafafa);
  box-shadow: 0 0 14px rgb(var(--accent-rgb, 255 0 255) / 0.12);
}

.rm-field textarea {
  background: rgb(var(--c-glass, 255 255 255) / 0.05);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 10px;
  padding: 12px 14px 28px;
  color: var(--text, #fafafa);
  font-family: inherit; font-size: 0.88rem;
  outline: none; resize: vertical; min-height: 110px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.rm-field textarea:focus {
  border-color: rgb(var(--accent-rgb, 255 0 255) / 0.5);
  box-shadow: 0 0 0 3px rgb(var(--accent-rgb, 255 0 255) / 0.1);
}
.rm-count {
  position: absolute; bottom: 9px; right: 13px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.6rem; color: var(--dim, #4a5568);
  pointer-events: none;
}

.rm-error {
  display: flex; align-items: center; gap: 7px;
  font-size: 0.8rem; color: var(--danger, #f87171);
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.25);
  border-radius: 8px;
  padding: 9px 12px; margin-bottom: 14px;
}

.rm-btn {
  width: 100%;
  background: linear-gradient(135deg, var(--accent, #ff00ff), var(--accent2, #cc00cc));
  color: #000; border: none;
  padding: 13px; border-radius: 10px;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 900; font-size: 0.92rem;
  letter-spacing: 0.12em; text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 6px 22px rgb(var(--accent-rgb, 255 0 255) / 0.3);
  transition: box-shadow 0.15s, transform 0.12s;
}
.rm-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgb(var(--accent-rgb, 255 0 255) / 0.45); }
.rm-btn:active { transform: translateY(0); }
.rm-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

.rm-success {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 6px; padding: 10px 0 4px;
}
.rm-success-icon {
  width: 64px; height: 64px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(74, 222, 128, 0.12);
  border: 2px solid rgba(74, 222, 128, 0.45);
  box-shadow: 0 0 30px rgba(74, 222, 128, 0.25);
  color: var(--success, #4ade80);
  margin-bottom: 8px;
  animation: rm-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.rm-success-icon svg { width: 28px; height: 28px; }
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
  font-size: 1.3rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.rm-success p { color: var(--mid, #8896aa); font-size: 0.85rem; }
.rm-success .rm-btn { width: auto; padding: 11px 28px; margin-top: 10px; }
</style>

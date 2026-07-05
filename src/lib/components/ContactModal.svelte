<script>
  import Modal from '$lib/components/Modal.svelte';

  let { open = $bindable(false) } = $props();

  let name    = $state('');
  let email   = $state('');
  let subject = $state('');
  let message = $state('');
  let loading = $state(false);
  let success = $state(false);
  let error   = $state('');

  async function submit() {
    if (!email.trim() || !message.trim()) { error = 'Email et message requis.'; return; }
    error = '';
    loading = true;
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contact',
          reporter_name: name.trim() || null,
          reporter_email: email.trim(),
          subject: subject.trim() || null,
          message: message.trim(),
        }),
      });
      if (!res.ok) { const d = await res.json(); error = d.error || 'Erreur.'; }
      else { success = true; name = ''; email = ''; subject = ''; message = ''; }
    } catch { error = 'Erreur réseau.'; }
    finally { loading = false; }
  }

  function close() {
    open = false;
    success = false;
    error = '';
  }
</script>

<Modal {open} onClose={close} maxWidth="520px">
      {#if success}
        <div class="cm-success">
          <div class="cm-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path class="cm-check" d="M4 12.5 9.5 18 20 6.5"/>
            </svg>
          </div>
          <h2>Message envoyé !</h2>
          <p>Merci, je te répondrai dès que possible.</p>
          <button class="cm-btn" onclick={close}>Fermer</button>
        </div>
      {:else}
        <div class="cm-head">
          <div class="cm-ico">✉️</div>
          <div>
            <h2 class="cm-title">Nous contacter</h2>
            <p class="cm-subtitle">Bug, question, collaboration — on est là.</p>
          </div>
        </div>

        <div class="cm-row">
          <div class="cm-field">
            <label class="cm-label" for="cm-name">Prénom / pseudo</label>
            <input id="cm-name" type="text" bind:value={name} placeholder="Optionnel" maxlength="60">
          </div>
          <div class="cm-field">
            <label class="cm-label" for="cm-email">Email <span class="cm-req">*</span></label>
            <input id="cm-email" type="email" bind:value={email} placeholder="toi@exemple.fr" maxlength="120">
          </div>
        </div>

        <div class="cm-field">
          <label class="cm-label" for="cm-subject">Objet</label>
          <input id="cm-subject" type="text" bind:value={subject} placeholder="Ex : Bug sur la room Pop" maxlength="120">
        </div>

        <div class="cm-field">
          <label class="cm-label" for="cm-message">Message <span class="cm-req">*</span></label>
          <textarea id="cm-message" bind:value={message} placeholder="Décris ton problème ou ta demande…" rows="5" maxlength="2000"></textarea>
          <span class="cm-count">{message.length}/2000</span>
        </div>

        {#if error}<p class="cm-error">⚠ {error}</p>{/if}

        <button class="cm-btn" onclick={submit} disabled={loading}>
          {loading ? 'Envoi…' : 'Envoyer le message'}
        </button>
      {/if}
</Modal>

<style>
.cm-head {
  display: flex; align-items: flex-start; gap: 14px;
  margin-bottom: 22px; padding-right: 24px;
}
.cm-ico {
  width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.25rem;
  background: rgb(var(--accent-rgb, 255 0 255) / 0.1);
  border: 1px solid rgb(var(--accent-rgb, 255 0 255) / 0.3);
  box-shadow: 0 0 24px rgb(var(--accent-rgb, 255 0 255) / 0.12);
}
.cm-title {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 1.35rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.04em;
  line-height: 1.1;
}
.cm-subtitle { font-size: 0.8rem; color: var(--mid, #8896aa); margin-top: 3px; }

.cm-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.cm-field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; position: relative; }
.cm-label {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--mid, #8896aa);
}
.cm-req { color: var(--accent, #ff00ff); }

.cm-field input, .cm-field textarea {
  background: rgb(var(--c-glass, 255 255 255) / 0.05);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 10px;
  padding: 11px 14px;
  color: var(--text, #fafafa);
  font-family: inherit; font-size: 0.9rem;
  outline: none; resize: vertical;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.cm-field input:focus, .cm-field textarea:focus {
  border-color: rgb(var(--accent-rgb, 255 0 255) / 0.5);
  box-shadow: 0 0 0 3px rgb(var(--accent-rgb, 255 0 255) / 0.1);
}
.cm-field textarea { min-height: 110px; padding-bottom: 28px; }
.cm-count {
  position: absolute; bottom: 9px; right: 13px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.6rem; color: var(--dim, #4a5568);
  pointer-events: none;
}

.cm-error {
  display: flex; align-items: center; gap: 7px;
  font-size: 0.8rem; color: var(--danger, #f87171);
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.25);
  border-radius: 8px;
  padding: 9px 12px; margin-bottom: 14px;
}

.cm-btn {
  width: 100%;
  background: linear-gradient(135deg, var(--accent, #ff00ff), var(--accent2, #cc00cc));
  color: #000; border: none;
  padding: 13px; border-radius: 10px;
  font-family: "Barlow Condensed", sans-serif;
  font-weight: 900; font-size: 0.95rem;
  letter-spacing: 0.12em; text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 6px 22px rgb(var(--accent-rgb, 255 0 255) / 0.3);
  transition: box-shadow 0.15s, transform 0.12s;
}
.cm-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgb(var(--accent-rgb, 255 0 255) / 0.45); }
.cm-btn:active { transform: translateY(0); }
.cm-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

.cm-success {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 6px; padding: 16px 0 4px;
}
.cm-success-icon {
  width: 64px; height: 64px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(74, 222, 128, 0.12);
  border: 2px solid rgba(74, 222, 128, 0.45);
  box-shadow: 0 0 30px rgba(74, 222, 128, 0.25);
  color: var(--success, #4ade80);
  margin-bottom: 8px;
  animation: cm-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.cm-success-icon svg { width: 28px; height: 28px; }
.cm-check {
  stroke-dasharray: 30;
  stroke-dashoffset: 30;
  animation: cm-draw 0.4s ease 0.15s forwards;
}
@keyframes cm-pop {
  from { opacity: 0; transform: scale(0.5); }
}
@keyframes cm-draw {
  to { stroke-dashoffset: 0; }
}
.cm-success h2 {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 1.3rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.cm-success p { color: var(--mid, #8896aa); font-size: 0.88rem; }
.cm-success .cm-btn { width: auto; padding: 11px 28px; margin-top: 10px; }

@media (max-width: 480px) {
  .cm-row { grid-template-columns: 1fr; gap: 0; }
}
</style>

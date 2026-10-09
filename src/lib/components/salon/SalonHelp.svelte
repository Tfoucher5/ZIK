<script>
  import { MIN_REPORT_MESSAGE } from '$lib/reports/bug-report.js';
  import { collectReportContext } from '$lib/reports/context.js';

  /**
   * Demande d'aide depuis un salon : part dans les messages de l'admin avec
   * l'état du salon, pour que le support puisse intervenir en direct.
   *
   * @type {{
   *   open: boolean, code: string, role: 'host'|'regie'|'player', pro?: boolean,
   *   reporterId?: string|null, reporterName?: string|null,
   *   getState?: () => object,
   * }}
   */
  let {
    open = $bindable(false),
    code,
    role,
    pro = false,
    reporterId = null,
    reporterName = null,
    getState = () => ({}),
  } = $props();

  const QUICK = [
    "La musique ne se lance pas sur la TV",
    "Un joueur n'arrive pas à rejoindre",
    "Le salon est bloqué",
  ];

  let message = $state('');
  let email = $state('');
  let loading = $state(false);
  let sent = $state(false);
  let error = $state('');

  const left = $derived(Math.max(0, MIN_REPORT_MESSAGE - message.trim().length));

  async function submit(e) {
    e.preventDefault();
    if (left) {
      error = `Explique le problème en quelques mots (${MIN_REPORT_MESSAGE} caractères minimum).`;
      return;
    }
    error = '';
    loading = true;
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bug',
          subject: 'salon',
          room_id: code,
          message: message.trim(),
          reporter_id: reporterId,
          reporter_name: reporterName,
          reporter_email: email.trim() || null,
          metadata: { context: collectReportContext({ salon: { code, role, ...getState() } }) },
        }),
      });
      if (res.ok) {
        sent = true;
        message = '';
      } else {
        error = (await res.json().catch(() => ({}))).error || "L'envoi a échoué, réessaie.";
      }
    } catch {
      error = 'Pas de connexion internet, réessaie dans un instant.';
    } finally {
      loading = false;
    }
  }

  function close() {
    open = false;
    sent = false;
    error = '';
  }
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === 'Escape') close(); }} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="hp-backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div class="hp" role="dialog" aria-modal="true" aria-labelledby="hp-title">
      <button class="hp-close" onclick={close} aria-label="Fermer">×</button>

      {#if sent}
        <p class="sx-kicker"><b>●</b> Message envoyé</p>
        <h2 id="hp-title">On s'en occupe.</h2>
        <p class="hp-lead">
          Le support ZIK voit ton salon en direct et peut t'aider sans couper la partie.
          Garde cet écran ouvert : notre réponse peut s'afficher ici.
        </p>
        <button class="sx-btn sx-btn-primary" onclick={close}>Fermer</button>
      {:else}
        <p class="sx-kicker"><b>●</b> Salon {code}</p>
        <h2 id="hp-title">Besoin d'aide ?</h2>
        {#if pro}
          <p class="hp-pro">ZIK Pro : ta demande passe en priorité.</p>
        {/if}
        <p class="hp-lead">Dis-nous ce qui se passe. L'état du salon est joint automatiquement.</p>

        <form class="hp-form" onsubmit={submit}>
          <div class="hp-quick">
            {#each QUICK as q (q)}
              <button type="button" onclick={() => (message = message.trim() ? `${message.trim()} ${q}.` : `${q}. `)}>{q}</button>
            {/each}
          </div>
          <label>
            <span>Le problème</span>
            <textarea bind:value={message} rows="4" maxlength="2000" placeholder="Ex. : la vidéo reste noire depuis la manche 3"></textarea>
            <small class:ok={!left}>{left ? `Encore ${left} caractère${left > 1 ? 's' : ''}` : 'Parfait'}</small>
          </label>
          <label>
            <span>Ton email (pour te répondre, facultatif)</span>
            <input type="email" bind:value={email} autocomplete="email" placeholder="toi@exemple.fr" />
          </label>
          {#if error}<p class="hp-err" role="alert">{error}</p>{/if}
          <button class="sx-btn sx-btn-primary" type="submit" disabled={loading || left > 0}>
            {loading ? 'Envoi…' : "Envoyer au support"}
          </button>
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  .hp-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: grid;
    place-items: center;
    padding: 16px;
    background: var(--overlay);
  }
  .hp {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: min(520px, 100%);
    max-height: calc(100dvh - 32px);
    overflow-y: auto;
    padding: 26px 22px 22px;
    background: var(--bg);
    color: var(--text);
    border: 2px solid var(--text);
    border-radius: 3px;
    box-shadow: 8px 8px 0 var(--accent);
  }
  .hp h2 {
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 2rem;
    line-height: 1;
    text-transform: uppercase;
    padding-right: 40px;
  }
  .hp-lead {
    color: var(--mid);
    line-height: 1.5;
    font-size: 0.95rem;
  }
  .hp-pro {
    align-self: flex-start;
    padding: 5px 10px;
    border: 1px solid var(--accent);
    border-radius: 2px;
    color: var(--accent);
    font-family: var(--s-mono);
    font-size: 0.78rem;
  }
  .hp-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 34px;
    height: 34px;
    background: none;
    border: 1px solid var(--border2);
    border-radius: 3px;
    color: var(--text);
    font-size: 1.2rem;
    cursor: pointer;
  }
  .hp-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .hp-quick {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .hp-quick button {
    padding: 7px 10px;
    border: 1px solid var(--border2);
    border-radius: 2px;
    background: none;
    color: var(--text);
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .hp-quick button:hover {
    border-color: var(--accent);
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  label span {
    font-family: var(--s-mono);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--mid);
  }
  textarea,
  input {
    width: 100%;
    padding: 11px 12px;
    border: 1px solid var(--border2);
    border-radius: 3px;
    background: var(--bg2);
    color: var(--text);
    font: inherit;
    font-size: 1rem;
    resize: vertical;
  }
  textarea:focus,
  input:focus {
    outline: none;
    border-color: var(--accent);
  }
  small {
    font-size: 0.75rem;
    color: var(--dim);
  }
  small.ok {
    color: var(--success);
  }
  .hp-err {
    color: var(--danger);
    font-size: 0.88rem;
  }
  .hp .sx-btn {
    align-self: stretch;
  }
  .hp .sx-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>

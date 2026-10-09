<script>
  import { MIN_REPORT_MESSAGE } from '$lib/reports/bug-report.js';
  import { collectReportContext } from '$lib/reports/context.js';
  import SupportChat from './SupportChat.svelte';

  /**
   * « Appeler un admin » depuis la régie ou l'écran TV : l'admin reçoit une
   * alerte et répond dans le chat. Un report garde la trace dans Messages.
   *
   * @type {{
   *   open: boolean, code: string, role: 'host'|'regie', pro?: boolean,
   *   chat: import('./supportChat.svelte.js').SupportChat,
   *   reporterId?: string|null, getState?: () => object,
   * }}
   */
  let {
    open = $bindable(false),
    code,
    role,
    pro = false,
    chat,
    reporterId = null,
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

  // Une demande est déjà ouverte : on retourne simplement au chat
  $effect(() => {
    if (open && chat.active) {
      open = false;
      if (!chat.expanded) chat.toggle();
    }
  });

  function report(text) {
    const where = role === 'regie' ? 'la régie' : "l'écran TV";
    const body = text.length >= MIN_REPORT_MESSAGE ? text : `Appel d'un admin depuis ${where}. ${text}`.trim();
    return fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'bug',
        subject: 'salon',
        room_id: code,
        message: body,
        reporter_id: reporterId,
        reporter_email: email.trim() || null,
        metadata: { context: collectReportContext({ salon: { code, role, ...getState() } }) },
      }),
    });
  }

  async function submit(e) {
    e.preventDefault();
    error = '';
    loading = true;
    const text = message.trim();
    const call = await chat.call(text);
    try {
      const res = await report(text);
      if (!call.ok && !res.ok) error = (await res.json().catch(() => ({}))).error || "L'envoi a échoué, réessaie.";
    } catch {
      if (!call.ok) error = 'Pas de connexion internet, réessaie dans un instant.';
    }
    loading = false;
    if (error) return;
    message = '';
    // Sans le direct, la demande part quand même par message au support
    if (call.ok) open = false;
    else sent = true;
  }

  function close() {
    open = false;
    sent = false;
    error = '';
  }
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === 'Escape') close(); }} />

<SupportChat {chat} {role} onCall={() => (open = true)} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="hp-backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div class="hp" role="dialog" aria-modal="true" aria-labelledby="hp-title">
      <button class="hp-close" onclick={close} aria-label="Fermer">×</button>

      {#if sent}
        <p class="sx-kicker"><b>●</b> Message envoyé</p>
        <h2 id="hp-title">On s'en occupe.</h2>
        <p class="hp-lead">
          Le direct avec le salon est coupé, ta demande est partie par message.
          Le support ZIK te répond dès que la connexion revient, ou par email.
        </p>
        <button class="sx-btn sx-btn-primary" onclick={close}>Fermer</button>
      {:else}
        <p class="sx-kicker"><b>●</b> Salon {code}</p>
        <h2 id="hp-title">Appeler un admin</h2>
        {#if pro}
          <p class="hp-pro">ZIK Pro : ta demande passe en priorité.</p>
        {/if}
        <p class="hp-lead">
          Un admin ZIK est prévenu tout de suite et te répond ici, dans un chat, sans couper la partie.
          L'état du salon lui est transmis.
        </p>

        <form class="hp-form" onsubmit={submit}>
          <div class="hp-quick">
            {#each QUICK as q (q)}
              <button type="button" onclick={() => (message = message.trim() ? `${message.trim()} ${q}.` : `${q}. `)}>{q}</button>
            {/each}
          </div>
          <label>
            <span>Ce qui se passe (conseillé)</span>
            <textarea bind:value={message} rows="3" maxlength="500" placeholder="Ex. : la vidéo reste noire depuis la manche 3"></textarea>
          </label>
          <label>
            <span>Ton email (si on doit te répondre plus tard, facultatif)</span>
            <input type="email" bind:value={email} autocomplete="email" placeholder="toi@exemple.fr" />
          </label>
          {#if error}<p class="hp-err" role="alert">{error}</p>{/if}
          <button class="sx-btn sx-btn-primary" type="submit" disabled={loading}>
            {loading ? 'Appel…' : 'Appeler un admin'}
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

<script>
  import { ago } from '$lib/shared/admin/stats-utils.js';

  /** Réponse d'un prospect : résumé, réponse suggérée, message d'origine et suivi. */
  let { r, c, place, onToggle } = $props();

  let copied = $state(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(r.suggested_reply);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      copied = false;
    }
  }

  const mailto = $derived(
    `mailto:${r.from_email}?subject=${encodeURIComponent('Re: ' + (r.subject ?? ''))}${r.suggested_reply ? `&body=${encodeURIComponent(r.suggested_reply)}` : ''}`,
  );
</script>

<li class="reply" class:done={r.handled} class:prio={!r.handled && c.rank < 2}>
  <header>
    <em class="a-tag {c.tone}">{c.label}</em>
    <span class="who">
      <b>{r.prospects?.name ?? r.from_email}</b>
      <span class="a-muted">{[place, ago(r.received_at)].filter(Boolean).join(' · ')}</span>
    </span>
  </header>

  {#if r.summary}<p class="summary">{r.summary}</p>{/if}

  {#if r.suggested_reply}
    <div class="suggest">
      <span class="lbl">Réponse suggérée</span>
      <p>{r.suggested_reply}</p>
    </div>
  {/if}

  <details>
    <summary>Leur message</summary>
    <pre>{r.excerpt}</pre>
  </details>

  <div class="a-btns">
    {#if r.suggested_reply}
      <button class="a-btn small" type="button" onclick={copy}>{copied ? 'Copiée' : 'Copier la réponse'}</button>
    {/if}
    <a class="a-btn small" href={mailto}>Répondre par mail</a>
    <button class="a-btn small" class:good={!r.handled} type="button" onclick={onToggle}>
      {r.handled ? 'Remettre à traiter' : 'Marquer comme traitée'}
    </button>
  </div>
</li>

<style>
  .reply { display: grid; gap: 10px; min-width: 0; padding: 14px; border: 1px solid var(--a-line); border-radius: 14px; background: var(--a-bg); }
  .reply.prio { border-color: var(--a-accent); }
  .reply.done { opacity: 0.55; }
  .reply header { display: flex; align-items: flex-start; gap: 10px; }
  .who { flex: 1; min-width: 0; display: grid; }
  .who b { overflow-wrap: anywhere; }
  .who span { font-size: 0.8rem; }
  .summary { font-size: 0.92rem; line-height: 1.45; }
  .suggest { display: grid; gap: 4px; padding: 10px 12px; border-left: 3px solid var(--a-cyan); border-radius: 8px; background: var(--a-surface2); }
  .suggest p { font-size: 0.88rem; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
  .lbl { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--a-cyan); }
  details summary { font-size: 0.82rem; color: var(--a-muted); cursor: pointer; }
  pre { margin-top: 6px; max-height: 240px; overflow: auto; padding: 10px; border-radius: 8px; background: var(--a-surface); font-family: inherit; font-size: 0.84rem; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>

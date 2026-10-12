<script>
  import Street from './Street.svelte';
  import LoginForm from './LoginForm.svelte';
  import RegisterForm from './RegisterForm.svelte';
  import ResetForm from './ResetForm.svelte';
  import ConfirmView from './ConfirmView.svelte';
  import { AuthForm } from './authForm.svelte.js';
  /**
   * @type {{
   *   sb: any,
   *   open: boolean,
   *   view: 'login'|'register'|'confirm'|'reset',
   *   onClose: () => void,
   *   onSuccess?: () => void
   * }}
   */
  let { sb, open, view = $bindable('login'), onClose, onSuccess } = $props();

  const form = new AuthForm();

  /* animation d'entrée : portes + tampon — garde la modale montée
     même quand le layout ferme `open` sur SIGNED_IN */
  let entering = $state(false);

  let nowLabel = $derived.by(() => {
    void open;
    const d = new Date();
    return `Ce soir · ${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
  });

  function close() {
    if (entering) return;
    onClose();
  }

  function setView(v) { view = v; }

  function enter() {
    entering = true;
    setTimeout(() => {
      entering = false;
      onSuccess?.();
    }, 1900);
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && (open || entering)) close();
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open || entering}
<div class="gl-overlay" role="dialog" aria-modal="true" aria-label="Connexion">
  <Street {entering} />

  <section class="checkpoint">
    <button class="gl-close" onclick={close} aria-label="Fermer">✕</button>

    {#if view === 'login'}
      <LoginForm {sb} {form} {nowLabel} {entering} {setView} onLogged={enter} />
    {:else if view === 'register'}
      <RegisterForm {sb} {form} {nowLabel} {setView} onRegistered={() => view = 'confirm'} />
    {:else if view === 'reset'}
      <ResetForm {sb} {form} {nowLabel} {setView} />
    {:else if view === 'confirm'}
      <ConfirmView username={form.username} {nowLabel} onClose={close} />
    {/if}
  </section>
</div>
{/if}

<style>
  .gl-overlay {
    position: fixed; inset: 0; z-index: 1000;
    display: grid; grid-template-columns: 1fr 470px;
    background: var(--bg, #080808);
    animation: gl-in 0.2s ease;
  }
  @keyframes gl-in { from { opacity: 0; } to { opacity: 1; } }

  .checkpoint {
    position: relative; background: var(--bg2); border-left: 1px solid var(--border2);
    display: flex; flex-direction: column; justify-content: center;
    padding: 40px clamp(24px, 3vw, 48px);
    box-shadow: -40px 0 90px rgba(0, 0, 0, 0.6);
    /* le tampon scale(3) déborde en largeur ; et jamais de scrollbar visible sur le login */
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  }
  .checkpoint::-webkit-scrollbar { display: none; }
  .gl-close {
    position: absolute; top: 14px; right: 18px; background: none; border: none;
    color: var(--dim); font-size: 1.15rem; cursor: pointer; z-index: 5; line-height: 1; padding: 6px;
  }
  .gl-close:hover { color: var(--text); }

  @media (max-width: 920px) {
    .gl-overlay { grid-template-columns: 1fr; }
    .checkpoint { justify-content: flex-start; padding-top: 56px; padding-bottom: 40px; border-left: none; }
  }
  /* Hauteurs réduites : on compresse pour que tout tienne sans scroll */
  @media (max-height: 760px) {
    .checkpoint { justify-content: flex-start; padding-top: 44px; padding-bottom: 24px; }
    .gl-overlay .checkpoint :global(.field) { margin-bottom: 10px; }
  }
  @media (max-height: 620px) {
    .gl-overlay .checkpoint :global(.submit) { padding: 11px; }
  }
</style>

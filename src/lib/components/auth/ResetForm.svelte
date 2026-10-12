<script>
  import Captcha from '$lib/components/Captcha.svelte';
  import AuthPanel from './AuthPanel.svelte';
  import AuthField from './AuthField.svelte';
  import AuthAlert from './AuthAlert.svelte';
  import AuthButton from './AuthButton.svelte';
  import Stamp from './Stamp.svelte';
  import { captchaOn, CAPTCHA_MSG } from './authForm.svelte.js';

  /**
   * @type {{
   *   sb: any, form: import('./authForm.svelte.js').AuthForm, nowLabel: string,
   *   setView: (v: string) => void
   * }}
   */
  let { sb, form, nowLabel, setView } = $props();

  let error = $state('');
  let loading = $state(false);
  let sent = $state(false);
  let captchaToken = $state(null);
  let captcha = $state();

  async function handleReset() {
    error = '';
    if (!sb) { error = 'Supabase non configure.'; return; }
    if (!form.email) { error = 'Renseigne ton email.'; return; }
    if (captchaOn && !captchaToken) { error = CAPTCHA_MSG; return; }
    loading = true;
    const { error: err } = await sb.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken: captchaToken ?? undefined,
    });
    loading = false;
    captcha?.reset();
    if (err) error = err.message;
    else sent = true;
  }
</script>

<AuthPanel title="Oublié" em="le code" dot="?" sub="Le videur t'envoie un nouveau sésame par mail"
  head="Récupération" {nowLabel}
  switchText="Ça te revient ?" switchLabel="Faire vérifier" onSwitch={() => setView('login')}>
  {#if sent}
    <p class="confirm-txt">
      Si un compte existe pour <b>{form.email}</b>, un lien de réinitialisation
      vient de partir. Clique dessus pour choisir un nouveau mot de passe.
    </p>
    <Stamp label="Envoyé" on resa />
    <AuthButton ghost onclick={() => setView('login')}>Retour</AuthButton>
  {:else}
    <AuthField id="gl-reset-email" label="Email" type="email" bind:value={form.email} placeholder="ton@email.com"
      autocomplete="email" onEnter={handleReset} />

    <Captcha bind:this={captcha} bind:token={captchaToken} />
    <AuthAlert message={error} />

    <AuthButton onclick={handleReset} disabled={loading}>
      {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
    </AuthButton>
  {/if}
</AuthPanel>

<style>
  .confirm-txt { color: var(--mid); font-size: 0.9rem; line-height: 1.6; margin-top: 14px; }
</style>

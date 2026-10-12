<script>
  import { signupRef } from '$lib/signupRef.js';
  import Captcha from '$lib/components/Captcha.svelte';
  import AuthPanel from './AuthPanel.svelte';
  import YouLine from './YouLine.svelte';
  import OAuthButtons from './OAuthButtons.svelte';
  import AuthField from './AuthField.svelte';
  import AuthAlert from './AuthAlert.svelte';
  import AuthButton from './AuthButton.svelte';
  import { captchaOn, CAPTCHA_MSG } from './authForm.svelte.js';

  /**
   * @type {{
   *   sb: any, form: import('./authForm.svelte.js').AuthForm, nowLabel: string,
   *   setView: (v: string) => void, onRegistered: () => void
   * }}
   */
  let { sb, form, nowLabel, setView, onRegistered } = $props();

  let error = $state('');
  let loading = $state(false);
  let captchaToken = $state(null);
  let captcha;

  async function handleRegister() {
    error = '';
    if (!sb) { error = 'Supabase non configure.'; return; }
    if (!form.username || !form.regEmail || !form.regPassword) { error = 'Remplis tous les champs.'; return; }
    if (form.username.length < 3) { error = 'Pseudo trop court (min. 3 caracteres).'; return; }
    if (form.regPassword.length < 6) { error = 'Mot de passe trop court (min. 6 caracteres).'; return; }
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(form.username)) { error = 'Pseudo invalide (lettres, chiffres, - et _ uniquement).'; return; }
    // Robot pris au piège : on fait comme si tout allait bien, sans rien créer
    if (form.website) { onRegistered(); return; }
    if (captchaOn && !captchaToken) { error = CAPTCHA_MSG; return; }

    const { data: exists } = await sb.from('profiles').select('id').eq('username', form.username).maybeSingle();
    if (exists) { error = 'Ce pseudo est deja pris.'; return; }

    loading = true;
    const { error: err } = await sb.auth.signUp({
      email: form.regEmail,
      password: form.regPassword,
      options: {
        data: { username: form.username, signup_ref: signupRef() ?? undefined },
        captchaToken: captchaToken ?? undefined,
      },
    });
    loading = false;
    captcha?.reset();
    if (err) error = err.message;
    else onRegistered();
  }
</script>

<AuthPanel title="Ajoute ton" em="blaze" dot="." sub="Ce soir c'est open — la liste est encore ouverte"
  head="Nouvelle entrée" {nowLabel}
  switchText="Déjà sur la liste ?" switchLabel="Faire vérifier" onSwitch={() => setView('login')}>
  <YouLine reg live name={form.username || 'ton blaze ici'} hint="C'est ce nom qu'on criera au micro" />

  <OAuthButtons {sb} divider="ou remplis la fiche" />

  <AuthField id="gl-pseudo" label="Pseudo" bind:value={form.username} placeholder="MonPseudo" maxlength={20} autocomplete="username" />
  <AuthField id="gl-remail" label="Email" type="email" bind:value={form.regEmail} placeholder="ton@email.com" autocomplete="email" />
  <AuthField id="gl-rpwd" label="Mot de passe" toggle bind:show={form.showRegPwd} bind:value={form.regPassword}
    placeholder="Min. 6 caractères" autocomplete="new-password" onEnter={handleRegister} />

  <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" bind:value={form.website}>
  <Captcha bind:this={captcha} bind:token={captchaToken} />
  <AuthAlert message={error} />

  <AuthButton onclick={handleRegister} disabled={loading}>
    {loading ? 'Inscription en cours…' : "S'ajouter à la liste"}
  </AuthButton>
</AuthPanel>

<style>
  /* Champ piège : hors écran mais présent pour les robots */
  .hp {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
</style>

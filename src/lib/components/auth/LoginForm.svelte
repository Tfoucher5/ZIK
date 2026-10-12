<script>
  import Captcha from '$lib/components/Captcha.svelte';
  import AuthPanel from './AuthPanel.svelte';
  import YouLine from './YouLine.svelte';
  import OAuthButtons from './OAuthButtons.svelte';
  import AuthField from './AuthField.svelte';
  import AuthAlert from './AuthAlert.svelte';
  import AuthButton from './AuthButton.svelte';
  import Stamp from './Stamp.svelte';
  import { captchaOn, CAPTCHA_MSG } from './authForm.svelte.js';

  /**
   * @type {{
   *   sb: any, form: import('./authForm.svelte.js').AuthForm, nowLabel: string,
   *   entering: boolean, setView: (v: string) => void, onLogged: () => void
   * }}
   */
  let { sb, form, nowLabel, entering, setView, onLogged } = $props();

  let error = $state('');
  let loading = $state(false);
  let captchaToken = $state(null);
  let captcha;

  async function handleLogin() {
    error = '';
    if (!sb) { error = 'Supabase non configure.'; return; }
    if (!form.email || !form.password) { error = 'Remplis tous les champs.'; return; }
    if (captchaOn && !captchaToken) { error = CAPTCHA_MSG; return; }
    loading = true;
    const { error: err } = await sb.auth.signInWithPassword({
      email: form.email,
      password: form.password,
      options: { captchaToken: captchaToken ?? undefined },
    });
    loading = false;
    captcha?.reset();
    if (err) {
      const msg = err.message.toLowerCase();
      error = msg.includes('invalid') ? 'Email ou mot de passe incorrect.' :
              msg.includes('confirm') ? 'Confirme ton email avant de te connecter.' :
              err.message;
    } else {
      onLogged();
    }
  }
</script>

<AuthPanel title="T'es sur" em="la liste" dot="?" sub="Le videur vérifie — ça prend dix secondes"
  head="Guest list" {nowLabel}
  switchText="Pas sur la liste ?" switchLabel="S'ajouter à la liste" onSwitch={() => setView('register')}>
  <div class="entries">
    <div class="entry"><span class="nm">sofiane_dz</span><span class="st in">Entré · 22h02</span></div>
    <div class="entry"><span class="nm">petiteoreille</span><span class="st in">Entrée · 22h15</span></div>
    <div class="entry"><span class="nm">bpm140</span><span class="st">Au bar</span></div>
  </div>

  <YouLine name="Toi" hint="La prochaine ligne est pour toi" />

  <OAuthButtons {sb} divider="ou dicte au videur" />

  <AuthField id="gl-email" label="Email" type="email" bind:value={form.email} placeholder="ton@email.com" autocomplete="email" />
  <AuthField id="gl-pwd" label="Mot de passe" toggle bind:show={form.showLoginPwd} bind:value={form.password}
    placeholder="••••••••" autocomplete="current-password" onEnter={handleLogin} />

  <button type="button" class="forgot" onclick={() => setView('reset')}>Mot de passe oublié ?</button>

  <Captcha bind:this={captcha} bind:token={captchaToken} />
  <AuthAlert message={error} />

  <AuthButton onclick={handleLogin} disabled={loading || entering}>
    {entering ? 'Bienvenue au club' : loading ? 'Le videur vérifie…' : 'Faire vérifier'}
  </AuthButton>

  <Stamp label="Entrée" on={entering} />
</AuthPanel>

<style>
  .entries { border-bottom: 1px dashed var(--border2); padding: 6px 0 10px; margin-bottom: 6px; }
  .entry {
    display: flex; justify-content: space-between; align-items: center;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.92rem;
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--dim); padding: 5px 0;
  }
  .entry .nm { text-decoration: line-through; text-decoration-color: rgb(var(--accent-rgb) / 0.55); text-decoration-thickness: 2px; }
  .entry .st { font-size: 0.6rem; letter-spacing: 0.24em; }
  .entry .st.in { color: var(--success, #4ade80); }

  .forgot {
    display: block; margin: -4px 0 12px auto; background: none; border: none; cursor: pointer;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.68rem;
    letter-spacing: 0.16em; text-transform: uppercase; color: var(--mid);
    transition: color 0.15s;
  }
  .forgot:hover { color: var(--accent); }

  @media (max-height: 760px) {
    .entries { display: none; }
  }
</style>

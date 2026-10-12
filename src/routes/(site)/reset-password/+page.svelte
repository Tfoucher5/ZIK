<script>
  import { onMount, getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import AuthField from '$lib/components/auth/AuthField.svelte';
  import AuthAlert from '$lib/components/auth/AuthAlert.svelte';
  import AuthButton from '$lib/components/auth/AuthButton.svelte';

  const _ctx = getContext('zik');
  const sb = _ctx.sb;

  /** @type {'checking'|'ready'|'invalid'|'done'} */
  let phase = $state('checking');
  let password  = $state('');
  let password2 = $state('');
  let showPwd   = $state(false);
  let error     = $state('');
  let loading   = $state(false);

  onMount(() => {
    if (!sb) { phase = 'invalid'; return; }

    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') phase = 'ready';
    });

    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) phase = 'ready';
      else if (phase === 'checking') {
        setTimeout(() => { if (phase === 'checking') phase = 'invalid'; }, 2500);
      }
    });

    return () => subscription.unsubscribe();
  });

  async function handleSubmit() {
    error = '';
    if (password.length < 6) { error = 'Mot de passe trop court (min. 6 caractères).'; return; }
    if (password !== password2) { error = 'Les deux mots de passe ne correspondent pas.'; return; }
    loading = true;
    const { error: err } = await sb.auth.updateUser({ password });
    loading = false;
    if (err) { error = err.message; return; }
    phase = 'done';
    setTimeout(() => goto('/'), 1800);
  }
</script>

<svelte:head>
  <title>ZIK - Nouveau mot de passe</title>
  <meta name="robots" content="noindex, nofollow">
</svelte:head>

<main class="reset-wrap">
  <div class="card">
    <h1 class="title">Nouveau <em>sésame</em><span class="dot">.</span></h1>

    {#if phase === 'checking'}
      <p class="sub">Vérification du lien…</p>

    {:else if phase === 'invalid'}
      <p class="sub">Lien invalide ou expiré</p>
      <p class="txt">Ce lien de réinitialisation n'est plus valable. Redemande-en un depuis la connexion.</p>
      <AuthButton ghost href="/">Retour à l'accueil</AuthButton>

    {:else if phase === 'done'}
      <p class="sub">C'est fait</p>
      <p class="txt">Ton mot de passe a été mis à jour. On te renvoie au club…</p>
      <div class="stamp on">OK</div>

    {:else}
      <p class="sub">Choisis ton nouveau mot de passe</p>

      <AuthField id="rp-pwd" label="Nouveau mot de passe" toggle bind:show={showPwd} bind:value={password}
        placeholder="Min. 6 caractères" autocomplete="new-password" />
      <AuthField id="rp-pwd2" label="Confirme le mot de passe" type={showPwd ? 'text' : 'password'} bind:value={password2}
        placeholder="••••••••" autocomplete="new-password" onEnter={handleSubmit} />

      <AuthAlert message={error} />

      <AuthButton block onclick={handleSubmit} disabled={loading}>
        {loading ? 'Mise à jour…' : 'Valider le mot de passe'}
      </AuthButton>
    {/if}
  </div>
</main>

<style>
  .reset-wrap {
    min-height: 70vh; display: flex; align-items: center; justify-content: center;
    padding: 40px 20px;
  }
  .card {
    width: 100%; max-width: 420px; background: var(--bg2);
    border: 1px solid var(--border2); border-radius: var(--r, 5px);
    padding: 34px 28px 28px; position: relative;
  }
  .title {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; text-transform: uppercase;
    font-size: clamp(30px, 4vw, 44px); line-height: 0.9; color: var(--text);
  }
  .title em { font-style: normal; color: transparent; -webkit-text-stroke: 1.8px rgb(var(--c-glass, 255 255 255) / 0.85); }
  .title .dot { color: var(--accent); }
  .sub {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.66rem;
    letter-spacing: 0.26em; text-transform: uppercase; color: var(--mid); margin: 10px 0 22px;
  }
  .txt { color: var(--mid); font-size: 0.9rem; line-height: 1.6; margin-bottom: 18px; }

  .stamp {
    display: inline-block; margin-top: 6px;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.5rem;
    letter-spacing: 0.24em; text-transform: uppercase; color: var(--success, #4ade80);
    border: 4px solid var(--success, #4ade80); border-radius: 6px; padding: 6px 16px;
    transform: rotate(-14deg); opacity: 0.95;
  }
</style>

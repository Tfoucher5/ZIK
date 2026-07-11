<script>
  import { onMount, getContext } from 'svelte';
  import { goto } from '$app/navigation';

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

{#snippet eyeIcon(show)}
  {#if show}
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><circle cx="12" cy="12" r="3"/></svg>
  {:else}
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  {/if}
{/snippet}

<svelte:head>
  <title>ZIK — Nouveau mot de passe</title>
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
      <a class="btn ghost" href="/">Retour à l'accueil</a>

    {:else if phase === 'done'}
      <p class="sub">C'est fait</p>
      <p class="txt">Ton mot de passe a été mis à jour. On te renvoie au club…</p>
      <div class="stamp on">OK</div>

    {:else}
      <p class="sub">Choisis ton nouveau mot de passe</p>

      <div class="field">
        <label for="rp-pwd">Nouveau mot de passe</label>
        <div class="pwd-wrap">
          <input id="rp-pwd" type={showPwd ? 'text' : 'password'} bind:value={password} placeholder="Min. 6 caractères" autocomplete="new-password" />
          <button type="button" class="pwd-eye" onclick={() => showPwd = !showPwd} aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
            {@render eyeIcon(showPwd)}
          </button>
        </div>
      </div>
      <div class="field">
        <label for="rp-pwd2">Confirme le mot de passe</label>
        <input id="rp-pwd2" type={showPwd ? 'text' : 'password'} bind:value={password2} placeholder="••••••••" autocomplete="new-password"
          onkeypress={e => { if (e.key === 'Enter') handleSubmit(); }} />
      </div>

      {#if error}<div class="alert-err">{error}</div>{/if}

      <button class="btn" onclick={handleSubmit} disabled={loading}>
        {loading ? 'Mise à jour…' : 'Valider le mot de passe'}
      </button>
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

  .field { margin-bottom: 12px; }
  .field label {
    display: block; font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
    font-size: 0.62rem; letter-spacing: 0.26em; text-transform: uppercase;
    color: var(--mid); margin-bottom: 5px;
  }
  .field input {
    width: 100%; background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r, 5px); color: var(--text); font-size: 0.92rem; padding: 10px 12px;
    outline: none; transition: border-color 0.15s; font-family: 'Barlow', sans-serif;
  }
  .field input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.12); }
  .pwd-wrap { position: relative; display: flex; align-items: center; }
  .pwd-wrap input { width: 100%; padding-right: 42px; }
  .pwd-eye {
    position: absolute; right: 6px; background: none; border: none; cursor: pointer;
    color: var(--dim); padding: 6px; display: flex; align-items: center;
    transition: color 0.15s;
  }
  .pwd-eye:hover { color: var(--accent); }

  .alert-err {
    background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.4);
    color: var(--danger, #f87171); border-radius: var(--r, 5px);
    padding: 8px 12px; font-size: 0.82rem; margin-bottom: 12px;
  }

  .btn {
    display: block; width: 100%; text-align: center;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.05rem;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--on-accent); background: var(--accent);
    border: none; border-radius: var(--r, 5px); padding: 13px; cursor: pointer;
    box-shadow: 0 0 26px rgb(var(--accent-rgb) / 0.35); transition: transform 0.15s;
  }
  .btn:hover:not(:disabled) { transform: translateY(-2px); }
  .btn:disabled { opacity: 0.75; cursor: default; }
  .btn.ghost { background: none; color: var(--text); border: 1px solid var(--border2); box-shadow: none; text-decoration: none; }
  .btn.ghost:hover { border-color: var(--accent); color: var(--accent); }

  .stamp {
    display: inline-block; margin-top: 6px;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.5rem;
    letter-spacing: 0.24em; text-transform: uppercase; color: var(--success, #4ade80);
    border: 4px solid var(--success, #4ade80); border-radius: 6px; padding: 6px 16px;
    transform: rotate(-14deg); opacity: 0.95;
  }
</style>

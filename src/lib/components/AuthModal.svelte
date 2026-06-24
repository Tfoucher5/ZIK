<script>
  /**
   * @type {{
   *   sb: any,
   *   open: boolean,
   *   view: 'login'|'register'|'confirm',
   *   onClose: () => void,
   *   onSuccess?: () => void
   * }}
   */
  let { sb, open, view = $bindable('login'), onClose, onSuccess } = $props();

  let loginEmail    = $state('');
  let loginPassword = $state('');
  let loginError    = $state('');
  let loginLoading  = $state(false);
  let showLoginPwd  = $state(false);

  let regUsername = $state('');
  let regEmail    = $state('');
  let regPassword = $state('');
  let regError    = $state('');
  let regLoading  = $state(false);
  let showRegPwd  = $state(false);

  function resetFields() {
    loginError = ''; regError = '';
    loginLoading = false; regLoading = false;
  }

  function close() { resetFields(); onClose(); }

  function setView(v) { view = v; resetFields(); }

  async function handleLogin() {
    loginError = '';
    if (!sb) { loginError = 'Supabase non configure.'; return; }
    if (!loginEmail || !loginPassword) { loginError = 'Remplis tous les champs.'; return; }
    loginLoading = true;
    const { error } = await sb.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    loginLoading = false;
    if (error) {
      const msg = error.message.toLowerCase();
      loginError = msg.includes('invalid') ? 'Email ou mot de passe incorrect.' :
                   msg.includes('confirm') ? 'Confirme ton email avant de te connecter.' :
                   error.message;
    } else {
      onSuccess?.();
    }
  }

  async function handleRegister() {
    regError = '';
    if (!sb) { regError = 'Supabase non configure.'; return; }
    if (!regUsername || !regEmail || !regPassword) { regError = 'Remplis tous les champs.'; return; }
    if (regUsername.length < 3) { regError = 'Pseudo trop court (min. 3 caracteres).'; return; }
    if (regPassword.length < 6) { regError = 'Mot de passe trop court (min. 6 caracteres).'; return; }
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(regUsername)) { regError = 'Pseudo invalide (lettres, chiffres, - et _ uniquement).'; return; }

    const { data: exists } = await sb.from('profiles').select('id').eq('username', regUsername).maybeSingle();
    if (exists) { regError = 'Ce pseudo est deja pris.'; return; }

    regLoading = true;
    const { error } = await sb.auth.signUp({ email: regEmail, password: regPassword, options: { data: { username: regUsername } } });
    regLoading = false;
    if (error) regError = error.message;
    else view = 'confirm';
  }

  async function signInWithGoogle() {
    if (!sb) return;
    await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  }

  async function signInWithDiscord() {
    if (!sb) return;
    await sb.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: window.location.origin } });
  }
</script>

{#if open}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div id="auth-modal" class="overlay" role="dialog" aria-modal="true" onclick={e => { if (e.target === e.currentTarget) close(); }}>
  <div class="modal" id="auth-box">
    <button class="close-btn" onclick={close}>&#x2715;</button>

    {#if view === 'login'}
      <div id="view-login">
        <div class="modal-logo">ZIK<span>.</span></div>
        <h2>Bon retour &#x1F44B;</h2>
        <p class="mdesc">Connecte-toi pour sauvegarder tes scores.</p>
        <button class="btn-google" onclick={signInWithGoogle}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.96 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continuer avec Google
        </button>
        <button class="btn-discord" onclick={signInWithDiscord}>
          <svg width="18" height="18" viewBox="0 0 127.14 96.36"><path fill="#fff" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
          Continuer avec Discord
        </button>
        <div class="auth-divider"><span>ou</span></div>
        <div class="field"><label for="email">Email</label><input type="email" bind:value={loginEmail} placeholder="ton@email.com" autocomplete="email"></div>
        <div class="field">
          <label for="password">Mot de passe</label>
          <div class="pwd-wrap">
            <input type={showLoginPwd ? 'text' : 'password'} bind:value={loginPassword} placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;" autocomplete="current-password"
              onkeypress={e => { if (e.key === 'Enter') handleLogin(); }}>
            <button type="button" class="pwd-eye" onclick={() => showLoginPwd = !showLoginPwd} tabindex="-1">
              {#if showLoginPwd}🙈{:else}👁️{/if}
            </button>
          </div>
        </div>
        {#if loginError}<div class="alert-err">{loginError}</div>{/if}
        <button class="btn-accent full" onclick={handleLogin} disabled={loginLoading}>
          {loginLoading ? 'Connexion...' : 'Se connecter'}
        </button>
        <p class="mswitch">Pas de compte ? <a href="/rooms" onclick={e => { e.preventDefault(); setView('register'); }}>Cr&eacute;er un compte</a></p>
      </div>

    {:else if view === 'register'}
      <div id="view-register">
        <div class="modal-logo">ZIK<span>.</span></div>
        <h2>Cr&eacute;er un compte</h2>
        <p class="mdesc">Rejoins ZIK et suis ta progression.</p>
        <button class="btn-google" onclick={signInWithGoogle}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.96 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continuer avec Google
        </button>
        <button class="btn-discord" onclick={signInWithDiscord}>
          <svg width="18" height="18" viewBox="0 0 127.14 96.36"><path fill="#fff" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
          Continuer avec Discord
        </button>
        <div class="auth-divider"><span>ou</span></div>
        <div class="field"><label for="pseudo">Pseudo</label><input type="text" bind:value={regUsername} placeholder="MonPseudo" maxlength="20" autocomplete="username"></div>
        <div class="field"><label for="email">Email</label><input type="email" bind:value={regEmail} placeholder="ton@email.com" autocomplete="email"></div>
        <div class="field">
          <label for="pasword">Mot de passe</label>
          <div class="pwd-wrap">
            <input type={showRegPwd ? 'text' : 'password'} bind:value={regPassword} placeholder="Min. 6 caract&egrave;res" autocomplete="new-password"
              onkeypress={e => { if (e.key === 'Enter') handleRegister(); }}>
            <button type="button" class="pwd-eye" onclick={() => showRegPwd = !showRegPwd} tabindex="-1">
              {#if showRegPwd}🙈{:else}👁️{/if}
            </button>
          </div>
        </div>
        {#if regError}<div class="alert-err">{regError}</div>{/if}
        <button class="btn-accent full" onclick={handleRegister} disabled={regLoading}>
          {regLoading ? 'Cr&eacute;ation...' : 'Cr&eacute;er mon compte'}
        </button>
        <p class="mswitch">D&eacute;j&agrave; un compte ? <a href="/login" onclick={e => { e.preventDefault(); setView('login'); }}>Se connecter</a></p>
      </div>

    {:else if view === 'confirm'}
      <div id="view-confirm">
        <div class="confirm-view">
          <div class="confirm-emoji">&#x1F4EC;</div>
          <h2>V&eacute;rifie tes mails</h2>
          <p class="mdesc">Un lien de confirmation t&apos;a &eacute;t&eacute; envoy&eacute;. Clique dessus puis reviens jouer !</p>
          <button class="btn-ghost full" onclick={close}>Fermer</button>
        </div>
      </div>
    {/if}
  </div>
</div>
{/if}

<style>
  #auth-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: #fff;
    border-radius: 12px;
    padding: 32px;
    width: 100%;
    max-width: 400px;
    position: relative;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }

  .close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
  }

  .modal-logo {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 20px;
  }

  .modal-logo span {
    color: #ff6b6b;
  }

  h2 {
    margin: 0 0 8px 0;
    font-size: 22px;
  }

  .mdesc {
    color: #666;
    margin-bottom: 24px;
    font-size: 14px;
  }

  .btn-google,
  .btn-discord {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: center;
    width: 100%;
    padding: 10px 16px;
    border-radius: 8px;
    border: none;
    color: #fff;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 8px;
    transition: background 0.15s;
  }

  .btn-google {
    background: #fff;
    color: #333;
    border: 1px solid #ddd;
  }

  .btn-google:hover {
    background: #f9f9f9;
  }

  .btn-discord {
    background: #5865f2;
  }

  .btn-discord:hover {
    background: #4752c4;
  }

  .auth-divider {
    display: flex;
    align-items: center;
    margin: 20px 0;
    color: #999;
    font-size: 14px;
  }

  .auth-divider::before,
  .auth-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #ddd;
  }

  .auth-divider::before {
    margin-right: 10px;
  }

  .auth-divider::after {
    margin-left: 10px;
  }

  .field {
    display: flex;
    flex-direction: column;
    margin-bottom: 16px;
  }

  .field label {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 6px;
    color: #333;
  }

  .field input {
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
  }

  .field input:focus {
    outline: none;
    border-color: #5865f2;
    box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.1);
  }

  .pwd-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .pwd-wrap input {
    width: 100%;
  }

  .pwd-eye {
    position: absolute;
    right: 10px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
  }

  .alert-err {
    background: #ffe6e6;
    color: #d32f2f;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    margin-bottom: 16px;
  }

  .btn-accent {
    background: #5865f2;
    color: #fff;
    padding: 12px 16px;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    transition: background 0.15s;
  }

  .btn-accent:hover:not(:disabled) {
    background: #4752c4;
  }

  .btn-accent:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-accent.full {
    margin-bottom: 16px;
  }

  .mswitch {
    text-align: center;
    font-size: 14px;
    color: #666;
    margin: 0;
  }

  .mswitch a {
    color: #5865f2;
    text-decoration: none;
    font-weight: 600;
  }

  .mswitch a:hover {
    text-decoration: underline;
  }

  .btn-ghost {
    background: #f0f0f0;
    color: #333;
    padding: 12px 16px;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    transition: background 0.15s;
  }

  .btn-ghost:hover {
    background: #e0e0e0;
  }

  .confirm-view {
    text-align: center;
  }

  .confirm-emoji {
    font-size: 64px;
    margin-bottom: 16px;
  }

  #view-confirm h2 {
    margin-bottom: 12px;
  }
</style>

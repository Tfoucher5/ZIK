<script>
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

  let loginEmail    = $state('');
  let loginPassword = $state('');
  let loginError    = $state('');
  let loginLoading  = $state(false);
  let showLoginPwd  = $state(false);

  let resetError   = $state('');
  let resetLoading = $state(false);
  let resetSent    = $state(false);

  let regUsername = $state('');
  let regEmail    = $state('');
  let regPassword = $state('');
  let regError    = $state('');
  let regLoading  = $state(false);
  let showRegPwd  = $state(false);

  /* animation d'entrée : portes + tampon — garde la modale montée
     même quand le layout ferme `open` sur SIGNED_IN */
  let entering = $state(false);

  let nowLabel = $derived.by(() => {
    void open;
    const d = new Date();
    return `Ce soir · ${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
  });

  function resetFields() {
    loginError = ''; regError = ''; resetError = '';
    loginLoading = false; regLoading = false; resetLoading = false;
    resetSent = false;
  }

  function close() {
    if (entering) return;
    resetFields();
    onClose();
  }

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
      entering = true;
      setTimeout(() => {
        entering = false;
        resetFields();
        onSuccess?.();
      }, 1900);
    }
  }

  async function handleReset() {
    resetError = '';
    if (!sb) { resetError = 'Supabase non configure.'; return; }
    if (!loginEmail) { resetError = 'Renseigne ton email.'; return; }
    resetLoading = true;
    const { error } = await sb.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    resetLoading = false;
    if (error) resetError = error.message;
    else resetSent = true;
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

  function onKeydown(e) {
    if (e.key === 'Escape' && (open || entering)) close();
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#snippet oauthButtons()}
  <div class="oauth">
    <button class="btn-oauth" onclick={signInWithGoogle} type="button">
      <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.96 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      Google
    </button>
    <button class="btn-oauth" onclick={signInWithDiscord} type="button">
      <svg width="16" height="12" viewBox="0 0 127.14 96.36" aria-hidden="true"><path fill="#5865f2" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
      Discord
    </button>
  </div>
{/snippet}

{#snippet eyeIcon(show)}
  {#if show}
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><circle cx="12" cy="12" r="3"/></svg>
  {:else}
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  {/if}
{/snippet}

{#if open || entering}
<div class="gl-overlay" class:entering role="dialog" aria-modal="true" aria-label="Connexion">

  <!-- ── La rue : néon + porte du club ── -->
  <section class="street" aria-hidden="true">
    <div class="neon">ZIK<small>Blind test club</small></div>
    <div class="doors">
      <div class="door l">
        <div class="hublot"></div>
        <div class="bar"></div>
        <div class="poster">
          <div class="p1">Blind test — ce soir</div>
          <div class="p2">Entrée libre · ELO en jeu</div>
        </div>
      </div>
      <div class="door r">
        <div class="hublot"></div>
        <div class="bar"></div>
        <div class="sticker">Complet chaque soir</div>
      </div>
    </div>
    <div class="doorlight"></div>
  </section>

  <!-- ── Le checkpoint ── -->
  <section class="checkpoint">
    <button class="gl-close" onclick={close} aria-label="Fermer">✕</button>

    {#if view === 'login'}
      <h2 class="gl-title">T'es sur <em>la liste</em><span class="dot"> ?</span></h2>
      <p class="gl-sub">Le videur vérifie — ça prend dix secondes</p>

      <div class="board">
        <div class="board-head"><b>Guest list</b><span>{nowLabel}</span></div>

        <div class="entries">
          <div class="entry"><span class="nm">sofiane_dz</span><span class="st in">Entré · 22h02</span></div>
          <div class="entry"><span class="nm">petiteoreille</span><span class="st in">Entrée · 22h15</span></div>
          <div class="entry"><span class="nm">bpm140</span><span class="st">Au bar</span></div>
        </div>

        <div class="youline">
          <span class="arrow">→</span>
          <span class="txt">Toi<small>La prochaine ligne est pour toi</small></span>
        </div>

        {@render oauthButtons()}
        <div class="divider">ou dicte au videur</div>

        <div class="field">
          <label for="gl-email">Email</label>
          <input id="gl-email" type="email" bind:value={loginEmail} placeholder="ton@email.com" autocomplete="email" />
        </div>
        <div class="field">
          <label for="gl-pwd">Mot de passe</label>
          <div class="pwd-wrap">
            <input id="gl-pwd" type={showLoginPwd ? 'text' : 'password'} bind:value={loginPassword} placeholder="••••••••" autocomplete="current-password"
              onkeypress={e => { if (e.key === 'Enter') handleLogin(); }} />
            <button type="button" class="pwd-eye" onclick={() => showLoginPwd = !showLoginPwd} aria-label={showLoginPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {@render eyeIcon(showLoginPwd)}
            </button>
          </div>
        </div>

        <button type="button" class="forgot" onclick={() => setView('reset')}>Mot de passe oublié ?</button>

        {#if loginError}<div class="alert-err">{loginError}</div>{/if}

        <button class="submit" onclick={handleLogin} disabled={loginLoading || entering}>
          {entering ? 'Bienvenue au club' : loginLoading ? 'Le videur vérifie…' : 'Faire vérifier'}
        </button>

        <div class="stamp" class:on={entering}>Entrée</div>
      </div>

      <p class="gl-switch">Pas sur la liste ? <button onclick={() => setView('register')} type="button">S'ajouter à la liste</button></p>

    {:else if view === 'register'}
      <h2 class="gl-title">Ajoute ton <em>blaze</em><span class="dot">.</span></h2>
      <p class="gl-sub">Ce soir c'est open — la liste est encore ouverte</p>

      <div class="board">
        <div class="board-head"><b>Nouvelle entrée</b><span>{nowLabel}</span></div>

        <div class="youline reg">
          <span class="arrow">→</span>
          <span class="txt live">{regUsername || 'ton blaze ici'}<small>C'est ce nom qu'on criera au micro</small></span>
        </div>

        {@render oauthButtons()}
        <div class="divider">ou remplis la fiche</div>

        <div class="field">
          <label for="gl-pseudo">Pseudo</label>
          <input id="gl-pseudo" type="text" bind:value={regUsername} placeholder="MonPseudo" maxlength="20" autocomplete="username" />
        </div>
        <div class="field">
          <label for="gl-remail">Email</label>
          <input id="gl-remail" type="email" bind:value={regEmail} placeholder="ton@email.com" autocomplete="email" />
        </div>
        <div class="field">
          <label for="gl-rpwd">Mot de passe</label>
          <div class="pwd-wrap">
            <input id="gl-rpwd" type={showRegPwd ? 'text' : 'password'} bind:value={regPassword} placeholder="Min. 6 caractères" autocomplete="new-password"
              onkeypress={e => { if (e.key === 'Enter') handleRegister(); }} />
            <button type="button" class="pwd-eye" onclick={() => showRegPwd = !showRegPwd} aria-label={showRegPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {@render eyeIcon(showRegPwd)}
            </button>
          </div>
        </div>

        {#if regError}<div class="alert-err">{regError}</div>{/if}

        <button class="submit" onclick={handleRegister} disabled={regLoading}>
          {regLoading ? 'Inscription en cours…' : "S'ajouter à la liste"}
        </button>
      </div>

      <p class="gl-switch">Déjà sur la liste ? <button onclick={() => setView('login')} type="button">Faire vérifier</button></p>

    {:else if view === 'reset'}
      <h2 class="gl-title">Oublié <em>le code</em><span class="dot"> ?</span></h2>
      <p class="gl-sub">Le videur t'envoie un nouveau sésame par mail</p>

      <div class="board">
        <div class="board-head"><b>Récupération</b><span>{nowLabel}</span></div>

        {#if resetSent}
          <p class="confirm-txt">
            Si un compte existe pour <b>{loginEmail}</b>, un lien de réinitialisation
            vient de partir. Clique dessus pour choisir un nouveau mot de passe.
          </p>
          <div class="stamp resa on">Envoyé</div>
          <button class="submit ghost" onclick={() => setView('login')}>Retour</button>
        {:else}
          <div class="field">
            <label for="gl-reset-email">Email</label>
            <input id="gl-reset-email" type="email" bind:value={loginEmail} placeholder="ton@email.com" autocomplete="email"
              onkeypress={e => { if (e.key === 'Enter') handleReset(); }} />
          </div>

          {#if resetError}<div class="alert-err">{resetError}</div>{/if}

          <button class="submit" onclick={handleReset} disabled={resetLoading}>
            {resetLoading ? 'Envoi en cours…' : 'Envoyer le lien'}
          </button>
        {/if}
      </div>

      <p class="gl-switch">Ça te revient ? <button onclick={() => setView('login')} type="button">Faire vérifier</button></p>

    {:else if view === 'confirm'}
      <h2 class="gl-title">Vérifie <em>tes mails</em><span class="dot">.</span></h2>
      <p class="gl-sub">Ton nom est noté — reste à le confirmer</p>

      <div class="board confirm">
        <div class="board-head"><b>Guest list</b><span>{nowLabel}</span></div>
        <div class="youline">
          <span class="arrow">→</span>
          <span class="txt live">{regUsername || 'Toi'}<small>Ligne réservée</small></span>
        </div>
        <p class="confirm-txt">
          Un lien de confirmation t'a été envoyé. Clique dessus, reviens,
          et le videur te laisse passer direct.
        </p>
        <div class="stamp resa on">Réservé</div>
        <button class="submit ghost" onclick={close}>Fermer</button>
      </div>
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

  /* ════════ LA RUE ════════ */
  .street {
    position: relative; overflow: hidden;
    background:
      radial-gradient(700px 400px at 30% 12%, rgb(var(--accent-rgb, 255 0 255) / 0.09), transparent 60%),
      linear-gradient(180deg, #0d0d0d 0%, #080808 100%);
    display: flex; align-items: flex-end; justify-content: center;
  }
  .street::before {
    content: ""; position: absolute; inset: 0; opacity: 0.35;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  .neon {
    position: absolute; top: 9%; left: 50%; transform: translate(-50%);
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
    font-size: clamp(70px, 9vw, 130px);
    letter-spacing: 0.1em; line-height: 1; color: var(--accent);
    text-shadow: 0 0 14px rgb(var(--accent-rgb) / 0.9), 0 0 50px rgb(var(--accent-rgb) / 0.55), 0 0 110px rgb(var(--accent-rgb) / 0.35);
    animation: neon-flicker 7s linear infinite;
    user-select: none;
  }
  .neon small {
    display: block; font-size: 0.16em; letter-spacing: 0.85em; color: #fafafa;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.7); text-align: center; margin-top: 8px;
  }
  @keyframes neon-flicker {
    0%, 8.5%, 9.5%, 23%, 23.8%, 55%, 55.6%, 100% { opacity: 1; }
    9%, 23.4%, 55.3% { opacity: 0.35; }
    9.2% { opacity: 0.7; }
  }

  .doors {
    position: relative; width: min(420px, 60%); height: 62%;
    display: flex; perspective: 1400px;
    filter: drop-shadow(0 0 60px rgba(0, 0, 0, 0.8));
    animation: thump 1.9s ease-in-out infinite;
  }
  .doors::before {
    content: ""; position: absolute; inset: 0; z-index: -1;
    background:
      radial-gradient(60% 90% at 50% 100%, rgb(var(--accent-rgb) / 0.55), rgb(var(--accent-rgb) / 0.12) 60%, transparent),
      #16000f;
    opacity: 0; transition: opacity 1s ease 0.25s;
  }
  .entering .doors::before { opacity: 1; }
  @keyframes thump {
    0%, 100% { transform: scale(1); }
    12% { transform: scale(1.006); }
    24% { transform: scale(1); }
    36% { transform: scale(1.004); }
  }

  .door {
    flex: 1; position: relative;
    background: linear-gradient(170deg, #1a1a1a, #101010);
    border: 1px solid #262626; border-bottom: none;
    transition: transform 1.2s cubic-bezier(0.6, 0, 0.2, 1);
  }
  .door.l { border-radius: 6px 0 0 0; transform-origin: left center; }
  .door.r { border-radius: 0 6px 0 0; transform-origin: right center; }
  .entering .door.l { transform: rotateY(-72deg); }
  .entering .door.r { transform: rotateY(72deg); }
  .hublot {
    position: absolute; top: 14%; left: 50%; transform: translateX(-50%);
    width: 38%; aspect-ratio: 1; border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #131313, #0a0a0a 75%);
    border: 4px solid #262626; box-shadow: inset 0 0 24px #000;
  }
  .door .bar {
    position: absolute; top: 52%; left: 12%; right: 12%; height: 4.5%;
    background: linear-gradient(180deg, #3a3a3a, #222); border-radius: 6px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.6);
  }
  .poster {
    position: absolute; bottom: 13%; left: 14%; width: 72%;
    background: var(--accent); color: #000; padding: 10px 12px 12px;
    transform: rotate(-3deg); border-radius: 2px;
    font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  }
  .poster .p1 { font-weight: 900; font-size: 1.05rem; letter-spacing: 0.04em; line-height: 1; }
  .poster .p2 { font-weight: 700; font-size: 0.56rem; letter-spacing: 0.22em; margin-top: 4px; }
  .sticker {
    position: absolute; bottom: 30%; right: 10%; transform: rotate(6deg);
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 0.72rem;
    letter-spacing: 0.2em; text-transform: uppercase; color: #fafafa;
    border: 2px solid rgba(255, 255, 255, 0.5); border-radius: 3px; padding: 5px 9px; opacity: 0.75;
  }

  .doorlight {
    position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
    width: min(420px, 60%); height: 10px; border-radius: 50% 50% 0 0;
    background: var(--accent);
    animation: bass 1.9s ease-in-out infinite;
  }
  @keyframes bass {
    0%, 100% { opacity: 0.5; box-shadow: 0 -4px 24px 4px rgb(var(--accent-rgb) / 0.5), 0 -14px 60px 14px rgb(var(--accent-rgb) / 0.22); }
    12% { opacity: 1; box-shadow: 0 -6px 40px 10px rgb(var(--accent-rgb) / 0.85), 0 -26px 110px 30px rgb(var(--accent-rgb) / 0.4); }
    24% { opacity: 0.65; }
    36% { opacity: 0.95; box-shadow: 0 -6px 36px 9px rgb(var(--accent-rgb) / 0.75), 0 -22px 95px 26px rgb(var(--accent-rgb) / 0.35); }
  }

  /* ════════ LE CHECKPOINT ════════ */
  .checkpoint {
    position: relative; background: #0c0c0c; border-left: 1px solid var(--border2);
    display: flex; flex-direction: column; justify-content: center;
    padding: 40px clamp(24px, 3vw, 48px);
    box-shadow: -40px 0 90px rgba(0, 0, 0, 0.6);
    overflow-y: auto;
  }
  .gl-close {
    position: absolute; top: 14px; right: 18px; background: none; border: none;
    color: var(--dim); font-size: 1.15rem; cursor: pointer; z-index: 5; line-height: 1; padding: 6px;
  }
  .gl-close:hover { color: var(--text); }

  .gl-title {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; text-transform: uppercase;
    font-size: clamp(34px, 3.2vw, 52px); line-height: 0.9; color: var(--text);
  }
  .gl-title em { font-style: normal; color: transparent; -webkit-text-stroke: 1.8px rgb(var(--c-glass, 255 255 255) / 0.85); }
  .gl-title .dot { color: var(--accent); }
  .gl-sub {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.66rem;
    letter-spacing: 0.26em; text-transform: uppercase; color: var(--mid); margin: 10px 0 22px;
  }

  .board {
    position: relative; background: #101010; border: 1px solid var(--border2); border-radius: var(--r, 5px);
    padding: 30px 26px 24px;
  }
  .board::before {
    content: ""; position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
    width: 90px; height: 22px; background: linear-gradient(180deg, #3a3a3a, #1c1c1c);
    border-radius: 5px; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.7);
  }
  .board-head {
    display: flex; justify-content: space-between; align-items: baseline;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.6rem;
    letter-spacing: 0.3em; text-transform: uppercase; color: var(--dim);
    border-bottom: 2px solid var(--text); padding-bottom: 8px;
  }
  .board-head b { color: var(--text); font-size: 0.85rem; letter-spacing: 0.2em; }

  .entries { border-bottom: 1px dashed var(--border2); padding: 6px 0 10px; margin-bottom: 6px; }
  .entry {
    display: flex; justify-content: space-between; align-items: center;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.92rem;
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--dim); padding: 5px 0;
  }
  .entry .nm { text-decoration: line-through; text-decoration-color: rgb(var(--accent-rgb) / 0.55); text-decoration-thickness: 2px; }
  .entry .st { font-size: 0.6rem; letter-spacing: 0.24em; }
  .entry .st.in { color: var(--success, #4ade80); }

  .youline {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin: 4px -12px 12px;
    border: 1px dashed rgb(var(--accent-rgb) / 0.55); border-radius: var(--r, 5px);
    background: rgb(var(--accent-rgb) / 0.05);
  }
  .youline.reg { margin-top: 10px; }
  .youline .arrow { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; color: var(--accent); font-size: 1.1rem; }
  .youline .txt {
    font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 0.95rem;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--text); min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .youline .txt.live { color: var(--accent); }
  .youline .txt small { display: block; font-weight: 700; font-size: 0.58rem; letter-spacing: 0.24em; color: var(--mid); }

  .oauth { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .btn-oauth {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 0.84rem;
    letter-spacing: 0.08em; text-transform: uppercase; padding: 10px 8px;
    border-radius: var(--r, 5px); cursor: pointer;
    border: 1px solid var(--border2); background: var(--surface); color: var(--text);
    transition: border-color 0.15s;
  }
  .btn-oauth:hover { border-color: rgb(var(--accent-rgb) / 0.5); }
  .btn-oauth svg { flex-shrink: 0; }

  .divider {
    display: flex; align-items: center; gap: 12px; margin: 4px 0 12px;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.58rem;
    letter-spacing: 0.3em; text-transform: uppercase; color: var(--dim);
  }
  .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: var(--border); }

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

  .forgot {
    display: block; margin: -4px 0 12px auto; background: none; border: none; cursor: pointer;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.68rem;
    letter-spacing: 0.16em; text-transform: uppercase; color: var(--mid);
    transition: color 0.15s;
  }
  .forgot:hover { color: var(--accent); }

  .alert-err {
    background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.4);
    color: var(--danger, #f87171); border-radius: var(--r, 5px);
    padding: 8px 12px; font-size: 0.82rem; margin-bottom: 12px;
  }

  .submit {
    width: 100%; font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.05rem;
    letter-spacing: 0.14em; text-transform: uppercase; color: #000; background: var(--accent);
    border: none; border-radius: var(--r, 5px); padding: 13px; cursor: pointer;
    box-shadow: 0 0 26px rgb(var(--accent-rgb) / 0.35); transition: transform 0.15s;
  }
  .submit:hover:not(:disabled) { transform: translateY(-2px); }
  .submit:disabled { opacity: 0.75; cursor: default; }
  .submit.ghost { background: none; color: var(--text); border: 1px solid var(--border2); box-shadow: none; margin-top: 16px; }
  .submit.ghost:hover { border-color: var(--accent); color: var(--accent); }

  /* tampon — pointer-events none : ne bloque jamais l'œil ni le bouton */
  .stamp {
    position: absolute; right: 14px; bottom: 10px; z-index: 4;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1.5rem;
    letter-spacing: 0.24em; text-transform: uppercase; color: var(--success, #4ade80);
    border: 4px solid var(--success, #4ade80); border-radius: 6px; padding: 6px 16px;
    transform: rotate(-14deg) scale(3); opacity: 0; pointer-events: none;
    transition: transform 0.35s cubic-bezier(0.2, 2, 0.4, 1) 0.5s, opacity 0.25s ease 0.5s;
  }
  .stamp.on { transform: rotate(-14deg) scale(1); opacity: 0.95; }
  .stamp.resa { position: static; display: inline-block; margin: 14px 0 0; color: var(--accent); border-color: var(--accent); transition: none; }

  .confirm-txt { color: var(--mid); font-size: 0.9rem; line-height: 1.6; margin-top: 14px; }

  .gl-switch { margin-top: 16px; text-align: center; font-size: 0.82rem; color: var(--mid); }
  .gl-switch button {
    background: none; border: none; cursor: pointer; color: var(--accent);
    font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 0.86rem;
    letter-spacing: 0.1em; text-transform: uppercase;
  }
  .gl-switch button:hover { text-decoration: underline; }

  /* ── Responsive ── */
  @media (max-width: 920px) {
    .gl-overlay { grid-template-columns: 1fr; }
    .street { display: none; }
    .checkpoint { justify-content: flex-start; padding-top: 56px; padding-bottom: 40px; border-left: none; }
  }
  @media (max-height: 760px) {
    .checkpoint { justify-content: flex-start; padding-top: 48px; padding-bottom: 32px; }
  }

  /* ── Animations désactivées ── */
  @media (prefers-reduced-motion: reduce) {
    .neon, .doorlight, .doors { animation: none !important; }
    .door, .stamp { transition: none !important; }
  }
  :global(.no-animations) .neon,
  :global(.no-animations) .doorlight,
  :global(.no-animations) .doors { animation: none !important; }
  :global(.no-animations) .door,
  :global(.no-animations) .stamp { transition: none !important; }
</style>

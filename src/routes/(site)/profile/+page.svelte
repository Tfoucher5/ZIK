<script>
  import { onMount, getContext } from 'svelte';
  import { dicebear } from '$lib/utils.js';
  import ProfileView from '$lib/components/ProfileView.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import { toast } from '$lib/toast.svelte.js';

  const _ctx = getContext('zik');
  const sb = _ctx.sb;
  const openAuthModal = _ctx.openAuthModal;
  const user      = $derived(_ctx.user);
  const authReady = $derived(_ctx.authReady);

  let profile = $state(null);
  let stats   = $state(null);
  let loading = $state(true);

  // Edit modal
  let editOpen      = $state(false);
  let editUsername  = $state('');
  let editAvatarUrl = $state('');
  let editError     = $state('');
  let editLoading   = $state(false);
  let avatarPreview = $state('');

  onMount(async () => {
    if (!sb) { loading = false; return; }
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) { loading = false; return; }
    await loadProfile(session.user);
  });

  async function loadProfile(u) {
    loading = true;
    try {
      const { data } = await sb.from('profiles').select('*').eq('id', u.id).single();
      profile = data;
      await loadStats(u.id, data?.elo ?? 0);
    } finally {
      loading = false;
    }
  }

  async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const r = await fetch(url);
        if (r.ok) return r;
        if (i < retries - 1) await new Promise(res => setTimeout(res, 600 * (i + 1)));
      } catch {
        if (i < retries - 1) await new Promise(res => setTimeout(res, 600 * (i + 1)));
      }
    }
    return null;
  }

  async function loadStats(userId, elo) {
    const r = await fetchWithRetry(`/api/stats/${userId}?elo=${elo}`);
    if (r?.ok) stats = await r.json();
  }

  function openEdit() {
    editUsername  = profile?.username || user?.email?.split('@')[0] || '';
    editAvatarUrl = profile?.avatar_url || '';
    editError     = '';
    avatarPreview = editAvatarUrl || dicebear(editUsername || '?');
    editOpen      = true;
  }

  function updatePreview() {
    avatarPreview = editAvatarUrl.trim() || dicebear(editUsername || '?');
  }

  async function saveProfile() {
    editError = '';
    const username   = editUsername.trim();
    const avatar_url = editAvatarUrl.trim();
    if (!username) { editError = 'Le pseudo est requis.'; return; }
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      editError = 'Pseudo invalide (3-20 caractères, lettres/chiffres/_/-).'; return;
    }
    const old = profile?.username;
    if (username !== old) {
      const { data: exists } = await sb.from('profiles').select('id').eq('username', username).maybeSingle();
      if (exists) { editError = 'Ce pseudo est déjà pris.'; return; }
    }
    editLoading = true;
    try {
      const { data: { session } } = await sb.auth.getSession();
      const r = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ username, avatar_url: avatar_url || null }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      const updatedProfile = { ...profile, username, avatar_url: avatar_url || null };
      profile = updatedProfile;
      if (user?.id) {
        try {
          sessionStorage.setItem('zik_profile_' + user.id, JSON.stringify({ p: updatedProfile, ts: Date.now() }));
        } catch { /* sessionStorage indisponible */ }
        sessionStorage.setItem('zik_uname', username);
      }
      editOpen = false;
      toast('Profil mis à jour !', 'success');
    } catch (e) {
      editError = e.message;
    } finally {
      editLoading = false;
    }
  }
</script>

<svelte:head>
  <title>ZIK — Mon Profil | Blind Test Multijoueur</title>
  <meta name="robots" content="noindex, nofollow">
</svelte:head>

<div id="profile-page">
{#if loading || !authReady}
  <div class="pl-loading">Chargement...</div>
{:else if !user}
  <div class="profile-auth-wall">
    <div class="profile-auth-msg">
      <div class="confirm-emoji">&#x1F512;</div>
      <h2>Connexion requise</h2>
      <p>Connecte-toi pour acc&eacute;der &agrave; ton profil.</p>
      <button class="btn-accent" onclick={() => openAuthModal('login')} style="margin-top:16px">Se connecter</button>
    </div>
  </div>
{:else if profile}
  <ProfileView {profile} {stats} {sb} userId={user.id} viewerId={user.id} editable onEdit={openEdit} />
{/if}
</div>

<!-- Edit modal -->
{#if editOpen}
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" role="dialog" aria-modal="true"
  onclick={e => { if (e.target === e.currentTarget) editOpen = false; }}>
  <div class="modal">
    <button class="close-btn" onclick={() => editOpen = false}>&#x2715;</button>
    <h2>Modifier le profil</h2>
    <p class="mdesc">Personnalise ton pseudo et ton avatar.</p>

    <div class="field">
      <label>Pseudo <span style="color:var(--dim);font-weight:400;font-size:.78rem">(3-20 caract&egrave;res)</span></label>
      <input type="text" bind:value={editUsername} maxlength="20" autocomplete="off" oninput={updatePreview}>
    </div>

    <div class="field">
      <label>URL de l&apos;avatar <span style="color:var(--dim);font-weight:400;font-size:.78rem">&mdash; optionnel</span></label>
      <input type="url" bind:value={editAvatarUrl} placeholder="https://... (image carr&eacute;e recommand&eacute;e)" oninput={updatePreview}>
    </div>

    <div class="avatar-preview-wrap">
      <span style="font-size:.78rem;color:var(--dim)">Aper&ccedil;u :</span>
      <img src={avatarPreview} alt="" class="avatar-preview-img">
      <button class="btn-ghost sm" onclick={() => { editAvatarUrl = ''; updatePreview(); }}>G&eacute;n&eacute;rer auto</button>
    </div>

    {#if editError}<div class="alert-err">{editError}</div>{/if}
    <div class="modal-footer">
      <button class="btn-ghost" onclick={() => editOpen = false}>Annuler</button>
      <button class="btn-accent" onclick={saveProfile} disabled={editLoading}>{editLoading ? '...' : 'Enregistrer'}</button>
    </div>
  </div>
</div>
{/if}

<Toast />

<style>
.pl-loading {
  padding: 48px 16px;
  text-align: center;
  color: var(--dim);
  font-size: 0.88rem;
}
.profile-auth-wall {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding-top: var(--nav-h);
  text-align: center;
}
.profile-auth-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
#profile-page {
  padding-top: var(--nav-h);
  flex: 1;
}

/* -- Modal edition -- */
.avatar-preview-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0 12px;
  flex-wrap: wrap;
}
.avatar-preview-img {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
  background: rgb(var(--c-glass) / 0.06);
}
.alert-err {
  background: rgba(248,113,113,0.08);
  border: 1px solid rgba(248,113,113,0.2);
  color: var(--danger);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  margin-top: 6px;
}

/* -- Overlay + Modal -- */
.overlay {
  position: fixed; inset: 0; z-index: 400;
  background: var(--overlay);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.modal {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 28px;
  width: 100%; max-width: 440px;
}
.modal h2 {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 1.1rem; font-weight: 800; margin-bottom: 16px;
}
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field label { font-size: 0.78rem; font-weight: 600; color: var(--mid); }
.field input {
  background: rgb(var(--c-glass) / 0.04);
  border: 1px solid var(--border2);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text);
  font-size: 0.88rem;
  font-family: inherit;
  outline: none;
}
.field input:focus {
  border-color: rgb(var(--accent-rgb) / 0.4);
  box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.08);
}
.modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
</style>

<script>
  import { onMount, getContext } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import ProfileView from '$lib/components/ProfileView.svelte';

  const _ctx = getContext('zik');
  const sb = _ctx.sb;
  const openAuthModal = _ctx.openAuthModal;
  const user      = $derived(_ctx.user);
  const authReady = $derived(_ctx.authReady);

  let profile  = $state(null);
  let stats    = $state(null);
  let loading  = $state(true);
  let notFound = $state(false);

  const username     = $derived($page.params.username);
  const isOwnProfile = $derived(user?.profile?.username === profile?.username);

  onMount(async () => {
    if (!sb) { loading = false; return; }
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) { loading = false; return; }
    await loadPublicProfile();
  });

  async function fetchWithRetry(url, opts = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const r = await fetch(url, opts);
        if (r.ok) return r;
        if (r.status === 404) return r;
        if (i < retries - 1) await new Promise(res => setTimeout(res, 600 * (i + 1)));
      } catch {
        if (i < retries - 1) await new Promise(res => setTimeout(res, 600 * (i + 1)));
      }
    }
    return null;
  }

  async function loadPublicProfile() {
    loading = true;
    try {
      const token = (await sb.auth.getSession())?.data?.session?.access_token;
      const r = await fetchWithRetry(`/api/profile/${username}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r || r.status === 404 || !r.ok) { notFound = true; return; }
      profile = await r.json();
      if (profile && !profile.is_private) {
        await loadStats(profile.id, profile.elo ?? 0);
      }
    } finally {
      loading = false;
    }
  }

  async function loadStats(userId, elo) {
    const r = await fetchWithRetry(`/api/stats/${userId}?elo=${elo}`);
    if (r?.ok) stats = await r.json();
  }
</script>

<svelte:head>
  <title>ZIK &mdash; {profile?.username ?? username} | Profil joueur</title>
  <meta name="description" content="D&eacute;couvre le profil de {profile?.username ?? username} sur ZIK : ELO {profile?.elo ?? ''}, niveau {profile?.level ?? ''}, {profile?.games_played ?? ''} parties jou&eacute;es. Blind test musical multijoueur.">
  {#if !profile || profile.is_private}
    <meta name="robots" content="noindex, nofollow">
  {:else}
    <link rel="canonical" href="https://www.zik-music.fr/user/{username}">
    <meta property="og:title" content="{profile.username} sur ZIK &mdash; Blind Test Multijoueur">
    <meta property="og:description" content="ELO {profile.elo ?? '?'} &middot; Niveau {profile.level ?? '?'} &middot; {profile.games_played ?? '0'} parties jou&eacute;es. D&eacute;couvre son profil sur ZIK.">
    <meta property="og:url" content="https://www.zik-music.fr/user/{username}">
    <meta property="og:type" content="profile">
  {/if}
</svelte:head>

<div id="profile-page">
{#if loading || !authReady}
  <div class="pl-loading">Chargement...</div>
{:else if !user}
  <div class="profile-auth-wall">
    <div class="profile-auth-msg">
      <div class="confirm-emoji">&#x1F512;</div>
      <h2>Connexion requise</h2>
      <p>Tu dois &ecirc;tre connect&eacute; pour voir le profil d&apos;un joueur.</p>
      <button class="btn-accent" onclick={() => openAuthModal('login')} style="margin-top:16px">Se connecter</button>
    </div>
  </div>
{:else if notFound}
  <div class="profile-auth-wall">
    <div class="profile-auth-msg">
      <div class="confirm-emoji">&#x1F575;</div>
      <h2>Profil introuvable</h2>
      <p>Le joueur <strong>{username}</strong> n&apos;existe pas.</p>
      <a href="/" class="btn-ghost" style="margin-top:16px">&larr; Retour &agrave; l&apos;accueil</a>
    </div>
  </div>
{:else if profile?.is_private && !isOwnProfile}
  <div class="profile-auth-wall">
    <div class="profile-auth-msg wall-private">
      <div class="wall-tape"></div>
      <div class="confirm-emoji">&#x1F6A7;</div>
      <h2>Acc&egrave;s refus&eacute;</h2>
      <p><strong>{profile.username}</strong> a rendu son backstage priv&eacute;.</p>
      <a href="/" class="btn-ghost" style="margin-top:16px">&larr; Retour &agrave; l&apos;accueil</a>
    </div>
  </div>
{:else if profile}
  <ProfileView {profile} {stats} {sb} userId={profile.id} viewerId={user?.id ?? null} editable={isOwnProfile} onEdit={() => goto('/profile')} />
{/if}
</div>

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
.wall-private { position: relative; padding: 40px 32px 32px; border: 1px solid var(--border2); border-radius: var(--radius); background: var(--bg2); overflow: hidden; }
.wall-tape { position: absolute; top: 0; left: 0; right: 0; height: 22px; background: repeating-linear-gradient(-45deg, var(--bg) 0 14px, var(--gold) 14px 28px); opacity: 0.85; }
#profile-page {
  padding-top: var(--nav-h);
  flex: 1;
}
</style>

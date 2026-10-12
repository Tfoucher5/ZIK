<script>
  import { getContext } from 'svelte';
  import { toast } from '$lib/toast.svelte.js';
  import SettingsSection from './SettingsSection.svelte';

  const _ctx = getContext('zik');
  const sb = _ctx.sb;
  const user = $derived(_ctx.user);

  let discordLoading = $state(false);
  let _discordScrollDone = $state(false);

  async function linkDiscord() {
    if (!sb) return;
    discordLoading = true;
    try {
      const { error } = await sb.auth.linkIdentity({
        provider: 'discord',
        options: { redirectTo: window.location.origin + '/settings?discord=linked' },
      });
      if (error) throw error;
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
      discordLoading = false;
    }
  }

  async function unlinkDiscord() {
    if (!sb || !user) return;
    discordLoading = true;
    try {
      const { data: { identities } } = await sb.auth.getUserIdentities();
      if (identities.length <= 1) {
        toast('Impossible de délier : c\'est ta seule méthode de connexion.', 'error');
        discordLoading = false;
        return;
      }
      const discordIdentity = identities.find(i => i.provider === 'discord');
      if (!discordIdentity) {
        discordLoading = false;
        return;
      }
      const { error } = await sb.auth.unlinkIdentity(discordIdentity);
      if (error) throw error;
      const { data: { session } } = await sb.auth.getSession();
      const r = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ discord_id: null, discord_username: null, discord_avatar: null }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      if (user.profile) {
        user.profile.discord_id = null;
        user.profile.discord_username = null;
        user.profile.discord_avatar = null;
      }
      toast('Compte Discord délié.', 'success');
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    } finally {
      discordLoading = false;
    }
  }

  $effect(() => {
    if (!_discordScrollDone) {
      const params = new URLSearchParams(window.location.search);
      const discordParam = params.get('discord');

      if (discordParam === 'linked') {
        _discordScrollDone = true;
        // Vider le cache profil pour forcer un rechargement depuis la BDD
        try { sessionStorage.removeItem('zik_profile_' + user.id); } catch { /* stockage indisponible */ }
        sb.from('profiles').select('*').eq('id', user.id).single().then(({ data: p }) => {
          if (p) {
            user.profile = p;
          }
        });
        setTimeout(() => document.getElementById('discord-section')?.scrollIntoView({ behavior: 'smooth' }), 300);
      } else if (discordParam === 'link') {
        _discordScrollDone = true;
        setTimeout(() => document.getElementById('discord-section')?.scrollIntoView({ behavior: 'smooth' }), 200);
      }
    }
  });
</script>

<SettingsSection title="Compte Discord" id="discord-section">
  <div class="settings-row">
    <div class="settings-row-info">
      <div class="settings-row-label">Liaison Discord</div>
      {#if user?.profile?.discord_id}
        <div class="settings-row-desc">
          Connecté en tant que <strong>{user.profile.discord_username}</strong>.
          Tes parties Discord comptent pour ton XP.
        </div>
      {:else}
        <div class="settings-row-desc">
          Lie ton compte Discord pour gagner de l'XP via le bot ZIK et utiliser /stats.
        </div>
      {/if}
    </div>
    {#if user?.profile?.discord_id}
      <div class="discord-linked">
        {#if user.profile.discord_avatar}
          <img
            src="https://cdn.discordapp.com/avatars/{user.profile.discord_id}/{user.profile.discord_avatar}.png"
            alt="Avatar Discord"
            class="discord-avatar"
            width="32" height="32"
            loading="lazy" decoding="async"
          />
        {/if}
        <button class="btn-unlink" onclick={unlinkDiscord} disabled={discordLoading}>
          {discordLoading ? 'Déliaison...' : 'Délier'}
        </button>
      </div>
    {:else}
      <button class="btn-discord-link" onclick={linkDiscord} disabled={discordLoading}>
        <svg width="16" height="16" viewBox="0 0 127.14 96.36"><path fill="currentColor" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
        Connecter mon Discord
      </button>
    {/if}
  </div>
</SettingsSection>

<style>
.discord-linked {
  display: flex;
  align-items: center;
  gap: 10px;
}
.discord-avatar {
  border-radius: 50%;
  flex-shrink: 0;
}
.btn-discord-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #5865f2;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.btn-discord-link:hover:not(:disabled) { background: #4752c4; }
.btn-discord-link:disabled { opacity: 0.6; cursor: not-allowed; }
</style>

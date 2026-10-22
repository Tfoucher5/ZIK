<script>
  import { getContext } from 'svelte';
  import { toast } from '$lib/client/toast.svelte.js';

  const _ctx = getContext('zik');
  const sb = _ctx.sb;
  const user = $derived(_ctx.user);

  let isPrivate   = $state(false);
  let privLoading = $state(false);

  $effect(() => {
    if (user?.profile) {
      isPrivate = user.profile.is_private ?? false;
    }
  });

  async function togglePrivacy(e) {
    const newVal = e.target.checked;
    if (!sb || !user) return;
    privLoading = true;
    try {
      const { data: { session } } = await sb.auth.getSession();
      const r = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ is_private: newVal }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      isPrivate = newVal;
      if (user.profile) user.profile.is_private = newVal;
      toast(newVal ? 'Profil mis en privé' : 'Profil mis en public', 'success');
    } catch (e) {
      toast('Erreur : ' + e.message, 'error');
    } finally {
      privLoading = false;
    }
  }
</script>

<div class="settings-row">
  <div class="settings-row-info">
    <div class="settings-row-label">Profil priv&eacute; &#x1F510;</div>
    <div class="settings-row-desc">
      {#if isPrivate}
        Ton profil est <strong>priv&eacute;</strong> : seul toi peux voir tes stats et meilleurs scores.
      {:else}
        Ton profil est <strong>public</strong> : n&apos;importe quel joueur connect&eacute; peut voir tes stats.
      {/if}
    </div>
  </div>
  <label class="toggle-switch" aria-label="Profil priv&eacute;">
    <input type="checkbox" checked={isPrivate} onchange={togglePrivacy} disabled={privLoading}>
    <span class="toggle-track"><span class="toggle-thumb"></span></span>
  </label>
</div>

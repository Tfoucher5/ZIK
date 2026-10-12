<script>
  import { getContext } from 'svelte';
  import { onboarding } from '$lib/components/onboarding/onboarding.svelte.js';
  import SettingsSection from '$lib/components/settings/SettingsSection.svelte';
  import AppearanceSettings from '$lib/components/settings/AppearanceSettings.svelte';
  import VolumeSetting from '$lib/components/settings/VolumeSetting.svelte';
  import PrivacySetting from '$lib/components/settings/PrivacySetting.svelte';
  import NotificationSettings from '$lib/components/settings/NotificationSettings.svelte';
  import ProSetting from '$lib/components/settings/ProSetting.svelte';
  import DiscordSetting from '$lib/components/settings/DiscordSetting.svelte';
  import DangerZone from '$lib/components/settings/DangerZone.svelte';
  import DeleteAccountModal from '$lib/components/settings/DeleteAccountModal.svelte';

  const _ctx = getContext('zik');
  const sb = _ctx.sb;
  const user = $derived(_ctx.user);
  const authReady = $derived(_ctx.authReady);

  let deleteModalOpen = $state(false);
</script>

<svelte:head>
  <title>ZIK - Paramètres</title>
  <meta name="robots" content="noindex, nofollow">
</svelte:head>

<main class="settings-page">
  <div class="settings-container">
    <button class="settings-back" onclick={() => history.back()}>&larr; Retour</button>
    <h1 class="settings-title">Param&egrave;tres</h1>
    <p class="settings-sub">Personnalise ton exp&eacute;rience ZIK.</p>

    <SettingsSection title="Visuel">
      <AppearanceSettings />
    </SettingsSection>

    <SettingsSection title="Jeu">
      <VolumeSetting />
    </SettingsSection>

    <SettingsSection title="Aide">
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-label">Parcours d&apos;accueil</div>
          <div class="settings-row-desc">Refais la visite guid&eacute;e de ZIK, page par page.</div>
        </div>
        <button class="btn-unlink" onclick={onboarding.start}>Relancer la visite</button>
      </div>
    </SettingsSection>

    {#if authReady && user}
    <SettingsSection title="Confidentialité">
      <PrivacySetting />
    </SettingsSection>

    <SettingsSection title="Notifications" id="notifications">
      <NotificationSettings getToken={async () => (await sb.auth.getSession())?.data?.session?.access_token} />
    </SettingsSection>

    <ProSetting />

    <DiscordSetting />

    <DangerZone onDelete={() => (deleteModalOpen = true)} />
    {/if}

  </div>
</main>

<DeleteAccountModal bind:open={deleteModalOpen} />

<style>
.settings-page {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(var(--nav-h) + 32px) 24px 80px;
}
.settings-back {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--mid);
  font-weight: 500;
  margin-bottom: 20px;
  transition: color 0.15s;
}
.settings-back:hover { color: var(--text); }
.settings-title {
  font-family: "Barlow Condensed", sans-serif;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 6px;
}
.settings-sub {
  font-size: 0.9rem;
  color: var(--mid);
  margin-bottom: 40px;
}
</style>

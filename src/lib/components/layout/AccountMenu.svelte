<!-- Compte facultatif : « Connexion » ou avatar + notifications + menu -->
<script>
  import { getContext } from 'svelte';
  import { dicebear } from '$lib/shared/utils.js';
  import NotificationsMenu from '$lib/components/layout/NotificationsMenu.svelte';

  const ctx = getContext('zik');
  const user = $derived(ctx.user);
  const name = $derived(user?.profile?.username || user?.email?.split('@')[0] || 'Joueur');
  const avatar = $derived(user?.profile?.avatar_url || dicebear(name));
  let menu = $state();
</script>

{#if !ctx.authReady}
  <span class="ph" aria-hidden="true"></span>
{:else if user}
  <NotificationsMenu />
  <button class="av" type="button" popovertarget="tb-compte" aria-label="Mon compte">
    <img src={avatar} alt="" width="32" height="32" />
  </button>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div id="tb-compte" class="menu" popover bind:this={menu} onclick={(e) => e.target.closest('a, button') && menu.hidePopover()}>
    <p class="who">{name}</p>
    <a href="/profile">Mon profil</a>
    <a href="/collection">Ma collection</a>
    <a href="/settings">Paramètres</a>
    {#if user.profile?.role === 'super_admin'}<a href="/admin">Admin</a>{/if}
    <button type="button" onclick={() => ctx.sb?.auth.signOut()}>Déconnexion</button>
  </div>
{:else}
  <button class="login" type="button" onclick={() => ctx.openAuthModal('login')}>Connexion</button>
{/if}

<style>
  .ph {
    width: 40px;
    height: 40px;
  }
  .login {
    height: 40px;
    padding: 0 10px;
    border-radius: 10px;
    border: 1px solid var(--line-2);
    background: none;
    color: var(--text);
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .login:hover,
  .av:hover {
    border-color: rgba(255, 255, 255, 0.5);
  }
  .av {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: 10px;
    border: 1px solid var(--line-2);
    background: none;
    cursor: pointer;
  }
  .av img {
    width: 30px;
    height: 30px;
    border-radius: 6px;
  }
  .menu {
    position: fixed;
    inset: calc(62px + env(safe-area-inset-top, 0px)) var(--gut) auto auto;
    margin: 0;
    min-width: 220px;
    padding: 8px;
    border: 1px solid var(--line-2);
    border-radius: 14px;
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 40px 90px -30px #000;
  }
  .who {
    margin: 0;
    padding: 8px 12px 10px;
    border-bottom: 1px solid var(--line);
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .menu a,
  .menu button {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 44px;
    padding: 0 12px;
    border: 0;
    border-radius: 8px;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 15px;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }
  .menu a:hover,
  .menu button:hover {
    background: rgba(255, 255, 255, 0.06);
  }
</style>

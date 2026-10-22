<script>
  import { enhance } from '$app/forms';
  import { ago } from '$lib/shared/admin/stats-utils.js';
  import { avatarOf } from '$lib/shared/admin/players.js';

  /** Amis, abonnements et abonnés du joueur, avec suppression en deux clics. */
  let { data, submit, busy } = $props();

  let social = $state('friends');
  let armed = $state('');

  const socialLists = $derived({
    friends: data.friendships,
    following: data.following,
    followers: data.followers,
  });

  function arm(e, key) {
    if (armed !== key) {
      e.preventDefault();
      armed = key;
    }
  }

  // Après l'envoi, plus aucun bouton n'attend de confirmation
  const send = () => {
    const after = submit();
    return async (args) => {
      armed = '';
      await after(args);
    };
  };
</script>

<section class="a-section">
  <div class="a-section-head"><h3>Amis et abonnements</h3></div>
  <div class="a-chips" role="group" aria-label="Liste affichée">
    <button class="a-chip" aria-pressed={social === 'friends'} onclick={() => (social = 'friends')}>Amis<b>{data.friendships.length}</b></button>
    <button class="a-chip" aria-pressed={social === 'following'} onclick={() => (social = 'following')}>Il suit<b>{data.following.length}</b></button>
    <button class="a-chip" aria-pressed={social === 'followers'} onclick={() => (social = 'followers')}>Le suivent<b>{data.followers.length}</b></button>
  </div>
  {#if socialLists[social].length}
    <ul class="a-list">
      {#each socialLists[social] as s (s.id)}
        {@const key = `${social}-${s.id}`}
        <li class="a-row">
          <img class="a-avatar" src={avatarOf(s.user)} alt="" loading="lazy" />
          <span class="a-row-main">
            {#if s.user}<a class="a-row-title" href="/admin/users/{s.user.id}">{s.user.username}</a>{:else}<span class="a-row-title">Compte supprimé</span>{/if}
            <span class="a-row-sub">
              {#if social === 'friends'}{s.status === 'accepted' ? 'Amis' : 'Demande en attente'} · {/if}{ago(s.at)}
            </span>
          </span>
          <form method="POST" action={social === 'friends' ? '?/deleteFriendship' : '?/deleteFollow'} use:enhance={send}>
            <input type="hidden" name="id" value={s.id} />
            <button class="a-btn small" class:danger={armed === key} onclick={(e) => arm(e, key)} disabled={busy}>
              {armed === key ? 'Confirmer' : social === 'friends' ? 'Supprimer' : 'Retirer'}
            </button>
          </form>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="a-empty">Rien ici.</p>
  {/if}
</section>

<style>
  .a-row-title { color: var(--a-fg); }
  a.a-row-title:hover { color: var(--a-accent); }
</style>

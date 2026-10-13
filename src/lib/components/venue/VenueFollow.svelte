<script>
  import { getContext } from 'svelte';

  let { venue, count = 0 } = $props();
  const zik = getContext('zik');

  let following = $state(false);
  let busy = $state(false);
  // svelte-ignore state_referenced_locally
  let total = $state(count);

  async function call(method, body) {
    const { data: { session } } = await zik.sb.auth.getSession();
    const res = await fetch(`/api/venue/follow${method === 'GET' ? `?slug=${venue.slug}` : ''}`, {
      method,
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: body && JSON.stringify(body),
    });
    return res.ok ? res.json() : null;
  }

  $effect(() => {
    if (zik.user) call('GET').then((d) => d && (following = d.following));
  });

  async function toggle() {
    if (!zik.user) return zik.openAuthModal('register');
    busy = true;
    const d = await call('POST', { slug: venue.slug, follow: !following });
    if (d) { following = d.following; total = d.count; }
    busy = false;
  }
</script>

<div class="vf">
  <button class="vn-btn vn-btn-ghost vf-btn" class:on={following} onclick={toggle} disabled={busy} aria-pressed={following}>
    {following ? '✓ Vous suivez ce lieu' : '+ Suivre ce lieu'}
  </button>
  <p>
    {#if following}Vous serez prévenu dès que {venue.name} annonce une soirée.
    {:else}Recevez une notification quand {venue.name} annonce une soirée{zik.user ? '' : ' (compte gratuit)'}.{/if}
    {#if total}<br /><b>{total}</b> joueur{total > 1 ? 's' : ''} {total > 1 ? 'suivent' : 'suit'} ce lieu.{/if}
  </p>
</div>

<style>
  .vf { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 18px; }
  .vf p { flex: 1; min-width: 200px; font-size: 0.82rem; line-height: 1.5; color: var(--mid); }
  .vf b { color: var(--text); }
  .vf-btn:not(.on) { border-color: var(--accent); color: var(--accent); }
  @media (max-width: 600px) {
    .vf .vn-btn { width: 100%; }
  }
</style>

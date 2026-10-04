<script>
  import { getContext } from 'svelte';
  import CollectionView from '$lib/components/card/CollectionView.svelte';

  const _ctx = getContext('zik');
  const username = $derived(_ctx.user?.profile?.username);
  const authReady = $derived(_ctx.authReady);
</script>

<svelte:head>
  <title>Ma collection | ZIK</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if username}
  <CollectionView {username} />
{:else if authReady}
  <div class="col-guest">
    <h1>Ta collection de cartes</h1>
    <p>Chaque titre trouvé en premier dans une partie à plusieurs te rapporte sa carte. Crée un compte pour commencer la tienne.</p>
    <button type="button" onclick={() => _ctx.openAuthModal?.('register')}>Créer un compte</button>
  </div>
{/if}

<style>
  .col-guest {
    display: grid;
    justify-items: center;
    gap: 12px;
    max-width: 520px;
    margin: 0 auto;
    padding: calc(var(--nav-h) + 80px) 16px 96px;
    color: var(--text);
    text-align: center;
  }

  .col-guest h1 {
    margin: 0;
    font: 700 clamp(2rem, 5vw, 3rem) / 1 'Barlow Condensed', sans-serif;
  }

  .col-guest p {
    margin: 0;
    color: var(--mid);
  }

  .col-guest button {
    min-height: 44px;
    padding: 0 22px;
    border: 0;
    border-radius: 99px;
    background: var(--accent);
    color: var(--on-accent, #fff);
    font: 600 0.95rem/1 'Barlow', sans-serif;
    cursor: pointer;
  }
</style>

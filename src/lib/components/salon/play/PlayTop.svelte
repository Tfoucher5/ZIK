<script>
  /** En-tête léger du téléphone hors manche : le logo, son pseudo et le code. */
  let { username, code } = $props();
</script>

<header class="top">
  <span class="logo">ZIK<i></i></span>
  <span class="who">{username} · {code}</span>
</header>

<style>
  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    min-height: 32px;
  }
  .logo {
    display: inline-flex;
    align-items: baseline;
    font-family: var(--s-cond);
    font-weight: 900;
    font-size: 26px;
    line-height: 1;
  }
  .logo i {
    width: 0.23em;
    height: 0.23em;
    margin-left: 0.1em;
    border-radius: 50%;
    background: currentColor;
  }
  .who {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--s-mono);
    font-size: 13px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    opacity: 0.75;
  }
</style>

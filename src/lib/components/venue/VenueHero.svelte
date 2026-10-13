<script>
  import VenueFollow from './VenueFollow.svelte';

  let { venue: v, followers = 0 } = $props();
</script>

<header class="vh">
  <div class="vh-id">
    {#if v.logo}
      <img class="vh-logo" src={v.logo} alt="Logo {v.name}" />
    {:else}
      <span class="vh-logo vh-initial" aria-hidden="true">{v.name[0]}</span>
    {/if}
    <div>
      <span class="vn-tag">Blind test à {v.city}</span>
      <h1 class="vn-title">{v.name}</h1>
      {#if v.address}<p class="vh-address">{v.address}</p>{/if}
    </div>
  </div>

  {#if v.schedule}
    <p class="vh-schedule">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      {v.schedule}
    </p>
  {/if}

  <div class="vh-ctas">
    <a class="vn-btn" href="/salon/play">Je suis sur place : entrer le code</a>
    {#if v.website}<a class="vn-btn vn-btn-ghost" href={v.website} rel="noopener" target="_blank">Infos et réservations ↗</a>{/if}
  </div>

  <VenueFollow venue={v} count={followers} />
</header>

<style>
  .vh {
    position: relative;
    overflow: hidden;
    padding: 36px;
    margin-bottom: 24px;
    border: 1px solid rgb(var(--accent-rgb) / 0.3);
    border-radius: 20px;
    background:
      radial-gradient(120% 140% at 100% 0%, rgb(var(--accent-rgb) / 0.22), transparent 60%),
      var(--surface);
  }
  .vh-id { display: flex; align-items: center; gap: 22px; }
  .vh-logo {
    flex: none;
    width: 104px;
    height: 104px;
    padding: 10px;
    border-radius: 20px;
    background: #fff;
    object-fit: contain;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
  }
  .vh-initial {
    display: grid;
    place-items: center;
    background: var(--accent);
    color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif;
    font-size: 3.2rem;
    font-weight: 900;
    text-transform: uppercase;
  }
  .vh .vn-title { margin-top: 12px; }
  .vh-address { margin-top: 6px; font-size: 0.92rem; color: var(--mid); }
  .vh-schedule {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-top: 26px;
    padding: 10px 16px;
    border-radius: 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    font-weight: 800;
    color: var(--text);
  }
  .vh-schedule svg { color: var(--accent); }
  .vh-ctas { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
  @media (max-width: 600px) {
    .vh { padding: 22px 18px; border-radius: 16px; }
    .vh-id { flex-direction: column; align-items: flex-start; gap: 16px; }
    .vh-logo { width: 76px; height: 76px; border-radius: 16px; }
    .vh-initial { font-size: 2.4rem; }
    .vh-ctas .vn-btn { width: 100%; }
  }
</style>

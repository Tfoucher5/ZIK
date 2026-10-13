<script>
  import { venueTheme } from '$lib/venues.js';

  let { venue: v } = $props();
</script>

<a class="vc" href="/lieu/{v.slug}" style={venueTheme(v.color)}>
  {#if v.logo}
    <img src={v.logo} alt="" loading="lazy" />
  {:else}
    <span class="vc-initial" aria-hidden="true">{v.name[0]}</span>
  {/if}
  <div class="vc-text">
    <b>{v.name}</b>
    <span>{v.schedule || v.city}</span>
  </div>
  <span class="vc-go" aria-hidden="true">→</span>
</a>

<style>
  .vc {
    display: flex;
    align-items: center;
    gap: 14px;
    height: 100%;
    padding: 14px 16px;
    border: 1px solid var(--border);
    border-left: 4px solid var(--accent);
    border-radius: 14px;
    background: var(--surface);
    color: var(--text);
    text-decoration: none;
    transition: border-color 0.15s, transform 0.15s;
  }
  .vc:hover { border-color: var(--accent); transform: translateY(-2px); }
  img, .vc-initial { flex: none; width: 52px; height: 52px; border-radius: 12px; }
  img { padding: 5px; background: #fff; object-fit: contain; }
  .vc-initial {
    display: grid;
    place-items: center;
    background: var(--accent);
    color: var(--on-accent);
    font-family: "Barlow Condensed", sans-serif;
    font-size: 1.6rem;
    font-weight: 900;
    text-transform: uppercase;
  }
  .vc-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .vc-text b { font-size: 1rem; overflow-wrap: anywhere; }
  .vc-text span { font-size: 0.8rem; color: var(--mid); }
  .vc-go { color: var(--accent); font-weight: 800; }
</style>

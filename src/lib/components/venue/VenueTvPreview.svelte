<script>
  import { venueTheme } from '$lib/venues.js';

  let { form } = $props();
</script>

<div class="tv" style={venueTheme(form.color || '#ff00ff')} aria-label="Aperçu de l'écran TV">
  <div class="tv-top">
    <span class="tv-brand">
      {#if form.logo}<img src={form.logo} alt="" />{/if}
      {form.name || 'Votre lieu'}
    </span>
    <span class="tv-join"><i></i>zik-music.fr/salon</span>
  </div>
  <div class="tv-bar"></div>
  <div class="tv-body">
    <p class="tv-kicker"><b>●</b> 8 joueurs connectés</p>
    {#if form.welcome}<p class="tv-welcome">{form.welcome}</p>{/if}
    <p class="tv-h">Sortez vos<br /><em>téléphones.</em></p>
    <div class="tv-code">{#each 'ZK4P2Q' as ch, i (i)}<b>{ch}</b>{/each}</div>
  </div>
</div>

<style>
  .tv {
    --tv-text: #fafafa;
    aspect-ratio: 16 / 9;
    display: grid;
    grid-template-rows: auto 3px 1fr;
    overflow: hidden;
    border: 8px solid #1c1c22;
    border-radius: 14px;
    background: #080808;
    color: var(--tv-text);
    box-shadow: 0 18px 40px rgb(0 0 0 / 0.25);
    container-type: inline-size;
  }
  .tv-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 3.5cqw 4cqw; }
  .tv-brand {
    display: flex;
    align-items: center;
    gap: 2cqw;
    min-width: 0;
    font-family: "Barlow Condensed", sans-serif;
    font-size: 4.2cqw;
    font-weight: 900;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tv-brand img { height: 7cqw; max-width: 18cqw; object-fit: contain; }
  .tv-join { display: flex; align-items: center; gap: 1.5cqw; font-size: 2.4cqw; color: #8896aa; white-space: nowrap; }
  .tv-join i { width: 6cqw; height: 6cqw; border-radius: 1cqw; background: repeating-conic-gradient(#fff 0 25%, #222 0 50%) 0 0 / 1.5cqw 1.5cqw; }
  .tv-bar { background: var(--accent); }
  .tv-body { padding: 4cqw 6cqw; display: flex; flex-direction: column; justify-content: center; }
  .tv-kicker { font-size: 2.2cqw; color: #8896aa; text-transform: uppercase; letter-spacing: 0.1em; }
  .tv-kicker b { color: var(--accent); }
  .tv-welcome { margin-top: 1.5cqw; font-size: 3.4cqw; font-weight: 700; color: var(--accent); overflow-wrap: anywhere; }
  .tv-h { margin-top: 1.5cqw; font-family: "Barlow Condensed", sans-serif; font-size: 8cqw; font-weight: 900; line-height: 0.9; text-transform: uppercase; }
  .tv-h em { font-style: normal; color: var(--accent); }
  .tv-code { display: flex; gap: 1.2cqw; margin-top: 3cqw; }
  .tv-code b {
    display: grid;
    place-items: center;
    width: 6.4cqw;
    aspect-ratio: 0.8;
    border: 2px solid var(--tv-text);
    border-radius: 3px;
    font-family: "JetBrains Mono", monospace;
    font-size: 3.6cqw;
    font-weight: 600;
  }
</style>

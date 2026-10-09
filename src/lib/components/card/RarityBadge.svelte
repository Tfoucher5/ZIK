<script>
  import { RARITIES } from './rarity.js';

  let { rarity } = $props();
</script>

<span class="rb" data-rarity={rarity}><i class="rb-disc"></i>{RARITIES[rarity].label}</span>

<style>
  .rb {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    padding: 0.2em 0.65em 0.2em 0.3em;
    border-radius: 99px;
    background: color-mix(in oklab, var(--rc) 18%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--rc) 45%, transparent);
    font: 600 0.82em/1.2 'Barlow Condensed', sans-serif;
    letter-spacing: 0.02em;
    color: var(--text, #f5f3f8);
    white-space: nowrap;
  }

  .rb-disc {
    width: 1.05em;
    aspect-ratio: 1;
    border-radius: 50%;
    background:
      radial-gradient(circle, #0a0a0c 0 9%, transparent 10%),
      radial-gradient(circle, var(--rc-light) 0 30%, transparent 31%),
      radial-gradient(circle, var(--rc) 0 60%, var(--rc-dark));
  }

  .rb[data-rarity='mythic'] .rb-disc {
    background:
      radial-gradient(circle, #0a0a0c 0 9%, transparent 10%),
      radial-gradient(circle, #fff 0 30%, transparent 31%),
      conic-gradient(#ff8ade, #d4a5ff, #8ff0ff, #ffc6ee, #ff8ade);
  }
</style>

<script>
  let { type, size = 16 } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if type === 'correct_answers'}
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l3 3 5-6" />
  {:else if type === 'games_played'}
    <rect x="2.5" y="8.5" width="19" height="10" rx="4" />
    <path d="M7.5 11.5v4M5.5 13.5h4" />
    <circle cx="16.5" cy="12.5" r="1" />
    <circle cx="18.5" cy="14.5" r="1" />
  {:else if type === 'zikle_wins'}
    <path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11h2" />
  {/if}
</svg>

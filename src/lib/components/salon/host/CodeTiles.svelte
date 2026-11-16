<script>
  /** Code du salon en tuiles, lisible de loin. Taille : `size` en em du parent. */
  let { code, size = '2.9em' } = $props();
</script>

<div class="code" style:font-size={size} aria-label="Code {code}">
  {#each code.split('') as ch, i (i)}<b>{ch}</b>{/each}
</div>

<style>
  .code {
    flex: none;
    display: flex;
    gap: 0.16em;
    font-family: var(--s-mono);
    font-weight: 700;
  }
  b {
    display: grid;
    place-items: center;
    width: 1.22em;
    height: 1.5em;
    border-radius: 0.14em;
    background: rgb(255 255 255 / 0.09);
    border-bottom: 0.06em solid rgb(255 255 255 / 0.45);
  }
</style>

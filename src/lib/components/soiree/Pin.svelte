<!-- Section épinglée : titre + phrases à gauche, objet animé à droite (children) -->
<script>
  import { getContext } from 'svelte';

  /**
   * @type {{
   *   id: string, len: number, label: string, title: string,
   *   pro?: boolean, lede?: string, full?: boolean,
   *   beats?: { t: string, b?: string, pro?: boolean }[], beat?: number,
   *   onprogress: (p: number) => void, children: import('svelte').Snippet,
   * }}
   */
  let { id, len, label, title, pro = false, lede, full = false, beats = [], beat = 0, onprogress, children } = $props();

  const pins = getContext('soiree-pins');
  let el;

  $effect(() => pins?.add({ el, len, set: onprogress }));
</script>

<section {id} class="pin" class:full data-bg={id} aria-labelledby="{id}-t" bind:this={el}>
  <div class="pin-in">
    <div class="cap">
      <span class="label"><i></i>{label}{#if pro}<span class="pro-tag">ZIK Pro</span>{/if}</span>
      <h2 class="grad" id="{id}-t">{title}</h2>
      {#if lede}<p class="lede">{lede}</p>{/if}
      {#if beats.length}
        <div class="beats">
          {#each beats as b, i (i)}
            <p class="beat" class:on={i === beat}>
              {#if b.b}<b>{b.b}</b>{/if}
              {b.t}{#if b.pro}<span class="pro-tag">ZIK Pro</span>{/if}
            </p>
          {/each}
        </div>
      {/if}
    </div>
    {@render children()}
  </div>
</section>
